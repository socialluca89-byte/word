<?php
/** Trusted CLI-only owner provisioning. Never install this file in public_html. */
declare(strict_types=1);
if(PHP_SAPI!=='cli'){http_response_code(404);exit;}
$directory=getenv('WORDYLAND_BOOTSTRAP_DATA');
if(!$directory||!is_dir($directory)||is_link($directory)||!is_file($directory.'/wordyland.sqlite')||is_link($directory.'/wordyland.sqlite'))throw new RuntimeException('Private application database unavailable');
umask(0077);
$db=new PDO('sqlite:'.$directory.'/wordyland.sqlite',null,null,[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC]);
$db->exec('PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000; BEGIN IMMEDIATE');
$created=null;
try {
$email='luca@perrone.it';
$q=$db->prepare('SELECT id,role FROM accounts WHERE username=?');$q->execute([$email]);$existing=$q->fetch();
if($existing){
 if($existing['role']==='learner')throw new RuntimeException('Refusing to promote a learner account');
 if($existing['role']!=='admin'){$q=$db->prepare('UPDATE accounts SET role="admin",session_version=session_version+1 WHERE id=?');$q->execute([$existing['id']]);}
}else{
 $code=bin2hex(random_bytes(32));
 $q=$db->prepare('INSERT INTO accounts(username,password_hash,created_at,recovery_hash,role) VALUES (?,?,?,?,"admin")');
 $q->execute([$email,password_hash(bin2hex(random_bytes(32)),PASSWORD_DEFAULT),time(),hash('sha256',$code)]);
 $path=$directory.'/admin-activation.txt';
 if(file_exists($path)||is_link($path))throw new RuntimeException('Activation file already exists; refusing to overwrite it');
 $file=fopen($path,'x');if(!$file)throw new RuntimeException('Cannot save private activation instructions');
 $created=$path;fwrite($file,"WordyLand — attivazione amministratore\nEmail: $email\nLink privato (usalo una sola volta e scegli una password):\nhttps://wordyland.eu/#admin-attiva=$code\nNon condividere il link con la classe.\n");fclose($file);chmod($path,0600);
}
$db->exec('COMMIT');
} catch(Throwable $error) { if($db->inTransaction())$db->rollBack();else{try{$db->exec('ROLLBACK');}catch(Throwable){}}if($created&&is_file($created)&&!is_link($created))unlink($created);throw $error; }
echo "Administrator account ready; activation instructions, when needed, remain private on the hosting server.\n";
