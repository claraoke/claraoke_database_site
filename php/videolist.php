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

$total_start = microtime(true);

$pdo_start = microtime(true);
$pdo = require 'db.php';
$pdo_end = microtime(true);

// Query the karaokes and videos tables to get all video information in one go
$sql_query = "
    SELECT
        k.VIDEOID,
        k.TIME,
        k.NUM,
        v.TITLE
    FROM
        karaokes k
    LEFT JOIN
        videos v ON k.VIDEOID = v.VIDEOID
    ORDER BY
        k.TIME DESC
";

$videos = [];
try {
    $query_start = microtime(true);
    $stmt = $pdo->query($sql_query);
    $query_end = microtime(true);

    $videos = $stmt->fetchAll(PDO::FETCH_ASSOC);
} catch (PDOException $e) {
    echo "❌ Query failed: " . $e->getMessage();
    // In a real app, you'd want to log this error.
    // For now, we'll just show the error and stop.
    exit;
}

$total_end = microtime(true);

// Format the date for each video
foreach ($videos as &$video) {
    // Set a default title if it's NULL (from the LEFT JOIN)
    $video['TITLE'] = $video['TITLE'] ?? 'Unknown Title';

    // Format the date aired to YYYY-MM-DD
    $date = DateTime::createFromFormat('Y-m-d H:i:s', $video['TIME']);
    if ($date) {
        $video['TIME'] = $date->format('Y-m-d');
    } else {
        $video['TIME'] = 'Unknown';
    }
}
unset($video); // break the reference with the last element

// --- Output JSON ---
echo json_encode([
    'count' => count($videos),
    'items' => $videos,
]);

error_log(json_encode([
    'connect_ms' => ($pdo_end - $pdo_start) * 1000,
    'query_ms' => ($query_end - $query_start) * 1000,
    'total_ms' => ($total_end - $total_start) * 1000,
]));

// Close the connection
$pdo = null;
