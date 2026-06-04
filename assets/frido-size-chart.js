(function () {
  var BODY_CLASS = 'frido-size-chart-open';
  var KEEP_OPEN = '.frido-size-chart.is-open, .frido-size-chart.is-closing';

  var VARIANT_TO_US = {
    'M 6 - 6.5': ['6', '6.5'],
    'M 7 - 7.5': ['7', '7.5'],
    'M 8 - 8.5': ['8', '8.5'],
    'M 9 - 9.5': ['9', '9.5'],
    'M 10 - 10.5': ['10', '10.5'],
    'M 11 - 11.5': ['11', '11.5'],
    'M 12 - 12.5': ['12', '12.5'],
    'M 13': ['13'],
    'W 6': ['6'],
    'W 7 - 7.5': ['7', '7.5'],
    'W 8 - 8.5': ['8', '8.5'],
    'W 9 - 9.5': ['9', '9.5'],
    'W 10 - 10.5': ['10', '10.5'],
    'W 11 - 11.5': ['11', '11.5'],
    'W 12 - 12.5': ['12', '12.5'],
    'W 13 - 13.5': ['13', '13.5'],
    'W -14': ['14'],
  };

  function qs(sel, root) {
    return (root || document).querySelector(sel);
  }

  function qsa(sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  }

  function variantLabelToUsKeys(label) {
    if (!label) return [];
    var trimmed = String(label).trim();
    if (VARIANT_TO_US[trimmed]) return VARIANT_TO_US[trimmed];
    if (/^[\d.]+$/.test(trimmed)) return [trimmed];
    return [];
  }

  function highlightColumns(drawer, sizeLabel) {
    if (!drawer) return;
    var keys = variantLabelToUsKeys(sizeLabel);
    qsa('[data-frido-us-col]', drawer).forEach(function (cell) {
      var col = cell.getAttribute('data-frido-us-col');
      cell.classList.toggle('is-highlight', keys.indexOf(col) !== -1);
    });
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
      var recVal = qs('[data-frido-size-chart-rec-value]', drawer);
      if (recVal && recVal.textContent) {
        highlightColumns(drawer, recVal.textContent);
      }
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

  window.FridoSizeChart = {
    highlight: highlightColumns,
    variantLabelToUsKeys: variantLabelToUsKeys,
  };

  document.addEventListener('click', function (e) {
    var closeBtn = e.target.closest('[data-frido-size-chart-close]');
    if (closeBtn) {
      var drawer = closeBtn.closest('[data-frido-size-chart]');
      if (drawer) closeDrawer(drawer);
      return;
    }

    var quizBtn = e.target.closest('[data-frido-size-quiz-open]');
    if (quizBtn) {
      closeAll();
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
