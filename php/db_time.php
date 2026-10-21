<?php
// Headers
$allowed_origins = [
    'https://claraoke-db.com',
    'https://www.claraoke-db.com',
];

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';

if (in_array($origin, $allowed_origins)) {
    header("Access-Control-Allow-Origin: $origin");
}

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Headers: Content-Type');

// Get our database config and connect to the database
$pdo = require 'db.php';


// Always fetch in UTC
$pdo->exec("SET time_zone = '+00:00'");
$stmt = $pdo->query("SELECT last_update FROM db_updates ORDER BY last_update DESC LIMIT 1");
$lastUpdate = $stmt->fetchColumn();

echo json_encode(['last_update' => $lastUpdate]); // e.g. "2025-07-01 13:23:28"

// Close the connection
$pdo = null;
