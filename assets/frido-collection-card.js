/**
 * Collection product cards — per-collection order, default swatch, image swap on hover
 */
(function () {
  function getCardImg(card) {
    return card && card.querySelector('[data-frido-pcard-img]');
  }

  function setCardImage(card, url) {
    var img = getCardImg(card);
    if (!img || !url) return;
    img.src = url;
    img.removeAttribute('srcset');
    img.removeAttribute('sizes');
  }

  function resetCardImage(card) {
    if (!card) return;
    var defaultUrl = card.getAttribute('data-default-image');
    if (defaultUrl) setCardImage(card, defaultUrl);
    card.querySelectorAll('[data-frido-pcard-swatch]').forEach(function (btn) {
      btn.classList.remove('is-active');
    });
    var def = card.querySelector('[data-frido-pcard-swatch-default]');
    if (def) def.classList.add('is-active');
  }

  function activateSwatch(swatch) {
    var url = swatch.getAttribute('data-image');
    if (!url) return;
    var card = swatch.closest('[data-frido-pcard]');
    if (!card) return;
    setCardImage(card, url);
    card.querySelectorAll('[data-frido-pcard-swatch]').forEach(function (btn) {
      btn.classList.toggle('is-active', btn === swatch);
    });
  }

  function sortKey(collectionKey, productId) {
    var str = String(collectionKey || '') + '|' + String(productId || '');
    var h = 0;
    for (var i = 0; i < str.length; i++) {
      h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
    }
    return h;
  }

  function initCollectionGridOrder() {
    var list = document.getElementById('product-grid');
    if (!list || list.getAttribute('data-frido-order-applied') === '1') return;

    var collectionKey = list.getAttribute('data-collection-key');
    if (!collectionKey) return;

    var items = Array.prototype.slice.call(
      list.querySelectorAll(':scope > .frido-collection-page__item:not(.frido-collection-page__item--promo)')
    );
    if (items.length < 2) return;

    items.sort(function (a, b) {
      var cardA = a.querySelector('[data-frido-pcard]');
      var cardB = b.querySelector('[data-frido-pcard]');
      var idA = cardA && cardA.getAttribute('data-product-id');
      var idB = cardB && cardB.getAttribute('data-product-id');
      return sortKey(collectionKey, idA) - sortKey(collectionKey, idB);
    });

    items.forEach(function (item) {
      list.appendChild(item);
    });
    list.setAttribute('data-frido-order-applied', '1');
  }

  function initCollectionGrid() {
    initCollectionGridOrder();
  }

  document.addEventListener('DOMContentLoaded', initCollectionGrid);
  document.addEventListener('frido:collection:grid-updated', initCollectionGrid);

  document.addEventListener(
    'mouseenter',
    function (e) {
      var swatch = e.target.closest('[data-frido-pcard-swatch]');
      if (swatch) activateSwatch(swatch);
    },
    true
  );

  document.addEventListener(
    'mouseleave',
    function (e) {
      var swatches = e.target.closest('.frido-pcard__swatches');
      if (!swatches) return;
      var related = e.relatedTarget;
      if (related && swatches.contains(related)) return;
      resetCardImage(swatches.closest('[data-frido-pcard]'));
    },
    true
  );

  document.addEventListener(
    'focusin',
    function (e) {
      var swatch = e.target.closest('[data-frido-pcard-swatch]');
      if (swatch) activateSwatch(swatch);
    },
    true
  );

  document.addEventListener(
    'focusout',
    function (e) {
      var swatches = e.target.closest('.frido-pcard__swatches');
      if (!swatches) return;
      window.setTimeout(function () {
        if (swatches.contains(document.activeElement)) return;
        resetCardImage(swatches.closest('[data-frido-pcard]'));
      }, 0);
    },
    true
  );
})();
