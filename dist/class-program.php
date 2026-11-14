<?php
/** Explicit class curricula. No global role changes, provisioning, or retrospective grading. */
declare(strict_types=1);
if(!defined('WORDYLAND_BOOTSTRAPPED')){http_response_code(404);exit;}

$db->exec('CREATE TABLE IF NOT EXISTS class_programs(id INTEGER PRIMARY KEY AUTOINCREMENT,club_id INTEGER NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,school_year TEXT NOT NULL,title TEXT NOT NULL,teacher_label TEXT NOT NULL DEFAULT "",method TEXT NOT NULL DEFAULT "",exam_goal TEXT NOT NULL DEFAULT "",units TEXT NOT NULL,edit_version INTEGER NOT NULL DEFAULT 1,published_revision INTEGER,created_by INTEGER NOT NULL REFERENCES accounts(id),created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL,UNIQUE(club_id,school_year));
CREATE TABLE IF NOT EXISTS class_program_revisions(id INTEGER PRIMARY KEY AUTOINCREMENT,program_id INTEGER NOT NULL REFERENCES class_programs(id) ON DELETE CASCADE,revision INTEGER NOT NULL,payload TEXT NOT NULL,published_by INTEGER NOT NULL REFERENCES accounts(id),published_at INTEGER NOT NULL,UNIQUE(program_id,revision));
CREATE TABLE IF NOT EXISTS class_program_heads(club_id INTEGER PRIMARY KEY REFERENCES clubs(id) ON DELETE CASCADE,program_id INTEGER NOT NULL REFERENCES class_programs(id) ON DELETE CASCADE,revision_id INTEGER NOT NULL REFERENCES class_program_revisions(id));
CREATE TABLE IF NOT EXISTS class_program_contexts(profile_id INTEGER PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,club_id INTEGER NOT NULL REFERENCES clubs(id) ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS class_program_materials(id INTEGER PRIMARY KEY AUTOINCREMENT,club_id INTEGER NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,title TEXT NOT NULL,words TEXT NOT NULL,created_by INTEGER NOT NULL REFERENCES accounts(id),created_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS class_program_staff(id INTEGER PRIMARY KEY AUTOINCREMENT,club_id INTEGER NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,authorizer_id INTEGER NOT NULL REFERENCES accounts(id),scopes TEXT NOT NULL,token_hash TEXT UNIQUE,created_at INTEGER NOT NULL,expires INTEGER NOT NULL,accepted_at INTEGER,revoked_at INTEGER);
CREATE INDEX IF NOT EXISTS class_program_staff_account ON class_program_staff(account_id,club_id);
CREATE TABLE IF NOT EXISTS class_program_consents(club_id INTEGER NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,profile_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,learner_account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,authorizer_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,guardian_link INTEGER,guardian_version INTEGER,allowed INTEGER NOT NULL,updated_at INTEGER NOT NULL,PRIMARY KEY(club_id,profile_id));
CREATE TABLE IF NOT EXISTS class_program_sessions(kind TEXT NOT NULL,token TEXT NOT NULL,profile_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,learner_account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,club_id INTEGER NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,program_id INTEGER NOT NULL REFERENCES class_programs(id) ON DELETE CASCADE,revision_id INTEGER NOT NULL REFERENCES class_program_revisions(id),created_at INTEGER NOT NULL,PRIMARY KEY(kind,token,profile_id));
CREATE TABLE IF NOT EXISTS class_program_steps(kind TEXT NOT NULL,token TEXT NOT NULL,profile_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,step INTEGER NOT NULL,item TEXT NOT NULL,skill TEXT NOT NULL,completed INTEGER NOT NULL DEFAULT 0,correct INTEGER NOT NULL DEFAULT 0,helped INTEGER NOT NULL DEFAULT 0,errors INTEGER NOT NULL DEFAULT 0,replays INTEGER NOT NULL DEFAULT 0,model INTEGER NOT NULL DEFAULT 0,updated_at INTEGER NOT NULL,PRIMARY KEY(kind,token,profile_id,step),FOREIGN KEY(kind,token,profile_id) REFERENCES class_program_sessions(kind,token,profile_id) ON DELETE CASCADE);
CREATE TRIGGER IF NOT EXISTS class_program_owner_changed AFTER UPDATE OF owner_id ON clubs WHEN NEW.owner_id IS NOT OLD.owner_id BEGIN UPDATE class_program_staff SET revoked_at=CAST(strftime("%s","now") AS INTEGER),token_hash=NULL WHERE club_id=OLD.id AND revoked_at IS NULL; END;
CREATE TRIGGER IF NOT EXISTS class_program_role_changed AFTER UPDATE OF role ON accounts WHEN NEW.role IS NOT OLD.role BEGIN UPDATE class_program_staff SET revoked_at=CAST(strftime("%s","now") AS INTEGER),token_hash=NULL WHERE (account_id=OLD.id OR authorizer_id=OLD.id) AND revoked_at IS NULL; UPDATE class_program_consents SET allowed=0,updated_at=CAST(strftime("%s","now") AS INTEGER) WHERE authorizer_id=OLD.id; END;
CREATE TRIGGER IF NOT EXISTS class_program_profile_changed AFTER UPDATE OF account_id ON profiles WHEN NEW.account_id IS NOT OLD.account_id BEGIN DELETE FROM class_program_contexts WHERE profile_id=OLD.id; UPDATE class_program_consents SET allowed=0,updated_at=CAST(strftime("%s","now") AS INTEGER) WHERE profile_id=OLD.id; END;
CREATE TRIGGER IF NOT EXISTS class_program_membership_removed AFTER DELETE ON club_profiles BEGIN DELETE FROM class_program_contexts WHERE club_id=OLD.club_id AND profile_id=OLD.profile_id; UPDATE class_program_consents SET allowed=0,updated_at=CAST(strftime("%s","now") AS INTEGER) WHERE club_id=OLD.club_id AND profile_id=OLD.profile_id; END;');

if(!in_array('guardian_version',array_column($db->query('PRAGMA table_info(class_program_consents)')->fetchAll(),'name'),true))$db->exec('ALTER TABLE class_program_consents ADD COLUMN guardian_version INTEGER');

function cpRows(PDO $db,string $sql,array $params=[]):array{$s=$db->prepare($sql);$s->execute($params);return $s->fetchAll();}
function cpOne(PDO $db,string $sql,array $params=[]):array|false{$s=$db->prepare($sql);$s->execute($params);return $s->fetch();}
function cpRun(PDO $db,string $sql,array $params=[]):void{$s=$db->prepare($sql);$s->execute($params);}
function cpDecode(string $json):array{$value=json_decode($json,true,32,JSON_THROW_ON_ERROR);return is_array($value)?$value:[];}
function cpJson(array $value):string{return json_encode($value,JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR);}
function cpId(mixed $value,string $message='Programma non disponibile.'):int{if((!is_int($value)&&!(is_string($value)&&preg_match('/^[1-9][0-9]{0,17}$/D',$value)))||(int)$value<1)fail($message,404);return (int)$value;}
function cpText(mixed $value,int $length,bool $empty=true):string{if(!is_string($value)||strlen($value)>$length||preg_match('/[\x00-\x08\x0B\x0C\x0E-\x1F]/',$value))fail('Inserisci un testo breve e leggibile.');$value=trim($value);if(!$empty&&$value==='')fail('Completa i dati del programma.');return $value;}
function cpNormalize(string $word):string{return strtolower(trim(preg_replace('/\s+/u',' ',str_replace(['’','‘'],"'",$word))??$word));}
function cpRequireActor(PDO $db,bool $adult=false):array{$a=cpOne($db,'SELECT id,username,role,session_version FROM accounts WHERE id=?',[userId()]);if(!$a||(int)$a['session_version']!==(int)($_SESSION['version']??0))fail('Accedi di nuovo prima di continuare.',401);if($adult&&!in_array($a['role'],['adult','admin'],true))fail('Questa gestione richiede un account adulto.',403);return $a;}
function cpOwnedProfile(PDO $db,int $pid):array{cpRequireActor($db);$p=cpOne($db,'SELECT * FROM profiles WHERE id=? AND account_id=?',[$pid,userId()]);if(!$p)fail('Profilo non disponibile.',404);return $p;}
function cpCurrentAdult(PDO $db,int $actor):array|false{$a=cpOne($db,'SELECT id,username,role,session_version FROM accounts WHERE id=?',[$actor]);if($actor===(int)($_SESSION['account_id']??0)&&$a&&(int)$a['session_version']!==(int)($_SESSION['version']??0))return false;return $a&&in_array($a['role'],['adult','admin'],true)?$a:false;}
function cpTable(PDO $db,string $table):bool{return (bool)cpOne($db,'SELECT 1 FROM sqlite_master WHERE type="table" AND name=?',[$table]);}
function cpClasses(PDO $db,int $pid):array{$rows=cpRows($db,'SELECT c.id,c.name,EXISTS(SELECT 1 FROM class_programs p WHERE p.club_id=c.id) AS configured FROM clubs c JOIN club_profiles m ON m.club_id=c.id WHERE m.profile_id=? ORDER BY c.name,c.id',[$pid]);foreach($rows as &$c){$c['id']=(int)$c['id'];$c['configured']=(bool)$c['configured'];}unset($c);return $rows;}
function cpStaffValid(PDO $db,int $actor,int $club,string $scope):bool{
    $rows=cpRows($db,'SELECT s.scopes FROM class_program_staff s JOIN clubs c ON c.id=s.club_id AND c.owner_id=s.authorizer_id JOIN accounts a ON a.id=s.account_id AND a.role IN ("adult","admin") JOIN accounts issuer ON issuer.id=s.authorizer_id AND issuer.role IN ("adult","admin") WHERE s.club_id=? AND s.account_id=? AND s.accepted_at IS NOT NULL AND s.revoked_at IS NULL',[$club,$actor]);
    foreach($rows as $row)if(in_array($scope,cpDecode($row['scopes']),true))return true;return false;
}
function cpCan(PDO $db,int $actor,int $club,string $scope):bool{$a=cpCurrentAdult($db,$actor);if(!$a)return false;$c=cpOne($db,'SELECT owner_id FROM clubs WHERE id=?',[$club]);return $c&&($a['role']==='admin'||(int)$c['owner_id']===$actor||cpStaffValid($db,$actor,$club,$scope));}
function cpRequireManager(PDO $db,int $club,string $scope='program-edit'):array{if(!cpCan($db,userId(),$club,$scope))fail('Questa gestione richiede un incarico nella classe.',403);return cpOne($db,'SELECT id,name,owner_id FROM clubs WHERE id=?',[$club]);}
function cpMetadata(array $program,int $revision):array{return ['club'=>(int)$program['club_id'],'program'=>(int)$program['id'],'revision'=>$revision,'title'=>$program['title'],'schoolYear'=>$program['school_year'],'teacherLabel'=>$program['teacher_label'],'method'=>$program['method'],'examGoal'=>$program['exam_goal']];}
function cpEmptyContext(string $mode,array $classes=[],?array $active=null):array{return ['mode'=>$mode,'classes'=>$classes,'active'=>$active,'words'=>[],'allowed'=>['grammarCases'=>[],'wordIds'=>[],'letterIds'=>[],'sentenceIds'=>[],'instructionIds'=>[],'phonicsGroups'=>[]],'units'=>[],'expected'=>null];}
function cpRevisionContext(PDO $db,int $revision,array $classes=[]):array{
    $r=cpOne($db,'SELECT r.*,p.club_id FROM class_program_revisions r JOIN class_programs p ON p.id=r.program_id WHERE r.id=?',[$revision]);if(!$r)fail('Il programma richiede un aggiornamento.',409);
    $payload=cpDecode($r['payload']);$active=$payload['active'];$active['revision']=(int)$r['id'];$context=cpEmptyContext('class',$classes,$active);
    foreach(['words','allowed','units'] as $key)$context[$key]=$payload[$key]??$context[$key];
    $context['units']=array_values(array_filter($context['units'],fn($u)=>in_array($u['status']??null,['active','review'],true)));
    $training=$payload['trainingV3']??$payload['training']??null;
    if(is_array($training))$context['training']=$training;
    $context['expected']=['programClass'=>(int)$r['club_id'],'programRevision'=>(int)$r['id']];return $context;
}
function cpResolveContext(PDO $db,int $pid,?array $expected=null):array{
    $classes=cpClasses($db,$pid);$choice=cpOne($db,'SELECT club_id FROM class_program_contexts WHERE profile_id=?',[$pid]);$club=0;
    if($choice&&in_array((int)$choice['club_id'],array_column($classes,'id'),true))$club=(int)$choice['club_id'];
    elseif(count($classes)===1)$club=$classes[0]['id'];
    elseif(count($classes)>1&&array_filter($classes,fn($c)=>$c['configured']))$context=cpEmptyContext('selection-required',$classes);
    if(!isset($context)){
        if(!$club)$context=cpEmptyContext('legacy',$classes);
        else{
            $head=cpOne($db,'SELECT revision_id FROM class_program_heads WHERE club_id=?',[$club]);
            if($head)$context=cpRevisionContext($db,(int)$head['revision_id'],$classes);
            else{$draft=cpOne($db,'SELECT * FROM class_programs WHERE club_id=? ORDER BY updated_at DESC,id DESC LIMIT 1',[$club]);$context=$draft?cpEmptyContext('blocked',$classes,cpMetadata($draft,0)):cpEmptyContext('legacy',$classes);}
        }
    }
    if($context['mode']==='class'&&(!$context['words']&&!$context['allowed']['grammarCases']&&!$context['allowed']['letterIds']&&!$context['allowed']['sentenceIds']&&!$context['allowed']['instructionIds']&&!$context['allowed']['phonicsGroups']))$context['mode']='blocked';
    if($expected!==null){
        $has=array_key_exists('programClass',$expected)||array_key_exists('programRevision',$expected);
        if($context['mode']==='class'){
            if(!$has||(int)($expected['programClass']??0)!==$context['active']['club']||(int)($expected['programRevision']??0)!==$context['active']['revision'])fail('Il programma della classe è cambiato. Aggiorna e scegli il percorso.',409);
        }elseif($has)fail('Il contesto della classe è cambiato. Aggiorna prima di iniziare.',409);
    }
    return $context;
}
function cpRequirePlayable(array $context):void{if($context['mode']==='selection-required')fail('Scegli la classe prima di iniziare.',409);if($context['mode']==='blocked')fail('Il programma della classe non è ancora pubblicato oppure non ha attività assegnate.',409);}
function cpIcon(string $id):string{return ['tree'=>'🌳','boy'=>'🧒','hand'=>'✋','apple'=>'🍎','pencil-sharpener'=>'🔧','pencil'=>'✏️','pen'=>'🖊️','book'=>'📘','eraser'=>'🧽','rubber'=>'🧽','bag'=>'🎒','bookbag'=>'🎒','notebook'=>'📓','sharpener'=>'🔧','desk'=>'🏫','chair'=>'🪑','doll'=>'🪆','car'=>'🚗','ball'=>'⚽','puzzle'=>'🧩','teddy'=>'🧸','rabbit'=>'🐇','cat'=>'🐈','rat'=>'🐀','dog'=>'🐕','lizard'=>'🦎','hat'=>'👒','grammar-door'=>'🚪','grammar-ruler'=>'📏','grammar-chair'=>'🪑','grammar-table'=>'🪵','grammar-egg'=>'🥚','grammar-apple'=>'🍎','grammar-cup'=>'☕'][$id]??'📘';}
function cpTrainingSource():array{return cpDecode((string)file_get_contents(__DIR__.'/training.json'));}
function cpWordIndex(array $content):array{
    $index=[];foreach($content['foundationWords']??$content['words']??[] as $w)$index[cpNormalize($w['id'])]=[$w['id'],$w['meaning'],$w['emoji']??'📘'];
    foreach($content['grammarLessons']['nouns']??[] as $n){if(($n['targetOnly']??false)===true)continue;foreach([['singular','meaning'],['plural','pluralMeaning']] as [$form,$meaning])if(is_string($n[$form]??null)&&isset($n[$meaning])){$key=cpNormalize($n[$form]);$index[$key]??=[$n[$form],$n[$meaning],cpIcon($n['id']??$n['art']??'')];}}
    return $index;
}
function cpCatalog(PDO $db,int $club):array{
    $data=cpDecode((string)file_get_contents(__DIR__.'/class-program-catalog.json'));$content=cpTrainingSource();$index=cpWordIndex($content);$grammarNouns=array_column($content['grammarLessons']['nouns']??[],null,'id');$units=[];
    foreach($data['units']??[] as $definition){
        $grammar=[];$words=[];$ids=$definition['wordIds']??[];
        foreach($content['wordPacks']??[] as $pack)if(in_array($pack['id'],$definition['wordPacks']??[],true))$ids=array_merge($ids,$pack['words']);
        foreach($content['grammarLessons']['packs']??[] as $pack)if(in_array($pack['id'],$definition['grammarPacks']??[],true)){
            foreach($pack['cases']??[] as $case){$grammar[]=$case['id'];
                if($definition['id']==='classroom-grammar'){
                    $text=implode(' ',array_filter(array_map(fn($key)=>is_string($case[$key]??null)?$case[$key]:'',['answer','model','ending','question','audio'])));
                    $noun=$grammarNouns[$case['noun']]??[];
                    foreach(['singular','plural'] as $form)if(is_string($noun[$form]??null)&&preg_match('/(?<![\pL\pN])'.preg_quote($noun[$form],'/').'(?![\pL\pN])/iu',$text))$ids[]=$noun[$form];
                }
            }
        }
        foreach(array_values(array_unique($ids)) as $word)if(isset($index[cpNormalize($word)]))$words[cpNormalize($word)]=$index[cpNormalize($word)];
        $letterIds=array_values(array_intersect(array_column($content['letters']??[],'id'),$definition['letterIds']??[]));
        $units[]=['id'=>$definition['id'],'title'=>$definition['title'],'source'=>$definition['source'],'private'=>false,'words'=>array_values($words),'allowed'=>['grammarCases'=>array_values(array_unique($grammar)),'wordIds'=>array_column(array_values($words),0),'letterIds'=>$letterIds,'sentenceIds'=>[],'instructionIds'=>[],'phonicsGroups'=>[]],'grammarPacks'=>$definition['grammarPacks']??[]];
    }
    foreach(cpRows($db,'SELECT id,title,words FROM class_program_materials WHERE club_id=? ORDER BY id',[$club]) as $m){$words=cpDecode($m['words']);$units[]=['id'=>'material-'.$m['id'],'title'=>$m['title'],'source'=>'adult-reviewed-class-material','private'=>true,'words'=>$words,'allowed'=>['grammarCases'=>[],'wordIds'=>array_column($words,0),'letterIds'=>[],'sentenceIds'=>[],'instructionIds'=>[],'phonicsGroups'=>[]],'grammarPacks'=>[]];}
    return $units;
}
function cpComposeRevision(PDO $db,array $program):array{
    $catalog=array_column(cpCatalog($db,(int)$program['club_id']),null,'id');$selection=cpDecode($program['units']);$allowed=cpEmptyContext('class')['allowed'];$words=[];$units=[];
    foreach($selection as $selected){$unit=$catalog[$selected['id']]??null;if(!$unit)fail('Una scheda non è più disponibile. Controlla il programma.',409);$unit['status']=$selected['status'];$units[]=$unit;
        if(!in_array($unit['status'],['active','review'],true))continue;
        foreach($unit['words'] as $w)$words[cpNormalize($w[0])]=$w;
        foreach($allowed as $key=>$values)$allowed[$key]=array_values(array_unique(array_merge($values,$unit['allowed'][$key]??[])));
    }
    if(!$words&&!$allowed['grammarCases']&&!$allowed['letterIds']&&!$allowed['sentenceIds']&&!$allowed['instructionIds']&&!$allowed['phonicsGroups'])fail('Assegna almeno un’attività attiva prima di pubblicare.',409);
    $context=['mode'=>'class','words'=>array_values($words),'allowed'=>$allowed];
    $training=cpFilterTrainingContent(cpTrainingSource(),$context);
    $payload=['active'=>cpMetadata($program,0),'words'=>array_values($words),'allowed'=>$allowed,'units'=>$units,'training'=>$training];
    // Old application3614 reads payload.training: keep its frozen view executable.
    $v3Packs=['best2-what-questions','best2-this-these','best2-it-they-sentences'];
    $newWords=['slide','scooter','swing','shelf','cupboard','computer','tree'];
    $needsV3=(bool)array_intersect(array_column($training['grammarLessons']['packs']??[],'id'),$v3Packs)||(bool)array_intersect(array_column($training['foundationWords']??[],'id'),$newWords);
    if($needsV3){
        $safe=$training;$safe['grammarLessons']['packs']=array_values(array_filter($training['grammarLessons']['packs']??[],fn($p)=>!in_array($p['id'],$v3Packs,true)));
        $safe['wordPacks']=array_values(array_filter($training['wordPacks']??[],fn($p)=>$p['id']!=='best2-new-words'));
        foreach($safe['wordPacks'] as &$p)if(array_intersect($p['words'],$newWords))$p['wordOnly']=true;unset($p);
        $payload['training']=$safe;$payload['trainingV3']=$training;
    }
    return $payload;
}
function cpFilterWordPool(array $rows,array $context):array{
    if($context['mode']==='legacy')return $rows;
    if($context['mode']!=='class')return [];
    $approved=[];foreach($context['words']??[] as $word)$approved[cpNormalize($word[0])]=$word;
    $filtered=[];foreach($rows as $row)if(is_array($row)&&is_string($row[0]??null)&&isset($approved[cpNormalize($row[0])])){$canonical=$approved[cpNormalize($row[0])];if(!array_key_exists(3,$canonical)&&array_key_exists(3,$row))$canonical[3]=$row[3];$filtered[]=$canonical;}
    return $filtered;
}
function cpFilterTrainingContent(array $content,array $context):array{
    if($context['mode']==='legacy')return $content;
    if($context['mode']==='class'&&isset($context['training'])&&is_array($context['training'])){
        $snapshot=$context['training'];
        foreach(['classroomArt','stickers'] as $key)if(isset($content[$key]))$snapshot[$key]=$content[$key];
        return $snapshot;
    }
    $allowed=$context['allowed'];$wordKeys=array_fill_keys(array_map('cpNormalize',$allowed['wordIds']??[]),true);$wordRows=[];
    foreach($content['foundationWords']??$content['words']??[] as $w)if(isset($wordKeys[cpNormalize($w['id'])])){$w['wordOnly']=true;$w['phrase']=$w['id'];$w['gap']='___';$w['phraseMeaning']=$w['meaning'];$wordRows[cpNormalize($w['id'])]=$w;}
    foreach($context['words']??[] as $w){$key=cpNormalize($w[0]);$wordRows[$key]=array_replace($wordRows[$key]??['topic'=>'programma della classe'],['id'=>$w[0],'meaning'=>$w[1],'emoji'=>$w[2]??'📘','phrase'=>$w[0],'phraseMeaning'=>$w[1],'gap'=>'___','wordOnly'=>true]);}
    $content['words']=array_values($wordRows);$content['foundationWords']=array_values($wordRows);
    $packs=[];foreach($content['wordPacks']??[] as $p){$p['words']=array_values(array_filter($p['words'],fn($id)=>isset($wordKeys[cpNormalize($id)])));if($p['words'])$packs[]=$p;}
    if($wordRows)$packs[]=['id'=>'program','title'=>'Le parole della classe','icon'=>'🏫','words'=>array_column(array_values($wordRows),'id')];$content['wordPacks']=$packs;
    $content['letters']=array_values(array_filter($content['letters']??[],fn($l)=>in_array($l['id'],$allowed['letterIds'],true)));
    $content['blocks']=array_values(array_filter($content['blocks']??[],fn($b)=>!array_diff($b['letters'],$allowed['letterIds'])));
    foreach(['sentenceActivities'=>'sentenceIds','instructionActivities'=>'instructionIds'] as $field=>$key)$content[$field]=array_values(array_filter($content[$field]??[],fn($a)=>in_array($a['id'],$allowed[$key],true)));
    $grammar=$content['grammarLessons']??[];$catalogLabels=[];$grammarPacks=[];$used=[];
    foreach($grammar['packs']??[] as $p){$catalogLabels[]=['id'=>$p['id'],'title'=>$p['title']];$p['cases']=array_values(array_filter($p['cases'],fn($c)=>in_array($c['id'],$allowed['grammarCases'],true)));if($p['cases']){foreach($p['cases'] as $c){$used[$c['noun']]=true;if(isset($c['askedNoun']))$used[$c['askedNoun']]=true;}$grammarPacks[]=$p;}}
    $grammar['packs']=$grammarPacks;$grammar['nouns']=array_values(array_filter($grammar['nouns']??[],fn($n)=>isset($used[$n['id']])));$grammar['catalogLabels']=$catalogLabels;$content['grammarLessons']=$grammar;
    if(isset($content['phonics']))$content['phonics']['groups']=array_values(array_filter($content['phonics']['groups']??[],fn($g)=>in_array($g['id'],$allowed['phonicsGroups'],true)&&!array_diff($g['words'],$allowed['wordIds'])));
    return $content;
}
function cpSessionRow(PDO $db,int $pid,string $kind,string $token):array|false{return cpOne($db,'SELECT s.*,p.account_id AS current_account,EXISTS(SELECT 1 FROM club_profiles m WHERE m.club_id=s.club_id AND m.profile_id=s.profile_id) AS member FROM class_program_sessions s JOIN profiles p ON p.id=s.profile_id WHERE s.kind=? AND s.token=? AND s.profile_id=?',[$kind,$token,$pid]);}
/** Trusted correlated predicate; apply before LIMIT, then recheck metadata/access. */
function cpVisibleSessionSql(string $kind,string $aliasToken,string $aliasPid):string{
    $identifier='/^(?:[A-Za-z_][A-Za-z0-9_]*\.)?[A-Za-z_][A-Za-z0-9_]*$/D';
    if(!in_array($kind,['training','phonics','quest','holiday','duel'],true)||!preg_match($identifier,$aliasToken)||(!preg_match($identifier,$aliasPid)&&!preg_match('/^[1-9][0-9]*$/D',$aliasPid)))throw new InvalidArgumentException('Trusted session identifiers required');
    return 'NOT EXISTS(SELECT 1 FROM class_program_sessions cpv LEFT JOIN profiles cpvp ON cpvp.id=cpv.profile_id WHERE cpv.kind=\''.$kind.'\' AND cpv.token='.$aliasToken.' AND cpv.profile_id='.$aliasPid.' AND (cpvp.account_id IS NULL OR cpvp.account_id<>cpv.learner_account_id OR NOT EXISTS(SELECT 1 FROM club_profiles cpvm WHERE cpvm.club_id=cpv.club_id AND cpvm.profile_id=cpv.profile_id)))';
}
function cpSessionMetadata(PDO $db,int $pid,string $kind,string $token):?array{
    $s=cpSessionRow($db,$pid,$kind,$token);if(!$s)return null;$head=cpOne($db,'SELECT revision_id FROM class_program_heads WHERE club_id=?',[$s['club_id']]);$accessible=(bool)$s['member']&&(int)$s['current_account']===(int)$s['learner_account_id'];
    $meta=['club'=>(int)$s['club_id'],'program'=>(int)$s['program_id'],'revision'=>(int)$s['revision_id'],'historical'=>!$head||(int)$head['revision_id']!==(int)$s['revision_id'],'accessible'=>$accessible,'expected'=>['programClass'=>(int)$s['club_id'],'programRevision'=>(int)$s['revision_id']]];
    if($accessible){$context=cpRevisionContext($db,(int)$s['revision_id']);$meta=array_merge($context['active'],$meta);$meta['active']=$context['active'];}
    return $meta;
}
function cpAssertSessionAccess(PDO $db,int $pid,string $kind,string $token):?array{$s=cpSessionRow($db,$pid,$kind,$token);if(!$s)return null;if(!(bool)$s['member']||(int)$s['current_account']!==(int)$s['learner_account_id'])fail('Questa attività appartiene a una classe non più disponibile per il profilo.',403);$context=cpRevisionContext($db,(int)$s['revision_id']);$context['historical']=cpSessionMetadata($db,$pid,$kind,$token)['historical'];return $context;}
function cpSessionMatches(PDO $db,int $pid,string $kind,string $token,array $context):bool{$s=cpSessionRow($db,$pid,$kind,$token);if($context['mode']==='legacy')return !$s;if($context['mode']!=='class'||!$s)return false;return (bool)$s['member']&&(int)$s['current_account']===(int)$s['learner_account_id']&&(int)$s['club_id']===$context['active']['club']&&(int)$s['revision_id']===$context['active']['revision'];}
function cpBindSession(PDO $db,int $pid,string $kind,string $token,array $context):void{
    if($context['mode']==='legacy')return;cpRequirePlayable($context);if($context['mode']!=='class'||!in_array($kind,['training','phonics','quest','holiday','duel'],true))fail('Contesto del programma non valido.',409);
    $active=$context['active'];$p=cpOne($db,'SELECT p.account_id,h.revision_id FROM profiles p JOIN club_profiles m ON m.profile_id=p.id AND m.club_id=? JOIN class_program_heads h ON h.club_id=m.club_id WHERE p.id=?',[$active['club'],$pid]);
    if(!$p||(int)$p['revision_id']!==$active['revision'])fail('Il programma della classe è cambiato. Aggiorna prima di iniziare.',409);
    $old=cpSessionRow($db,$pid,$kind,$token);if($old){if((int)$old['club_id']!==$active['club']||(int)$old['revision_id']!==$active['revision']||(int)$old['learner_account_id']!==(int)$p['account_id'])fail('La sessione è già collegata a un altro programma.',409);return;}
    cpRun($db,'INSERT INTO class_program_sessions(kind,token,profile_id,learner_account_id,club_id,program_id,revision_id,created_at) VALUES(?,?,?,?,?,?,?,?)',[$kind,$token,$pid,(int)$p['account_id'],$active['club'],$active['program'],$active['revision'],time()]);
}
function cpRecordStep(PDO $db,int $pid,string $kind,string $token,int $step,array $outcome):void{
    $context=cpAssertSessionAccess($db,$pid,$kind,$token);if(!$context)return;
    $item=substr((string)($outcome['item']??''),0,180);$skill=substr((string)($outcome['skill']??''),0,80);$model=str_contains($skill,'model')||str_contains($skill,'explore');
    $complete=($outcome['completed']??false)===true;$correct=($outcome['correct']??false)===true;$helped=($outcome['helped']??false)===true||$model;
    cpRun($db,'INSERT INTO class_program_steps(kind,token,profile_id,step,item,skill,completed,correct,helped,errors,replays,model,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(kind,token,profile_id,step) DO UPDATE SET completed=MAX(completed,excluded.completed),correct=MAX(correct,excluded.correct),helped=MAX(helped,excluded.helped),errors=MAX(errors,excluded.errors),replays=MAX(replays,excluded.replays),model=MAX(model,excluded.model),updated_at=excluded.updated_at',[$kind,$token,$pid,max(0,$step),$item,$skill,(int)$complete,(int)$correct,(int)$helped,max(0,min(10000,(int)($outcome['errors']??0))),max(0,min(10000,(int)($outcome['replays']??0))),(int)$model,time()]);
}
function cpResolveDuelContext(PDO $db,int $a,int $b,?int $club,?array $expected=null):array{
    $common=cpRows($db,'SELECT c.id,c.name,EXISTS(SELECT 1 FROM class_programs p WHERE p.club_id=c.id) AS configured FROM clubs c JOIN club_profiles a ON a.club_id=c.id JOIN club_profiles b ON b.club_id=c.id WHERE a.profile_id=? AND b.profile_id=? ORDER BY c.id',[$a,$b]);
    foreach($common as &$c){$c['id']=(int)$c['id'];$c['configured']=(bool)$c['configured'];}unset($c);if(!$common)fail('Scegli un compagno della stessa classe.',403);
    $requested=$club??(isset($expected['programClass'])?(int)$expected['programClass']:null);
    if($requested===null){$selected=cpOne($db,'SELECT club_id FROM class_program_contexts WHERE profile_id=?',[$a]);if($selected&&in_array((int)$selected['club_id'],array_column($common,'id'),true))$requested=(int)$selected['club_id'];elseif(count($common)===1)$requested=$common[0]['id'];elseif(!array_filter($common,fn($c)=>$c['configured']))return cpEmptyContext('legacy',$common);else fail('Scegli la classe per questa sfida.',409);}
    if(!in_array($requested,array_column($common,'id'),true))fail('Questa classe non è condivisa dai due profili.',403);
    $head=cpOne($db,'SELECT revision_id FROM class_program_heads WHERE club_id=?',[$requested]);
    if(!$head){if(cpOne($db,'SELECT id FROM class_programs WHERE club_id=?',[$requested]))fail('Pubblica il programma della classe prima di creare la sfida.',409);if(isset($expected['programClass'])||isset($expected['programRevision']))fail('Aggiorna il programma prima della sfida.',409);return cpEmptyContext('legacy',$common);}
    $context=cpRevisionContext($db,(int)$head['revision_id'],$common);cpRequirePlayable($context);
    if($expected!==null&&((int)($expected['programClass']??0)!==$requested||(int)($expected['programRevision']??0)!==$context['active']['revision']))fail('Il programma della sfida è cambiato. Aggiorna la classe.',409);
    return $context;
}

function cpProgramView(array $p):array{return ['id'=>(int)$p['id'],'club'=>(int)$p['club_id'],'schoolYear'=>$p['school_year'],'title'=>$p['title'],'teacherLabel'=>$p['teacher_label'],'method'=>$p['method'],'examGoal'=>$p['exam_goal'],'editVersion'=>(int)$p['edit_version'],'publishedRevision'=>$p['published_revision']===null?null:(int)$p['published_revision'],'units'=>cpDecode($p['units']),'updatedAt'=>(int)$p['updated_at']];}
function cpManagedClasses(PDO $db,int $actor):array{$rows=cpRows($db,'SELECT id,name,owner_id FROM clubs ORDER BY name,id');$result=[];foreach($rows as $c){$edit=cpCan($db,$actor,(int)$c['id'],'program-edit');$read=cpCan($db,$actor,(int)$c['id'],'progress-read');if($edit||$read)$result[]=['id'=>(int)$c['id'],'name'=>$c['name'],'owner'=>(int)$c['owner_id']===$actor,'canEdit'=>$edit,'canReadProgress'=>$read];}return $result;}
function cpHistory(PDO $db,int $club):array{$result=[];foreach(cpRows($db,'SELECT r.id,r.program_id,r.revision,r.payload,r.published_at FROM class_program_revisions r JOIN class_programs p ON p.id=r.program_id WHERE p.club_id=? ORDER BY r.id DESC',[$club]) as $r){$p=cpDecode($r['payload']);$result[]=array_merge($p['active'],['id'=>(int)$r['id'],'program'=>(int)$r['program_id'],'revision'=>(int)$r['revision'],'publishedRevision'=>(int)$r['id'],'publishedAt'=>(int)$r['published_at'],'units'=>array_map(fn($u)=>['id'=>$u['id'],'title'=>$u['title'],'status'=>$u['status']],$p['units']??[])]);}return $result;}
function cpManage(PDO $db,int $club):array{
    if(!cpCan($db,userId(),$club,'program-edit')){
        cpRequireManager($db,$club,'progress-read');$head=cpOne($db,'SELECT revision_id FROM class_program_heads WHERE club_id=?',[$club]);$program=null;
        if($head){$published=cpRevisionContext($db,(int)$head['revision_id']);$a=$published['active'];$program=['id'=>$a['program'],'club'=>$a['club'],'schoolYear'=>$a['schoolYear'],'title'=>$a['title'],'teacherLabel'=>$a['teacherLabel'],'method'=>$a['method'],'examGoal'=>$a['examGoal'],'editVersion'=>0,'publishedRevision'=>$a['revision'],'units'=>array_map(fn($u)=>['id'=>$u['id'],'title'=>$u['title'],'status'=>$u['status']],$published['units'])];}
        return ['classes'=>cpManagedClasses($db,userId()),'program'=>$program,'units'=>[],'catalog'=>[],'teachers'=>[],'history'=>[],'consentTargets'=>cpConsentTargets($db,userId())];
    }
    cpRequireManager($db,$club);$p=cpOne($db,'SELECT * FROM class_programs WHERE club_id=? ORDER BY updated_at DESC,id DESC LIMIT 1',[$club]);$teachers=[];
    foreach(cpRows($db,'SELECT s.id,s.scopes,s.expires,s.accepted_at,s.revoked_at,a.username FROM class_program_staff s JOIN accounts a ON a.id=s.account_id WHERE s.club_id=? ORDER BY s.id DESC LIMIT 100',[$club]) as $s)$teachers[]=['id'=>(int)$s['id'],'username'=>$s['username'],'scopes'=>cpDecode($s['scopes']),'expires'=>(int)$s['expires'],'status'=>$s['revoked_at']!==null?'revoked':($s['accepted_at']!==null?'active':((int)$s['expires']<=time()?'expired':'pending'))];
    $catalog=cpCatalog($db,$club);return ['classes'=>cpManagedClasses($db,userId()),'program'=>$p?cpProgramView($p):null,'units'=>$catalog,'catalog'=>$catalog,'teachers'=>$teachers,'history'=>cpHistory($db,$club),'consentTargets'=>cpConsentTargets($db,userId())];
}
function cpGuardianConsentLink(PDO $db,int $actor,int $club,int $pid):?int{
    if(!cpTable($db,'guardian_links'))return null;
    $row=cpOne($db,'SELECT g.id FROM guardian_links g JOIN profiles p ON p.id=g.profile_id AND p.account_id=g.learner_account_id JOIN accounts child ON child.id=p.account_id AND child.role="learner" JOIN clubs c ON c.id=g.club_id AND c.owner_id=g.authorizer_id JOIN club_profiles m ON m.club_id=g.club_id AND m.profile_id=g.profile_id JOIN accounts parent ON parent.id=g.parent_id AND parent.role IN ("adult","admin") JOIN accounts issuer ON issuer.id=g.authorizer_id AND issuer.role IN ("adult","admin") WHERE g.parent_id=? AND g.club_id=? AND g.profile_id=? AND g.scope="progress-read" AND g.accepted_at IS NOT NULL AND g.revoked_at IS NULL',[$actor,$club,$pid]);return $row?(int)$row['id']:null;
}
function cpConsentValid(PDO $db,int $club,int $pid):bool{
    $c=cpOne($db,'SELECT s.*,p.account_id AS current_account FROM class_program_consents s JOIN profiles p ON p.id=s.profile_id JOIN club_profiles m ON m.club_id=s.club_id AND m.profile_id=s.profile_id JOIN accounts a ON a.id=s.authorizer_id AND a.role IN ("adult","admin") WHERE s.club_id=? AND s.profile_id=? AND s.allowed=1',[$club,$pid]);if(!$c||(int)$c['current_account']!==(int)$c['learner_account_id'])return false;
    if($c['guardian_link']===null)return (int)$c['authorizer_id']===(int)$c['current_account'];
    if(cpGuardianConsentLink($db,(int)$c['authorizer_id'],$club,$pid)!==(int)$c['guardian_link'])return false;$g=cpOne($db,'SELECT version FROM guardian_links WHERE id=?',[$c['guardian_link']]);return $g&&$c['guardian_version']!==null&&(int)$g['version']===(int)$c['guardian_version'];
}
function cpConsentTargets(PDO $db,int $actor):array{
    $targets=[];
    foreach(cpRows($db,'SELECT c.id AS club,c.name AS class_name,p.id AS profile,p.nickname FROM profiles p JOIN club_profiles m ON m.profile_id=p.id JOIN clubs c ON c.id=m.club_id WHERE p.account_id=? ORDER BY c.name,p.nickname,p.id',[$actor]) as $p){$club=(int)$p['club'];$pid=(int)$p['profile'];$targets[$club.':'.$pid]=['club'=>$club,'profile'=>$pid,'nickname'=>$p['nickname'],'className'=>$p['class_name'],'allowed'=>cpConsentValid($db,$club,$pid),'source'=>'owned'];}
    if(cpTable($db,'guardian_links'))foreach(cpRows($db,'SELECT g.id,g.club_id,g.profile_id,p.nickname,c.name FROM guardian_links g JOIN profiles p ON p.id=g.profile_id JOIN clubs c ON c.id=g.club_id WHERE g.parent_id=? AND g.accepted_at IS NOT NULL AND g.revoked_at IS NULL ORDER BY g.id',[$actor]) as $g){$club=(int)$g['club_id'];$pid=(int)$g['profile_id'];if(cpGuardianConsentLink($db,$actor,$club,$pid)!==(int)$g['id'])continue;$targets[$club.':'.$pid]??=['club'=>$club,'profile'=>$pid,'nickname'=>$g['nickname'],'className'=>$g['name'],'allowed'=>cpConsentValid($db,$club,$pid),'source'=>'guardian','guardianLink'=>(int)$g['id']];}
    return array_values($targets);
}
function cpProgress(PDO $db,int $club,?int $program):array{
    $class=cpRequireManager($db,$club,'progress-read');$p=$program?cpOne($db,'SELECT * FROM class_programs WHERE id=? AND club_id=?',[$program,$club]):cpOne($db,'SELECT p.* FROM class_programs p JOIN class_program_heads h ON h.program_id=p.id WHERE h.club_id=?',[$club]);if(!$p)fail('Nessun programma pubblicato disponibile.',404);
    $profiles=[];foreach(cpRows($db,'SELECT p.id,p.nickname,p.account_id FROM club_profiles m JOIN profiles p ON p.id=m.profile_id WHERE m.club_id=? ORDER BY p.nickname,p.id',[$club]) as $profile){$pid=(int)$profile['id'];$row=['id'=>$pid,'nickname'=>$profile['nickname'],'shared'=>cpConsentValid($db,$club,$pid)];
        if($row['shared']){
            $items=cpRows($db,'SELECT t.item,t.skill,t.model,SUM(t.completed) AS completed,SUM(CASE WHEN t.completed=1 AND t.model=0 AND t.helped=0 AND t.errors=0 THEN 1 ELSE 0 END) AS independent,SUM(CASE WHEN t.completed=1 AND t.model=0 AND (t.helped=1 OR t.errors>0) THEN 1 ELSE 0 END) AS guided,SUM(t.errors) AS errors,SUM(t.replays) AS replays FROM class_program_steps t JOIN class_program_sessions s ON s.kind=t.kind AND s.token=t.token AND s.profile_id=t.profile_id WHERE s.profile_id=? AND s.club_id=? AND s.program_id=? AND s.learner_account_id=? GROUP BY t.item,t.skill,t.model ORDER BY t.item,t.skill',[$pid,$club,$p['id'],$profile['account_id']]);
            $totals=['completed'=>0,'independent'=>0,'guided'=>0,'errors'=>0,'replays'=>0,'models'=>0];
            foreach($items as &$item){foreach(['completed','independent','guided','errors','replays','model'] as $key)$item[$key]=(int)$item[$key];$item['isModel']=(bool)$item['model'];if($item['isModel'])$totals['models']+=$item['completed'];else foreach(['completed','independent','guided','errors','replays'] as $key)$totals[$key]+=$item[$key];}unset($item);$row['totals']=$totals;$row['items']=$items;
        }$profiles[]=$row;
    }
    foreach($profiles as &$row)if($row['shared']&&!cpConsentValid($db,$club,$row['id'])){$row['shared']=false;unset($row['totals'],$row['items']);}unset($row);cpRequireManager($db,$club,'progress-read');
    return ['scope'=>'class-program-confirmed-only','class'=>['id'=>$club,'name'=>$class['name']],'program'=>cpProgramView($p),'profiles'=>$profiles,'notes'=>'Solo attività associate a questo programma. Gli aiuti non sono voti; i modelli restano distinti dalle risposte autonome.'];
}
function cpValidateUnits(PDO $db,int $club,mixed $units):array{
    if(!is_array($units)||!array_is_list($units)||count($units)>100)fail('Controlla le unità del programma.');$catalog=array_column(cpCatalog($db,$club),null,'id');$clean=[];
    foreach($units as $u){if(!is_array($u)||!is_string($u['id']??null)||!isset($catalog[$u['id']])||!in_array($u['status']??null,['active','review','planned'],true)||isset($clean[$u['id']]))fail('Scegli una scheda disponibile e il suo stato.');$clean[$u['id']]=['id'=>$u['id'],'status'=>$u['status']];}return array_values($clean);
}
function cpValidateRows(mixed $words):array{
    if(!is_array($words)||!array_is_list($words)||count($words)<1||count($words)>80)fail('Inserisci da 1 a 80 parole o frasi confermate.');$clean=[];
    foreach($words as $w){if(!is_array($w)||!is_string($w[0]??null)||!is_string($w[1]??null))fail('Usa righe inglese e italiano.');$en=cpText($w[0],100,false);$it=cpText($w[1],200,false);if(preg_match('/[<>\r\n]/',$en.$it))fail('Inserisci soltanto parole e frasi leggibili.');$icon=isset($w[2])?cpText($w[2],32):'📘';if(preg_match('/[<>\x00-\x1F\x7F]/',$icon))fail('Usa un simbolo o un testo breve senza markup.');$key=cpNormalize($en);if(isset($clean[$key]))fail('Una parola è ripetuta nella scheda.');$clean[$key]=[$en,$it,$icon];}return array_values($clean);
}

if(!str_starts_with($action,'class-program-'))return;
$cpMethods=['class-program-state'=>'GET','class-program-context'=>'POST','class-program-manage'=>'GET','class-program-save'=>'POST','class-program-publish'=>'POST','class-program-material-save'=>'POST','class-program-teacher-invite'=>'POST','class-program-teacher-accept'=>'POST','class-program-teacher-revoke'=>'POST','class-program-consent'=>'POST','class-program-progress'=>'GET','class-program-history'=>'GET'];
if(!isset($cpMethods[$action]))fail('Operazione non trovata.',404);if($method!==$cpMethods[$action])fail('Metodo non consentito.',405);
$cpActor=userId();
if($action==='class-program-state'){$pid=cpId($_GET['profile']??0);cpOwnedProfile($db,$pid);$manifest=cpResolveContext($db,$pid);cpOwnedProfile($db,$pid);respond($manifest);}
if($action==='class-program-context'){
    $pid=cpId($body['profile']??0);$club=cpId($body['club']??0);$db->exec('BEGIN IMMEDIATE');cpOwnedProfile($db,$pid);
    if(!cpOne($db,'SELECT 1 FROM club_profiles WHERE profile_id=? AND club_id=?',[$pid,$club])){$db->exec('ROLLBACK');fail('Scegli una classe a cui appartiene il profilo.',403);}
    cpRun($db,'INSERT INTO class_program_contexts(profile_id,club_id) VALUES(?,?) ON CONFLICT(profile_id) DO UPDATE SET club_id=excluded.club_id',[$pid,$club]);$context=cpResolveContext($db,$pid);$db->exec('COMMIT');respond($context);
}
cpRequireActor($db,true);
if($action==='class-program-manage'){
    if(!isset($_GET['club']))respond(['classes'=>cpManagedClasses($db,$cpActor),'program'=>null,'units'=>[],'catalog'=>[],'teachers'=>[],'history'=>[],'consentTargets'=>cpConsentTargets($db,$cpActor)]);
    respond(cpManage($db,cpId($_GET['club'])));
}
if($action==='class-program-history'){$club=cpId($_GET['club']??0);cpRequireManager($db,$club);respond(['history'=>cpHistory($db,$club)]);}
if($action==='class-program-progress'){$club=cpId($_GET['club']??0);respond(cpProgress($db,$club,isset($_GET['program'])?cpId($_GET['program']):null));}
if(!($action==='class-program-teacher-accept'&&($body['confirmed']??null)===false))limitAttempts($db,'class-program:'.$cpActor,240);
if($action==='class-program-save'){
    $club=cpId($body['club']??0);$year=cpText($body['schoolYear']??null,40,false);$title=cpText($body['title']??null,160,false);$teacher=cpText($body['teacherLabel']??'',120);$methodText=cpText($body['method']??'',1000);$exam=cpText($body['examGoal']??'',300);$version=$body['expectedRevision']??null;if(!is_int($version)||$version<0)fail('Aggiorna la revisione prima di salvare.',409);
    $db->exec('BEGIN IMMEDIATE');cpRequireManager($db,$club);$units=cpValidateUnits($db,$club,$body['units']??null);$p=cpOne($db,'SELECT * FROM class_programs WHERE club_id=? AND school_year=?',[$club,$year]);
    if($p){if((int)$p['edit_version']!==$version){$db->exec('ROLLBACK');fail('Un altro docente ha aggiornato il programma. Ricarica prima di salvare.',409);}cpRun($db,'UPDATE class_programs SET title=?,teacher_label=?,method=?,exam_goal=?,units=?,edit_version=edit_version+1,updated_at=? WHERE id=?',[$title,$teacher,$methodText,$exam,cpJson($units),time(),$p['id']]);$program=(int)$p['id'];}
    else{if($version!==0){$db->exec('ROLLBACK');fail('Aggiorna il nuovo anno prima di salvare.',409);}cpRun($db,'INSERT INTO class_programs(club_id,school_year,title,teacher_label,method,exam_goal,units,created_by,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?)',[$club,$year,$title,$teacher,$methodText,$exam,cpJson($units),$cpActor,time(),time()]);$program=(int)$db->lastInsertId();}
    $result=cpProgramView(cpOne($db,'SELECT * FROM class_programs WHERE id=?',[$program]));$db->exec('COMMIT');respond(['ok'=>true,'program'=>$result]);
}
if($action==='class-program-publish'){
    if(($body['confirmed']??false)!==true)fail('Controlla le schede e conferma la pubblicazione.');$program=cpId($body['program']??0);$version=$body['expectedRevision']??null;if(!is_int($version))fail('Aggiorna la revisione del programma.',409);
    $db->exec('BEGIN IMMEDIATE');$p=cpOne($db,'SELECT * FROM class_programs WHERE id=?',[$program]);if(!$p){$db->exec('ROLLBACK');fail('Programma non disponibile.',404);}cpRequireManager($db,(int)$p['club_id']);if((int)$p['edit_version']!==$version){$db->exec('ROLLBACK');fail('Il programma è cambiato. Rivedilo prima di pubblicare.',409);}
    $old=cpOne($db,'SELECT id FROM class_program_revisions WHERE program_id=? AND revision=?',[$program,$version]);
    if($old){$revision=(int)$old['id'];$head=cpOne($db,'SELECT revision_id FROM class_program_heads WHERE club_id=?',[$p['club_id']]);if($head&&(int)$head['revision_id']>$revision){$db->exec('ROLLBACK');fail('La classe usa già un programma pubblicato più recente. Rivedi e salva una nuova revisione prima di pubblicare.',409);}$replayed=true;}
    else{$payload=cpComposeRevision($db,$p);cpRun($db,'INSERT INTO class_program_revisions(program_id,revision,payload,published_by,published_at) VALUES(?,?,?,?,?)',[$program,$version,cpJson($payload),$cpActor,time()]);$revision=(int)$db->lastInsertId();$replayed=false;}
    cpRun($db,'UPDATE class_programs SET published_revision=? WHERE id=?',[$revision,$program]);cpRun($db,'INSERT INTO class_program_heads(club_id,program_id,revision_id) VALUES(?,?,?) ON CONFLICT(club_id) DO UPDATE SET program_id=excluded.program_id,revision_id=excluded.revision_id',[$p['club_id'],$program,$revision]);$result=cpProgramView(cpOne($db,'SELECT * FROM class_programs WHERE id=?',[$program]));$db->exec('COMMIT');respond(['ok'=>true,'replayed'=>$replayed,'program'=>$result]);
}
if($action==='class-program-material-save'){
    if(($body['confirmed']??false)!==true)fail('Controlla e conferma il testo della scheda.');if(isset($body['attachment']))fail('Gli allegati non vengono caricati da questa operazione.');$club=cpId($body['club']??0);$title=cpText($body['title']??null,160,false);$words=cpValidateRows($body['words']??null);
    $db->exec('BEGIN IMMEDIATE');cpRequireManager($db,$club);if((int)cpOne($db,'SELECT COUNT(*) AS n FROM class_program_materials WHERE club_id=?',[$club])['n']>=100){$db->exec('ROLLBACK');fail('Hai raggiunto il limite delle schede della classe.',409);}cpRun($db,'INSERT INTO class_program_materials(club_id,title,words,created_by,created_at) VALUES(?,?,?,?,?)',[$club,$title,cpJson($words),$cpActor,time()]);$material=(int)$db->lastInsertId();$unit=array_values(array_filter(cpCatalog($db,$club),fn($u)=>$u['id']==='material-'.$material))[0];$db->exec('COMMIT');respond(['ok'=>true,'unit'=>$unit]);
}
if($action==='class-program-teacher-invite'){
    if(($body['confirmed']??false)!==true)fail('Conferma l’incarico e i suoi permessi.');$club=cpId($body['club']??0);$username=cpText($body['username']??null,80,false);$scopes=$body['scopes']??null;if(!is_array($scopes)||!array_is_list($scopes)||!count($scopes)||count($scopes)>2||array_diff($scopes,['program-edit','progress-read'])||count(array_unique($scopes))!==count($scopes))fail('Scegli i permessi dell’incarico.');
    $db->exec('BEGIN IMMEDIATE');$class=cpRequireManager($db,$club);$actor=cpCurrentAdult($db,$cpActor);if((int)$class['owner_id']!==$cpActor&&$actor['role']!=='admin'){$db->exec('ROLLBACK');fail('Solo il gestore della classe assegna incarichi.',403);}
    $target=cpOne($db,'SELECT id FROM accounts WHERE LOWER(username)=LOWER(?) AND role IN ("adult","admin")',[$username]);if(!$target){$db->exec('ROLLBACK');fail('Il destinatario deve accedere con un account adulto disponibile.',404);}
    if(cpOne($db,'SELECT id FROM class_program_staff WHERE club_id=? AND account_id=? AND revoked_at IS NULL AND (accepted_at IS NOT NULL OR expires>?)',[$club,$target['id'],time()])){$db->exec('ROLLBACK');fail('Esiste già un incarico o invito attivo. Revocalo prima di cambiarlo.',409);}
    $token=bin2hex(random_bytes(24));$expires=time()+86400;cpRun($db,'INSERT INTO class_program_staff(club_id,account_id,authorizer_id,scopes,token_hash,created_at,expires) VALUES(?,?,?,?,?,?,?)',[$club,$target['id'],$class['owner_id'],cpJson($scopes),hash('sha256',$token),time(),$expires]);$staff=(int)$db->lastInsertId();$db->exec('COMMIT');respond(['ok'=>true,'staff'=>$staff,'token'=>$token,'expires'=>$expires]);
}
if($action==='class-program-teacher-accept'){
    if(!is_bool($body['confirmed']??null))fail('Controlla l’incarico prima di confermare.');$token=$body['token']??null;if(!is_string($token)||!preg_match('/^[a-f0-9]{48}$/D',$token))fail('Invito non disponibile.',404);
    if($body['confirmed']===false){cpRequireActor($db,true);$preview=cpOne($db,'SELECT c.name,s.scopes,s.expires FROM class_program_staff s JOIN clubs c ON c.id=s.club_id AND c.owner_id=s.authorizer_id JOIN accounts issuer ON issuer.id=s.authorizer_id AND issuer.role IN ("adult","admin") WHERE s.token_hash=? AND s.account_id=? AND s.revoked_at IS NULL AND s.accepted_at IS NULL AND s.expires>?',[hash('sha256',$token),$cpActor,time()]);if(!$preview)fail('Invito non disponibile o scaduto per questo account.',404);respond(['invitation'=>['className'=>$preview['name'],'scopes'=>cpDecode($preview['scopes']),'expires'=>(int)$preview['expires']]]);}
    $db->exec('BEGIN IMMEDIATE');cpRequireActor($db,true);$s=cpOne($db,'SELECT s.* FROM class_program_staff s JOIN clubs c ON c.id=s.club_id AND c.owner_id=s.authorizer_id JOIN accounts issuer ON issuer.id=s.authorizer_id AND issuer.role IN ("adult","admin") WHERE s.token_hash=? AND s.account_id=? AND s.revoked_at IS NULL AND s.accepted_at IS NULL AND s.expires>?',[hash('sha256',$token),$cpActor,time()]);if(!$s){$db->exec('ROLLBACK');fail('Invito non disponibile o scaduto per questo account.',404);}cpRun($db,'UPDATE class_program_staff SET accepted_at=?,token_hash=NULL WHERE id=?',[time(),$s['id']]);$db->exec('COMMIT');respond(['ok'=>true]);
}
if($action==='class-program-teacher-revoke'){
    if(($body['confirmed']??false)!==true)fail('Conferma la revoca dell’incarico.');$club=cpId($body['club']??0);$staff=cpId($body['staff']??0);
    $db->exec('BEGIN IMMEDIATE');$class=cpRequireManager($db,$club);$actor=cpCurrentAdult($db,$cpActor);if((int)$class['owner_id']!==$cpActor&&$actor['role']!=='admin'){$db->exec('ROLLBACK');fail('Solo il gestore della classe revoca gli incarichi.',403);}if(!cpOne($db,'SELECT id FROM class_program_staff WHERE id=? AND club_id=?',[$staff,$club])){$db->exec('ROLLBACK');fail('Incarico non disponibile.',404);}cpRun($db,'UPDATE class_program_staff SET revoked_at=COALESCE(revoked_at,?),token_hash=NULL WHERE id=?',[time(),$staff]);$db->exec('COMMIT');respond(['ok'=>true]);
}
if($action==='class-program-consent'){
    if(($body['confirmed']??false)!==true||!is_bool($body['allowed']??null))fail('Conferma la scelta sui progressi della classe.');$club=cpId($body['club']??0);$pid=cpId($body['profile']??0);$db->exec('BEGIN IMMEDIATE');cpRequireActor($db,true);$p=cpOne($db,'SELECT p.account_id FROM profiles p JOIN club_profiles m ON m.profile_id=p.id WHERE p.id=? AND m.club_id=?',[$pid,$club]);if(!$p){$db->exec('ROLLBACK');fail('Profilo non disponibile nella classe.',404);}$guardian=null;
    if((int)$p['account_id']!==$cpActor){$guardian=cpGuardianConsentLink($db,$cpActor,$club,$pid);if($guardian===null){$db->exec('ROLLBACK');fail('Solo il titolare o un genitore già autorizzato sceglie la condivisione.',403);}}
    $guardianVersion=$guardian===null?null:(int)cpOne($db,'SELECT version FROM guardian_links WHERE id=?',[$guardian])['version'];cpRun($db,'INSERT INTO class_program_consents(club_id,profile_id,learner_account_id,authorizer_id,guardian_link,guardian_version,allowed,updated_at) VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(club_id,profile_id) DO UPDATE SET learner_account_id=excluded.learner_account_id,authorizer_id=excluded.authorizer_id,guardian_link=excluded.guardian_link,guardian_version=excluded.guardian_version,allowed=excluded.allowed,updated_at=excluded.updated_at',[$club,$pid,$p['account_id'],$cpActor,$guardian,$guardianVersion,(int)$body['allowed'],time()]);$db->exec('COMMIT');respond(['ok'=>true,'consent'=>['club'=>$club,'profile'=>$pid,'allowed'=>$body['allowed']]]);
}
fail('Operazione non trovata.',404);
