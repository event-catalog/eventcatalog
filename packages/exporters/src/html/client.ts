/**
 * The only script the reference ships. Everything is rendered at export time; this adds
 * tabs, copy buttons, child attributes, nav highlighting and filtering, ⌘K search and the theme toggle.
 * Plain ES2017 so it runs in any current browser without a build step.
 */
export const clientScript = /* js */ `
(function () {
  var root = document.documentElement;
  var nav = document.getElementById('sidenav');

  // Theme toggle (follows the system until the reader picks one; the saved choice is applied in <head>)
  document.getElementById('theme-btn').addEventListener('click', function () {
    var dark = root.getAttribute('data-theme') ? root.getAttribute('data-theme') === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
    var next = dark ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    try { localStorage.setItem('ec-reference-theme', next); } catch (e) {}
  });

  // Code that ships as plain text in the <template> after its <pre> is highlighted the first time it is shown
  function fillCode(pre) {
    if (!pre.hasAttribute('data-lazy')) return;
    pre.firstChild.innerHTML = highlightCode(pre.nextElementSibling.content.textContent, pre.getAttribute('data-lang'));
    pre.removeAttribute('data-lazy');
  }

  function flash(id) {
    var el = document.getElementById(id);
    if (!el || !el.classList.contains('section')) return;
    el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash');
  }

  // Specifications open in a modal; the raw file is in the <template> after its row
  var specModal = document.getElementById('spec-modal');
  var specReturnFocus = null;
  function openSpec(row) {
    var pre = specModal.querySelector('pre');
    pre.setAttribute('data-file', row.getAttribute('data-file'));
    pre.firstChild.innerHTML = highlightCode(row.nextElementSibling.content.textContent, row.getAttribute('data-lang'));
    document.getElementById('spec-modal-title').textContent = row.getAttribute('data-name') + ' · ' + row.getAttribute('data-file');
    document.getElementById('spec-modal-icon').className = 'spec-icon ' + row.getAttribute('data-type');
    specReturnFocus = row;
    specModal.hidden = false;
    pre.scrollTop = 0;
    specModal.querySelector('.code-head [data-close]').focus();
  }
  function closeSpec() {
    specModal.hidden = true;
    if (specReturnFocus) specReturnFocus.focus();
  }

  document.addEventListener('click', function (e) {
    var specRow = e.target.closest('.spec-row');
    if (specRow && !specRow.classList.contains('missing')) { openSpec(specRow); return; }
    var specLink = e.target.closest('.spec-link[data-open]');
    if (specLink) { var target = document.getElementById(specLink.getAttribute('data-open')); if (target) { openSpec(target); specReturnFocus = specLink; } return; }
    if (!specModal.hidden && e.target.closest('[data-close]')) { closeSpec(); return; }
    var tab = e.target.closest('.tab');
    if (tab) {
      var card = tab.closest('.code');
      card.querySelectorAll('.tab').forEach(function (b) { b.setAttribute('aria-selected', String(b === tab)); });
      card.querySelectorAll('pre').forEach(function (p, i) {
        p.hidden = String(i) !== tab.dataset.i;
        // Tabs other than the first ship as plain text in the <template> after them; highlight on first open
        if (!p.hidden) fillCode(p);
      });
      return;
    }
    var download = e.target.closest('.download');
    if (download) {
      var shown = download.closest('.code').querySelector('pre:not([hidden])');
      fillCode(shown);
      var name = shown.getAttribute('data-file') || 'specification.txt';
      var type = /\.json$/i.test(name) ? 'application/json' : /\.ya?ml$/i.test(name) ? 'application/yaml' : 'text/plain';
      var url = URL.createObjectURL(new Blob([shown.textContent], { type: type }));
      var link = document.createElement('a');
      link.href = url; link.download = name;
      document.body.appendChild(link); link.click(); link.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
      return;
    }
    var copy = e.target.closest('.copy');
    if (copy) {
      var pre = copy.closest('.code').querySelector('pre:not([hidden])');
      var label = copy.querySelector('span');
      var done = function (msg) { label.textContent = msg; setTimeout(function () { label.textContent = 'Copy'; }, 1400); };
      var fallback = function () {
        var r = document.createRange(); r.selectNodeContents(pre);
        var s = getSelection(); s.removeAllRanges(); s.addRange(r); done('Selected');
      };
      try { navigator.clipboard.writeText(pre.textContent).then(function () { done('Copied'); }, fallback); } catch (err) { fallback(); }
      return;
    }
    var toggle = e.target.closest('.child-toggle');
    if (toggle) {
      var open = toggle.getAttribute('aria-expanded') !== 'true';
      toggle.setAttribute('aria-expanded', String(open));
      toggle.nextElementSibling.hidden = !open;
      toggle.querySelector('span').textContent = open ? 'Hide child attributes' : 'Show child attributes';
      return;
    }
    var a = e.target.closest('a[href^="#"]');
    if (a) {
      var id = a.getAttribute('href').slice(1);
      var target = reveal(id);
      if (!target) return;
      e.preventDefault();
      if (nav.classList.contains('open')) closeNav();
      scrollToTarget(target);
      history.pushState(null, '', '#' + id);
      flash(id);
    }
  });

  // Mermaid diagrams: load mermaid only when the page has diagrams, render each as it nears the
  // viewport, and re-render when the theme changes (mermaid bakes the theme into the SVG).
  var graphs = document.querySelectorAll('.mermaid[data-content]');
  if (graphs.length) {
    var mermaidLib = null, queue = Promise.resolve(), seq = 0, visible = [];
    var isDark = function () { var t = root.getAttribute('data-theme'); return t ? t === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches; };
    var loadMermaid = function () {
      return mermaidLib || (mermaidLib = import('https://cdn.jsdelivr.net/npm/mermaid@11.16.1/dist/mermaid.esm.min.mjs').then(function (m) { return m.default; }));
    };
    var renderGraph = function (el) {
      queue = queue.then(function () {
        var theme = isDark() ? 'dark' : 'default';
        if (el.dataset.rendered === theme) return;
        return loadMermaid().then(function (mermaid) {
          mermaid.initialize({ startOnLoad: false, theme: theme, securityLevel: 'strict', fontFamily: getComputedStyle(document.body).fontFamily, maxTextSize: 100000 });
          return mermaid.render('ec-mermaid-' + (++seq), el.dataset.content).then(function (r) {
            el.innerHTML = r.svg; el.dataset.rendered = theme;
          });
        }).catch(function () { /* offline or invalid diagram: the source stays visible */ });
      });
    };
    var mio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { mio.unobserve(en.target); visible.push(en.target); renderGraph(en.target); } });
    }, { rootMargin: '800px 0px' });
    graphs.forEach(function (g) { mio.observe(g); });
    var rerender = function () { visible.forEach(renderGraph); };
    new MutationObserver(rerender).observe(root, { attributes: true, attributeFilter: ['data-theme'] });
    matchMedia('(prefers-color-scheme: dark)').addEventListener('change', rerender);
  }

  // Back to top: shown once the reader is a screen or so down the page
  var toTop = document.getElementById('to-top');
  var toTopTicking = false;
  window.addEventListener('scroll', function () {
    if (toTopTicking) return;
    toTopTicking = true;
    requestAnimationFrame(function () { toTop.hidden = window.scrollY < window.innerHeight; toTopTicking = false; });
  }, { passive: true });
  toTop.addEventListener('click', function () {
    var smooth = !matchMedia('(prefers-reduced-motion: reduce)').matches && !document.querySelector('section.lazy');
    window.scrollTo({ top: 0, behavior: smooth ? 'smooth' : 'auto' });
    history.replaceState(null, '', location.pathname + location.search);
  });

  // Large catalogs ship sections as inert text; draw each one as it nears the screen (or when jumped to)
  function drawSection(el) {
    if (!el || !el.classList || !el.classList.contains('lazy')) return;
    var src = el.querySelector('script[type="text/html"]');
    el.innerHTML = src ? src.textContent : '';
    el.classList.remove('lazy');
    el.style.height = '';
    el.querySelectorAll('pre[data-lazy]:not([hidden])').forEach(fillCode);
    watchSticky(el);
  }
  document.querySelectorAll('main section:not(.lazy) pre[data-lazy]:not([hidden])').forEach(fillCode);
  var lazySections = document.querySelectorAll('section.lazy');
  if (lazySections.length) {
    // Only draw at and below the screen: drawing above it would move what the reader is looking at
    var lio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { lio.unobserve(en.target); drawSection(en.target); } });
    }, { rootMargin: '0px 0px 1500px 0px' });
    lazySections.forEach(function (s) { lio.observe(s); });
  }
  // Jump to a section: draw it and the next one first, then scroll, so the reader lands on real content
  function reveal(id) {
    var el = document.getElementById(id);
    if (!el) return null;
    var section = el.closest('section') || el;
    drawSection(section);
    drawSection(section.nextElementSibling);
    return el;
  }
  // Glide to links, as a page should. In large catalogs only short trips glide: a long one would pass (and draw)
  // thousands of sections, so it jumps instead. Readers who ask for reduced motion always jump.
  var reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
  function scrollToTarget(el) {
    var far = Math.abs(el.getBoundingClientRect().top) > window.innerHeight * 3;
    var smooth = !reduceMotion.matches && !(far && document.querySelector('section.lazy'));
    el.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'start' });
  }
  // Back and forward return to earlier jumps; draw the section first in case it is still a placeholder
  window.addEventListener('popstate', function () {
    var el = location.hash ? reveal(decodeURIComponent(location.hash.slice(1))) : null;
    if (el) el.scrollIntoView({ block: 'start' });
    else if (!location.hash) window.scrollTo(0, 0);
  });
  if (location.hash) {
    var target = reveal(decodeURIComponent(location.hash.slice(1)));
    if (target) requestAnimationFrame(function () { target.scrollIntoView(); });
  }

  // The right column sticks only while it fits the window; a taller one flows with the page instead of being cut off
  var topBar = document.querySelector('.topbar');
  function fitSticky(col) {
    col.classList.remove('tall');
    col.classList.toggle('tall', col.offsetHeight > window.innerHeight - topBar.offsetHeight - 48);
  }
  var stickyObserver = 'ResizeObserver' in window ? new ResizeObserver(function (entries) { entries.forEach(function (en) { fitSticky(en.target); }); }) : null;
  function watchSticky(root) {
    root.querySelectorAll('.sticky').forEach(function (col) { fitSticky(col); if (stickyObserver) stickyObserver.observe(col); });
  }
  watchSticky(document);
  window.addEventListener('resize', function () { document.querySelectorAll('.sticky').forEach(fitSticky); });

  // Highlight the section in view
  var links = {};
  nav.querySelectorAll('a[href^="#"]').forEach(function (a) { links[a.getAttribute('href').slice(1)] = a; });
  var current = null;
  function setCurrent(id) {
    if (id === current || !links[id]) return;
    if (current) links[current].removeAttribute('aria-current');
    current = id;
    var a = links[id];
    a.setAttribute('aria-current', 'true');
    var nr = nav.getBoundingClientRect(), ar = a.getBoundingClientRect();
    if (ar.top < nr.top + 40 || ar.bottom > nr.bottom - 40) nav.scrollTop += ar.top - nr.top - nr.height / 3;
  }
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) { if (en.isIntersecting) setCurrent(en.target.id); });
  }, { rootMargin: '-70px 0px -65% 0px' });
  document.querySelectorAll('main .section').forEach(function (s) { io.observe(s); });

  // Filter the nav
  var filter = document.getElementById('nav-filter');
  var groups = nav.querySelectorAll('.nav-group');
  filter.addEventListener('input', function () {
    var q = filter.value.trim().toLowerCase();
    var any = false;
    groups.forEach(function (g) {
      var hit = false;
      g.querySelectorAll('a.item').forEach(function (a) {
        var show = !q || a.textContent.toLowerCase().indexOf(q) !== -1 || (a.dataset.alt || '').indexOf(q) !== -1;
        a.hidden = !show; hit = hit || show;
      });
      g.querySelectorAll('.nav-sub').forEach(function (s) {
        var next = s.nextElementSibling, visible = false;
        while (next && !next.classList.contains('nav-sub')) { if (!next.hidden) visible = true; next = next.nextElementSibling; }
        s.hidden = !visible;
      });
      g.hidden = !hit; any = any || hit;
    });
    document.getElementById('nav-empty').hidden = any;
  });

  // Mobile nav
  var menuBtn = document.getElementById('menu-btn');
  var scrim = document.getElementById('nav-scrim');
  function openNav() { nav.classList.add('open'); scrim.hidden = false; menuBtn.setAttribute('aria-expanded', 'true'); }
  function closeNav() { nav.classList.remove('open'); scrim.hidden = true; menuBtn.setAttribute('aria-expanded', 'false'); }
  menuBtn.addEventListener('click', function () { nav.classList.contains('open') ? closeNav() : openNav(); });
  scrim.addEventListener('click', closeNav);

  // ⌘K search. The index is parsed on first open, not at load.
  var INDEX = null;
  var GROUPS = ['Messages', 'Services', 'Domains', 'Systems', 'Channels', 'Data stores', 'Flows', 'Entities', 'Teams', 'People'];
  var cmdk = document.getElementById('cmdk');
  var input = document.getElementById('cmdk-input');
  var results = document.getElementById('cmdk-results');
  var items = [], sel = 0, lastFocus = null;
  if (!/Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent)) document.getElementById('kbd-hint').textContent = 'Ctrl K';
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  function score(it, q) {
    var t = it.t.toLowerCase(), a = (it.a || '').toLowerCase();
    if (t === q || a === q) return 100;
    if (t.indexOf(q) === 0 || a.indexOf(q) === 0) return 80;
    if (t.indexOf(q) !== -1 || a.indexOf(q) !== -1) return 60;
    var hay = (t + ' ' + (it.s || '') + ' ' + (it.d || '')).toLowerCase();
    if (q.split(/\\s+/).every(function (w) { return hay.indexOf(w) !== -1; })) return 30;
    var i = 0; for (var j = 0; j < t.length; j++) if (t[j] === q[i]) i++;
    return i === q.length ? 15 : 0;
  }
  function render() {
    var q = input.value.trim().toLowerCase();
    var list = INDEX.map(function (it) { return { it: it, s: q ? score(it, q) : 1 }; }).filter(function (x) { return x.s > 0; });
    list.sort(function (a, b) { return GROUPS.indexOf(a.it.g) - GROUPS.indexOf(b.it.g) || b.s - a.s; });
    var byGroup = {};
    list.forEach(function (x) { var g = byGroup[x.it.g] = byGroup[x.it.g] || []; if (g.length < (q ? 8 : 5)) g.push(x.it); });
    items = []; GROUPS.forEach(function (g) { (byGroup[g] || []).forEach(function (it) { items.push(it); }); });
    sel = 0;
    if (!items.length) { results.innerHTML = '<div class="cmdk-none">Nothing matches \\u201c' + esc(input.value) + '\\u201d.</div>'; return; }
    var html = '', n = 0;
    GROUPS.forEach(function (g) {
      if (!byGroup[g]) return;
      html += '<div class="cmdk-group">' + g + '</div>';
      byGroup[g].forEach(function (it) {
        html += '<div class="cmdk-item" role="option" data-n="' + n + '" aria-selected="' + (n === 0) + '"><span class="k ' + (it.c || '') + '">' + esc(it.k) + '</span><span class="tt"><b>' + esc(it.t) + '</b><span>' + esc(it.s) + '</span></span><span class="dom">' + esc(it.d) + '</span></div>';
        n++;
      });
    });
    results.innerHTML = html;
  }
  function move(d) {
    if (!items.length) return;
    var prev = results.querySelector('[data-n="' + sel + '"]'); if (prev) prev.setAttribute('aria-selected', 'false');
    sel = (sel + d + items.length) % items.length;
    var el = results.querySelector('[data-n="' + sel + '"]');
    el.setAttribute('aria-selected', 'true'); el.scrollIntoView({ block: 'nearest' });
  }
  function go(n) {
    var it = items[n]; if (!it) return;
    closeCmdk(false);
    var el = reveal(it.h);
    if (el) { scrollToTarget(el); history.replaceState(null, '', '#' + it.h); flash(it.h); }
  }
  function openCmdk() {
    if (!INDEX) INDEX = JSON.parse(document.getElementById('search-index').textContent);
    lastFocus = document.activeElement; cmdk.hidden = false; input.value = ''; render(); input.focus();
  }
  function closeCmdk(restore) { cmdk.hidden = true; if (restore !== false && lastFocus) lastFocus.focus(); }
  document.getElementById('search-btn').addEventListener('click', openCmdk);
  document.getElementById('cmdk-scrim').addEventListener('click', function () { closeCmdk(); });
  input.addEventListener('input', render);
  input.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); move(1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
    else if (e.key === 'Enter') { e.preventDefault(); go(sel); }
    else if (e.key === 'Escape') { e.preventDefault(); closeCmdk(); }
  });
  results.addEventListener('click', function (e) { var it = e.target.closest('.cmdk-item'); if (it) go(+it.dataset.n); });
  document.addEventListener('keydown', function (e) {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); cmdk.hidden ? openCmdk() : closeCmdk(); return; }
    if (e.key === '/' && cmdk.hidden && !/INPUT|TEXTAREA/.test((document.activeElement || {}).tagName)) { e.preventDefault(); openCmdk(); }
    if (e.key === 'Escape' && !specModal.hidden) { closeSpec(); return; }
    if (e.key === 'Escape' && nav.classList.contains('open')) closeNav();
  });
})();
`;
