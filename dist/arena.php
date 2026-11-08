<?php
declare(strict_types=1);
if (!defined('WORDYLAND_BOOTSTRAPPED')) { http_response_code(404); exit; }
// This module is installed before api/platform during the managed release.
require_once __DIR__ . '/class-program.php';
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
/** A bound duel remains tied to its exact class for both participants. */
function duelProgramVisible(PDO $db,array $duel): bool {
    $a=cpSessionMetadata($db,(int)$duel['challenger'],'duel',$duel['id']);
    $b=cpSessionMetadata($db,(int)$duel['opponent'],'duel',$duel['id']);
    if($a===null&&$b===null)return true;
    return $a!==null&&$b!==null&&($a['accessible']??false)===true&&($b['accessible']??false)===true
        &&($a['club']??null)===($b['club']??null)&&($a['revision']??null)===($b['revision']??null);
}
function duelAssertProgramAccess(PDO $db,array $duel): void {
    $a=cpAssertSessionAccess($db,(int)$duel['challenger'],'duel',$duel['id']);
    $b=cpAssertSessionAccess($db,(int)$duel['opponent'],'duel',$duel['id']);
    if($a===null&&$b===null)return;
    if($a===null||$b===null||($a['active']['club']??null)!==($b['active']['club']??null)||($a['active']['revision']??null)!==($b['active']['revision']??null))
        fail('Il contesto della sfida non è più disponibile. Apri una nuova sfida dal programma della classe.',403);
}
function duelEquipped(PDO $db, int $profile): array {
    $row=one($db,'SELECT equipped FROM wallets WHERE profile_id=?',[$profile]);
    $equipped=json_decode($row['equipped']??'{}',true);
    return array_merge(['avatar'=>'fox'],is_array($equipped)?$equipped:[]);
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
    $program=cpSessionMetadata($db,$pid,'duel',$d['id']);
    return ['id'=>$d['id'],'opponent'=>$other,'nickname'=>$p['nickname'],'category'=>$d['category'],'state'=>$d['state'],
        'activity'=>$d['activity'],'incoming'=>(int)$d['opponent']===$pid,'step'=>(int)$mine['step'],'score'=>(int)$mine['score'],
        'rivalScore'=>$d['state']==='completed'?(int)$rival['score']:null,'rivalDone'=>(int)$rival['step']===$total,
        'total'=>$total,'expiresAt'=>(int)$d['expires_at']]+($program===null?[]:['program'=>$program]);
}
$duelActions=['arena','duel','duel-create','duel-accept','duel-decline','duel-cancel','duel-answer'];
if (!in_array($action,$duelActions,true)) return;
if (($method==='GET')!==in_array($action,['arena','duel'],true)) fail('Metodo non consentito.',405);
$me=ownedProfile($db,$id,$method==='GET'?($_GET['profile']??0):($body['profile']??0));
$pid=(int)$me['id'];
runSql($db,'UPDATE duels SET state="expired" WHERE (challenger=? OR opponent=?) AND expires_at<? AND state IN ("pending","active")',[$pid,$pid,time()]);
if ($action==='arena') {
    $classes=rows($db,'SELECT c.id,c.name FROM clubs c JOIN club_profiles cp ON cp.club_id=c.id WHERE cp.profile_id=? ORDER BY c.name,c.id',[$pid]);
    // Apply presence priority before the result cap, so a ready classmate is not
    // excluded simply because their nickname sorts after the first hundred.
    $hasPresence=(bool)$db->query("SELECT 1 FROM sqlite_master WHERE type='table' AND name='online_presence'")->fetchColumn();
    $presenceJoin=$hasPresence?' LEFT JOIN (SELECT op.profile_id,MAX(CASE op.state WHEN "busy" THEN 3 WHEN "ready" THEN 2 ELSE 1 END) AS rank FROM online_presence op JOIN profiles pp ON pp.id=op.profile_id JOIN accounts aa ON aa.id=pp.account_id AND aa.session_version=op.session_version WHERE op.last_seen>='.(time()-90).' GROUP BY op.profile_id) active ON active.profile_id=p.id':'';
    $priority=$hasPresence?'CASE active.rank WHEN 2 THEN 0 WHEN 1 THEN 1 WHEN 3 THEN 2 ELSE 3 END,':'';
    $context=cpResolveContext($db,$pid);$scope='';$opponentParams=[$pid,$pid];
    if(($context['mode']??'legacy')==='class'){$scope=' AND a.club_id=?';$opponentParams[]=$context['active']['club'];}
    $opponents=in_array($context['mode']??'legacy',['legacy','class'],true)?rows($db,'SELECT DISTINCT p.id,p.nickname,w.equipped FROM profiles p JOIN club_profiles b ON b.profile_id=p.id JOIN club_profiles a ON a.club_id=b.club_id LEFT JOIN wallets w ON w.profile_id=p.id'.$presenceJoin.' WHERE a.profile_id=? AND p.id!=?'.$scope.' ORDER BY '.$priority.'LOWER(p.nickname),p.id LIMIT 100',$opponentParams):[];
    foreach ($opponents as &$o) {
        $o['id']=(int)$o['id']; $o['equipped']=json_decode($o['equipped']??'{}',true);
        $o['classes']=array_column(rows($db,'SELECT c.name FROM clubs c JOIN club_profiles a ON a.club_id=c.id JOIN club_profiles b ON b.club_id=c.id WHERE a.profile_id=? AND b.profile_id=? ORDER BY c.name',[$pid,$o['id']]),'name');
    } unset($o);
    $duels=rows($db,'SELECT d.* FROM duels d WHERE (d.challenger=? OR d.opponent=?) AND '.cpVisibleSessionSql('duel','d.id','d.challenger').' AND '.cpVisibleSessionSql('duel','d.id','d.opponent').' ORDER BY CASE WHEN d.state IN ("pending","active") THEN 0 ELSE 1 END,d.created_at DESC,d.id DESC LIMIT 40',[$pid,$pid]);
    $duels=array_values(array_filter($duels,fn($d)=>duelClassmates($db,$pid,(int)$d['challenger']===$pid?(int)$d['opponent']:(int)$d['challenger'])&&duelProgramVisible($db,$d)));
    $presence=onlinePresence($db,array_column($opponents,'id'));foreach($opponents as &$opponent)$opponent['presence']=$presence[(int)$opponent['id']]??'offline';unset($opponent);
    $order=['ready'=>0,'online'=>1,'busy'=>2,'offline'=>3];usort($opponents,fn($a,$b)=>($order[$a['presence']]<=>$order[$b['presence']])?:strcasecmp($a['nickname'],$b['nickname']));
    respond(['classes'=>$classes,'opponents'=>$opponents,'duels'=>array_map(fn($d)=>duelView($db,$d,$pid),$duels)]);
}
if ($action==='duel-create') {
    $other=(int)($body['opponent']??0);
    if ($other===$pid || !duelClassmates($db,$pid,$other)) fail('Scegli un compagno iscritto alla tua classe.',403);
    $club=isset($body['programClass'])?(int)$body['programClass']:null;
    $context=cpResolveDuelContext($db,$pid,$other,$club,$body);cpRequirePlayable($context);
    $curriculum=json_decode(file_get_contents(__DIR__.'/curriculum.json'),true,32,JSON_THROW_ON_ERROR);
    $activity=$body['activity']??'kart';
    if(!is_string($activity)||!in_array($activity,['kart','football','space'],true))fail('Scegli kart, calcio o spazio.');
    $category=$body['category']??'body';
    if (!is_string($category)||!in_array($category,['body','catpositions','toys','colors','hello','school','home','animals','transport','sport','space','ocean','dino','counting','penpositions','conversation','aboutme','family','food','clothes','weather','routines','mousepositions','program'],true)||($category==='program'?($context['mode']??'legacy')!=='class':empty($curriculum[$category]))) fail('Scegli un argomento disponibile.');
    limitAttempts($db,'duels:'.$pid,20);
    $db->exec('BEGIN IMMEDIATE');
    $context=cpResolveDuelContext($db,$pid,$other,$club,$body);cpRequirePlayable($context);
    $approved=cpFilterWordPool($category==='program'?($context['words']??[]):$curriculum[$category],$context);
    if(!$approved&&($context['mode']??'legacy')==='class')$approved=cpFilterWordPool($context['words']??[],$context);
    if(!$approved){$db->exec('ROLLBACK');fail('Il programma della classe non contiene parole per questa attività. Chiedi all’adulto di assegnare una scheda.',409);}
    $unique=[];foreach ($approved as $w) $unique[normalWord($w[0])]=$w;
    $pool=array_values($unique); shuffle($pool); $questions=[];
    if(($context['mode']??'legacy')==='class'&&count($pool)<2){$db->exec('ROLLBACK');fail('Per questa sfida servono almeno due parole diverse assegnate alla classe.',409);}
    foreach (array_slice($pool,0,5) as $w) {
        $options=[];$seen=[lessonChoiceKey($w[0])=>true];
        foreach(array_column($pool,0) as $word){$key=lessonChoiceKey($word);if(!isset($seen[$key])){$options[]=$word;$seen[$key]=true;}}shuffle($options);
        $options=array_merge([$w[0]],array_slice($options,0,3));shuffle($options);
        if(($context['mode']??'legacy')==='class'&&count($options)<2){$db->exec('ROLLBACK');fail('Le parole assegnate sono equivalenti. Chiedi all’adulto di aggiungere una parola diversa.',409);}
        $questions[]=['translation'=>$w[1],'emoji'=>$w[2],'options'=>$options,'answer'=>$w[0]];
    }
    $existing=rows($db,'SELECT * FROM duels WHERE ((challenger=? AND opponent=?) OR (challenger=? AND opponent=?)) AND category=? AND state IN ("pending","active")',[$pid,$other,$other,$pid,$category]);
    foreach($existing as $open){
        if(($context['mode']??'legacy')==='class'){
            if(!cpSessionMatches($db,$pid,'duel',$open['id'],$context)||!cpSessionMatches($db,$other,'duel',$open['id'],$context))continue;
            duelAssertProgramAccess($db,$open);$db->exec('COMMIT');respond(['duel'=>duelView($db,$open,$pid)]);
        }
        $db->exec('ROLLBACK'); fail('Avete già una sfida aperta su questo argomento.',409);
    }
    foreach ([$pid,$other] as $player) {
        if ((int)one($db,'SELECT COUNT(*) AS n FROM duels WHERE (challenger=? OR opponent=?) AND expires_at>=? AND state IN ("pending","active")',[$player,$player,time()])['n']>=10) {
            $db->exec('ROLLBACK'); fail($player===$pid?'Completa le sfide aperte prima di inviarne altre.':'Questo compagno ha già tante sfide aperte. Riprova più tardi.',409);
        }
    }
    $token=bin2hex(random_bytes(16));$now=time();
    runSql($db,'INSERT INTO duels(id,challenger,opponent,category,questions,created_at,expires_at,activity) VALUES (?,?,?,?,?,?,?,?)',[$token,$pid,$other,$category,json_encode($questions,JSON_UNESCAPED_UNICODE),$now,$now+604800,$activity]);
    foreach ([$pid,$other] as $player){
        runSql($db,'INSERT INTO duel_players(duel,profile) VALUES (?,?)',[$token,$player]);
        cpBindSession($db,$player,'duel',$token,$context);
    }
    $d=one($db,'SELECT * FROM duels WHERE id=?',[$token]);$db->exec('COMMIT');respond(['duel'=>duelView($db,$d,$pid)]);
}
$token=$method==='GET'?($_GET['duel']??''):($body['duel']??'');
if (!is_string($token)) fail('Sfida non trovata.',404);
$db->exec('BEGIN IMMEDIATE');
$d=one($db,'SELECT * FROM duels WHERE id=? AND (challenger=? OR opponent=?)',[$token,$pid,$pid]);
if (!$d) { $db->exec('ROLLBACK');fail('Sfida non trovata.',404); }
$other=(int)$d['challenger']===$pid?(int)$d['opponent']:(int)$d['challenger'];
if (!duelClassmates($db,$pid,$other)) { $db->exec('ROLLBACK');fail('Non fate più parte della stessa classe.',403); }
duelAssertProgramAccess($db,$d);
$player=one($db,'SELECT * FROM duel_players WHERE duel=? AND profile=?',[$token,$pid]);
if ($action==='duel') { $db->exec('COMMIT');respond(['duel'=>duelView($db,$d,$pid),'question'=>duelQuestion($d,(int)$player['step']),'equipped'=>duelEquipped($db,$pid)]); }
if (in_array($action,['duel-accept','duel-decline','duel-cancel'],true)) {
    $authorized=$action==='duel-cancel'?(int)$d['challenger']===$pid:(int)$d['opponent']===$pid;
    if (!$authorized) { $db->exec('ROLLBACK');fail('Solo chi riceve l’invito può accettarlo o rifiutarlo.',403); }
    if ($d['state']!=='pending') { $db->exec('ROLLBACK');fail('Questo invito non è più in attesa.',409); }
    $d['state']=['duel-accept'=>'active','duel-decline'=>'declined','duel-cancel'=>'cancelled'][$action];
    runSql($db,'UPDATE duels SET state=? WHERE id=?',[$d['state'],$token]);$db->exec('COMMIT');
    respond(['duel'=>duelView($db,$d,$pid),'question'=>duelQuestion($d,0),'equipped'=>duelEquipped($db,$pid)]);
}
$questions=json_decode($d['questions'],true);$step=(int)$player['step'];
if ($d['state']!=='active'||$step>=count($questions)) { $db->exec('ROLLBACK');fail('Questa sfida non è giocabile adesso.',409); }
if (($body['step']??null)!==$step) { $db->exec('ROLLBACK');fail('Risposta già registrata. Riapri la sfida.',409); }
$answer=$body['answer']??null;$q=$questions[$step];
if (!is_int($answer)||!isset($q['options'][$answer])) { $db->exec('ROLLBACK');fail('Scegli una delle risposte.'); }
$correct=$q['options'][$answer]===$q['answer'];
cpRecordStep($db,$pid,'duel',$token,$step,['item'=>'word:'.normalWord($q['answer']),'skill'=>'duel.choice','correct'=>$correct,'completed'=>true,'helped'=>false,'errors'=>$correct?0:1,'replays'=>0]);
runSql($db,'UPDATE duel_players SET step=step+1,score=score+? WHERE duel=? AND profile=?',[$correct?10:0,$token,$pid]);
$remaining=one($db,'SELECT COUNT(*) AS n FROM duel_players WHERE duel=? AND step<?',[$token,count($questions)]);
if (!(int)$remaining['n']) { $d['state']='completed';runSql($db,'UPDATE duels SET state="completed" WHERE id=?',[$token]); }
$db->exec('COMMIT');
respond(['correct'=>$correct,'correctAnswer'=>$q['answer'],'duel'=>duelView($db,$d,$pid),'question'=>duelQuestion($d,$step+1),'equipped'=>duelEquipped($db,$pid)]);
