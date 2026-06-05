/**
 * Frido cart drawer — /cart.js refresh, fast change.js, variant modal
 */
(function () {
  var drawerEl;
  var modalEl;
  var moneyFormat;
  var upsells = [];
  var upsellLimit = 3;
  var cartState = null;
  var pendingKey = null;
  var productCache = Object.create(null);
  var modalState = { mode: 'edit', lineKey: null, product: null, selected: {}, quantity: 1, properties: {} };

  var discountTagIconHtml = '';

  var labels = {
    itemsInCart: 'items in cart',
    itemInCart: 'item in cart',
    changeColor: 'Change Color',
    changeSize: 'Change Size',
    save: 'SAVE',
    add: '+ ADD',
    submitEdit: 'Update Item',
    submitAdd: 'ADD TO CART',
    styleHeading: 'Choose your style',
    ratingLabel: 'Excellent',
    viewDetails: 'View Full Details',
    sizeGuide: 'See Size Guide',
  };

  /** Matches PDP bundle codes / automatic discounts in Shopify admin. */
  var BUNDLE_DISCOUNTS = {
    BUNDLE2: { pct: 10, label: 'Buy 2 Get 10%' },
    BUNDLE3: { pct: 20, label: 'Buy 3 Get 20%' },
  };

  function qs(sel, root) {
    return (root || document).querySelector(sel);
  }
  function qsa(sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  }

  function money(cents) {
    if (typeof Shopify !== 'undefined' && Shopify.formatMoney) {
      return Shopify.formatMoney(cents, moneyFormat);
    }
    return '$' + (cents / 100).toFixed(2);
  }

  function discountTagMarkup() {
    return discountTagIconHtml || '';
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function getOptionName(opt) {
    if (opt == null) return '';
    if (typeof opt === 'string') return opt;
    if (typeof opt === 'object' && opt.name != null) return String(opt.name);
    return String(opt);
  }

  function normalizeProduct(product) {
    if (!product || !Array.isArray(product.options)) return product;
    product.options = product.options.map(function (opt, i) {
      var name = getOptionName(opt);
      return name || 'Option ' + (i + 1);
    });
    return product;
  }

  function fetchCart() {
    return fetch('/cart.js', { headers: { Accept: 'application/json' } }).then(function (r) {
      return r.json();
    });
  }

  function cartChange(body) {
    return fetch((window.routes && window.routes.cart_change_url) || '/cart/change.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body),
    }).then(function (r) {
      return r.json();
    });
  }

  function cartAdd(items) {
    fridoCartInternalAdd = true;
    return fetch((window.routes && window.routes.cart_add_url) || '/cart/add.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ items: items }),
    })
      .then(function (r) {
        return r.json();
      })
      .finally(function () {
        window.setTimeout(function () {
          fridoCartInternalAdd = false;
        }, 120);
      });
  }

  function handleCartError(data) {
    if (data && data.status) {
      throw new Error(data.description || data.message || 'Cart error');
    }
    return data;
  }

  function updateCounts(cart) {
    var n = cart.item_count || 0;
    qsa('[data-frido-cart-count], [data-frido-cart-drawer-count]').forEach(function (el) {
      el.textContent = n < 100 ? String(n) : '99+';
      el.hidden = n === 0;
    });
    var sub = qs('[data-frido-cart-subtitle]', drawerEl);
    if (sub) {
      sub.textContent = n + ' ' + (n === 1 ? labels.itemInCart : labels.itemsInCart);
    }
    var hdr = qs('[data-frido-cart-drawer-count]', drawerEl);
    if (hdr) hdr.hidden = n === 0;
  }

  function getItemProperty(item, key) {
    var props = normalizeProperties(item.properties);
    return props[key] != null ? String(props[key]).trim() : '';
  }

  function bundleCodeFromItem(item) {
    return getItemProperty(item, '_bundle_discount_code').toUpperCase();
  }

  function bundleRuleFromCode(code) {
    return code ? BUNDLE_DISCOUNTS[code] || null : null;
  }

  function bundleRuleFromApplication(app) {
    if (!app) return null;
    var code = String(app.code || app.title || '').toUpperCase();
    if (BUNDLE_DISCOUNTS[code]) return BUNDLE_DISCOUNTS[code];
    var keys = Object.keys(BUNDLE_DISCOUNTS);
    for (var i = 0; i < keys.length; i++) {
      if (code.indexOf(keys[i]) !== -1) return BUNDLE_DISCOUNTS[keys[i]];
    }
    if (code.indexOf('10') !== -1 && (code.indexOf('2') !== -1 || code.indexOf('TWO') !== -1)) {
      return BUNDLE_DISCOUNTS.BUNDLE2;
    }
    if (code.indexOf('20') !== -1 && (code.indexOf('3') !== -1 || code.indexOf('THREE') !== -1)) {
      return BUNDLE_DISCOUNTS.BUNDLE3;
    }
    return null;
  }

  function countBundleLines(cart, code) {
    if (!cart || !cart.items || !code) return 0;
    return cart.items.reduce(function (sum, line) {
      return bundleCodeFromItem(line) === code ? sum + line.quantity : sum;
    }, 0);
  }

  function lineDiscountAmount(item) {
    return Math.max(0, (item.original_line_price || 0) - (item.final_line_price || 0));
  }

  function cartLevelShare(item, cart) {
    if (!cart || !cart.total_discount || !cart.original_total_price) return 0;
    if (lineDiscountAmount(item) > 0) return 0;
    return Math.round((cart.total_discount * item.original_line_price) / cart.original_total_price);
  }

  function getLineDiscountInfo(item, cart) {
    var shopifyAmt = lineDiscountAmount(item);
    var rule = bundleRuleFromCode(bundleCodeFromItem(item));
    var label = rule ? rule.label : '';
    var badgePct = rule ? rule.pct : 0;

    (item.line_level_discount_allocations || []).forEach(function (d) {
      if (!d.discount_application) return;
      var appRule = bundleRuleFromApplication(d.discount_application);
      if (appRule) {
        rule = appRule;
        label = appRule.label;
        badgePct = appRule.pct;
      } else if (!label && d.discount_application.title) {
        label = d.discount_application.title;
      }
    });

    if (shopifyAmt > 0) {
      return {
        amount: shopifyAmt,
        label: label || 'Discount',
        badgePct: badgePct || Math.round((shopifyAmt * 100) / item.original_line_price),
      };
    }

    var code = bundleCodeFromItem(item);
    rule = bundleRuleFromCode(code);
    if (rule && cart) {
      var need = code === 'BUNDLE2' ? 2 : code === 'BUNDLE3' ? 3 : 0;
      if (need && countBundleLines(cart, code) >= need) {
        var est = Math.round((item.original_line_price * rule.pct) / 100);
        if (est > 0) {
          return { amount: est, label: rule.label, badgePct: rule.pct };
        }
      }
    }

    if (cart && cart.cart_level_discount_applications && cart.cart_level_discount_applications.length) {
      var app = cart.cart_level_discount_applications[0];
      rule = bundleRuleFromApplication(app);
      var share = cartLevelShare(item, cart);
      if (share > 0) {
        return {
          amount: share,
          label: (rule && rule.label) || app.title || 'Item Discounts',
          badgePct: rule ? rule.pct : 0,
        };
      }
    }

    return null;
  }

  function lineDiscountText(item, cart) {
    var info = getLineDiscountInfo(item, cart);
    if (!info || !info.amount) return '';
    return info.label + ' (-' + money(info.amount) + ')';
  }

  function savePct(item, cart) {
    var info = getLineDiscountInfo(item, cart);
    return info && info.badgePct ? info.badgePct : 0;
  }

  function displayLinePricing(item, cart) {
    var info = getLineDiscountInfo(item, cart);
    var finalLine = item.final_line_price;
    if (info && info.amount && lineDiscountAmount(item) === 0) {
      finalLine = Math.max(0, (item.original_line_price || 0) - info.amount);
    }
    var compareLine = getCompareLinePrice(item);
    if (compareLine <= finalLine && item.original_line_price > finalLine) {
      compareLine = item.original_line_price;
    }
    return { finalLine: finalLine, compareLine: compareLine };
  }

  function variantPills(title) {
    if (!title || title === 'Default Title') return '';
    return title
      .split(' / ')
      .map(function (t) {
        return '<span class="frido-cart-item__pill">' + escapeHtml(t.trim()) + '</span>';
      })
      .join('');
  }

  function itemHandle(item) {
    if (item && item.handle) return item.handle;
    var handle = (item.url || '').split('/products/')[1];
    return handle ? handle.split('?')[0] : '';
  }

  function normalizeProperties(props) {
    if (!props) return {};
    if (Array.isArray(props)) {
      var out = {};
      props.forEach(function (p) {
        if (p && p.key) out[p.key] = p.value;
      });
      return out;
    }
    return props;
  }

  function getCompareLinePrice(item) {
    var finalLine = item.final_line_price;

    if (item.compare_line_price && item.compare_line_price > finalLine) {
      return item.compare_line_price;
    }

    var unitCompare = item.compare_at_price;
    if (unitCompare && unitCompare * item.quantity > finalLine) {
      return unitCompare * item.quantity;
    }

    var product = productCache[itemHandle(item)];
    if (product && product.variants) {
      var variant = product.variants.find(function (v) {
        return v.id === item.variant_id;
      });
      if (variant && variant.compare_at_price && variant.compare_at_price * item.quantity > finalLine) {
        return variant.compare_at_price * item.quantity;
      }
    }

    if (item.original_line_price > finalLine) return item.original_line_price;
    return 0;
  }

  function renderLinePrices(item, cart) {
    var prices = displayLinePricing(item, cart);
    return (
      '<div class="frido-cart-item__prices">' +
      (prices.compareLine > prices.finalLine
        ? '<span class="frido-cart-item__compare">' + money(prices.compareLine) + '</span>'
        : '') +
      '<span class="frido-cart-item__price">' + money(prices.finalLine) + '</span>' +
      '</div>'
    );
  }

  function renderLineItem(item, cart) {
    cart = cart || cartState;
    var pct = savePct(item, cart);
    var disc = lineDiscountText(item, cart);
    var busy = pendingKey === item.key ? ' is-loading' : '';
    var img = item.image ? escapeHtml(item.image) : '';
    var handle = item.handle || itemHandle(item);

    return (
      '<article class="frido-cart-item' +
      busy +
      '" data-frido-cart-line="' +
      escapeHtml(item.key) +
      '" data-product-handle="' +
      escapeHtml(handle || '') +
      '" data-variant-id="' +
      item.variant_id +
      '">' +
      '<div class="frido-cart-item__top">' +
      '<div class="frido-cart-item__media">' +
      (pct > 0 ? '<span class="frido-cart-item__save-badge">' + labels.save + ' ' + pct + '%</span>' : '') +
      (img ? '<img src="' + img + '" alt="" width="88" height="88" loading="lazy">' : '') +
      '</div>' +
      '<div class="frido-cart-item__info">' +
      '<div class="frido-cart-item__title-row">' +
      '<a href="' +
      escapeHtml(item.url) +
      '" class="frido-cart-item__title">' +
      escapeHtml(item.product_title) +
      '</a>' +
      '<button type="button" class="frido-cart-item__remove" data-frido-cart-remove="' +
      escapeHtml(item.key) +
      '" aria-label="Remove">' +
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/></svg>' +
      '</button></div>' +
      (item.variant_title && item.variant_title !== 'Default Title'
        ? '<div class="frido-cart-item__pills">' + variantPills(item.variant_title) + '</div>'
        : '') +
      (disc
        ? '<p class="frido-cart-item__discount">' + discountTagMarkup() + ' ' + escapeHtml(disc) + '</p>'
        : '') +
      '<div class="frido-cart-item__bottom">' +
      '<div class="frido-cart-item__qty">' +
      '<button type="button" data-frido-cart-qty="' +
      escapeHtml(item.key) +
      '" data-delta="-1" aria-label="Decrease">−</button>' +
      '<span>' +
      item.quantity +
      '</span>' +
      '<button type="button" data-frido-cart-qty="' +
      escapeHtml(item.key) +
      '" data-delta="1" aria-label="Increase">+</button>' +
      '</div>' +
      renderLinePrices(item, cart) +
      '</div>' +
      '<div class="frido-cart-item__edit">' +
      '<button type="button" data-frido-cart-edit="' +
      escapeHtml(item.key) +
      '" data-edit-focus="color">' +
      labels.changeColor +
      '</button>' +
      '<button type="button" data-frido-cart-edit="' +
      escapeHtml(item.key) +
      '" data-edit-focus="size">' +
      labels.changeSize +
      '</button>' +
      '</div>' +
      '</div></div></article>'
    );
  }

  function formatReviewCount(count) {
    if (count === '' || count == null) return '';
    var n = Number(count);
    if (!n || isNaN(n)) return String(count).indexOf('(') === 0 ? String(count) : '(' + count + ')';
    return '(' + n.toLocaleString() + ')';
  }

  function renderUpsellStars(rating) {
    var r = Math.max(0, Math.min(5, Math.round(Number(rating) || 5)));
    var stars = '';
    for (var i = 1; i <= 5; i++) {
      stars +=
        '<svg width="14" height="14" viewBox="0 0 24 24" fill="' +
        (i <= r ? 'currentColor' : 'none') +
        '" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><path d="M12 2.5l2.9 6.1 6.6.6-5 4.5 1.5 6.5L12 17.8 5.9 20.2l1.5-6.5-5-4.5 6.6-.6L12 2.5z"/></svg>';
    }
    return stars;
  }

  function getCartProductIds(cart) {
    if (!cart || !cart.items) return [];
    return cart.items.map(function (item) {
      return Number(item.product_id);
    });
  }

  function getCartHandles(cart) {
    if (!cart || !cart.items) return [];
    return cart.items.map(itemHandle).filter(Boolean);
  }

  function filterUpsellsForCart(cart) {
    var handles = getCartHandles(cart);
    var productIds = getCartProductIds(cart);
    return upsells.filter(function (u) {
      if (u.handle && handles.indexOf(u.handle) !== -1) return false;
      if (u.product_id && productIds.indexOf(Number(u.product_id)) !== -1) return false;
      return true;
    });
  }

  function renderUpsellCard(u, product) {
    var v = product.variants.find(function (x) {
      return x.available;
    }) || product.variants[0];
    if (!v) return '';
    var compare = v.compare_at_price || 0;
    var price = v.price;
    var pct = compare > price ? Math.round(((compare - price) * 100) / compare) : 0;
    var img = u.image || (v.featured_image && v.featured_image.src) || product.featured_image || '';
    var rating = Number(u.rating);
    if (isNaN(rating)) rating = 5;
    var ratingLabel = rating % 1 === 0 ? String(rating) : rating.toFixed(1);
    var reviewLabel = formatReviewCount(u.review_count);

    return (
      '<article class="frido-cart-upsell" data-frido-cart-upsell="' +
      escapeHtml(product.handle) +
      '">' +
      '<div class="frido-cart-upsell__media">' +
      (img ? '<img src="' + escapeHtml(img) + '" alt="" width="80" height="80" loading="lazy">' : '') +
      '</div>' +
      '<div class="frido-cart-upsell__body">' +
      '<p class="frido-cart-upsell__title">' +
      escapeHtml(u.title || product.title) +
      '</p>' +
      '<div class="frido-cart-upsell__rating">' +
      '<span class="frido-cart-upsell__stars" aria-hidden="true">' +
      renderUpsellStars(rating) +
      '</span>' +
      '<span class="frido-cart-upsell__rating-value">' +
      escapeHtml(ratingLabel) +
      '</span>' +
      (reviewLabel ? '<span class="frido-cart-upsell__review-count">' + escapeHtml(reviewLabel) + '</span>' : '') +
      '</div>' +
      '<div class="frido-cart-upsell__price-row">' +
      '<span class="frido-cart-upsell__price-current">' +
      money(price) +
      '</span>' +
      (compare > price ? '<span class="frido-cart-upsell__price-compare">' + money(compare) + '</span>' : '') +
      (pct > 0 ? '<span class="frido-cart-upsell__save">' + labels.save + ' ' + pct + '%</span>' : '') +
      '</div></div>' +
      '<button type="button" class="frido-cart-upsell__add" data-frido-cart-upsell-add="' +
      escapeHtml(product.handle) +
      '">' +
      labels.add +
      '</button></article>'
    );
  }

  function getUncachedHandles(cart) {
    return cart.items
      .map(itemHandle)
      .filter(function (handle, index, list) {
        return handle && list.indexOf(handle) === index && !productCache[handle];
      });
  }

  function getCartDiscountTotal(cart) {
    if (cart.total_discount > 0) return cart.total_discount;
    var sum = 0;
    cart.items.forEach(function (item) {
      var info = getLineDiscountInfo(item, cart);
      if (info) sum += info.amount;
    });
    return sum;
  }

  function updateCartFooter(cart) {
    var subLabel = qs('[data-frido-cart-subtotal-label]', drawerEl);
    if (subLabel) {
      subLabel.textContent = 'Subtotal (' + cart.item_count + ' Item' + (cart.item_count === 1 ? '' : 's') + '):';
    }
    var sub = qs('[data-frido-cart-subtotal]', drawerEl);
    var subtotalCents = cart.original_total_price || cart.items_subtotal_price || 0;
    if (sub) sub.textContent = money(subtotalCents);

    var discRow = qs('[data-frido-cart-discount-row]', drawerEl);
    var disc = qs('[data-frido-cart-discount]', drawerEl);
    var cartDiscount = getCartDiscountTotal(cart);

    if (cartDiscount > 0 && discRow && disc) {
      discRow.hidden = false;
      disc.textContent = '-' + money(cartDiscount);
    } else if (discRow) {
      discRow.hidden = true;
      if (disc) disc.textContent = '';
    }

    var total = qs('[data-frido-cart-total]', drawerEl);
    var totalCents =
      cart.total_discount > 0
        ? cart.total_price
        : Math.max(0, subtotalCents - cartDiscount);
    if (total) total.textContent = money(totalCents);
  }

  function patchLineItem(cart, item) {
    var line = qs('[data-frido-cart-line="' + item.key + '"]', drawerEl);
    if (!line) return false;

    var qtySpan = qs('.frido-cart-item__qty span', line);
    if (qtySpan) qtySpan.textContent = item.quantity;

    var prices = qs('.frido-cart-item__prices', line);
    if (prices) prices.outerHTML = renderLinePrices(item, cart);

    var pct = savePct(item, cart);
    var badge = qs('.frido-cart-item__save-badge', line);
    if (pct > 0) {
      if (!badge) {
        var media = qs('.frido-cart-item__media', line);
        if (media) {
          media.insertAdjacentHTML(
            'afterbegin',
            '<span class="frido-cart-item__save-badge">' + labels.save + ' ' + pct + '%</span>'
          );
        }
      } else {
        badge.textContent = labels.save + ' ' + pct + '%';
      }
    } else if (badge) {
      badge.remove();
    }

    var disc = lineDiscountText(item, cart);
    var discEl = qs('.frido-cart-item__discount', line);
    if (disc) {
      if (discEl) {
        discEl.innerHTML = discountTagMarkup() + ' ' + escapeHtml(disc);
      } else {
        var bottom = qs('.frido-cart-item__bottom', line);
        if (bottom) {
          bottom.insertAdjacentHTML(
            'beforebegin',
            '<p class="frido-cart-item__discount">' + discountTagMarkup() + ' ' + escapeHtml(disc) + '</p>'
          );
        }
      }
    } else if (discEl) {
      discEl.remove();
    }

    line.classList.remove('is-loading');
    return true;
  }

  function patchComparePrices(cart) {
    cart.items.forEach(function (item) {
      patchLineItem(cart, item);
    });
  }

  function setLineBusy(key, busy) {
    var line = qs('[data-frido-cart-line="' + key + '"]', drawerEl);
    if (!line) return;
    line.classList.toggle('is-loading', busy);
    qsa('[data-frido-cart-qty]', line).forEach(function (btn) {
      btn.disabled = busy;
    });
  }

  function patchLineQty(key, quantity) {
    var line = qs('[data-frido-cart-line="' + key + '"]', drawerEl);
    if (!line) return;
    var qtySpan = qs('.frido-cart-item__qty span', line);
    if (qtySpan) qtySpan.textContent = quantity;
  }

  function emitCartUpdated(cart) {
    document.dispatchEvent(new CustomEvent('frido:cart:updated', { detail: cart }));
    if (typeof publish === 'function' && typeof PUB_SUB_EVENTS !== 'undefined') {
      publish(PUB_SUB_EVENTS.cartUpdate, { source: 'frido-cart', cartData: cart });
    }
  }

  function applyCart(cart, opts) {
    opts = opts || {};
    cartState = cart;
    updateCounts(cart);

    var empty = qs('[data-frido-cart-empty]', drawerEl);
    var itemsWrap = qs('[data-frido-cart-items]', drawerEl);
    var footer = qs('[data-frido-cart-footer]', drawerEl);
    var upsellWrap = qs('[data-frido-cart-upsell-wrap]', drawerEl);

    if (!cart.items.length) {
      if (empty) empty.hidden = false;
      if (itemsWrap) {
        itemsWrap.innerHTML = '';
        itemsWrap.hidden = true;
      }
      if (footer) footer.hidden = true;
      if (upsellWrap) upsellWrap.hidden = true;
      drawerEl.classList.add('is-empty');
      updateCartFooter(cart);
      emitCartUpdated(cart);
      return;
    }

    drawerEl.classList.remove('is-empty');
    if (empty) empty.hidden = true;
    if (footer) footer.hidden = false;
    if (upsellWrap) upsellWrap.hidden = false;
    updateCartFooter(cart);

    if (opts.patchKey) {
      var patchItem = cart.items.find(function (it) {
        return it.key === opts.patchKey;
      });
        if (!patchItem || !patchLineItem(cart, patchItem)) {
        if (itemsWrap) {
          itemsWrap.innerHTML = cart.items
            .map(function (item) {
              return renderLineItem(item, cart);
            })
            .join('');
        }
      }
    } else if (opts.syncItems && itemsWrap) {
      var existingKeys = qsa('[data-frido-cart-line]', itemsWrap).map(function (el) {
        return el.getAttribute('data-frido-cart-line');
      });
      var cartKeys = cart.items.map(function (it) {
        return it.key;
      });
      var structureChanged =
        existingKeys.length !== cartKeys.length ||
        cartKeys.some(function (key, i) {
          return existingKeys[i] !== key;
        });

      if (structureChanged) {
        itemsWrap.innerHTML = cart.items
          .map(function (item) {
            return renderLineItem(item, cart);
          })
          .join('');
      } else {
        cart.items.forEach(function (item) {
          patchLineItem(cart, item);
        });
      }
    } else if (itemsWrap) {
      itemsWrap.hidden = false;
      itemsWrap.innerHTML = cart.items
        .map(function (item) {
          return renderLineItem(item, cart);
        })
        .join('');
    }

    if (itemsWrap && cart.items.length) {
      var uncached = getUncachedHandles(cart);
      if (uncached.length) {
        enrichLineItemPrices(cart);
      } else {
        patchComparePrices(cart);
      }
    }

    renderUpsells(cart);
    emitCartUpdated(cart);
  }

  function renderCart(cart, opts) {
    applyCart(cart, Object.assign({ syncItems: false }, opts || {}));
  }

  function renderUpsells(cart) {
    var list = qs('[data-frido-cart-upsell-list]', drawerEl);
    var wrap = qs('[data-frido-cart-upsell-wrap]', drawerEl);
    if (!list || !upsells.length) {
      if (wrap) wrap.hidden = true;
      return;
    }

    cart = cart || cartState;
    var visible = filterUpsellsForCart(cart).slice(0, upsellLimit);
    if (!visible.length) {
      list.innerHTML = '';
      if (wrap) wrap.hidden = true;
      return;
    }

    if (wrap) wrap.hidden = !cart || !cart.items || !cart.items.length;

    Promise.all(
      visible.map(function (u) {
        return loadProduct(u.handle).then(function (p) {
          return { u: u, p: p };
        });
      })
    ).then(function (rows) {
      if (!list) return;
      var html = rows
        .filter(function (r) {
          return r.p;
        })
        .map(function (r) {
          return renderUpsellCard(r.u, r.p);
        })
        .join('');
      list.innerHTML = html;
      if (wrap) wrap.hidden = !html || !cartState || !cartState.items || !cartState.items.length;
    });
  }

  function enrichLineItemPrices(cart) {
    var handles = getUncachedHandles(cart);
    if (!handles.length) {
      patchComparePrices(cart);
      return Promise.resolve();
    }

    return Promise.all(handles.map(loadProduct)).then(function () {
      if (cartState === cart) patchComparePrices(cart);
    });
  }

  function loadProduct(handle) {
    if (!handle) return Promise.resolve(null);
    if (productCache[handle]) return Promise.resolve(normalizeProduct(productCache[handle]));
    return fetch('/products/' + encodeURIComponent(handle) + '.js')
      .then(function (r) {
        return r.json();
      })
      .then(function (p) {
        productCache[handle] = normalizeProduct(p);
        return productCache[handle];
      })
      .catch(function () {
        return null;
      });
  }

  function refresh(opts) {
    return fetchCart().then(function (cart) {
      applyCart(cart, Object.assign({ skipUpsells: false }, opts || {}));
      return cart;
    });
  }

  function setLineQty(key, quantity) {
    if (pendingKey === key) return Promise.resolve();
    pendingKey = key;

    patchLineQty(key, quantity);
    setLineBusy(key, true);

    return cartChange({ id: key, quantity: quantity })
      .then(handleCartError)
      .then(function (cart) {
        applyCart(cart, { syncItems: true, skipUpsells: true });
        return cart;
      })
      .catch(function (err) {
        return refresh({ skipUpsells: true }).then(function () {
          throw err;
        });
      })
      .finally(function () {
        pendingKey = null;
        setLineBusy(key, false);
      });
  }

  function removeLine(key) {
    if (pendingKey === key) return Promise.resolve();
    pendingKey = key;

    var line = qs('[data-frido-cart-line="' + key + '"]', drawerEl);
    if (line) line.remove();

    if (cartState) {
      var removed = cartState.items.find(function (it) {
        return it.key === key;
      });
      if (removed) {
        updateCounts({
          item_count: Math.max(0, cartState.item_count - removed.quantity),
        });
      }
    }

    return cartChange({ id: key, quantity: 0 })
      .then(handleCartError)
      .then(function (cart) {
        applyCart(cart, { skipUpsells: true });
        return cart;
      })
      .catch(function (err) {
        return refresh({ skipUpsells: true }).then(function () {
          throw err;
        });
      })
      .finally(function () {
        pendingKey = null;
      });
  }

  function stripHtml(html) {
    if (!html) return '';
    var el = document.createElement('div');
    el.innerHTML = html;
    return (el.textContent || el.innerText || '').trim();
  }

  function getProductMeta(handle) {
    return (
      upsells.find(function (u) {
        return u.handle === handle;
      }) || {}
    );
  }

  function formatReviewSummary(count) {
    if (count === '' || count == null) return '';
    var n = Number(count);
    if (!n || isNaN(n)) {
      var raw = String(count).replace(/[()]/g, '');
      return raw ? raw + '+ Reviews' : '';
    }
    return n.toLocaleString() + '+ Reviews';
  }

  function getModalLabels() {
    if (!drawerEl) return labels;
    return {
      submitEdit: drawerEl.getAttribute('data-label-edit') || labels.submitEdit,
      submitAdd: drawerEl.getAttribute('data-label-add') || labels.submitAdd,
      styleHeading: drawerEl.getAttribute('data-label-style-heading') || labels.styleHeading,
      ratingLabel: drawerEl.getAttribute('data-label-rating') || labels.ratingLabel,
      viewDetails: drawerEl.getAttribute('data-label-details') || labels.viewDetails,
      sizeGuide: drawerEl.getAttribute('data-label-size-guide') || labels.sizeGuide,
    };
  }

  function buildModalSelects(product) {
    var html = '';
    product.options.forEach(function (opt, idx) {
      var optName = getOptionName(opt);
      var values = product.variants
        .map(function (v) {
          return v['option' + (idx + 1)];
        })
        .filter(function (v, i, a) {
          return v && a.indexOf(v) === i;
        });

      html +=
        '<div class="frido-cart-modal__field">' +
        '<label class="frido-cart-modal__field-label">' +
        escapeHtml(optName) +
        '</label>' +
        '<div class="frido-cart-modal__select-wrap">' +
        '<select class="frido-cart-modal__select" data-frido-modal-opt="' +
        escapeHtml(optName) +
        '" aria-label="' +
        escapeHtml(optName) +
        '">';
      values.forEach(function (val) {
        html +=
          '<option value="' +
          escapeHtml(val) +
          '"' +
          (modalState.selected[optName] === val ? ' selected' : '') +
          '>' +
          escapeHtml(val) +
          '</option>';
      });
      html += '</select></div></div>';
    });
    return html;
  }

  function renderQuickModal(product, variant) {
    var wrap = qs('[data-frido-cart-modal-content]', modalEl);
    if (!wrap || !product || !variant) return;

    var modalLabels = getModalLabels();
    var meta = modalState.meta || {};
    var compare = variant.compare_at_price || 0;
    var price = variant.price;
    var pct = compare > price ? Math.round(((compare - price) * 100) / compare) : 0;
    var rating = Number(meta.rating);
    if (isNaN(rating)) rating = 5;
    var ratingLabel = rating % 1 === 0 ? String(rating) : rating.toFixed(1);
    var reviewSummary = formatReviewSummary(meta.review_count);
    var img =
      (variant.featured_image && (variant.featured_image.src || variant.featured_image)) ||
      product.featured_image ||
      meta.image ||
      '';
    var subtitle = stripHtml(product.description);
    if (subtitle.length > 140) subtitle = subtitle.slice(0, 140).trim() + '…';
    var productUrl = '/products/' + encodeURIComponent(product.handle);
    var submitLabel = modalState.mode === 'add' ? modalLabels.submitAdd : modalLabels.submitEdit;

    wrap.innerHTML =
      '<div class="frido-cart-modal__rating">' +
      '<span class="frido-cart-modal__stars" aria-hidden="true">' +
      renderUpsellStars(rating) +
      '</span>' +
      '<span class="frido-cart-modal__rating-text">' +
      '<strong>' +
      escapeHtml(modalLabels.ratingLabel) +
      ' ' +
      escapeHtml(ratingLabel) +
      '</strong>' +
      (reviewSummary ? '<span class="frido-cart-modal__rating-sep">|</span><span>' + escapeHtml(reviewSummary) + '</span>' : '') +
      '</span></div>' +
      '<h2 id="FridoCartModalTitle" class="frido-cart-modal__title">' +
      escapeHtml(product.title) +
      '</h2>' +
      (subtitle ? '<p class="frido-cart-modal__subtitle">' + escapeHtml(subtitle) + '</p>' : '') +
      '<div class="frido-cart-modal__price-row" data-frido-cart-modal-price>' +
      '<span class="frido-cart-modal__price-current">' +
      money(price) +
      '</span>' +
      (compare > price ? '<span class="frido-cart-modal__price-compare">' + money(compare) + '</span>' : '') +
      (pct > 0 ? '<span class="frido-cart-modal__save">' + labels.save + ' ' + pct + '%</span>' : '') +
      '</div>' +
      '<div class="frido-cart-modal__picker">' +
      '<div class="frido-cart-modal__picker-head">' +
      '<span class="frido-cart-modal__picker-title">' +
      escapeHtml(modalLabels.styleHeading) +
      '</span>' +
      '<a href="' +
      escapeHtml(productUrl) +
      '" class="frido-cart-modal__size-guide">' +
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M4 7h16M4 12h10M4 17h6"/></svg>' +
      escapeHtml(modalLabels.sizeGuide) +
      '</a></div>' +
      '<div class="frido-cart-modal__picker-body">' +
      '<div class="frido-cart-modal__thumb" data-frido-cart-modal-thumb>' +
      (img ? '<img src="' + escapeHtml(img) + '" alt="" width="72" height="72" loading="lazy">' : '') +
      '</div>' +
      '<div class="frido-cart-modal__selects" data-frido-cart-modal-options>' +
      buildModalSelects(product) +
      '</div></div></div>' +
      '<div class="frido-cart-modal__actions">' +
      '<button type="button" class="frido-cart-modal__submit" data-frido-cart-modal-submit' +
      (!variant.available ? ' disabled' : '') +
      '>' +
      '<span>' +
      escapeHtml(submitLabel) +
      '</span>' +
      '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>' +
      '</button>' +
      '<a href="' +
      escapeHtml(productUrl) +
      '" class="frido-cart-modal__details">' +
      escapeHtml(modalLabels.viewDetails) +
      '</a></div>';
  }

  function patchQuickModalVariant(product, variant) {
    if (!variant) return;
    var compare = variant.compare_at_price || 0;
    var price = variant.price;
    var pct = compare > price ? Math.round(((compare - price) * 100) / compare) : 0;
    var img =
      (variant.featured_image && (variant.featured_image.src || variant.featured_image)) ||
      product.featured_image ||
      '';

    var priceRow = qs('[data-frido-cart-modal-price]', modalEl);
    if (priceRow) {
      priceRow.innerHTML =
        '<span class="frido-cart-modal__price-current">' +
        money(price) +
        '</span>' +
        (compare > price ? '<span class="frido-cart-modal__price-compare">' + money(compare) + '</span>' : '') +
        (pct > 0 ? '<span class="frido-cart-modal__save">' + labels.save + ' ' + pct + '%</span>' : '');
    }

    var thumb = qs('[data-frido-cart-modal-thumb]', modalEl);
    if (thumb) {
      thumb.innerHTML = img ? '<img src="' + escapeHtml(img) + '" alt="" width="72" height="72" loading="lazy">' : '';
    }

    var submit = qs('[data-frido-cart-modal-submit]', modalEl);
    if (submit) {
      submit.disabled = !variant.available;
    }
  }

  function findVariant(product, selected) {
    return product.variants.find(function (v) {
      return product.options.every(function (opt, i) {
        return v['option' + (i + 1)] === selected[getOptionName(opt)];
      });
    });
  }

  function syncModalVariant() {
    var v = findVariant(modalState.product, modalState.selected);
    if (v && modalState.product) patchQuickModalVariant(modalState.product, v);
    return v;
  }

  function openModal() {
    if (!modalEl) return;
    if (window.FridoOverlay && FridoOverlay.portal) {
      FridoOverlay.portal(modalEl);
    } else if (document.body) {
      document.body.appendChild(modalEl);
    }
    var onOpened = function () {
      var dialog = qs('.frido-cart-modal__dialog', modalEl);
      if (dialog) dialog.focus();
    };
    if (window.FridoOverlay) {
      FridoOverlay.open(modalEl, { bodyClass: 'frido-cart-modal-open', onOpened: onOpened });
    } else {
      modalEl.removeAttribute('hidden');
      modalEl.setAttribute('aria-hidden', 'false');
      modalEl.classList.add('is-open');
      document.body.classList.add('frido-cart-modal-open');
      onOpened();
    }
  }

  function closeModal() {
    if (!modalEl) return;
    if (window.FridoOverlay) {
      FridoOverlay.close(modalEl, {
        bodyClass: 'frido-cart-modal-open',
      });
    } else {
      modalEl.classList.remove('is-open');
      modalEl.setAttribute('aria-hidden', 'true');
      modalEl.setAttribute('hidden', '');
      document.body.classList.remove('frido-cart-modal-open');
    }
  }

  function openVariantModal(opts) {
    opts = opts || {};
    if (!modalEl) return;

    modalState.mode = opts.mode || 'add';
    modalState.lineKey = opts.lineKey || null;
    modalState.quantity = opts.quantity || 1;
    modalState.properties = normalizeProperties(opts.properties);

    var handle = opts.handle || '';
    if (!handle) return;

    modalState.meta = opts.meta || getProductMeta(handle);

    loadProduct(handle).then(function (product) {
      if (!product || !modalEl) return;
      product = normalizeProduct(product);
      modalState.product = product;
      modalState.selected = {};

      var variantId = opts.variantId;
      var variant = variantId
        ? product.variants.find(function (v) {
            return Number(v.id) === Number(variantId);
          })
        : null;
      if (!variant) {
        variant = product.variants.find(function (v) {
          return v.available;
        }) || product.variants[0];
      }
      if (!variant) return;

      product.options.forEach(function (opt, i) {
        modalState.selected[getOptionName(opt)] = variant['option' + (i + 1)];
      });

      renderQuickModal(product, variant);

      if (opts.focus === 'size' || opts.focus === 'color') {
        qsa('[data-frido-cart-modal-options] select', modalEl).forEach(function (sel) {
          var name = (sel.getAttribute('data-frido-modal-opt') || '').toLowerCase();
          if (opts.focus === 'color' && /colou?r/.test(name)) sel.focus();
          if (opts.focus === 'size' && /size/.test(name)) sel.focus();
        });
      }

      openModal();
    });
  }

  function applyModalSelection() {
    var v = findVariant(modalState.product, modalState.selected);
    if (!v || !v.available) return Promise.reject(new Error('Unavailable'));

    if (modalState.mode === 'add') {
      return cartAdd([{ id: v.id, quantity: 1 }])
        .then(handleCartError)
        .then(function () {
          closeModal();
          return openAfterCartAdd();
        });
    }

    return cartChange({ id: modalState.lineKey, quantity: 0 })
      .then(handleCartError)
      .then(function () {
        return cartAdd([
          {
            id: v.id,
            quantity: modalState.quantity,
            properties: normalizeProperties(modalState.properties),
          },
        ]);
      })
      .then(handleCartError)
      .then(function () {
        closeModal();
        return refresh({ skipUpsells: true });
      });
  }

  function open(trigger) {
    if (!drawerEl) return;
    if (trigger) drawerEl._trigger = trigger;
    var onOpened = function () {
      if (cartState) applyCart(cartState, { skipUpsells: false });
      refresh({ skipUpsells: false });
      var panel = qs('.frido-cart-drawer__panel', drawerEl);
      if (panel) panel.focus();
    };
    if (window.FridoOverlay) {
      FridoOverlay.open(drawerEl, { bodyClass: 'frido-cart-drawer-open', onOpened: onOpened });
    } else {
      drawerEl.removeAttribute('hidden');
      drawerEl.setAttribute('aria-hidden', 'false');
      drawerEl.classList.add('is-open');
      document.body.classList.add('frido-cart-drawer-open');
      onOpened();
    }
  }

  function close() {
    if (!drawerEl) return;
    var trigger = drawerEl._trigger;
    var onClosed = function () {
      if (trigger) {
        trigger.focus();
        drawerEl._trigger = null;
      }
    };
    if (window.FridoOverlay) {
      FridoOverlay.close(drawerEl, {
        bodyClass: 'frido-cart-drawer-open',
        keepBodyClassIf: '.frido-cart-modal.is-open, .frido-cart-modal.is-closing',
        onClosed: onClosed,
      });
    } else {
      drawerEl.classList.remove('is-open');
      drawerEl.setAttribute('aria-hidden', 'true');
      drawerEl.setAttribute('hidden', '');
      document.body.classList.remove('frido-cart-drawer-open');
      onClosed();
    }
  }

  var eventsBound = false;
  var fridoCartInternalAdd = false;
  var thirdPartyApisHijacked = false;
  var fetchInterceptorInstalled = false;
  var openAfterCartAddTimer = null;

  var THIRD_PARTY_DRAWER_SELECTORS = [
    '#slidecarthq',
    '#slide-cart',
    '#slideCart',
    '#side-cart',
    '.slidecarthq',
    '.slide-cart',
    '.slideCart',
    '[id*="slidecart" i]',
    '[class*="slidecart" i]',
    '[id*="slide-cart" i]',
    '[class*="slide-cart" i]',
    'cart-drawer.drawer',
  ];

  function suppressThirdPartyCartDrawers() {
    THIRD_PARTY_DRAWER_SELECTORS.forEach(function (sel) {
      try {
        qsa(sel).forEach(function (el) {
          if (el.closest('[data-frido-cart-drawer]')) return;
          el.classList.remove('is-open', 'active', 'open', 'visible', 'drawer--is-open', 'show');
          el.setAttribute('aria-hidden', 'true');
          if (el.tagName === 'DIALOG') {
            try {
              el.close();
            } catch (err) {
              /* ignore */
            }
          }
        });
      } catch (err) {
        /* ignore invalid selectors in older browsers */
      }
    });

    ['SlideCart', 'slideCart', 'Slidecart', 'SideCart', 'sideCart', 'slideCartHQ'].forEach(function (name) {
      var api = window[name];
      if (!api) return;
      if (typeof api.close === 'function') {
        try {
          api.close();
        } catch (err) {
          /* ignore */
        }
      }
      if (typeof api.hide === 'function') {
        try {
          api.hide();
        } catch (err) {
          /* ignore */
        }
      }
    });

    document.documentElement.classList.remove('slidecart-open', 'slide-cart-open', 'cart-open');
    document.body.classList.remove('slidecart-open', 'slide-cart-open');
  }

  function routeThirdPartyCartOpen(trigger) {
    if (window.FridoCart && typeof window.FridoCart.open === 'function') {
      window.FridoCart.open(trigger);
    }
  }

  function hijackThirdPartyCartApis() {
    if (thirdPartyApisHijacked) return;
    thirdPartyApisHijacked = true;

    ['SlideCart', 'slideCart', 'Slidecart', 'SideCart', 'sideCart'].forEach(function (name) {
      var api = window[name];
      if (!api || api.__fridoHijacked) return;

      ['open', 'show', 'toggle'].forEach(function (method) {
        if (typeof api[method] !== 'function') return;
        api[method] = function () {
          suppressThirdPartyCartDrawers();
          routeThirdPartyCartOpen();
        };
      });

      api.__fridoHijacked = true;
    });
  }

  function openAfterCartAdd(trigger) {
    if (openAfterCartAddTimer) window.clearTimeout(openAfterCartAddTimer);
    return new Promise(function (resolve) {
      openAfterCartAddTimer = window.setTimeout(function () {
        openAfterCartAddTimer = null;
        suppressThirdPartyCartDrawers();
        refresh({ skipUpsells: false })
          .then(function () {
            open(trigger);
            suppressThirdPartyCartDrawers();
            window.setTimeout(suppressThirdPartyCartDrawers, 60);
            window.setTimeout(suppressThirdPartyCartDrawers, 250);
          })
          .then(resolve, resolve);
      }, 30);
    });
  }

  function shouldOpenDrawerForCartEvent(evt) {
    if (!evt) return false;
    if (evt.source === 'frido-cart' || evt.source === 'cart-items') return false;
    return true;
  }

  function installCartAddInterceptor() {
    if (fetchInterceptorInstalled || typeof window.fetch !== 'function') return;
    fetchInterceptorInstalled = true;

    var nativeFetch = window.fetch.bind(window);
    window.fetch = function (input, init) {
      var url = typeof input === 'string' ? input : input && input.url;
      var isCartAdd = url && /\/cart\/add(\.js)?(\?|$)/.test(url);

      return nativeFetch(input, init).then(function (response) {
        if (!isCartAdd || !response.ok || fridoCartInternalAdd || !drawerEl) return response;

        response
          .clone()
          .json()
          .then(function (data) {
            if (!data || data.status || !window.FridoCart) return;
            openAfterCartAdd();
          })
          .catch(function () {
            /* ignore non-json */
          });

        return response;
      });
    };
  }

  function bindEvents() {
    if (eventsBound) return;
    eventsBound = true;

    document.addEventListener('click', function (e) {
      if (e.target.closest('[data-frido-cart-open]')) {
        e.preventDefault();
        open(e.target.closest('[data-frido-cart-open]'));
        return;
      }

      if (e.target.closest('[data-frido-cart-modal-close]')) {
        e.preventDefault();
        closeModal();
        return;
      }

      if (e.target.closest('[data-frido-cart-close]')) {
        e.preventDefault();
        close();
        return;
      }

      if (e.target.closest('[data-frido-cart-modal-submit]')) {
        e.preventDefault();
        var submitModal = e.target.closest('[data-frido-cart-modal-submit]');
        submitModal.disabled = true;
        applyModalSelection()
          .catch(function (err) {
            alert(err.message || (window.cartStrings && window.cartStrings.error) || 'Could not update cart');
          })
          .finally(function () {
            if (submitModal) submitModal.disabled = false;
            syncModalVariant();
          });
        return;
      }

      var qtyBtn = e.target.closest('[data-frido-cart-qty]');
      if (qtyBtn && cartState) {
        var key = qtyBtn.getAttribute('data-frido-cart-qty');
        var delta = parseInt(qtyBtn.getAttribute('data-delta'), 10);
        var item = cartState.items.find(function (it) {
          return it.key === key;
        });
        if (item) setLineQty(key, Math.max(0, item.quantity + delta));
        return;
      }

      var rem = e.target.closest('[data-frido-cart-remove]');
      if (rem) {
        removeLine(rem.getAttribute('data-frido-cart-remove'));
        return;
      }

      var edit = e.target.closest('[data-frido-cart-edit]');
      if (edit && cartState) {
        e.preventDefault();
        var keyE = edit.getAttribute('data-frido-cart-edit');
        var line = cartState.items.find(function (it) {
          return it.key === keyE;
        });
        if (!line) return;
        var lineEl = edit.closest('[data-frido-cart-line]');
        var handle = line.handle || (lineEl && lineEl.getAttribute('data-product-handle')) || itemHandle(line);
        if (!handle) return;
        openVariantModal({
          mode: 'edit',
          lineKey: line.key,
          handle: handle,
          variantId: line.variant_id,
          quantity: line.quantity,
          properties: line.properties,
          focus: edit.getAttribute('data-edit-focus'),
        });
        return;
      }

      var upsellAdd = e.target.closest('[data-frido-cart-upsell-add]');
      if (upsellAdd) {
        e.preventDefault();
        var upsellHandle = upsellAdd.getAttribute('data-frido-cart-upsell-add');
        openVariantModal({
          mode: 'add',
          handle: upsellHandle,
          meta: getProductMeta(upsellHandle),
        });
        return;
      }

    });

    document.addEventListener('change', function (e) {
      var sel = e.target.closest('[data-frido-modal-opt]');
      if (sel && sel.tagName === 'SELECT' && modalEl && modalEl.contains(sel)) {
        modalState.selected[sel.getAttribute('data-frido-modal-opt')] = sel.value;
        syncModalVariant();
      }
    });

    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      if (modalEl && modalEl.classList.contains('is-open')) closeModal();
      else if (drawerEl && drawerEl.classList.contains('is-open')) close();
    });

    if (typeof subscribe === 'function' && typeof PUB_SUB_EVENTS !== 'undefined') {
      subscribe(PUB_SUB_EVENTS.cartUpdate, function (evt) {
        if (!evt || evt.source === 'frido-cart') return;
        if (shouldOpenDrawerForCartEvent(evt)) {
          openAfterCartAdd();
          return;
        }
        refresh();
      });
    }
  }

  function portalOverlays() {
    if (!window.FridoOverlay || !FridoOverlay.portal) return;
    if (drawerEl) FridoOverlay.portal(drawerEl);
    if (modalEl) FridoOverlay.portal(modalEl);
  }

  function init() {
    drawerEl = qs('[data-frido-cart-drawer]');
    modalEl = qs('[data-frido-cart-modal]');
    if (!drawerEl || !modalEl) return;

    portalOverlays();

    moneyFormat = drawerEl.getAttribute('data-money-format') || '${{amount}}';

    var iconTpl = document.getElementById('FridoIconDiscountTpl');
    if (iconTpl) discountTagIconHtml = iconTpl.innerHTML.trim();
    labels.submitEdit = drawerEl.getAttribute('data-label-edit') || labels.submitEdit;
    labels.submitAdd = drawerEl.getAttribute('data-label-add') || labels.submitAdd;
    labels.styleHeading = drawerEl.getAttribute('data-label-style-heading') || labels.styleHeading;
    labels.ratingLabel = drawerEl.getAttribute('data-label-rating') || labels.ratingLabel;
    labels.viewDetails = drawerEl.getAttribute('data-label-details') || labels.viewDetails;
    labels.sizeGuide = drawerEl.getAttribute('data-label-size-guide') || labels.sizeGuide;

    var upsellConfig = qs('[data-frido-cart-upsells-config]');
    if (upsellConfig) {
      try {
        var config = JSON.parse(upsellConfig.textContent);
        upsells = (config && config.products) || [];
        upsellLimit = (config && config.limit) || 3;
      } catch (e) {
        upsells = [];
        upsellLimit = 3;
      }
    }

    bindEvents();
    hijackThirdPartyCartApis();
    installCartAddInterceptor();
    window.setInterval(hijackThirdPartyCartApis, 2000);
    refresh();
  }

  window.FridoCart = {
    open: open,
    close: close,
    refresh: refresh,
    suppressThirdParty: suppressThirdPartyCartDrawers,
    addItems: function (items) {
      return cartAdd(items).then(handleCartError).then(function () {
        return openAfterCartAdd();
      });
    },
    openVariantModal: openVariantModal,
  };

  installCartAddInterceptor();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  document.addEventListener('shopify:section:load', init);
})();
