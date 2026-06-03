/**
 * Collection product cards — default swatch + image swap on hover.
 * Product order is set server-side in snippets/frido-collection-grid-items.liquid.
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
