/**
 * Style Judge.me widget as Hike masonry — wire header actions only (single widget).
 */
(function () {
  function qs(sel, root) {
    return (root || document).querySelector(sel);
  }

  function qsa(sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  }

  function hasReviews(root) {
    return qsa('.jdgm-rev', root).length > 0;
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

  function markReady(root) {
    root.classList.add('frido-judgeme-reviews--ready');
    syncCount(root);
    wireActions(root);
  }

  function initSection(root) {
    if (!root || root._fridoJudgemeInit) return;
    root._fridoJudgemeInit = true;

    wireActions(root);
    renderWidgets();

    var attempts = 0;
    function poll() {
      attempts += 1;
      if (hasReviews(root)) {
        markReady(root);
        return;
      }
      if (attempts < 40) {
        window.setTimeout(poll, 500);
      }
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
