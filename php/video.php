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
$videoID = $_REQUEST['videoID'] ?? '';
if ($videoID === '') {
    echo json_encode(['error' => 'No videoID provided']);
    exit;
}

try {
    $pdo = require 'db.php';

    // Get all of our relevent information for this videoID
    $table = preg_replace('/[^a-zA-Z0-9_-]/', '', $videoID);

    // First information from the videos table
    $sql_query = "SELECT * FROM videos WHERE VIDEOID = :videoid LIMIT 1";
    $stmt = $pdo->prepare($sql_query);
    $stmt->execute(['videoid' => $videoID]);
    $video_info = $stmt->fetch(PDO::FETCH_ASSOC);

    // Next information from the karaokes table
    $sql_query = "SELECT * FROM karaokes WHERE VIDEOID = :videoid LIMIT 1";
    $stmt = $pdo->prepare($sql_query);
    $stmt->execute(['videoid' => $videoID]);
    $karaoke_info = $stmt->fetch(PDO::FETCH_ASSOC);

    // Last get the song list from the songs table
    $songs = [];
    $sql_query = "SELECT * FROM songs WHERE VIDEOID = :videoid ORDER BY TRACK ASC";
    $stmt = $pdo->prepare($sql_query);
    $stmt->execute(['videoid' => $videoID]);
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        $songs[] = $row;
    }

    // Format our date to YYYY-MM-DD
    $date_aired = 'Unknown';
    if (isset($karaoke_info['TIME'])) {
        $date = DateTime::createFromFormat('Y-m-d H:i:s', $karaoke_info['TIME']);
        if ($date) {
            $date_aired = $date->format('Y-m-d');
        }
    }

    // Combine all data into a single array
    $response_data = [
        'video_info' => $video_info,
        'karaoke_info' => $karaoke_info,
        'songs' => $songs,
        'date_aired' => $date_aired,
    ];

    // Output the data as JSON
    echo json_encode($response_data);
} catch (PDOException $e) {
    // Return a JSON error message
    echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
    exit;
}

// Close the connection
$pdo = null;
