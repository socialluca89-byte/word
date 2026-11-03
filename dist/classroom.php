<?php
declare(strict_types=1);
if (!defined('WORDYLAND_API')) { http_response_code(404); exit; }
// A shareable class invitation enrolls one learner, never an administrator.
$db->exec('CREATE TABLE IF NOT EXISTS clubs(id INTEGER PRIMARY KEY,name TEXT,invite_hash TEXT UNIQUE,owner_id INTEGER REFERENCES accounts(id) ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS club_accounts(club_id INTEGER REFERENCES clubs(id) ON DELETE CASCADE,account_id INTEGER REFERENCES accounts(id) ON DELETE CASCADE,PRIMARY KEY(club_id,account_id));
CREATE TABLE IF NOT EXISTS club_profiles(club_id INTEGER REFERENCES clubs(id) ON DELETE CASCADE,profile_id INTEGER REFERENCES profiles(id) ON DELETE CASCADE,PRIMARY KEY(club_id,profile_id));
CREATE TABLE IF NOT EXISTS class_links(club_id INTEGER PRIMARY KEY REFERENCES clubs(id) ON DELETE CASCADE,code TEXT UNIQUE NOT NULL);
CREATE TABLE IF NOT EXISTS class_enrollments(club_id INTEGER REFERENCES clubs(id) ON DELETE CASCADE,login_key TEXT NOT NULL,profile_id INTEGER UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,PRIMARY KEY(club_id,login_key));');
function classroomOne(PDO $db, string $sql, array $args=[]): array|false {
    $q=$db->prepare($sql);$q->execute($args);return $q->fetch();
}
function classroomRun(PDO $db, string $sql, array $args=[]): void { $db->prepare($sql)->execute($args); }
// Join tokens are independent of the stable access code. Retired invitation
// codes still resolve the class for existing members, never for new enrollment.
$db->exec('CREATE TABLE IF NOT EXISTS class_invitation_controls(club_id INTEGER PRIMARY KEY REFERENCES clubs(id) ON DELETE CASCADE,join_code TEXT UNIQUE NOT NULL,open INTEGER NOT NULL DEFAULT 1,legacy_signup INTEGER NOT NULL DEFAULT 1);
CREATE TABLE IF NOT EXISTS class_access_aliases(code TEXT PRIMARY KEY,club_id INTEGER NOT NULL REFERENCES clubs(id) ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS class_recovery_grants(id INTEGER PRIMARY KEY AUTOINCREMENT,club_id INTEGER NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,profile_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,manager_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,version INTEGER NOT NULL,token_hash TEXT UNIQUE NOT NULL,attempt TEXT NOT NULL,expires INTEGER NOT NULL,consumed_at INTEGER,revoked_at INTEGER,UNIQUE(manager_id,attempt));
CREATE TABLE IF NOT EXISTS class_membership_removals(club_id INTEGER NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,profile_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,removed_by INTEGER NOT NULL REFERENCES accounts(id),removed_at INTEGER NOT NULL,restored_at INTEGER,PRIMARY KEY(club_id,profile_id));
CREATE TRIGGER IF NOT EXISTS class_recovery_owner_changed AFTER UPDATE OF owner_id ON clubs WHEN NEW.owner_id IS NOT OLD.owner_id BEGIN UPDATE class_recovery_grants SET revoked_at=CAST(strftime("%s","now") AS INTEGER) WHERE club_id=OLD.id AND revoked_at IS NULL; END;
CREATE TRIGGER IF NOT EXISTS class_recovery_role_changed AFTER UPDATE OF role ON accounts WHEN NEW.role IS NOT OLD.role BEGIN UPDATE class_recovery_grants SET revoked_at=CAST(strftime("%s","now") AS INTEGER) WHERE (manager_id=OLD.id OR account_id=OLD.id) AND revoked_at IS NULL; END;
CREATE TRIGGER IF NOT EXISTS class_recovery_profile_changed AFTER UPDATE OF account_id ON profiles WHEN NEW.account_id IS NOT OLD.account_id BEGIN UPDATE class_recovery_grants SET revoked_at=CAST(strftime("%s","now") AS INTEGER) WHERE profile_id=OLD.id AND revoked_at IS NULL; END;
CREATE TRIGGER IF NOT EXISTS class_recovery_membership_removed AFTER DELETE ON club_profiles BEGIN UPDATE class_recovery_grants SET revoked_at=CAST(strftime("%s","now") AS INTEGER) WHERE club_id=OLD.club_id AND profile_id=OLD.profile_id AND revoked_at IS NULL; END;');
function invitationClass(PDO $db, mixed $code): array {
    if (!is_string($code)||!preg_match('/^(?:[a-f0-9]{12}|[a-f0-9]{24})$/D',$code)) fail('Questo link della classe non è valido.',404);
    $class=classroomOne($db,'SELECT c.id,c.name,c.owner_id FROM clubs c LEFT JOIN class_links l ON l.club_id=c.id LEFT JOIN class_invitation_controls i ON i.club_id=c.id LEFT JOIN class_access_aliases a ON a.club_id=c.id WHERE c.invite_hash=? OR l.code=? OR i.join_code=? OR a.code=? LIMIT 1',[hash('sha256',$code),$code,$code,$code]);
    if (!$class) fail('Questo link della classe non è più disponibile.',404);
    return $class;
}
function classroomRegistrationOpen(PDO $db,array $class,string $code):bool {
    $control=classroomOne($db,'SELECT * FROM class_invitation_controls WHERE club_id=?',[$class['id']]);
    if(!$control)return true;
    return (bool)$control['open'] && (hash_equals($control['join_code'],$code) || (bool)$control['legacy_signup']);
}
function classroomManaged(PDO $db,mixed $club,string $role):array {
    $owner=userId();$current=classroomOne($db,'SELECT role,session_version FROM accounts WHERE id=?',[$owner]);
    if(!$current||(int)$current['session_version']!==(int)($_SESSION['version']??0))fail('Accedi di nuovo prima di gestire la classe.',401);
    $role=$current['role'];if(!in_array($role,['adult','admin'],true))fail('Questa gestione è riservata all’adulto della classe.',403);
    $class=$role==='admin'?classroomOne($db,'SELECT id,name,owner_id FROM clubs WHERE id=?',[(int)$club]):classroomOne($db,'SELECT id,name,owner_id FROM clubs WHERE id=? AND owner_id=?',[(int)$club,$owner]);
    if(!$class)fail('Puoi gestire soltanto una tua classe.',403);return $class;
}
function classroomControl(PDO $db,array $class):array {
    $link=classroomOne($db,'SELECT code FROM class_links WHERE club_id=?',[$class['id']]);
    if(!$link){$link=['code'=>bin2hex(random_bytes(12))];classroomRun($db,'INSERT INTO class_links(club_id,code) VALUES (?,?)',[$class['id'],$link['code']]);}
    classroomRun($db,'INSERT OR IGNORE INTO class_invitation_controls(club_id,join_code) VALUES (?,?)',[$class['id'],$link['code']]);
    return classroomOne($db,'SELECT * FROM class_invitation_controls WHERE club_id=?',[$class['id']]);
}
function classroomLearner(PDO $db,int $club,int $profile):array|false {
    return classroomOne($db,'SELECT a.id,a.session_version FROM club_profiles cp JOIN profiles p ON p.id=cp.profile_id JOIN accounts a ON a.id=p.account_id WHERE cp.club_id=? AND p.id=? AND a.role="learner" AND (SELECT COUNT(*) FROM profiles allp WHERE allp.account_id=a.id)=1',[$club,$profile]);
}
$classActions=['class-invite','class-register','class-login','class-recover','class-assisted-confirm','class-link','class-manage-state','class-invitation-update','class-recovery-issue','class-recovery-revoke','class-member-remove','class-member-restore'];
if (!in_array($action,$classActions,true)) return;
if (($method==='GET')!==($action==='class-invite')) fail('Metodo non consentito.',405);
$managerActions=['class-link','class-manage-state','class-invitation-update','class-recovery-issue','class-recovery-revoke','class-member-remove','class-member-restore'];
if(in_array($action,$managerActions,true)){
    $manager=userId();
    if(!in_array($accountRole,['adult','admin'],true))fail('Questa gestione è riservata all’adulto della classe.',403);
    $club=$body['club']??0;
    if(!$club&&is_string($body['code']??null))$club=invitationClass($db,$body['code'])['id'];
    limitAttempts($db,'class-manage:'.$manager,300);
    $db->exec('BEGIN IMMEDIATE');$class=classroomManaged($db,$club,$accountRole);$control=classroomControl($db,$class);$club=(int)$class['id'];
    if($action==='class-link'){$db->exec('COMMIT');respond(['code'=>$control['join_code']]);}
    if($action==='class-invitation-update'){
        $change=$body['change']??'';
        if(!in_array($change,['pause','resume','rotate'],true)||($body['confirmed']??false)!==true){$db->exec('ROLLBACK');fail('Conferma la modifica del link di iscrizione.');}
        if($change==='rotate'){
            classroomRun($db,'INSERT OR IGNORE INTO class_access_aliases(code,club_id) VALUES (?,?)',[$control['join_code'],$club]);
            $control['join_code']=bin2hex(random_bytes(12));
            classroomRun($db,'INSERT INTO class_access_aliases(code,club_id) VALUES (?,?)',[$control['join_code'],$club]);
            classroomRun($db,'UPDATE class_invitation_controls SET join_code=?,legacy_signup=0 WHERE club_id=?',[$control['join_code'],$club]);
        }else classroomRun($db,'UPDATE class_invitation_controls SET open=? WHERE club_id=?',[(int)($change==='resume'),$club]);
        $db->exec('COMMIT');respond(['ok'=>true]);
    }
    if(in_array($action,['class-member-remove','class-member-restore'],true)){
        if(($body['confirmed']??false)!==true){$db->exec('ROLLBACK');fail('Conferma la modifica della partecipazione.');}
        $profile=(int)($body['member']??0);$member=classroomOne($db,'SELECT p.id,p.account_id,p.nickname FROM profiles p WHERE p.id=?',[$profile]);
        if(!$member||(int)$member['account_id']===(int)$class['owner_id']){$db->exec('ROLLBACK');fail('Partecipazione non modificabile.',404);}
        if($action==='class-member-remove'){
            $joined=classroomOne($db,'SELECT 1 FROM club_profiles WHERE club_id=? AND profile_id=?',[$club,$profile]);
            if(!$joined&&!classroomOne($db,'SELECT 1 FROM class_membership_removals WHERE club_id=? AND profile_id=?',[$club,$profile])){$db->exec('ROLLBACK');fail('Partecipazione non disponibile in questa classe.',404);}
            if($joined){
                classroomRun($db,'INSERT INTO class_membership_removals VALUES (?,?,?,?,NULL) ON CONFLICT(club_id,profile_id) DO UPDATE SET removed_by=excluded.removed_by,removed_at=excluded.removed_at,restored_at=NULL',[$club,$profile,$manager,time()]);
                classroomRun($db,'DELETE FROM club_profiles WHERE club_id=? AND profile_id=?',[$club,$profile]);
                classroomRun($db,'DELETE FROM club_accounts WHERE club_id=? AND account_id=? AND NOT EXISTS(SELECT 1 FROM club_profiles cp JOIN profiles p ON p.id=cp.profile_id WHERE cp.club_id=? AND p.account_id=?)',[$club,$member['account_id'],$club,$member['account_id']]);
            }
        }else{
            if(!classroomOne($db,'SELECT 1 FROM class_membership_removals WHERE club_id=? AND profile_id=? AND restored_at IS NULL',[$club,$profile])&&!classroomOne($db,'SELECT 1 FROM club_profiles WHERE club_id=? AND profile_id=?',[$club,$profile])){$db->exec('ROLLBACK');fail('Nessuna partecipazione da ripristinare.',404);}
            if(!classroomOne($db,'SELECT 1 FROM club_profiles WHERE club_id=? AND profile_id=?',[$club,$profile])){
                if((int)classroomOne($db,'SELECT COUNT(*) AS n FROM club_profiles WHERE club_id=?',[$club])['n']>=100||classroomOne($db,'SELECT 1 FROM club_profiles cp JOIN profiles p ON p.id=cp.profile_id WHERE cp.club_id=? AND LOWER(p.nickname)=LOWER(?)',[$club,$member['nickname']])){$db->exec('ROLLBACK');fail('Classe piena o soprannome già presente: verifica prima il ripristino.',409);}
                classroomRun($db,'INSERT INTO club_profiles VALUES (?,?)',[$club,$profile]);classroomRun($db,'INSERT OR IGNORE INTO club_accounts VALUES (?,?)',[$club,$member['account_id']]);
                classroomRun($db,'UPDATE class_membership_removals SET restored_at=? WHERE club_id=? AND profile_id=?',[time(),$club,$profile]);
            }
        }
        $db->exec('COMMIT');respond(['ok'=>true]);
    }
    if($action==='class-recovery-issue'){
        $attempt=$body['attempt']??'';$profile=(int)($body['member']??0);
        if(($body['verified']??false)!==true||!is_string($attempt)||!preg_match('/^[a-f0-9]{32}$/D',$attempt)){$db->exec('ROLLBACK');fail('Conferma di aver verificato chi richiede il recupero.');}
        $old=classroomOne($db,'SELECT id,club_id,profile_id FROM class_recovery_grants WHERE manager_id=? AND attempt=?',[$manager,$attempt]);
        if($old){if((int)$old['club_id']!==$club||(int)$old['profile_id']!==$profile){$db->exec('ROLLBACK');fail('Operazione di recupero già utilizzata per un’altra richiesta.',409);}$db->exec('COMMIT');respond(['grant'=>(int)$old['id'],'alreadyCreated'=>true]);}
        $child=classroomLearner($db,$club,$profile);if(!$child){$db->exec('ROLLBACK');fail('Recupero disponibile solo per un alunno personale di questa classe.',404);}
        $recent=(int)classroomOne($db,'SELECT COUNT(*) AS n FROM class_recovery_grants WHERE manager_id=? AND expires>?',[$manager,time()-3600])['n'];
        if($recent>=40){$db->exec('ROLLBACK');fail('Troppi codici preparati. Riprova più tardi.',429);}
        classroomRun($db,'UPDATE class_recovery_grants SET revoked_at=? WHERE account_id=? AND consumed_at IS NULL AND revoked_at IS NULL',[time(),$child['id']]);
        $token=bin2hex(random_bytes(12));$expires=time()+900;
        classroomRun($db,'INSERT INTO class_recovery_grants(club_id,profile_id,account_id,manager_id,version,token_hash,attempt,expires) VALUES (?,?,?,?,?,?,?,?)',[$club,$profile,$child['id'],$manager,$child['session_version'],hash('sha256',$token),$attempt,$expires]);
        $grant=(int)$db->lastInsertId();$db->exec('COMMIT');respond(['grant'=>$grant,'recovery'=>$token,'expires'=>$expires]);
    }
    if($action==='class-recovery-revoke'){
        classroomRun($db,'UPDATE class_recovery_grants SET revoked_at=? WHERE id=? AND club_id=? AND consumed_at IS NULL AND revoked_at IS NULL',[time(),(int)($body['grant']??0),$club]);$db->exec('COMMIT');respond(['ok'=>true]);
    }
    $q=$db->prepare('SELECT p.id,p.nickname,a.role,(p.account_id<>c.owner_id) AS removable,CASE WHEN a.role="learner" AND (SELECT COUNT(*) FROM profiles allp WHERE allp.account_id=a.id)=1 THEN 1 ELSE 0 END AS recoverable FROM club_profiles cp JOIN clubs c ON c.id=cp.club_id JOIN profiles p ON p.id=cp.profile_id JOIN accounts a ON a.id=p.account_id WHERE cp.club_id=? ORDER BY p.nickname,p.id');$q->execute([$club]);$members=$q->fetchAll();
    foreach($members as &$member){$member['id']=(int)$member['id'];$member['recoverable']=(bool)$member['recoverable'];$member['removable']=(bool)$member['removable'];}unset($member);
    $q=$db->prepare('SELECT r.profile_id AS id,p.nickname FROM class_membership_removals r JOIN profiles p ON p.id=r.profile_id WHERE r.club_id=? AND r.restored_at IS NULL AND NOT EXISTS(SELECT 1 FROM club_profiles cp WHERE cp.club_id=r.club_id AND cp.profile_id=r.profile_id) ORDER BY p.nickname');$q->execute([$club]);$removed=$q->fetchAll();foreach($removed as &$member)$member['id']=(int)$member['id'];unset($member);
    $q=$db->prepare('SELECT id,profile_id,expires FROM class_recovery_grants WHERE club_id=? AND consumed_at IS NULL AND revoked_at IS NULL AND expires>? ORDER BY id DESC');$q->execute([$club,time()]);$grants=$q->fetchAll();foreach($grants as &$grant)foreach($grant as &$value)$value=(int)$value;unset($value,$grant);
    $db->exec('COMMIT');respond(['club'=>$club,'name'=>$class['name'],'code'=>$control['join_code'],'registrationOpen'=>(bool)$control['open'],'members'=>$members,'removed'=>$removed,'recoveries'=>$grants]);
}
$class=invitationClass($db,$method==='GET'?($_GET['code']??null):($body['code']??null));
if ($action==='class-invite') {
    $metadata=['registrationOpen'=>classroomRegistrationOpen($db,$class,(string)($_GET['code']??'')),'name'=>$class['name'],'full'=>(int)classroomOne($db,'SELECT COUNT(*) AS n FROM club_profiles WHERE club_id=?',[$class['id']])['n']>=100,'joined'=>false];
    if (isset($_SESSION['account_id'])) {
        // Only the signed-in account's profiles are disclosed. Possessing an
        // invitation never exposes the class roster or another family's data.
        $q=$db->prepare('SELECT p.id,p.nickname,EXISTS(SELECT 1 FROM club_profiles cp WHERE cp.club_id=? AND cp.profile_id=p.id) AS joined FROM profiles p WHERE p.account_id=? ORDER BY p.id');
        $q->execute([$class['id'],$_SESSION['account_id']]);
        $metadata['profiles']=$q->fetchAll();
        foreach($metadata['profiles'] as &$profile){$profile['id']=(int)$profile['id'];$profile['joined']=(bool)$profile['joined'];if($profile['joined'])$metadata['joined']=true;}unset($profile);
        $metadata['canManage']=$accountRole==='admin'||(int)$class['owner_id']===(int)$_SESSION['account_id'];
    }
    respond($metadata);
}
if($action==='class-assisted-confirm'){
    $ip=hash('sha256',$_SERVER['REMOTE_ADDR']??'');limitAttempts($db,'class-assisted-ip:'.$ip,30);
    $token=$body['token']??'';$nickname=$body['nickname']??'';$password=$body['password']??'';
    if(!is_string($token)||!preg_match('/^[a-fA-F0-9 -]+$/D',$token))fail('Codice del gestore non valido o scaduto.',401);
    $token=str_replace([' ','-'],'',strtolower($token));
    if(strlen($token)!==24||!is_string($nickname)||!preg_match('/^[a-z0-9][a-z0-9_-]{2,19}$/iD',$nickname))fail('Codice del gestore non valido o scaduto.',401);
    if(!is_string($password)||strlen($password)<12||strlen($password)>72||$password!==($body['confirmPassword']??null))fail('Scegli e conferma una nuova password di 12–72 caratteri.');
    if(isset($_SESSION['account_id']))fail('Esci prima dal profilo attuale per usare il codice del gestore.',409);
    limitAttempts($db,'class-assisted:'.$class['id'].':'.hash('sha256',strtolower($nickname)),10);
    $passwordHash=password_hash($password,PASSWORD_DEFAULT);$newRecovery=bin2hex(random_bytes(16));
    $db->exec('BEGIN IMMEDIATE');
    $grant=classroomOne($db,'SELECT r.*,a.role AS manager_role,c.owner_id FROM class_recovery_grants r JOIN clubs c ON c.id=r.club_id JOIN accounts a ON a.id=r.manager_id JOIN profiles p ON p.id=r.profile_id WHERE r.token_hash=? AND r.club_id=? AND LOWER(p.nickname)=LOWER(?) AND r.expires>? AND r.consumed_at IS NULL AND r.revoked_at IS NULL',[hash('sha256',$token),$class['id'],$nickname,time()]);
    $child=$grant?classroomLearner($db,(int)$class['id'],(int)$grant['profile_id']):false;
    if(!$grant||!$child||(int)$child['id']!==(int)$grant['account_id']||(int)$child['session_version']!==(int)$grant['version']||!in_array($grant['manager_role'],['adult','admin'],true)||($grant['manager_role']!=='admin'&&(int)$grant['owner_id']!==(int)$grant['manager_id'])){$db->exec('ROLLBACK');fail('Codice del gestore non valido o scaduto. Chiedine uno nuovo.',401);}
    classroomRun($db,'UPDATE accounts SET password_hash=?,recovery_hash=?,session_version=session_version+1 WHERE id=? AND session_version=?',[$passwordHash,hash('sha256',$newRecovery),$child['id'],$grant['version']]);
    classroomRun($db,'UPDATE class_recovery_grants SET consumed_at=? WHERE id=?',[time(),$grant['id']]);
    classroomRun($db,'UPDATE class_recovery_grants SET revoked_at=? WHERE account_id=? AND id<>? AND revoked_at IS NULL',[time(),$child['id'],$grant['id']]);
    if(classroomOne($db,'SELECT 1 FROM sqlite_master WHERE type="table" AND name="password_reset_tokens"'))classroomRun($db,'DELETE FROM password_reset_tokens WHERE account_id=?',[$child['id']]);
    $db->exec('COMMIT');clearPresenceSession($db);session_regenerate_id(true);$_SESSION=['csrf'=>bin2hex(random_bytes(32))];
    respond(['ok'=>true,'recovery'=>$newRecovery,'csrf'=>$_SESSION['csrf']]);
}
if (isset($_SESSION['account_id'])) fail('Esci dal profilo attuale prima di accedere con un altro.',409);
$nickname=trim(is_string($body['nickname']??null)?$body['nickname']:'');
$key=strtolower($nickname);$password=$body['password']??null;
if (!preg_match('/^[a-z0-9][a-z0-9_-]{2,19}$/iD',$nickname)) fail('Scegli un soprannome di 3–20 lettere o numeri, senza spazi. Puoi usare anche _ e -.');
if (!is_string($password)||strlen($password)<12||strlen($password)>72) fail('La password deve avere da 12 a 72 caratteri.');
$ip=hash('sha256',$_SERVER['REMOTE_ADDR']??'');
if ($action==='class-register') {
    if(!classroomRegistrationOpen($db,$class,(string)$body['code']))fail('Le nuove iscrizioni da questo link sono chiuse. Gli iscritti possono ancora accedere.',410);
    if (($body['consent']??false)!==true) fail('Conferma la partecipazione alla classe con soprannome e punti.');
    // A classroom commonly shares one IP; do not apply the five-adult-signups cap.
    limitAttempts($db,'class-signup:'.$class['id'].':'.$ip,40);
    $hash=password_hash($password,PASSWORD_DEFAULT);$recovery=bin2hex(random_bytes(16));
    $db->exec('BEGIN IMMEDIATE');
    if(!classroomRegistrationOpen($db,$class,(string)$body['code'])){$db->exec('ROLLBACK');fail('Le nuove iscrizioni da questo link sono chiuse. Gli iscritti possono ancora accedere.',410);}
    if (classroomOne($db,'SELECT 1 FROM class_enrollments WHERE club_id=? AND login_key=? UNION ALL SELECT 1 FROM club_profiles cp JOIN profiles p ON p.id=cp.profile_id WHERE cp.club_id=? AND LOWER(p.nickname)=? LIMIT 1',[$class['id'],$key,$class['id'],$key])) { $db->exec('ROLLBACK');fail('Questo soprannome è già usato nella classe. Scegline un altro oppure accedi.',409); }
    if ((int)classroomOne($db,'SELECT COUNT(*) AS n FROM club_profiles WHERE club_id=?',[$class['id']])['n']>=100) { $db->exec('ROLLBACK');fail('La classe è al completo.',409); }
    $username='alunno_'.bin2hex(random_bytes(12));
    classroomRun($db,'INSERT INTO accounts(username,password_hash,created_at,recovery_hash,role) VALUES (?,?,?,?,"learner")',[$username,$hash,time(),hash('sha256',$recovery)]);
    $accountId=(int)$db->lastInsertId();
    classroomRun($db,'INSERT INTO profiles(account_id,nickname,state) VALUES (?,?,?)',[$accountId,$nickname,json_encode(validState(['world'=>'space','avatar'=>'🦊']),JSON_UNESCAPED_UNICODE)]);
    $profileId=(int)$db->lastInsertId();
    classroomRun($db,'INSERT INTO class_enrollments(club_id,login_key,profile_id) VALUES (?,?,?)',[$class['id'],$key,$profileId]);
    classroomRun($db,'INSERT INTO club_accounts(club_id,account_id) VALUES (?,?)',[$class['id'],$accountId]);
    classroomRun($db,'INSERT INTO club_profiles(club_id,profile_id) VALUES (?,?)',[$class['id'],$profileId]);
    $db->exec('COMMIT');$version=0;
} else {
    limitAttempts($db,'class-auth-ip:'.$ip,100);
    limitAttempts($db,'class-auth:'.$class['id'].':'.hash('sha256',$key),15);
    // Membership is the authorization boundary. An existing learner can be
    // enrolled in another class without receiving another password/account.
    // Historical signup records must not grant access after membership removal.
    $q=$db->prepare('SELECT a.* FROM club_profiles cp JOIN profiles p ON p.id=cp.profile_id JOIN accounts a ON a.id=p.account_id WHERE cp.club_id=? AND LOWER(p.nickname)=? AND a.role="learner" LIMIT 2');
    $q->execute([$class['id'],$key]);$matches=$q->fetchAll();
    // Fail closed if legacy data contains an ambiguous nickname in this class.
    $account=count($matches)===1?$matches[0]:false;
    if ($action==='class-recover') {
        $code=is_string($body['recovery']??null)?preg_replace('/[^a-f0-9]/','',strtolower($body['recovery'])):'';
        if (!$account||!$account['recovery_hash']||!hash_equals($account['recovery_hash'],hash('sha256',$code))) fail('Soprannome o codice di recupero non corretto.',401);
        $recovery=bin2hex(random_bytes(16));
        $q=$db->prepare('UPDATE accounts SET password_hash=?,recovery_hash=?,session_version=session_version+1 WHERE id=? AND recovery_hash=?');
        $q->execute([password_hash($password,PASSWORD_DEFAULT),hash('sha256',$recovery),$account['id'],$account['recovery_hash']]);
        if (!$q->rowCount()) fail('Il codice di recupero è già stato usato.',409);
        respond(['recovery'=>$recovery,'csrf'=>$_SESSION['csrf']]);
    }
    $dummy='$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi';
    if (!password_verify($password,$account['password_hash']??$dummy)||!$account) fail('Soprannome o password non corretti.',401);
    $accountId=(int)$account['id'];$username=$account['username'];$version=(int)$account['session_version'];
}
session_regenerate_id(true);
$_SESSION=['account_id'=>$accountId,'username'=>$username,'last_seen'=>time(),'version'=>$version,'csrf'=>bin2hex(random_bytes(32))];
$result=['csrf'=>$_SESSION['csrf'],'username'=>$username,'role'=>'learner','profiles'=>profiles($db,$accountId),'className'=>$class['name']];
if (isset($recovery)) $result['recovery']=$recovery;
respond($result);
