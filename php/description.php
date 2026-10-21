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
// Get videoID from request
$video_id = $_REQUEST['videoID'] ?? '';
if ($video_id === '') {
    echo json_encode(['error' => 'No videoID provided']);
    exit;
}

try {
    $pdo = require 'db.php';

    $stmt = $pdo->prepare("SELECT DESCRIPTION FROM descriptions WHERE VIDEOID = :videoid");
    $stmt->execute(['videoid' => $video_id]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);

    echo json_encode(['description' => $row['DESCRIPTION'] ?? null]);
} catch (PDOException $e) {
    // Return a JSON error message
    echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
    exit;
}

// Close the connection
$pdo = null;
