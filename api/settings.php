<?php
declare(strict_types=1);

require __DIR__ . '/bootstrap.php';
require_method('GET');

$stmt = db()->query(
    "SELECT clave, valor FROM configuracion
     WHERE clave IN ('grafico_camisa', 'grafico_node', 'paleta')"
);

$settings = [
    'grafico_camisa' => '',
    'grafico_node' => '',
    'paleta' => 'hombre',
];

foreach ($stmt->fetchAll() as $row) {
    $settings[$row['clave']] = $row['valor'];
}

json_response(['settings' => $settings]);
