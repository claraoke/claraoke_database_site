(function () {
  // ─── Page map: clean URL slug → HTML file path ──────────────────────────
  const PAGE_MAP = {
    home: 'pages/home.html',
    search: 'pages/search.html',
    videolist: 'pages/videolist.html',
    about: 'pages/about.html',
    video: 'pages/video.html',
    watch: 'php/watch.php',
  };
  const DEFAULT_PAGE = 'home';

  // ─── Element refs ────────────────────────────────────────────────────────
  const yearEl = document.getElementById('year');
  const content = document.getElementById('main-content');
  const navLinks = document.querySelectorAll('.nav__link[data-page]');
  const menuToggle = document.querySelector('.menu-toggle');
  const sidebar = document.getElementById('sidebar');

  if (yearEl) yearEl.textContent = new Date().getFullYear();

  function remToPx(rem) {
    // Get the actual font size of the root element (html)
    const rootFontSize = parseFloat(
      getComputedStyle(document.documentElement).fontSize
    );
    return rem * rootFontSize;
  }

  // Set content area width
  function setContentWidth() {
    const browserWidth = window.innerWidth;
    const sidebarWidth = sidebar ? sidebar.offsetWidth : 0;
    const maxWidth = 1400;
    const gapWidth = remToPx(1.5);
    const padding = 2 * remToPx(1.5);
    const mainWrap = document.querySelector('.main-wrap');
    const content = document.getElementById('main-content');
    if (!mainWrap || !content) return;

    const layoutWidth = Math.min(browserWidth, maxWidth);
    const width = layoutWidth - sidebarWidth - gapWidth - padding;
    const contentWidth = width - 42; // border (2px) + padding (40px)

    mainWrap.style.width = width + 'px';
    content.style.width = contentWidth + 'px';
  }
  // Inject <head> assets, return a promise that resolves when all external scripts are loaded
  function injectHeadAssets(doc) {
    const promises = [];

    doc.head
      .querySelectorAll('link[rel="stylesheet"], script[src]')
      .forEach((el) => {
        const attr = el.tagName === 'LINK' ? 'href' : 'src';
        const val = el.getAttribute(attr);
        const abs = new URL(val, document.baseURI).href;

        const already = [...document.querySelectorAll(`[${attr}]`)].some(
          (existing) =>
            new URL(existing.getAttribute(attr), document.baseURI).href === abs
        );

        if (already) return;

        const clone = document.createElement(el.tagName);
        [...el.attributes].forEach((a) => clone.setAttribute(a.name, a.value));

        // For scripts, wait for them to load before resolving
        if (el.tagName === 'SCRIPT') {
          promises.push(
            new Promise((resolve, reject) => {
              clone.onload = resolve;
              clone.onerror = reject;
            })
          );
        }

        document.head.appendChild(clone);
      });

    return Promise.all(promises);
  }

  // ─── Fetch an HTML file and inject its <body> into #main-content ─────────
  async function loadPage(filePath) {
    // Destroy any videojs instance before wiping the DOM
    if (window.videojs) {
      const existingPlayer = videojs.getPlayer('player');
      if (existingPlayer) existingPlayer.dispose();
    }

    content.classList.add('is-loading');

    try {
      const res = await fetch(filePath);
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      const html = await res.text();
      const doc = new DOMParser().parseFromString(html, 'text/html');

      // Wait for any new head scripts to finish loading before continuing
      await injectHeadAssets(doc);

      content.innerHTML = doc.body.innerHTML;

      // Now safe to re-run body scripts — dependencies are ready
      content.querySelectorAll('script').forEach((oldScript) => {
        const newScript = document.createElement('script');
        [...oldScript.attributes].forEach((attr) =>
          newScript.setAttribute(attr.name, attr.value)
        );
        if (oldScript.getAttribute('src')) {
          newScript.src =
            oldScript.getAttribute('src').split('?')[0] + '?t=' + Date.now();
        } else {
          newScript.textContent = oldScript.textContent;
        }
        oldScript.replaceWith(newScript);
      });

      setContentWidth();
    } catch (err) {
      content.innerHTML = `<p class="load-error">Failed to load page. Please try again.</p>`;
      console.error('Page load error:', err);
    } finally {
      content.classList.remove('is-loading');
    }
  }

  // ─── Navigate: push URL + load matching page ─────────────────────────────
  window.navigateTo = function (page, params = {}) {
    if (!PAGE_MAP[page]) page = DEFAULT_PAGE;

    const qs = new URLSearchParams(params).toString();
    const filePath = PAGE_MAP[page] + (qs ? '?' + qs : '');
    const cleanUrl = '/' + page + (qs ? '?' + qs : '');

    window.history.pushState({ page, params }, '', cleanUrl);
    updateActiveNav(page);
    loadPage(filePath);
  };

  // ─── Read current URL and load the right page (initial load + popstate) ──
  function loadFromUrl() {
    const slug = window.location.pathname.replace(/^\//, '') || DEFAULT_PAGE;
    const page = PAGE_MAP[slug] ? slug : DEFAULT_PAGE;
    const params = Object.fromEntries(
      new URLSearchParams(window.location.search)
    );

    const qs = new URLSearchParams(params).toString();
    const filePath = PAGE_MAP[page] + (qs ? '?' + qs : '');

    updateActiveNav(page);
    loadPage(filePath);
  }

  // ─── Highlight the matching nav link ─────────────────────────────────────
  function updateActiveNav(page) {
    navLinks.forEach((link) =>
      link.classList.toggle('is-active', link.dataset.page === page)
    );
  }

  // ─── Nav link clicks ──────────────────────────────────────────────────────
  navLinks.forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      navigateTo(link.dataset.page);

      // Close sidebar on mobile when navigating
      if (sidebar.classList.contains('is-open')) {
        sidebar.classList.remove('is-open');
        menuToggle.setAttribute('aria-expanded', 'false');
        setContentWidth();
      }
    });
  });

  // ─── Browser back / forward ───────────────────────────────────────────────
  window.addEventListener('popstate', loadFromUrl);

  // ─── Resize elements ──────────────────────────────────────────────────────
  window.addEventListener('resize', setContentWidth);

  // ─── Mobile menu toggle ───────────────────────────────────────────────────
  if (menuToggle && sidebar) {
    menuToggle.addEventListener('click', () => {
      const isOpen = sidebar.classList.toggle('is-open');
      menuToggle.setAttribute('aria-expanded', String(isOpen));
      setContentWidth();
    });
  }

  // ─── Boot ────────────────────────────────────────────────────────────────
  setContentWidth();
  loadFromUrl();
})();
