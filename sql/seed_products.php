<?php
declare(strict_types=1);

// Inserta los 14 productos iniciales solo si la tabla esta vacia.
// Uso: php sql/seed_products.php

require __DIR__ . '/../api/db.php';

$products = [
    ['VueJS', 'Camiseta de VueJS para quienes disfrutan de un framework progresivo, reactivo y facil de aprender.', 25.00, 'img/1.jpg'],
    ['AngularJS', 'Camiseta de AngularJS inspirada en el framework de Google para aplicaciones web robustas y escalables.', 25.00, 'img/2.jpg'],
    ['Reactjs', 'Camiseta de React JS, la biblioteca de JavaScript para construir interfaces de usuario con componentes.', 25.00, 'img/3.jpg'],
    ['Redux', 'Camiseta de Redux para amantes del manejo de estado predecible en aplicaciones JavaScript.', 25.00, 'img/4.jpg'],
    ['Node.Js', 'Camiseta de Node.js para desarrolladores que llevan JavaScript al lado del servidor.', 25.00, 'img/5.jpg'],
    ['SASS', 'Camiseta de SASS para quienes escriben CSS con variables, anidacion y mixins de forma elegante.', 25.00, 'img/6.jpg'],
    ['HTML5', 'Camiseta de HTML5, la base de la web moderna y el punto de partida de todo proyecto frontend.', 25.00, 'img/7.jpg'],
    ['Github', 'Camiseta de GitHub para versionar codigo, colaborar en equipo y compartir proyectos open source.', 25.00, 'img/8.jpg'],
    ['BulmaCSS', 'Camiseta de BulmaCSS, un framework CSS moderno basado en Flexbox y facil de usar.', 25.00, 'img/9.jpg'],
    ['TypeScript', 'Camiseta de TypeScript para escribir JavaScript con tipos y detectar errores antes de ejecutar.', 25.00, 'img/10.jpg'],
    ['Drupal', 'Camiseta de Drupal, el sistema de gestion de contenidos flexible para sitios web complejos.', 25.00, 'img/11.jpg'],
    ['JavaScript', 'Camiseta de JavaScript, el lenguaje que da vida e interactividad a la web.', 25.00, 'img/12.jpg'],
    ['Graphql', 'Camiseta de GraphQL para consultar APIs de forma eficiente y obtener solo los datos necesarios.', 25.00, 'img/13.jpg'],
    ['WordPress', 'Camiseta de WordPress, la plataforma mas popular para crear sitios web y blogs.', 25.00, 'img/14.jpg'],
];

try {
    $pdo = db();
    $count = (int) $pdo->query('SELECT COUNT(*) FROM productos')->fetchColumn();

    if ($count > 0) {
        echo "La tabla productos ya contiene {$count} registros. No se inserto nada.\n";
        exit(0);
    }

    $pdo->beginTransaction();
    $productStmt = $pdo->prepare(
        'INSERT INTO productos (nombre, descripcion, precio, imagen_url) VALUES (?, ?, ?, ?)'
    );
    $sizeStmt = $pdo->prepare('INSERT INTO producto_tallas (producto_id, talla) VALUES (?, ?)');

    foreach ($products as $product) {
        $productStmt->execute($product);
        $productId = (int) $pdo->lastInsertId();
        foreach (['S', 'M', 'L', 'XL'] as $size) {
            $sizeStmt->execute([$productId, $size]);
        }
    }

    $pdo->commit();
    echo "Productos iniciales insertados: " . count($products) . "\n";
} catch (Throwable $error) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    fwrite(STDERR, 'Error al insertar productos: ' . $error->getMessage() . "\n");
    exit(1);
}
