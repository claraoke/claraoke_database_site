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

$exec_start = 0;
$exec_end = 0;
$fetch_start = 0;
$fetch_end = 0;

// Get the search query from the request, check if we have a POST, else fallback to GET
$input = file_get_contents('php://input');
$data = json_decode($input, true);
$query = '';

if (isset($data['q'])) {
  $query = trim($data['q']);
} else {
  $query = trim($_GET['q'] ?? '');
}

// Query processing
$query = preg_replace('/\s+/', ' ', $query);
$query = str_replace(['“', '”', '‘', '’'], "'", $query); // smart quotes to normal

$results = [];

if ($query !== '') {
  // Build boolean query
  $terms = preg_split('/\s+/', $query);
  $safe_terms = [];

  foreach ($terms as $term) {
    // remove any characters that can break fulltext syntax
    $term = preg_replace('/[^\p{L}\p{N}\']+/u', '', $term);
    if ($term !== '') {
      $safe_terms[] = '+' . $term;
    }
  }

  $boolean_query = implode(' ', $safe_terms);

  $sql_query = "
      SELECT 
        s.TITLE AS song,
        s.ARTIST AS artist,
        s.STARTTIME AS time,
        s.START_SECONDS AS start_seconds,
        v.TITLE AS video,
        v.VIDEOID AS videoid,
        v.TIME AS date
      FROM songs AS s
      LEFT JOIN videos AS v ON s.VIDEOID = v.VIDEOID
      WHERE MATCH(s.TITLE, s.ARTIST) AGAINST (? IN BOOLEAN MODE)
      ORDER BY v.TIME DESC;
  ";

  try {
    $exec_start = microtime(true);
    $stmt = $pdo->prepare($sql_query);
    $stmt->execute([$boolean_query]);
    $exec_end = microtime(true);

    $fetch_start = microtime(true);
    $res = $stmt->fetchAll(PDO::FETCH_ASSOC);
    $fetch_end = microtime(true);

    foreach ($res as $row) {
      // Format the date
      $date = 'Unknown';
      if (isset($row['date'])) {
        $dt = DateTime::createFromFormat('Y-m-d H:i:s', $row['date']);
        if ($dt) {
          $date = $dt->format('Y-m-d');
        }
      }

      $results[] = [
        'song' => $row['song'],
        'artist' => $row['artist'],
        'video' => $row['video'] ?? 'Unknown',
        'videoid' => $row['videoid'],
        'date' => $date,
        'start_seconds' => $row['start_seconds'],
      ];
    }
  } catch (PDOException $e) {
    // Ignore errors here (such as table not existing)
  }
}

echo json_encode([
  'query' => $query,
  'count' => count($results),
  'items' => $results
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

$total_end = microtime(true);

error_log(json_encode([
  'connect_ms' => ($pdo_end - $pdo_start) * 1000,
  'exec_ms' => ($exec_end - $exec_start) * 1000,
  'fetch_ms' => ($fetch_end - $fetch_start) * 1000,
  'total_ms' => ($total_end - $total_start) * 1000,
]));

// Close connection
$pdo = null;
