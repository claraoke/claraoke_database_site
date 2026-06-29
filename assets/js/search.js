(function () {
  const form = document.getElementById('searchForm');
  const input = document.getElementById('searchQuery');
  const resultsBody = document.getElementById('resultsBody');
  const progress = document.getElementById('progress');
  const resultsStats = document.getElementById('resultsStats');
  const table = document.getElementById('resultsTable');
  const tbody = document.getElementById('resultsBody');

  // ─── Table resize ─────────────────────────────────────────────────────────
  function resizeTable() {
    const container = document.getElementById('resultsContainer');
    if (!container || !table) return;

    const containerWidth = Math.min(container.offsetWidth, 1000);
    const col3Width = 110;
    const col4Width = 65;
    const maxCol1Col2 = 825;
    const minCol1Width = 250;
    const maxCol1Width = 500;

    const ctx = document.createElement('canvas').getContext('2d');
    ctx.font = getComputedStyle(table).font;

    let maxContentWidth = 0;
    table.querySelectorAll('tr').forEach((row) => {
      const cell = row.children[0];
      if (!cell) return;
      const text = cell.innerText || cell.textContent;
      const width = ctx.measureText(text).width + 20;
      if (width > maxContentWidth) maxContentWidth = width;
    });

    let col1Width = Math.min(
      Math.max(maxContentWidth, minCol1Width),
      maxCol1Width
    );
    let remaining = containerWidth - col3Width - col4Width;
    let col2Width = remaining - col1Width;

    if (col1Width + col2Width > maxCol1Col2) {
      col2Width = maxCol1Col2 - col1Width;
    }
    col2Width = Math.max(col2Width, 0);

    table.querySelectorAll('tr').forEach((row) => {
      const cells = row.children;
      if (cells.length < 4) return;
      cells[0].style.width = col1Width + 'px';
      cells[1].style.width = col2Width + 'px';
      cells[2].style.width = col3Width + 'px';
      cells[3].style.width = col4Width + 'px';
    });
  }

  // ─── Loading state ────────────────────────────────────────────────────────
  function setLoading(on) {
    progress.classList.toggle('is-active', on);
  }

  // ─── Render rows ──────────────────────────────────────────────────────────
  let hasSearched = false;

  function renderRows(items) {
    resultsBody.innerHTML = '';

    if (!items || !items.length) {
      resultsBody.innerHTML = `<tr><td colspan="4">${
        hasSearched ? 'No results' : 'Enter a query to begin.'
      }</td></tr>`;
      return;
    }

    hasSearched = true;

    for (const item of items) {
      const mainRow = document.createElement('tr');
      mainRow.className = 'main-row';
      mainRow.innerHTML = `
        <td class="col-song"><span class="truncate" title="${item.song} / ${item.artist}">${item.song} / ${item.artist}</span></td>
        <td class="col-video"><a class="full-link" onclick="navigateTo('video', {v: '${item.videoid}'})"><span class="truncate" title="${item.video}">${item.video}</span></a></td>
        <td class="col-date">${item.date}</td>
        <td class="col-link"><a class="full-link" onclick="navigateTo('watch', {v: '${item.videoid}', t: '${item.start_seconds}'})">Watch</a></td>
      `;

      const expandableRow = document.createElement('tr');
      expandableRow.className = 'expandable-row';
      expandableRow.innerHTML = `
        <td colspan="4">
          <div><strong>Stream:</strong> <a class="link" onclick="navigateTo('video', {v: '${item.videoid}'})">${item.video}</a></div>
          <div><strong>Date:</strong> ${item.date}</div>
          <div class="expandable-actions">
            <button class="btn btn--outline" onclick="navigateTo('watch', {v: '${item.videoid}', t: '${item.start_seconds}'})">
              Watch Song
            </button>
          </div>
        </td>
      `;

      resultsBody.appendChild(mainRow);
      resultsBody.appendChild(expandableRow);

      mainRow.addEventListener('click', () => {
        expandableRow.classList.toggle('is-visible');
      });
    }
  }

  // ─── Result stats ─────────────────────────────────────────────────────────
  function displayStats(data) {
    if (!data || !data.items || data.items.length === 0) {
      resultsStats.innerHTML = '';
      return;
    }
    const total = data.count || 0;
    const query = data.query || '';
    resultsStats.innerHTML = `<strong>${total}</strong> result${
      total !== 1 ? 's' : ''
    } for "<em>${query}</em>"`;
  }

  // ─── Search ───────────────────────────────────────────────────────────────
  async function doSearch(q) {
    if (!q) return;
    hasSearched = true;
    setLoading(true);

    try {
      const res = await fetch('php/search.php', {
        // root-relative
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ q }),
      });
      if (!res.ok) throw new Error('Network error');
      const data = await res.json();
      displayStats(data || []);
      renderRows(data.items || []);

      if (window.matchMedia('(min-width: 769px)').matches) {
        resizeTable();
      } else {
        document.querySelectorAll('.col-song').forEach((col) => {
          col.colSpan = 4;
        });
      }
    } catch (err) {
      console.error(err);
      displayStats([]);
      renderRows([]);
    } finally {
      setLoading(false);
    }
  }

  // ─── Form submit ──────────────────────────────────────────────────────────
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const q = input.value.trim();
      // Update the URL so it's shareable
      const qs = new URLSearchParams({ q }).toString();
      window.history.pushState(
        { page: 'search', params: { q } },
        '',
        `/search?${qs}`
      );
      doSearch(q);
    });
  }

  // ─── Sorting ──────────────────────────────────────────────────────────────
  if (table) {
    const headers = table.querySelectorAll('thead th');

    headers.forEach((header, index) => {
      const type = header.getAttribute('data-type');
      const sortable = header.getAttribute('data-sortable');

      if (type === 'date' || (type === 'string' && sortable === 'true')) {
        header.style.cursor = 'pointer';

        header.addEventListener('click', () => {
          const rows = Array.from(tbody.querySelectorAll('.main-row'));
          const isAsc = header.classList.contains('sorted-asc');

          rows.sort((a, b) => {
            let aText = a.children[index].textContent.trim();
            let bText = b.children[index].textContent.trim();

            if (type === 'number') {
              return isAsc
                ? (parseFloat(bText) || 0) - (parseFloat(aText) || 0)
                : (parseFloat(aText) || 0) - (parseFloat(bText) || 0);
            }
            if (type === 'date') {
              return isAsc
                ? new Date(bText) - new Date(aText)
                : new Date(aText) - new Date(bText);
            }
            if (type === 'string') {
              return isAsc
                ? bText.localeCompare(aText)
                : aText.localeCompare(bText);
            }
            return 0;
          });

          headers.forEach((h) =>
            h.classList.remove('sorted-asc', 'sorted-desc')
          );
          header.classList.toggle('sorted-asc', !isAsc);
          header.classList.toggle('sorted-desc', isAsc);

          rows.forEach((row) => tbody.appendChild(row));
          rows.forEach((row, i) => {
            row.style.backgroundColor = i % 2 === 0 ? '#0375d8' : '#1086ef';
          });
        });
      }
    });
  }

  // ─── Boot: run search if ?q= is in the URL ────────────────────────────────
  const rawQuery = new URLSearchParams(window.location.search).get('q');
  if (rawQuery) {
    if (input) input.value = rawQuery; // URLSearchParams.get() already decodes %20 → space
    doSearch(rawQuery);
  }
})();
