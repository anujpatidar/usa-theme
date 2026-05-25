(function () {
  var BODY_CLASS = 'frido-account-drawer-open';
  var KEEP_OPEN = '.frido-account-drawer.is-open, .frido-account-drawer.is-closing';

  function qs(sel, root) {
    return (root || document).querySelector(sel);
  }

  function qsa(sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  }

  function setTriggers(sectionId, expanded) {
    qsa('[data-frido-account-drawer-open="' + sectionId + '"]').forEach(function (btn) {
      btn.setAttribute('aria-expanded', expanded ? 'true' : 'false');
    });
  }

  function openDrawer(drawer) {
    if (!drawer || drawer.classList.contains('is-open')) return;
    var sectionId = drawer.id.replace('frido-account-', '');

    function onOpened() {
      var panel = qs('.frido-account-drawer__panel', drawer);
      if (panel) panel.focus();
      setTriggers(sectionId, true);
    }

    if (window.FridoOverlay) {
      FridoOverlay.open(drawer, { bodyClass: BODY_CLASS, onOpened: onOpened });
    } else {
      drawer.removeAttribute('hidden');
      drawer.setAttribute('aria-hidden', 'false');
      drawer.classList.add('is-open');
      document.body.classList.add(BODY_CLASS);
      onOpened();
    }
  }

  function closeDrawer(drawer) {
    if (!drawer) return;
    if (!drawer.classList.contains('is-open') && !drawer.classList.contains('is-closing')) return;

    var sectionId = drawer.id.replace('frido-account-', '');

    function onClosed() {
      setTriggers(sectionId, false);
    }

    if (window.FridoOverlay) {
      FridoOverlay.close(drawer, {
        bodyClass: BODY_CLASS,
        keepBodyClassIf: KEEP_OPEN,
        onClosed: onClosed,
      });
    } else {
      drawer.classList.remove('is-open');
      drawer.setAttribute('aria-hidden', 'true');
      drawer.setAttribute('hidden', '');
      if (!document.querySelector('.frido-account-drawer.is-open')) {
        document.body.classList.remove(BODY_CLASS);
      }
      onClosed();
    }
  }

  function closeAll() {
    qsa('.frido-account-drawer.is-open').forEach(closeDrawer);
  }

  function setAccountTab(drawer, tabName) {
    if (!drawer) return;
    qsa('[data-frido-account-tab]', drawer).forEach(function (tab) {
      var active = tab.getAttribute('data-frido-account-tab') === tabName;
      tab.classList.toggle('is-active', active);
      tab.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    qsa('[data-frido-account-panel]', drawer).forEach(function (panel) {
      var active = panel.getAttribute('data-frido-account-panel') === tabName;
      panel.classList.toggle('is-active', active);
      panel.hidden = !active;
    });
  }

  function setAccountView(drawer, viewName) {
    if (!drawer) return;
    qsa('[data-frido-account-view]', drawer).forEach(function (view) {
      var active = view.getAttribute('data-frido-account-view') === viewName;
      view.hidden = !active;
    });
    if (viewName === 'auth') {
      setAccountTab(drawer, 'login');
    }
  }

  function bindDrawer(drawer) {
    if (drawer.dataset.fridoAccountDrawerBound) return;
    drawer.dataset.fridoAccountDrawerBound = '1';

    var sectionId = drawer.id.replace('frido-account-', '');

    qsa('[data-frido-account-drawer-open="' + sectionId + '"]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        openDrawer(drawer);
      });
    });

    qsa('[data-frido-account-tab]', drawer).forEach(function (tab) {
      tab.addEventListener('click', function () {
        setAccountTab(drawer, tab.getAttribute('data-frido-account-tab'));
      });
    });

    qsa('[data-frido-account-show]', drawer).forEach(function (btn) {
      btn.addEventListener('click', function () {
        setAccountView(drawer, btn.getAttribute('data-frido-account-show'));
      });
    });
  }

  function init() {
    qsa('[data-frido-account-drawer]').forEach(bindDrawer);

    var params = new URLSearchParams(window.location.search);
    if (params.get('account_drawer') === 'open') {
      var drawer = qs('[data-frido-account-drawer]');
      if (drawer) {
        openDrawer(drawer);
        var tab = params.get('account_tab');
        if (tab === 'register') setAccountTab(drawer, 'register');
      }
    }
  }

  document.addEventListener('click', function (e) {
    var closeEl = e.target.closest('[data-frido-account-drawer-close]');
    if (closeEl) {
      var drawer = closeEl.closest('[data-frido-account-drawer]');
      if (drawer) closeDrawer(drawer);
    }
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeAll();
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  document.addEventListener('shopify:section:load', init);
})();
