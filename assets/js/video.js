(function () {
  const videoContainer = document.getElementById('video-container');
  const videoTitle = document.getElementById('video-title');
  const videoThumbnail = document.getElementById('video-thumbnail');
  const videoDate = document.getElementById('video-date');
  const videoSongsCount = document.getElementById('video-songs-count');
  const videoLinkBtn = document.getElementById('video-link-btn');
  const descLinkBtn = document.getElementById('desc-link-btn');
  const songListBody = document.getElementById('song-list-body');
  const tableContainer = document.getElementsByClassName('table-container')[0];
  const descLink = document.getElementById('desc-link');

  const urlParams = new URLSearchParams(window.location.search);
  const videoID = urlParams.get('v');

  if (!videoID) {
    videoContainer.innerHTML = '<h2>No videoID provided</h2>';
    return;
  }

  async function loadVideo() {
    try {
      const res = await fetch(
        `/api/video?videoID=${encodeURIComponent(videoID)}`,
        { cache: 'no-store' }
      );
      if (!res.ok) {
        throw new Error('Network response was not ok');
      }
      const data = await res.json();

      if (data.error) {
        throw new Error(data.error);
      }

      videoTitle.textContent = data.video_info.TITLE || 'Unknown Title';

      const thumbnail_url = `assets/images/video_thumbnails_l/${encodeURIComponent(videoID)}.jpg`;
      videoThumbnail.innerHTML = `<img src="${thumbnail_url}" alt="Video Thumbnail" width="200px" height="113px" title="${data.video_info.TITLE || ''}" />`;

      videoDate.textContent = data.date_aired || 'Unknown';
      videoSongsCount.textContent = data.karaoke_info.NUM || 0;

      if (videoLinkBtn) {
        videoLinkBtn.onclick = () => navigateTo('watch', { v: videoID });
      }

      if (descLinkBtn) {
        descLinkBtn.addEventListener('click', async (e) => {
          e.preventDefault();
          const res = await fetch(
            `/api/description?videoID=${encodeURIComponent(videoID)}`
          );
          if (!res.ok) throw new Error('Network response was not ok');

          const data = await res.json();

          document.getElementById('description-body').textContent =
            data.description || 'No description available.';
          document.getElementById('description-modal').style.display = 'block';
        });
      }

      // Close modal
      const closeBtn = document.getElementById('description-close');
      if (closeBtn) {
        closeBtn.addEventListener('click', () => {
          document.getElementById('description-modal').style.display = 'none';
        });
      }
      const overlay = document.getElementById('description-overlay');
      if (overlay) {
        overlay.addEventListener('click', () => {
          document.getElementById('description-modal').style.display = 'none';
        });
      }

      songListBody.innerHTML = ''; // Clear existing rows
      if (data.songs && data.songs.length > 0) {
        data.songs.forEach((song) => {
          const mainRow = document.createElement('tr');
          mainRow.className = 'main-row';
          mainRow.innerHTML = `
            <td class="col-song"><span class="truncate" title="${song.TITLE} / ${song.ARTIST}">${song.TITLE} / ${song.ARTIST}</span></td>
            <td class="col-link clickable-cell"><a class="full-link" onclick="navigateTo('watch', {v: '${videoID}', t: '${song.START_SECONDS}'})">Watch</a></td>
          `;

          const expandableRow = document.createElement('tr');
          expandableRow.className = 'expandable-row';
          expandableRow.innerHTML = `
            <td colspan="2">
              <div class="expandable-actions">
                <button class="btn btn--outline" onclick="navigateTo('watch', {v: '${videoID}', track: '${song.TRACK}', t: '${song.START_SECONDS}'})">
                  Watch Song
                </button>
              </div>
            </td>
          `;

          songListBody.appendChild(mainRow);
          songListBody.appendChild(expandableRow);

          mainRow.addEventListener('click', () => {
            expandableRow.classList.toggle('is-visible');
          });
        });

        if (!window.matchMedia('(min-width: 769px)').matches) {
          // Override style max-height
          tableContainer.style.maxHeight = 'calc(100vh - 350px)';
        }
      } else {
        const row = document.createElement('tr');
        row.innerHTML = `<td colspan="2">No songs found for this video.</td>`;
        songListBody.appendChild(row);
      }
    } catch (err) {
      videoContainer.innerHTML = `<h2>Error loading video: ${err.message}</h2>`;
    }
  }

  loadVideo();
})();
