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

/** Merge owned review evidence without copying counters, credits or mastery between games. */
function practiceReviewRows(PDO $db,int $pid): array {
    $review=[];
    foreach(rows($db,'SELECT p.word,COALESCE(o.review_at,0) AS review_at FROM practice p LEFT JOIN practice_outcomes o ON o.profile_id=p.profile_id AND o.word=p.word WHERE p.profile_id=? AND (COALESCE(o.needs_review,0)=1 OR (p.wrong>0 AND (p.good-COALESCE(o.observed,0)+COALESCE(o.independent,0))<3)) ORDER BY review_at DESC,p.word',[$pid]) as $row){$row['sources']=['missions'];$review[$row['word']]=$row;}
    foreach(trainingWordReviewRows($db,$pid) as $row){
        $word=$row['word'];if(isset($review[$word])){$review[$word]['review_at']=max((int)$review[$word]['review_at'],$row['review_at']);$review[$word]['sources'][]='training';}
        else $review[$word]=$row+['sources'=>['training']];
    }
    $review=array_values($review);usort($review,fn($a,$b)=>((int)$b['review_at']<=>(int)$a['review_at'])?:strcmp($a['word'],$b['word']));return $review;
}
/** Only real spelling-recall observations of exact curated words are shared. */
function trainingWordReviewRows(PDO $db,int $pid): array {
    $tables=array_column(rows($db,"SELECT name FROM sqlite_master WHERE type='table' AND name IN ('training_daily','training_sessions')"),'name');
    if(!$tables)return [];
    $content=json_decode(file_get_contents(__DIR__.'/training.json'),true,32,JSON_THROW_ON_ERROR);$allowed=[];
    foreach($content['foundationWords']??$content['words']??[] as $word)if(is_string($word['id']??null)&&preg_match('/^[a-z]+(?: [a-z]+)*$/D',$word['id']))$allowed[$word['id']]=true;
    $out=[];
    // Daily aggregates cannot order same-day attempts. Only later-day autonomous
    // recalls can resolve a difficulty; earlier successes must not hide a new error.
    if(in_array('training_daily',$tables,true))foreach(rows($db,'WITH difficulty AS (SELECT item,MAX(day) AS last_day FROM training_daily WHERE profile_id=? AND skill="spelling.recall" AND day>=? AND day<=? AND (errors>0 OR guided>0) GROUP BY item) SELECT d.item,d.last_day FROM difficulty d LEFT JOIN training_daily t ON t.profile_id=? AND t.item=d.item AND t.skill="spelling.recall" AND t.day>d.last_day AND t.day<=? GROUP BY d.item,d.last_day HAVING COALESCE(SUM(t.independent),0)<3',[$pid,gmdate('Y-m-d',time()-7*86400),gmdate('Y-m-d'),$pid,gmdate('Y-m-d')]) as $row){
        $word=str_starts_with($row['item'],'word:')?substr($row['item'],5):'';
        if(isset($allowed[$word]))$out[$word]=['word'=>$word,'review_at'=>(int)strtotime($row['last_day'].' UTC'),'skill'=>'spelling.recall'];
    }
    if(in_array('training_sessions',$tables,true))foreach(rows($db,'SELECT plan,step,created_at FROM training_sessions WHERE profile_id=? AND completed_at IS NULL AND created_at>=? AND (errors>0 OR helped>0 OR hint>0)',[$pid,time()-604800]) as $session){
        try{$plan=json_decode($session['plan'],true,32,JSON_THROW_ON_ERROR);}catch(JsonException){continue;}
        if(!is_array($plan))continue;$q=$plan[(int)$session['step']]??[];if(!is_array($q)||!is_array($q['word']??null))continue;$word=$q['word']['id']??null;
        if(($q['mode']??null)==='recall'&&is_string($word)&&isset($allowed[$word]))$out[$word]=['word'=>$word,'review_at'=>max((int)($out[$word]['review_at']??0),(int)$session['created_at']),'skill'=>'spelling.recall'];
    }
    return array_values($out);
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
    ['id'=>'hat-santa','name'=>'Cappello di Babbo Natale','icon'=>'🎅','slot'=>'hat','price'=>0,'season'=>'christmas','event'=>'christmas','eventExercises'=>1],
    ['id'=>'hat-elf','name'=>'Cappello da elfo','icon'=>'🧝','slot'=>'hat','price'=>0,'season'=>'christmas','event'=>'christmas','eventExercises'=>3],
    ['id'=>'hat-reindeer','name'=>'Corna da renna','icon'=>'🦌','slot'=>'hat','price'=>0,'season'=>'christmas','event'=>'christmas','eventExercises'=>6],
    ['id'=>'neck-scarf','name'=>'Sciarpa natalizia','icon'=>'🧣','slot'=>'neck','price'=>0,'season'=>'christmas','event'=>'christmas','eventExercises'=>2],
    ['id'=>'neck-none','name'=>'Senza sciarpa','icon'=>'○','slot'=>'neck','price'=>0,'season'=>'christmas'],
    ['id'=>'effect-snow','name'=>'Fiocchi di neve','icon'=>'❄️','slot'=>'effect','price'=>0,'season'=>'christmas','event'=>'christmas','eventExercises'=>5],
    ['id'=>'kart-christmas','name'=>'Kart delle feste','icon'=>'🎁','slot'=>'kart','price'=>0,'season'=>'christmas','event'=>'christmas','eventExercises'=>9],
    ['id'=>'trophy-tree','name'=>'Alberello di Natale','icon'=>'🎄','slot'=>'trophy','price'=>0,'season'=>'christmas','event'=>'christmas','eventExercises'=>4],
    ['id'=>'souvenir-christmas-1','season'=>'christmas','name'=>'Stella del villaggio','icon'=>'⭐','slot'=>'badge','price'=>0,'event'=>'christmas','eventDays'=>1],
    ['id'=>'souvenir-christmas-2','season'=>'christmas','name'=>'Campanella delle feste','icon'=>'🔔','slot'=>'badge','price'=>0,'event'=>'christmas','eventDays'=>3],
    ['id'=>'souvenir-christmas-3','season'=>'christmas','name'=>'Cristallo di Natale','icon'=>'❄️','slot'=>'badge','price'=>0,'event'=>'christmas','eventDays'=>5],
    ['id'=>'souvenir-carnival-1','name'=>'Maschera dei colori','icon'=>'🎭','slot'=>'badge','price'=>0,'event'=>'carnival','eventDays'=>1],
    ['id'=>'souvenir-carnival-2','name'=>'Coriandolo brillante','icon'=>'🎊','slot'=>'badge','price'=>0,'event'=>'carnival','eventDays'=>3],
    ['id'=>'souvenir-carnival-3','name'=>'Stella di Carnevale','icon'=>'🌟','slot'=>'badge','price'=>0,'event'=>'carnival','eventDays'=>5],
    ['id'=>'souvenir-easter-1','name'=>'Uovo dipinto','icon'=>'🥚','slot'=>'badge','price'=>0,'event'=>'easter','eventDays'=>1],
    ['id'=>'souvenir-easter-2','name'=>'Fiore di primavera','icon'=>'🌷','slot'=>'badge','price'=>0,'event'=>'easter','eventDays'=>3],
    ['id'=>'souvenir-easter-3','name'=>'Pulcino delle scoperte','icon'=>'🐣','slot'=>'badge','price'=>0,'event'=>'easter','eventDays'=>5],
    ['id'=>'souvenir-halloween-1','name'=>'Zucchetta sorridente','icon'=>'🎃','slot'=>'badge','price'=>0,'event'=>'halloween','eventDays'=>1],
    ['id'=>'souvenir-halloween-2','name'=>'Luna delle storie','icon'=>'🌙','slot'=>'badge','price'=>0,'event'=>'halloween','eventDays'=>3],
    ['id'=>'souvenir-halloween-3','name'=>'Fantasmino gentile','icon'=>'👻','slot'=>'badge','price'=>0,'event'=>'halloween','eventDays'=>5],
    ['id'=>'hat-snowman','name'=>'Cappello del pupazzo','icon'=>'☃️','slot'=>'hat','price'=>0,'season'=>'christmas','event'=>'christmas','eventExercises'=>7],
    ['id'=>'hat-cookie','name'=>'Cappello biscotto','icon'=>'🍪','slot'=>'hat','price'=>0,'season'=>'christmas','event'=>'christmas','eventExercises'=>10],
    ['id'=>'hat-gift','name'=>'Cappello pacchetto','icon'=>'🎁','slot'=>'hat','price'=>0,'season'=>'christmas','event'=>'christmas','eventExercises'=>13],
    ['id'=>'effect-stars','name'=>'Stelline delle feste','icon'=>'🌟','slot'=>'effect','price'=>0,'season'=>'christmas','event'=>'christmas','eventExercises'=>11],
    ['id'=>'rocket-christmas','name'=>'Razzo pan di zenzero','icon'=>'🚀','slot'=>'rocket','price'=>0,'season'=>'christmas','event'=>'christmas','eventExercises'=>15],
    ['id'=>'reindeer','name'=>'Rudy la renna','icon'=>'🦌','slot'=>'avatar','price'=>0,'season'=>'christmas','event'=>'christmas','eventExercises'=>6],
    ['id'=>'penguin','name'=>'Pip il pinguino','icon'=>'🐧','slot'=>'avatar','price'=>0,'season'=>'christmas','event'=>'christmas','eventExercises'=>12],
    ['id'=>'snowpal','name'=>'Fiocco il pupazzo','icon'=>'☃️','slot'=>'avatar','price'=>0,'season'=>'christmas','event'=>'christmas','eventExercises'=>18],
    ['id'=>'hat-leaf','name'=>'Cappello foglia','icon'=>'🍃','slot'=>'hat','price'=>0,'event'=>'journey','eventExercises'=>3,'collection'=>'bosco'],
    ['id'=>'neck-ocean','name'=>'Sciarpa dell’oceano','icon'=>'🧣','slot'=>'neck','price'=>0,'event'=>'journey','eventExercises'=>6,'collection'=>'bosco'],
    ['id'=>'effect-fireflies','name'=>'Lucciole amiche','icon'=>'✨','slot'=>'effect','price'=>0,'event'=>'journey','eventExercises'=>9,'collection'=>'bosco'],
    ['id'=>'trophy-book','name'=>'Libro delle scoperte','icon'=>'📚','slot'=>'trophy','price'=>0,'event'=>'journey','eventExercises'=>12,'collection'=>'bosco'],
    ['id'=>'bunny','name'=>'Lillo il coniglietto','icon'=>'🐰','slot'=>'avatar','price'=>0,'event'=>'journey','eventExercises'=>18,'collection'=>'viaggio'],
    ['id'=>'kart-leaf','name'=>'Kart della foresta','icon'=>'🌳','slot'=>'kart','price'=>0,'event'=>'journey','eventExercises'=>24,'collection'=>'viaggio'],
    ['id'=>'hat-explorer','name'=>'Cappello da esploratore','icon'=>'🧭','slot'=>'hat','price'=>0,'event'=>'journey','eventExercises'=>30,'collection'=>'viaggio'],
    ['id'=>'rocket-ocean','name'=>'Razzo dell’oceano','icon'=>'🌊','slot'=>'rocket','price'=>0,'event'=>'journey','eventExercises'=>36,'collection'=>'viaggio'],
    ['id'=>'trophy-moon','name'=>'Luna da collezione','icon'=>'🌙','slot'=>'trophy','price'=>0,'event'=>'journey','eventExercises'=>45,'collection'=>'sogni'],
    ['id'=>'koala','name'=>'Kiki il koala','icon'=>'🐨','slot'=>'avatar','price'=>0,'event'=>'journey','eventExercises'=>60,'collection'=>'sogni'],
    ['id'=>'effect-comets','name'=>'Comete gentili','icon'=>'💫','slot'=>'effect','price'=>0,'event'=>'journey','eventExercises'=>75,'collection'=>'sogni'],
    ['id'=>'trophy-garden','name'=>'Giardino delle parole','icon'=>'🌷','slot'=>'trophy','price'=>0,'event'=>'journey','eventExercises'=>90,'collection'=>'sogni'],
    ['id'=>'elf-boy','name'=>'Elio l’elfo','icon'=>'🧝‍♂️','slot'=>'avatar','price'=>0,'season'=>'christmas','event'=>'christmas','eventExercises'=>3],
    ['id'=>'elf-girl','name'=>'Stella l’elfa','icon'=>'🧝‍♀️','slot'=>'avatar','price'=>0,'season'=>'christmas','event'=>'christmas','eventExercises'=>3],
    ['id'=>'polar-bear','name'=>'Nubi l’orso polare','icon'=>'🐻‍❄️','slot'=>'avatar','price'=>0,'season'=>'christmas','event'=>'christmas','eventExercises'=>9],
    ['id'=>'gingerbread','name'=>'Biscottino pan di zenzero','icon'=>'🍪','slot'=>'avatar','price'=>0,'season'=>'christmas','event'=>'christmas','eventExercises'=>12],
    ['id'=>'silver-reindeer','name'=>'Fiaba la renna argentata','icon'=>'🦌','slot'=>'avatar','price'=>0,'season'=>'christmas','event'=>'christmas','eventExercises'=>15],
    ['id'=>'mrs-claus','name'=>'Nonna Natale','icon'=>'🤶','slot'=>'avatar','price'=>0,'season'=>'christmas','event'=>'christmas','eventExercises'=>21],
    ['id'=>'santa','name'=>'Babbo Natale','icon'=>'🎅','slot'=>'avatar','price'=>0,'season'=>'christmas','event'=>'christmas','eventExercises'=>24],
    ['id'=>'nutcracker','name'=>'Nico lo schiaccianoci','icon'=>'🥁','slot'=>'avatar','price'=>0,'season'=>'christmas','event'=>'christmas','eventExercises'=>27],
    ['id'=>'yeti','name'=>'Milo lo yeti gentile','icon'=>'☁️','slot'=>'avatar','price'=>0,'season'=>'christmas','event'=>'christmas','eventExercises'=>30],
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

// Seasonal challenges: server clock, owned profiles, additive private history.
function holidayNow(): DateTimeImmutable {
    $tz=new DateTimeZone('Europe/Rome');
    // Test clock comes only from the disposable server environment, never HTTP input.
    if(getenv('WORDYLAND_TEST')==='1' && ($file=getenv('WORDYLAND_TEST_CLOCK_FILE')) && is_file($file))return (new DateTimeImmutable(trim(file_get_contents($file,false,null,0,80)),$tz))->setTimezone($tz);
    return new DateTimeImmutable('now',$tz);
}
function holidayEaster(int $y): string {
    $a=$y%19;$b=intdiv($y,100);$c=$y%100;$d=intdiv($b,4);$e=$b%4;$f=intdiv($b+8,25);$g=intdiv($b-$f+1,3);$h=(19*$a+$b-$d-$g+15)%30;$i=intdiv($c,4);$k=$c%4;$l=(32+2*$e+2*$i-$h-$k)%7;$m=intdiv($a+11*$h+22*$l,451);$n=$h+$l-7*$m+114;
    return sprintf('%04d-%02d-%02d',$y,intdiv($n,31),$n%31+1);
}
function holidayEvents(DateTimeImmutable $now): array {
    $tz=new DateTimeZone('Europe/Rome');$y=(int)$now->format('Y');$events=[];
    foreach(['christmas'=>['Villaggio di Natale','🎄'],'carnival'=>['Villaggio di Carnevale','🎭'],'easter'=>['Giardino di Pasqua','🐣'],'halloween'=>['Villaggio delle zucche','🎃']] as $id=>[$name,$icon]){
        $candidates=[];
        foreach([$y-1,$y,$y+1] as $year){
            $easter=new DateTimeImmutable(holidayEaster($year),$tz);
            [$start,$end]=match($id){
                'christmas'=>[new DateTimeImmutable("$year-11-01",$tz),new DateTimeImmutable(($year+1).'-01-08',$tz)],
                'carnival'=>[$easter->modify('-61 days'),$easter->modify('-46 days')],
                'easter'=>[$easter->modify('-14 days'),$easter->modify('+8 days')],
                default=>[new DateTimeImmutable("$year-10-15",$tz),new DateTimeImmutable("$year-11-02",$tz)]};
            if($end>$now)$candidates[]=['id'=>$id,'name'=>$name,'icon'=>$icon,'season'=>$id.':'.$year,'opens'=>$start->format(DateTimeInterface::ATOM),'closes'=>$end->format(DateTimeInterface::ATOM),'lastDay'=>$end->modify('-1 day')->format('d/m/Y'),'active'=>$now>=$start&&$now<$end];
        }
        usort($candidates,fn($a,$b)=>strcmp($a['opens'],$b['opens']));$events[]=$candidates[0];
    }
    return $events;
}
function holidayElf(array $event,DateTimeImmutable $now): ?array {
    if($event['id']!=='christmas'||!$event['active'])return null;
    $year=(int)explode(':',$event['season'])[1];$opens=new DateTimeImmutable($year.'-12-08',new DateTimeZone('Europe/Rome'));
    $active=$now>=$opens&&$now<new DateTimeImmutable($event['closes']);$prank=null;
    if($active){
        $pranks=[
            ['id'=>'packages','title'=>'I pacchi mescolati','story'=>'Birillo ha mescolato le lettere sui pacchi. Rimettiamo insieme CAT, gatto!','mode'=>'build','model'=>'CAT','tiles'=>['T','C','A']],
            ['id'=>'letter','title'=>'La lettera nascosta','story'=>'Birillo ha nascosto una lettera! Completiamo _EN per scrivere PEN, penna.','mode'=>'letter','model'=>'PEN','options'=>['B','P','C'],'answer'=>'P'],
            ['id'=>'sign','title'=>'Il cartello al contrario','story'=>'Quel cartello dice KOOB! Birillo ha girato le lettere di BOOK, libro.','mode'=>'toggle','button'=>'Raddrizza il cartello','model'=>'BOOK'],
            ['id'=>'moustache','title'=>'I baffi del pupazzo','story'=>'Birillo ha disegnato due baffoni sul pupazzo di neve! Un tocco e tornano nella sua scatola.','mode'=>'toggle','button'=>'Sistema i baffi','model'=>'SNOWMAN · pupazzo di neve'],
            ['id'=>'colors','title'=>'La neve colorata','story'=>'Birillo ha sparso colori pastello tra i fiocchi. Rimettiamo la neve bianca!','mode'=>'toggle','button'=>'Rimetti la neve bianca','model'=>'SNOW · neve']
        ];$prank=$pranks[(int)$opens->diff($now)->format('%a')%count($pranks)];
    }
    return ['name'=>'Birillo','active'=>$active,'opens'=>$opens->format(DateTimeInterface::ATOM),'closes'=>$event['closes'],'day'=>$now->format('Y-m-d'),'prank'=>$prank];
}
// Arrival metadata stays visible when the next Christmas edition is still closed.
// It never creates a visitor, prank or activity outside the existing event window.
function holidayElfSchedule(array $event,DateTimeImmutable $now): ?array {
    if($event['id']!=='christmas')return null;
    $year=(int)explode(':',$event['season'])[1];$opens=new DateTimeImmutable($year.'-12-08',new DateTimeZone('Europe/Rome'));
    $active=$event['active']&&$now>=$opens&&$now<new DateTimeImmutable($event['closes']);
    return ['name'=>'Birillo','active'=>$active,'phase'=>$active?'active':'upcoming','opens'=>$opens->format(DateTimeInterface::ATOM),'closes'=>$event['closes'],'lastDay'=>$event['lastDay']];
}
function journeyEvent(): array {return ['id'=>'journey','name'=>'Passaporto delle scoperte','icon'=>'🧭','season'=>'journey:v1','opens'=>null,'closes'=>null,'lastDay'=>null,'active'=>true,'evergreen'=>true];}
function holidayEvent(string $id,DateTimeImmutable $now): array {if($id==='journey')return journeyEvent();foreach(holidayEvents($now) as $e)if($e['id']===$id)return $e;fail('Festività non trovata.',404);}
function holidayQuestion(array $s): ?array {
    $plan=json_decode($s['plan'],true,32,JSON_THROW_ON_ERROR);$q=$plan[(int)$s['step']]??null;if(!$q)return null;
    $mode=$q['mode'];$titles=['meaning'=>'🎁 Il regalo misterioso','word'=>'📮 La posta degli elfi','gap'=>'🔎 Caccia alla lettera','build'=>'🍪 Biscotti da riordinare','write'=>'✍️ La bottega delle parole'];
    if($s['season']==='journey:v1')$titles=['meaning'=>'🎁 Il pacco misterioso','word'=>'📬 La posta delle parole','gap'=>'🔎 Caccia alla lettera','build'=>'🧩 Puzzle di lettere','write'=>'✍️ La bottega delle parole'];
    $prompt=match($mode){'meaning'=>'Che cosa significa '.$q['word'].'?','gap'=>'Trova la lettera mancante: '.$q['mask'].' · '.$q['meaning'],'build'=>'Ricomponi la parola: '.$q['meaning'],'word'=>'Quale parola significa '.$q['meaning'].'?',default=>'Scrivi in inglese: '.$q['meaning']};
    $public=['mode'=>$mode,'title'=>$titles[$mode]??$titles['write'],'prompt'=>$prompt,'options'=>in_array($mode,['meaning','word','gap'],true)?$q['options']:[]];
    if(!empty($q['review']))$public['review']=true;if($mode==='build')$public['tiles']=$q['tiles'];if((int)$s['hint']>0)$public['hint']=$q['answer'];return $public;
}
function holidaySnapshot(array $s): array {return ['token'=>$s['token'],'day'=>$s['day'],'completedOn'=>$s['completed_on']??null,'round'=>(int)($s['round']??1),'step'=>(int)$s['step'],'total'=>3,'done'=>(int)$s['step']===3,'question'=>holidayQuestion($s)];}
/** New completion dates are server-owned; NULL preserves legacy completion dates. */
function ensureHolidayCompletionColumns(PDO $db): void {
    foreach(['holiday_days','holiday_rounds'] as $table){
        if(in_array('completed_on',array_column(rows($db,'PRAGMA table_info('.$table.')'),'name'),true))continue;
        $db->exec('BEGIN IMMEDIATE');
        try{if(!in_array('completed_on',array_column(rows($db,'PRAGMA table_info('.$table.')'),'name'),true))$db->exec('ALTER TABLE '.$table.' ADD COLUMN completed_on TEXT');$db->exec('COMMIT');}
        catch(Throwable $error){$db->exec('ROLLBACK');throw $error;}
    }
}
function holidayCompletedDays(PDO $db,int $pid,string $season): int {
    if($season==='journey:v1')return (int)one($db,'SELECT COUNT(*) AS n FROM holiday_days WHERE profile_id=? AND season=? AND step=3',[$pid,$season])['n'];
    return (int)one($db,'SELECT COUNT(DISTINCT completed_day) AS n FROM (SELECT COALESCE(completed_on,day) AS completed_day FROM holiday_days WHERE profile_id=? AND season=? AND step=3 UNION ALL SELECT COALESCE(completed_on,day) FROM holiday_rounds WHERE profile_id=? AND season=? AND step=3)',[$pid,$season,$pid,$season])['n'];
}
function holidayCompletedToday(PDO $db,int $pid,string $season,string $today): bool {
    if($season==='journey:v1')return (bool)one($db,'SELECT token FROM holiday_days WHERE profile_id=? AND season=? AND day=? AND step=3',[$pid,$season,$today]);
    return (bool)one($db,'SELECT token FROM holiday_days WHERE profile_id=? AND season=? AND step=3 AND COALESCE(completed_on,day)=? UNION ALL SELECT token FROM holiday_rounds WHERE profile_id=? AND season=? AND step=3 AND COALESCE(completed_on,day)=? LIMIT 1',[$pid,$season,$today,$pid,$season,$today]);
}
function holidayExercises(PDO $db,int $pid,string $season): int {
    $n=(int)one($db,'SELECT COALESCE(SUM(step),0) AS n FROM holiday_days WHERE profile_id=? AND season=?',[$pid,$season])['n'];
    if($season!=='journey:v1')$n+=(int)one($db,'SELECT COALESCE(SUM(step),0) AS n FROM holiday_rounds WHERE profile_id=? AND season=?',[$pid,$season])['n'];return $n;
}
function holidayEarn(PDO $db,int $pid,array $event): array {
    $days=holidayCompletedDays($db,$pid,$event['season']);$exercises=holidayExercises($db,$pid,$event['season']);$earned=[];
    foreach(shopCatalog() as $it)if(($it['event']??null)===$event['id']&&(isset($it['eventExercises'])?$exercises>=$it['eventExercises']:$days>=$it['eventDays'])){
        if(!one($db,'SELECT item FROM inventory WHERE profile_id=? AND item=?',[$pid,$it['id']]))$earned[]=$it['id'];runSql($db,'INSERT OR IGNORE INTO inventory(profile_id,item) VALUES(?,?)',[$pid,$it['id']]);
    }return $earned;
}
function holidayRewards(PDO $db,int $pid,array $event): array {
    $n=holidayCompletedDays($db,$pid,$event['season']);
    $inventory=array_column(rows($db,'SELECT item FROM inventory WHERE profile_id=?',[$pid]),'item');$out=[];$exercises=holidayExercises($db,$pid,$event['season']);
    foreach(shopCatalog() as $it)if(($it['event']??null)===$event['id'])$out[]=['id'=>$it['id'],'name'=>$it['name'],'icon'=>$it['icon'],'days'=>$it['eventDays']??null,'exercises'=>$it['eventExercises']??null,'slot'=>$it['slot'],'collection'=>$it['collection']??null,'owned'=>in_array($it['id'],$inventory,true),'progress'=>min(isset($it['eventExercises'])?$exercises:$n,$it['eventExercises']??$it['eventDays'])];return $out;
}
function challengeSession(PDO $db,int $pid,array $event,string $today): array|false {
    if($event['id']==='journey'){
        $pending=one($db,'SELECT * FROM holiday_days WHERE profile_id=? AND season=? AND step<3 ORDER BY day LIMIT 1',[$pid,$event['season']]);if($pending)return $pending;
    }
    if($event['id']!=='journey'){
        if($event['active']){$pending=one($db,'SELECT profile_id,season,day,token,plan,step,hint,errors,last_attempt,1 AS round,completed_on FROM holiday_days WHERE profile_id=? AND season=? AND step<3 UNION ALL SELECT profile_id,season,day,token,plan,step,hint,errors,last_attempt,round,completed_on FROM holiday_rounds WHERE profile_id=? AND season=? AND step<3 ORDER BY day,round LIMIT 1',[$pid,$event['season'],$pid,$event['season']]);if($pending)return $pending;}
        $round=one($db,'SELECT * FROM holiday_rounds WHERE profile_id=? AND season=? AND day=? ORDER BY round DESC LIMIT 1',[$pid,$event['season'],$today]);if($round)return $round;
    }
    return one($db,'SELECT *,1 AS round FROM holiday_days WHERE profile_id=? AND season=? AND day=?',[$pid,$event['season'],$today]);
}
function holidayStoredSession(PDO $db,int $pid,string $token): array|false {
    return one($db,'SELECT *,1 AS round FROM holiday_days WHERE token=? AND profile_id=?',[$token,$pid])?:one($db,'SELECT * FROM holiday_rounds WHERE token=? AND profile_id=?',[$token,$pid]);
}
if(str_starts_with($action,'holiday-')||str_starts_with($action,'journey-')){
    $isJourney=str_starts_with($action,'journey-');$op=$isJourney?'holiday-'.substr($action,8):$action;
    $allowed=['holiday-state'=>'GET','holiday-start'=>'POST','holiday-answer'=>'POST','holiday-hint'=>'POST'];
    if(!isset($allowed[$op]))fail('Operazione non trovata.',404);if($method!==$allowed[$op])fail('Metodo non consentito.',405);
    $p=ownedProfile($db,$id,$method==='GET'?($_GET['profile']??0):($body['profile']??0));$pid=(int)$p['id'];
    $db->exec('CREATE TABLE IF NOT EXISTS holiday_days(profile_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,season TEXT NOT NULL,day TEXT NOT NULL,token TEXT UNIQUE NOT NULL,plan TEXT NOT NULL,step INTEGER NOT NULL DEFAULT 0,hint INTEGER NOT NULL DEFAULT 0,errors INTEGER NOT NULL DEFAULT 0,last_attempt TEXT,PRIMARY KEY(profile_id,season,day));');
    // Extra festival rounds are additive: historic daily rows and their date badges remain intact.
    $db->exec('CREATE TABLE IF NOT EXISTS holiday_rounds(profile_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,season TEXT NOT NULL,day TEXT NOT NULL,round INTEGER NOT NULL CHECK(round>=2),token TEXT UNIQUE NOT NULL,plan TEXT NOT NULL,step INTEGER NOT NULL DEFAULT 0,hint INTEGER NOT NULL DEFAULT 0,errors INTEGER NOT NULL DEFAULT 0,last_attempt TEXT,PRIMARY KEY(profile_id,season,day,round));');
    ensureHolidayCompletionColumns($db);
    $now=holidayNow();$today=$now->format('Y-m-d');
    if($op==='holiday-state'){
        $events=$isJourney?[journeyEvent()]:holidayEvents($now);foreach($events as &$e){$e['elf']=holidayElf($e,$now);if($e['id']==='christmas')$e['elfSchedule']=holidayElfSchedule($e,$now);$e['repeatable']=!$isJourney;$e['dailyComplete']=holidayCompletedToday($db,$pid,$e['season'],$today);$e['rewards']=holidayRewards($db,$pid,$e);$s=challengeSession($db,$pid,$e,$today);$e['session']=$s?holidaySnapshot($s):null;}unset($e);respond(['day'=>$today,'timezone'=>'Europe/Rome','events'=>$events,'wallet'=>wallet($db,$pid)]);
    }
    if($op==='holiday-start'){
        if($isJourney){if(isset($body['event'])&&$body['event']!=='journey')fail('Scegli il percorso delle scoperte.');$body['event']='journey';}if(!is_string($body['event']??null)||(!$isJourney&&$body['event']==='journey'))fail('Scegli un percorso disponibile.');$e=holidayEvent($body['event'],$now);if(!$e['active'])fail('Le sfide di questa festività sono chiuse.',410);
        $another=$body['another']??false;if(!is_bool($another)||($isJourney&&$another))fail('Scegli una sfida disponibile.');
        if($another&&(!is_string($body['after']??null)||!preg_match('/^[a-f0-9]{48}$/',$body['after'])))fail('Riprendi la sfida completata prima di aprirne un’altra.');
        limitAttempts($db,'holiday-start:'.$pid,100);
        $db->exec('BEGIN IMMEDIATE');$s=challengeSession($db,$pid,$e,$today);$round=1;$table='holiday_days';
        if($another){
            $previous=holidayStoredSession($db,$pid,$body['after']);
            if(!$previous||$previous['season']!==$e['season']){$db->exec('ROLLBACK');fail('Sfida non trovata.',404);}
            if((int)$previous['step']!==3){$db->exec('ROLLBACK');fail('Aggiorna il villaggio e completa la sfida in corso.',409);}
            // A retried request names its completed predecessor. It cannot skip a newer
            // pending round or allocate again after that newer round was completed elsewhere.
            if($s&&(int)$s['step']===3&&$s['day']===$today&&hash_equals($s['token'],$body['after'])){$round=(int)($s['round']??1)+1;$table='holiday_rounds';$s=false;}
            elseif(!$s&&$previous['day']===$today){$db->exec('ROLLBACK');fail('Aggiorna il villaggio per riprendere la sfida.',409);}
        }
        if(!$s){$words=json_decode(file_get_contents(__DIR__.'/training.json'),true,32,JSON_THROW_ON_ERROR)['foundationWords'];$offset=(int)(hexdec(substr(hash('sha256',$e['season'].$today),0,6))%count($words));if($round>1)$offset=($offset+($round-1)*3)%count($words);$plan=[];
            if($isJourney){
                // Review only the selected profile's existing curated word signals.
                $allWords=$words;if(holidayExercises($db,$pid,$e['season'])<6)$words=array_slice($words,0,6);
                $review=array_column(practiceReviewRows($db,$pid),'word');$priority=array_values(array_filter($allWords,fn($w)=>in_array($w['id'],$review,true)));
                usort($priority,fn($a,$b)=>array_search($a['id'],$review,true)<=>array_search($b['id'],$review,true));
                $offset=$offset%count($words);$rotated=array_merge(array_slice($words,$offset),array_slice($words,0,$offset));$words=array_values(array_column(array_merge(array_slice($priority,0,2),$rotated),null,'id'));$offset=0;
            }
            for($j=0;$j<3;$j++){
                $w=$words[($offset+$j)%count($words)];$mode=$j===0?'meaning':($j===2?'write':['write','gap','build','word'][((int)$now->format('j')+$round-2)%4]);
                $options=[$w['meaning'],$words[($offset+$j+1)%count($words)]['meaning'],$words[($offset+$j+2)%count($words)]['meaning']];$answer=$mode==='meaning'?$w['meaning']:$w['id'];$q=['word'=>$w['id'],'meaning'=>$w['meaning'],'mode'=>$mode,'answer'=>$answer,'review'=>$isJourney&&in_array($w['id'],$review??[],true)];
                if($mode==='word')$options=[$w['id'],$words[($offset+$j+1)%count($words)]['id'],$words[($offset+$j+2)%count($words)]['id']];
                if($mode==='gap'){$answer=$w['id'][0];$q['answer']=$answer;$q['mask']='_'.substr($w['id'],1);$options=[$answer];foreach(range('a','z') as $letter)if(count($options)<3&&!in_array($letter,$options,true))$options[]=$letter;}
                if($mode==='build'){$q['tiles']=str_split($w['id']);shuffle($q['tiles']);}
                shuffle($options);$q['options']=$options;$plan[]=$q;
            }
            $token=bin2hex(random_bytes(24));$values=[$pid,$e['season'],$today,$token,json_encode($plan,JSON_UNESCAPED_UNICODE)];if($round===1)runSql($db,'INSERT INTO holiday_days(profile_id,season,day,token,plan) VALUES(?,?,?,?,?)',$values);else runSql($db,'INSERT INTO holiday_rounds(profile_id,season,day,token,plan,round) VALUES(?,?,?,?,?,?)',[...$values,$round]);$s=holidayStoredSession($db,$pid,$token);}
        $db->exec('COMMIT');respond(['session'=>holidaySnapshot($s)]);
    }
    if(!is_string($body['token']??null)||!preg_match('/^[a-f0-9]{48}$/',$body['token'])||!is_int($body['step']??null))fail('Riprendi la sfida confermata.');
    $db->exec('BEGIN IMMEDIATE');$s=holidayStoredSession($db,$pid,$body['token']);
    if(!$s||(($s['season']==='journey:v1')!==$isJourney)){$db->exec('ROLLBACK');fail('Sfida non trovata.',404);}$e=holidayEvent(explode(':',$s['season'])[0],$now);
    if(!$e['active']||$e['season']!==$s['season']){$db->exec('ROLLBACK');fail('La festività è terminata. I premi ottenuti restano tuoi.',410);}
    if($s['step']!==$body['step']||$s['step']===3){$db->exec('COMMIT');respond(['replayed'=>true,'session'=>holidaySnapshot($s)]);}
    $table=(int)($s['round']??1)>1?'holiday_rounds':'holiday_days';
    if($op==='holiday-hint'){runSql($db,'UPDATE '.$table.' SET hint=1 WHERE token=?',[$s['token']]);$s['hint']=1;$db->exec('COMMIT');respond(['session'=>holidaySnapshot($s)]);}
    if(!is_string($body['answer']??null)||strlen($body['answer'])>100||!is_string($body['attempt']??null)||!preg_match('/^[a-f0-9]{32}$/',$body['attempt'])){$db->exec('ROLLBACK');fail('Risposta non valida.');}
    if($s['last_attempt']===$body['attempt']){$db->exec('COMMIT');respond(['replayed'=>true,'session'=>holidaySnapshot($s)]);}
    $q=json_decode($s['plan'],true,32,JSON_THROW_ON_ERROR)[$s['step']];$correct=normalWord($body['answer'])===normalWord($q['answer']);
    if($correct){$s['step']++;$s['hint']=0;}else{$s['errors']=min(1000,$s['errors']+1);$s['hint']=1;}
    $completedOn=!$isJourney&&$correct&&$s['step']===3?$today:($s['completed_on']??null);$s['completed_on']=$completedOn;
    runSql($db,'UPDATE '.$table.' SET step=?,hint=?,errors=?,last_attempt=?,completed_on=? WHERE token=?',[$s['step'],$s['hint'],$s['errors'],$body['attempt'],$completedOn,$s['token']]);$earned=[];
    if($correct)$earned=holidayEarn($db,$pid,$e);
    $db->exec('COMMIT');respond(['correct'=>$correct,'session'=>holidaySnapshot($s),'earned'=>$earned,'rewards'=>holidayRewards($db,$pid,$e),'wallet'=>wallet($db,$pid)]);
}

require __DIR__ . '/arena.php';
$platformActions = ['learning-summary','hub','pending-games','quest-resume','quest-start','quest-hint','quest-answer','buy','equip','study-save','study-file','study-remove','club-create','club-join','club-leave','rename-profile'];
if (!in_array($action, $platformActions, true)) return;
if($action==='learning-summary' && !in_array($accountRole,['adult','admin'],true))fail('Il riepilogo è riservato all’adulto che gestisce i propri profili.',403);
if($action==='learning-summary' && $method!=='GET')fail('Metodo non consentito.',405);
$p = ownedProfile($db, $id, $method === 'GET' ? ($_GET['profile'] ?? 0) : ($body['profile'] ?? 0));
$pid = (int)$p['id'];
if($method==='GET' && $action==='learning-summary') {
    $totals=one($db,'SELECT COALESCE(SUM(independent),0) AS independent,COALESCE(SUM(assisted),0) AS assisted,COALESCE(SUM(corrected),0) AS corrected,COALESCE(SUM(observed),0) AS observed FROM practice_outcomes WHERE profile_id=?',[$pid]);
    foreach($totals as $key=>$value)$totals[$key]=(int)$value;
    $legacy=(int)one($db,'SELECT COALESCE(SUM(MAX(0,COALESCE(p.good,0)-COALESCE(o.observed,0))),0) AS n FROM practice p LEFT JOIN practice_outcomes o ON o.profile_id=p.profile_id AND o.word=p.word WHERE p.profile_id=?',[$pid])['n'];
    $review=practiceReviewRows($db,$pid);
    $balance=one($db,'SELECT coins,xp FROM wallets WHERE profile_id=?',[$pid]);
    respond(['profile'=>$pid,'nickname'=>$p['nickname'],'scope'=>'owned-online-missions','totals'=>$totals,'legacyCorrect'=>$legacy,'reviewTotal'=>count($review),'reviewWords'=>array_column(array_slice($review,0,12),'word'),'reviewScope'=>'owned-learning-evidence','reviewSources'=>array_map(fn($row)=>['word'=>$row['word'],'sources'=>$row['sources']],array_slice($review,0,12)),'completedMissions'=>(int)one($db,'SELECT COUNT(*) AS n FROM rewards WHERE profile_id=?',[$pid])['n'],'pendingMissions'=>(int)one($db,'SELECT COUNT(*) AS n FROM quests WHERE profile_id=? AND completed=0 AND created_at>=?',[$pid,time()-questLifetime()])['n'],'xp'=>(int)($balance['xp']??0),'coins'=>(int)($balance['coins']??0)]);
}
if($method==='POST'&&$action==='rename-profile') {
    $nickname=is_string($body['nickname']??null)?trim($body['nickname']):'';
    if(!$nickname||strlen($nickname)>80)fail('Scegli un soprannome breve.');
    $db->exec('BEGIN IMMEDIATE');
    $current=one($db,'SELECT nickname FROM profiles WHERE id=? AND account_id=?',[$pid,$id]);
    if(!$current){$db->exec('ROLLBACK');fail('Profilo non disponibile.',404);}
    if($nickname!==$current['nickname']&&one($db,'SELECT 1 FROM club_profiles own JOIN club_profiles other ON other.club_id=own.club_id JOIN profiles p ON p.id=other.profile_id WHERE own.profile_id=? AND p.id<>? AND lower(p.nickname)=lower(?) LIMIT 1',[$pid,$pid,$nickname])){
        $db->exec('ROLLBACK');fail('Questo soprannome è già usato in una delle tue classi. Scegline un altro.',409);
    }
    runSql($db,'UPDATE profiles SET nickname=? WHERE id=? AND account_id=?',[$nickname,$pid,$id]);
    $db->exec('COMMIT');
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
    if(isset($item['event'])&&!in_array($item['id'],$w['inventory'],true)){$db->exec('ROLLBACK');fail('Questo premio si conquista completando gli esercizi del suo percorso.',403);}
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
    $review=array_column(practiceReviewRows($db,$pid),'review_at','word');
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
    $club=invitationClass($db,$code);
    $db->exec('BEGIN IMMEDIATE');
    $joined=one($db,'SELECT 1 FROM club_profiles WHERE club_id=? AND profile_id=?',[$club['id'],$pid]);
    if(!$joined){
        if(!classroomRegistrationOpen($db,$club,$code)){$db->exec('ROLLBACK');fail('Le nuove iscrizioni da questo link sono chiuse. Gli iscritti possono ancora accedere.',410);}
        if((int)one($db,'SELECT COUNT(*) AS n FROM club_profiles WHERE club_id=?',[$club['id']])['n']>=100){$db->exec('ROLLBACK');fail('Il gruppo è completo.');}
        $current=one($db,'SELECT nickname FROM profiles WHERE id=? AND account_id=?',[$pid,$id]);
        if(!$current){$db->exec('ROLLBACK');fail('Profilo non disponibile.',404);}
        if(one($db,'SELECT 1 FROM club_profiles cp JOIN profiles p ON p.id=cp.profile_id WHERE cp.club_id=? AND lower(p.nickname)=lower(?) LIMIT 1',[$club['id'],$current['nickname']])){$db->exec('ROLLBACK');fail('Questo soprannome è già usato nella classe. Scegline un altro prima di entrare.',409);}
    }
    runSql($db,'INSERT OR IGNORE INTO club_accounts(club_id,account_id) VALUES (?,?)',[$club['id'],$id]);runSql($db,'INSERT OR IGNORE INTO club_profiles(club_id,profile_id) VALUES (?,?)',[$club['id'],$pid]);$db->exec('COMMIT');respond(['id'=>$club['id']]);
}
if ($method==='POST' && $action==='club-leave') {
    runSql($db,'DELETE FROM club_profiles WHERE club_id=? AND profile_id=?',[(int)($body['club']??0),$pid]);respond(['ok'=>true]);
}
fail('Operazione non trovata.',404);
