/**
 * PDP reviews — Hike masonry grid from Judge.me JSON + widget fallback
 */
(function () {
  function qs(sel, root) {
    return (root || document).querySelector(sel);
  }

  function qsa(sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function starsHtml(rating) {
    var r = Math.max(1, Math.min(5, Math.round(rating || 5)));
    var out = '<span class="frido-stars" role="img" aria-label="' + r + ' out of 5 stars">';
    for (var i = 1; i <= 5; i++) {
      var fill = i <= r ? 'currentColor' : 'none';
      out +=
        '<svg width="14" height="14" viewBox="0 0 24 24" fill="' +
        fill +
        '" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><path d="M12 2.5l2.9 6.1 6.6.6-5 4.5 1.5 6.5L12 17.8 5.9 20.2l1.5-6.5-5-4.5 6.6-.6L12 2.5z"/></svg>';
    }
    out += '</span>';
    return out;
  }

  function reviewCardHtml(review) {
    var author =
      review.reviewer_name ||
      review.author ||
      review.name ||
      review.user_name ||
      'Customer';
    var rating = review.rating || review.score || 5;
    var body = review.body || review.content || review.review || '';
    var verified =
      review.verified_buyer ||
      review.verified ||
      review.buyer_verified ||
      false;
    var img = '';
    if (review.pictures && review.pictures[0]) {
      var pic = review.pictures[0];
      img =
        (pic.urls && pic.urls.original) ||
        pic.url ||
        (typeof pic === 'string' ? pic : '');
    } else if (review.picture_urls && review.picture_urls[0]) {
      img = review.picture_urls[0];
    } else if (review.photo_url) {
      img = review.photo_url;
    }

    var media = img
      ? '<img class="frido-pdp-review-card__img" src="' +
        escapeHtml(img) +
        '" alt="' +
        escapeHtml(author) +
        '" loading="lazy" width="400" height="400">'
      : '<div class="frido-pdp-review-card__img frido-pdp-review-card__img--placeholder" aria-hidden="true"></div>';

    var verifiedHtml = verified
      ? '<span class="frido-pdp-review-card__verified"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/></svg> Verified</span>'
      : '';

    return (
      '<article class="frido-pdp-review-card">' +
      '<div class="frido-pdp-review-card__media">' +
      media +
      '</div>' +
      '<div class="frido-pdp-review-card__body">' +
      '<div class="frido-pdp-review-card__meta">' +
      '<span class="frido-pdp-review-card__name">' +
      escapeHtml(author) +
      '</span>' +
      verifiedHtml +
      '</div>' +
      starsHtml(rating) +
      (body ? '<div class="frido-pdp-review-card__text">' + body + '</div>' : '') +
      '</div></article>'
    );
  }

  function getReviewsFromData(data) {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (Array.isArray(data.reviews)) return data.reviews;
    if (data.review_widgets && Array.isArray(data.review_widgets.reviews)) {
      return data.review_widgets.reviews;
    }
    if (data.widget && Array.isArray(data.widget.reviews)) return data.widget.reviews;
    return [];
  }

  function readWidgetData(root, productId) {
    var jsonEl = root.querySelector('[data-frido-judgeme-json]');
    if (jsonEl && jsonEl.textContent.trim()) {
      try {
        return JSON.parse(jsonEl.textContent);
      } catch (e) {
        /* ignore */
      }
    }
    if (window.jdgm && jdgm.data && jdgm.data.reviewWidget && jdgm.data.reviewWidget[productId]) {
      return jdgm.data.reviewWidget[productId];
    }
    return null;
  }

  function renderCustomMasonry(root) {
    var productId = root.getAttribute('data-product-id');
    var grid = qs('[data-frido-reviews-grid]', root);
    var moreWrap = qs('[data-frido-reviews-more-wrap]', root);
    var moreBtn = qs('[data-frido-reviews-more]', root);
    var perPage = parseInt(root.getAttribute('data-reviews-per-page'), 10) || 12;

    if (!grid) return false;

    var data = readWidgetData(root, productId);
    var reviews = getReviewsFromData(data);
    if (!reviews.length) return false;

    qsa('[data-frido-reviews-ugc-card]', grid).forEach(function (el) {
      el.remove();
    });

    root._fridoAllReviews = reviews;
    root._fridoShown = 0;

    function renderBatch() {
      var end = Math.min(root._fridoShown + perPage, reviews.length);
      var html = '';
      for (var i = root._fridoShown; i < end; i++) {
        html += reviewCardHtml(reviews[i]);
      }
      grid.insertAdjacentHTML('beforeend', html);
      root._fridoShown = end;

      if (moreWrap) {
        moreWrap.hidden = root._fridoShown >= reviews.length;
      }
    }

    renderBatch();

    if (moreBtn) {
      moreBtn.onclick = function () {
        renderBatch();
      };
    }

    var countEl = qs('[data-frido-reviews-count]', root);
    if (countEl) {
      var total = data.total_reviews || data.reviews_count || reviews.length;
      countEl.textContent = total + ' Reviews';
    }

    return true;
  }

  function hasJudgeMeCards(root) {
    return qsa('.jdgm-rev', root).length > 0;
  }

  function activateJudgeMeWidget(root) {
    var judgemeRoot = qs('[data-frido-judgeme-root]', root);
    var grid = qs('[data-frido-reviews-grid]', root);
    if (!judgemeRoot) return false;

    judgemeRoot.hidden = false;

    if (typeof window.jdgm !== 'undefined') {
      try {
        if (typeof jdgm.renderWidgets === 'function') jdgm.renderWidgets();
        if (typeof jdgm.loadWidgets === 'function') jdgm.loadWidgets();
      } catch (e) {
        /* ignore */
      }
    }

    if (!hasJudgeMeCards(root)) return false;

    if (grid) grid.hidden = true;

    qsa('.jdgm-rev-widg__header, .jdgm-widget-actions-wrapper', root).forEach(function (el) {
      el.style.display = 'none';
    });

    var countEl = qs('[data-frido-reviews-count]', root);
    var jdgmCount = root.querySelector('.jdgm-rev-widg__summary-text');
    if (countEl && jdgmCount && jdgmCount.textContent.trim()) {
      var text = jdgmCount.textContent.trim();
      countEl.textContent = text.indexOf('Review') !== -1 ? text : text + ' Reviews';
    }

    qsa('.jdgm-paginate, .jdgm-rev-widg__reviews-footer', root).forEach(function (el) {
      el.classList.add('frido-pdp-reviews__more-wrap');
    });

    return true;
  }

  function wireActions(root) {
    var writeBtn = qs('[data-frido-write-review]', root);
    if (writeBtn) {
      writeBtn.addEventListener('click', function () {
        if (typeof window.jdgm !== 'undefined' && typeof jdgm.openWriteReviewForm === 'function') {
          jdgm.openWriteReviewForm(root.getAttribute('data-product-id'));
          return;
        }
        var link =
          root.querySelector('.jdgm-write-rev-link') || root.querySelector('.jdgm-write-review-link');
        if (link) link.click();
      });
    }

    var filterBtn = qs('[data-frido-reviews-filter]', root);
    if (filterBtn) {
      filterBtn.addEventListener('click', function () {
        root.classList.toggle('frido-pdp-reviews--filters-open');
        var sort = root.querySelector('.jdgm-rev-widg__sort-wrapper, .jdgm-subtab');
        if (sort) {
          sort.style.display = 'block';
          sort.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      });
    }
  }

  function initSection(root) {
    if (!root || root._fridoReviewsInit) return;
    root._fridoReviewsInit = true;

    var loading = qs('[data-frido-reviews-loading]', root);
    var error = qs('[data-frido-reviews-error]', root);
    var grid = qs('[data-frido-reviews-grid]', root);

    wireActions(root);

    var hasCustom = renderCustomMasonry(root);
    var hasUgc = grid && qsa('[data-frido-reviews-ugc-card]', grid).length > 0;

    if (hasCustom || hasUgc) {
      root.classList.add('frido-pdp-reviews--loaded');
      if (loading) loading.hidden = true;
      if (error) error.hidden = true;
      if (hasCustom && qs('[data-frido-reviews-more-wrap]', root)) {
        qs('[data-frido-reviews-more-wrap]', root).hidden = false;
      }
    }

    var attempts = 0;
    function pollJudgeMe() {
      attempts += 1;
      if (activateJudgeMeWidget(root)) {
        root.classList.add('frido-pdp-reviews--loaded', 'frido-pdp-reviews--judgeme-native');
        if (loading) loading.hidden = true;
        if (error) error.hidden = true;
        return;
      }
      if (attempts < 30 && !hasCustom && !hasUgc) {
        window.setTimeout(pollJudgeMe, 500);
        return;
      }
      if (!hasCustom && !hasUgc) {
        if (loading) loading.hidden = true;
        if (error) error.hidden = false;
      }
    }

    pollJudgeMe();
  }

  function boot() {
    qsa('[data-frido-pdp-reviews]').forEach(initSection);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  document.addEventListener('shopify:section:load', function (e) {
    var el = e.target.querySelector('[data-frido-pdp-reviews]');
    if (el) initSection(el);
  });
})();
