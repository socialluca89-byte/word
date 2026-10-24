<?php
/** Read-only diagnostic. Stream over the existing trusted SSH connection; never publish. */
declare(strict_types=1);
if (PHP_SAPI!=='cli') {http_response_code(404);exit;}
$directory=getenv('WORDYLAND_BOOTSTRAP_DATA');
if (!$directory || !is_dir($directory) || is_link($directory) || !is_file($directory.'/wordyland.sqlite') || is_link($directory.'/wordyland.sqlite')) throw new RuntimeException('Private application database unavailable');
$db=new PDO('sqlite:'.$directory.'/wordyland.sqlite',null,null,[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC]);
$db->exec('PRAGMA query_only=ON');
$query=$db->prepare('SELECT role FROM accounts WHERE username=?');
$query->execute(['luca@perrone.it']);$account=$query->fetch();
$activation=$directory.'/admin-activation.txt';
echo json_encode(['ownerExists'=>(bool)$account,'ownerIsAdmin'=>$account && $account['role']==='admin','privateActivationAvailable'=>is_file($activation) && !is_link($activation) && is_readable($activation)],JSON_THROW_ON_ERROR)."\n";
