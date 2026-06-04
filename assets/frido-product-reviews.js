/**
 * Judge.me PDP reviews — fallback header when widget missing; masonry styling when loaded.
 */
(function () {
  function qs(sel, root) {
    return (root || document).querySelector(sel);
  }

  function qsa(sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  }

  function getWidgetEl(root) {
    return qs('[data-frido-judgeme-widget]', root) || qs('.frido-judgeme-reviews__widget', root);
  }

  function widgetHydrated(root) {
    var widget = getWidgetEl(root);
    if (!widget) return false;
    return !!(widget.querySelector('.jdgm-rev-widg') || widget.querySelector('.jdgm-rev'));
  }

  function setFallbackHeader(root, show) {
    var header = qs('[data-frido-reviews-header-fallback]', root);
    if (!header) return;

    if (show) {
      root.classList.add('frido-judgeme-reviews--no-widget');
      root.classList.remove('frido-judgeme-reviews--widget-loaded');
      header.hidden = false;
    } else {
      root.classList.remove('frido-judgeme-reviews--no-widget');
      root.classList.add('frido-judgeme-reviews--widget-loaded');
      header.hidden = true;
    }
  }

  function renderWidgets() {
    if (typeof window.jdgm === 'undefined') return;
    try {
      if (typeof jdgm.renderWidgets === 'function') jdgm.renderWidgets();
      if (typeof jdgm.loadWidgets === 'function') jdgm.loadWidgets();
    } catch (e) {
      /* ignore */
    }
  }

  function syncCount(root) {
    var countEl = qs('[data-frido-reviews-count]', root);
    if (!countEl) return;

    var summary =
      root.querySelector('.jdgm-rev-widg__summary-text') ||
      root.querySelector('.jdgm-rev-widg__summary');
    if (summary && summary.textContent.trim()) {
      var text = summary.textContent.trim().replace(/\s+/g, ' ');
      if (text.indexOf('Review') === -1) {
        text = text + ' Reviews';
      }
      countEl.textContent = text;
    }
  }

  function wireActions(root) {
    var writeBtn = qs('[data-frido-write-review]', root);
    if (writeBtn && !writeBtn._fridoBound) {
      writeBtn._fridoBound = true;
      writeBtn.addEventListener('click', function () {
        var productId = root.getAttribute('data-product-id');
        if (typeof window.jdgm !== 'undefined' && typeof jdgm.openWriteReviewForm === 'function') {
          jdgm.openWriteReviewForm(productId);
          return;
        }
        var link =
          root.querySelector('.jdgm-write-rev-link') ||
          root.querySelector('.jdgm-write-review-link') ||
          root.querySelector('[data-jdgm-write-review]');
        if (link) link.click();
      });
    }

    var filterBtn = qs('[data-frido-reviews-filter]', root);
    if (filterBtn && !filterBtn._fridoBound) {
      filterBtn._fridoBound = true;
      filterBtn.addEventListener('click', function () {
        var open = root.classList.toggle('frido-judgeme-reviews--filters-open');
        filterBtn.setAttribute('aria-pressed', open ? 'true' : 'false');
        var sort = root.querySelector('.jdgm-rev-widg__sort-wrapper, .jdgm-subtab');
        if (sort && open) {
          sort.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      });
    }
  }

  function fixStarGlyphs(root) {
    qsa('.jdgm-rev__rating, .jdgm-rev-widg__summary-stars', root).forEach(function (rating) {
      var stars = qsa('.jdgm-star', rating);
      if (!stars.length) return;

      var hasState = stars.some(function (s) {
        return (
          s.classList.contains('jdgm--on') ||
          s.classList.contains('jdgm--off') ||
          s.classList.contains('jdgm--filled')
        );
      });
      if (hasState) return;

      var score = parseFloat(rating.getAttribute('data-score') || '', 10);
      if (isNaN(score)) {
        var label = rating.getAttribute('aria-label') || '';
        var match = label.match(/(\d+(?:\.\d+)?)/);
        score = match ? parseFloat(match[1], 10) : 5;
      }

      var filled = Math.round(score);
      stars.forEach(function (star, idx) {
        if (idx < filled) {
          star.classList.add('jdgm--on');
          star.classList.remove('jdgm--off');
        } else {
          star.classList.add('jdgm--off');
          star.classList.remove('jdgm--on');
        }
      });
    });
  }

  function markWidgetReady(root) {
    fixStarGlyphs(root);
    setFallbackHeader(root, false);
    root.classList.add('frido-judgeme-reviews--ready');
    syncCount(root);
    wireActions(root);
  }

  function markWidgetMissing(root) {
    setFallbackHeader(root, true);
    root.classList.add('frido-judgeme-reviews--ready');
    wireActions(root);
  }

  function initSection(root) {
    if (!root || root._fridoJudgemeInit) return;
    root._fridoJudgemeInit = true;

    if (!getWidgetEl(root)) {
      markWidgetMissing(root);
      return;
    }

    wireActions(root);
    renderWidgets();

    var attempts = 0;
    function poll() {
      attempts += 1;
      if (widgetHydrated(root)) {
        markWidgetReady(root);
        return;
      }
      if (attempts < 40) {
        window.setTimeout(poll, 500);
        return;
      }
      markWidgetMissing(root);
    }

    poll();
  }

  function boot() {
    qsa('[data-frido-judgeme-reviews]').forEach(initSection);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  document.addEventListener('shopify:section:load', function (e) {
    var el = e.target.querySelector('[data-frido-judgeme-reviews]');
    if (el) initSection(el);
  });
})();
