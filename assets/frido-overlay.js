/**
 * Shared overlay open/close with exit animations + global viewport scrim.
 */
(function () {
  var DEFAULT_MS = 320;
  var scrimEl = null;
  var openEntries = [];

  function prefersReducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function durationMs(el) {
    if (prefersReducedMotion()) return 0;
    if (!el) return DEFAULT_MS;
    var raw = getComputedStyle(el).getPropertyValue('--frido-overlay-duration').trim();
    if (!raw) return DEFAULT_MS;
    if (raw.endsWith('ms')) return parseFloat(raw) || DEFAULT_MS;
    if (raw.endsWith('s')) return (parseFloat(raw) || 0.32) * 1000;
    return parseFloat(raw) * 1000 || DEFAULT_MS;
  }

  function shouldKeepBodyClass(bodyClass, selector) {
    if (!bodyClass) return false;
    if (!selector) return false;
    return !!document.querySelector(selector);
  }

  function portalToBody(el) {
    if (el && document.body) {
      document.body.appendChild(el);
    }
  }

  function ensureScrim() {
    if (!scrimEl) {
      scrimEl = document.createElement('div');
      scrimEl.id = 'frido-overlay-scrim';
      scrimEl.className = 'frido-overlay-scrim';
      scrimEl.setAttribute('hidden', '');
      scrimEl.setAttribute('aria-hidden', 'true');
      document.body.appendChild(scrimEl);
      scrimEl.addEventListener('click', onScrimClick);
    }
    return scrimEl;
  }

  function onScrimClick() {
    var top = openEntries[openEntries.length - 1];
    if (!top) return;
    closeOverlay(top.el, top.opts);
  }

  function syncScrim() {
    var scrim = ensureScrim();
    if (!openEntries.length) {
      scrim.classList.remove('is-visible');
      var ms = durationMs(scrim);
      window.setTimeout(function () {
        if (!openEntries.length) {
          scrim.setAttribute('hidden', '');
          scrim.setAttribute('aria-hidden', 'true');
        }
      }, ms);
      return;
    }

    scrim.removeAttribute('hidden');
    scrim.setAttribute('aria-hidden', 'false');
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        scrim.classList.add('is-visible');
      });
    });
  }

  function pruneStaleEntries() {
    openEntries = openEntries.filter(function (entry) {
      return (
        entry.el &&
        (entry.el.classList.contains('is-open') ||
          entry.el.classList.contains('is-closing') ||
          entry.el.getAttribute('aria-hidden') === 'false')
      );
    });
  }

  function trackOpen(el, opts) {
    var exists = openEntries.some(function (entry) {
      return entry.el === el;
    });
    if (!exists) openEntries.push({ el: el, opts: opts || {} });
    syncScrim();
  }

  function untrackOpen(el) {
    openEntries = openEntries.filter(function (entry) {
      return entry.el !== el;
    });
    syncScrim();
  }

  function openOverlay(el, opts) {
    if (!el || el.classList.contains('is-open')) return;
    opts = opts || {};

    portalToBody(el);
    trackOpen(el, opts);

    el.classList.remove('is-closing');
    if (opts.setHidden !== false) el.removeAttribute('hidden');
    el.setAttribute('aria-hidden', 'false');

    if (opts.bodyClass) document.body.classList.add(opts.bodyClass);

    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        el.classList.add('is-open');
        syncScrim();
        if (opts.onOpened) opts.onOpened(el);
      });
    });
  }

  function closeOverlay(el, opts) {
    if (!el) return;
    opts = opts || {};

    function finish() {
      el.classList.remove('is-closing', 'is-open');
      el.setAttribute('aria-hidden', 'true');
      if (opts.setHidden !== false) el.setAttribute('hidden', '');

      untrackOpen(el);
      pruneStaleEntries();

      if (opts.bodyClass && !shouldKeepBodyClass(opts.bodyClass, opts.keepBodyClassIf)) {
        document.body.classList.remove(opts.bodyClass);
      }

      if (opts.onClosed) opts.onClosed(el);
    }

    if (!el.classList.contains('is-open') && !el.classList.contains('is-closing')) {
      finish();
      return;
    }

    var ms = opts.duration != null ? opts.duration : durationMs(el);
    if (ms <= 0) {
      finish();
      return;
    }

    el.classList.add('is-closing');
    el.classList.remove('is-open');
    window.setTimeout(finish, ms);
  }

  window.FridoOverlay = {
    open: openOverlay,
    close: closeOverlay,
    portal: portalToBody,
    duration: DEFAULT_MS,
    durationMs: durationMs,
  };
})();
