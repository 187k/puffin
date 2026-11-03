/* Puffin — interactions & animation helpers */
(() => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const palette = ['#F08C21', '#E36888', '#6698CC', '#F2D88F', '#A3AB3F'];

  /* ---------- Puff the mascot: clone template into placeholders ---------- */
  const tpl = document.getElementById('tpl-puffin');
  document.querySelectorAll('[data-puffin]').forEach((el) => {
    el.prepend(tpl.content.cloneNode(true));
  });

  /* ---------- Seamless marquees: duplicate track contents ---------- */
  document.querySelectorAll('[data-loop]').forEach((track) => {
    [...track.children].forEach((item) => {
      const clone = item.cloneNode(true);
      clone.setAttribute('aria-hidden', 'true');
      track.appendChild(clone);
    });
  });

  /* ---------- Nav, progress bar, how-it-works path ---------- */
  const nav = document.querySelector('.nav');
  const toggle = nav.querySelector('.nav-toggle');
  const progress = document.querySelector('.progress');
  const steps = document.querySelector('.steps');
  const maskPath = document.getElementById('howMaskPath');
  let lastY = window.scrollY;
  let ticking = false;

  const updateHowPath = () => {
    if (!steps || !maskPath) return;
    const r = steps.getBoundingClientRect();
    const start = window.innerHeight * 0.85;
    const p = Math.min(1, Math.max(0, (start - r.top) / (r.height + window.innerHeight * 0.25)));
    maskPath.style.strokeDashoffset = String(1 - (reduceMotion ? 1 : p * 1.15));
  };

  const onScroll = () => {
    const y = window.scrollY;
    nav.classList.toggle('is-scrolled', y > 20);
    const goingDown = y > lastY;
    nav.classList.toggle('is-hidden', goingDown && y > 500 && !nav.classList.contains('is-open'));
    lastY = y;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    progress.style.transform = `scaleX(${max > 0 ? y / max : 0})`;
    updateHowPath();
    ticking = false;
  };
  window.addEventListener('scroll', () => {
    if (!ticking) { requestAnimationFrame(onScroll); ticking = true; }
  }, { passive: true });
  onScroll();

  const closeMenu = () => {
    nav.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Open menu');
  };
  toggle.addEventListener('click', () => {
    const open = nav.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  });
  nav.querySelectorAll('.nav-menu a').forEach((a) => a.addEventListener('click', closeMenu));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });
  document.addEventListener('click', (e) => { if (!nav.contains(e.target)) closeMenu(); });

  /* ---------- Reveal on scroll + count-ups ---------- */
  const fmt = (n, d) => n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
  const countUp = (el) => {
    const target = parseFloat(el.dataset.count);
    const dec = parseInt(el.dataset.decimals || '0', 10);
    if (reduceMotion) { el.textContent = fmt(target, dec); return; }
    const dur = 1600;
    const t0 = performance.now();
    const step = (t) => {
      const p = Math.min(1, (t - t0) / dur);
      el.textContent = fmt(target * (1 - Math.pow(1 - p, 3)), dec);
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-in');
      entry.target.querySelectorAll('[data-count]').forEach(countUp);
      io.unobserve(entry.target);
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });
  document.querySelectorAll('[data-reveal]').forEach((el) => io.observe(el));

  /* ---------- Hero phone: tick off today's tasks on a loop ---------- */
  const tasks = [...document.querySelectorAll('.phone .task')];
  const taskCount = document.querySelector('.phone .task-count');
  if (tasks.length && !reduceMotion) {
    let done = 1;
    setInterval(() => {
      if (done < tasks.length) {
        tasks[done].classList.add('is-done');
        done += 1;
      } else {
        tasks.slice(1).forEach((t) => t.classList.remove('is-done'));
        done = 1;
      }
      taskCount.textContent = `${done} of ${tasks.length} done`;
    }, 2200);
  }

  /* ---------- Hero: parallax + paw-print trail ---------- */
  const hero = document.querySelector('.hero');
  const art = document.querySelector('.hero-art');
  if (finePointer && !reduceMotion && hero) {
    hero.addEventListener('pointermove', (e) => {
      const r = art.getBoundingClientRect();
      const mx = ((e.clientX - (r.left + r.width / 2)) / r.width);
      const my = ((e.clientY - (r.top + r.height / 2)) / r.height);
      art.style.setProperty('--mx', Math.max(-1, Math.min(1, mx)).toFixed(3));
      art.style.setProperty('--my', Math.max(-1, Math.min(1, my)).toFixed(3));
    });
    hero.addEventListener('pointerleave', () => {
      art.style.setProperty('--mx', 0);
      art.style.setProperty('--my', 0);
    });

    let px = -999;
    let py = -999;
    let side = 1;
    let colorIdx = 0;
    hero.addEventListener('pointermove', (e) => {
      const r = hero.getBoundingClientRect();
      const x = e.clientX - r.left;
      const y = e.clientY - r.top;
      const dist = Math.hypot(x - px, y - py);
      if (dist < 64) return;
      const angle = Math.atan2(y - py, x - px);
      px = x; py = y;
      side *= -1;
      // offset left/right of the travel direction, like real footsteps
      const ox = Math.cos(angle + Math.PI / 2) * 9 * side;
      const oy = Math.sin(angle + Math.PI / 2) * 9 * side;
      const paw = document.createElement('span');
      paw.className = 'paw-print';
      paw.style.left = `${x + ox}px`;
      paw.style.top = `${y + oy}px`;
      paw.style.setProperty('--r', `${(angle * 180) / Math.PI + 90}deg`);
      paw.style.color = palette[colorIdx++ % palette.length];
      paw.innerHTML = '<svg viewBox="0 0 64 64"><use href="#d-paw"/></svg>';
      paw.addEventListener('animationend', () => paw.remove());
      hero.appendChild(paw);
    });
  }

  /* ---------- Mascot: jump + heart burst on click ---------- */
  const burst = (host) => {
    for (let i = 0; i < 6; i += 1) {
      const h = document.createElement('span');
      h.className = 'heart-pop';
      h.style.setProperty('--x', `${(Math.random() - 0.5) * 140}px`);
      h.style.setProperty('--r', `${(Math.random() - 0.5) * 70}deg`);
      h.style.color = palette[i % palette.length];
      h.style.animationDelay = `${i * 50}ms`;
      h.innerHTML = '<svg viewBox="0 0 100 100"><use href="#d-heart"/></svg>';
      h.addEventListener('animationend', () => h.remove());
      host.appendChild(h);
    }
  };
  document.querySelectorAll('.mascot').forEach((m) => {
    m.addEventListener('click', () => {
      m.classList.remove('is-jump');
      void m.offsetWidth; // restart animation
      m.classList.add('is-jump');
      if (!reduceMotion) burst(m);
    });
    m.addEventListener('animationend', (e) => {
      if (e.animationName === 'pf-jump') m.classList.remove('is-jump');
    });
  });

  /* ---------- FAQ accordion ---------- */
  const items = [...document.querySelectorAll('.faq-item')];
  items.forEach((item) => {
    const btn = item.querySelector('.faq-q');
    btn.addEventListener('click', () => {
      const willOpen = !item.classList.contains('is-open');
      items.forEach((other) => {
        other.classList.remove('is-open');
        other.querySelector('.faq-q').setAttribute('aria-expanded', 'false');
      });
      if (willOpen) {
        item.classList.add('is-open');
        btn.setAttribute('aria-expanded', 'true');
      }
    });
  });

  /* ---------- Footer year ---------- */
  const year = document.querySelector('[data-year]');
  if (year) year.textContent = new Date().getFullYear();
})();
