<?php
declare(strict_types=1);

require __DIR__ . '/bootstrap.php';
require_method('POST');

$data = json_input();
$email = strtolower(trim((string) ($data['email'] ?? '')));
$password = (string) ($data['password'] ?? '');
$remember = !empty($data['remember']);

if (!filter_var($email, FILTER_VALIDATE_EMAIL) || $password === '') {
    json_response(['error' => 'Credenciales incorrectas.'], 401);
}

$stmt = db()->prepare('SELECT id, email, password_hash, nombre FROM administradores WHERE email = ? LIMIT 1');
$stmt->execute([$email]);
$admin = $stmt->fetch();

if (!$admin || !password_verify($password, $admin['password_hash'])) {
    json_response(['error' => 'Credenciales incorrectas.'], 401);
}

session_regenerate_id(true);
$_SESSION['admin_id'] = (int) $admin['id'];
$_SESSION['admin_email'] = $admin['email'];
$_SESSION['admin_nombre'] = $admin['nombre'];
$_SESSION['csrf_token'] = bin2hex(random_bytes(32));

if ($remember) {
    setcookie(session_name(), session_id(), [
        'expires' => time() + 60 * 60 * 24 * 30,
        'path' => '/',
        'httponly' => true,
        'samesite' => 'Lax',
        'secure' => !empty($_SERVER['HTTPS']),
    ]);
}

json_response([
    'admin' => [
        'id' => (int) $admin['id'],
        'email' => $admin['email'],
        'nombre' => $admin['nombre'],
    ],
    'csrf_token' => csrf_token(),
]);
