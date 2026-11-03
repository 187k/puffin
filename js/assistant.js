/* Ask Puff — a free, API-less chat demo.
   Questions are matched against js/puff-knowledge.js right in the browser,
   and visitors get FREE_LIMIT answered questions before Puff points them
   to the app. Add ?resetchat to the URL to reset the limit while testing. */
(() => {
  const KB = window.PuffKnowledge;
  const chat = document.getElementById('chat');
  if (!KB || !chat) return;

  const FREE_LIMIT = 3;
  const STORE_KEY = 'puffin-ask-v1';
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* =========================================================
     Brain: normalize → score intents → pick an answer
     ========================================================= */
  const STOP = new Set(('a an the is are am was were be been being my your our their his her its i me we you it this that '
    + 'these those to of for in on at with and or but do does did can could should would will shall may might must how what '
    + 'when why where which who whom much many often any some there they them he she him so if about just get got has have '
    + 'had as by from up out yes ok okay please hi hey hello really very too also still ever need needs').split(' '));

  const FILLER = new Set(['same', 'instead', 'then', 'now', 'one', 'and', 'or', 'like', 'mine', 'kind', 'type']);

  const normalize = (s) => ` ${s.toLowerCase().replace(/[’'`]/g, '').replace(/[^a-z0-9]+/g, ' ').trim()} `;

  const stem = (w) => {
    if (w.length > 4 && w.endsWith('ies')) return `${w.slice(0, -3)}y`;
    if (w.length > 4 && /(ches|shes|sses|xes|oes)$/.test(w)) return w.slice(0, -2);
    if (w.length > 3 && w.endsWith('s') && !/(ss|us)$/.test(w)) return w.slice(0, -1);
    return w;
  };

  const lev = (a, b) => {
    let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
    for (let i = 1; i <= a.length; i += 1) {
      const cur = [i];
      for (let j = 1; j <= b.length; j += 1) {
        cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      }
      prev = cur;
    }
    return prev[b.length];
  };

  const parse = (raw) => {
    const n = normalize(raw);
    const words = n.trim().split(' ').filter(Boolean);
    return {
      n,
      ns: ` ${words.map(stem).join(' ')} `,
      tokens: words.filter((w) => !STOP.has(w)).map(stem),
    };
  };

  // 2 = exact word, 1.5 = typo-tolerant match ("choclate"), 0 = no match
  const wordScore = (token, w) => {
    if (token === w) return 2;
    if (w.length < 6) return 0;
    const max = w.length >= 9 ? 2 : 1;
    return token[0] === w[0] && Math.abs(token.length - w.length) <= max && lev(token, w) <= max ? 1.5 : 0;
  };

  // 3 = phrase found, otherwise the best word match
  const phraseCache = new Map();
  const termScore = (q, term) => {
    if (term.includes(' ')) {
      if (!phraseCache.has(term)) phraseCache.set(term, parse(term).ns);
      return q.ns.includes(phraseCache.get(term)) ? 3 : 0;
    }
    const w = stem(term);
    return Math.max(0, ...q.tokens.map((t) => wordScore(t, w)));
  };

  const detectSpecies = (q) => {
    const hit = Object.entries(KB.species).find(([, words]) => words.some((w) => termScore(q, w)));
    return hit ? hit[0] : null;
  };

  // Each word in the question counts once per intent, so related keys
  // ("vaccine", "vaccinate") can't stack up and outvote a better topic.
  const intentScore = (intent, q, sp) => {
    if (intent.only && !intent.only.includes(sp)) return 0;
    if (!intent.prepared) {
      const split = (list = []) => ({
        phrases: list.filter((k) => k.includes(' ')),
        words: list.filter((k) => !k.includes(' ')).map(stem),
      });
      intent.prepared = { keys: split(intent.keys), weak: split(intent.weak) };
    }
    const { keys, weak } = intent.prepared;
    let s = 0;
    keys.phrases.forEach((p) => { s += termScore(q, p); });
    weak.phrases.forEach((p) => { if (termScore(q, p)) s += 1; });
    q.tokens.forEach((t) => {
      const strong = Math.max(0, ...keys.words.map((w) => wordScore(t, w)));
      s += strong || (weak.words.some((w) => wordScore(t, w)) ? 1 : 0);
    });
    (intent.patterns || []).forEach((re) => { if (re.test(q.n)) s += 3; });
    return s;
  };

  const findFood = (q) => {
    let best = null;
    let bestScore = 0;
    KB.foods.forEach((food) => food.names.forEach((name) => {
      const s = termScore(q, name);
      if (s > bestScore) { best = food; bestScore = s; }
    }));
    return best;
  };

  // Remembers the last species and topic, so "What about cats?" just works
  const memory = { species: null, intent: null };

  const think = (raw) => {
    const q = parse(raw);
    const plain = q.n.trim();
    const named = detectSpecies(q);
    if (named) memory.species = named;
    const sp = named || memory.species;

    if (KB.emergency.keys.some((k) => termScore(q, k) >= 2)) {
      return { type: 'answer', answer: KB.emergency.answer(sp, q.n) };
    }

    const food = findFood(q);
    const ate = KB.ingested.test(q.n);
    const worried = KB.askedIfBad.test(q.n);
    if (food && ate) return { type: 'answer', answer: KB.foodAnswer(food, sp, { ate, worried }) };

    const early = KB.smalltalk.find((st) => st.early && st.test.test(plain));
    if (early) return { type: 'smalltalk', answer: early.answer };

    if (food) {
      memory.intent = null;
      return { type: 'answer', answer: KB.foodAnswer(food, sp, { ate, worried }) };
    }

    let best = null;
    let bestScore = 0;
    KB.intents.forEach((intent) => {
      const s = intentScore(intent, q, sp);
      if (s > bestScore) { best = intent; bestScore = s; }
    });
    if (best && bestScore >= 2) {
      memory.intent = best;
      return { type: 'answer', answer: best.answer(sp) };
    }

    const chatter = KB.smalltalk.find((st) => !st.early && st.test.test(plain));
    if (chatter) return { type: 'smalltalk', answer: chatter.answer };

    // only species words left ("what about cats?", "and for rabbits?") → same topic, new species
    const speciesWords = new Set(Object.values(KB.species).flat().map(stem));
    const extra = q.tokens.filter((t) => !speciesWords.has(t) && !FILLER.has(t));
    if (named && !extra.length) {
      const intent = memory.intent || KB.intents.find((i) => i.id === (named === 'rabbit' ? 'rabbit-care' : 'newpet'));
      memory.intent = intent;
      return { type: 'answer', answer: intent.answer(named) };
    }

    return { type: 'fallback', answer: KB.fallback };
  };

  /* =========================================================
     Free-question limit (kept in localStorage)
     ========================================================= */
  if (new URLSearchParams(window.location.search).has('resetchat')) {
    try { localStorage.removeItem(STORE_KEY); } catch { /* storage unavailable */ }
    window.history.replaceState(null, '', window.location.pathname + window.location.hash);
  }
  const state = (() => {
    try { return { used: 0, locked: false, ...JSON.parse(localStorage.getItem(STORE_KEY) || '{}') }; } catch { return { used: 0, locked: false }; }
  })();
  const save = () => {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch { /* private mode: the limit just won't persist */ }
  };
  const left = () => Math.max(0, FREE_LIMIT - state.used);
  const questions = (n) => `${n} free question${n === 1 ? '' : 's'}`;

  /* =========================================================
     UI
     ========================================================= */
  const wrap = chat.closest('.chat-wrap');
  const log = chat.querySelector('.chat-log');
  const suggest = chat.querySelector('.chat-suggest');
  const form = chat.querySelector('.chat-form');
  const input = form.querySelector('input');
  const send = form.querySelector('.chat-send');
  const lockBar = chat.querySelector('.chat-lock');
  const paws = [...chat.querySelectorAll('.quota-paws svg')];
  const quotaText = chat.querySelector('.quota-text');
  const mascot = wrap.querySelector('.chat-mascot');
  const asked = new Set();
  let busy = false;
  let greeted = false;

  const wait = (ms) => new Promise((resolve) => { setTimeout(resolve, reduceMotion ? 0 : ms); });
  const el = (tag, cls, text) => {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text) node.textContent = text;
    return node;
  };
  const scrollDown = () => { log.scrollTop = log.scrollHeight; };

  const updateQuota = () => {
    paws.forEach((paw, i) => paw.classList.toggle('is-used', i >= left()));
    quotaText.textContent = left() ? `${questions(left())} left` : 'No free questions left';
  };

  const addRow = (who) => {
    const row = el('div', `msg msg--${who}`);
    if (who === 'bot') row.innerHTML = '<span class="msg-av" aria-hidden="true"><svg viewBox="0 0 64 64"><use href="#d-puffhead"/></svg></span>';
    const bubble = el('div', 'bubble');
    row.appendChild(bubble);
    log.appendChild(row);
    scrollDown();
    return bubble;
  };

  const showTyping = () => {
    const bubble = addRow('bot');
    bubble.classList.add('bubble--typing');
    bubble.innerHTML = '<span></span><span></span><span></span>';
    return bubble.parentElement;
  };

  // Reveal text a couple of words at a time, like a model streaming tokens
  const stream = async (node, text, instant) => {
    if (instant || reduceMotion) { node.textContent = text; return; }
    const words = text.split(' ');
    for (let i = 0; i < words.length; i += 1) {
      node.textContent += (i ? ' ' : '') + words[i];
      if (i % 2 === 1) { scrollDown(); await wait(26 + Math.random() * 30); }
    }
  };

  const say = async (answer, instant = false) => {
    const bubble = addRow('bot');
    if (answer.urgent) bubble.classList.add('bubble--urgent');
    log.setAttribute('aria-busy', 'true');
    for (const text of answer.p || []) {
      const p = el('p');
      bubble.appendChild(p);
      await stream(p, text, instant);
    }
    if (answer.list && answer.list.length) {
      const ul = el('ul');
      bubble.appendChild(ul);
      for (const item of answer.list) {
        const li = el('li');
        ul.appendChild(li);
        await stream(li, item, instant);
      }
    }
    if (answer.tip) {
      const tip = el('p', 'bubble-tip');
      tip.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><use href="#d-sparkle"/></svg>';
      const span = el('span');
      tip.appendChild(span);
      bubble.appendChild(tip);
      await stream(span, answer.tip, instant);
    }
    log.setAttribute('aria-busy', 'false');
    scrollDown();
  };

  const note = (text) => {
    log.appendChild(el('p', 'chat-note', text));
    scrollDown();
  };

  const setSuggestions = (list) => {
    suggest.replaceChildren();
    if (state.locked) return;
    const fresh = (items) => items.filter((s) => !asked.has(s.toLowerCase()));
    let items = fresh(list || []).slice(0, 3);
    if (!items.length) items = fresh(KB.starters).slice(0, list ? 3 : 4);
    items.forEach((text, i) => {
      const chip = el('button', 'chip-q', text);
      chip.type = 'button';
      chip.style.setProperty('--i', i);
      chip.addEventListener('click', () => ask(text));
      suggest.appendChild(chip);
    });
  };

  const setBusy = (on) => {
    busy = on;
    send.disabled = on;
    suggest.querySelectorAll('button').forEach((b) => { b.disabled = on; });
    wrap.classList.toggle('is-thinking', on);
  };

  const showGate = () => {
    const bubble = addRow('bot');
    bubble.classList.add('bubble--gate');
    bubble.innerHTML = `
      <b class="gate-title">You’ve used your ${FREE_LIMIT} free questions!</b>
      <p>I’d love to keep helping. Download Puffin to chat with me without limits — I’ll even remember your pet’s breed, age and health history for more personal answers.</p>`;
    scrollDown();
  };

  const lock = () => {
    state.locked = true;
    save();
    form.hidden = true;
    lockBar.hidden = false;
    suggest.replaceChildren();
    chat.classList.add('is-locked');
    mascot.classList.add('is-waving');
  };

  const greeting = () => {
    const lines = ['Hi, I’m Puff — Puffin’s AI care buddy!', 'Ask me about safe foods, feeding, vaccines, grooming, behaviour or everyday health for your cat, dog or bunny.'];
    if (!state.used) lines.push(`You’ve got ${questions(FREE_LIMIT)} — fire away!`);
    else if (left()) lines.push(`You have ${questions(left())} left.`);
    else lines.push('You’ve used your free questions here, but you can keep chatting with me in the Puffin app.');
    return { p: lines };
  };

  async function ask(text) {
    const question = text.trim().slice(0, 200);
    if (!question || busy || state.locked) return;
    greeted = true;
    setBusy(true);
    asked.add(question.toLowerCase());
    addRow('user').textContent = question;
    suggest.replaceChildren();

    const result = think(question);
    const gated = state.used >= FREE_LIMIT && result.type !== 'smalltalk';
    const typing = showTyping();
    await wait(gated ? 700 : 550 + Math.min(900, JSON.stringify(result.answer).length * 1.5));
    typing.remove();

    if (gated) {
      showGate();
      lock();
      setBusy(false);
      return;
    }

    await say(result.answer);
    if (result.type === 'answer') {
      state.used += 1;
      save();
      updateQuota();
      note(left() ? `${questions(left())} left` : 'That was your last free question — the full Puff lives in the Puffin app.');
    } else if (result.type === 'fallback') {
      note('That one didn’t count toward your free questions.');
    }
    setSuggestions(result.answer.follow);
    setBusy(false);
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (busy) return;
    const value = input.value;
    input.value = '';
    ask(value);
  });

  /* ---------- start ---------- */
  updateQuota();
  if (state.locked) {
    greeted = true;
    lock();
    say(greeting(), true).then(showGate);
  } else {
    setSuggestions();
    // Puff says hello the first time the chat scrolls into view
    const io = new IntersectionObserver(async (entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      io.disconnect();
      if (greeted) return;
      greeted = true;
      setBusy(true);
      const typing = showTyping();
      await wait(900);
      typing.remove();
      await say(greeting());
      setBusy(false);
    }, { threshold: 0.35 });
    io.observe(chat);
  }

  // handy for tweaking the knowledge base from the console: PuffAssistant.think('can dogs eat grapes?')
  window.PuffAssistant = { think };
})();
