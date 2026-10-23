<?php
declare(strict_types=1);

require __DIR__ . '/../bootstrap.php';
require_method('GET');
require_auth();

$pdo = db();

$orden = (string) ($_GET['orden'] ?? 'ultimas');
if (!in_array($orden, ['ultimas', 'frecuentes', 'producto', 'pendientes'], true)) {
    $orden = 'ultimas';
}

$page = max(1, (int) ($_GET['pagina'] ?? 1));
$perPage = 15;
$where = $orden === 'pendientes' ? "WHERE p.estado = 'Pendiente'" : '';
$total = (int) $pdo->query("SELECT COUNT(*) FROM pedidos p {$where}")->fetchColumn();
$totalPages = max(1, (int) ceil($total / $perPage));
$page = min($page, $totalPages);
$offset = ($page - 1) * $perPage;

$orderBy = match ($orden) {
    'frecuentes' => 'compras_realizadas DESC, p.fecha_pedido DESC, p.id DESC',
    'producto' => 'unidades DESC, p.fecha_pedido DESC, p.id DESC',
    default => 'p.fecha_pedido DESC, p.id DESC',
};

$sql = "SELECT
            p.id,
            p.fecha_pedido,
            p.estado,
            p.total_pago,
            c.id AS cliente_id,
            c.nombre_completo,
            c.telefono,
            COUNT(*) OVER (PARTITION BY p.cliente_id) AS compras_realizadas,
            (SELECT COALESCE(SUM(d.cantidad), 0)
             FROM detalle_pedidos d
             WHERE d.pedido_id = p.id) AS unidades
        FROM pedidos p
        JOIN clientes c ON c.id = p.cliente_id
        {$where}
        ORDER BY {$orderBy}
        LIMIT {$perPage} OFFSET {$offset}";
$orders = $pdo->query($sql)->fetchAll();

$detailsByOrder = [];
if (count($orders) > 0) {
    $orderIds = array_map(static fn(array $order): int => (int) $order['id'], $orders);
    $placeholders = implode(',', array_fill(0, count($orderIds), '?'));
    $detailStmt = $pdo->prepare(
        "SELECT d.pedido_id, d.talla_seleccionada, d.cantidad, d.precio_unitario,
                pr.id AS producto_id, pr.nombre
         FROM detalle_pedidos d
         JOIN productos pr ON pr.id = d.producto_id
         WHERE d.pedido_id IN ({$placeholders})
         ORDER BY d.id ASC"
    );
    $detailStmt->execute($orderIds);

    foreach ($detailStmt->fetchAll() as $row) {
        $orderId = (int) $row['pedido_id'];
        $detailsByOrder[$orderId][] = [
            'producto_id' => (int) $row['producto_id'],
            'nombre' => $row['nombre'],
            'talla' => $row['talla_seleccionada'],
            'cantidad' => (int) $row['cantidad'],
            'precio_unitario' => (float) $row['precio_unitario'],
        ];
    }
}

$result = array_map(static function (array $order) use ($detailsByOrder): array {
    $orderId = (int) $order['id'];
    $compras = (int) $order['compras_realizadas'];

    return [
        'id' => $orderId,
        'fecha' => $order['fecha_pedido'],
        'estado' => $order['estado'],
        'total' => (float) $order['total_pago'],
        'cliente' => [
            'id' => (int) $order['cliente_id'],
            'nombre_completo' => $order['nombre_completo'],
            'telefono' => $order['telefono'],
        ],
        'compras_realizadas' => $compras,
        'tipo_cliente' => $compras <= 1 ? 'Cliente Nuevo' : 'Cliente Frecuente',
        'unidades' => (int) $order['unidades'],
        'items' => $detailsByOrder[$orderId] ?? [],
    ];
}, $orders);

json_response([
    'orders' => $result,
    'pagination' => [
        'pagina' => $page,
        'por_pagina' => $perPage,
        'total' => $total,
        'total_paginas' => $totalPages,
    ],
    'orden' => $orden,
]);
