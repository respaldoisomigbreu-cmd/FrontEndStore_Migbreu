<?php
declare(strict_types=1);

// Crea o actualiza el administrador inicial.
// Uso: php sql/seed_admin.php [email] [password]

require __DIR__ . '/../api/db.php';

$email = $argv[1] ?? 'admin@frontendstore.com';
$password = $argv[2] ?? 'Admin123';
$nombre = 'Administrador';

$hash = password_hash($password, PASSWORD_DEFAULT);

try {
    $pdo = db();
    $stmt = $pdo->prepare(
        'INSERT INTO administradores (email, password_hash, nombre)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE password_hash = ?, nombre = ?'
    );
    $stmt->execute([$email, $hash, $nombre, $hash, $nombre]);
    echo "Administrador listo: {$email}\n";
} catch (Throwable $error) {
    fwrite(STDERR, 'Error al crear el administrador: ' . $error->getMessage() . "\n");
    exit(1);
}
