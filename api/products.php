<?php
declare(strict_types=1);

require __DIR__ . '/bootstrap.php';
require_method('GET', 'POST');

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if (!isset($_GET['pagina']) || $_GET['pagina'] === '') {
        json_response(['products' => list_products()]);
    }

    $perPage = (int) ($_GET['por_pagina'] ?? 10);
    $perPage = max(1, min(50, $perPage));
    $total = count_products();
    $totalPages = max(1, (int) ceil($total / $perPage));
    $page = min(max(1, (int) $_GET['pagina']), $totalPages);
    $offset = ($page - 1) * $perPage;

    json_response([
        'products' => list_products(true, $perPage, $offset),
        'pagination' => [
            'pagina' => $page,
            'por_pagina' => $perPage,
            'total' => $total,
            'total_paginas' => $totalPages,
        ],
    ]);
}

require_auth();
require_csrf();

$payload = json_input();
$validated = validate_product_payload($payload);
if (isset($validated['error'])) {
    json_response(['error' => $validated['error']], 422);
}

$product = $validated['data'];
$pdo = db();

try {
    $pdo->beginTransaction();

    $stmt = $pdo->prepare(
        'INSERT INTO productos (nombre, descripcion, precio, imagen_url)
         VALUES (?, ?, ?, ?)'
    );
    $stmt->execute([
        $product['nombre'],
        $product['descripcion'],
        $product['precio'],
        $product['imagen_url'],
    ]);

    $productId = (int) $pdo->lastInsertId();
    $sizeStmt = $pdo->prepare('INSERT INTO producto_tallas (producto_id, talla) VALUES (?, ?)');
    foreach ($product['tallas'] as $size) {
        $sizeStmt->execute([$productId, $size]);
    }

    $pdo->commit();
} catch (Throwable $error) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    throw $error;
}

json_response(['product' => fetch_product($productId)], 201);
