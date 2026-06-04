/**
 * PDP reviews — filter toggle + write-review helper for Judge.me
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
  }

  document.querySelectorAll('[data-frido-pdp-reviews]').forEach(initSection);
  document.addEventListener('shopify:section:load', function (e) {
    var el = e.target.querySelector('[data-frido-pdp-reviews]');
    if (el) initSection(el);
  });
})();
