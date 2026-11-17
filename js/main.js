/* Puffin — interactions */
(() => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Nav: scrolled state + mobile menu ---------- */
  const nav = document.querySelector('.nav');
  const toggle = nav.querySelector('.nav-toggle');
  let ticking = false;

  const onScroll = () => {
    nav.classList.toggle('is-scrolled', window.scrollY > 12);
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

  /* ---------- Banner carousel ---------- */
  const banner = document.querySelector('.banner');
  if (banner) {
    const slides = [...banner.querySelectorAll('.banner-slide')];
    const dots = [...banner.querySelectorAll('.banner-dots button')];
    let cur = 0;
    let timer;
    const go = (n) => {
      cur = (n + slides.length) % slides.length;
      slides.forEach((s, i) => {
        s.classList.toggle('is-active', i === cur);
        s.querySelector('img').loading = 'eager';
      });
      dots.forEach((d, i) => d.setAttribute('aria-selected', String(i === cur)));
    };
    const stop = () => clearInterval(timer);
    const play = () => { stop(); if (!reduceMotion) timer = setInterval(() => go(cur + 1), 6000); };
    banner.querySelector('.banner-prev').addEventListener('click', () => { go(cur - 1); play(); });
    banner.querySelector('.banner-next').addEventListener('click', () => { go(cur + 1); play(); });
    dots.forEach((d, i) => d.addEventListener('click', () => { go(i); play(); }));
    banner.addEventListener('mouseenter', stop);
    banner.addEventListener('mouseleave', play);
    let x0 = null;
    banner.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; }, { passive: true });
    banner.addEventListener('touchend', (e) => {
      if (x0 === null) return;
      const dx = e.changedTouches[0].clientX - x0;
      if (Math.abs(dx) > 40) { go(cur + (dx < 0 ? 1 : -1)); play(); }
      x0 = null;
    });
    play();
  }

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
