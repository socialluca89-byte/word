<?php
declare(strict_types=1);
if (!defined('WORDYLAND_API')) { http_response_code(404); exit; }
// This separate capability never makes a linked learner an owned/playable profile.
if (!str_starts_with($action, 'guardian-')) return;
$guardianMethods=['guardian-state'=>'GET','guardian-code'=>'POST','guardian-invite'=>'POST','guardian-accept'=>'POST','guardian-progress'=>'GET','guardian-revoke'=>'POST'];
if (!isset($guardianMethods[$action])) fail('Operazione non trovata.',404);
if ($method!==$guardianMethods[$action]) fail('Metodo non consentito.',405);
$guardianAccount=userId();
if (!in_array($accountRole,['adult','admin'],true)) fail('Questa sezione richiede un account adulto.',403);
$db->exec('CREATE TABLE IF NOT EXISTS guardian_pairings(code_hash TEXT PRIMARY KEY,parent_id INTEGER UNIQUE NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,created_at INTEGER NOT NULL,expires INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS guardian_links(id INTEGER PRIMARY KEY AUTOINCREMENT,club_id INTEGER NOT NULL,profile_id INTEGER NOT NULL,learner_account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,authorizer_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,parent_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,scope TEXT NOT NULL CHECK(scope="progress-read"),version INTEGER NOT NULL DEFAULT 1,created_at INTEGER NOT NULL,expires INTEGER NOT NULL,accepted_at INTEGER,revoked_at INTEGER,UNIQUE(club_id,profile_id,parent_id),FOREIGN KEY(club_id,profile_id) REFERENCES club_profiles(club_id,profile_id) ON DELETE CASCADE);');
// Only the new capability tables change. Restoring a role/owner cannot resurrect a grant.
$db->exec('CREATE TRIGGER IF NOT EXISTS guardian_club_owner_changed AFTER UPDATE OF owner_id ON clubs WHEN NEW.owner_id IS NOT OLD.owner_id BEGIN UPDATE guardian_links SET revoked_at=CAST(strftime("%s","now") AS INTEGER),version=version+1 WHERE club_id=OLD.id AND revoked_at IS NULL; END;
CREATE TRIGGER IF NOT EXISTS guardian_account_role_changed AFTER UPDATE OF role ON accounts WHEN NEW.role IS NOT OLD.role BEGIN UPDATE guardian_links SET revoked_at=CAST(strftime("%s","now") AS INTEGER),version=version+1 WHERE (parent_id=OLD.id OR authorizer_id=OLD.id OR learner_account_id=OLD.id) AND revoked_at IS NULL; DELETE FROM guardian_pairings WHERE parent_id=OLD.id; END;
CREATE TRIGGER IF NOT EXISTS guardian_profile_owner_changed AFTER UPDATE OF account_id ON profiles WHEN NEW.account_id IS NOT OLD.account_id BEGIN UPDATE guardian_links SET revoked_at=CAST(strftime("%s","now") AS INTEGER),version=version+1 WHERE profile_id=OLD.id AND revoked_at IS NULL; END;');
function guardianRows(PDO $db,string $sql,array $args=[]):array{$q=$db->prepare($sql);$q->execute($args);return $q->fetchAll();}
function guardianOne(PDO $db,string $sql,array $args=[]):array|false{$rows=guardianRows($db,$sql,$args);return $rows[0]??false;}
function guardianRun(PDO $db,string $sql,array $args=[]):void{$db->prepare($sql)->execute($args);}
function guardianId(mixed $value):int{if((!is_int($value)&&!(is_string($value)&&preg_match('/^[1-9][0-9]{0,17}$/D',$value)))||(int)$value<1)fail('Collegamento non disponibile.',404);return (int)$value;}
function guardianCurrent(PDO $db,int $link):array|false{
    return guardianOne($db,'SELECT g.*,p.nickname,c.name AS class_name,c.owner_id AS current_owner FROM guardian_links g JOIN clubs c ON c.id=g.club_id JOIN club_profiles cp ON cp.club_id=g.club_id AND cp.profile_id=g.profile_id JOIN profiles p ON p.id=g.profile_id AND p.account_id=g.learner_account_id JOIN accounts child ON child.id=p.account_id AND child.role="learner" JOIN accounts parent ON parent.id=g.parent_id AND parent.role IN ("adult","admin") JOIN accounts issuer ON issuer.id=g.authorizer_id AND issuer.role IN ("adult","admin") WHERE g.id=? AND g.scope="progress-read"',[$link]);
}
function guardianValid(array|false $link):bool{return $link && $link['revoked_at']===null && (int)$link['current_owner']===(int)$link['authorizer_id'] && ($link['accepted_at']!==null||(int)$link['expires']>time());}
function guardianMetadata(array $link):array{return ['id'=>(int)$link['id'],'version'=>(int)$link['version'],'nickname'=>$link['nickname'],'className'=>$link['class_name'],'status'=>$link['revoked_at']!==null?'revoked':($link['accepted_at']!==null?'active':((int)$link['expires']<=time()?'expired':'pending')),'expires'=>(int)$link['expires']];}
function guardianHasTable(PDO $db,string $name):bool{return (bool)guardianOne($db,'SELECT 1 FROM sqlite_master WHERE type="table" AND name=?',[$name]);}
if ($action==='guardian-state') {
    $db->beginTransaction();
    if(!guardianOne($db,'SELECT id FROM accounts WHERE id=? AND role IN ("adult","admin")',[$guardianAccount])){$db->rollBack();fail('Questa sezione richiede un account adulto.',403);}
    $received=[];
    foreach(guardianRows($db,'SELECT id FROM guardian_links WHERE parent_id=? AND revoked_at IS NULL ORDER BY id DESC LIMIT 100',[$guardianAccount]) as $row){$link=guardianCurrent($db,(int)$row['id']);if(guardianValid($link))$received[]=guardianMetadata($link);}
    // Class owners already manage enrollment. The parent capability grants no roster access.
    $classes=guardianRows($db,'SELECT id,name FROM clubs WHERE owner_id=? ORDER BY id',[$guardianAccount]);
    foreach($classes as &$class){$class['id']=(int)$class['id'];$class['learners']=guardianRows($db,'SELECT p.id,p.nickname FROM clubs c JOIN accounts owner ON owner.id=c.owner_id AND owner.role IN ("adult","admin") JOIN club_profiles cp ON cp.club_id=c.id JOIN profiles p ON p.id=cp.profile_id JOIN accounts a ON a.id=p.account_id WHERE c.id=? AND c.owner_id=? AND a.role="learner" ORDER BY p.nickname,p.id',[$class['id'],$guardianAccount]);foreach($class['learners'] as &$child)$child['id']=(int)$child['id'];unset($child);}unset($class);
    $issued=[];
    foreach(guardianRows($db,'SELECT g.id FROM guardian_links g JOIN clubs c ON c.id=g.club_id WHERE c.owner_id=? AND g.revoked_at IS NULL ORDER BY g.id DESC LIMIT 400',[$guardianAccount]) as $row){$link=guardianCurrent($db,(int)$row['id']);if(guardianValid($link)&&(int)$link['current_owner']===$guardianAccount)$issued[]=guardianMetadata($link);}
    $db->commit();respond(['scope'=>'guardian-progress-read-only','received'=>$received,'managedClasses'=>$classes,'issued'=>$issued]);
}
if ($action==='guardian-code') {
    limitAttempts($db,'guardian-code:'.$guardianAccount,10);
    $code=bin2hex(random_bytes(16));$now=time();
    $db->exec('BEGIN IMMEDIATE');
    guardianRun($db,'DELETE FROM guardian_pairings WHERE parent_id=? OR expires<=?',[$guardianAccount,$now]);
    guardianRun($db,'INSERT INTO guardian_pairings VALUES (?,?,?,?)',[hash('sha256',$code),$guardianAccount,$now,$now+900]);
    $db->exec('COMMIT');respond(['code'=>$code,'expires'=>$now+900]);
}
if ($action==='guardian-invite') {
    if(($body['authorized']??false)!==true)fail('Conferma di aver verificato il rapporto e l’autorizzazione del genitore.');
    limitAttempts($db,'guardian-invite:'.$guardianAccount,40);
    limitAttempts($db,'guardian-invite-ip:'.hash('sha256',$_SERVER['REMOTE_ADDR']??''),100);
    $club=guardianId($body['club']??0);$profile=guardianId($body['profile']??0);$code=$body['code']??null;
    if(!is_string($code)||!preg_match('/^[a-f0-9]{32}$/D',$code))fail('Codice di abbinamento non disponibile o scaduto.',404);
    $db->exec('BEGIN IMMEDIATE');
    $child=guardianOne($db,'SELECT p.account_id FROM clubs c JOIN club_profiles cp ON cp.club_id=c.id JOIN profiles p ON p.id=cp.profile_id JOIN accounts a ON a.id=p.account_id WHERE c.id=? AND c.owner_id=? AND p.id=? AND a.role="learner"',[$club,$guardianAccount,$profile]);
    $parent=guardianOne($db,'SELECT gp.parent_id FROM guardian_pairings gp JOIN accounts a ON a.id=gp.parent_id AND a.role IN ("adult","admin") WHERE gp.code_hash=? AND gp.expires>?',[hash('sha256',$code),time()]);
    if(!$child||!$parent){$db->exec('ROLLBACK');fail('Classe, alunno o codice non disponibili per questa autorizzazione.',404);}
    $old=guardianOne($db,'SELECT * FROM guardian_links WHERE club_id=? AND profile_id=? AND parent_id=?',[$club,$profile,$parent['parent_id']]);
    if($old&&$old['revoked_at']===null&&($old['accepted_at']!==null||(int)$old['expires']>time())){$db->exec('ROLLBACK');fail('Esiste già un invito o collegamento. Controlla lo stato prima di ripetere.',409);}
    $childCount=(int)guardianOne($db,'SELECT COUNT(*) AS n FROM guardian_links WHERE profile_id=? AND revoked_at IS NULL AND (accepted_at IS NOT NULL OR expires>?)',[$profile,time()])['n'];
    $parentCount=(int)guardianOne($db,'SELECT COUNT(*) AS n FROM guardian_links WHERE parent_id=? AND revoked_at IS NULL AND (accepted_at IS NOT NULL OR expires>?)',[$parent['parent_id'],time()])['n'];
    if($childCount>=4||$parentCount>=64){$db->exec('ROLLBACK');fail('Limite dei collegamenti raggiunto. Revoca prima quelli non più necessari.',409);}
    $now=time();
    guardianRun($db,'INSERT INTO guardian_links(club_id,profile_id,learner_account_id,authorizer_id,parent_id,scope,version,created_at,expires) VALUES(?,?,?,?,?,"progress-read",1,?,?) ON CONFLICT(club_id,profile_id,parent_id) DO UPDATE SET learner_account_id=excluded.learner_account_id,authorizer_id=excluded.authorizer_id,scope=excluded.scope,version=guardian_links.version+1,created_at=excluded.created_at,expires=excluded.expires,accepted_at=NULL,revoked_at=NULL',[$club,$profile,$child['account_id'],$guardianAccount,$parent['parent_id'],$now,$now+86400]);
    guardianRun($db,'DELETE FROM guardian_pairings WHERE code_hash=?',[hash('sha256',$code)]);
    $link=guardianOne($db,'SELECT id FROM guardian_links WHERE club_id=? AND profile_id=? AND parent_id=?',[$club,$profile,$parent['parent_id']]);
    $db->exec('COMMIT');respond(['ok'=>true,'invitation'=>(int)$link['id']]);
}
if ($action==='guardian-accept'||$action==='guardian-revoke') {
    $id=guardianId($body['link']??0);$version=guardianId($body['version']??0);
    if($action==='guardian-accept'&&($body['confirmGuardian']??false)!==true)fail('Conferma di essere il genitore o tutore autorizzato di questo alunno.');
    limitAttempts($db,'guardian-change:'.$guardianAccount,100);
    $db->exec('BEGIN IMMEDIATE');$link=guardianCurrent($db,$id);
    $canRevoke=$link&&in_array($guardianAccount,[(int)$link['parent_id'],(int)$link['authorizer_id'],(int)$link['current_owner']],true);
    if(!$link||($action==='guardian-accept'?((int)$link['parent_id']!==$guardianAccount||!guardianValid($link)):!$canRevoke)){$db->exec('ROLLBACK');fail('Collegamento non disponibile.',404);}
    if((int)$link['version']!==$version){$db->exec('ROLLBACK');fail('L’invito è cambiato. Aggiorna e controlla prima di confermare.',409);}
    $replayed=$action==='guardian-accept'?$link['accepted_at']!==null:$link['revoked_at']!==null;
    if(!$replayed)guardianRun($db,$action==='guardian-accept'?'UPDATE guardian_links SET accepted_at=? WHERE id=?':'UPDATE guardian_links SET revoked_at=? WHERE id=?',[time(),$id]);
    $db->exec('COMMIT');respond(['ok'=>true,'replayed'=>$replayed]);
}
if ($action==='guardian-progress') {
    $db->beginTransaction();
    $link=guardianCurrent($db,guardianId($_GET['link']??0));
    if(!guardianValid($link)||(int)$link['parent_id']!==$guardianAccount||$link['accepted_at']===null){$db->rollBack();fail('Collegamento non disponibile.',404);}
    $pid=(int)$link['profile_id'];$since=strtotime(gmdate('Y-m-d').' 00:00:00 UTC')-89*86400;$day=gmdate('Y-m-d',$since);$today=gmdate('Y-m-d');
    $missions=['available'=>false];$training=['available'=>false];$phonics=['available'=>false];
    if(guardianHasTable($db,'quests')&&guardianHasTable($db,'rewards'))$missions=['available'=>true,'completed'=>(int)guardianOne($db,'SELECT COUNT(*) AS n FROM rewards WHERE profile_id=? AND created_at>=?',[$pid,$since])['n'],'pending'=>(int)guardianOne($db,'SELECT COUNT(*) AS n FROM quests WHERE profile_id=? AND created_at>=? AND completed=0',[$pid,$since])['n']];
    if(guardianHasTable($db,'training_daily')){$row=guardianOne($db,'SELECT COALESCE(SUM(completed),0) AS activities,COALESCE(SUM(independent),0) AS independent,COALESCE(SUM(guided),0) AS guided,COALESCE(SUM(errors),0) AS errors,COALESCE(SUM(replays),0) AS replays,COUNT(DISTINCT day) AS days FROM training_daily WHERE profile_id=? AND day>=? AND day<=?',[$pid,$day,$today]);$training=['available'=>true];foreach($row as $key=>$value)$training[$key]=(int)$value;}
    $phonics=['available'=>false,'guidedPaths'=>null,'windowDays'=>30,'windowBasis'=>'started'];
    if(guardianHasTable($db,'phonics_sessions')){$startedSince=strtotime($today.' 00:00:00 UTC')-29*86400;$phonics=['available'=>true,'guidedPaths'=>(int)guardianOne($db,'SELECT COUNT(*) AS n FROM phonics_sessions WHERE profile_id=? AND created_at>=? AND created_at<=? AND completed_at IS NOT NULL AND completed_at<=?',[$pid,$startedSince,time(),time()])['n'],'windowDays'=>30,'windowBasis'=>'started'];}
    $db->commit();respond(['scope'=>'guardian-progress-read-only','historyDays'=>90,'nickname'=>$link['nickname'],'className'=>$link['class_name'],'missions'=>$missions,'training'=>$training,'phonics'=>$phonics,'notes'=>'Solo attività online confermate. Aiuti ed errori sono parte del percorso; nessun voto, confronto o valutazione della pronuncia. Ospiti e ripasso offline non sono inclusi.']);
}
