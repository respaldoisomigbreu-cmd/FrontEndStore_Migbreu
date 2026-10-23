<?php
declare(strict_types=1);

function json_response(mixed $data, int $status = 200): never
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function json_input(): array
{
    $raw = file_get_contents('php://input');
    if ($raw === false || trim($raw) === '') {
        return [];
    }

    $data = json_decode($raw, true);
    if (!is_array($data)) {
        json_response(['error' => 'El cuerpo de la peticion debe ser JSON valido.'], 400);
    }

    return $data;
}

function require_method(string ...$methods): void
{
    $method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
    if (!in_array($method, $methods, true)) {
        header('Allow: ' . implode(', ', $methods));
        json_response(['error' => 'Metodo no permitido.'], 405);
    }
}

function start_app_session(): void
{
    if (session_status() === PHP_SESSION_ACTIVE) {
        return;
    }

    $config = require __DIR__ . '/config.php';
    session_name($config['session']['name']);
    session_set_cookie_params([
        'lifetime' => (int) $config['session']['lifetime'],
        'path' => '/',
        'httponly' => true,
        'samesite' => 'Lax',
        'secure' => !empty($_SERVER['HTTPS']),
    ]);
    session_start();
}

function current_admin(): ?array
{
    if (empty($_SESSION['admin_id'])) {
        return null;
    }

    return [
        'id' => (int) $_SESSION['admin_id'],
        'email' => $_SESSION['admin_email'] ?? '',
        'nombre' => $_SESSION['admin_nombre'] ?? 'Administrador',
    ];
}

function require_auth(): array
{
    $admin = current_admin();
    if ($admin === null) {
        json_response(['error' => 'No autorizado. Inicia sesion como administrador.'], 401);
    }

    return $admin;
}

function csrf_token(): string
{
    if (empty($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }

    return $_SESSION['csrf_token'];
}

function require_csrf(): void
{
    $token = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
    $expected = $_SESSION['csrf_token'] ?? '';
    if ($token === '' || $expected === '' || !hash_equals($expected, $token)) {
        json_response(['error' => 'Token CSRF invalido. Recarga la pagina e intentalo de nuevo.'], 403);
    }
}

function normalize_phone(string $phone): string
{
    return preg_replace('/\D+/', '', $phone) ?? '';
}

function valid_sizes(): array
{
    return ['S', 'M', 'L', 'XL'];
}

function normalize_sizes(mixed $sizes): array
{
    if (!is_array($sizes)) {
        return [];
    }

    $valid = valid_sizes();
    $normalized = [];
    foreach ($sizes as $size) {
        $size = strtoupper(trim((string) $size));
        if (in_array($size, $valid, true) && !in_array($size, $normalized, true)) {
            $normalized[] = $size;
        }
    }

    usort($normalized, static function (string $a, string $b) use ($valid): int {
        return array_search($a, $valid, true) <=> array_search($b, $valid, true);
    });

    return $normalized;
}

function product_to_api(array $row): array
{
    $sizes = $row['tallas'] ?? '';
    return [
        'id' => (int) $row['id'],
        'nombre' => $row['nombre'],
        'descripcion' => $row['descripcion'],
        'precio' => (float) $row['precio'],
        'imagen' => $row['imagen_url'],
        'tallas' => $sizes !== '' ? explode(',', $sizes) : [],
    ];
}

function list_products(bool $onlyActive = true, ?int $limit = null, int $offset = 0): array
{
    $where = $onlyActive ? 'WHERE p.activo = 1' : '';
    $sql = "SELECT p.id, p.nombre, p.descripcion, p.precio, p.imagen_url,
                   GROUP_CONCAT(pt.talla ORDER BY FIELD(pt.talla, 'S', 'M', 'L', 'XL'), pt.talla SEPARATOR ',') AS tallas
            FROM productos p
            LEFT JOIN producto_tallas pt ON pt.producto_id = p.id
            {$where}
            GROUP BY p.id, p.nombre, p.descripcion, p.precio, p.imagen_url
            ORDER BY p.id ASC";

    if ($limit !== null) {
        $limit = max(1, $limit);
        $offset = max(0, $offset);
        $sql .= " LIMIT {$limit} OFFSET {$offset}";
    }

    $rows = db()->query($sql)->fetchAll();
    return array_map('product_to_api', $rows);
}

function count_products(bool $onlyActive = true): int
{
    $where = $onlyActive ? 'WHERE activo = 1' : '';
    return (int) db()->query("SELECT COUNT(*) FROM productos {$where}")->fetchColumn();
}

function fetch_product(int $id): ?array
{
    $sql = "SELECT p.id, p.nombre, p.descripcion, p.precio, p.imagen_url,
                   GROUP_CONCAT(pt.talla ORDER BY FIELD(pt.talla, 'S', 'M', 'L', 'XL'), pt.talla SEPARATOR ',') AS tallas
            FROM productos p
            LEFT JOIN producto_tallas pt ON pt.producto_id = p.id
            WHERE p.id = ?
            GROUP BY p.id, p.nombre, p.descripcion, p.precio, p.imagen_url
            LIMIT 1";
    $stmt = db()->prepare($sql);
    $stmt->execute([$id]);
    $row = $stmt->fetch();
    return $row ? product_to_api($row) : null;
}

function image_upload_subdir(string $subdir): string
{
    $subdir = trim(str_replace('\\', '/', $subdir), '/');
    return preg_match('/^[a-z0-9_-]+$/i', $subdir) ? $subdir : '';
}

function image_uploads_dir(string $subdir): string
{
    $subdir = image_upload_subdir($subdir);
    if ($subdir === '') {
        return '';
    }
    return dirname(__DIR__) . DIRECTORY_SEPARATOR . 'img' . DIRECTORY_SEPARATOR . $subdir;
}

function is_uploaded_image(string $path, string $subdir): bool
{
    $subdir = image_upload_subdir($subdir);
    if ($subdir === '') {
        return false;
    }

    $normalized = ltrim(str_replace('\\', '/', trim($path)), '/');
    return str_starts_with($normalized, 'img/' . $subdir . '/');
}

function delete_uploaded_image(string $path, string $subdir): bool
{
    $subdir = image_upload_subdir($subdir);
    $normalized = ltrim(str_replace('\\', '/', trim($path)), '/');
    if ($subdir === '' || !str_starts_with($normalized, 'img/' . $subdir . '/')) {
        return false;
    }

    $base = realpath(image_uploads_dir($subdir));
    $candidate = dirname(__DIR__) . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $normalized);
    $candidateDir = realpath(dirname($candidate));

    if ($base === false || $candidateDir === false || $candidateDir !== $base) {
        return false;
    }
    if (!is_file($candidate)) {
        return true;
    }

    return @unlink($candidate);
}

function store_uploaded_image(array $file, string $subdir): array
{
    $subdir = image_upload_subdir($subdir);
    if ($subdir === '') {
        return ['error' => 'El destino de la imagen no es valido.'];
    }

    $error = (int) ($file['error'] ?? UPLOAD_ERR_NO_FILE);
    if ($error !== UPLOAD_ERR_OK) {
        $messages = [
            UPLOAD_ERR_INI_SIZE => 'La imagen supera el tamano maximo permitido por el servidor.',
            UPLOAD_ERR_FORM_SIZE => 'La imagen supera el tamano maximo permitido.',
            UPLOAD_ERR_PARTIAL => 'La imagen se subio de forma incompleta. Intentalo de nuevo.',
            UPLOAD_ERR_NO_FILE => 'Selecciona una imagen para subir.',
            UPLOAD_ERR_NO_TMP_DIR => 'El servidor no tiene una carpeta temporal disponible.',
            UPLOAD_ERR_CANT_WRITE => 'No se pudo guardar la imagen en el servidor.',
            UPLOAD_ERR_EXTENSION => 'La subida de la imagen fue detenida por el servidor.',
        ];
        return ['error' => $messages[$error] ?? 'No se pudo subir la imagen.'];
    }

    $maxSize = 5 * 1024 * 1024;
    if ((int) ($file['size'] ?? 0) <= 0) {
        return ['error' => 'La imagen esta vacia.'];
    }
    if ((int) $file['size'] > $maxSize) {
        return ['error' => 'La imagen no puede superar los 5 MB.'];
    }

    $tmpName = (string) ($file['tmp_name'] ?? '');
    if ($tmpName === '' || !is_uploaded_file($tmpName)) {
        return ['error' => 'El archivo recibido no es valido.'];
    }

    $finfo = new finfo(FILEINFO_MIME_TYPE);
    $mime = $finfo->file($tmpName);
    $allowed = [
        'image/jpeg' => 'jpg',
        'image/png' => 'png',
        'image/webp' => 'webp',
    ];

    if (!is_string($mime) || !isset($allowed[$mime])) {
        return ['error' => 'Formato no permitido. Usa JPG, PNG o WebP.'];
    }

    $imageInfo = @getimagesize($tmpName);
    $allowedTypes = [IMAGETYPE_JPEG, IMAGETYPE_PNG, IMAGETYPE_WEBP];
    if ($imageInfo === false || !in_array($imageInfo[2] ?? null, $allowedTypes, true)) {
        return ['error' => 'El archivo no contiene una imagen valida.'];
    }

    $directory = image_uploads_dir($subdir);
    if (!is_dir($directory) && !mkdir($directory, 0775, true) && !is_dir($directory)) {
        return ['error' => 'No se pudo preparar la carpeta de imagenes.'];
    }
    if (!is_writable($directory)) {
        return ['error' => 'La carpeta de imagenes no tiene permisos de escritura.'];
    }

    $filename = bin2hex(random_bytes(16)) . '.' . $allowed[$mime];
    $destination = $directory . DIRECTORY_SEPARATOR . $filename;

    if (!move_uploaded_file($tmpName, $destination)) {
        return ['error' => 'No se pudo guardar la imagen subida.'];
    }

    return ['imagen' => 'img/' . $subdir . '/' . $filename];
}

function product_uploads_dir(): string
{
    return image_uploads_dir('productos');
}

function is_uploaded_product_image(string $path): bool
{
    return is_uploaded_image($path, 'productos');
}

function delete_uploaded_product_image(string $path): bool
{
    return delete_uploaded_image($path, 'productos');
}

function catalog_uploads_dir(): string
{
    return image_uploads_dir('catalogo');
}

function is_uploaded_catalog_image(string $path): bool
{
    return is_uploaded_image($path, 'catalogo');
}

function delete_uploaded_catalog_image(string $path): bool
{
    return delete_uploaded_image($path, 'catalogo');
}

function validate_product_payload(array $data): array
{
    $nombre = trim((string) ($data['nombre'] ?? ''));
    $descripcion = trim((string) ($data['descripcion'] ?? ''));
    $imagen = trim((string) ($data['imagen'] ?? $data['imagen_url'] ?? ''));
    $precioRaw = $data['precio'] ?? null;
    $tallas = normalize_sizes($data['tallas'] ?? []);

    if (mb_strlen($nombre) < 2 || mb_strlen($nombre) > 120) {
        return ['error' => 'El nombre debe tener entre 2 y 120 caracteres.'];
    }
    if (mb_strlen($descripcion) < 5 || mb_strlen($descripcion) > 3000) {
        return ['error' => 'La descripcion debe tener entre 5 y 3000 caracteres.'];
    }
    if ($imagen === '' || mb_strlen($imagen) > 500) {
        return ['error' => 'Indica una ruta o URL de imagen valida.'];
    }
    if (!is_numeric($precioRaw) || (float) $precioRaw <= 0) {
        return ['error' => 'El precio debe ser un numero mayor que cero.'];
    }
    if (count($tallas) === 0) {
        return ['error' => 'Selecciona al menos una talla disponible.'];
    }

    return [
        'data' => [
            'nombre' => $nombre,
            'descripcion' => $descripcion,
            'precio' => round((float) $precioRaw, 2),
            'imagen_url' => $imagen,
            'tallas' => $tallas,
        ],
    ];
}
