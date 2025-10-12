/* Fetch latest Facebook photos via Cloudflare Pages Function and render a carousel */
(function () {
  const el = document.getElementById('fb-carousel');
  if (!el) return;

  const limit = Number(el.getAttribute('data-limit') || 10);
  const track = el.querySelector('.carousel-track');
  const btnPrev = el.querySelector('.prev');
  const btnNext = el.querySelector('.next');
  const fallback = document.getElementById('fb-carousel-fallback');

  function buildItems(items) {
    items.forEach((item) => {
      const li = document.createElement('div');
      li.className = 'carousel-item';
      li.setAttribute('role', 'listitem');
      const a = document.createElement('a');
      a.href = item.permalink || '#';
      a.target = '_blank';
      a.rel = 'noopener';
      const img = document.createElement('img');
      img.src = item.src;
      img.alt = item.alt || 'Facebook photo';
      a.appendChild(img);
      li.appendChild(a);
      track.appendChild(li);
    });
  }

  function attachNav() {
    const viewport = el.querySelector('.carousel-viewport');
    const scrollBy = () => Math.max(220, viewport.clientWidth * 0.9);
    btnPrev.addEventListener('click', () => viewport.scrollBy({ left: -scrollBy(), behavior: 'smooth' }));
    btnNext.addEventListener('click', () => viewport.scrollBy({ left: scrollBy(), behavior: 'smooth' }));

    // basic swipe support
    let startX = 0; let isDown = false;
    viewport.addEventListener('pointerdown', (e) => { isDown = true; startX = e.clientX; viewport.setPointerCapture(e.pointerId); });
    viewport.addEventListener('pointerup', (e) => {
      if (!isDown) return; isDown = false;
      const dx = e.clientX - startX;
      if (Math.abs(dx) > 40) viewport.scrollBy({ left: dx > 0 ? -scrollBy() : scrollBy(), behavior: 'smooth' });
    });
  }

  async function init() {
    try {
      const apiBase = (window.FB_API_BASE) ? String(window.FB_API_BASE)
        : (location.protocol === 'file:' ? 'http://127.0.0.1:8788' : '');
      const res = await fetch(`${apiBase}/api/facebook/photos?limit=${encodeURIComponent(limit)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!Array.isArray(data) || data.length === 0) throw new Error('No photos');
      buildItems(data);
      attachNav();
      if (fallback) fallback.style.display = 'none';
    } catch (err) {
      // graceful fallback: keep the Facebook link visible
      console.warn('FB carousel failed:', err);
    }
  }

  init();
})();
