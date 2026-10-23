<?php
declare(strict_types=1);

require __DIR__ . '/bootstrap.php';
require_method('GET');

$admin = require_auth();

json_response([
    'admin' => $admin,
    'csrf_token' => csrf_token(),
]);
