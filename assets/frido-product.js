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

  function getOptionIndex(product, re) {
    return product.options.findIndex(function (o) {
      return re.test(o);
    });
  }

  function isGenderOptionName(name) {
    return /gender|^men$|^women$/i.test(name);
  }

  function getGenderOptionName(product) {
    var idx = getOptionIndex(product, /gender|^men$|^women$/i);
    return idx >= 0 ? product.options[idx] : null;
  }

  function availableOptionValues(product, optionName, selectedOptions) {
    var idx = product.options.indexOf(optionName);
    if (idx < 0) return [];
    var key = 'option' + (idx + 1);
    var vals = [];
    product.variants.forEach(function (v) {
      var ok = product.options.every(function (opt, i) {
        if (opt === optionName) return true;
        var sel = selectedOptions[opt];
        if (!sel) return true;
        return v['option' + (i + 1)] === sel;
      });
      if (!ok) return;
      var val = v[key];
      if (val && vals.indexOf(val) === -1) vals.push(val);
    });
    return vals;
  }

  function reconcileDependentOptions(product, selectedOptions) {
    var genderName = getGenderOptionName(product);
    product.options.forEach(function (opt) {
      if (opt === genderName) return;
      var allowed = availableOptionValues(product, opt, selectedOptions);
      if (!allowed.length) return;
      if (allowed.indexOf(selectedOptions[opt]) === -1) {
        selectedOptions[opt] = allowed[0];
      }
    });
  }

  function refreshVariantOptionButtons(root, product, selectedOptions) {
    var genderName = getGenderOptionName(product);
    qsa('[data-frido-option]', root).forEach(function (wrap) {
      var optName = wrap.getAttribute('data-frido-option');
      if (!optName || optName === genderName) return;
      var allowed = availableOptionValues(product, optName, selectedOptions);
      qsa('[data-frido-option-value]', wrap).forEach(function (btn) {
        var val = btn.getAttribute('data-frido-option-value');
        var ok = allowed.indexOf(val) !== -1;
        btn.hidden = !ok;
        btn.disabled = !ok;
      });
    });
  }

  function findVariantOnProduct(product, selectedOptions) {
    return product.variants.find(function (v) {
      return product.options.every(function (opt, idx) {
        var sel = selectedOptions[opt];
        if (!sel) return true;
        return v['option' + (idx + 1)] === sel;
      });
    });
  }

  function correspondingOptionName(targetProduct, sourceOpt) {
    if (targetProduct.options.indexOf(sourceOpt) !== -1) return sourceOpt;
    if (/colou?r/i.test(sourceOpt)) {
      return targetProduct.options.find(function (o) {
        return /colou?r/i.test(o);
      });
    }
    if (/size/i.test(sourceOpt)) {
      return targetProduct.options.find(function (o) {
        return /size/i.test(o);
      });
    }
    return null;
  }

  function buildCrossProductColorOptions(fromProduct, targetProduct, selectedOptions) {
    var opts = {};
    fromProduct.options.forEach(function (opt) {
      if (!/colou?r/i.test(opt) || !selectedOptions[opt]) return;
      var targetOpt = correspondingOptionName(targetProduct, opt);
      if (targetOpt) opts[targetOpt] = selectedOptions[opt];
    });
    return opts;
  }

  var GENDER_SELECTION_KEY = 'frido_gender_selection';

  function saveGenderSelection(selectedOptions, fromProduct) {
    var payload = { color: null };
    fromProduct.options.forEach(function (opt) {
      if (/colou?r/i.test(opt) && selectedOptions[opt]) payload.color = selectedOptions[opt];
    });
    try {
      sessionStorage.setItem(GENDER_SELECTION_KEY, JSON.stringify(payload));
    } catch (e) {
      /* ignore */
    }
  }

  function readGenderSelection() {
    try {
      var raw = sessionStorage.getItem(GENDER_SELECTION_KEY);
      if (!raw) return null;
      sessionStorage.removeItem(GENDER_SELECTION_KEY);
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  /** Match variant by all set options, then by color only (M/W sizes differ across products). */
  function resolveVariantForOptions(product, selectedOptions) {
    var match = findVariantOnProduct(product, selectedOptions);
    if (match) return match;

    var colorOnly = {};
    product.options.forEach(function (opt) {
      if (/colou?r/i.test(opt) && selectedOptions[opt]) colorOnly[opt] = selectedOptions[opt];
    });
    if (!Object.keys(colorOnly).length) return null;

    match =
      findVariantOnProduct(product, colorOnly) ||
      product.variants.find(function (v) {
        return product.options.every(function (opt, idx) {
          if (!/colou?r/i.test(opt)) return true;
          return v['option' + (idx + 1)] === colorOnly[opt];
        });
      });
    return match || null;
  }

  function applyVariantToSelection(product, selectedOptions, variant) {
    if (!variant) return false;
    product.options.forEach(function (opt, idx) {
      selectedOptions[opt] = variant['option' + (idx + 1)];
    });
    return true;
  }

  function syncOptionButtonsFromSelection(root, product, selectedOptions) {
    product.options.forEach(function (opt) {
      var wrap = qs('[data-frido-option="' + opt + '"]', root);
      if (wrap) {
        qsa('[data-frido-option-value]', wrap).forEach(function (btn) {
          btn.classList.toggle(
            'is-active',
            btn.getAttribute('data-frido-option-value') === selectedOptions[opt]
          );
        });
      }
      var native = qs('[data-frido-native-select][name="options[' + opt + ']"]', root);
      if (native && selectedOptions[opt]) native.value = selectedOptions[opt];
    });
  }

  function navigateToGenderProduct(url, handle, fromProduct, selectedOptions) {
    if (!url) return;
    saveGenderSelection(selectedOptions, fromProduct);
    if (!handle) {
      window.location.href = url;
      return;
    }
    fetch('/products/' + encodeURIComponent(handle) + '.js')
      .then(function (res) {
        return res.json();
      })
      .then(function (p) {
        var opts = buildCrossProductColorOptions(fromProduct, p, selectedOptions);
        var v = resolveVariantForOptions(p, opts);
        window.location.href = v ? url + '?variant=' + v.id : url;
      })
      .catch(function () {
        window.location.href = url;
      });
  }

  function normalizeMedia(m) {
    if (!m) return null;
    var type = m.media_type || 'image';
    var src = m.src || '';

    if (type === 'video' || (m.sources && m.sources.length)) {
      type = 'video';
      if (!src && m.sources && m.sources.length) {
        var mp4 = m.sources.find(function (s) {
          return s.url && (/\.mp4(\?|$)/i.test(s.url) || (s.mime_type && s.mime_type.indexOf('video') !== -1));
        });
        src = (mp4 && mp4.url) || m.sources[0].url || '';
      }
      if (!src && m.preview_image) {
        src =
          typeof m.preview_image === 'string'
            ? m.preview_image
            : m.preview_image.src || '';
      }
    }

    if (!src) {
      src =
        m.preview_image?.src ||
        (typeof m.preview_image === 'string' ? m.preview_image : '') ||
        (m.featured_image && m.featured_image.src) ||
        '';
    }

    if (!src) return null;
    if (/\.mp4(\?|$)/i.test(src)) type = 'video';

    return {
      id: m.id,
      src: src,
      alt: m.alt || '',
      type: type,
      variant_ids: m.variant_ids || [],
    };
  }

  function mergeProductMedia(product, root) {
    var mediaEl = qs('[data-frido-product-media-json]', root);
    if (!mediaEl) return product;
    try {
      product.media = JSON.parse(mediaEl.textContent);
    } catch (e) {
      /* keep product | json media */
    }
    return product;
  }

  function mediaFromProductList(product, id) {
    var found = (product.media || []).find(function (m) {
      return m.id === id;
    });
    return normalizeMedia(found);
  }

  function mediaIndexById(product, mediaId) {
    if (mediaId == null) return -1;
    var target = normId(mediaId);
    return (product.media || []).findIndex(function (m) {
      return normId(m.id) === target;
    });
  }

  function variantFeaturedMediaId(variant) {
    if (!variant) return null;
    var fm = variant.featured_media || variant.featured_image;
    return fm ? fm.id : null;
  }

  function isAnchorForOtherColor(product, mediaId, color, colorKey) {
    return product.variants.some(function (v) {
      if (v[colorKey] === color) return false;
      return normId(variantFeaturedMediaId(v)) === normId(mediaId);
    });
  }

  /** Shopify variant-image groups: from this color's anchor through the next color's anchor. */
  function getColorMediaByPosition(product, color, colorKey) {
    var mediaList = product.media || [];
    if (!mediaList.length) return [];

    var anchorIndices = [];
    product.variants.forEach(function (v) {
      if (v[colorKey] !== color) return;
      var mid = variantFeaturedMediaId(v);
      if (mid == null) return;
      var idx = mediaIndexById(product, mid);
      if (idx >= 0) anchorIndices.push(idx);
    });

    if (!anchorIndices.length) return null;

    var start = Math.min.apply(null, anchorIndices);
    var end = mediaList.length;

    for (var i = start + 1; i < mediaList.length; i++) {
      if (isAnchorForOtherColor(product, mediaList[i].id, color, colorKey)) {
        end = i;
        break;
      }
    }

    return mediaList.slice(start, end).map(normalizeMedia).filter(Boolean);
  }

  function mediaAltMatchesColor(media, color) {
    var alt = (media.alt || '').toLowerCase();
    var c = String(color).toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (new RegExp('[\\s—–\\-]+' + c + '[\\s—–\\-]+').test(alt)) return true;
    return new RegExp('(^|[\\s—–\\-])' + c + '([\\s—–\\-]|$)').test(alt);
  }

  function mediaMatchesColorOnly(media, color, allColors) {
    if (mediaAltMatchesColor(media, color)) {
      for (var i = 0; i < allColors.length; i++) {
        if (allColors[i] !== color && mediaAltMatchesColor(media, allColors[i])) {
          return false;
        }
      }
      return true;
    }
    return false;
  }

  function normId(id) {
    return id == null ? '' : String(id);
  }

  function mediaLinkedToColorVariants(media, variantIds) {
    if (!media.variant_ids || !media.variant_ids.length) return false;
    return media.variant_ids.some(function (vid) {
      return variantIds.indexOf(normId(vid)) !== -1;
    });
  }

  function heroFromVariant(variant) {
    if (!variant) return null;
    var fm = variant.featured_media || variant.featured_image;
    if (!fm) return null;
    return normalizeMedia({
      id: fm.id,
      src: fm.src || (fm.preview_image && fm.preview_image.src),
      alt: fm.alt || '',
      media_type: 'image',
    });
  }

  function mediaBelongsToColor(media, color, allColors, variantIds) {
    if (mediaMatchesColorOnly(media, color, allColors)) return true;
    if (mediaLinkedToColorVariants(media, variantIds)) {
      for (var i = 0; i < allColors.length; i++) {
        if (allColors[i] !== color && mediaAltMatchesColor(media, allColors[i])) {
          return false;
        }
      }
      return true;
    }
    return false;
  }

  function desktopGalleryList(list) {
    return list.filter(function (item) {
      return item && item.src && item.type !== 'video';
    });
  }

  function sortColorMedia(list, product) {
    var sorted = list.slice().sort(function (a, b) {
      var ma = (a.alt || '').match(/(\d+)\.(mp4|jpe?g|png|webp)/i);
      var mb = (b.alt || '').match(/(\d+)\.(mp4|jpe?g|png|webp)/i);
      var na = ma ? parseInt(ma[1], 10) : null;
      var nb = mb ? parseInt(mb[1], 10) : null;
      if (na != null && nb != null && na !== nb) return na - nb;
      if (na != null && nb == null) return -1;
      if (na == null && nb != null) return 1;
      var ia = product ? mediaIndexById(product, a.id) : -1;
      var ib = product ? mediaIndexById(product, b.id) : -1;
      if (ia >= 0 && ib >= 0) return ia - ib;
      return 0;
    });
    var images = sorted.filter(function (i) {
      return i.type !== 'video';
    });
    var videos = sorted.filter(function (i) {
      return i.type === 'video';
    });
    return images.concat(videos);
  }

  /** All media for a color (alt tags + variant links). Position-based slice is fallback only. */
  function collectMediaForColor(product, color, colors, colorKey) {
    var seen = {};
    var list = [];
    var variantIds = product.variants
      .filter(function (v) {
        return v[colorKey] === color;
      })
      .map(function (v) {
        return normId(v.id);
      });

    function pushMedia(m) {
      var item = normalizeMedia(m);
      if (!item || seen[normId(item.id)]) return;
      seen[normId(item.id)] = true;
      list.push(item);
    }

    (product.media || []).forEach(function (m) {
      if (mediaBelongsToColor(m, color, colors, variantIds)) pushMedia(m);
    });

    if (!list.length) {
      var positional = getColorMediaByPosition(product, color, colorKey);
      if (positional && positional.length) {
        positional.forEach(function (item) {
          if (item) pushMedia(item);
        });
      }
    }

    return sortColorMedia(list, product);
  }

  function buildGalleryGroups(product) {
    var all = sortColorMedia(
      (product.media || []).map(normalizeMedia).filter(Boolean),
      product
    );
    var colorKey = getColorOptionKey(product);
    if (!colorKey || !product.variants.length) {
      return { _default: all };
    }

    var colors = [];
    product.variants.forEach(function (v) {
      var c = v[colorKey];
      if (c && colors.indexOf(c) === -1) colors.push(c);
    });

    var groups = {};

    colors.forEach(function (color) {
      groups[color] = collectMediaForColor(product, color, colors, colorKey);
    });

    groups._default = groups[colors[0]] || all;
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

    function renderDesktop(mediaList, variant) {
      if (!desktop || !heroEl) return;
      var raw = mediaList.length ? mediaList : groups._default || [];
      var list = desktopGalleryList(raw);
      if (!list.length && variant) {
        var fallback = heroFromVariant(variant);
        if (fallback) list = [fallback];
      }
      if (!list.length) return;

      var hero = list[0];
      heroEl.classList.add('frido-pdp-gallery__hero--has-media');
      heroEl.innerHTML = mediaHtml(hero, {
        loading: 'eager',
        sizes: '(min-width: 990px) 50vw, 100vw',
      });

      if (!pairEl) return;
      var subs = list.slice(1);
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
      var list = mediaList.length ? mediaList : groups._default || [];
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

    function setForColor(color, variant) {
      var list = (color && groups[color]) || groups._default || [];
      renderDesktop(list, variant);
      renderMobile(list);
    }

    function colorThumbSrc(color) {
      var list = groups[color] || [];
      var item = list.find(function (i) {
        return i.src && i.type !== 'video';
      });
      return item ? item.src : null;
    }

    return {
      setForColor: setForColor,
      setForVariant: function (variant) {
        if (!variant || !colorKey) {
          setForColor(null, variant);
          return;
        }
        setForColor(variant[colorKey], variant);
      },
      colorThumbSrc: colorThumbSrc,
    };
  }

  function initBundle(root, product, ctx) {
    var bundleRoot = qs('[data-frido-bundle-root]', root);
    if (!bundleRoot) return;

    var config = qs('[data-frido-bundle-config]', bundleRoot);
    var pairsWrap = qs('[data-frido-bundle-pairs]', bundleRoot);
    var addPairBtn = qs('[data-frido-bundle-add-pair]', bundleRoot);
    var tpl = document.getElementById('FridoBundlePairTpl-' + root.getAttribute('data-section'));
    var maxPairs = Math.min(parseInt(bundleRoot.getAttribute('data-bundle-max-pairs'), 10) || 3, 3);
    var colorKey = ctx.colorKey || getColorOptionKey(product);
    var syncingFromPair = false;

    var state = {
      card: null,
      baseQty: 0,
      pairCount: 0,
      discountCode: '',
      bundleTitle: '',
    };

    function showConfig(open) {
      if (!config) return;
      if (open) {
        config.classList.add('is-open');
        config.removeAttribute('hidden');
      } else {
        config.classList.remove('is-open');
        config.setAttribute('hidden', '');
      }
    }

    function getCardByQuantity(qty) {
      return (
        qsa('[data-frido-bundle]', bundleRoot).find(function (c) {
          return parseInt(c.getAttribute('data-quantity'), 10) === qty;
        }) || null
      );
    }

    function highlightCard(card) {
      qsa('[data-frido-bundle]', bundleRoot).forEach(function (c) {
        var on = card && c === card;
        c.classList.toggle('is-active', on);
        c.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
    }

    function updateBundleCardImages(v) {
      if (!v) v = ctx.getCurrent();
      if (!v) return;
      var src = variantThumbSrc(v);
      if (!src) return;
      qsa('[data-frido-bundle-img]', bundleRoot).forEach(function (img) {
        img.src = src;
        img.alt = v.title || product.title || '';
      });
    }

    root._fridoUpdateBundleCardImages = updateBundleCardImages;

    function pairVariant(row) {
      var opts = {};
      qsa('[data-frido-pair-option]', row).forEach(function (sel) {
        opts[sel.getAttribute('data-frido-pair-option')] = sel.value;
      });
      return product.variants.find(function (v) {
        return product.options.every(function (opt, idx) {
          return v['option' + (idx + 1)] === opts[opt];
        });
      });
    }

    function variantThumbSrc(v) {
      if (!v) return '';
      var src = (v.featured_image && v.featured_image.src) || '';
      if (!src && v.featured_media && v.featured_media.preview_image) {
        src = v.featured_media.preview_image.src || '';
      }
      if (!src && ctx.galleryApi && colorKey && v[colorKey]) {
        src = ctx.galleryApi.colorThumbSrc(v[colorKey]) || '';
      }
      return src;
    }

    function updatePairRow(row) {
      var v = pairVariant(row);
      var stockEl = qs('[data-frido-pair-stock]', row);
      var stockText = qs('[data-frido-pair-stock-text]', row);
      var img = qs('[data-frido-pair-img]', row);
      if (stockEl && stockText) {
        if (v && v.available) {
          stockEl.classList.add('is-in-stock');
          stockEl.classList.remove('is-out-of-stock');
          stockText.textContent = 'In Stock';
        } else {
          stockEl.classList.remove('is-in-stock');
          stockEl.classList.add('is-out-of-stock');
          stockText.textContent = v ? 'Out of Stock' : 'Unavailable';
        }
      }
      if (img && v) {
        var src = variantThumbSrc(v);
        if (src) {
          img.src = src;
          img.alt = v.title || product.title || '';
        }
      }
      return v;
    }

    function updateBundleAtcPrices() {
      var rows = qsa('[data-frido-bundle-pair]', pairsWrap);
      var total = 0;
      var compareTotal = 0;
      var allAvailable = rows.length > 0;

      rows.forEach(function (row) {
        var v = updatePairRow(row);
        if (!v || !v.available) allAvailable = false;
        if (v) {
          total += v.price;
          compareTotal += v.compare_at_price > v.price ? v.compare_at_price : v.price;
        }
      });

      var atcPrice = qs('[data-frido-atc-price]', root);
      var atcCompare = qs('[data-frido-atc-compare]', root);
      var stickyPrice = qs('[data-frido-sticky-price]', root);
      if (atcPrice) atcPrice.textContent = formatMoney(total);
      if (stickyPrice) stickyPrice.textContent = formatMoney(total);
      if (atcCompare) {
        if (compareTotal > total) {
          atcCompare.style.display = '';
          atcCompare.textContent = formatMoney(compareTotal);
        } else {
          atcCompare.style.display = 'none';
        }
      }

      var atc = qs('[data-frido-atc]', root);
      if (atc) atc.disabled = !allAvailable;
    }

    /** Sync main gallery, selection row, and bundle card thumbs to this pair's variant. */
    function applyRowToMainPreview(row) {
      qsa('[data-frido-pair-option]', row).forEach(function (sel) {
        var name = sel.getAttribute('data-frido-pair-option');
        ctx.selectedOptions[name] = sel.value;
        var wrap = qs('[data-frido-option="' + name + '"]', root);
        if (wrap) {
          qsa('[data-frido-option-value]', wrap).forEach(function (btn) {
            btn.classList.toggle('is-active', btn.getAttribute('data-frido-option-value') === sel.value);
          });
        }
        var native = qs('[data-frido-native-select][name="options[' + name + ']"]', root);
        if (native) native.value = sel.value;
      });
      var v = pairVariant(row);
      if (v) {
        syncingFromPair = true;
        ctx.setCurrent(v);
        ctx.updateUI(v);
        updateBundleCardImages(v);
        syncingFromPair = false;
      }
    }

    /** When main swatches change, mirror variant into Pair #1 only. */
    function syncMainToFirstPair() {
      if (syncingFromPair || !root.classList.contains('frido-pdp--bundle-active')) return;
      var first = qs('[data-frido-bundle-pair]', pairsWrap);
      if (!first) return;
      var v = ctx.getCurrent();
      if (!v) return;
      product.options.forEach(function (opt, idx) {
        var sel = qs('[data-frido-pair-option="' + opt + '"]', first);
        if (sel) sel.value = v['option' + (idx + 1)];
      });
      updatePairRow(first);
      updateBundleCardImages(v);
    }

    root._fridoSyncMainToFirstPair = syncMainToFirstPair;

    function bindPairRow(row, index) {
      var label = qs('[data-frido-pair-label]', row);
      if (label) label.textContent = 'Pair #' + index;

      var removeBtn = qs('[data-frido-pair-remove]', row);
      if (removeBtn) {
        removeBtn.hidden = state.pairCount <= 1;
        removeBtn.addEventListener('click', function () {
          if (state.pairCount <= 1) return;
          row.remove();
          state.pairCount -= 1;
          reindexPairs();
          onPairCountChanged();
        });
      }

      qsa('[data-frido-pair-option]', row).forEach(function (sel) {
        sel.addEventListener('change', function () {
          updatePairRow(row);
          applyRowToMainPreview(row);
          updateBundleAtcPrices();
        });
      });

      updatePairRow(row);
    }

    function reindexPairs() {
      qsa('[data-frido-bundle-pair]', pairsWrap).forEach(function (row, i) {
        var idx = i + 1;
        var label = qs('[data-frido-pair-label]', row);
        if (label) label.textContent = 'Pair #' + idx;
        var removeBtn = qs('[data-frido-pair-remove]', row);
        if (removeBtn) removeBtn.hidden = state.pairCount <= 1;
      });
    }

    function createPairRow(copyFromRow) {
      if (!tpl || !pairsWrap) return null;
      var frag = tpl.content.cloneNode(true);
      var row = frag.querySelector('[data-frido-bundle-pair]');
      if (!row) return null;

      if (copyFromRow) {
        qsa('[data-frido-pair-option]', row).forEach(function (sel) {
          var name = sel.getAttribute('data-frido-pair-option');
          var src = qsa('[data-frido-pair-option]', copyFromRow).find(function (s) {
            return s.getAttribute('data-frido-pair-option') === name;
          });
          if (src) sel.value = src.value;
        });
      } else if (ctx.getCurrent()) {
        var cur = ctx.getCurrent();
        product.options.forEach(function (opt, idx) {
          var sel = qs('[data-frido-pair-option="' + opt + '"]', row);
          if (sel) sel.value = cur['option' + (idx + 1)];
        });
      }

      pairsWrap.appendChild(row);
      state.pairCount += 1;
      bindPairRow(row, state.pairCount);
      return row;
    }

    function clearPairs() {
      if (pairsWrap) pairsWrap.innerHTML = '';
      state.pairCount = 0;
    }

    function setPairRows(count) {
      clearPairs();
      var first = null;
      for (var i = 0; i < count; i++) {
        first = createPairRow(i > 0 ? first : null);
      }
      if (first) applyRowToMainPreview(first);
      updateAddPairVisibility();
      updateBundleAtcPrices();
    }

    function updateAddPairVisibility() {
      if (!addPairBtn) return;
      var canAdd = !!state.card && state.pairCount >= 2 && state.pairCount < maxPairs;
      addPairBtn.hidden = !canAdd;
    }

    /** Match 2/3-pair card highlight to how many pair rows exist. */
    function onPairCountChanged() {
      var count = state.pairCount;

      if (count <= 1) {
        deactivateBundle();
        return;
      }

      var card = getCardByQuantity(count);
      if (card) {
        state.card = card;
        state.baseQty = count;
        state.discountCode = (card.getAttribute('data-discount-code') || '').trim();
        state.bundleTitle = card.getAttribute('data-bundle-title') || '';
        highlightCard(card);
        root.classList.add('frido-pdp--bundle-active');
        showConfig(true);
        if (ctx.qtyInput) ctx.qtyInput.value = count;
      }

      updateAddPairVisibility();
      updateBundleAtcPrices();
      var v = ctx.getCurrent();
      if (v) updateBundleCardImages(v);
    }

    function applyCardState(card) {
      state.card = card;
      state.baseQty = parseInt(card.getAttribute('data-quantity'), 10) || 1;
      state.discountCode = (card.getAttribute('data-discount-code') || '').trim();
      state.bundleTitle = card.getAttribute('data-bundle-title') || '';
      highlightCard(card);
      root.classList.add('frido-pdp--bundle-active');
      root._fridoSyncMainToFirstPair = syncMainToFirstPair;
      showConfig(true);
      if (ctx.qtyInput) ctx.qtyInput.value = state.baseQty;
      root._fridoUpdateBundleCardImages = updateBundleCardImages;
    }

    function activateBundle(card) {
      var qty = parseInt(card.getAttribute('data-quantity'), 10) || 1;
      if (qty < 2) return;

      if (state.card === card && state.pairCount === qty) {
        deactivateBundle();
        return;
      }

      applyCardState(card);
      setPairRows(qty);
      var v = ctx.getCurrent();
      if (v) updateBundleCardImages(v);
    }

    function deactivateBundle() {
      state.card = null;
      state.baseQty = 0;
      state.discountCode = '';
      state.bundleTitle = '';

      highlightCard(null);
      root.classList.remove('frido-pdp--bundle-active');
      root._fridoSyncMainToFirstPair = null;
      root._fridoUpdateBundleCardImages = null;
      showConfig(false);
      clearPairs();
      if (addPairBtn) addPairBtn.hidden = true;
      if (ctx.qtyInput) ctx.qtyInput.value = 1;

      var v = ctx.findVariant();
      if (v) ctx.updateUI(v);
    }

    qsa('[data-frido-bundle]', bundleRoot).forEach(function (card) {
      card.addEventListener('click', function () {
        activateBundle(card);
      });
    });

    if (addPairBtn) {
      addPairBtn.addEventListener('click', function () {
        if (!state.card || state.pairCount >= maxPairs) return;
        var rows = qsa('[data-frido-bundle-pair]', pairsWrap);
        var last = rows[rows.length - 1];
        createPairRow(last || null);
        onPairCountChanged();
      });
    }

    showConfig(false);

    function addBundleToCart() {
      var rows = qsa('[data-frido-bundle-pair]', pairsWrap);
      if (!rows.length) return Promise.reject(new Error('No pairs configured'));

      var items = [];
      rows.forEach(function (row, i) {
        var v = pairVariant(row);
        if (!v || !v.available) throw new Error('unavailable');
        items.push({
          id: v.id,
          quantity: 1,
          properties: {
            Bundle: state.bundleTitle,
            Pair: String(i + 1),
            '_bundle_discount_code': state.discountCode || '',
          },
        });
      });

      var atc = qs('[data-frido-atc]', root);
      if (atc) {
        atc.disabled = true;
        atc.setAttribute('aria-disabled', 'true');
      }

      return fetch((window.routes && window.routes.cart_add_url) || '/cart/add.js', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ items: items }),
      })
        .then(function (res) {
          return res.json();
        })
        .then(function (data) {
          if (data.status) {
            throw new Error(data.description || data.message || 'Cart error');
          }

          if (typeof publish === 'function' && typeof PUB_SUB_EVENTS !== 'undefined') {
            publish(PUB_SUB_EVENTS.cartUpdate, {
              source: 'frido-bundle',
              cartData: data,
            });
          }

          var cartUrl = (window.routes && window.routes.cart_url) || '/cart';
          if (state.discountCode) {
            window.location.href =
              '/discount/' +
              encodeURIComponent(state.discountCode) +
              '?redirect=' +
              encodeURIComponent(cartUrl);
            return data;
          }

          if (window.FridoCart && typeof window.FridoCart.open === 'function') {
            window.FridoCart.open(atc);
            return data;
          }

          var drawer = document.querySelector('cart-drawer');
          if (drawer && typeof drawer.open === 'function') {
            drawer.open(atc);
            return data;
          }

          window.location.href = cartUrl;
          return data;
        })
        .finally(function () {
          if (atc) {
            atc.removeAttribute('aria-disabled');
            updateBundleAtcPrices();
          }
        });
    }

    if (ctx.form) {
      ctx.form.addEventListener('submit', function (e) {
        if (!state.card) return;
        e.preventDefault();
        addBundleToCart().catch(function (err) {
          console.error('[Frido bundle]', err);
          alert(window.cartStrings?.error || 'Could not add to cart. Please check your selections.');
        });
      });
    }
  }

  function initPdp(root) {
    var jsonEl = qs('[data-frido-product-json]', root);
    if (!jsonEl) return;
    var product = mergeProductMedia(JSON.parse(jsonEl.textContent), root);
    var form = qs('[data-frido-product-form]', root);
    var variantInput = qs('[data-frido-variant-id]', root);
    var qtyInput = qs('[data-frido-quantity]', root);
    var selectedOptions = {};
    var colorKey = getColorOptionKey(product);
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

    function syncStickySelects() {
      qsa('[data-frido-sticky-select]', root).forEach(function (sel) {
        var name = sel.getAttribute('data-frido-sticky-select');
        if (selectedOptions[name] !== undefined && sel.value !== selectedOptions[name]) {
          sel.value = selectedOptions[name];
        }
      });
    }

    function setGenderTabAria() {
      qsa('.frido-pdp-gender__tab', root).forEach(function (tab) {
        var on = tab.classList.contains('is-active');
        tab.setAttribute('aria-selected', on ? 'true' : 'false');
      });
    }

    function applyOptionChange(optName, value) {
      selectedOptions[optName] = value;

      var wrap = qs('[data-frido-option="' + optName + '"]', root);
      if (wrap) {
        qsa('[data-frido-option-value]', wrap).forEach(function (btn) {
          btn.classList.toggle('is-active', btn.getAttribute('data-frido-option-value') === value);
        });
      }

      var native = qs('[data-frido-native-select][name="options[' + optName + ']"]', root);
      if (native) native.value = value;

      if (isGenderOptionName(optName)) {
        reconcileDependentOptions(product, selectedOptions);
        refreshVariantOptionButtons(root, product, selectedOptions);
        product.options.forEach(function (opt) {
          var wrapOpt = qs('[data-frido-option="' + opt + '"]', root);
          if (wrapOpt) {
            qsa('[data-frido-option-value]', wrapOpt).forEach(function (btn) {
              btn.classList.toggle(
                'is-active',
                btn.getAttribute('data-frido-option-value') === selectedOptions[opt]
              );
            });
          }
          var nativeOpt = qs('[data-frido-native-select][name="options[' + opt + ']"]', root);
          if (nativeOpt) nativeOpt.value = selectedOptions[opt];
        });
      } else {
        refreshVariantOptionButtons(root, product, selectedOptions);
      }

      syncStickySelects();
      setGenderTabAria();

      var v = findVariant();
      if (v) updateUI(v);
    }

    function updateUI(variant) {
      if (!variant) return;
      current = variant;
      variantInput.value = variant.id;

      product.options.forEach(function (opt, idx) {
        selectedOptions[opt] = variant['option' + (idx + 1)];
      });
      syncStickySelects();

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

      var pct =
        compare > variant.price ? Math.round(((compare - variant.price) * 100) / compare) : 0;
      qsa('[data-frido-save-badge-text]', root).forEach(function (el) {
        if (pct > 0) el.textContent = 'Save ' + pct + '%';
      });
      qsa('[data-frido-save-badge]', root).forEach(function (el) {
        if (pct > 0) {
          el.hidden = false;
          el.style.display = '';
        } else {
          el.hidden = true;
        }
      });
      var stickyBadgeText = qs('[data-frido-sticky-badge-text]', root);
      var stickyBadge = qs('[data-frido-sticky-badge]', root);
      if (stickyBadgeText) stickyBadgeText.textContent = pct > 0 ? 'Save ' + pct + '%' : '';
      if (stickyBadge) stickyBadge.hidden = pct <= 0;

      var atc = qs('[data-frido-atc]', root);
      if (atc) atc.disabled = !variant.available;
      var stickyAtcBtn = qs('[data-frido-sticky-atc]', root);
      if (stickyAtcBtn) stickyAtcBtn.disabled = !variant.available;

      var stickyThumb = qs('.frido-pdp-sticky__thumb', root);
      if (stickyThumb) {
        var stickySrc =
          (variant.featured_image && variant.featured_image.src) ||
          (galleryApi && colorKey ? galleryApi.colorThumbSrc(variant[colorKey]) : '');
        if (stickySrc) stickyThumb.src = stickySrc;
      }

      if (galleryApi) galleryApi.setForVariant(variant);

      if (typeof root._fridoUpdateBundleCardImages === 'function') {
        root._fridoUpdateBundleCardImages(variant);
      } else if (galleryApi && colorKey) {
        var thumbSrc = galleryApi.colorThumbSrc(variant[colorKey]);
        if (thumbSrc) {
          qsa('[data-frido-bundle-img]', root).forEach(function (img) {
            img.src = thumbSrc;
          });
        }
      }

      if (typeof root._fridoSyncMainToFirstPair === 'function') {
        root._fridoSyncMainToFirstPair();
      }

      var colorEl = qs('[data-frido-sel-color]', root);
      var sizeEl = qs('[data-frido-sel-size]', root);
      var sizeVal = '';
      product.options.forEach(function (opt, idx) {
        var val = variant['option' + (idx + 1)];
        if (colorEl && /colou?r/i.test(opt)) colorEl.textContent = val;
        if (sizeEl && /size/i.test(opt)) {
          sizeEl.textContent = val;
          sizeVal = val;
        }
      });

      var sectionId = root.getAttribute('data-section');
      if (sectionId) {
        var chartDrawer = document.getElementById('frido-size-chart-' + sectionId);
        if (chartDrawer) {
          var recBox = qs('[data-frido-size-chart-recommended]', chartDrawer);
          var recVal = qs('[data-frido-size-chart-rec-value]', chartDrawer);
          if (recVal) recVal.textContent = sizeVal;
          if (recBox) recBox.classList.toggle('is-visible', !!sizeVal);
        }
      }

      syncOptionButtonsFromSelection(root, product, selectedOptions);
      refreshVariantOptionButtons(root, product, selectedOptions);
    }

    qsa('[data-frido-gender-nav]', root).forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (btn.classList.contains('is-active')) return;
        navigateToGenderProduct(
          btn.getAttribute('data-frido-gender-url'),
          btn.getAttribute('data-frido-gender-handle'),
          product,
          selectedOptions
        );
      });
    });

    qsa('[data-frido-option-value]', root).forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (btn.disabled) return;
        var wrap = btn.closest('[data-frido-option]');
        if (!wrap) return;
        applyOptionChange(wrap.getAttribute('data-frido-option'), btn.getAttribute('data-frido-option-value'));
      });
    });

    var variantsRoot = qs('[data-frido-variants]', root);
    if (variantsRoot && variantsRoot.getAttribute('data-frido-gender-mode') === 'link') {
      var saved = readGenderSelection();
      if (saved && saved.color) {
        var currentColor = colorKey && current ? current[colorKey] : null;
        if (currentColor !== saved.color) {
          product.options.forEach(function (opt) {
            if (/colou?r/i.test(opt)) selectedOptions[opt] = saved.color;
          });
          var restoredVariant = resolveVariantForOptions(product, selectedOptions);
          if (restoredVariant) {
            current = restoredVariant;
            applyVariantToSelection(product, selectedOptions, restoredVariant);
          }
        }
      }
    }

    refreshVariantOptionButtons(root, product, selectedOptions);
    syncOptionButtonsFromSelection(root, product, selectedOptions);
    setGenderTabAria();

    qsa('[data-frido-native-select]', root).forEach(function (sel) {
      sel.addEventListener('change', function () {
        var name = sel.name.replace('options[', '').replace(']', '');
        applyOptionChange(name, sel.value);
      });
    });

    qsa('[data-frido-sticky-select]', root).forEach(function (sel) {
      sel.addEventListener('change', function () {
        applyOptionChange(sel.getAttribute('data-frido-sticky-select'), sel.value);
      });
    });

    initBundle(root, product, {
      variantInput: variantInput,
      qtyInput: qtyInput,
      form: form,
      findVariant: findVariant,
      selectedOptions: selectedOptions,
      updateUI: updateUI,
      getCurrent: function () {
        return current;
      },
      setCurrent: function (v) {
        current = v;
      },
      galleryApi: galleryApi,
      colorKey: colorKey,
    });

    var stickyAtc = qs('[data-frido-sticky-atc]', root);
    var mainAtc = qs('[data-frido-atc]', root);
    if (stickyAtc && form) {
      stickyAtc.addEventListener('click', function () {
        if (mainAtc) mainAtc.click();
        else form.requestSubmit();
      });
    }

    if (form && window.FridoCart) {
      form.addEventListener('submit', function (e) {
        if (root.classList.contains('frido-pdp--bundle-active')) return;
        e.preventDefault();
        var vid = parseInt(variantInput.value, 10);
        var qty = qtyInput ? parseInt(qtyInput.value, 10) || 1 : 1;
        window.FridoCart.addItems([{ id: vid, quantity: qty }]).catch(function (err) {
          alert(err.message || window.cartStrings?.error || 'Could not add to cart');
        });
      });
    }

    var sticky = qs('[data-frido-pdp-sticky]', root);
    if (sticky) {
      function updateStickyHeaderOffset() {
        var siteHeader = document.querySelector('.frido-site-header');
        var h = siteHeader ? siteHeader.getBoundingClientRect().height : 0;
        document.documentElement.style.setProperty('--frido-site-header-h', h + 'px');
      }

      updateStickyHeaderOffset();
      window.addEventListener('resize', updateStickyHeaderOffset);

      var buyCol = qs('.frido-pdp__buy-col', root);
      if (buyCol && 'IntersectionObserver' in window) {
        var io = new IntersectionObserver(
          function (entries) {
            var show = !entries[0].isIntersecting && !root.classList.contains('frido-pdp--bundle-active');
            sticky.classList.toggle('is-visible', show);
            if (show) {
              sticky.removeAttribute('hidden');
              updateStickyHeaderOffset();
            } else {
              sticky.setAttribute('hidden', '');
            }
          },
          { rootMargin: '0px 0px 0px 0px', threshold: 0 }
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
