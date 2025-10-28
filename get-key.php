<?php
// Load environment variables from .env
$env = parse_ini_file('.env');

// Output the key as JSON
header('Content-Type: application/json');
echo json_encode(['key' => $env['GOOGLE_MAPS_API_KEY']]);
?>
