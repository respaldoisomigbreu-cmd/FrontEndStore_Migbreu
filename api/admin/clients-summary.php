<?php
declare(strict_types=1);

require __DIR__ . '/../bootstrap.php';
require_method('GET');
require_auth();

$pdo = db();
$perPage = 15;
$total = (int) $pdo->query('SELECT COUNT(*) FROM clientes')->fetchColumn();
$totalPages = max(1, (int) ceil($total / $perPage));
$page = min(max(1, (int) ($_GET['pagina'] ?? 1)), $totalPages);
$offset = ($page - 1) * $perPage;

$sql = "SELECT
            c.id,
            c.nombre_completo,
            COUNT(t.pedido_id) AS compras_realizadas,
            COALESCE(SUM(t.unidades), 0) AS productos_adquiridos,
            COALESCE(SUM(t.total_pago), 0) AS total_gastado
        FROM clientes c
        LEFT JOIN (
            SELECT
                p.id AS pedido_id,
                p.cliente_id,
                p.total_pago,
                COALESCE(SUM(d.cantidad), 0) AS unidades
            FROM pedidos p
            LEFT JOIN detalle_pedidos d ON d.pedido_id = p.id
            GROUP BY p.id, p.cliente_id, p.total_pago
        ) t ON t.cliente_id = c.id
        GROUP BY c.id, c.nombre_completo
        ORDER BY compras_realizadas DESC, total_gastado DESC, c.nombre_completo ASC
        LIMIT {$perPage} OFFSET {$offset}";

$clients = array_map(static fn(array $row): array => [
    'id' => (int) $row['id'],
    'nombre_completo' => $row['nombre_completo'],
    'compras_realizadas' => (int) $row['compras_realizadas'],
    'productos_adquiridos' => (int) $row['productos_adquiridos'],
    'total_gastado' => (float) $row['total_gastado'],
], $pdo->query($sql)->fetchAll());

json_response([
    'clients' => $clients,
    'pagination' => [
        'pagina' => $page,
        'por_pagina' => $perPage,
        'total' => $total,
        'total_paginas' => $totalPages,
    ],
]);
