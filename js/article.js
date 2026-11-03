/* Puffin Journal — table-of-contents highlight + share buttons */
(() => {
  /* ---------- Highlight the sign currently being read ---------- */
  const links = [...document.querySelectorAll('.toc ol a')];
  const sections = links.map((a) => document.querySelector(a.getAttribute('href'))).filter(Boolean);
  if (sections.length) {
    let ticking = false;
    // the active sign is the last one whose top has passed 40% of the viewport
    const update = () => {
      const line = window.innerHeight * 0.4;
      let current = null;
      sections.forEach((s) => { if (s.getBoundingClientRect().top <= line) current = s; });
      links.forEach((a) => a.classList.toggle('is-active', !!current && a.getAttribute('href') === `#${current.id}`));
      ticking = false;
    };
    window.addEventListener('scroll', () => {
      if (!ticking) { requestAnimationFrame(update); ticking = true; }
    }, { passive: true });
    update();
  }

  /* ---------- Share ---------- */
  const url = window.location.href.split('#')[0];

  const copyBtn = document.querySelector('[data-copy-link]');
  if (copyBtn) {
    const label = copyBtn.querySelector('span');
    const original = label.textContent;
    const fallbackCopy = () => {
      const area = document.createElement('textarea');
      area.value = url;
      area.setAttribute('readonly', '');
      area.style.cssText = 'position:fixed;opacity:0';
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand('copy');
      area.remove();
      return ok;
    };
    copyBtn.addEventListener('click', async () => {
      let ok;
      try {
        await navigator.clipboard.writeText(url);
        ok = true;
      } catch {
        ok = fallbackCopy();
      }
      label.textContent = ok ? 'Tautan disalin!' : 'Gagal menyalin';
      setTimeout(() => { label.textContent = original; }, 2000);
    });
  }

  const wa = document.querySelector('[data-whatsapp]');
  if (wa) wa.href = `https://wa.me/?text=${encodeURIComponent(`${document.title} ${url}`)}`;

  // native share sheet (mostly phones) — only shown where supported
  const shareBtn = document.querySelector('[data-share]');
  if (shareBtn && navigator.share) {
    shareBtn.hidden = false;
    shareBtn.addEventListener('click', () => {
      navigator.share({ title: document.title, url }).catch(() => { /* user closed the sheet */ });
    });
  }
})();
