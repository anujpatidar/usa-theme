/**
 * Frido cart drawer — /cart.js refresh, fast change.js, variant modal
 */
(function () {
  var drawerEl;
  var modalEl;
  var moneyFormat;
  var upsells = [];
  var cartState = null;
  var pendingKey = null;
  var productCache = Object.create(null);
  var modalState = { mode: 'edit', lineKey: null, product: null, selected: {}, quantity: 1, properties: {} };

  var labels = {
    itemsInCart: 'items in cart',
    itemInCart: 'item in cart',
    changeColor: 'Change Color',
    changeSize: 'Change Size',
    save: 'SAVE',
    add: '+ ADD',
    submitEdit: 'Update Item',
    submitAdd: 'ADD TO CART',
  };

  var tagIconSvg =
    '<svg class="frido-cart-item__tag-svg" width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">' +
    '<path d="M21.41 11.58l-9-9C12.05 2.22 11.55 2 11 2H4c-1.1 0-2 .9-2 2v7c0 .55.22 1.05.59 1.42l9 9c.36.36.86.58 1.41.58s1.05-.22 1.41-.59l7-7c.37-.36.59-.86.59-1.41s-.23-1.06-.59-1.42zM5.5 7C4.67 7 4 6.33 4 5.5S4.67 4 5.5 4 7 4.67 7 5.5 6.33 7 5.5 7z"/></svg>';

  var trashIconSvg =
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">' +
    '<path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M6 6l1 14h10l1-14"/><path d="M10 11v6M14 11v6"/></svg>';

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

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
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
    return fetch((window.routes && window.routes.cart_add_url) || '/cart/add.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ items: items }),
    }).then(function (r) {
      return r.json();
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

  function lineDiscountText(item) {
    var parts = [];
    (item.line_level_discount_allocations || []).forEach(function (d) {
      if (d.discount_application && d.discount_application.title) {
        parts.push(d.discount_application.title);
      }
    });
    if (!parts.length) return '';
    var amt = item.original_line_price - item.final_line_price;
    if (amt > 0) {
      return parts[0] + ' (-' + money(amt) + ')';
    }
    return parts.join(', ');
  }

  function savePct(item) {
    if (!item.original_line_price || item.original_line_price <= item.final_line_price) return 0;
    return Math.round(((item.original_line_price - item.final_line_price) * 100) / item.original_line_price);
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

  function renderLineItem(item) {
    var pct = savePct(item);
    var disc = lineDiscountText(item);
    var busy = pendingKey === item.key ? ' is-loading' : '';
    var img = item.image ? escapeHtml(item.image) : '';
    var handle = (item.url || '').split('/products/')[1];
    if (handle) handle = handle.split('?')[0];

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
      (pct > 0
        ? '<span class="frido-cart-item__save-badge">' + tagIconSvg + ' ' + labels.save + ' ' + pct + '%</span>'
        : '') +
      (img ? '<img src="' + img + '" alt="" width="80" height="80" loading="lazy">' : '') +
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
      trashIconSvg +
      '</button></div>' +
      (item.variant_title && item.variant_title !== 'Default Title'
        ? '<div class="frido-cart-item__pills">' + variantPills(item.variant_title) + '</div>'
        : '') +
      (disc
        ? '<p class="frido-cart-item__discount">' + tagIconSvg + ' <span>' + escapeHtml(disc) + '</span></p>'
        : '') +
      '</div></div>' +
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
      '<div class="frido-cart-item__side">' +
      '<div class="frido-cart-item__prices">' +
      (item.original_line_price > item.final_line_price
        ? '<span class="frido-cart-item__compare">' + money(item.original_line_price) + '</span>'
        : '') +
      '<span class="frido-cart-item__price">' + money(item.final_line_price) + '</span>' +
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
      '</div></div></div></article>'
    );
  }

  function renderUpsellCard(u, product) {
    var v = product.variants.find(function (x) {
      return x.available;
    }) || product.variants[0];
    if (!v) return '';
    var compare = v.compare_at_price || 0;
    var price = v.price;
    var pct = compare > price ? Math.round(((compare - price) * 100) / compare) : 0;
    var img = u.image || (v.featured_image && v.featured_image.src) || (product.featured_image && product.featured_image) || '';

    return (
      '<div class="frido-cart-upsell" data-frido-cart-upsell="' +
      escapeHtml(product.handle) +
      '">' +
      '<div class="frido-cart-upsell__media">' +
      (img ? '<img src="' + escapeHtml(img) + '" alt="" width="64" height="64" loading="lazy">' : '') +
      '</div>' +
      '<div class="frido-cart-upsell__body">' +
      '<p class="frido-cart-upsell__title">' +
      escapeHtml(u.title || product.title) +
      '</p>' +
      '<p class="frido-cart-upsell__rating">★ ' +
      (u.rating || 5) +
      ' <span>' +
      escapeHtml(u.review_count || '') +
      '</span></p>' +
      '<p class="frido-cart-upsell__price">' +
      '<strong>' +
      money(price) +
      '</strong>' +
      (compare > price ? ' <s>' + money(compare) + '</s>' : '') +
      (pct > 0 ? ' <span class="frido-cart-upsell__save">Save ' + pct + '%</span>' : '') +
      '</p></div>' +
      '<button type="button" class="frido-cart-upsell__add" data-frido-cart-upsell-add="' +
      escapeHtml(product.handle) +
      '">' +
      labels.add +
      '</button></div>'
    );
  }

  function renderCart(cart) {
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
      return;
    }

    drawerEl.classList.remove('is-empty');
    if (empty) empty.hidden = true;
    if (itemsWrap) {
      itemsWrap.hidden = false;
      itemsWrap.innerHTML = cart.items.map(renderLineItem).join('');
    }
    if (footer) footer.hidden = false;
    if (upsellWrap) upsellWrap.hidden = false;

    var subLabel = qs('[data-frido-cart-subtotal-label]', drawerEl);
    if (subLabel) {
      subLabel.textContent =
        'Subtotal (' + cart.item_count + ' Item' + (cart.item_count === 1 ? '' : 's') + '):';
    }
    var sub = qs('[data-frido-cart-subtotal]', drawerEl);
    if (sub) sub.textContent = money(cart.items_subtotal_price);

    var discRow = qs('[data-frido-cart-discount-row]', drawerEl);
    var disc = qs('[data-frido-cart-discount]', drawerEl);
    if (cart.total_discount > 0 && discRow && disc) {
      discRow.hidden = false;
      disc.textContent = '-' + money(cart.total_discount);
    } else if (discRow) {
      discRow.hidden = true;
    }

    var total = qs('[data-frido-cart-total]', drawerEl);
    if (total) total.textContent = money(cart.total_price);

    renderUpsells();
  }

  function renderUpsells() {
    var list = qs('[data-frido-cart-upsell-list]', drawerEl);
    if (!list || !upsells.length) return;

    Promise.all(
      upsells.map(function (u) {
        return loadProduct(u.handle).then(function (p) {
          return { u: u, p: p };
        });
      })
    ).then(function (rows) {
      list.innerHTML = rows
        .filter(function (r) {
          return r.p;
        })
        .map(function (r) {
          return renderUpsellCard(r.u, r.p);
        })
        .join('');
    });
  }

  function loadProduct(handle) {
    if (!handle) return Promise.resolve(null);
    if (productCache[handle]) return Promise.resolve(productCache[handle]);
    return fetch('/products/' + encodeURIComponent(handle) + '.js')
      .then(function (r) {
        return r.json();
      })
      .then(function (p) {
        productCache[handle] = p;
        return p;
      })
      .catch(function () {
        return null;
      });
  }

  function refresh() {
    return fetchCart().then(function (cart) {
      renderCart(cart);
      document.dispatchEvent(new CustomEvent('frido:cart:updated', { detail: cart }));
      if (typeof publish === 'function' && typeof PUB_SUB_EVENTS !== 'undefined') {
        publish(PUB_SUB_EVENTS.cartUpdate, { source: 'frido-cart', cartData: cart });
      }
      return cart;
    });
  }

  function setLineQty(key, quantity) {
    pendingKey = key;
    var line = qs('[data-frido-cart-line="' + key + '"]', drawerEl);
    if (line) line.classList.add('is-loading');
    return cartChange({ id: key, quantity: quantity })
      .then(handleCartError)
      .then(refresh)
      .finally(function () {
        pendingKey = null;
      });
  }

  function removeLine(key) {
    return setLineQty(key, 0);
  }

  function findVariant(product, selected) {
    return product.variants.find(function (v) {
      return product.options.every(function (opt, i) {
        return v['option' + (i + 1)] === selected[opt];
      });
    });
  }

  function optionUiType(name) {
    var n = name.toLowerCase();
    if (/colou?r/.test(n)) return 'color';
    if (/size/.test(n)) return 'size';
    return 'select';
  }

  function buildModalOptions(product) {
    var html = '';
    product.options.forEach(function (optName, idx) {
      var type = optionUiType(optName);
      var values = product.variants
        .map(function (v) {
          return v['option' + (idx + 1)];
        })
        .filter(function (v, i, a) {
          return a.indexOf(v) === i;
        });

      if (type === 'color' || type === 'size') {
        html +=
          '<div class="frido-cart-modal__option" data-option-type="' +
          type +
          '"><span class="frido-cart-modal__label">' +
          escapeHtml(optName) +
          '</span><div class="frido-cart-modal__pills">';
        values.forEach(function (val) {
          var active = modalState.selected[optName] === val ? ' is-active' : '';
          html +=
            '<button type="button" class="frido-cart-modal__pill' +
            active +
            '" data-frido-modal-opt="' +
            escapeHtml(optName) +
            '" data-value="' +
            escapeHtml(val) +
            '">' +
            escapeHtml(val) +
            '</button>';
        });
        html += '</div></div>';
      } else {
        html +=
          '<div class="frido-cart-modal__option"><label class="frido-cart-modal__label">' +
          escapeHtml(optName) +
          '</label><select class="frido-cart-modal__select" data-frido-modal-opt="' +
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
        html += '</select></div>';
      }
    });
    return html;
  }

  function updateModalProductHeader(product, variant) {
    var wrap = qs('[data-frido-cart-modal-product]', modalEl);
    if (!wrap) return;
    var img = (variant.featured_image && variant.featured_image.src) || product.featured_image || '';
    var compare = variant.compare_at_price || 0;
    wrap.hidden = false;
    wrap.innerHTML =
      '<div class="frido-cart-modal__product-inner">' +
      (img ? '<img src="' + escapeHtml(img) + '" alt="" width="72" height="72">' : '') +
      '<div><p class="frido-cart-modal__product-title">' +
      escapeHtml(product.title) +
      '</p><p class="frido-cart-modal__product-price">' +
      '<strong>' +
      money(variant.price) +
      '</strong>' +
      (compare > variant.price ? ' <s>' + money(compare) + '</s>' : '') +
      '</p></div></div>';
  }

  function syncModalVariant() {
    var v = findVariant(modalState.product, modalState.selected);
    var submit = qs('[data-frido-cart-modal-submit]', modalEl);
    if (submit) {
      submit.disabled = !v || !v.available;
      submit.textContent =
        modalState.mode === 'add'
          ? drawerEl.getAttribute('data-label-add') || labels.submitAdd
          : drawerEl.getAttribute('data-label-edit') || labels.submitEdit;
    }
    if (v) updateModalProductHeader(modalState.product, v);
    return v;
  }

  function openModal() {
    if (!modalEl) return;
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
        keepBodyClassIf: '.frido-cart-drawer.is-open, .frido-cart-drawer.is-closing',
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
    modalState.mode = opts.mode || 'add';
    modalState.lineKey = opts.lineKey || null;
    modalState.quantity = opts.quantity || 1;
    modalState.properties = opts.properties || {};

    loadProduct(opts.handle).then(function (product) {
      if (!product) return;
      modalState.product = product;
      modalState.selected = {};

      var variantId = opts.variantId;
      var variant = variantId
        ? product.variants.find(function (v) {
            return v.id === variantId;
          })
        : null;
      if (!variant) variant = product.variants.find(function (v) { return v.available; }) || product.variants[0];
      product.options.forEach(function (opt, i) {
        modalState.selected[opt] = variant['option' + (i + 1)];
      });

      var optionsEl = qs('[data-frido-cart-modal-options]', modalEl);
      if (optionsEl) optionsEl.innerHTML = buildModalOptions(product);
      syncModalVariant();

      if (opts.focus === 'size') {
        var sizeBlock = qs('[data-option-type="size"]', modalEl);
        if (sizeBlock) sizeBlock.scrollIntoView({ block: 'nearest' });
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
          return refresh();
        })
        .then(function () {
          open();
        });
    }

    return cartChange({ id: modalState.lineKey, quantity: 0 })
      .then(handleCartError)
      .then(function () {
        return cartAdd([
          {
            id: v.id,
            quantity: modalState.quantity,
            properties: modalState.properties,
          },
        ]);
      })
      .then(handleCartError)
      .then(function () {
        closeModal();
        return refresh();
      });
  }

  function open(trigger) {
    if (!drawerEl) return;
    if (trigger) drawerEl._trigger = trigger;
    var onOpened = function () {
      refresh();
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

  function bindEvents() {
    document.addEventListener('click', function (e) {
      if (e.target.closest('[data-frido-cart-open]')) {
        e.preventDefault();
        open(e.target.closest('[data-frido-cart-open]'));
        return;
      }
      if (e.target.closest('[data-frido-cart-close]')) {
        var inModal = e.target.closest('[data-frido-cart-modal]');
        if (inModal) {
          closeModal();
        } else {
          close();
        }
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
        var keyE = edit.getAttribute('data-frido-cart-edit');
        var line = cartState.items.find(function (it) {
          return it.key === keyE;
        });
        if (!line) return;
        var handle = edit.closest('[data-frido-cart-line]').getAttribute('data-product-handle');
        openVariantModal({
          mode: 'edit',
          lineKey: line.key,
          handle: handle,
          variantId: line.variant_id,
          quantity: line.quantity,
          properties: line.properties || {},
          focus: edit.getAttribute('data-edit-focus'),
        });
        return;
      }

      var upsellAdd = e.target.closest('[data-frido-cart-upsell-add]');
      if (upsellAdd) {
        openVariantModal({ mode: 'add', handle: upsellAdd.getAttribute('data-frido-cart-upsell-add') });
        return;
      }

      var pill = e.target.closest('[data-frido-modal-opt]');
      if (pill && pill.tagName === 'BUTTON') {
        var opt = pill.getAttribute('data-frido-modal-opt');
        modalState.selected[opt] = pill.getAttribute('data-value');
        qsa('[data-frido-modal-opt="' + opt + '"]', modalEl).forEach(function (b) {
          if (b.tagName === 'BUTTON') b.classList.toggle('is-active', b === pill);
        });
        syncModalVariant();
      }
    });

    document.addEventListener('change', function (e) {
      var sel = e.target.closest('[data-frido-modal-opt]');
      if (sel && sel.tagName === 'SELECT') {
        modalState.selected[sel.getAttribute('data-frido-modal-opt')] = sel.value;
        syncModalVariant();
      }
    });

    var submitModal = qs('[data-frido-cart-modal-submit]', modalEl);
    if (submitModal) {
      submitModal.addEventListener('click', function () {
        submitModal.disabled = true;
        applyModalSelection()
          .catch(function (err) {
            alert(err.message || window.cartStrings?.error || 'Could not update cart');
          })
          .finally(function () {
            syncModalVariant();
          });
      });
    }

    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      if (modalEl.classList.contains('is-open')) closeModal();
      else if (drawerEl.classList.contains('is-open')) close();
    });

    if (typeof subscribe === 'function' && typeof PUB_SUB_EVENTS !== 'undefined') {
      subscribe(PUB_SUB_EVENTS.cartUpdate, function (evt) {
        if (evt && evt.source === 'frido-cart') return;
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
    if (!drawerEl) return;

    portalOverlays();

    moneyFormat = drawerEl.getAttribute('data-money-format') || '${{amount}}';
    labels.submitEdit = drawerEl.getAttribute('data-label-edit') || labels.submitEdit;
    labels.submitAdd = drawerEl.getAttribute('data-label-add') || labels.submitAdd;

    var upsellJson = qs('[data-frido-cart-upsells]');
    if (upsellJson) {
      try {
        upsells = JSON.parse(upsellJson.textContent);
      } catch (e) {
        upsells = [];
      }
    }

    bindEvents();
    refresh();
  }

  window.FridoCart = {
    open: open,
    close: close,
    refresh: refresh,
    addItems: function (items) {
      return cartAdd(items).then(handleCartError).then(refresh).then(open);
    },
    openVariantModal: openVariantModal,
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  document.addEventListener('shopify:section:load', init);
})();
