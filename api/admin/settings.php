<?php
declare(strict_types=1);

require __DIR__ . '/../bootstrap.php';
require_method('POST');
require_auth();
require_csrf();

$imageKeys = ['grafico_camisa', 'grafico_node'];
$data = json_input();
$updates = [];

foreach ($imageKeys as $key) {
    if (!array_key_exists($key, $data)) {
        continue;
    }

    $value = trim((string) $data[$key]);
    if ($value === '' || strlen($value) > 500) {
        json_response(['error' => 'La ruta de la imagen no es valida.'], 422);
    }
    if (!preg_match('/^(https?:\/\/|img\/|\.\/|\/)/i', $value)) {
        json_response(['error' => 'Usa una ruta img/... o una URL http(s).'], 422);
    }

    $updates[$key] = $value;
}

if (array_key_exists('paleta', $data)) {
    $paleta = trim((string) $data['paleta']);
    if (!in_array($paleta, ['hombre', 'mujer'], true)) {
        json_response(['error' => 'La paleta seleccionada no es valida.'], 422);
    }
    $updates['paleta'] = $paleta;
}

if (count($updates) === 0) {
    json_response(['error' => 'No se recibieron datos para actualizar.'], 422);
}

$pdo = db();
$currentStmt = $pdo->query(
    "SELECT clave, valor FROM configuracion
     WHERE clave IN ('grafico_camisa', 'grafico_node', 'paleta')"
);
$current = [
    'grafico_camisa' => '',
    'grafico_node' => '',
    'paleta' => 'hombre',
];
foreach ($currentStmt->fetchAll() as $row) {
    $current[$row['clave']] = $row['valor'];
}

$stmt = $pdo->prepare(
    'INSERT INTO configuracion (clave, valor) VALUES (?, ?)
     ON DUPLICATE KEY UPDATE valor = VALUES(valor)'
);

foreach ($updates as $key => $value) {
    $stmt->execute([$key, $value]);
}

$select = $pdo->query(
    "SELECT clave, valor FROM configuracion
     WHERE clave IN ('grafico_camisa', 'grafico_node', 'paleta')"
);

$settings = [
    'grafico_camisa' => '',
    'grafico_node' => '',
    'paleta' => 'hombre',
];

foreach ($select->fetchAll() as $row) {
    $settings[$row['clave']] = $row['valor'];
}

$response = ['ok' => true, 'settings' => $settings];

foreach ($imageKeys as $key) {
    if (!array_key_exists($key, $updates)) {
        continue;
    }

    $oldImage = (string) ($current[$key] ?? '');
    if ($oldImage === '' || $oldImage === $updates[$key] || !is_uploaded_catalog_image($oldImage)) {
        continue;
    }

    $referenceStmt = $pdo->prepare(
        "SELECT COUNT(*) FROM configuracion
         WHERE clave IN ('grafico_camisa', 'grafico_node') AND valor = ?"
    );
    $referenceStmt->execute([$oldImage]);

    if ((int) $referenceStmt->fetchColumn() === 0 && !delete_uploaded_catalog_image($oldImage)) {
        $response['advertencia'] = 'Las imagenes se actualizaron, pero no se pudo eliminar una imagen anterior.';
    }
}

json_response($response);
