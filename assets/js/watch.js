// assets/js/watch.js
(() => {
  const params = new URLSearchParams(window.location.search);
  const videoId = params.get('v');
  const startTime = Math.max(0, Number.parseInt(params.get('t') || '0', 10) || 0);

  const $ = (id) => document.getElementById(id);

  const titleEl = $('watch-title');
  const thumbnailEl = $('watch-thumbnail');
  const dateEl = $('watch-date');
  const videoTitleEl = $('watch-video-title');
  const songCountEl = $('watch-song-count');
  const errorEl = $('watch-error');
  const descriptionModal = $('description-modal');
  const descriptionBody = $('description-body');

  const storageVolume = 'player-volume';
  const storageMuted = 'player-muted';

  let player = null;
  let resizeObserver = null;
  let onWindowResize = null;

  function showError(message) {
    errorEl.textContent = message;
    errorEl.hidden = false;
  }

  function closeDescription() {
    descriptionModal.classList.remove('is-visible');
  }

  function cleanup() {
    if (resizeObserver) {
      resizeObserver.disconnect();
      resizeObserver = null;
    }

    if (onWindowResize) {
      window.removeEventListener('resize', onWindowResize);
      onWindowResize = null;
    }

    // The main router disposes the Video.js player before replacing page content.
    // Do not dispose it twice here.
    player = null;
  }

  // The SPA router calls this before navigating away from the watch page.
  window.__watchCleanup = cleanup;

  if (!videoId) {
    if (typeof window.navigateTo === 'function') {
      window.navigateTo('home');
    } else {
      window.location.replace('/');
    }
    return;
  }

  // Set a safe initial thumbnail URL; video IDs are encoded as a path segment.
  thumbnailEl.src =
    `/assets/images/video_thumbnails_l/${encodeURIComponent(videoId)}.jpg`;

  $('watch-video-info').addEventListener('click', () => {
    window.navigateTo('video', { v: videoId });
  });

  $('description-close').addEventListener('click', closeDescription);
  $('description-overlay').addEventListener('click', closeDescription);

  $('desc-link').addEventListener('click', async () => {
    const button = $('desc-link');
    button.disabled = true;

    try {
      const response = await fetch(
        `/api/description?videoID=${encodeURIComponent(videoId)}`
      );

      if (!response.ok) {
        throw new Error(`Description request failed (${response.status})`);
      }

      const data = await response.json();
      descriptionBody.textContent =
        data.description || 'No description available.';

      descriptionModal.classList.add('is-visible');
    } catch (error) {
      console.error('Failed to load video description:', error);
      descriptionBody.textContent = 'Unable to load the video description.';
      descriptionModal.classList.add('is-visible');
    } finally {
      button.disabled = false;
    }
  });

  function remToPx(rem) {
    return rem * parseFloat(
      getComputedStyle(document.documentElement).fontSize
    );
  }

  function setupPlayer() {
    if (typeof window.videojs !== 'function') {
      showError('The video player could not be loaded. Please refresh the page.');
      return;
    }

    const container = document.querySelector('.player-container');
    const header = $('player-header');

    if (!container) return;

    container.style.height = `${container.clientWidth * (9 / 16)}px`;

    player = window.videojs('player', { fill: true });

    player.src({
      src: `https://hls.claraoke-db.com/${encodeURIComponent(videoId)}/master.m3u8`,
      type: 'application/x-mpegURL',
    });

    player.ready(() => {
      const savedVolume = localStorage.getItem(storageVolume);
      const savedMuted = localStorage.getItem(storageMuted);

      player.volume(savedVolume !== null ? Number(savedVolume) : 0.5);

      if (savedMuted !== null) {
        player.muted(savedMuted === 'true');
      }

      player.on('volumechange', () => {
        localStorage.setItem(storageVolume, String(player.volume()));
        localStorage.setItem(storageMuted, String(player.muted()));
      });

      player.one('loadedmetadata', () => {
        if (startTime > 0) {
          player.currentTime(startTime);
        }

        // Autoplay may be blocked by the browser; playback controls remain available.
        const playResult = player.play();
        if (playResult && typeof playResult.catch === 'function') {
          playResult.catch(() => {});
        }

        const updateSize = () => {
          if (!player || player.isDisposed()) return;

          const videoWidth = player.videoWidth();
          const videoHeight = player.videoHeight();

          if (!videoWidth || !videoHeight) return;

          const calculatedHeight =
            container.clientWidth * (videoHeight / videoWidth);

          const isMobile = window.matchMedia('(max-width: 768px)').matches;
          const headerHeight = header.offsetHeight;

          const maxHeight = isMobile
            ? window.innerHeight - headerHeight - 2 * remToPx(1.5)
            : window.innerHeight - headerHeight -
              2 * remToPx(1.5) - 293 - 42 - 15;

          container.style.height =
            `${Math.max(160, Math.min(calculatedHeight, maxHeight))}px`;
        };

        resizeObserver = new ResizeObserver(updateSize);
        resizeObserver.observe(container);

        onWindowResize = updateSize;
        window.addEventListener('resize', onWindowResize);

        updateSize();
      });
    });
  }

  async function loadVideo() {
    try {
      const response = await fetch(
        `/api/video?videoID=${encodeURIComponent(videoId)}`,
        { cache: 'no-store' }
      );

      if (!response.ok) {
        throw new Error(`Video request failed (${response.status})`);
      }

      const data = await response.json();
      const video = data.video_info;
      const karaoke = data.karaoke_info;
      const songs = Array.isArray(data.songs) ? data.songs : [];

      if (!video) {
        throw new Error('This video could not be found.');
      }

      const song = songs.find(
        (item) => Number(item.START_SECONDS) === startTime
      );

      if (song) {
        titleEl.textContent = `${song.TITLE} - ${song.ARTIST}`;
        videoTitleEl.hidden = false;
        videoTitleEl.querySelector('span').textContent = video.TITLE || 'Unknown';
        songCountEl.hidden = true;
      } else {
        titleEl.textContent = video.TITLE || 'Untitled video';
        videoTitleEl.hidden = true;
        songCountEl.hidden = false;
        songCountEl.querySelector('span').textContent =
          karaoke?.NUM ?? songs.length;
      }

      thumbnailEl.alt = video.TITLE
        ? `Thumbnail for ${video.TITLE}`
        : 'Video thumbnail';
      thumbnailEl.title = video.TITLE || '';

      dateEl.textContent = data.date_aired || 'Unknown';

      setupPlayer();
    } catch (error) {
      console.error('Failed to load video:', error);
      showError(error.message || 'Unable to load this video.');
      titleEl.textContent = 'Video unavailable';
    }
  }

  loadVideo();
})();
