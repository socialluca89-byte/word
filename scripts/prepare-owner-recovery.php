<?php
/** Private CLI recovery preparation. Never install publicly or invoke from ordinary deployment. */
declare(strict_types=1);
if (PHP_SAPI!=='cli') {http_response_code(404);exit;}
$owner='luca@perrone.it';
if (($argv[1]??'')!=='--prepare-owner-recovery' || getenv('WORDYLAND_OWNER_RECOVERY_CONFIRM')!==$owner) {
    fwrite(STDERR,"Explicit owner-recovery confirmation required. No changes made.\n");exit(1);
}
$db=null;$began=false;$created=false;$file=null;$path=null;$commitAttempted=false;
try {
    $directory=getenv('WORDYLAND_BOOTSTRAP_DATA');
    if (!$directory || !is_dir($directory) || is_link($directory) || basename($directory)!=='.wordyland-data' || basename(dirname($directory))!=='wordyland.eu' || preg_match('~(?:^|/)public_html(?:/|$)~',realpath($directory)?:$directory)) throw new RuntimeException('unsafe-data-directory');
    if (!is_file($directory.'/wordyland.sqlite') || is_link($directory.'/wordyland.sqlite')) throw new RuntimeException('database-unavailable');
    umask(0077);
    $db=new PDO('sqlite:'.$directory.'/wordyland.sqlite',null,null,[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC]);
    $db->exec('PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000; BEGIN IMMEDIATE');$began=true;
    $query=$db->prepare('SELECT id,role FROM accounts WHERE username=?');$query->execute([$owner]);$account=$query->fetch();
    if (!$account || $account['role']!=='admin') throw new RuntimeException('existing-administrator-required');
    $path=$directory.'/admin-activation.txt';
    if (file_exists($path) || is_link($path)) throw new RuntimeException('activation-already-exists');
    $code=bin2hex(random_bytes(32));
    $file=fopen($path,'x');if (!$file) throw new RuntimeException('private-file-unavailable');$created=true;
    $contents="WordyLand — recupero privato amministratore\nEmail: $owner\nUsa personalmente questo link una sola volta per scegliere la password:\nhttps://wordyland.eu/#admin-attiva=$code\nNon copiare il link in chat, log o messaggi alla classe.\n";
    if (fwrite($file,$contents)!==strlen($contents) || !fflush($file)) throw new RuntimeException('private-file-unavailable');
    if (function_exists('fsync') && !fsync($file)) throw new RuntimeException('private-file-unavailable');
    fclose($file);$file=null;
    if (!chmod($path,0600)) throw new RuntimeException('private-file-unavailable');
    $query=$db->prepare('UPDATE accounts SET recovery_hash=?,session_version=session_version+1 WHERE id=? AND role="admin"');
    $query->execute([hash('sha256',$code),$account['id']]);
    if ($query->rowCount()!==1) throw new RuntimeException('existing-administrator-required');
    $commitAttempted=true;$db->exec('COMMIT');$began=false;
    echo "Private activation instructions prepared on the hosting server. Password, role, profiles and rewards were preserved. Existing sessions were revoked. No secret is printed.\n";
} catch(Throwable $error) {
    if (is_resource($file)) fclose($file);
    $rolledBack=false;
    if ($began && $db) {try{$db->exec('ROLLBACK');$rolledBack=true;}catch(Throwable){}}
    if ($created && (!$commitAttempted || $rolledBack) && $path && is_file($path) && !is_link($path)) unlink($path);
    if ($commitAttempted && !$rolledBack) {
        fwrite(STDERR,"Owner recovery outcome uncertain. Preserve private instructions and inspect status before retrying. No secret is printed.\n");exit(1);
    }
    $known=['unsafe-data-directory','database-unavailable','existing-administrator-required','activation-already-exists','private-file-unavailable'];
    $reason=in_array($error->getMessage(),$known,true)?$error->getMessage():'operation-failed';
    fwrite(STDERR,"Owner recovery not prepared ($reason). No credential change committed.\n");exit(1);
}
