<?php
declare(strict_types=1);
if (!defined('WORDYLAND_BOOTSTRAPPED')) { http_response_code(404); exit; }
$db->exec('CREATE TABLE IF NOT EXISTS wallets(profile_id INTEGER PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE, coins INTEGER NOT NULL DEFAULT 0, xp INTEGER NOT NULL DEFAULT 0, equipped TEXT NOT NULL DEFAULT "{}");
CREATE TABLE IF NOT EXISTS inventory(profile_id INTEGER REFERENCES profiles(id) ON DELETE CASCADE,item TEXT,PRIMARY KEY(profile_id,item));
CREATE TABLE IF NOT EXISTS quests(token TEXT PRIMARY KEY,profile_id INTEGER REFERENCES profiles(id) ON DELETE CASCADE,questions TEXT,step INTEGER DEFAULT 0,xp INTEGER DEFAULT 0,recovered INTEGER DEFAULT 0,completed INTEGER DEFAULT 0,created_at INTEGER);
CREATE TABLE IF NOT EXISTS practice(profile_id INTEGER REFERENCES profiles(id) ON DELETE CASCADE,word TEXT,good INTEGER DEFAULT 0,wrong INTEGER DEFAULT 0,PRIMARY KEY(profile_id,word));
CREATE TABLE IF NOT EXISTS credits(profile_id INTEGER REFERENCES profiles(id) ON DELETE CASCADE,word TEXT,day TEXT,PRIMARY KEY(profile_id,word,day));
CREATE TABLE IF NOT EXISTS rewards(token TEXT PRIMARY KEY REFERENCES quests(token) ON DELETE CASCADE,profile_id INTEGER REFERENCES profiles(id) ON DELETE CASCADE,xp INTEGER,coins INTEGER,recovered INTEGER,created_at INTEGER);
CREATE TABLE IF NOT EXISTS studies(id INTEGER PRIMARY KEY,profile_id INTEGER REFERENCES profiles(id) ON DELETE CASCADE,title TEXT,words TEXT,file TEXT,original_name TEXT,created_at INTEGER);
CREATE TABLE IF NOT EXISTS clubs(id INTEGER PRIMARY KEY,name TEXT,invite_hash TEXT UNIQUE,owner_id INTEGER REFERENCES accounts(id) ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS club_accounts(club_id INTEGER REFERENCES clubs(id) ON DELETE CASCADE,account_id INTEGER REFERENCES accounts(id) ON DELETE CASCADE,PRIMARY KEY(club_id,account_id));
CREATE TABLE IF NOT EXISTS club_profiles(club_id INTEGER REFERENCES clubs(id) ON DELETE CASCADE,profile_id INTEGER REFERENCES profiles(id) ON DELETE CASCADE,PRIMARY KEY(club_id,profile_id));');
function one(PDO $db, string $sql, array $params = []): array|false { $q = $db->prepare($sql); $q->execute($params); return $q->fetch(); }
function rows(PDO $db, string $sql, array $params = []): array { $q = $db->prepare($sql); $q->execute($params); return $q->fetchAll(); }
function runSql(PDO $db, string $sql, array $params = []): void { $db->prepare($sql)->execute($params); }
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
    ['id'=>'confetti','name'=>'Festa di coriandoli','icon'=>'🎉','slot'=>'effect','price'=>35]
]; }
function wallet(PDO $db, int $profile): array {
    runSql($db, 'INSERT OR IGNORE INTO wallets(profile_id) VALUES (?)', [$profile]);
    $w = one($db, 'SELECT coins,xp,equipped FROM wallets WHERE profile_id=?', [$profile]);
    $w['equipped'] = json_decode($w['equipped'], true) ?: ['avatar'=>'fox'];
    $w['inventory'] = array_merge(['fox'], array_column(rows($db, 'SELECT item FROM inventory WHERE profile_id=?', [$profile]), 'item'));
    $w['level'] = 1 + (int)floor($w['xp']/100);
    return $w;
}
function normalWord(string $word): string { return trim(preg_replace('/\s+/u', ' ', rtrim(strtolower(str_replace(['’','‘'], "'", $word)), '?!., '))); }
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
require __DIR__ . '/arena.php';
$platformActions = ['hub','quest-start','quest-answer','buy','equip','study-save','study-file','study-remove','club-create','club-join','club-leave','rename-profile'];
if (!in_array($action, $platformActions, true)) return;
$p = ownedProfile($db, $id, $method === 'GET' ? ($_GET['profile'] ?? 0) : ($body['profile'] ?? 0));
$pid = (int)$p['id'];
if($method==='POST'&&$action==='rename-profile') {
    $nickname=is_string($body['nickname']??null)?trim($body['nickname']):'';
    if(!$nickname||strlen($nickname)>80)fail('Scegli un soprannome breve.');
    runSql($db,'UPDATE profiles SET nickname=? WHERE id=? AND account_id=?',[$nickname,$pid,$id]);
    respond(['nickname'=>$nickname,'profiles'=>profiles($db,$id)]);
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
    respond(['wallet'=>wallet($db,$pid),'catalog'=>shopCatalog(),'studies'=>rows($db,'SELECT id,title,words,original_name FROM studies WHERE profile_id=? ORDER BY id DESC',[$pid]),'clubs'=>$clubList,'board'=>array_slice($board,0,20),'team'=>$team,'teamGoal'=>300,'weekStart'=>gmdate('Y-m-d',$week)]);
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
    $study=(int)($body['study']??0);
    if ($study) {
        $s=one($db,'SELECT words FROM studies WHERE id=? AND profile_id=?',[$study,$pid]); if(!$s)fail('Scheda non trovata.',404);
        $pool=json_decode($s['words'],true);
    } else {
        $curriculum=json_decode(file_get_contents(__DIR__.'/curriculum.json'),true,32,JSON_THROW_ON_ERROR);
        $category=$body['category']??'body';
        if ($category==='personal') {
            $pool=[]; foreach(rows($db,'SELECT words FROM studies WHERE profile_id=?',[$pid]) as $s)$pool=array_merge($pool,json_decode($s['words'],true));
            if(!$pool)$pool=$curriculum['body'];
        } else $pool=$curriculum[$category]??$curriculum['body'];
    }
    $unique=[];foreach($pool as $word)$unique[normalWord($word[0])]=$word; $pool=array_values($unique);
    shuffle($pool);
    $difficult=array_column(rows($db,'SELECT word FROM practice WHERE profile_id=? AND wrong>0 AND good<3',[$pid]),'word');
    usort($pool,fn($a,$b)=>(int)in_array(normalWord($b[0]),$difficult,true)<=>(int)in_array(normalWord($a[0]),$difficult,true));
    $selected=array_slice($pool,0,3);$questions=[];
    foreach($selected as $i=>$word) {
        $kind=$i===count($selected)-1?'write':($i===0?'choice':(random_int(0,1)?'missing':'build'));
        $q=['word'=>$word[0],'translation'=>$word[1],'emoji'=>$word[2],'kind'=>$kind,'answer'=>$word[0]];
        if($kind==='missing') {
            preg_match_all('/[a-z]/i',$word[0],$matches,PREG_OFFSET_CAPTURE);$letter=$matches[0][array_rand($matches[0])];
            $q['mask']=substr_replace($word[0],'_', $letter[1],1);$q['answer']=$letter[0];
        }
        if($kind==='choice') {
            $options=[$word]; foreach($pool as $other)if($other[0]!==$word[0] && count($options)<4)$options[]=$other;
            shuffle($options);$q['options']=$options;
        }
        $questions[]=$q;
    }
    $token=bin2hex(random_bytes(16));
    runSql($db,'DELETE FROM quests WHERE profile_id=? AND completed=0 AND created_at<?',[$pid,time()-3600]);
    runSql($db,'INSERT INTO quests(token,profile_id,questions,created_at) VALUES (?,?,?,?)',[$token,$pid,json_encode($questions,JSON_UNESCAPED_UNICODE),time()]);
    respond(['token'=>$token,'total'=>count($questions),'question'=>publicQuestion($questions[0],0)]);
}
if ($method==='POST' && $action==='quest-answer') {
    $db->exec('BEGIN IMMEDIATE');
    $quest=one($db,'SELECT * FROM quests WHERE token=? AND profile_id=?',[(string)($body['token']??''),$pid]);
    if(!$quest || $quest['created_at']<time()-3600){$db->exec('ROLLBACK');fail('Questa missione è terminata. Iniziane una nuova.',410);}
    if($quest['completed']){$db->exec('ROLLBACK');fail('Premio già assegnato a questa missione.',409);}
    if(($body['step']??null)!==(int)$quest['step']){$db->exec('ROLLBACK');fail('La missione è avanzata: riparti dalla schermata attuale.',409);}
    $questions=json_decode($quest['questions'],true);$q=$questions[$quest['step']];$word=normalWord($q['word']);
    $answer=is_string($body['answer']??null)?$body['answer']:'';
    runSql($db,'INSERT OR IGNORE INTO practice(profile_id,word) VALUES (?,?)',[$pid,$word]);
    if(normalWord($answer)!==normalWord($q['answer'])) {
        runSql($db,'UPDATE practice SET wrong=wrong+1 WHERE profile_id=? AND word=?',[$pid,$word]);$db->exec('COMMIT');
        respond(['correct'=>false,'message'=>'Riascolta e riprova con calma. Gli aiuti sono sempre disponibili.']);
    }
    $practice=one($db,'SELECT good,wrong FROM practice WHERE profile_id=? AND word=?',[$pid,$word]);
    $recovered=$practice['wrong']>0 && $practice['good']===0 ? 1:0;
    runSql($db,'UPDATE practice SET good=good+1 WHERE profile_id=? AND word=?',[$pid,$word]);
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
        runSql($db,'INSERT INTO rewards(token,profile_id,xp,coins,recovered,created_at) VALUES (?,?,?,?,?,?)',[$quest['token'],$pid,$totalXp,$coins,$totalRecovered,time()]);
    }
    runSql($db,'UPDATE quests SET step=?,xp=?,recovered=?,completed=? WHERE token=?',[$next,$totalXp,$totalRecovered,(int)$finished,$quest['token']]);$db->exec('COMMIT');
    respond(['correct'=>true,'done'=>$finished,'xp'=>$totalXp,'coins'=>$coins,'recovered'=>$totalRecovered,'wallet'=>wallet($db,$pid),'question'=>$finished?null:publicQuestion($questions[$next],$next)]);
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
