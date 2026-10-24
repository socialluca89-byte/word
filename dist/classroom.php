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
function invitationClass(PDO $db, mixed $code): array {
    if (!is_string($code)||!preg_match('/^(?:[a-f0-9]{12}|[a-f0-9]{24})$/D',$code)) fail('Questo link della classe non è valido.',404);
    $class=classroomOne($db,'SELECT c.id,c.name,c.owner_id FROM clubs c LEFT JOIN class_links l ON l.club_id=c.id WHERE c.invite_hash=? OR l.code=? LIMIT 1',[hash('sha256',$code),$code]);
    if (!$class) fail('Questo link della classe non è più disponibile.',404);
    return $class;
}
$classActions=['class-invite','class-register','class-login','class-recover','class-link'];
if (!in_array($action,$classActions,true)) return;
if (($method==='GET')!==($action==='class-invite')) fail('Metodo non consentito.',405);
if ($action==='class-link') {
    $owner=userId();
    if (!in_array($accountRole,['adult','admin'],true)) fail('Il link della classe è gestito dall’adulto.',403);
    $class=$accountRole==='admin'?classroomOne($db,'SELECT id FROM clubs WHERE id=?',[(int)($body['club']??0)]):classroomOne($db,'SELECT id FROM clubs WHERE id=? AND owner_id=?',[(int)($body['club']??0),$owner]);
    if (!$class) fail('Puoi condividere soltanto una classe che gestisci.',403);
    $db->exec('BEGIN IMMEDIATE');
    $link=classroomOne($db,'SELECT code FROM class_links WHERE club_id=?',[$class['id']]);
    if (!$link) {
        $link=['code'=>bin2hex(random_bytes(12))];
        classroomRun($db,'INSERT INTO class_links(club_id,code) VALUES (?,?)',[$class['id'],$link['code']]);
    }
    $db->exec('COMMIT');respond($link);
}
$class=invitationClass($db,$method==='GET'?($_GET['code']??null):($body['code']??null));
if ($action==='class-invite') respond(['name'=>$class['name'],'full'=>(int)classroomOne($db,'SELECT COUNT(*) AS n FROM club_profiles WHERE club_id=?',[$class['id']])['n']>=100,'joined'=>isset($_SESSION['account_id'])&&(bool)classroomOne($db,'SELECT 1 FROM club_profiles cp JOIN profiles p ON p.id=cp.profile_id WHERE cp.club_id=? AND p.account_id=?',[$class['id'],$_SESSION['account_id']])]);
if (isset($_SESSION['account_id'])) fail('Esci dal profilo attuale prima di accedere con un altro.',409);
$nickname=trim(is_string($body['nickname']??null)?$body['nickname']:'');
$key=strtolower($nickname);$password=$body['password']??null;
if (!preg_match('/^[a-z0-9][a-z0-9_-]{2,19}$/iD',$nickname)) fail('Scegli un soprannome di 3–20 lettere o numeri, senza spazi. Puoi usare anche _ e -.');
if (!is_string($password)||strlen($password)<12||strlen($password)>72) fail('La password deve avere da 12 a 72 caratteri.');
$ip=hash('sha256',$_SERVER['REMOTE_ADDR']??'');
if ($action==='class-register') {
    if (($body['consent']??false)!==true) fail('Conferma la partecipazione alla classe con soprannome e punti.');
    // A classroom commonly shares one IP; do not apply the five-adult-signups cap.
    limitAttempts($db,'class-signup:'.$class['id'].':'.$ip,40);
    $hash=password_hash($password,PASSWORD_DEFAULT);$recovery=bin2hex(random_bytes(16));
    $db->exec('BEGIN IMMEDIATE');
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
    $account=classroomOne($db,'SELECT a.* FROM class_enrollments e JOIN profiles p ON p.id=e.profile_id JOIN accounts a ON a.id=p.account_id WHERE e.club_id=? AND e.login_key=? AND a.role="learner"',[$class['id'],$key]);
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
