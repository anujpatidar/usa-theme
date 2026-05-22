/**
 * Frido PDP — gallery (color-aware), variants, bundles, sticky bar
 */
(function () {
  function qs(sel, root) {
    return (root || document).querySelector(sel);
  }
  function qsa(sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  }

  function formatMoney(cents, format) {
    if (typeof Shopify !== 'undefined' && Shopify.formatMoney) {
      return Shopify.formatMoney(cents, format || window.theme?.moneyFormat);
    }
    return '$' + (cents / 100).toFixed(2);
  }

  function getColorOptionIndex(product) {
    return product.options.findIndex(function (o) {
      return /colou?r/i.test(o);
    });
  }

  function getColorOptionKey(product) {
    var idx = getColorOptionIndex(product);
    return idx >= 0 ? 'option' + (idx + 1) : null;
  }

  function normalizeMedia(m) {
    if (!m) return null;
    var src =
      m.preview_image?.src ||
      m.preview_image ||
      m.src ||
      (m.featured_image && m.featured_image.src) ||
      '';
    if (!src && m.id) return null;
    var type = m.media_type || 'image';
    if (/\.mp4(\?|$)/i.test(src)) type = 'video';
    return {
      id: m.id,
      src: src,
      alt: m.alt || '',
      type: type,
    };
  }

  function mediaFromProductList(product, id) {
    var found = (product.media || []).find(function (m) {
      return m.id === id;
    });
    return normalizeMedia(found);
  }

  var GALLERY_MAX = 7;

  function mediaAltMatchesColor(media, color) {
    var alt = (media.alt || '').toLowerCase();
    var c = String(color).toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp('[\\s—–\\-]+' + c + '[\\s—–\\-]+').test(alt);
  }

  function mediaMatchesColorOnly(media, color, allColors) {
    if (!mediaAltMatchesColor(media, color)) return false;
    for (var i = 0; i < allColors.length; i++) {
      if (allColors[i] !== color && mediaAltMatchesColor(media, allColors[i])) {
        return false;
      }
    }
    return true;
  }

  function sortColorMedia(list) {
    return list.slice().sort(function (a, b) {
      var ma = (a.alt || '').match(/(\d+)\.(mp4|jpe?g|png|webp)/i);
      var mb = (b.alt || '').match(/(\d+)\.(mp4|jpe?g|png|webp)/i);
      var na = ma ? parseInt(ma[1], 10) : 999;
      var nb = mb ? parseInt(mb[1], 10) : 999;
      if (na !== nb) return na - nb;
      if (a.type === 'video' && b.type !== 'video') return -1;
      if (b.type === 'video' && a.type !== 'video') return 1;
      return 0;
    });
  }

  function buildGalleryGroups(product) {
    var all = (product.media || []).map(normalizeMedia).filter(Boolean);
    var colorKey = getColorOptionKey(product);
    if (!colorKey || !product.variants.length) {
      return { _default: all.slice(0, GALLERY_MAX) };
    }

    var colors = [];
    product.variants.forEach(function (v) {
      var c = v[colorKey];
      if (c && colors.indexOf(c) === -1) colors.push(c);
    });

    var groups = {};

    colors.forEach(function (color) {
      var seen = {};
      var list = [];
      (product.media || []).forEach(function (m) {
        if (!mediaMatchesColorOnly(m, color, colors)) return;
        var item = normalizeMedia(m);
        if (item && !seen[item.id]) {
          seen[item.id] = true;
          list.push(item);
        }
      });
      groups[color] = sortColorMedia(list).slice(0, GALLERY_MAX);
    });

    groups._default = groups[colors[0]] || [];
    return groups;
  }

  function initGallery(root, product) {
    var gallery = qs('[data-frido-gallery]', root);
    if (!gallery) return null;

    var desktop = qs('[data-frido-gallery-desktop]', gallery);
    var heroEl = qs('[data-frido-gallery-hero]', gallery);
    var pairEl = qs('[data-frido-gallery-pair]', gallery);
    var mobile = qs('[data-frido-gallery-mobile]', gallery);
    var track = qs('[data-frido-gallery-track]', gallery);
    var dotsWrap = qs('[data-frido-gallery-dots]', gallery);

    var groups = buildGalleryGroups(product);
    var mobileIndex = 0;
    var colorKey = getColorOptionKey(product);
    var productTitle = (product.title || '').replace(/"/g, '&quot;');

    function mediaHtml(item, opts) {
      opts = opts || {};
      if (item.type === 'video') {
        return (
          '<video class="frido-pdp-gallery__video" src="' +
          item.src +
          '" autoplay muted loop playsinline preload="metadata" aria-label="' +
          (item.alt || productTitle).replace(/"/g, '&quot;') +
          '"></video>'
        );
      }
      var loading = opts.loading || 'lazy';
      var sizes = opts.sizes || '100vw';
      var alt = (item.alt || productTitle).replace(/"/g, '&quot;');
      return (
        '<img src="' +
        item.src +
        '" alt="' +
        alt +
        '" class="frido-pdp-gallery__img" loading="' +
        loading +
        '" sizes="' +
        sizes +
        '" data-frido-gallery-img>'
      );
    }

    function renderDesktop(mediaList) {
      if (!desktop || !heroEl) return;
      var list = (mediaList.length ? mediaList : groups._default || []).slice(0, GALLERY_MAX);
      if (!list.length) return;

      var hero = list[0];
      heroEl.innerHTML = mediaHtml(hero, {
        loading: 'eager',
        sizes: '(min-width: 990px) 50vw, 100vw',
        widths: '600,900,1200,1400',
      });

      if (!pairEl) return;
      var subs = list.slice(1, GALLERY_MAX);
      var rows = [];
      for (var i = 0; i < subs.length; i += 2) {
        rows.push(subs.slice(i, i + 2));
      }
      pairEl.innerHTML = rows
        .map(function (row) {
          return (
            '<div class="frido-pdp-gallery__row">' +
            row
              .map(function (item) {
                return (
                  '<div class="frido-pdp-gallery__sub" data-frido-gallery-sub>' +
                  mediaHtml(item, {
                    sizes: '(min-width: 990px) 25vw, 50vw',
                    widths: '400,600,800',
                  }) +
                  '</div>'
                );
              })
              .join('') +
            '</div>'
          );
        })
        .join('');
    }

    function renderMobile(mediaList) {
      if (!track) return;
      var list = (mediaList.length ? mediaList : groups._default || []).slice(0, GALLERY_MAX);
      if (!list.length) return;

      track.innerHTML = list
        .map(function (item, i) {
          return (
            '<div class="frido-pdp-gallery__slide' +
            (i === 0 ? ' is-active' : '') +
            '" data-frido-gallery-slide data-media-id="' +
            item.id +
            '">' +
            mediaHtml(item, { loading: i === 0 ? 'eager' : 'lazy', sizes: '100vw' }) +
            '</div>'
          );
        })
        .join('');

      if (dotsWrap) {
        if (list.length <= 1) {
          dotsWrap.innerHTML = '';
          dotsWrap.hidden = true;
        } else {
          dotsWrap.hidden = false;
          dotsWrap.innerHTML = list
            .map(function (_, i) {
              return (
                '<button type="button" class="frido-pdp-gallery__dot' +
                (i === 0 ? ' is-active' : '') +
                '" data-frido-gallery-dot="' +
                i +
                '" aria-label="Image ' +
                (i + 1) +
                '"></button>'
              );
            })
            .join('');
          bindMobileNav();
        }
      }
      mobileIndex = 0;
      bindTouch();
    }

    function goToMobile(i) {
      var slides = qsa('[data-frido-gallery-slide]', track);
      var dots = qsa('[data-frido-gallery-dot]', dotsWrap);
      if (!slides.length) return;
      mobileIndex = ((i % slides.length) + slides.length) % slides.length;
      slides.forEach(function (s, n) {
        s.classList.toggle('is-active', n === mobileIndex);
      });
      dots.forEach(function (d, n) {
        d.classList.toggle('is-active', n === mobileIndex);
      });
    }

    function bindMobileNav() {
      qsa('[data-frido-gallery-dot]', dotsWrap).forEach(function (dot) {
        dot.replaceWith(dot.cloneNode(true));
      });
      qsa('[data-frido-gallery-dot]', dotsWrap).forEach(function (dot) {
        dot.addEventListener('click', function () {
          goToMobile(parseInt(dot.getAttribute('data-frido-gallery-dot'), 10));
        });
      });
    }

    var touchStartX = 0;
    function bindTouch() {
      if (!track) return;
      track.onpointerdown = function (e) {
        touchStartX = e.clientX;
      };
      track.onpointerup = function (e) {
        var dx = e.clientX - touchStartX;
        if (Math.abs(dx) < 40) return;
        goToMobile(mobileIndex + (dx < 0 ? 1 : -1));
      };
    }

    function setForColor(color) {
      var list = (color && groups[color]) || groups._default || [];
      renderDesktop(list);
      renderMobile(list);
    }

    return {
      setForColor: setForColor,
      setForVariant: function (variant) {
        if (!variant || !colorKey) {
          setForColor(null);
          return;
        }
        setForColor(variant[colorKey]);
      },
    };
  }

  function initPdp(root) {
    var jsonEl = qs('[data-frido-product-json]', root);
    if (!jsonEl) return;
    var product = JSON.parse(jsonEl.textContent);
    var form = qs('[data-frido-product-form]', root);
    var variantInput = qs('[data-frido-variant-id]', root);
    var qtyInput = qs('[data-frido-quantity]', root);
    var selectedOptions = {};
    var galleryApi = initGallery(root, product);

    var current =
      product.variants.find(function (v) {
        return v.id === parseInt(variantInput.value, 10);
      }) || product.variants[0];

    product.options.forEach(function (opt, idx) {
      if (current) selectedOptions[opt] = current['option' + (idx + 1)];
    });

    function findVariant() {
      return product.variants.find(function (v) {
        return product.options.every(function (opt, idx) {
          return v['option' + (idx + 1)] === selectedOptions[opt];
        });
      });
    }

    function updateUI(variant) {
      if (!variant) return;
      current = variant;
      variantInput.value = variant.id;

      var money = formatMoney(variant.price);
      qsa('[data-frido-price]', root).forEach(function (el) {
        el.textContent = money;
      });
      var atcPrice = qs('[data-frido-atc-price]', root);
      var stickyPrice = qs('[data-frido-sticky-price]', root);
      if (atcPrice) atcPrice.textContent = money;
      if (stickyPrice) stickyPrice.textContent = money;

      var compare = variant.compare_at_price;
      qsa('[data-frido-compare]', root).forEach(function (el) {
        el.style.display = compare > variant.price ? '' : 'none';
        if (compare > variant.price) el.textContent = formatMoney(compare);
      });
      var atcCompare = qs('[data-frido-atc-compare]', root);
      if (atcCompare) {
        atcCompare.style.display = compare > variant.price ? '' : 'none';
        if (compare > variant.price) atcCompare.textContent = formatMoney(compare);
      }

      var saveBadge = qs('[data-frido-save-badge]', root);
      if (saveBadge && compare > variant.price) {
        var pct = Math.round(((compare - variant.price) * 100) / compare);
        saveBadge.textContent = 'Save ' + pct + '%';
        saveBadge.style.display = '';
      } else if (saveBadge) {
        saveBadge.style.display = compare > variant.price ? '' : 'none';
      }

      var atc = qs('[data-frido-atc]', root);
      if (atc) atc.disabled = !variant.available;

      var stickyThumb = qs('.frido-pdp-sticky__thumb', root);
      if (stickyThumb && variant.featured_image) {
        stickyThumb.src = variant.featured_image.src;
      }

      if (galleryApi) galleryApi.setForVariant(variant);

      var colorEl = qs('[data-frido-sel-color]', root);
      var sizeEl = qs('[data-frido-sel-size]', root);
      product.options.forEach(function (opt, idx) {
        var val = variant['option' + (idx + 1)];
        if (colorEl && /colou?r/i.test(opt)) colorEl.textContent = val;
        if (sizeEl && /size/i.test(opt)) sizeEl.textContent = val;
      });
    }

    qsa('[data-frido-option-value]', root).forEach(function (btn) {
      btn.addEventListener('click', function () {
        var wrap = btn.closest('[data-frido-option]');
        if (!wrap) return;
        var optName = wrap.getAttribute('data-frido-option');
        selectedOptions[optName] = btn.getAttribute('data-frido-option-value');

        qsa('[data-frido-option-value]', wrap).forEach(function (b) {
          b.classList.toggle('is-active', b === btn);
        });

        var v = findVariant();
        if (v) updateUI(v);
      });
    });

    qsa('[data-frido-native-select]', root).forEach(function (sel) {
      sel.addEventListener('change', function () {
        var name = sel.name.replace('options[', '').replace(']', '');
        selectedOptions[name] = sel.value;
        var v = findVariant();
        if (v) updateUI(v);
      });
    });

    qsa('[data-frido-bundle]', root).forEach(function (card) {
      card.addEventListener('click', function () {
        qsa('[data-frido-bundle]', root).forEach(function (c) {
          c.classList.remove('is-active');
        });
        card.classList.add('is-active');
        var q = parseInt(card.getAttribute('data-quantity'), 10) || 1;
        if (qtyInput) qtyInput.value = q;
      });
    });

    var stickyAtc = qs('[data-frido-sticky-atc]', root);
    var mainAtc = qs('[data-frido-atc]', root);
    if (stickyAtc && form) {
      stickyAtc.addEventListener('click', function () {
        if (mainAtc) mainAtc.click();
        else form.requestSubmit();
      });
    }

    var sticky = qs('[data-frido-pdp-sticky]', root);
    if (sticky) {
      var buyCol = qs('.frido-pdp__buy-col', root);
      if (buyCol && 'IntersectionObserver' in window) {
        var io = new IntersectionObserver(
          function (entries) {
            sticky.classList.toggle('is-visible', !entries[0].isIntersecting);
          },
          { rootMargin: '-80px 0px 0px 0px', threshold: 0 }
        );
        io.observe(buyCol);
      }
    }

    updateUI(current);
  }

  function boot() {
    qsa('[data-frido-pdp]').forEach(function (root) {
      initPdp(root);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
  document.addEventListener('shopify:section:load', boot);
})();
