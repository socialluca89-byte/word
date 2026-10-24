<?php
declare(strict_types=1);
if (!defined('WORDYLAND_BOOTSTRAPPED')) { http_response_code(404); exit; }
$db->exec('CREATE TABLE IF NOT EXISTS wallets(profile_id INTEGER PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE, coins INTEGER NOT NULL DEFAULT 0, xp INTEGER NOT NULL DEFAULT 0, equipped TEXT NOT NULL DEFAULT "{}");
CREATE TABLE IF NOT EXISTS inventory(profile_id INTEGER REFERENCES profiles(id) ON DELETE CASCADE,item TEXT,PRIMARY KEY(profile_id,item));
CREATE TABLE IF NOT EXISTS quests(token TEXT PRIMARY KEY,profile_id INTEGER REFERENCES profiles(id) ON DELETE CASCADE,questions TEXT,step INTEGER DEFAULT 0,xp INTEGER DEFAULT 0,recovered INTEGER DEFAULT 0,completed INTEGER DEFAULT 0,created_at INTEGER);
CREATE TABLE IF NOT EXISTS practice(profile_id INTEGER REFERENCES profiles(id) ON DELETE CASCADE,word TEXT,good INTEGER DEFAULT 0,wrong INTEGER DEFAULT 0,PRIMARY KEY(profile_id,word));
CREATE TABLE IF NOT EXISTS practice_outcomes(profile_id INTEGER REFERENCES profiles(id) ON DELETE CASCADE,word TEXT,independent INTEGER NOT NULL DEFAULT 0,assisted INTEGER NOT NULL DEFAULT 0,corrected INTEGER NOT NULL DEFAULT 0,observed INTEGER NOT NULL DEFAULT 0,needs_review INTEGER NOT NULL DEFAULT 0,review_at INTEGER NOT NULL DEFAULT 0,PRIMARY KEY(profile_id,word));
CREATE TABLE IF NOT EXISTS credits(profile_id INTEGER REFERENCES profiles(id) ON DELETE CASCADE,word TEXT,day TEXT,PRIMARY KEY(profile_id,word,day));
CREATE TABLE IF NOT EXISTS rewards(token TEXT PRIMARY KEY REFERENCES quests(token) ON DELETE CASCADE,profile_id INTEGER REFERENCES profiles(id) ON DELETE CASCADE,xp INTEGER,coins INTEGER,recovered INTEGER,created_at INTEGER);
CREATE TABLE IF NOT EXISTS studies(id INTEGER PRIMARY KEY,profile_id INTEGER REFERENCES profiles(id) ON DELETE CASCADE,title TEXT,words TEXT,file TEXT,original_name TEXT,created_at INTEGER);
CREATE TABLE IF NOT EXISTS clubs(id INTEGER PRIMARY KEY,name TEXT,invite_hash TEXT UNIQUE,owner_id INTEGER REFERENCES accounts(id) ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS club_accounts(club_id INTEGER REFERENCES clubs(id) ON DELETE CASCADE,account_id INTEGER REFERENCES accounts(id) ON DELETE CASCADE,PRIMARY KEY(club_id,account_id));
CREATE TABLE IF NOT EXISTS club_profiles(club_id INTEGER REFERENCES clubs(id) ON DELETE CASCADE,profile_id INTEGER REFERENCES profiles(id) ON DELETE CASCADE,PRIMARY KEY(club_id,profile_id));');
// Recheck under a write lock: two first requests must not race the migration.
function ensureActivityColumn(PDO $db, string $table, string $default): void {
    $columns=array_column($db->query('PRAGMA table_info('.$table.')')->fetchAll(),'name');
    if(in_array('activity',$columns,true))return;
    $db->exec('BEGIN IMMEDIATE');
    try {
        $columns=array_column($db->query('PRAGMA table_info('.$table.')')->fetchAll(),'name');
        if(!in_array('activity',$columns,true))$db->exec('ALTER TABLE '.$table.' ADD COLUMN activity TEXT NOT NULL DEFAULT '.$db->quote($default));
        $db->exec('COMMIT');
    } catch(Throwable $error) { $db->exec('ROLLBACK'); throw $error; }
}
foreach (['quests','rewards'] as $table) ensureActivityColumn($db,$table,'classic');
// Add review metadata without guessing or rewriting any historical learning counters.
$outcomeColumns=array_column($db->query('PRAGMA table_info(practice_outcomes)')->fetchAll(),'name');
if(array_diff(['needs_review','review_at'],$outcomeColumns)) {
    $db->exec('BEGIN IMMEDIATE');
    try {
        $outcomeColumns=array_column($db->query('PRAGMA table_info(practice_outcomes)')->fetchAll(),'name');
        foreach(['needs_review','review_at'] as $column)if(!in_array($column,$outcomeColumns,true))$db->exec('ALTER TABLE practice_outcomes ADD COLUMN '.$column.' INTEGER NOT NULL DEFAULT 0');
        $db->exec('COMMIT');
    }catch(Throwable $error){$db->exec('ROLLBACK');throw $error;}
}

function adventureActivities(): array { return ['classic','treehouse','pets','creative','kart','football','space','ocean','dino']; }

function one(PDO $db, string $sql, array $params = []): array|false { $q = $db->prepare($sql); $q->execute($params); return $q->fetch(); }
function rows(PDO $db, string $sql, array $params = []): array { $q = $db->prepare($sql); $q->execute($params); return $q->fetchAll(); }
function runSql(PDO $db, string $sql, array $params = []): void { $db->prepare($sql)->execute($params); }
function markPracticeReview(PDO $db,int $pid,string $word): void {
    runSql($db,'INSERT INTO practice_outcomes(profile_id,word,needs_review,review_at) VALUES (?,?,1,?) ON CONFLICT(profile_id,word) DO UPDATE SET needs_review=1,review_at=excluded.review_at',[$pid,$word,time()]);
}

function ownedProfile(PDO $db, int $account, mixed $profile): array {
    $p = one($db, 'SELECT * FROM profiles WHERE id=? AND account_id=?', [(int)$profile, $account]);
    if (!$p) fail('Scegli un profilo del tuo account.', 404);
    return $p;
}
function shopCatalog(): array { return [
    ['id'=>'fox','name'=>'Volpe esploratrice','icon'=>'🦊','slot'=>'avatar','price'=>0],
    ['id'=>'panda','name'=>'Panda delle stelle','icon'=>'🐼','slot'=>'avatar','price'=>30],
    ['id'=>'robot','name'=>'Robot inventore','icon'=>'🤖','slot'=>'avatar','price'=>45],
    ['id'=>'dragon','name'=>'Drago delle parole','icon'=>'🐉','slot'=>'avatar','price'=>60],
    ['id'=>'octopus','name'=>'Polpo creativo','icon'=>'🐙','slot'=>'avatar','price'=>45],
    ['id'=>'lion','name'=>'Leone coraggioso','icon'=>'🦁','slot'=>'avatar','price'=>60],
    ['id'=>'cap','name'=>'Cappello da avventura','icon'=>'🧢','slot'=>'hat','price'=>20],
    ['id'=>'crown','name'=>'Corona delle scoperte','icon'=>'👑','slot'=>'hat','price'=>40],
    ['id'=>'sparkles','name'=>'Scia luminosa','icon'=>'✨','slot'=>'effect','price'=>25],
    ['id'=>'flight','name'=>'Volo delle parole','icon'=>'🪽','slot'=>'effect','price'=>50],
    ['id'=>'confetti','name'=>'Festa di coriandoli','icon'=>'🎉','slot'=>'effect','price'=>35],
    ['id'=>'pet-fox','name'=>'Volpina curiosa','icon'=>'🦊','slot'=>'pet','price'=>0],
    ['id'=>'pet-bunny','name'=>'Coniglietto soffice','icon'=>'🐰','slot'=>'pet','price'=>0],
    ['id'=>'pet-cat','name'=>'Gattino delle nuvole','icon'=>'🐱','slot'=>'pet','price'=>0],
    ['id'=>'room-sky','name'=>'Casa cielo','icon'=>'🩵','slot'=>'room','price'=>0],
    ['id'=>'room-peach','name'=>'Casa pesca','icon'=>'🍑','slot'=>'room','price'=>0],
    ['id'=>'room-mint','name'=>'Casa menta','icon'=>'🌿','slot'=>'room','price'=>0],
    ['id'=>'plant','name'=>'Pianta delle scoperte','icon'=>'🪴','slot'=>'plant','price'=>20],
    ['id'=>'rug','name'=>'Tappeto arcobaleno','icon'=>'🌈','slot'=>'rug','price'=>20],
    ['id'=>'lamp','name'=>'Lampada stellina','icon'=>'💡','slot'=>'lamp','price'=>25],
    ['id'=>'kart-blue','name'=>'Kart blu','icon'=>'💙','slot'=>'kart','price'=>0],
    ['id'=>'kart-pink','name'=>'Kart corallo','icon'=>'🩷','slot'=>'kart','price'=>0],
    ['id'=>'kart-mint','name'=>'Kart menta','icon'=>'💚','slot'=>'kart','price'=>20],
    ['id'=>'paint-sun','name'=>'Colori del sole','icon'=>'🌞','slot'=>'palette','price'=>0],
    ['id'=>'paint-ocean','name'=>'Colori dell’oceano','icon'=>'🌊','slot'=>'palette','price'=>0],
    ['id'=>'paint-berry','name'=>'Colori dei frutti','icon'=>'🍓','slot'=>'palette','price'=>0],
    ['id'=>'hat-wizard','name'=>'Cappello delle magie','icon'=>'🧙','slot'=>'hat','price'=>30],
    ['id'=>'hat-flowers','name'=>'Corona di fiori','icon'=>'🌸','slot'=>'hat','price'=>20],
    ['id'=>'effect-bubbles','name'=>'Bolle di sapone','icon'=>'🫧','slot'=>'effect','price'=>25],
    ['id'=>'effect-rainbow','name'=>'Cerchio arcobaleno','icon'=>'🌈','slot'=>'effect','price'=>35],
    ['id'=>'pet-turtle','name'=>'Tartaruga curiosa','icon'=>'🐢','slot'=>'pet','price'=>20],
    ['id'=>'pet-penguin','name'=>'Pinguino delle nevi','icon'=>'🐧','slot'=>'pet','price'=>25],
    ['id'=>'room-lavender','name'=>'Casa lavanda','icon'=>'💜','slot'=>'room','price'=>20],
    ['id'=>'room-sunset','name'=>'Casa tramonto','icon'=>'🌅','slot'=>'room','price'=>20],
    ['id'=>'kart-gold','name'=>'Kart del sole','icon'=>'☀️','slot'=>'kart','price'=>25],
    ['id'=>'kart-purple','name'=>'Kart galassia','icon'=>'💜','slot'=>'kart','price'=>25],
    ['id'=>'paint-forest','name'=>'Colori della foresta','icon'=>'🌳','slot'=>'palette','price'=>15],
    ['id'=>'paint-candy','name'=>'Colori delle caramelle','icon'=>'🍬','slot'=>'palette','price'=>15],
    ['id'=>'trophy-star','name'=>'Stella da esporre','icon'=>'🌟','slot'=>'trophy','price'=>25],
    ['id'=>'trophy-flower','name'=>'Fiore gigante','icon'=>'🌻','slot'=>'trophy','price'=>20],
    ['id'=>'trophy-crystal','name'=>'Cristallo del mare','icon'=>'💎','slot'=>'trophy','price'=>30],
    ['id'=>'ball-sun','name'=>'Pallone del sole','icon'=>'🟠','slot'=>'ball','price'=>15],
    ['id'=>'ball-ocean','name'=>'Pallone dell’oceano','icon'=>'🔵','slot'=>'ball','price'=>15],
    ['id'=>'rocket-mint','name'=>'Razzo menta','icon'=>'💚','slot'=>'rocket','price'=>25],
    ['id'=>'rocket-galaxy','name'=>'Razzo galassia','icon'=>'🟣','slot'=>'rocket','price'=>30],
    ['id'=>'badge-first','name'=>'Prima avventura','icon'=>'🏅','slot'=>'badge','price'=>0,'unlock'=>['missions'=>1]],
    ['id'=>'badge-explorer','name'=>'Tre mondi esplorati','icon'=>'🧭','slot'=>'badge','price'=>0,'unlock'=>['activities'=>3]],
    ['id'=>'badge-persistence','name'=>'Dieci avventure','icon'=>'🎖️','slot'=>'badge','price'=>0,'unlock'=>['missions'=>10]]
]; }
function wallet(PDO $db, int $profile): array {
    runSql($db, 'INSERT OR IGNORE INTO wallets(profile_id) VALUES (?)', [$profile]);
    $w = one($db, 'SELECT coins,xp,equipped FROM wallets WHERE profile_id=?', [$profile]);
    $w['equipped'] = array_merge(['avatar'=>'fox'], json_decode($w['equipped'], true) ?: []);
    $milestone=one($db,'SELECT COUNT(*) AS missions,COUNT(DISTINCT activity) AS activities FROM rewards WHERE profile_id=?',[$profile]);
    foreach(shopCatalog() as $reward)if(isset($reward['unlock'])){
        $earned=true;foreach($reward['unlock'] as $metric=>$needed)if((int)$milestone[$metric]<$needed)$earned=false;
        if($earned)runSql($db,'INSERT OR IGNORE INTO inventory(profile_id,item) VALUES (?,?)',[$profile,$reward['id']]);
    }
    $w['inventory'] = array_merge(['fox'], array_column(rows($db, 'SELECT item FROM inventory WHERE profile_id=?', [$profile]), 'item'));
    $w['level'] = 1 + (int)floor($w['xp']/100);
    return $w;
}
function normalWord(string $word): string { return trim(preg_replace('/\s+/u', ' ', rtrim(strtolower(str_replace(['’','‘'], "'", $word)), '?!., '))); }
function lessonChoiceKey(string $value): string {
    $word=normalWord($value);
    if(in_array($word,['hello','hi'],true))return '@greeting';
    if(preg_match("/^(?:it's|it is|the (?:cat|mouse|pen|ball) is) (?:by|next to) the (?:book|box|table|desk)$/",$word))return '@spatial:'.str_replace(' next to ',' by ',preg_replace('/^it is /',"it's ",$word));
    return $word;
}
function publicQuestion(array $q, int $step): array {
    $public = $q; unset($public['answer']);
    $public['number'] = $step + 1;
    return $public;
}
function validateWords(mixed $input): array {
    if (!is_array($input) || count($input) < 1 || count($input) > 80) fail('Conferma da 1 a 80 parole o frasi.');
    $out = [];
    foreach ($input as $row) {
        if (!is_array($row) || !is_string($row[0] ?? null) || !is_string($row[1] ?? null) || !preg_match('/^[a-z][a-z ’\x27?,.!-]{0,79}$/iu', $row[0]) || strlen($row[1]) < 1 || strlen($row[1]) > 200) fail('Controlla inglese e traduzione di ogni riga.');
        $out[normalWord($row[0])] = [trim($row[0]), trim($row[1]), '📚'];
    }
    return array_values($out);
}
if ($method === 'POST' && in_array($action, ['new-recovery','delete-account','delete-profile'], true)) {
    limitAttempts($db, 'account-security:'.$id, 10);
    $account = one($db, 'SELECT password_hash FROM accounts WHERE id=?', [$id]);
    if (!is_string($body['password'] ?? null) || !password_verify($body['password'], $account['password_hash'])) fail('Password non corretta.', 401);
    if ($action === 'new-recovery') {
        $code = bin2hex(random_bytes(16));
        runSql($db, 'UPDATE accounts SET recovery_hash=? WHERE id=?', [hash('sha256',$code),$id]);
        respond(['recovery'=>$code]);
    }
    if (($body['confirm'] ?? '') !== 'ELIMINA') fail('Scrivi ELIMINA per confermare.');
    if ($action==='delete-profile') {
        $profile=ownedProfile($db,$id,$body['profile']??0);
        $files=rows($db,'SELECT file FROM studies WHERE profile_id=? AND file IS NOT NULL',[$profile['id']]);
        runSql($db,'DELETE FROM profiles WHERE id=? AND account_id=?',[$profile['id'],$id]);
        foreach($files as $file)if(preg_match('/^[a-f0-9]{32}\.bin$/',$file['file']))@unlink($dataDir.'/materials/'.$file['file']);
        respond(['ok'=>true,'profiles'=>profiles($db,$id)]);
    }
    $files = rows($db, 'SELECT s.file FROM studies s JOIN profiles p ON s.profile_id=p.id WHERE p.account_id=? AND s.file IS NOT NULL', [$id]);
    $db->beginTransaction(); runSql($db, 'DELETE FROM accounts WHERE id=?', [$id]); $db->commit();
    foreach ($files as $file) if (preg_match('/^[a-f0-9]{32}\.bin$/', $file['file'])) @unlink($dataDir.'/materials/'.$file['file']);
    $_SESSION = []; session_destroy(); respond(['ok'=>true]);
}
// Short-lived foreground presence. One lease per browser tab, no activity history.
$db->exec('CREATE TABLE IF NOT EXISTS online_presence(session_key TEXT NOT NULL,tab_key TEXT NOT NULL,profile_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,session_version INTEGER NOT NULL,state TEXT NOT NULL,last_seen INTEGER NOT NULL,PRIMARY KEY(session_key,tab_key)); CREATE INDEX IF NOT EXISTS presence_profile ON online_presence(profile_id,last_seen);');
function onlinePresence(PDO $db,array $ids): array {
    if(!$ids)return [];
    $marks=implode(',',array_fill(0,count($ids),'?'));
    $items=rows($db,'SELECT o.profile_id,MAX(CASE o.state WHEN "busy" THEN 3 WHEN "ready" THEN 2 ELSE 1 END) AS rank FROM online_presence o JOIN profiles p ON p.id=o.profile_id JOIN accounts a ON a.id=p.account_id AND a.session_version=o.session_version WHERE o.last_seen>=? AND o.profile_id IN ('.$marks.') GROUP BY o.profile_id',array_merge([time()-90],$ids));
    $result=[];foreach($items as $row)$result[(int)$row['profile_id']]=[1=>'online',2=>'ready',3=>'busy'][(int)$row['rank']];return $result;
}

// Resume metadata is additive; old in-progress missions remain readable.
if(!in_array('source',array_column($db->query('PRAGMA table_info(quests)')->fetchAll(),'name'),true)){
    $db->exec('BEGIN IMMEDIATE');
    try{if(!in_array('source',array_column($db->query('PRAGMA table_info(quests)')->fetchAll(),'name'),true))$db->exec('ALTER TABLE quests ADD COLUMN source TEXT NOT NULL DEFAULT ""');$db->exec('COMMIT');}catch(Throwable $error){$db->exec('ROLLBACK');throw $error;}
}
$db->exec('CREATE INDEX IF NOT EXISTS quests_resume ON quests(profile_id,completed,created_at)');
function questLifetime(): int{return 604800;}
function questSnapshot(array $quest): array {
    $questions=json_decode($quest['questions'],true);$step=(int)$quest['step'];
    if($quest['source']===''){static $curriculum=null;$curriculum??=json_decode(file_get_contents(__DIR__.'/curriculum.json'),true);foreach(['catpositions','penpositions','mousepositions'] as $category){if(!array_diff(array_column($questions,'word'),array_column($curriculum[$category],0))){$quest['source']=$category;break;}}}
    return ['token'=>$quest['token'],'total'=>count($questions),'step'=>$step,'activity'=>$quest['activity'],'source'=>$quest['source'],'xp'=>(int)$quest['xp'],'expiresAt'=>(int)$quest['created_at']+questLifetime()];
}

require __DIR__ . '/arena.php';
$platformActions = ['hub','pending-games','quest-resume','quest-start','quest-hint','quest-answer','buy','equip','study-save','study-file','study-remove','club-create','club-join','club-leave','rename-profile'];
if (!in_array($action, $platformActions, true)) return;
$p = ownedProfile($db, $id, $method === 'GET' ? ($_GET['profile'] ?? 0) : ($body['profile'] ?? 0));
$pid = (int)$p['id'];
if($method==='POST'&&$action==='rename-profile') {
    $nickname=is_string($body['nickname']??null)?trim($body['nickname']):'';
    if(!$nickname||strlen($nickname)>80)fail('Scegli un soprannome breve.');
    runSql($db,'UPDATE profiles SET nickname=? WHERE id=? AND account_id=?',[$nickname,$pid,$id]);
    respond(['nickname'=>$nickname,'profiles'=>profiles($db,$id)]);
}
if(in_array($action,['pending-games','quest-resume'],true)){
    if($method!=='GET')fail('Metodo non consentito.',405);
    if($action==='quest-resume'){
        $quest=one($db,'SELECT * FROM quests WHERE token=? AND profile_id=?',[(string)($_GET['token']??''),$pid]);
        if(!$quest)fail('Missione non disponibile.',404);
        if((int)$quest['created_at']<time()-questLifetime())fail('Questa missione è scaduta. Puoi iniziarne una nuova.',410);
        if($quest['completed'])fail('Questa missione è già completata.',409);
        $snapshot=questSnapshot($quest);$questions=json_decode($quest['questions'],true);
        respond($snapshot+['question'=>publicQuestion($questions[$snapshot['step']],$snapshot['step'])]);
    }
    $quests=rows($db,'SELECT * FROM quests WHERE profile_id=? AND completed=0 AND created_at>=? ORDER BY created_at DESC,token LIMIT 20',[$pid,time()-questLifetime()]);
    $duels=rows($db,'SELECT d.* FROM duels d JOIN duel_players dp ON dp.duel=d.id AND dp.profile=? WHERE d.state="active" AND d.expires_at>=? ORDER BY d.created_at DESC,d.id LIMIT 40',[$pid,time()]);
    $pending=[];foreach($duels as $duel){$other=(int)$duel['challenger']===$pid?(int)$duel['opponent']:(int)$duel['challenger'];if(!duelClassmates($db,$pid,$other))continue;$view=duelView($db,$duel,$pid);if($view['step']<$view['total'])$pending[]=$view;}
    $incoming=rows($db,'SELECT challenger FROM duels WHERE opponent=? AND state="pending" AND expires_at>=?',[$pid,time()]);
    $invites=0;foreach($incoming as $invitation)if(duelClassmates($db,$pid,(int)$invitation['challenger']))$invites++;
    respond(['quests'=>array_map('questSnapshot',$quests),'duels'=>$pending,'incomingInvites'=>$invites]);
}
if ($method === 'GET' && $action === 'hub') {
    $club = (int)($_GET['club'] ?? 0);
    $clubList = rows($db, 'SELECT c.id,c.name,(c.owner_id=?) AS managed FROM clubs c JOIN club_profiles cp ON cp.club_id=c.id WHERE cp.profile_id=?', [$id,$pid]);
    $week = strtotime('monday this week 00:00 UTC');
    if ($club && !one($db, 'SELECT 1 FROM club_profiles WHERE club_id=? AND profile_id=?', [$club,$pid])) fail('Questo gruppo è riservato ai partecipanti.',403);
    if ($club) $members = rows($db, 'SELECT p.id,p.nickname,w.equipped FROM profiles p JOIN club_profiles cp ON cp.profile_id=p.id LEFT JOIN wallets w ON w.profile_id=p.id WHERE cp.club_id=? ORDER BY p.id LIMIT 100', [$club]);
    else $members = rows($db, 'SELECT p.id,p.nickname,w.equipped FROM profiles p LEFT JOIN wallets w ON w.profile_id=p.id WHERE p.account_id=?', [$id]);
    $board = []; $team = 0;
    foreach ($members as $member) {
        $score = one($db, 'SELECT COALESCE(SUM(xp),0) AS points,COALESCE(SUM(recovered),0) AS improvement,COUNT(*) AS missions FROM rewards WHERE profile_id=? AND created_at>=?', [$member['id'],$week]);
        $team += (int)$score['points'];
        $board[] = ['nickname'=>$member['nickname'],'mine'=>$member['id']===$pid,'equipped'=>json_decode($member['equipped'] ?? '{}',true),'points'=>(int)$score['points'],'improvement'=>(int)$score['improvement'],'missions'=>(int)$score['missions']];
    }
    usort($board, fn($a,$b)=>$b['points']<=>$a['points'] ?: $b['improvement']<=>$a['improvement']);
    respond(['wallet'=>wallet($db,$pid),'catalog'=>shopCatalog(),'studies'=>rows($db,'SELECT id,title,words,original_name FROM studies WHERE profile_id=? ORDER BY id DESC',[$pid]),'clubs'=>$clubList,'board'=>array_slice($board,0,20),'team'=>$team,'teamGoal'=>300,'adventures'=>(object)array_column(rows($db,'SELECT activity,COUNT(*) AS completed FROM rewards WHERE profile_id=? GROUP BY activity',[$pid]),'completed','activity'),'weekStart'=>gmdate('Y-m-d',$week)]);
}
if ($method === 'POST' && $action === 'study-save') {
    if (($body['confirmed'] ?? false) !== true) fail('Controlla e conferma il programma prima di salvarlo.');
    if ((int)one($db,'SELECT COUNT(*) AS n FROM studies WHERE profile_id=?',[$pid])['n'] >= 30) fail('Hai già 30 schede: rimuovine una prima di aggiungerne altre.');
    $title = trim(is_string($body['title'] ?? null) ? $body['title'] : '');
    if (!$title || strlen($title)>120) fail('Inserisci un titolo breve.');
    $words = validateWords($body['words'] ?? null); $file = null; $original = null;
    if (isset($body['attachment'])) {
        limitAttempts($db,'uploads:'.$id,20);
        $a=$body['attachment']; $bytes=base64_decode((string)($a['data'] ?? ''),true);
        if ($bytes===false || strlen($bytes)>4000000 || strlen($bytes)<10) fail('Allegato non valido o superiore a 4 MB.');
        $image=@getimagesizefromstring($bytes);
        if ((!$image || !in_array($image['mime'],['image/jpeg','image/png','image/webp'],true)) && !str_starts_with($bytes,'%PDF-')) fail('Usa una foto JPG, PNG, WebP oppure un PDF.');
        $used=0;
        foreach(rows($db,'SELECT s.file FROM studies s JOIN profiles p ON p.id=s.profile_id WHERE p.account_id=? AND s.file IS NOT NULL',[$id]) as $savedFile)if(preg_match('/^[a-f0-9]{32}\.bin$/',$savedFile['file']))$used+=(int)@filesize($dataDir.'/materials/'.$savedFile['file']);
        if($used+strlen($bytes)>40000000)fail('Hai raggiunto 40 MB di allegati. Rimuovi una scheda prima di caricarne altre.');
        $file=bin2hex(random_bytes(16)).'.bin';
        if (!is_dir($dataDir.'/materials')) mkdir($dataDir.'/materials',0700);
        if (file_put_contents($dataDir.'/materials/'.$file,$bytes,LOCK_EX)===false) throw new RuntimeException('Cannot store material');
        $original=substr(basename((string)($a['name'] ?? 'scheda')),0,150);
    }
    try { runSql($db,'INSERT INTO studies(profile_id,title,words,file,original_name,created_at) VALUES (?,?,?,?,?,?)',[$pid,$title,json_encode($words,JSON_UNESCAPED_UNICODE),$file,$original,time()]); }
    catch (Throwable $e) { if($file)@unlink($dataDir.'/materials/'.$file); throw $e; }
    respond(['ok'=>true]);
}
if ($method === 'GET' && $action === 'study-file') {
    $s=one($db,'SELECT file,original_name FROM studies WHERE id=? AND profile_id=?',[(int)($_GET['study']??0),$pid]);
    if (!$s || !$s['file'] || !preg_match('/^[a-f0-9]{32}\.bin$/',$s['file'])) fail('Allegato non trovato.',404);
    header('Content-Type: application/octet-stream'); header("Content-Disposition: attachment; filename=\"scheda-wordyland\"; filename*=UTF-8''".rawurlencode($s['original_name']));
    readfile($dataDir.'/materials/'.$s['file']); exit;
}
if ($method === 'POST' && $action === 'study-remove') {
    $s=one($db,'SELECT file FROM studies WHERE id=? AND profile_id=?',[(int)($body['study']??0),$pid]);
    if (!$s) fail('Scheda non trovata.',404);
    runSql($db,'DELETE FROM studies WHERE id=? AND profile_id=?',[(int)$body['study'],$pid]);
    if ($s['file'] && preg_match('/^[a-f0-9]{32}\.bin$/',$s['file'])) @unlink($dataDir.'/materials/'.$s['file']);
    respond(['ok'=>true]);
}
if ($method === 'POST' && in_array($action,['buy','equip'],true)) {
    $item=null; foreach(shopCatalog() as $entry) if($entry['id']===($body['item']??''))$item=$entry;
    if (!$item) fail('Oggetto non trovato.',404);
    $db->exec('BEGIN IMMEDIATE'); $w=wallet($db,$pid);
    if(isset($item['unlock'])&&!in_array($item['id'],$w['inventory'],true)){$db->exec('ROLLBACK');fail('Questo distintivo si ottiene completando le avventure indicate.',403);}
    if ($action==='buy' && !in_array($item['id'],$w['inventory'],true)) {
        if ($w['coins']<$item['price']) {$db->exec('ROLLBACK');fail('Ti mancano ancora '.($item['price']-$w['coins']).' monete. Continua la tua avventura!',409);}
        runSql($db,'UPDATE wallets SET coins=coins-? WHERE profile_id=?',[$item['price'],$pid]);
        runSql($db,'INSERT INTO inventory(profile_id,item) VALUES (?,?)',[$pid,$item['id']]);
    } elseif ($action==='equip' && !in_array($item['id'],$w['inventory'],true)) {$db->exec('ROLLBACK');fail('Sblocca prima questo oggetto.',403);}
    $equipped=$w['equipped']; $equipped[$item['slot']]=$item['id'];
    runSql($db,'UPDATE wallets SET equipped=? WHERE profile_id=?',[json_encode($equipped),$pid]); $db->exec('COMMIT');
    respond(['wallet'=>wallet($db,$pid)]);
}
if ($method === 'POST' && $action==='quest-start') {
    limitAttempts($db,'quests:'.$pid,60);
    $activity=$body['activity']??'classic';
    if(!is_string($activity)||!in_array($activity,adventureActivities(),true))fail('Scegli un’avventura disponibile.');
    $study=(int)($body['study']??0);
    if ($study) {
        $s=one($db,'SELECT words FROM studies WHERE id=? AND profile_id=?',[$study,$pid]); if(!$s)fail('Scheda non trovata.',404);
        $pool=json_decode($s['words'],true);
    } else {
        $curriculum=json_decode(file_get_contents(__DIR__.'/curriculum.json'),true,32,JSON_THROW_ON_ERROR);
        $category=$body['category']??'body';
        if(!is_string($category)||($category!=='personal'&&!isset($curriculum[$category])))fail('Scegli un argomento disponibile.');
        if ($category==='personal') {
            $pool=[]; foreach(rows($db,'SELECT words FROM studies WHERE profile_id=?',[$pid]) as $s)$pool=array_merge($pool,json_decode($s['words'],true));
            if(!$pool)$pool=$curriculum['body'];
        } else $pool=$curriculum[$category]??$curriculum['body'];
    }
    $unique=[];foreach($pool as $word)$unique[normalWord($word[0])]=$word; $pool=array_values($unique);
    shuffle($pool);
    $review=array_column(rows($db,'SELECT p.word,COALESCE(o.review_at,0) AS review_at FROM practice p LEFT JOIN practice_outcomes o ON o.profile_id=p.profile_id AND o.word=p.word WHERE p.profile_id=? AND (COALESCE(o.needs_review,0)=1 OR (p.wrong>0 AND (p.good-COALESCE(o.observed,0)+COALESCE(o.independent,0))<3))',[$pid]),'review_at','word');
    usort($pool,fn($a,$b)=>((int)array_key_exists(normalWord($b[0]),$review)<=>(int)array_key_exists(normalWord($a[0]),$review))?:((int)($review[normalWord($b[0])]??0)<=>(int)($review[normalWord($a[0])]??0)));
    $selected=array_slice($pool,0,3);$questions=[];
    foreach($selected as $i=>$word) {
        $kind=$i===count($selected)-1?'write':($i===0?'choice':(random_int(0,1)?'missing':'build'));
        $q=['word'=>$word[0],'translation'=>$word[1],'emoji'=>$word[2],'kind'=>$kind,'answer'=>$word[0]];
        $meta=$word[3]??[];
        if(isset($meta['prompt']))$q['prompt']=$meta['prompt'];
        if($i===0&&($meta['type']??'')==='count') {
            $q['kind']=$kind='count';$alternatives=[];
            foreach(['one','two','three','four','five','six','seven','eight','nine','ten'] as $j=>$number) {
                $phrase=$number.' '.($j===0?$meta['singular']:$meta['plural']);
                if($phrase!==$word[0])$alternatives[]=[$phrase,'',''];
            }
            shuffle($alternatives);$q['options']=array_merge([$word],array_slice($alternatives,0,3));shuffle($q['options']);
        } elseif($i===0&&($meta['type']??'')==='dialogue') {
            $q['kind']=$kind='dialogue';$alternatives=array_values(array_filter($pool,fn($r)=>$r[0]!==$word[0]&&($r[3]['prompt']??'')!==$meta['prompt']));
            shuffle($alternatives);$q['options']=array_merge([$word],array_slice($alternatives,0,3));shuffle($q['options']);
        }
        if($i===1) {
            $pattern=($meta['type']??'')==='count'?'/^([a-z]+)\s/i':'/(?:^|\s)(in front of|next to|between|behind|under|on|in|by)(?=\s|$)/i';
            if(preg_match($pattern,$word[0],$gap,PREG_OFFSET_CAPTURE)) {
                $q['kind']=$kind='gap';$q['answer']=$gap[1][0];
                $q['mask']=substr_replace($word[0],str_repeat('_',strlen($gap[1][0])),$gap[1][1],strlen($gap[1][0]));
            }
        }
        if($kind==='missing') {
            preg_match_all('/[a-z]/i',$word[0],$matches,PREG_OFFSET_CAPTURE);$letter=$matches[0][array_rand($matches[0])];
            $q['mask']=substr_replace($word[0],'_', $letter[1],1);$q['answer']=$letter[0];
        }
        if($kind==='choice') {
            $options=[$word];$seen=[lessonChoiceKey($word[0])=>true];
            foreach($pool as $other){$key=lessonChoiceKey($other[0]);if(!isset($seen[$key]) && count($options)<4){$options[]=$other;$seen[$key]=true;}}
            shuffle($options);$q['options']=$options;
        }
        $questions[]=$q;
    }
    $token=bin2hex(random_bytes(16));
    runSql($db,'DELETE FROM quests WHERE profile_id=? AND completed=0 AND created_at<?',[$pid,time()-questLifetime()]);
    runSql($db,'INSERT INTO quests(token,profile_id,questions,created_at,activity,source) VALUES (?,?,?,?,?,?)',[$token,$pid,json_encode($questions,JSON_UNESCAPED_UNICODE),time(),$activity,$study?'study:'.$study:$category]);
    respond(['token'=>$token,'total'=>count($questions),'question'=>publicQuestion($questions[0],0)]);
}
if ($method==='POST' && $action==='quest-hint') {
    limitAttempts($db,'quest-hint:'.$pid,300);
    $db->exec('BEGIN IMMEDIATE');
    $quest=one($db,'SELECT * FROM quests WHERE token=? AND profile_id=?',[(string)($body['token']??''),$pid]);
    if(!$quest || $quest['created_at']<time()-questLifetime()){$db->exec('ROLLBACK');fail('Questa missione è terminata. Iniziane una nuova.',410);}
    if($quest['completed'] || ($body['step']??null)!==(int)$quest['step']){$db->exec('ROLLBACK');fail('La missione è avanzata: riparti dalla schermata attuale.',409);}
    $questions=json_decode($quest['questions'],true);
    $questions[$quest['step']]['assisted']=true;
    markPracticeReview($db,$pid,normalWord($questions[$quest['step']]['word']));
    runSql($db,'UPDATE quests SET questions=? WHERE token=?',[json_encode($questions,JSON_UNESCAPED_UNICODE),$quest['token']]);
    $db->exec('COMMIT');respond(['ok'=>true]);
}
if ($method==='POST' && $action==='quest-answer') {
    $db->exec('BEGIN IMMEDIATE');
    $quest=one($db,'SELECT * FROM quests WHERE token=? AND profile_id=?',[(string)($body['token']??''),$pid]);
    if(!$quest || $quest['created_at']<time()-questLifetime()){$db->exec('ROLLBACK');fail('Questa missione è terminata. Iniziane una nuova.',410);}
    if($quest['completed']){$db->exec('ROLLBACK');fail('Premio già assegnato a questa missione.',409);}
    if(($body['step']??null)!==(int)$quest['step']){$db->exec('ROLLBACK');fail('La missione è avanzata: riparti dalla schermata attuale.',409);}
    $questions=json_decode($quest['questions'],true);
    // A reported help can only lower autonomy; it cannot clear server-recorded errors/help.
    if(($body['assisted']??false)===true)$questions[$quest['step']]['assisted']=true;
    $q=$questions[$quest['step']];$word=normalWord($q['word']);
    $answer=is_string($body['answer']??null)?$body['answer']:'';
    runSql($db,'INSERT OR IGNORE INTO practice(profile_id,word) VALUES (?,?)',[$pid,$word]);
    if(normalWord($answer)!==normalWord($q['answer'])) {
        $questions[$quest['step']]['hadErrors']=true;
        markPracticeReview($db,$pid,$word);
        runSql($db,'UPDATE quests SET questions=? WHERE token=?',[json_encode($questions,JSON_UNESCAPED_UNICODE),$quest['token']]);
        runSql($db,'UPDATE practice SET wrong=wrong+1 WHERE profile_id=? AND word=?',[$pid,$word]);$db->exec('COMMIT');
        respond(['correct'=>false,'message'=>'Riascolta e riprova con calma. Gli aiuti sono sempre disponibili.']);
    }
    $practice=one($db,'SELECT good,wrong FROM practice WHERE profile_id=? AND word=?',[$pid,$word]);
    $recovered=$practice['wrong']>0 && $practice['good']===0 ? 1:0;
    runSql($db,'UPDATE practice SET good=good+1 WHERE profile_id=? AND word=?',[$pid,$word]);
    $assisted=!empty($q['assisted']);$corrected=!empty($q['hadErrors']);$independent=!$assisted&&!$corrected;
    runSql($db,'INSERT INTO practice_outcomes(profile_id,word,independent,assisted,corrected,observed,needs_review,review_at) VALUES (?,?,?,?,?,1,?,?) ON CONFLICT(profile_id,word) DO UPDATE SET independent=independent+excluded.independent,assisted=assisted+excluded.assisted,corrected=corrected+excluded.corrected,observed=observed+1,needs_review=excluded.needs_review,review_at=excluded.review_at',[$pid,$word,(int)$independent,(int)$assisted,(int)$corrected,(int)!$independent,$independent?0:time()]);
    $day=gmdate('Y-m-d');$already=one($db,'SELECT 1 FROM credits WHERE profile_id=? AND word=? AND day=?',[$pid,$word,$day]);
    $today=(int)one($db,'SELECT COUNT(*) AS n FROM credits WHERE profile_id=? AND day=?',[$pid,$day])['n'];
    $xp=(!$already && $today<15)?10:0;
    if($xp)runSql($db,'INSERT INTO credits(profile_id,word,day) VALUES (?,?,?)',[$pid,$word,$day]);
    wallet($db,$pid);runSql($db,'UPDATE wallets SET xp=xp+? WHERE profile_id=?',[$xp,$pid]);
    $next=(int)$quest['step']+1;$totalXp=(int)$quest['xp']+$xp;$totalRecovered=(int)$quest['recovered']+$recovered;$finished=$next>=count($questions);$coins=0;
    if($finished) {
        $paid=(int)one($db,'SELECT COUNT(*) AS n FROM rewards WHERE profile_id=? AND coins>0 AND created_at>=?',[$pid,strtotime(gmdate('Y-m-d').' 00:00 UTC')])['n'];
        $coins=($paid<3 && $totalXp>0)?15+($totalRecovered?5:0):0;
        runSql($db,'UPDATE wallets SET coins=coins+? WHERE profile_id=?',[$coins,$pid]);
        runSql($db,'INSERT INTO rewards(token,profile_id,xp,coins,recovered,created_at,activity) VALUES (?,?,?,?,?,?,?)',[$quest['token'],$pid,$totalXp,$coins,$totalRecovered,time(),$quest['activity']]);
    }
    runSql($db,'UPDATE quests SET step=?,xp=?,recovered=?,completed=?,questions=? WHERE token=?',[$next,$totalXp,$totalRecovered,(int)$finished,json_encode($questions,JSON_UNESCAPED_UNICODE),$quest['token']]);$db->exec('COMMIT');
    respond(['correct'=>true,'independent'=>$independent,'assisted'=>$assisted,'corrected'=>$corrected,'done'=>$finished,'xp'=>$totalXp,'coins'=>$coins,'recovered'=>$totalRecovered,'wallet'=>wallet($db,$pid),'question'=>$finished?null:publicQuestion($questions[$next],$next)]);
}
if ($method==='POST' && $action==='club-create') {
    if(($body['consent']??false)!==true)fail('Conferma la partecipazione con soprannome e avatar.');
    $name=trim(is_string($body['name']??null)?$body['name']:'');if(!$name || strlen($name)>80)fail('Scegli un nome breve per il gruppo.');
    limitAttempts($db,'clubs:'.$id,5);$code=bin2hex(random_bytes(12));
    $db->beginTransaction();runSql($db,'INSERT INTO clubs(name,invite_hash,owner_id) VALUES (?,?,?)',[$name,hash('sha256',$code),$id]);$club=(int)$db->lastInsertId();
    runSql($db,'INSERT INTO club_accounts(club_id,account_id) VALUES (?,?)',[$club,$id]);runSql($db,'INSERT INTO club_profiles(club_id,profile_id) VALUES (?,?)',[$club,$pid]);runSql($db,'INSERT INTO class_links(club_id,code) VALUES (?,?)',[$club,$code]);$db->commit();
    respond(['code'=>$code,'id'=>$club]);
}
if ($method==='POST' && $action==='club-join') {
    if(($body['consent']??false)!==true)fail('Conferma la partecipazione con soprannome e avatar.');
    limitAttempts($db,'club-join:'.$id,20);$code=strtolower(trim((string)($body['code']??'')));
    $club=one($db,'SELECT id FROM clubs WHERE invite_hash=?',[hash('sha256',$code)]);if(!$club)fail('Codice gruppo non valido.',404);
    $db->exec('BEGIN IMMEDIATE');if((int)one($db,'SELECT COUNT(*) AS n FROM club_profiles WHERE club_id=?',[$club['id']])['n']>=100){$db->exec('ROLLBACK');fail('Il gruppo è completo.');}
    runSql($db,'INSERT OR IGNORE INTO club_accounts(club_id,account_id) VALUES (?,?)',[$club['id'],$id]);runSql($db,'INSERT OR IGNORE INTO club_profiles(club_id,profile_id) VALUES (?,?)',[$club['id'],$pid]);$db->exec('COMMIT');respond(['id'=>$club['id']]);
}
if ($method==='POST' && $action==='club-leave') {
    runSql($db,'DELETE FROM club_profiles WHERE club_id=? AND profile_id=?',[(int)($body['club']??0),$pid]);respond(['ok'=>true]);
}
fail('Operazione non trovata.',404);
