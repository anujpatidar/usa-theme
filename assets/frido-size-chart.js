(function () {
  var BODY_CLASS = 'frido-size-chart-open';
  var KEEP_OPEN = '.frido-size-chart.is-open, .frido-size-chart.is-closing';

  function qs(sel, root) {
    return (root || document).querySelector(sel);
  }

  function qsa(sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  }

  function setTriggers(sectionId, expanded) {
    qsa('[data-frido-size-chart-open="' + sectionId + '"]').forEach(function (btn) {
      btn.setAttribute('aria-expanded', expanded ? 'true' : 'false');
    });
  }

  function openDrawer(drawer) {
    if (!drawer || drawer.classList.contains('is-open')) return;
    var sectionId = drawer.id.replace('frido-size-chart-', '');

    function onOpened() {
      var panel = qs('.frido-size-chart__panel', drawer);
      if (panel) panel.focus();
      setTriggers(sectionId, true);
    }

    if (window.FridoOverlay) {
      FridoOverlay.open(drawer, { bodyClass: BODY_CLASS, onOpened: onOpened });
    } else {
      drawer.removeAttribute('hidden');
      drawer.setAttribute('aria-hidden', 'false');
      drawer.classList.add('is-open');
      document.body.classList.add(BODY_CLASS);
      onOpened();
    }
  }

  function closeDrawer(drawer) {
    if (!drawer) return;
    if (!drawer.classList.contains('is-open') && !drawer.classList.contains('is-closing')) return;

    var sectionId = drawer.id.replace('frido-size-chart-', '');

    function onClosed() {
      setTriggers(sectionId, false);
    }

    if (window.FridoOverlay) {
      FridoOverlay.close(drawer, {
        bodyClass: BODY_CLASS,
        keepBodyClassIf: KEEP_OPEN,
        onClosed: onClosed,
      });
    } else {
      drawer.classList.remove('is-open');
      drawer.setAttribute('aria-hidden', 'true');
      drawer.setAttribute('hidden', '');
      if (!document.querySelector('.frido-size-chart.is-open')) {
        document.body.classList.remove(BODY_CLASS);
      }
      onClosed();
    }
  }

  function closeAll() {
    qsa('.frido-size-chart.is-open').forEach(closeDrawer);
  }

  function bindDrawer(drawer) {
    if (drawer.dataset.fridoSizeChartBound) return;
    drawer.dataset.fridoSizeChartBound = '1';

    var sectionId = drawer.id.replace('frido-size-chart-', '');

    qsa('[data-frido-size-chart-open="' + sectionId + '"]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        openDrawer(drawer);
      });
    });

    qsa('[data-frido-size-chart-close]', drawer).forEach(function (el) {
      el.addEventListener('click', function () {
        closeDrawer(drawer);
      });
    });
  }

  function init() {
    qsa('[data-frido-size-chart]').forEach(bindDrawer);
  }

  document.addEventListener('click', function (e) {
    var closeBtn = e.target.closest('[data-frido-size-chart-close]');
    if (closeBtn) {
      var drawer = closeBtn.closest('[data-frido-size-chart]');
      if (drawer) closeDrawer(drawer);
      return;
    }

    var scrollBtn = e.target.closest('[data-frido-find-size-scroll]');
    if (scrollBtn) {
      e.preventDefault();
      closeAll();
      var target = document.querySelector(scrollBtn.getAttribute('data-frido-find-size-scroll'));
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeAll();
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  document.addEventListener('shopify:section:load', init);
})();
