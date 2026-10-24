<?php
/** CLI-only Site Tools cache invalidation. Streamed over authenticated SSH; never public. */
declare(strict_types=1);
if(PHP_SAPI!=='cli'){http_response_code(404);exit;}
// Protocol used by SiteGround Optimizer's Site_Tools_Client and Supercacher.
$sockets=['/chroot/tmp/site-tools.sock','/tmp/site-tools.sock'];
if(getenv('WORDYLAND_TEST')==='1' && getenv('WORDYLAND_CACHE_TEST_SOCKET'))$sockets=[getenv('WORDYLAND_CACHE_TEST_SOCKET')];
$request=json_encode(['api'=>'domain-all','cmd'=>'update','params'=>['flush_cache'=>'1','id'=>'wordyland.eu','path'=>'/(.*)'],'settings'=>['json'=>1]],JSON_FORCE_OBJECT|JSON_THROW_ON_ERROR)."\n";
foreach($sockets as $socket){
    if(!file_exists($socket))continue;
    $connection=@stream_socket_client('unix://'.$socket,$errorCode,$errorMessage,5);
    if(!$connection)continue;
    stream_set_timeout($connection,5);
    $written=0;
    while($written<strlen($request)){
        $bytes=@fwrite($connection,substr($request,$written));
        if($bytes===false || $bytes===0)break;
        $written+=$bytes;
    }
    $response=$written===strlen($request)?@fgets($connection,32768):false;
    $metadata=stream_get_meta_data($connection);fclose($connection);
    $result=is_string($response)?json_decode($response,true):null;
    if(!$metadata['timed_out'] && is_array($result) && !array_key_exists('err_code',$result)){
        echo "Cache purge Site Tools: success (dynamic cache remains enabled)\nCACHE_PURGED=wordyland.eu\n";exit(0);
    }
    // Do not print service responses, which may contain hosting account details.
}
fwrite(STDERR,"Cache purge Site Tools: unavailable or rejected; trying legacy cache protocol.\n");exit(1);
