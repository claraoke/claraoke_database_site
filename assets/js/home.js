(function () {
  const stats = document.getElementById('stats');

  function escapeAttr(str) {
    return str.replace(/'/g, "\\'");
  }

  function displayStats(data) {
    function formatDuration(duration) {
      const days = Math.floor(duration / 86400);
      const hours = Math.floor((duration % 86400) / 3600);
      const minutes = Math.floor((duration % 3600) / 60);
      const seconds = duration % 60;
      return `${days} days, ${hours} hours, ${minutes} minutes, ${seconds} seconds`;
    }

    function listArtists(artists) {
      let list = '<ol>';
      for (const artist of artists) {
        const name = artist[1].artist;
        list += `<li>
          <a class="video-link" onclick="navigateTo('search', {q: '${escapeAttr(name)}'})">
            ${name}
          </a> - ${artist[1].count} songs
        </li>`;
      }
      list += '</ol>';
      return list;
    }

    function listSongs(songs) {
      let list = '<ol>';
      for (const song of songs) {
        const title = song[1].title;
        const artist = song[1].artist;
        list += `<li>
          <a class="video-link" onclick="navigateTo('search', {q: '${escapeAttr(title)}'})">
            ${title} by ${artist}
          </a> - ${song[1].count} times
        </li>`;
      }
      list += '</ol>';
      return list;
    }

    const generationTime = new Date(parseFloat(data.generated_at) * 1000);
    const updateTime = generationTime
      .toISOString()
      .replace('T', ' ')
      .replace(/\..+/, '');

    const section = document.createElement('section');
    section.innerHTML = `
      <span style="font-weight: bold; font-size: 1.25rem">Database Statistics</span>
      <small>(Generated ${updateTime} UTC)</small>
      <ul>
        <li>Total Videos: <strong>${data.total_videos}</strong></li>
        <li>Total Songs: <strong>${data.total_songs}</strong></li>
        <li>Total Duration of All Songs: <strong>${formatDuration(data.total_duration)}</strong></li>
      </ul>
      <h4>Top 10 Artists</h4>
      ${listArtists(data.top_artists)}
      <h4>Top 10 Songs</h4>
      ${listSongs(data.top_songs)}
    `;

    stats.innerHTML = '';
    stats.appendChild(section);
  }

  async function loadStats() {
    const wrapper = document.createElement('div');
    wrapper.className = 'loading-wrapper';

    const spinner = document.createElement('span');
    spinner.className = 'spinner';

    const text = document.createElement('span');
    text.textContent = 'Loading stats...';

    wrapper.appendChild(spinner);
    wrapper.appendChild(text);

    stats.innerHTML = '';
    stats.appendChild(wrapper);
    stats.setAttribute('aria-busy', 'true');

    try {
      const res = await fetch('data/stats.json', { cache: 'default' }); // root-relative
      if (!res.ok) throw new Error('Network error');
      const data = await res.json();
      displayStats(data || []);
      stats.setAttribute('aria-busy', 'false');
    } catch (err) {
      stats.innerHTML = `Error loading stats. ${err.message}`;
    }
  }

  loadStats();
})();
