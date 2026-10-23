<?php
declare(strict_types=1);
// No child emails or birth dates. Database stays outside public_html.
ini_set('display_errors', '0');
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
function respond(array $data, int $status = 200): never {
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
    exit;
}
function fail(string $message, int $status = 400): never { respond(['error' => $message], $status); }
set_exception_handler(function (Throwable $e): never {
    error_log('WordyLand API: ' . get_class($e));
    fail('Servizio momentaneamente non disponibile. I progressi locali restano sul dispositivo.', 503);
});
if (!extension_loaded('pdo_sqlite')) fail('Database non ancora disponibile sul server.', 503);
$testMode = getenv('WORDYLAND_TEST') === '1';
$dataDir = $testMode ? (string)getenv('WORDYLAND_DATA_DIR') : dirname(__DIR__) . '/.wordyland-data';
if (!$dataDir || is_link($dataDir)) throw new RuntimeException('Unsafe data directory');
if (!is_dir($dataDir) && !mkdir($dataDir, 0700, true)) throw new RuntimeException('Data directory unavailable');
chmod($dataDir, 0700);
umask(0077);
$db = new PDO('sqlite:' . $dataDir . '/wordyland.sqlite', null, null, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]);
$db->exec('PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;');
$db->exec('CREATE TABLE IF NOT EXISTS accounts (id INTEGER PRIMARY KEY, username TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, created_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS profiles (id INTEGER PRIMARY KEY, account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE, nickname TEXT NOT NULL, state TEXT NOT NULL, revision INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS rate_limits (bucket TEXT PRIMARY KEY, attempts INTEGER NOT NULL, expires INTEGER NOT NULL);');
$columns = array_column($db->query('PRAGMA table_info(accounts)')->fetchAll(), 'name');
if (!in_array('recovery_hash', $columns, true)) $db->exec('ALTER TABLE accounts ADD COLUMN recovery_hash TEXT');
if (!in_array('session_version', $columns, true)) $db->exec('ALTER TABLE accounts ADD COLUMN session_version INTEGER NOT NULL DEFAULT 0');
if (!in_array('role', $columns, true)) $db->exec('ALTER TABLE accounts ADD COLUMN role TEXT NOT NULL DEFAULT "adult"');
session_name('wordyland_session');
session_start(['use_strict_mode' => 1, 'cookie_httponly' => true, 'cookie_secure' => !$testMode, 'cookie_samesite' => 'Strict', 'cookie_lifetime' => 0]);
if (isset($_SESSION['last_seen']) && time() - $_SESSION['last_seen'] > 86400) $_SESSION = [];
$_SESSION['last_seen'] = time();
$_SESSION['csrf'] ??= bin2hex(random_bytes(32));
$accountRole = null;
if (isset($_SESSION['account_id'])) {
    $q = $db->prepare('SELECT session_version,role FROM accounts WHERE id=?'); $q->execute([$_SESSION['account_id']]);
    $currentAccount = $q->fetch();
    if (!$currentAccount || (int)$currentAccount['session_version'] !== (int)($_SESSION['version'] ?? 0)) $_SESSION = ['csrf' => bin2hex(random_bytes(32))];
    else $accountRole = $currentAccount['role'];
}
$action = $_GET['action'] ?? 'session';
$method = $_SERVER['REQUEST_METHOD'];
$body = [];
if ($method === 'POST') {
    $bodyLimit = $action === 'study-save' ? 6000000 : 250000;
    if ((int)($_SERVER['CONTENT_LENGTH'] ?? 0) > $bodyLimit) fail('Dati troppo grandi.', 413);
    if (strtolower(explode(';', $_SERVER['CONTENT_TYPE'] ?? '')[0]) !== 'application/json') fail('Formato non supportato.', 415);
    $raw = file_get_contents('php://input', false, null, 0, $bodyLimit + 1);
    if (strlen($raw) > $bodyLimit) fail('Dati troppo grandi.', 413);
    try { $body = json_decode($raw, true, 32, JSON_THROW_ON_ERROR); } catch (JsonException) { fail('Dati non validi.'); }
    if (!is_array($body)) fail('Dati non validi.');
    $token = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
    if (!is_string($token) || !hash_equals($_SESSION['csrf'], $token)) fail('Ricarica la pagina e riprova.', 403);
} elseif ($method !== 'GET') { fail('Metodo non consentito.', 405); }
function limitAttempts(PDO $db, string $bucket, int $maximum): void {
    $now = time();
    $db->prepare('DELETE FROM rate_limits WHERE expires < ?')->execute([$now]);
    $q = $db->prepare('INSERT INTO rate_limits(bucket, attempts, expires) VALUES (?, 1, ?) ON CONFLICT(bucket) DO UPDATE SET attempts=attempts+1');
    $q->execute([$bucket, $now + 3600]);
    $q = $db->prepare('SELECT attempts FROM rate_limits WHERE bucket=?'); $q->execute([$bucket]);
    if ((int)$q->fetchColumn() > $maximum) fail('Troppi tentativi. Riprova tra un’ora.', 429);
}
function userId(): int {
    if (!isset($_SESSION['account_id'])) fail('Accedi con il tuo profilo.', 401);
    return (int)$_SESSION['account_id'];
}
function profiles(PDO $db, int $id): array {
    $q = $db->prepare('SELECT id,nickname,revision FROM profiles WHERE account_id=? ORDER BY id'); $q->execute([$id]);
    return $q->fetchAll();
}
function validState(mixed $state): array {
    if (!is_array($state) || array_is_list($state)) fail('Progressi non validi.');
    $stats = $state['stats'] ?? [];
    $custom = $state['custom'] ?? [];
    if (!is_array($stats) || count($stats) > 1000 || !is_array($custom) || count($custom) > 100) fail('Progressi troppo grandi.');
    $clean = [];
    foreach ($stats as $word => $value) {
        if (!is_string($word) || strlen($word) > 100 || !is_array($value)) fail('Parola non valida.');
        $clean[$word] = ['good' => max(0, min(1000000, (int)($value['good'] ?? 0))), 'attempts' => max(0, min(1000000, (int)($value['attempts'] ?? 0))), 'review' => !empty($value['review'])];
    }
    $words = [];
    foreach ($custom as $row) {
        if (!is_array($row) || count($row) !== 3 || !is_string($row[0] ?? null) || !preg_match('/^[a-z][a-z ’\x27?,.!-]{0,79}$/iu', $row[0]) || !is_string($row[1] ?? null) || strlen($row[1]) > 200) fail('Parole personalizzate non valide.');
        $words[] = [$row[0], $row[1], '✨'];
    }
    $world = $state['world'] ?? 'space';
    if (!in_array($world, ['space','animals','dino','sport','ocean','creative'], true)) fail('Mondo non valido.');
    $avatar = $state['avatar'] ?? '🦊';
    if (!in_array($avatar, ['🦊','🐼','🤖','🐉','🐱','🐙','🦁','🐧'], true)) fail('Personaggio non valido.');
    return ['stats' => (object)$clean, 'custom' => $words, 'stars' => max(0, min(10000000, (int)($state['stars'] ?? 0))), 'world' => $world, 'avatar' => $avatar];
}
define('WORDYLAND_API', true);
require __DIR__ . '/classroom.php';
if ($method === 'GET' && $action === 'health') respond(['ready' => true, 'database' => 'sqlite']);
if ($method === 'GET' && $action === 'session') {
    $id = $_SESSION['account_id'] ?? null;
    respond(['csrf' => $_SESSION['csrf'], 'username' => $_SESSION['username'] ?? null, 'role'=>$accountRole, 'profiles' => $id ? profiles($db, (int)$id) : []]);
}
if ($method === 'POST' && $action === 'recover') {
    limitAttempts($db, 'recover-ip:' . hash('sha256', $_SERVER['REMOTE_ADDR'] ?? ''), 10);
    $username = strtolower(trim((string)($body['username'] ?? '')));
    $code = preg_replace('/[^a-f0-9]/', '', strtolower((string)($body['code'] ?? '')));
    $password = $body['password'] ?? '';
    if (!is_string($password) || strlen($password) < 12 || strlen($password) > 72) fail('La nuova password deve avere 12–72 caratteri.');
    $q = $db->prepare('SELECT id,recovery_hash FROM accounts WHERE username=?'); $q->execute([$username]); $account = $q->fetch();
    if (!$account || !$account['recovery_hash'] || !hash_equals($account['recovery_hash'], hash('sha256', $code))) fail('Nome utente o codice di recupero non corretto.', 401);
    $newCode = bin2hex(random_bytes(16));
    $q = $db->prepare('UPDATE accounts SET password_hash=?,recovery_hash=?,session_version=session_version+1 WHERE id=? AND recovery_hash=?');
    $q->execute([password_hash($password, PASSWORD_DEFAULT), hash('sha256', $newCode), $account['id'], $account['recovery_hash']]);
    if (!$q->rowCount()) fail('Il codice è già stato usato.', 409);
    $_SESSION = ['csrf' => bin2hex(random_bytes(32))];
    respond(['csrf' => $_SESSION['csrf'], 'recovery' => $newCode]);
}
if ($method === 'POST' && in_array($action, ['register','login'], true)) {
    $username = strtolower(trim(is_string($body['username'] ?? null) ? $body['username'] : ''));
    $password = $body['password'] ?? null;
    if (!preg_match('/^[a-z0-9_.-]{3,40}$/', $username) || !is_string($password) || strlen($password) < 12 || strlen($password) > 72) fail('Usa un nome utente di 3–40 caratteri e una password di 12–72 caratteri.');
    limitAttempts($db, 'ip:' . hash('sha256', $_SERVER['REMOTE_ADDR'] ?? ''), 40);
    limitAttempts($db, 'login:' . hash('sha256', $username), 15);
    if ($action === 'register') {
        if (($body['adult'] ?? false) !== true) fail('L’account deve essere creato da un adulto.');
        limitAttempts($db, 'register:' . hash('sha256', $_SERVER['REMOTE_ADDR'] ?? ''), 5);
        try {
            $recovery = bin2hex(random_bytes(16));
            $q = $db->prepare('INSERT INTO accounts(username,password_hash,created_at,recovery_hash) VALUES (?,?,?,?)');
            $q->execute([$username, password_hash($password, PASSWORD_DEFAULT), time(), hash('sha256', $recovery)]);
            $id = (int)$db->lastInsertId();
        } catch (PDOException $e) { if ($e->getCode() === '23000') fail('Nome utente non disponibile.', 409); throw $e; }
    } else {
        $q = $db->prepare('SELECT * FROM accounts WHERE username=?'); $q->execute([$username]); $account = $q->fetch();
        $dummy = '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi';
        if (!password_verify($password, $account['password_hash'] ?? $dummy) || !$account) fail('Credenziali non corrette.', 401);
        $id = (int)$account['id'];
    }
    session_regenerate_id(true);
    $_SESSION = ['account_id' => $id, 'username' => $username, 'last_seen' => time(), 'version' => $action === 'login' ? (int)$account['session_version'] : 0, 'csrf' => bin2hex(random_bytes(32))];
    $result = ['csrf' => $_SESSION['csrf'], 'username' => $username, 'role'=>$action==='login'?$account['role']:'adult', 'profiles' => profiles($db, $id)];
    if (isset($recovery)) $result['recovery'] = $recovery;
    respond($result);
}
$id = userId();
if ($accountRole==='learner' && in_array($action,['create-profile','rename-profile','delete-profile','club-create','club-join','club-leave','study-save','study-remove'],true)) fail('Questa operazione è riservata all’adulto che gestisce i profili.',403);
define('WORDYLAND_BOOTSTRAPPED', true);
require __DIR__ . '/platform.php';
if ($method === 'POST' && $action === 'logout') { $_SESSION = []; session_destroy(); respond(['ok' => true]); }
if ($method === 'POST' && $action === 'create-profile') {
    $nickname = is_string($body['nickname'] ?? null) ? trim($body['nickname']) : '';
    if ($nickname === '' || strlen($nickname) > 80) fail('Scegli un soprannome breve.');
    $db->exec('BEGIN IMMEDIATE');
    if (count(profiles($db, $id)) >= 8) { $db->exec('ROLLBACK'); fail('Puoi creare fino a otto profili.'); }
    $state = validState(['world' => 'space', 'avatar' => '🦊']);
    $q = $db->prepare('INSERT INTO profiles(account_id,nickname,state) VALUES (?,?,?)'); $q->execute([$id, $nickname, json_encode($state, JSON_THROW_ON_ERROR)]);
    $profileId = (int)$db->lastInsertId(); $db->exec('COMMIT');
    respond(['id' => $profileId, 'nickname' => $nickname, 'revision' => 0, 'state' => $state]);
}
$profileId = (int)($method === 'GET' ? ($_GET['id'] ?? 0) : ($body['id'] ?? 0));
if (in_array($action, ['profile','save'], true)) {
    $q = $db->prepare('SELECT id,nickname,state,revision FROM profiles WHERE id=? AND account_id=?'); $q->execute([$profileId, $id]); $profile = $q->fetch();
    if (!$profile) fail('Profilo non trovato.', 404);
    if ($method === 'GET' && $action === 'profile') {
        $profile['state'] = json_decode($profile['state'], true, 32, JSON_THROW_ON_ERROR); respond($profile);
    }
    if ($method === 'POST' && $action === 'save') {
        $state = validState($body['state'] ?? null);
        if (!is_int($body['revision'] ?? null)) fail('Versione dei progressi non valida.');
        $q = $db->prepare('UPDATE profiles SET state=?,revision=revision+1 WHERE id=? AND account_id=? AND revision=?');
        $q->execute([json_encode($state, JSON_THROW_ON_ERROR), $profileId, $id, $body['revision']]);
        if ($q->rowCount() !== 1) fail('Questo profilo è cambiato su un altro dispositivo. Ricarica il profilo prima di continuare.', 409);
        respond(['revision' => $body['revision'] + 1]);
    }
}
fail('Operazione non trovata.', 404);
