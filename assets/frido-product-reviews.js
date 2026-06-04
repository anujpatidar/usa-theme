/**
 * PDP reviews — filter toggle, write-review helper, Judge.me count sync
 */
(function () {
  function initSection(root) {
    if (!root || root._fridoReviewsInit) return;
    root._fridoReviewsInit = true;

    var filterBtn = root.querySelector('[data-frido-reviews-filter]');
    if (filterBtn) {
      filterBtn.addEventListener('click', function () {
        var open = root.classList.toggle('frido-pdp-reviews--filters-open');
        filterBtn.setAttribute('aria-pressed', open ? 'true' : 'false');
        if (open) {
          var sort = root.querySelector('.jdgm-rev-widg__sort-wrapper, .jdgm-subtab');
          if (sort) sort.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      });
    }

    root.querySelectorAll('[data-frido-write-review]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        var jdgmLink = root.querySelector('.jdgm-write-rev-link, .jdgm-write-review-link, [data-jdgm-write-review]');
        if (jdgmLink) {
          e.preventDefault();
          jdgmLink.click();
        }
      });
    });

    syncJudgeMeCount(root);
  }

  function syncJudgeMeCount(root) {
    var countEl = root.querySelector('[data-frido-reviews-count-jdgm]');
    if (!countEl) return;

    function applyCount() {
      var widget = root.querySelector('.jdgm-rev-widg');
      if (!widget) return false;

      var n = 0;
      var dataCount = widget.getAttribute('data-number-of-reviews');
      if (dataCount) n = parseInt(dataCount, 10) || 0;
      if (!n) {
        var summary = widget.querySelector('.jdgm-rev-widg__summary-text, .jdgm-rev-widg__title');
        if (summary && summary.textContent) {
          var m = summary.textContent.match(/(\d[\d,]*)\s*review/i);
          if (m) n = parseInt(m[1].replace(/,/g, ''), 10) || 0;
        }
      }
      if (!n) {
        n = root.querySelectorAll('.jdgm-rev[data-review-id], .jdgm-rev').length;
      }
      if (n > 0) {
        countEl.textContent = n.toLocaleString() + ' Reviews';
        return true;
      }
      return false;
    }

    var tries = 0;
    var timer = setInterval(function () {
      tries += 1;
      if (applyCount() || tries > 40) clearInterval(timer);
    }, 500);
  }

  document.querySelectorAll('[data-frido-pdp-reviews]').forEach(initSection);
  document.addEventListener('shopify:section:load', function (e) {
    var el = e.target.querySelector('[data-frido-pdp-reviews]');
    if (el) initSection(el);
  });
})();
