<?php
declare(strict_types=1);

require __DIR__ . '/../bootstrap.php';
require_method('POST');
require_auth();
require_csrf();

if (!isset($_FILES['imagen']) || !is_array($_FILES['imagen'])) {
    json_response(['error' => 'Selecciona una imagen para subir.'], 422);
}

$result = store_uploaded_image($_FILES['imagen'], 'productos');
if (isset($result['error'])) {
    json_response(['error' => $result['error']], 422);
}

json_response([
    'ok' => true,
    'imagen' => $result['imagen'],
], 201);
