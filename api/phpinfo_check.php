<?php
// Simple PHP version check - no dependencies
header('Content-Type: application/json; charset=utf-8');
echo json_encode(array(
    'php_version' => phpversion(),
    'mysqli_available' => extension_loaded('mysqli'),
    'pdo_available' => extension_loaded('pdo_mysql'),
    'server_software' => isset($_SERVER['SERVER_SOFTWARE']) ? $_SERVER['SERVER_SOFTWARE'] : 'unknown'
));
?>
