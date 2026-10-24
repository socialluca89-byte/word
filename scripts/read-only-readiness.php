<?php
/** Private CLI diagnostic. Never install in public_html or load application/bootstrap code. */
declare(strict_types=1);
ini_set('display_errors','0');ini_set('log_errors','0');
set_error_handler(static function(): never {throw new RuntimeException('diagnostic-unavailable');});
if(PHP_SAPI!=='cli'){http_response_code(404);exit;}
try {
    if(($argv[1]??'')!=='--read-only')throw new RuntimeException('explicit-read-only-required');
    $directory=getenv('WORDYLAND_BOOTSTRAP_DATA');
    if(!$directory || realpath($directory)!==$directory || is_link($directory) || basename($directory)!=='.wordyland-data' || basename(dirname($directory))!=='wordyland.eu' || preg_match('~(?:^|/)public_html(?:/|$)~',$directory))throw new RuntimeException('private-directory-required');
    $database=$directory.'/wordyland.sqlite';
    if(!is_file($database) || is_link($database) || !is_readable($database))throw new RuntimeException('database-unavailable');
    $db=new PDO('sqlite:'.$database,null,null,[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC,PDO::SQLITE_ATTR_OPEN_FLAGS=>PDO::SQLITE_OPEN_READONLY]);
    $db->exec('PRAGMA query_only=ON; PRAGMA busy_timeout=3000');
    $query=$db->prepare('SELECT role FROM accounts WHERE username=?');$query->execute(['luca@perrone.it']);$account=$query->fetch();
    $activation=$directory.'/admin-activation.txt';
    $mail=['configuration'=>'absent','transport'=>'unset','sender'=>'unset','phpMailAvailable'=>function_exists('mail'),'configurationReady'=>false];
    $path=$directory.'/mail-settings.json';
    if(is_link($path))$mail['configuration']='unsafe';
    elseif(file_exists($path)){
        $mail['configuration']='invalid';
        if(is_file($path) && is_readable($path) && filesize($path)<=16384){
            $raw=file_get_contents($path,false,null,0,16385);
            $settings=strlen($raw)<=16384?json_decode($raw,true):null;
            if(is_array($settings)){
                $mail['configuration']=($settings['enabled']??null)===false?'disabled':(($settings['enabled']??null)===true?'present':'invalid');
                $transport=$settings['transport']??null;
                $mail['transport']=$transport===null || $transport===''?'unset':($transport==='php-mail'?'php-mail':'unsupported');
                $from=$settings['from']??null;
                $mail['sender']=$from===null || $from===''?'unset':(is_string($from) && !preg_match('/[\r\n]/',$from) && filter_var($from,FILTER_VALIDATE_EMAIL)?'valid_format':'invalid');
                $mail['configurationReady']=$mail['configuration']==='present' && $mail['transport']==='php-mail' && $mail['sender']==='valid_format' && $mail['phpMailAvailable'];
            }
        }
    }
    echo json_encode(['ownerExists'=>(bool)$account,'ownerIsAdmin'=>$account && $account['role']==='admin','privateActivationAvailable'=>is_file($activation) && !is_link($activation) && is_readable($activation),'mail'=>$mail],JSON_THROW_ON_ERROR)."\n";
} catch(Throwable $error) {
    fwrite(STDERR,"Read-only diagnostic unavailable. No state change requested.\n");exit(1);
}
