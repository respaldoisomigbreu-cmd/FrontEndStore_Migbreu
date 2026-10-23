<?php
declare(strict_types=1);

require __DIR__ . '/../bootstrap.php';
require_method('POST');
require_auth();
require_csrf();

$data = json_input();
$id = (int) ($data['id'] ?? 0);
$estado = (string) ($data['estado'] ?? '');

if ($id <= 0 || !in_array($estado, ['Pendiente', 'Completado', 'Cancelado'], true)) {
    json_response(['error' => 'Datos de estado invalidos.'], 422);
}

$stmt = db()->prepare('UPDATE pedidos SET estado = ? WHERE id = ?');
$stmt->execute([$estado, $id]);

if ($stmt->rowCount() === 0) {
    json_response(['error' => 'Pedido no encontrado.'], 404);
}

json_response(['ok' => true, 'id' => $id, 'estado' => $estado]);
