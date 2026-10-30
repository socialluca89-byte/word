<?php
declare(strict_types=1);
if(!defined('WORDYLAND_API')){http_response_code(404);exit;}
$communityActions=['feedback-create','feedback-list','feedback-status','managed-classes','admin-overview','admin-class-add','presence-heartbeat','presence-leave','roster'];
if(!in_array($action,$communityActions,true))return;
if(($method==='GET')!==in_array($action,['feedback-list','managed-classes','admin-overview','roster'],true))fail('Metodo non consentito.',405);
$db->exec('CREATE TABLE IF NOT EXISTS feedback(id INTEGER PRIMARY KEY,account_id INTEGER REFERENCES accounts(id) ON DELETE CASCADE,profile_id INTEGER REFERENCES profiles(id) ON DELETE SET NULL,kind TEXT NOT NULL,title TEXT NOT NULL,body TEXT NOT NULL,screen TEXT NOT NULL,status TEXT NOT NULL DEFAULT "open",created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS feedback_account ON feedback(account_id,id);');
$isAdmin=$accountRole==='admin';
$offset=max(0,min(1000000,(int)($_GET['offset']??0)));$pageSize=20;
function communityRows(PDO $db,string $sql,array $args=[]): array{$q=$db->prepare($sql);$q->execute($args);return $q->fetchAll();}
if($action==='admin-class-add'){
    if(!$isAdmin)fail('Solo il super amministratore può iscrivere un profilo esistente.',403);
    if(($body['consent']??false)!==true)fail('Conferma la partecipazione alla classe con soprannome, avatar e punti.');
    $club=$body['club']??null;$profile=$body['member']??null;
    if(!is_int($club)||$club<1||!is_int($profile)||$profile<1)fail('Scegli una classe e un profilo validi.');
    limitAttempts($db,'admin-class-add:'.$id,100);
    $db->exec('BEGIN IMMEDIATE');
    try{
        $class=one($db,'SELECT id,name FROM clubs WHERE id=?',[$club]);
        $person=one($db,'SELECT id,account_id,nickname FROM profiles WHERE id=?',[$profile]);
        if(!$class||!$person){$db->exec('ROLLBACK');fail('Classe o profilo non disponibile.',404);}
        $exists=(bool)one($db,'SELECT 1 FROM club_profiles WHERE club_id=? AND profile_id=?',[$club,$profile]);
        if(!$exists&&one($db,'SELECT 1 FROM club_profiles cp JOIN profiles p ON p.id=cp.profile_id WHERE cp.club_id=? AND LOWER(p.nickname)=LOWER(?)',[$club,$person['nickname']])){$db->exec('ROLLBACK');fail('Questo soprannome è già usato nella classe. Cambialo nel profilo prima di iscriverlo.',409);}
        if(!$exists&&(int)one($db,'SELECT COUNT(*) AS n FROM club_profiles WHERE club_id=?',[$club])['n']>=100){$db->exec('ROLLBACK');fail('La classe è al completo.',409);}
        runSql($db,'INSERT OR IGNORE INTO club_accounts(club_id,account_id) VALUES (?,?)',[$club,(int)$person['account_id']]);
        runSql($db,'INSERT OR IGNORE INTO club_profiles(club_id,profile_id) VALUES (?,?)',[$club,$profile]);
        $db->exec('COMMIT');
    }catch(Throwable $error){try{$db->exec('ROLLBACK');}catch(Throwable $ignored){}throw $error;}
    respond(['added'=>!$exists,'className'=>$class['name'],'nickname'=>$person['nickname']]);
}
if(in_array($action,['presence-heartbeat','presence-leave'],true)){
    $profile=ownedProfile($db,$id,$body['profile']??0);$tab=$body['tab']??'';
    if(!is_string($tab)||!preg_match('/^[a-f0-9]{32}$/D',$tab))fail('Scheda non valida.');
    $session=hash('sha256',session_id());
    if($action==='presence-leave'){runSql($db,'DELETE FROM online_presence WHERE session_key=? AND tab_key=?',[$session,$tab]);respond(['ok'=>true]);}
    $state=$body['state']??'online';if(!is_string($state)||!in_array($state,['online','ready','busy'],true))fail('Stato non valido.');
    limitAttempts($db,'presence:'.$id,1200);
    $db->exec('BEGIN IMMEDIATE');
    runSql($db,'DELETE FROM online_presence WHERE last_seen<?',[time()-90]);
    if(!one($db,'SELECT 1 FROM online_presence WHERE session_key=? AND tab_key=?',[$session,$tab]) && (int)one($db,'SELECT COUNT(*) AS n FROM online_presence WHERE session_key=?',[$session])['n']>=8){$db->exec('ROLLBACK');fail('Troppe schede aperte.',429);}
    runSql($db,'INSERT INTO online_presence(session_key,tab_key,profile_id,session_version,state,last_seen) VALUES (?,?,?,?,?,?) ON CONFLICT(session_key,tab_key) DO UPDATE SET profile_id=excluded.profile_id,session_version=excluded.session_version,state=excluded.state,last_seen=excluded.last_seen',[$session,$tab,(int)$profile['id'],(int)($_SESSION['version']??0),$state,time()]);
    $db->exec('COMMIT');respond(['ok'=>true,'state'=>$state,'expiresIn'=>90]);
}
if($action==='roster'){
    $all=($_GET['scope']??'class')==='all';if($all&&!$isAdmin)fail('Elenco completo riservato all’amministratore.',403);
    $filter=$_GET['filter']??'all';if(!in_array($filter,['all','online','today','played'],true))fail('Filtro non valido.');
    if(in_array($filter,['today','played'],true)&&!$all)fail('Questo filtro è riservato all’amministratore.',403);
    $clubs=$all?[]:array_column(communityRows($db,'SELECT DISTINCT c.id FROM clubs c LEFT JOIN club_profiles cp ON cp.club_id=c.id LEFT JOIN profiles p ON p.id=cp.profile_id WHERE c.owner_id=? OR p.account_id=?',[$id,$id]),'id');
    $where=$all?'1=1':'p.account_id=?';$args=$all?[]:[$id];
    if($clubs){$where='('.$where.' OR p.id IN (SELECT profile_id FROM club_profiles WHERE club_id IN ('.implode(',',array_fill(0,count($clubs),'?')).')))';$args=array_merge($args,$clubs);}
    $played='(EXISTS(SELECT 1 FROM rewards rr WHERE rr.profile_id=p.id) OR EXISTS(SELECT 1 FROM practice pp WHERE pp.profile_id=p.id AND (pp.good>0 OR pp.wrong>0)) OR EXISTS(SELECT 1 FROM duel_players dp WHERE dp.profile=p.id AND dp.step>0))';
    $start=(new DateTimeImmutable('today',new DateTimeZone('Europe/Rome')))->getTimestamp();
    $from=' FROM profiles p JOIN accounts a ON a.id=p.account_id LEFT JOIN wallets w ON w.profile_id=p.id LEFT JOIN (SELECT op.profile_id,MAX(CASE op.state WHEN "busy" THEN 3 WHEN "ready" THEN 2 ELSE 1 END) AS presence_rank FROM online_presence op JOIN profiles pp ON pp.id=op.profile_id JOIN accounts aa ON aa.id=pp.account_id AND aa.session_version=op.session_version WHERE op.last_seen>='.(time()-90).' GROUP BY op.profile_id) pr ON pr.profile_id=p.id WHERE '.$where;
    $summary=communityRows($db,'SELECT COUNT(*) AS registered,COALESCE(SUM(pr.presence_rank IS NOT NULL),0) AS online,COALESCE(SUM(pr.presence_rank=2),0) AS ready'.($all?',COALESCE(SUM(a.role="learner" AND a.created_at>='.$start.'),0) AS today,COALESCE(SUM('.$played.'),0) AS played':'').$from,$args)[0];
    if($all){$summary['accounts']=(int)$db->query('SELECT COUNT(*) FROM accounts')->fetchColumn();$summary['withoutProfile']=(int)$db->query('SELECT COUNT(*) FROM accounts a WHERE NOT EXISTS(SELECT 1 FROM profiles p WHERE p.account_id=a.id)')->fetchColumn();}
    $extra=$filter==='online'?' AND pr.presence_rank IS NOT NULL':($filter==='today'?' AND a.role="learner" AND a.created_at>='.$start:($filter==='played'?' AND '.$played:''));
    $total=(int)communityRows($db,'SELECT COUNT(*) AS n'.$from.$extra,$args)[0]['n'];
    $items=communityRows($db,'SELECT p.id,p.nickname,w.equipped,COALESCE(pr.presence_rank,0) AS presence_rank'.($all?',a.username,a.role,a.created_at AS account_created_at,'.$played.' AS has_server_activity':'').$from.$extra.' ORDER BY CASE pr.presence_rank WHEN 2 THEN 0 WHEN 1 THEN 1 WHEN 3 THEN 2 ELSE 3 END,LOWER(p.nickname),p.id LIMIT 20 OFFSET '.$offset,$args);
    $ids=array_column($items,'id');$classes=[];
    if($ids){$sql='SELECT cp.profile_id,c.name FROM club_profiles cp JOIN clubs c ON c.id=cp.club_id WHERE cp.profile_id IN ('.implode(',',array_fill(0,count($ids),'?')).')';$classArgs=$ids;if(!$all){$sql.=' AND c.id IN ('.($clubs?implode(',',array_fill(0,count($clubs),'?')):'NULL').')';$classArgs=array_merge($classArgs,$clubs);}foreach(communityRows($db,$sql.' ORDER BY c.name',$classArgs) as $row)$classes[(int)$row['profile_id']][]=$row['name'];}
    foreach($items as &$person){$person['equipped']=json_decode($person['equipped']??'{}',true)?:['avatar'=>'fox'];$person['presence']=[0=>'offline',1=>'online',2=>'ready',3=>'busy'][(int)$person['presence_rank']];unset($person['presence_rank']);$person['classes']=$classes[(int)$person['id']]??[];}unset($person);
    respond(['scope'=>$all?'all':'class','items'=>$items,'counts'=>array_map('intval',$summary),'total'=>$total,'offset'=>$offset,'pageSize'=>$pageSize,'updated_at'=>time()]);
}

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
