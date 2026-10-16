(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const R = Object.fromEntries(window.RELEASES.map(r => [r.id, r]));
  const isMobile = () => matchMedia('(max-width:860px)').matches;
  const fmt = s => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;
  const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

  /* ---------- platform icons ---------- */
  const ICONS = {
    spotify: ['Spotify', '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="11" fill="currentColor"/><path d="M6.5 9.2c3.8-1.1 8-.8 11.2 1M7 12.3c3.2-.9 6.6-.6 9.3.9M7.6 15.2c2.6-.6 5.1-.4 7.3.8" stroke="var(--bg,#140b09)" stroke-width="1.6" fill="none" stroke-linecap="round"/></svg>'],
    apple: ['Apple Music', '<svg viewBox="0 0 24 24"><rect x="1" y="1" width="22" height="22" rx="6" fill="currentColor"/><path d="M15.5 5.5v9.3a2.2 2.2 0 1 1-1.4-2V8.2l-5 1.2v6.9a2.2 2.2 0 1 1-1.4-2V7.6z" fill="var(--bg,#140b09)"/></svg>'],
    deezer: ['Deezer', '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="1" y="16" width="4.5" height="3"/><rect x="7" y="16" width="4.5" height="3"/><rect x="13" y="16" width="4.5" height="3"/><rect x="19" y="16" width="4" height="3"/><rect x="7" y="12" width="4.5" height="3"/><rect x="13" y="12" width="4.5" height="3"/><rect x="19" y="12" width="4" height="3"/><rect x="13" y="8" width="4.5" height="3"/><rect x="19" y="8" width="4" height="3"/><rect x="19" y="4" width="4" height="3"/></svg>'],
    youtube: ['YouTube Music', '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="11" fill="currentColor"/><circle cx="12" cy="12" r="5.6" fill="none" stroke="var(--bg,#140b09)" stroke-width="1.3"/><path d="M10.4 9.6v4.8l4-2.4z" fill="var(--bg,#140b09)"/></svg>'],
    amazon: ['Amazon Music', '<svg viewBox="0 0 24 24"><rect x="1" y="1" width="22" height="22" rx="6" fill="currentColor"/><path d="M6 15.5c3.6 2.2 8.4 2.2 12 0M16.2 14.6l2 .9-.4 2.1" stroke="var(--bg,#140b09)" stroke-width="1.4" fill="none" stroke-linecap="round"/><path d="M8 7v5M8 8.5c.6-1 2.4-1.2 2.6.4V12M10.6 8.9c.6-1 2.4-1.2 2.6.4V12" stroke="var(--bg,#140b09)" stroke-width="1.2" fill="none"/></svg>']
  };
  const platLinks = (r, cls = 'plat') => Object.entries(r.links).map(([k, url]) =>
    `<a class="${cls}" href="${url}" target="_blank" rel="noopener" aria-label="Ouvir ${r.title} no ${ICONS[k][0]}">${ICONS[k][1]}<span>${cls === 'plat' ? ICONS[k][0] : ''}</span></a>`).join('');

  /* ---------- render ---------- */
  $$('[data-release]').forEach(ol => {
    const r = R[ol.dataset.release];
    ol.innerHTML = r.tracks.map((t, i) => `
      <li class="track" data-key="${r.id}:${i}" data-play="${r.id}:${i}" tabindex="0" role="button" aria-label="Ouvir prévia de ${t.t}">
        <span class="track__n">${String(i + 1).padStart(2, '0')}</span>
        <span class="track__t">${t.t}</span>
        <span class="track__d">${fmt(t.d)}</span>
        <span class="track__b"><span class="ico-play"></span></span>
        <i class="track__p"></i>
      </li>`).join('');
  });
  $$('[data-links]').forEach(el => {
    const light = el.classList.contains('platforms--light');
    el.style.setProperty('--bg', light ? 'var(--paper)' : 'var(--ink)');
    el.innerHTML = platLinks(R[el.dataset.links]);
  });

  const discoIds = window.RELEASES.filter(r => ![985914511, 629107821].includes(r.id)).map(r => r.id);
  $('#discoTrack').innerHTML = discoIds.map(id => {
    const r = R[id];
    const [y, m] = r.date.split('-');
    const kind = r.type === 'ep' ? 'EP' : r.title.includes('Ao Vivo') ? 'Ao vivo' : 'Single';
    return `<article class="card" data-key="${id}:0">
      <div class="card__art" data-play="${id}:0" role="button" tabindex="0" aria-label="Ouvir prévia de ${r.tracks[0].t}">
        <img src="${r.cover}" alt="Capa de ${r.title}" loading="lazy">
        <span class="card__eq"><i></i><i></i><i></i><i></i></span>
        <span class="card__play"><span class="ico-play"></span></span>
      </div>
      <div class="card__meta"><span>${kind}</span><span>${MONTHS[+m - 1]} ${y}</span></div>
      <h3 class="card__t">${r.title.replace(/ \(Ao Vivo\)/, '')}</h3>
      ${r.feat.length ? `<p class="card__f">com ${r.feat.join(' e ')}</p>` : `<p class="card__f">${r.tracks.length > 1 ? r.tracks.length + ' faixas' : 'Paloma Possi'}</p>`}
      <div class="card__links" style="--bg:var(--ink)">${platLinks(r, 'cl')}</div>
    </article>`;
  }).join('');
  $$('.card__links a').forEach(a => a.className = '');

  /* ---------- audio ---------- */
  const audio = new Audio();
  audio.preload = 'none';
  let current = null, analyser, data, ctx;
  const player = $('#player');

  function setupAnalyser() {
    if (ctx) return;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      const src = ctx.createMediaElementSource(audio);
      analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      data = new Uint8Array(analyser.frequencyBinCount);
      src.connect(analyser); analyser.connect(ctx.destination);
    } catch (e) { analyser = null; }
  }

  function markPlaying() {
    $$('[data-key]').forEach(el => {
      const on = current && el.dataset.key === current && !audio.paused;
      el.classList.toggle('is-playing', on);
      const ico = el.querySelector('.track__b > span, .card__play > span');
      if (ico) ico.className = on ? 'ico-pause' : 'ico-play';
    });
    player.classList.toggle('is-playing', !audio.paused);
    $('#pToggle').innerHTML = `<span class="${audio.paused ? 'ico-play' : 'ico-pause'}"></span>`;
    $('#pToggle').setAttribute('aria-label', audio.paused ? 'Tocar' : 'Pausar');
  }

  function play(key) {
    setupAnalyser();
    if (ctx && ctx.state === 'suspended') ctx.resume();
    if (key === current) { audio.paused ? audio.play() : audio.pause(); return; }
    const [id, i] = key.split(':');
    const r = R[id], t = r.tracks[+i];
    current = key;
    audio.src = t.src;
    audio.play().catch(() => {});
    $('#pCover').src = r.cover;
    $('#pTitle').textContent = t.t;
    $('#pSub').textContent = r.feat.length ? `Paloma Possi, ${r.feat.join(', ')} · prévia` : 'Paloma Possi · prévia de 30s';
    player.classList.add('is-open');
    muteClips();
  }
  audio.addEventListener('play', markPlaying);
  audio.addEventListener('pause', markPlaying);
  audio.addEventListener('ended', () => {
    const [id, i] = current.split(':');
    const r = R[id];
    if (+i + 1 < r.tracks.length) play(`${id}:${+i + 1}`); else markPlaying();
  });

  document.addEventListener('click', e => {
    const p = e.target.closest('[data-play]');
    if (p && !e.target.closest('a')) { e.preventDefault(); play(p.dataset.play); }
    const s = e.target.closest('[data-sheet]');
    if (s) openSheet(s.dataset.sheet);
  });
  document.addEventListener('keydown', e => {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[data-play][tabindex]')) { e.preventDefault(); play(e.target.dataset.play); }
    if (e.key === 'Escape') closeSheet();
  });
  $('#pToggle').onclick = () => current && play(current);
  $('#pFull').onclick = () => current && openSheet(current.split(':')[0]);
  $('#pClose').onclick = () => { audio.pause(); player.classList.remove('is-open'); };

  /* ---------- sheet ---------- */
  const sheet = $('#sheet');
  function openSheet(id) {
    const r = R[id];
    $('#sheetCover').src = r.cover;
    $('#sheetCover').alt = `Capa de ${r.title}`;
    $('#sheetTitle').textContent = r.title;
    const l = $('#sheetLinks');
    l.style.setProperty('--bg', 'var(--ink-2)');
    l.innerHTML = platLinks(r);
    sheet.hidden = false;
    $('.sheet__x').focus();
  }
  function closeSheet() { sheet.hidden = true; }
  sheet.addEventListener('click', e => { if (e.target.closest('[data-close]')) closeSheet(); });

  /* ---------- live clips ---------- */
  const clips = $$('[data-clip]');
  function muteClips(except) {
    clips.forEach(c => {
      if (c === except) return;
      c.querySelector('video').muted = true;
      c.querySelector('.clip__sound').classList.remove('is-on');
    });
  }
  clips.forEach(c => {
    const v = c.querySelector('video'), b = c.querySelector('.clip__sound');
    b.onclick = () => {
      const on = v.muted;
      muteClips(c);
      v.muted = !on;
      b.classList.toggle('is-on', on);
      b.setAttribute('aria-label', on ? 'Desativar som' : 'Ativar som');
      if (on) { audio.pause(); v.currentTime = 0; v.play().catch(() => {}); }
    };
  });
  const clipIO = new IntersectionObserver(es => es.forEach(e => {
    const v = e.target.querySelector('video');
    if (e.isIntersecting) { v.preload = 'auto'; v.play().catch(() => {}); }
    else { v.pause(); if (!v.muted) { v.muted = true; e.target.querySelector('.clip__sound').classList.remove('is-on'); } }
  }), { threshold: .35 });
  clips.forEach(c => clipIO.observe(c));

  // hero videos: load only the visible columns, pause when off-screen
  const heroVids = $$('.hero video').filter(v => v.parentElement.offsetParent !== null);
  heroVids.forEach(v => { v.src = v.dataset.src; v.load(); });
  new IntersectionObserver(([e]) => heroVids.forEach(v => e.isIntersecting ? v.play().catch(() => {}) : v.pause()))
    .observe($('.hero'));

  /* ---------- youtube facade ---------- */
  $$('[data-yt]').forEach(b => b.addEventListener('click', () => {
    audio.pause();
    b.outerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${b.dataset.yt}?autoplay=1&rel=0" title="Teu Reino Vem (Ao Vivo na Cidade Imafe)" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>`;
  }));

  /* ---------- words ---------- */
  $$('[data-words]').forEach(p => {
    p.innerHTML = p.textContent.split(' ').map(w => `<span class="w">${w}</span>`).join(' ');
  });
  const words = $$('.words .w');

  /* ---------- reveal + counters ---------- */
  $$('.release__info, .razao__info, .about__info, .agenda__head, .form, .live__head, .disco__head, .badge').forEach(el => el.classList.add('reveal'));
  const revIO = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    e.target.classList.add('is-in');
    revIO.unobserve(e.target);
  }), { threshold: .15 });
  $$('.reveal').forEach(el => revIO.observe(el));

  const countIO = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    countIO.unobserve(e.target);
    const el = e.target, end = +el.dataset.count, start = el.hasAttribute('data-plain') ? end - 20 : 0, t0 = performance.now();
    const step = now => {
      const k = Math.min(1, (now - t0) / 1600), v = Math.round(start + (end - start) * (1 - Math.pow(1 - k, 3)));
      el.textContent = v;
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }), { threshold: .6 });
  $$('[data-count]').forEach(el => countIO.observe(el));

  /* ---------- header + menu ---------- */
  const hd = $('#hd'), menu = $('#menu'), menuBtn = $('#menuBtn');
  menuBtn.onclick = () => {
    const open = menu.hidden;
    menu.hidden = !open;
    menuBtn.setAttribute('aria-expanded', open);
    document.body.style.overflow = open ? 'hidden' : '';
  };
  menu.addEventListener('click', e => { if (e.target.closest('a')) menuBtn.click(); });

  /* ---------- glow follows pointer ---------- */
  const glow = $('#glow');
  let gx = innerWidth / 2, gy = innerHeight * .4, tx = gx, ty = gy;
  addEventListener('pointermove', e => { tx = e.clientX; ty = e.clientY; }, { passive: true });

  /* ---------- razão cover tilt ---------- */
  const cover = $('.razao__cover');
  cover.addEventListener('pointermove', e => {
    const b = cover.getBoundingClientRect();
    cover.style.setProperty('--ry', `${((e.clientX - b.left) / b.width - .5) * 14}deg`);
    cover.style.setProperty('--rx', `${-((e.clientY - b.top) / b.height - .5) * 14}deg`);
  });
  cover.addEventListener('pointerleave', () => { cover.style.setProperty('--ry', '0deg'); cover.style.setProperty('--rx', '0deg'); });

  /* ---------- disco height ---------- */
  const disco = $('.disco'), track = $('#discoTrack');
  function sizeDisco() {
    if (isMobile()) { disco.style.removeProperty('--dh'); return; }
    const over = track.scrollWidth - (innerWidth - track.offsetLeft);
    disco.style.setProperty('--dh', `${Math.max(innerHeight, over + innerHeight)}px`);
  }
  addEventListener('resize', sizeDisco);
  addEventListener('load', sizeDisco);
  sizeDisco();

  /* ---------- one rAF loop ---------- */
  const heroCols = $$('.hero__col'), heroContent = $('.hero__content');
  const vinyl = $('#vinyl'), disc = $('#disc'), release = $('.release');
  const frame = $('#watchFrame'), wordsSec = $('#words'), aboutImg = $('.about__photo img');
  const lightZones = $$('[data-light]');
  let lastY = scrollY, spin = 0, level = 0;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const prog = (el, start = 0, end = 0) => {
    const b = el.getBoundingClientRect();
    return clamp((innerHeight - b.top - start) / (b.height + innerHeight - start - end));
  };

  function frameLoop() {
    const y = scrollY, vh = innerHeight, mob = isMobile();

    // header
    hd.classList.toggle('is-solid', y > 40);
    if (menu.hidden) hd.classList.toggle('is-hidden', y > lastY + 4 && y > 300);
    if (y < lastY - 4) hd.classList.remove('is-hidden');
    lastY = y;
    hd.classList.toggle('is-light', lightZones.some(z => { const b = z.getBoundingClientRect(); return b.top < 40 && b.bottom > 40; }));

    // hero
    if (y < vh * 1.2) {
      const p = clamp(y / vh);
      heroCols.forEach((c, i) => c.style.setProperty('--cy', `${p * (i === 1 ? 4 : 10)}%`));
      heroContent.style.transform = `translateY(${-p * 18}vh)`;
      heroContent.style.opacity = 1 - p * 1.3;
    }

    // vinyl
    const rp = mob ? clamp(prog(vinyl) * 2 - .3) : clamp((-release.getBoundingClientRect().top) / (release.offsetHeight - vh) * 1.6);
    vinyl.style.setProperty('--out', rp.toFixed(3));
    spin += (current && current.startsWith('985914511') && !audio.paused) ? 1.6 : .25;
    disc.style.setProperty('--spin', `${spin + rp * 220}deg`);

    // watch frame
    if (!mob) {
      const fp = clamp(prog(frame) * 2.2);
      frame.style.setProperty('--ci', `${(1 - fp) * 12}%`);
      frame.style.setProperty('--cx', `${(1 - fp) * 18}%`);
    }

    // words
    const wp = clamp(prog(wordsSec, vh * .1, vh * .45) * 1.25);
    const lit = Math.round(wp * words.length);
    words.forEach((w, i) => w.classList.toggle('on', i < lit));

    // disco horizontal
    if (!mob) {
      const b = disco.getBoundingClientRect();
      const dp = clamp(-b.top / (disco.offsetHeight - vh));
      track.style.transform = `translate3d(${-dp * Math.max(0, track.scrollWidth - (innerWidth - track.offsetLeft))}px,0,0)`;
    }

    // about parallax
    const ap = prog(aboutImg.parentElement);
    aboutImg.style.setProperty('--py', `${(ap - .5) * -10}%`);

    // audio level → glow
    if (analyser && !audio.paused) {
      analyser.getByteFrequencyData(data);
      let s = 0; for (let i = 2; i < 40; i++) s += data[i];
      level += (s / 38 / 255 - level) * .25;
    } else level *= .92;
    document.documentElement.style.setProperty('--level', level.toFixed(3));
    gx += (tx - gx) * .08; gy += (ty - gy) * .08;
    glow.style.transform = `translate3d(${gx}px,${gy}px,0) scale(${1 + level * .8})`;

    // track progress
    if (current) {
      const k = audio.duration ? audio.currentTime / audio.duration : 0;
      $('#pBar').style.width = `${k * 100}%`;
      $$('.track__p').forEach(el => { el.style.width = el.parentElement.dataset.key === current ? `${k * 100}%` : '0'; });
    }
    requestAnimationFrame(frameLoop);
  }
  requestAnimationFrame(frameLoop);

  /* ---------- agenda → WhatsApp ---------- */
  $('#agendaForm').addEventListener('submit', e => {
    e.preventDefault();
    const f = new FormData(e.target);
    let date = f.get('data');
    if (date) { const [yy, mm, dd] = date.split('-'); date = `${dd}/${mm}/${yy}`; }
    const msg = [
      'Olá! Gostaria de convidar a Paloma Possi.',
      `Nome: ${f.get('nome')}`,
      `Igreja/evento: ${f.get('evento')}`,
      `Cidade: ${f.get('cidade')}`,
      date ? `Data: ${date}` : null,
      `Tipo: ${f.get('tipo')}`
    ].filter(Boolean).join('\n');
    window.open(`https://wa.me/5511981635370?text=${encodeURIComponent(msg)}`, '_blank', 'noopener');
  });

  /* ---------- opening ---------- */
  // the bar follows the hero videos actually buffering; the panels open on the three columns
  const loader = $('#loader'), bar = $('#loadBar').parentElement;
  const t0 = performance.now();
  let ready = 0, opened = false;
  const setP = () => bar.style.setProperty('--p', (ready + .15) / (heroVids.length + .15));
  const open = () => {
    if (opened) return;
    opened = true;
    bar.style.setProperty('--p', 1);
    setTimeout(() => {
      heroVids.forEach(v => v.play().catch(() => {}));
      loader.classList.add('is-out');
      document.body.classList.add('is-ready');
      setTimeout(() => loader.classList.add('is-gone'), 1700);
    }, Math.max(350, 2300 - (performance.now() - t0)));
  };
  setP();
  heroVids.forEach(v => {
    const ok = () => { ready++; setP(); if (ready >= heroVids.length) open(); };
    v.readyState >= 3 ? ok() : v.addEventListener('canplay', ok, { once: true });
  });
  setTimeout(open, 5000);
})();
