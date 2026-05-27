/**
 * Shared overlay open/close with exit animations.
 */
(function () {
  var DEFAULT_MS = 320;

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

  function openOverlay(el, opts) {
    if (!el || el.classList.contains('is-open')) return;
    opts = opts || {};

    el.classList.remove('is-closing');
    if (opts.setHidden !== false) el.removeAttribute('hidden');
    el.setAttribute('aria-hidden', 'false');

    if (opts.bodyClass) document.body.classList.add(opts.bodyClass);

    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        el.classList.add('is-open');
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
    duration: DEFAULT_MS,
    durationMs: durationMs,
  };
})();
