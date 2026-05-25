/**
 * Frido header search — predictive dropdown + mobile overlay
 */
(function () {
  var DEBOUNCE_MS = 300;
  var SECTION_ID = 'frido-predictive-search';

  function qs(sel, root) {
    return (root || document).querySelector(sel);
  }

  function qsa(sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  }

  function getPredictiveUrl(term) {
    var base = window.routes && window.routes.predictive_search_url;
    if (!base) return null;
    return base + '?q=' + encodeURIComponent(term) + '&section_id=' + SECTION_ID;
  }

  function initPanel(panel) {
    if (!panel) return;

    var sectionId = panel.getAttribute('data-section-id');
    if (!sectionId) return;

    /* Re-init in theme editor */
    if (panel._fridoSearchDestroy) panel._fridoSearchDestroy();

    /* Portal to body so fixed positioning is not clipped by header overflow */
    if (panel.parentElement !== document.body) {
      document.body.appendChild(panel);
    }

    var panelSelector = '#FridoSearchPanel-' + sectionId;
    var inputs = qsa(
      panelSelector + ' [data-frido-search-input], [aria-controls="FridoSearchPanel-' + sectionId + '"]'
    );
    var idle = qs('[data-frido-search-idle]', panel);
    var resultsWrap = qs('[data-frido-search-results]', panel);
    var loading = qs('[data-frido-search-loading]', panel);
    var backdrop = qs('[data-frido-search-backdrop]', panel);
    var mobileOpen = qs('[data-frido-search-trigger="' + sectionId + '"]');
    var closeBtns = qsa('[data-frido-search-close]', panel);

    var abortController = null;
    var debounceTimer = null;
    var cache = {};
    var isOpen = false;

    function isMobile() {
      return window.matchMedia('(max-width: 989px)').matches;
    }

    function syncInputs(value, source) {
      inputs.forEach(function (input) {
        if (input !== source) input.value = value;
      });
    }

    function updatePanelTop() {
      var siteHeader = qs('.frido-site-header');
      var topPx = 0;
      if (siteHeader) {
        topPx = siteHeader.offsetHeight;
      } else {
        var ann = qs('.frido-announcement-wrap');
        var bar = qs('.frido-header__bar--desktop') || qs('.frido-header__bar--mobile');
        if (ann) topPx += ann.getBoundingClientRect().height;
        if (bar) topPx += bar.getBoundingClientRect().height;
      }
      document.documentElement.style.setProperty('--frido-search-panel-top', topPx + 'px');
    }

    function setAriaExpanded(expanded) {
      if (mobileOpen) mobileOpen.setAttribute('aria-expanded', expanded ? 'true' : 'false');
      inputs.forEach(function (input) {
        input.setAttribute('aria-expanded', expanded ? 'true' : 'false');
      });
    }

    function setOpen(open) {
      if (open) {
        isOpen = true;
        updatePanelTop();
        var bodyClass = isMobile() ? 'frido-search-open' : null;
        var onOpened = function () {
          setAriaExpanded(true);
        };
        if (window.FridoOverlay) {
          FridoOverlay.open(panel, { bodyClass: bodyClass, onOpened: onOpened });
        } else {
          panel.removeAttribute('hidden');
          panel.classList.add('is-open');
          if (bodyClass) document.body.classList.add(bodyClass);
          onOpened();
        }
      } else {
        isOpen = false;
        setAriaExpanded(false);
        var bodyClass = 'frido-search-open';
        if (window.FridoOverlay) {
          FridoOverlay.close(panel, {
            bodyClass: bodyClass,
            keepBodyClassIf: '.frido-search-panel.is-open, .frido-search-panel.is-closing',
          });
        } else {
          panel.classList.remove('is-open');
          document.body.classList.remove(bodyClass);
          window.setTimeout(function () {
            if (!panel.classList.contains('is-open')) panel.setAttribute('hidden', '');
          }, 300);
        }
      }
    }

    function showIdle() {
      if (idle) idle.hidden = false;
      if (resultsWrap) {
        resultsWrap.hidden = true;
        resultsWrap.innerHTML = '';
      }
      if (loading) loading.hidden = true;
    }

    function showLoading() {
      if (loading) loading.hidden = false;
    }

    function showResults(html) {
      if (loading) loading.hidden = true;
      if (idle) idle.hidden = true;
      if (!resultsWrap) return;
      resultsWrap.hidden = false;
      resultsWrap.innerHTML = html;
    }

    function getQuery() {
      for (var i = 0; i < inputs.length; i++) {
        if (inputs[i].value.trim().length) return inputs[i].value.trim();
      }
      return '';
    }

    function fetchResults(term) {
      var url = getPredictiveUrl(term);
      if (!url) {
        showIdle();
        return;
      }

      var key = term.toLowerCase().replace(/\s+/g, '-');
      if (cache[key]) {
        showResults(cache[key]);
        return;
      }

      if (abortController) abortController.abort();
      abortController = new AbortController();

      showLoading();
      if (idle) idle.hidden = true;

      fetch(url, { signal: abortController.signal })
        .then(function (res) {
          if (!res.ok) throw new Error(res.status);
          return res.text();
        })
        .then(function (text) {
          var doc = new DOMParser().parseFromString(text, 'text/html');
          var section = doc.querySelector('#shopify-section-' + SECTION_ID);
          var inner = section && section.querySelector('[data-frido-search-results-inner]');
          var markup = inner
            ? inner.outerHTML
            : '<p class="frido-search-results__empty">No products found.</p>';
          cache[key] = markup;
          showResults(markup);
        })
        .catch(function (err) {
          if (err && err.name === 'AbortError') return;
          showIdle();
        });
    }

    function onInput(e) {
      if (!isOpen) setOpen(true);
      var term = e.target.value.trim();
      syncInputs(term, e.target);

      clearTimeout(debounceTimer);
      if (!term.length) {
        if (abortController) abortController.abort();
        showIdle();
        return;
      }

      debounceTimer = setTimeout(function () {
        fetchResults(term);
      }, DEBOUNCE_MS);
    }

    function openPanel(focusInput) {
      setOpen(true);
      var term = getQuery();
      if (term.length) {
        fetchResults(term);
      } else {
        showIdle();
      }
      if (focusInput) {
        window.setTimeout(function () {
          focusInput.focus();
        }, 50);
      } else if (isMobile()) {
        var mobileInput = qs('.frido-search-panel__mobile-input', panel);
        if (mobileInput) mobileInput.focus();
      }
    }

    function closePanel() {
      setOpen(false);
    }

    function onDocClick(e) {
      if (!isOpen) return;
      if (e.target.closest('[data-frido-search-trigger="' + sectionId + '"]')) return;
      if (e.target.closest('.frido-search__form, .frido-header__search')) return;
      var sheet = qs('.frido-search-panel__sheet', panel);
      if (sheet && sheet.contains(e.target)) return;
      if (e.target === panel || e.target === backdrop) {
        closePanel();
        return;
      }
      if (!isMobile()) {
        closePanel();
        return;
      }
      if (!panel.contains(e.target)) closePanel();
    }

    inputs.forEach(function (input) {
      input.addEventListener('input', onInput);
      input.addEventListener('focus', function () {
        openPanel(input);
      });
      input.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') closePanel();
      });
    });

    if (mobileOpen) {
      mobileOpen.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        if (isOpen) closePanel();
        else openPanel();
      });
    }

    closeBtns.forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        closePanel();
      });
    });

    if (backdrop) {
      backdrop.addEventListener('click', closePanel);
    }

    document.addEventListener('click', onDocClick);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && isOpen) closePanel();
    });

    window.addEventListener('resize', updatePanelTop);

    panel._fridoSearchDestroy = function () {
      document.removeEventListener('click', onDocClick);
      closePanel();
    };
  }

  function boot() {
    qsa('[data-frido-search-panel]').forEach(initPanel);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  document.addEventListener('shopify:section:load', function (e) {
    var panel = e.target.querySelector('[data-frido-search-panel]');
    if (panel) initPanel(panel);
  });
})();
