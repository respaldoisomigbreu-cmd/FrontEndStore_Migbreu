<?php
declare(strict_types=1);

require __DIR__ . '/bootstrap.php';
require_method('POST');

$data = json_input();
$nombre = trim((string) ($data['nombre_completo'] ?? ''));
$telefono = normalize_phone((string) ($data['telefono'] ?? ''));
$rawItems = $data['items'] ?? null;

if (mb_strlen($nombre) < 3 || mb_strlen($nombre) > 150) {
    json_response(['error' => 'El nombre del comprador debe tener entre 3 y 150 caracteres.'], 422);
}
if (strlen($telefono) < 7 || strlen($telefono) > 15) {
    json_response(['error' => 'El telefono debe tener entre 7 y 15 digitos.'], 422);
}
if (!is_array($rawItems) || count($rawItems) === 0) {
    json_response(['error' => 'El pedido no contiene productos.'], 422);
}
if (count($rawItems) > 50) {
    json_response(['error' => 'El pedido supera el limite de lineas permitido.'], 422);
}

$items = [];
$productIds = [];

foreach ($rawItems as $rawItem) {
    if (!is_array($rawItem)) {
        json_response(['error' => 'Formato de producto invalido.'], 422);
    }

    $productId = (int) ($rawItem['producto_id'] ?? $rawItem['id'] ?? 0);
    $talla = strtoupper(trim((string) ($rawItem['talla'] ?? '')));
    $cantidad = (int) ($rawItem['cantidad'] ?? 0);

    if ($productId <= 0 || !in_array($talla, valid_sizes(), true) || $cantidad < 1 || $cantidad > 99) {
        json_response(['error' => 'Hay una linea del pedido con datos invalidos.'], 422);
    }

    $items[] = [
        'producto_id' => $productId,
        'talla' => $talla,
        'cantidad' => $cantidad,
    ];
    $productIds[] = $productId;
}

$productIds = array_values(array_unique($productIds));
$placeholders = implode(',', array_fill(0, count($productIds), '?'));
$productStmt = db()->prepare(
    "SELECT id, nombre, precio FROM productos WHERE id IN ({$placeholders}) AND activo = 1"
);
$productStmt->execute($productIds);

$products = [];
foreach ($productStmt->fetchAll() as $row) {
    $products[(int) $row['id']] = $row;
}

if (count($products) !== count($productIds)) {
    json_response(['error' => 'Uno o mas productos ya no estan disponibles.'], 422);
}

$sizesByProduct = [];
$sizeStmt = db()->prepare('SELECT talla FROM producto_tallas WHERE producto_id = ?');
foreach (array_keys($products) as $productId) {
    $sizeStmt->execute([$productId]);
    $sizesByProduct[$productId] = array_column($sizeStmt->fetchAll(), 'talla');
}

$totalCents = 0;
$orderItems = [];

foreach ($items as $item) {
    $product = $products[$item['producto_id']];
    if (!in_array($item['talla'], $sizesByProduct[$item['producto_id']], true)) {
        json_response([
            'error' => 'La talla ' . $item['talla'] . ' no esta disponible para ' . $product['nombre'] . '.',
        ], 422);
    }

    $precio = round((float) $product['precio'], 2);
    $subtotalCents = (int) round($precio * 100) * $item['cantidad'];
    $totalCents += $subtotalCents;

    $orderItems[] = [
        'producto_id' => (int) $product['id'],
        'nombre' => $product['nombre'],
        'talla' => $item['talla'],
        'cantidad' => $item['cantidad'],
        'precio_unitario' => $precio,
        'subtotal' => $subtotalCents / 100,
    ];
}

$total = $totalCents / 100;
$pdo = db();

try {
    $pdo->beginTransaction();

    $clientStmt = $pdo->prepare(
        'INSERT INTO clientes (nombre_completo, telefono)
         VALUES (?, ?)
         ON DUPLICATE KEY UPDATE nombre_completo = ?, id = LAST_INSERT_ID(id)'
    );
    $clientStmt->execute([$nombre, $telefono, $nombre]);
    $clienteId = (int) $pdo->lastInsertId();

    if ($clienteId === 0) {
        $findClient = $pdo->prepare('SELECT id FROM clientes WHERE telefono = ? LIMIT 1');
        $findClient->execute([$telefono]);
        $clienteId = (int) $findClient->fetchColumn();
    }

    if ($clienteId <= 0) {
        throw new RuntimeException('No se pudo registrar el cliente.');
    }

    $orderStmt = $pdo->prepare(
        'INSERT INTO pedidos (cliente_id, total_pago, estado) VALUES (?, ?, ?)'
    );
    $orderStmt->execute([$clienteId, number_format($total, 2, '.', ''), 'Pendiente']);
    $pedidoId = (int) $pdo->lastInsertId();

    $detailStmt = $pdo->prepare(
        'INSERT INTO detalle_pedidos
            (pedido_id, producto_id, talla_seleccionada, cantidad, precio_unitario)
         VALUES (?, ?, ?, ?, ?)'
    );
    foreach ($orderItems as $item) {
        $detailStmt->execute([
            $pedidoId,
            $item['producto_id'],
            $item['talla'],
            $item['cantidad'],
            number_format($item['precio_unitario'], 2, '.', ''),
        ]);
    }

    $countStmt = $pdo->prepare('SELECT COUNT(*) FROM pedidos WHERE cliente_id = ?');
    $countStmt->execute([$clienteId]);
    $compras = (int) $countStmt->fetchColumn();

    $createdStmt = $pdo->prepare(
        'SELECT fecha_pedido FROM pedidos WHERE id = ? LIMIT 1'
    );
    $createdStmt->execute([$pedidoId]);
    $fecha = $createdStmt->fetchColumn();

    $pdo->commit();
} catch (Throwable $error) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    throw $error;
}

$tipoCliente = $compras <= 1 ? 'Cliente Nuevo' : 'Cliente Frecuente';

json_response([
    'order' => [
        'id' => $pedidoId,
        'fecha' => $fecha,
        'estado' => 'Pendiente',
        'total' => $total,
        'items' => $orderItems,
    ],
    'cliente' => [
        'id' => $clienteId,
        'nombre_completo' => $nombre,
        'telefono' => $telefono,
    ],
    'compras_realizadas' => $compras,
    'tipo_cliente' => $tipoCliente,
], 201);
