<?php
declare(strict_types=1);

require __DIR__ . '/bootstrap.php';
require_method('GET', 'PUT', 'DELETE');

$id = (int) ($_GET['id'] ?? 0);
if ($id <= 0) {
    json_response(['error' => 'ID de producto invalido.'], 422);
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $product = fetch_product($id);
    if ($product === null) {
        json_response(['error' => 'Producto no encontrado.'], 404);
    }
    json_response(['product' => $product]);
}

require_auth();
require_csrf();

if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
    try {
        $stmt = db()->prepare('DELETE FROM productos WHERE id = ?');
        $stmt->execute([$id]);
    } catch (PDOException $error) {
        if ($error->getCode() === '23000') {
            json_response(['error' => 'No se puede eliminar: el producto tiene pedidos asociados.'], 409);
        }
        throw $error;
    }

    if ($stmt->rowCount() === 0) {
        json_response(['error' => 'Producto no encontrado.'], 404);
    }

    json_response(['ok' => true]);
}

$payload = json_input();
$validated = validate_product_payload($payload);
if (isset($validated['error'])) {
    json_response(['error' => $validated['error']], 422);
}

$current = fetch_product($id);
if ($current === null) {
    json_response(['error' => 'Producto no encontrado.'], 404);
}

$product = $validated['data'];
$pdo = db();

try {
    $pdo->beginTransaction();

    $stmt = $pdo->prepare(
        'UPDATE productos
         SET nombre = ?, descripcion = ?, precio = ?, imagen_url = ?
         WHERE id = ?'
    );
    $stmt->execute([
        $product['nombre'],
        $product['descripcion'],
        $product['precio'],
        $product['imagen_url'],
        $id,
    ]);

    $pdo->prepare('DELETE FROM producto_tallas WHERE producto_id = ?')->execute([$id]);
    $sizeStmt = $pdo->prepare('INSERT INTO producto_tallas (producto_id, talla) VALUES (?, ?)');
    foreach ($product['tallas'] as $size) {
        $sizeStmt->execute([$id, $size]);
    }

    $pdo->commit();
} catch (Throwable $error) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    throw $error;
}

$response = ['product' => fetch_product($id)];
$oldImage = (string) ($current['imagen'] ?? '');
$newImage = (string) $product['imagen_url'];

if ($oldImage !== '' && $oldImage !== $newImage && is_uploaded_product_image($oldImage)) {
    $referenceStmt = $pdo->prepare('SELECT COUNT(*) FROM productos WHERE imagen_url = ? AND id <> ?');
    $referenceStmt->execute([$oldImage, $id]);

    if ((int) $referenceStmt->fetchColumn() === 0 && !delete_uploaded_product_image($oldImage)) {
        $response['advertencia'] = 'El producto se actualizo, pero no se pudo eliminar la imagen anterior.';
    }
}

json_response($response);
