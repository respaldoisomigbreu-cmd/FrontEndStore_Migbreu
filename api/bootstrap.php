<?php
declare(strict_types=1);

require_once __DIR__ . '/helpers.php';
require_once __DIR__ . '/db.php';

start_app_session();

set_exception_handler(static function (Throwable $error): void {
    error_log('[FrontEnd Store API] ' . $error->getMessage());
    json_response(['error' => 'Error interno del servidor.'], 500);
});
