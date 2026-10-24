<?php
declare(strict_types=1);
if (!defined('WORDYLAND_BOOTSTRAPPED')) { http_response_code(404); exit; }
$db->exec('CREATE TABLE IF NOT EXISTS duels (
 id TEXT PRIMARY KEY, challenger INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
 opponent INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE, category TEXT NOT NULL,
 questions TEXT NOT NULL, state TEXT NOT NULL DEFAULT "pending", created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS duel_players (
 duel TEXT REFERENCES duels(id) ON DELETE CASCADE, profile INTEGER REFERENCES profiles(id) ON DELETE CASCADE,
 step INTEGER NOT NULL DEFAULT 0, score INTEGER NOT NULL DEFAULT 0, PRIMARY KEY(duel,profile));
 CREATE INDEX IF NOT EXISTS duels_challenger ON duels(challenger,created_at);
 CREATE INDEX IF NOT EXISTS duels_opponent ON duels(opponent,created_at);');
ensureActivityColumn($db,'duels','kart');
function duelClassmates(PDO $db, int $a, int $b): bool {
    return (bool)one($db, 'SELECT 1 FROM club_profiles a JOIN club_profiles b ON a.club_id=b.club_id WHERE a.profile_id=? AND b.profile_id=? LIMIT 1', [$a,$b]);
}
function duelQuestion(array $duel, int $step): ?array {
    $questions=json_decode($duel['questions'],true);
    if ($duel['state']!=='active' || $step>=count($questions)) return null;
    $q=$questions[$step]; unset($q['answer']); $q['number']=$step+1;
    return $q;
}
function duelView(PDO $db, array $d, int $pid): array {
    $other=(int)$d['challenger']===$pid?(int)$d['opponent']:(int)$d['challenger'];
    $p=one($db,'SELECT nickname FROM profiles WHERE id=?',[$other]);
    $mine=one($db,'SELECT step,score FROM duel_players WHERE duel=? AND profile=?',[$d['id'],$pid]);
    $rival=one($db,'SELECT step,score FROM duel_players WHERE duel=? AND profile=?',[$d['id'],$other]);
    $total=count(json_decode($d['questions'],true));
    return ['id'=>$d['id'],'opponent'=>$other,'nickname'=>$p['nickname'],'category'=>$d['category'],'state'=>$d['state'],
        'activity'=>$d['activity'],'incoming'=>(int)$d['opponent']===$pid,'step'=>(int)$mine['step'],'score'=>(int)$mine['score'],
        'rivalScore'=>$d['state']==='completed'?(int)$rival['score']:null,'rivalDone'=>(int)$rival['step']===$total,
        'total'=>$total,'expiresAt'=>(int)$d['expires_at']];
}
$duelActions=['arena','duel','duel-create','duel-accept','duel-decline','duel-cancel','duel-answer'];
if (!in_array($action,$duelActions,true)) return;
if (($method==='GET')!==in_array($action,['arena','duel'],true)) fail('Metodo non consentito.',405);
$me=ownedProfile($db,$id,$method==='GET'?($_GET['profile']??0):($body['profile']??0));
$pid=(int)$me['id'];
runSql($db,'UPDATE duels SET state="expired" WHERE (challenger=? OR opponent=?) AND expires_at<? AND state IN ("pending","active")',[$pid,$pid,time()]);
if ($action==='arena') {
    $classes=rows($db,'SELECT c.id,c.name FROM clubs c JOIN club_profiles cp ON cp.club_id=c.id WHERE cp.profile_id=? ORDER BY c.name,c.id',[$pid]);
    $opponents=rows($db,'SELECT DISTINCT p.id,p.nickname,w.equipped FROM profiles p JOIN club_profiles b ON b.profile_id=p.id JOIN club_profiles a ON a.club_id=b.club_id LEFT JOIN wallets w ON w.profile_id=p.id WHERE a.profile_id=? AND p.id!=? ORDER BY p.nickname,p.id LIMIT 100',[$pid,$pid]);
    foreach ($opponents as &$o) {
        $o['id']=(int)$o['id']; $o['equipped']=json_decode($o['equipped']??'{}',true);
        $o['classes']=array_column(rows($db,'SELECT c.name FROM clubs c JOIN club_profiles a ON a.club_id=c.id JOIN club_profiles b ON b.club_id=c.id WHERE a.profile_id=? AND b.profile_id=? ORDER BY c.name',[$pid,$o['id']]),'name');
    } unset($o);
    $duels=rows($db,'SELECT * FROM duels WHERE challenger=? OR opponent=? ORDER BY CASE WHEN state IN ("pending","active") THEN 0 ELSE 1 END,created_at DESC,id DESC LIMIT 40',[$pid,$pid]);
    $duels=array_values(array_filter($duels,fn($d)=>duelClassmates($db,$pid,(int)$d['challenger']===$pid?(int)$d['opponent']:(int)$d['challenger'])));
    respond(['classes'=>$classes,'opponents'=>$opponents,'duels'=>array_map(fn($d)=>duelView($db,$d,$pid),$duels)]);
}
if ($action==='duel-create') {
    $other=(int)($body['opponent']??0);
    if ($other===$pid || !duelClassmates($db,$pid,$other)) fail('Scegli un compagno iscritto alla tua classe.',403);
    $curriculum=json_decode(file_get_contents(__DIR__.'/curriculum.json'),true,32,JSON_THROW_ON_ERROR);
    $activity=$body['activity']??'kart';
    if(!is_string($activity)||!in_array($activity,['kart','football','space'],true))fail('Scegli kart, calcio o spazio.');
    $category=$body['category']??'body';
    if (!is_string($category)||!in_array($category,['body','catpositions','toys','colors','hello','school','home','animals','transport','sport','space','ocean','dino','counting','penpositions','conversation','aboutme','family','food','clothes','weather','routines'],true)||empty($curriculum[$category])) fail('Scegli un argomento disponibile.');
    limitAttempts($db,'duels:'.$pid,20);
    $unique=[];foreach ($curriculum[$category] as $w) $unique[normalWord($w[0])]=$w;
    $pool=array_values($unique); shuffle($pool); $questions=[];
    foreach (array_slice($pool,0,5) as $w) {
        $options=array_values(array_filter(array_column($pool,0),fn($word)=>$word!==$w[0]));shuffle($options);
        $options=array_merge([$w[0]],array_slice($options,0,3));shuffle($options);
        $questions[]=['translation'=>$w[1],'emoji'=>$w[2],'options'=>$options,'answer'=>$w[0]];
    }
    $db->exec('BEGIN IMMEDIATE');
    if (one($db,'SELECT 1 FROM duels WHERE ((challenger=? AND opponent=?) OR (challenger=? AND opponent=?)) AND category=? AND state IN ("pending","active")',[$pid,$other,$other,$pid,$category])) { $db->exec('ROLLBACK'); fail('Avete già una sfida aperta su questo argomento.',409); }
    foreach ([$pid,$other] as $player) {
        if ((int)one($db,'SELECT COUNT(*) AS n FROM duels WHERE (challenger=? OR opponent=?) AND expires_at>=? AND state IN ("pending","active")',[$player,$player,time()])['n']>=10) {
            $db->exec('ROLLBACK'); fail($player===$pid?'Completa le sfide aperte prima di inviarne altre.':'Questo compagno ha già tante sfide aperte. Riprova più tardi.',409);
        }
    }
    $token=bin2hex(random_bytes(16));$now=time();
    runSql($db,'INSERT INTO duels(id,challenger,opponent,category,questions,created_at,expires_at,activity) VALUES (?,?,?,?,?,?,?,?)',[$token,$pid,$other,$category,json_encode($questions,JSON_UNESCAPED_UNICODE),$now,$now+604800,$activity]);
    foreach ([$pid,$other] as $player) runSql($db,'INSERT INTO duel_players(duel,profile) VALUES (?,?)',[$token,$player]);
    $d=one($db,'SELECT * FROM duels WHERE id=?',[$token]);$db->exec('COMMIT');respond(['duel'=>duelView($db,$d,$pid)]);
}
$token=$method==='GET'?($_GET['duel']??''):($body['duel']??'');
if (!is_string($token)) fail('Sfida non trovata.',404);
$db->exec('BEGIN IMMEDIATE');
$d=one($db,'SELECT * FROM duels WHERE id=? AND (challenger=? OR opponent=?)',[$token,$pid,$pid]);
if (!$d) { $db->exec('ROLLBACK');fail('Sfida non trovata.',404); }
$other=(int)$d['challenger']===$pid?(int)$d['opponent']:(int)$d['challenger'];
if (!duelClassmates($db,$pid,$other)) { $db->exec('ROLLBACK');fail('Non fate più parte della stessa classe.',403); }
$player=one($db,'SELECT * FROM duel_players WHERE duel=? AND profile=?',[$token,$pid]);
if ($action==='duel') { $db->exec('COMMIT');respond(['duel'=>duelView($db,$d,$pid),'question'=>duelQuestion($d,(int)$player['step'])]); }
if (in_array($action,['duel-accept','duel-decline','duel-cancel'],true)) {
    $authorized=$action==='duel-cancel'?(int)$d['challenger']===$pid:(int)$d['opponent']===$pid;
    if (!$authorized) { $db->exec('ROLLBACK');fail('Solo chi riceve l’invito può accettarlo o rifiutarlo.',403); }
    if ($d['state']!=='pending') { $db->exec('ROLLBACK');fail('Questo invito non è più in attesa.',409); }
    $d['state']=['duel-accept'=>'active','duel-decline'=>'declined','duel-cancel'=>'cancelled'][$action];
    runSql($db,'UPDATE duels SET state=? WHERE id=?',[$d['state'],$token]);$db->exec('COMMIT');
    respond(['duel'=>duelView($db,$d,$pid),'question'=>duelQuestion($d,0)]);
}
$questions=json_decode($d['questions'],true);$step=(int)$player['step'];
if ($d['state']!=='active'||$step>=count($questions)) { $db->exec('ROLLBACK');fail('Questa sfida non è giocabile adesso.',409); }
if (($body['step']??null)!==$step) { $db->exec('ROLLBACK');fail('Risposta già registrata. Riapri la sfida.',409); }
$answer=$body['answer']??null;$q=$questions[$step];
if (!is_int($answer)||!isset($q['options'][$answer])) { $db->exec('ROLLBACK');fail('Scegli una delle risposte.'); }
$correct=$q['options'][$answer]===$q['answer'];
runSql($db,'UPDATE duel_players SET step=step+1,score=score+? WHERE duel=? AND profile=?',[$correct?10:0,$token,$pid]);
$remaining=one($db,'SELECT COUNT(*) AS n FROM duel_players WHERE duel=? AND step<?',[$token,count($questions)]);
if (!(int)$remaining['n']) { $d['state']='completed';runSql($db,'UPDATE duels SET state="completed" WHERE id=?',[$token]); }
$db->exec('COMMIT');
respond(['correct'=>$correct,'correctAnswer'=>$q['answer'],'duel'=>duelView($db,$d,$pid),'question'=>duelQuestion($d,$step+1)]);
