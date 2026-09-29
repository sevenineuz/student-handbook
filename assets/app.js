(function () {
  var HB = window.HB || { lang: 'en', t: {} };
  var body = document.body;
  try { localStorage.setItem('hb-lang', HB.lang); } catch (e) {}

  /* ---- design: Kids & Teens / Adults ---- */
  function syncTheme() {
    var cur = document.documentElement.dataset.theme === 'adult' ? 'adult' : 'kids';
    document.querySelectorAll('[data-set-theme]').forEach(function (b) {
      b.setAttribute('aria-pressed', b.dataset.setTheme === cur);
    });
  }
  document.querySelectorAll('[data-set-theme]').forEach(function (b) {
    b.addEventListener('click', function () {
      var t = b.dataset.setTheme;
      if (t === 'adult') document.documentElement.dataset.theme = 'adult';
      else delete document.documentElement.dataset.theme;
      try { localStorage.setItem('hb-theme', t); } catch (e) {}
      syncTheme();
    });
  });
  syncTheme();

  /* ---- mobile menu ---- */
  var menuBtn = document.querySelector('.menu-btn');
  var scrim = document.querySelector('.scrim');
  function setNav(open) {
    body.classList.toggle('nav-open', open);
    if (scrim) scrim.hidden = !open;
    if (menuBtn) menuBtn.setAttribute('aria-expanded', open);
  }
  if (menuBtn) menuBtn.addEventListener('click', function () { setNav(true); });
  document.querySelectorAll('.close-nav, .scrim').forEach(function (el) {
    el.addEventListener('click', function () { setNav(false); });
  });
  document.querySelectorAll('.nav-toggle').forEach(function (b) {
    b.addEventListener('click', function () {
      var li = b.closest('.has-kids');
      var open = !li.classList.contains('open');
      li.classList.toggle('open', open);
      b.setAttribute('aria-expanded', open);
    });
  });
  var cur = document.querySelector('.nav-sub [aria-current]');
  if (cur && cur.scrollIntoView && window.innerWidth > 960) cur.scrollIntoView({ block: 'nearest' });

  /* ---- language switch remembers the choice ---- */
  document.querySelectorAll('.lang-switch a[data-lang]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      if (a.getAttribute('aria-current')) { e.preventDefault(); return; }
      try { localStorage.setItem('hb-lang', a.dataset.lang); } catch (err) {}
      if (location.hash && a.getAttribute('href').indexOf('index.html') === -1) a.href = a.getAttribute('href') + location.hash;
    });
  });

  /* ---- open the FAQ answer the URL points to ---- */
  function openHash() {
    var id = decodeURIComponent(location.hash.slice(1));
    if (!id) return;
    var el = document.getElementById(id);
    if (el && el.tagName === 'DETAILS') { el.open = true; el.scrollIntoView({ block: 'start' }); }
  }
  window.addEventListener('hashchange', openHash);
  openHash();

  /* ---- search ---- */
  var box = document.querySelector('.search');
  var input = box && box.querySelector('input');
  var list = box && box.querySelector('.search-results');
  var index = null, sel = -1, lastFocus = null;

  function norm(s) {
    return (s || '').toLowerCase().replace(/ё/g, 'е').replace(/[‘’ʻʼ`]/g, "'");
  }
  function load(cb) {
    if (index) return cb();
    if (window.HB_INDEX) { prep(); return cb(); }
    var s = document.createElement('script');
    s.src = '../assets/search-' + HB.lang + '.js';
    s.onload = function () { prep(); cb(); };
    document.head.appendChild(s);
  }
  function prep() {
    index = (window.HB_INDEX || []).map(function (r) {
      return { r: r, t: norm(r.t), s: norm(r.s), x: norm(r.x) };
    });
  }
  function esc(s) { return s.replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function highlight(text, words) {
    var out = esc(text);
    words.forEach(function (w) {
      if (w.length < 2) return;
      var re = new RegExp('(' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/е/g, '[её]') + ')', 'gi');
      out = out.replace(re, '<mark>$1</mark>');
    });
    return out;
  }
  function snippet(r, words) {
    var nx = norm(r.x), pos = -1;
    words.forEach(function (w) { var p = nx.indexOf(w); if (p >= 0 && (pos < 0 || p < pos)) pos = p; });
    if (pos < 0) return r.x.slice(0, 150) + (r.x.length > 150 ? '…' : '');
    var start = Math.max(0, pos - 50);
    var s = r.x.slice(start, start + 170);
    return (start > 0 ? '…' : '') + s + (start + 170 < r.x.length ? '…' : '');
  }
  function run() {
    var q = norm(input.value).trim();
    sel = -1;
    if (!q) { list.innerHTML = ''; return; }
    var words = q.split(/\s+/).filter(Boolean);
    var hits = [];
    index.forEach(function (e) {
      var all = e.t + ' ' + e.s + ' ' + e.x, score = 0;
      for (var i = 0; i < words.length; i++) {
        var w = words[i];
        if (all.indexOf(w) < 0) return;
        if (e.t.indexOf(w) >= 0) score += 6;
        if (e.s.indexOf(w) >= 0) score += 4;
        if (e.x.indexOf(w) >= 0) score += 1;
      }
      hits.push({ e: e, score: score });
    });
    hits.sort(function (a, b) { return b.score - a.score; });
    if (!hits.length) { list.innerHTML = '<li class="r-empty">' + esc(HB.t.no_results || '') + '</li>'; return; }
    list.innerHTML = hits.slice(0, 30).map(function (h) {
      var r = h.e.r;
      return '<li><a href="' + esc(r.u) + '"><div class="r-title">' + highlight(r.t, words) +
        (r.s && r.s !== r.t ? ' <span>› ' + highlight(r.s, words) + '</span>' : '') + '</div>' +
        '<div class="r-snip">' + highlight(snippet(r, words), words) + '</div></a></li>';
    }).join('');
  }
  function openSearch() {
    if (!box) return;
    lastFocus = document.activeElement;
    setNav(false);
    box.hidden = false;
    body.style.overflow = 'hidden';
    input.focus();
    load(run);
  }
  function closeSearch() {
    box.hidden = true;
    body.style.overflow = '';
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  function move(d) {
    var links = list.querySelectorAll('a');
    if (!links.length) return;
    if (sel >= 0 && links[sel]) links[sel].classList.remove('sel');
    sel = (sel + d + links.length) % links.length;
    links[sel].classList.add('sel');
    links[sel].scrollIntoView({ block: 'nearest' });
  }
  if (box) {
    document.querySelectorAll('.search-btn, .hero-search').forEach(function (b) { b.addEventListener('click', openSearch); });
    box.querySelector('.search-close').addEventListener('click', closeSearch);
    box.addEventListener('click', function (e) { if (e.target === box) closeSearch(); });
    input.addEventListener('input', function () { if (index) run(); });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') { e.preventDefault(); move(1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
      else if (e.key === 'Enter') {
        var a = list.querySelectorAll('a')[sel < 0 ? 0 : sel];
        if (a) { e.preventDefault(); a.click(); }
      }
    });
    list.addEventListener('click', function (e) {
      var a = e.target.closest('a');
      if (a) closeSearch();
    });
  }
  document.addEventListener('keydown', function (e) {
    var typing = /INPUT|TEXTAREA|SELECT/.test((e.target || {}).tagName || '');
    if (e.key === 'Escape') {
      if (box && !box.hidden) closeSearch(); else setNav(false);
    } else if (!typing && (e.key === '/' || ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k'))) {
      e.preventDefault(); openSearch();
    }
  });
})();
