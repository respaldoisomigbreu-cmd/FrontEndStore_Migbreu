<?php
declare(strict_types=1);

require __DIR__ . '/../bootstrap.php';
require_method('GET');
require_auth();

$telefono = normalize_phone((string) ($_GET['telefono'] ?? ''));
if (strlen($telefono) < 7 || strlen($telefono) > 15) {
    json_response(['error' => 'Telefono invalido.'], 422);
}

$pdo = db();
$stmt = $pdo->prepare(
    'SELECT c.id, c.nombre_completo, c.telefono, c.fecha_registro,
            COUNT(p.id) AS compras_realizadas
     FROM clientes c
     LEFT JOIN pedidos p ON p.cliente_id = c.id
     WHERE c.telefono = ?
     GROUP BY c.id, c.nombre_completo, c.telefono, c.fecha_registro
     LIMIT 1'
);
$stmt->execute([$telefono]);
$client = $stmt->fetch();

if (!$client) {
    json_response(['error' => 'Cliente no encontrado.'], 404);
}

$ordersStmt = $pdo->prepare(
    'SELECT id, fecha_pedido, total_pago, estado
     FROM pedidos
     WHERE cliente_id = ?
     ORDER BY fecha_pedido DESC'
);
$ordersStmt->execute([(int) $client['id']]);

$compras = (int) $client['compras_realizadas'];

json_response([
    'cliente' => [
        'id' => (int) $client['id'],
        'nombre_completo' => $client['nombre_completo'],
        'telefono' => $client['telefono'],
        'fecha_registro' => $client['fecha_registro'],
        'compras_realizadas' => $compras,
        'tipo_cliente' => $compras <= 1 ? 'Cliente Nuevo' : 'Cliente Frecuente',
    ],
    'orders' => array_map(static fn(array $order): array => [
        'id' => (int) $order['id'],
        'fecha' => $order['fecha_pedido'],
        'total' => (float) $order['total_pago'],
        'estado' => $order['estado'],
    ], $ordersStmt->fetchAll()),
]);
