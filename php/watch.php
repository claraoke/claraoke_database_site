<?php
$video_id = $_GET['v'] ?? null;
$start_time = (int)($_GET['t'] ?? 0);

if (!$video_id) {
    header('Location: /');
    exit;
}

try {
    $pdo = require 'db.php';

    // Get all of our relevent information for this video ID
    $table = preg_replace('/[^a-zA-Z0-9_-]/', '', $video_id);

    // First information from the videos table
    $sql_query = "SELECT * FROM videos WHERE VIDEOID = :videoid LIMIT 1";
    $stmt = $pdo->prepare($sql_query);
    $stmt->execute(['videoid' => $video_id]);
    $video_info = $stmt->fetch(PDO::FETCH_ASSOC);

    // Next information from the karaokes table
    $sql_query = "SELECT * FROM karaokes WHERE VIDEOID = :videoid LIMIT 1";
    $stmt = $pdo->prepare($sql_query);
    $stmt->execute(['videoid' => $video_id]);
    $karaoke_info = $stmt->fetch(PDO::FETCH_ASSOC);

    // Last get the song information from the songs table
    $sql_query = "SELECT * FROM songs WHERE VIDEOID = :videoid AND START_SECONDS = :start_time";
    $stmt = $pdo->prepare($sql_query);
    $stmt->execute(['videoid' => $video_id, 'start_time' => $start_time]);
    $song_info = $stmt->fetch(PDO::FETCH_ASSOC);
    if ($song_info) {
        $track = true;
    } else {
        $track = false;
    }

    // Format our date to YYYY-MM-DD
    $date_aired = 'Unknown';
    if (isset($karaoke_info['TIME'])) {
        $date = DateTime::createFromFormat('Y-m-d H:i:s', $karaoke_info['TIME']);
        if ($date) {
            $date_aired = $date->format('Y-m-d');
        }
    }
} catch (PDOException $e) {
    // Return a JSON error message
    echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
    exit;
}

// Close the connection
$pdo = null;

?>
<!DOCTYPE html>
<html>

<head>
    <meta charset="utf-8" />
    <title>Video Player</title>
    <link rel="stylesheet" href="assets/css/style.css" type="text/css" />
    <link href="assets/css/video-js.css" rel="stylesheet">
    <script src="assets/js/video.min.js"></script>
</head>

<body>
    <div id="player-wrap">
        <div id="player-header" class="player-header">
            <h3 class="video-title">
                <?php
                if (!$track) {
                    echo $video_info['TITLE'];
                } else {
                    echo $song_info['TITLE'] . ' - ' . $song_info['ARTIST'];
                }
                ?>
            </h3>
            <div class="video-body">
                <div class="video-thumb"><img src="assets/images/video_thumbnails/<?= htmlspecialchars($video_id) ?>.jpg" alt="Video Thumbnail" width="200px" height="113px" title="<?= $video_info['TITLE'] ?>" /></div>
                <div class="video-info">
                    <p>
                        <?php if (!$track): ?>
                            <span><strong>Date Aired:</strong> <?= $date_aired ?></span>
                            <span><strong># of Songs:</strong> <?= $karaoke_info['NUM'] ?></span>
                            <a
                                onclick="navigateTo('video', {v: '<?= htmlspecialchars($video_id) ?>'})"
                                class="btn btn--outline video-link">View Video Info</a>
                            <a id="desc-link" href="#" class="btn btn--outline desc-link" target="_self">View Description</a>
                        <?php else: ?>
                            <span><strong>Video Title:</strong> <?= $video_info['TITLE'] ?></span>
                            <span><strong>Date Aired:</strong> <?= $date_aired ?></span>
                            <a
                                onclick="navigateTo('video', {v: '<?= htmlspecialchars($video_id) ?>'})"
                                class="btn btn--outline video-link">View Video Info</a>
                            <a id="desc-link" href="#" class="btn btn--outline desc-link">View Description</a>
                        <?php endif; ?>
                    </p>
                </div>
            </div>
        </div>
        <div class="player-container">
            <video id="player" class="video-js vjs-default-skin" controls preload="auto">
            </video>
        </div>
    </div>
    <div id="description-modal">
        <div id="description-overlay"></div>
        <div id="description-box">
            <div id="description-header">
                <strong>Video Description</strong>
                <button id="description-close">✕</button>
            </div>
            <div id="description-body"></div>
        </div>
    </div>

    <script>
        (function() {
            const descLink = document.getElementById('desc-link');

            const STORAGE_KEY_VOLUME = 'player-volume';
            const STORAGE_KEY_MUTED = 'player-muted';

            function remToPx(rem) {
                // Get the actual font size of the root element (html)
                const rootFontSize = parseFloat(
                    getComputedStyle(document.documentElement).fontSize
                );
                return rem * rootFontSize;
            }

            function setInitialPlayerSize() {
                const container = document.querySelector('.player-container');
                const containerWidth = container.clientWidth;
                const calculatedHeight = containerWidth * (9 / 16);
                container.style.height = `${calculatedHeight}px`;
            }
            setInitialPlayerSize();

            const player = videojs('player', {
                fill: true,
            });
            const startTime = <?= $start_time ?>;

            player.src({
                src: `https://hls.claraoke-db.com/<?= htmlspecialchars($video_id) ?>/master.m3u8`,
                type: 'application/x-mpegURL'
            });

            player.ready(() => {
                // Restore saved volume
                const savedVolume = localStorage.getItem(STORAGE_KEY_VOLUME);
                const savedMuted = localStorage.getItem(STORAGE_KEY_MUTED);

                if (savedVolume !== null) {
                    player.volume(parseFloat(savedVolume));
                } else {
                    // Only apply default if user has never chosen
                    player.volume(0.5);
                }

                if (savedMuted !== null) {
                    player.muted(savedMuted === 'true');
                }

                // Save whenever volume changes
                player.on('volumechange', () => {
                    localStorage.setItem(
                        STORAGE_KEY_VOLUME,
                        player.volume()
                    );

                    localStorage.setItem(
                        STORAGE_KEY_MUTED,
                        player.muted()
                    );
                });

                player.one('loadedmetadata', () => {
                    if (startTime > 0) {
                        player.currentTime(startTime);
                    }
                    player.play();

                    const videoWidth = player.videoWidth();
                    const videoHeight = player.videoHeight();
                    const aspectRatio = videoHeight / videoWidth;
                    const container = document.querySelector('.player-container');
                    const playerHeader = document.getElementById('player-header').offsetHeight;
                    const mainWrap = document.getElementById('main-wrap').offsetHeight;

                    const updateSize = () => {
                        const containerWidth = container.clientWidth;
                        const calculatedHeight = containerWidth * aspectRatio;
                        const maxHeight = window.innerHeight - playerHeader - (2 * remToPx(1.5)) - 293 - 42 - 15;
                        container.style.height = `${Math.min(calculatedHeight, maxHeight)}px`;
                    };

                    new ResizeObserver(updateSize).observe(container);
                    window.addEventListener('resize', updateSize);
                    updateSize();
                });
            });

            descLink.addEventListener('click', async (e) => {
                e.preventDefault();
                const res = await fetch(`php/description.php?videoID=<?= htmlspecialchars($video_id) ?>`);
                const data = await res.json();
                document.getElementById('description-body').textContent =
                    data.description || 'No description available.';
                document.getElementById('description-modal').classList.add('is-visible');
            });

            // Close modal
            document
                .getElementById('description-close')
                .addEventListener('click', () => {
                    document.getElementById('description-modal').classList.remove('is-visible');
                });
            document
                .getElementById('description-overlay')
                .addEventListener('click', () => {
                    document.getElementById('description-modal').classList.remove('is-visible');
                });
        })();
    </script>
</body>

</html>