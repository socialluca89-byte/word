<?php
declare(strict_types=1);
if(!defined('WORDYLAND_API')){http_response_code(404);exit;}
$communityActions=['feedback-create','feedback-list','feedback-status','managed-classes','admin-overview'];
if(!in_array($action,$communityActions,true))return;
if(($method==='GET')!==in_array($action,['feedback-list','managed-classes','admin-overview'],true))fail('Metodo non consentito.',405);
$db->exec('CREATE TABLE IF NOT EXISTS feedback(id INTEGER PRIMARY KEY,account_id INTEGER REFERENCES accounts(id) ON DELETE CASCADE,profile_id INTEGER REFERENCES profiles(id) ON DELETE SET NULL,kind TEXT NOT NULL,title TEXT NOT NULL,body TEXT NOT NULL,screen TEXT NOT NULL,status TEXT NOT NULL DEFAULT "open",created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS feedback_account ON feedback(account_id,id);');
$isAdmin=$accountRole==='admin';
$offset=max(0,min(1000000,(int)($_GET['offset']??0)));$pageSize=20;
function communityRows(PDO $db,string $sql,array $args=[]): array{$q=$db->prepare($sql);$q->execute($args);return $q->fetchAll();}
if($action==='feedback-create'){
    $kind=$body['kind']??'';$title=is_string($body['title']??null)?trim($body['title']):'';$message=is_string($body['body']??null)?trim($body['body']):'';$screen=$body['screen']??'island';
    if(!is_string($kind)||!in_array($kind,['bug','idea'],true)||strlen($title)<3||strlen($title)>100||strlen($message)<5||strlen($message)>2000||!is_string($screen)||!in_array($screen,['island','lessons','arena','classroom','feedback','admin'],true))fail('Scegli il tipo e scrivi titolo e descrizione (massimo 2000 caratteri).');
    $profile=(int)($body['profile']??0);
    if($profile&&!communityRows($db,'SELECT id FROM profiles WHERE id=? AND account_id=?',[$profile,$id]))fail('Profilo non disponibile.',404);
    limitAttempts($db,'feedback:'.$id,10);
    $q=$db->prepare('INSERT INTO feedback(account_id,profile_id,kind,title,body,screen,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)');$q->execute([$id,$profile?:null,$kind,$title,$message,$screen,time(),time()]);
    respond(['id'=>(int)$db->lastInsertId(),'status'=>'open']);
}
if($action==='feedback-list'){
    $all=($_GET['scope']??'mine')==='all';if($all&&!$isAdmin)fail('Questa vista è riservata all’amministratore.',403);
    $where=$all?'1=1':'f.account_id=?';$args=$all?[]:[$id];
    $q=$db->prepare('SELECT COUNT(*) FROM feedback f WHERE '.$where);$q->execute($args);$total=(int)$q->fetchColumn();
    $items=communityRows($db,'SELECT f.id,f.kind,f.title,f.body,f.screen,f.status,f.created_at,f.updated_at,p.nickname'.($all?',a.username':'').' FROM feedback f LEFT JOIN profiles p ON p.id=f.profile_id LEFT JOIN accounts a ON a.id=f.account_id WHERE '.$where.' ORDER BY f.id DESC LIMIT 20 OFFSET '.$offset,$args);
    respond(['items'=>$items,'total'=>$total,'offset'=>$offset,'pageSize'=>$pageSize]);
}
if($action==='feedback-status'){
    if(!$isAdmin)fail('Solo l’amministratore può gestire le segnalazioni.',403);
    $state=$body['status']??'';if(!is_string($state)||!in_array($state,['open','planned','fixed','closed'],true))fail('Stato non valido.');
    $q=$db->prepare('UPDATE feedback SET status=?,updated_at=? WHERE id=?');$q->execute([$state,time(),(int)($body['id']??0)]);if(!$q->rowCount())fail('Segnalazione non disponibile.',404);respond(['ok'=>true]);
}
if($action==='managed-classes'){
    if($accountRole==='learner')fail('La creazione delle classi è riservata agli adulti.',403);
    $items=communityRows($db,'SELECT c.id,c.name,(SELECT COUNT(*) FROM club_profiles cp WHERE cp.club_id=c.id) AS members FROM clubs c WHERE c.owner_id=? ORDER BY c.id DESC',[$id]);respond(['items'=>$items]);
}
if($action==='admin-overview'){
    if(!$isAdmin)fail('Questa vista è riservata all’amministratore.',403);
    $type=$_GET['view']??'accounts';$sqls=[
      'accounts'=>'SELECT a.id,a.username,a.role,a.created_at,(SELECT COUNT(*) FROM profiles p WHERE p.account_id=a.id) AS profiles FROM accounts a ORDER BY a.id DESC',
      'profiles'=>'SELECT p.id,p.nickname,a.username,a.role,COALESCE(w.xp,0) AS xp,COALESCE(w.coins,0) AS coins,(SELECT COUNT(*) FROM club_profiles cp WHERE cp.profile_id=p.id) AS classes FROM profiles p JOIN accounts a ON a.id=p.account_id LEFT JOIN wallets w ON w.profile_id=p.id ORDER BY p.id DESC',
      'classes'=>'SELECT c.id,c.name,a.username AS owner,(SELECT COUNT(*) FROM club_profiles cp WHERE cp.club_id=c.id) AS members FROM clubs c JOIN accounts a ON a.id=c.owner_id ORDER BY c.id DESC',
      'duels'=>'SELECT d.id,p.nickname AS challenger,r.nickname AS opponent,d.category,d.state,d.created_at FROM duels d JOIN profiles p ON p.id=d.challenger JOIN profiles r ON r.id=d.opponent ORDER BY d.created_at DESC,d.id DESC'
    ];
    if(!is_string($type)||!isset($sqls[$type]))fail('Vista non disponibile.');
    // Platform tables are initialized before querying the dashboard.
    $tables=['accounts'=>'accounts','profiles'=>'profiles','classes'=>'clubs','duels'=>'duels'];$summary=[];
    foreach($tables+['feedback'=>'feedback'] as $key=>$table){$summary[$key]=(int)$db->query('SELECT COUNT(*) FROM '.$table)->fetchColumn();}
    $items=communityRows($db,$sqls[$type].' LIMIT 20 OFFSET '.$offset);
    respond(['summary'=>$summary,'view'=>$type,'items'=>$items,'total'=>$summary[$type],'offset'=>$offset,'pageSize'=>$pageSize]);
}
