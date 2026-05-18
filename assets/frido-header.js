/**
 * Frido header — desktop mega menu (hover) + mobile drawer (click)
 */
(function () {
  var DESKTOP_MQ = window.matchMedia('(min-width: 990px)');

  function qsa(sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  }

  function qs(sel, root) {
    return (root || document).querySelector(sel);
  }

  function initAnnouncementRotate() {
    qsa('[data-frido-announcement-rotate]').forEach(function (root) {
      if (root._fridoAnnTimer) {
        clearInterval(root._fridoAnnTimer);
        root._fridoAnnTimer = null;
      }

      var slides = qsa('[data-frido-announcement-slide]', root);
      if (slides.length < 2) return;

      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

      var interval = parseInt(root.getAttribute('data-interval'), 10) || 4000;
      var fade = parseInt(root.getAttribute('data-fade'), 10) || 500;
      root.style.setProperty('--frido-ann-fade', fade + 'ms');

      var index = 0;

      function goTo(nextIndex) {
        if (nextIndex === index) return;
        var next = slides[nextIndex];
        slides[index].classList.remove('is-active');
        setTimeout(function () {
          index = nextIndex;
          next.classList.add('is-active');
        }, fade);
      }

      function tick() {
        goTo((index + 1) % slides.length);
      }

      root._fridoAnnTimer = setInterval(tick, interval);

      if (!root._fridoAnnVisBound) {
        root._fridoAnnVisBound = true;
        document.addEventListener('visibilitychange', function () {
          if (document.hidden) {
            clearInterval(root._fridoAnnTimer);
            root._fridoAnnTimer = null;
          } else if (!root._fridoAnnTimer) {
            root._fridoAnnTimer = setInterval(tick, interval);
          }
        });
      }
    });
  }

  function updateMenuPanelTop() {
    var ann = document.querySelector('.frido-announcement');
    var bar = document.querySelector('.frido-header__bar--mobile');
    if (!ann || !bar) return;
    var top = ann.getBoundingClientRect().height + bar.getBoundingClientRect().height;
    document.documentElement.style.setProperty('--frido-menu-panel-top', top + 'px');
  }

  function setMenuOpen(panel, open) {
    if (!panel) return;
    if (open) updateMenuPanelTop();
    panel.classList.toggle('is-open', open);
    var toggle = document.querySelector('[data-frido-menu-toggle][aria-controls="' + panel.id + '"]');
    if (toggle) toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    document.body.classList.toggle('frido-menu-open', open);
    if (!open) {
      closeMobileSub(panel);
    }
  }

  function closeMobileSub(panel) {
    var root = qs('[data-menu-view="root"]', panel);
    qsa('.frido-mobile-sub.is-active', panel).forEach(function (sub) {
      sub.classList.remove('is-active');
      sub.setAttribute('hidden', '');
    });
    if (root) root.classList.add('is-active');
  }

  function openMobileSub(panel, handle) {
    var root = qs('[data-menu-view="root"]', panel);
    var sub = qs('[data-mobile-sub="' + handle + '"]', panel);
    if (!sub) return;
    if (root) root.classList.remove('is-active');
    qsa('.frido-mobile-sub', panel).forEach(function (el) {
      el.classList.remove('is-active');
      el.setAttribute('hidden', '');
    });
    sub.classList.add('is-active');
    sub.removeAttribute('hidden');
  }

  function initDesktopMega(header) {
    var zone = qs('.frido-header__mega-zone', header);
    if (!zone) return;

    var items = qsa('[data-mega-panel]', header);
    var panels = qsa('.frido-mega', zone);
    var closeTimer;

    function setMegaOpen(panelId) {
      clearTimeout(closeTimer);
      panels.forEach(function (panel) {
        var open = panelId && panel.id === panelId;
        panel.hidden = !open;
        panel.classList.toggle('is-open', open);
      });
      items.forEach(function (item) {
        var isOpen = panelId && item.getAttribute('data-mega-panel') === panelId;
        item.classList.toggle('is-open', isOpen);
        var link = qs('.frido-header__nav-link', item);
        if (link) link.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      });
      zone.classList.toggle('has-open', !!panelId);
    }

    function scheduleClose() {
      closeTimer = window.setTimeout(function () {
        setMegaOpen(null);
      }, 140);
    }

    function bindHover(el) {
      el.addEventListener('mouseenter', function () {
        if (!DESKTOP_MQ.matches) return;
        var id = el.getAttribute('data-mega-panel');
        if (id) setMegaOpen(id);
      });
      el.addEventListener('mouseleave', function () {
        if (!DESKTOP_MQ.matches) return;
        scheduleClose();
      });
      el.addEventListener('focusin', function () {
        if (!DESKTOP_MQ.matches) return;
        var id = el.getAttribute('data-mega-panel');
        if (id) setMegaOpen(id);
      });
    }

    items.forEach(bindHover);
    zone.addEventListener('mouseenter', function () {
      if (!DESKTOP_MQ.matches) return;
      clearTimeout(closeTimer);
    });
    zone.addEventListener('mouseleave', scheduleClose);

    header.addEventListener('focusout', function (e) {
      if (!DESKTOP_MQ.matches) return;
      if (!header.contains(e.relatedTarget)) scheduleClose();
    });

    DESKTOP_MQ.addEventListener('change', function () {
      setMegaOpen(null);
    });
  }

  function init() {
    var header = qs('.frido-header');
    if (!header) return;

    initAnnouncementRotate();
    updateMenuPanelTop();
    initDesktopMega(header);

    document.addEventListener('click', function (e) {
      var t = e.target;

      var openBtn = t.closest && t.closest('[data-frido-menu-toggle]');
      if (openBtn) {
        e.preventDefault();
        var panelId = openBtn.getAttribute('aria-controls');
        var panel = panelId && document.getElementById(panelId);
        var isOpen = panel && panel.classList.contains('is-open');
        qsa('.frido-menu-panel.is-open').forEach(function (p) {
          setMenuOpen(p, false);
        });
        if (panel && !isOpen) setMenuOpen(panel, true);
        return;
      }

      var subOpen = t.closest && t.closest('[data-mobile-open-sub]');
      if (subOpen) {
        e.preventDefault();
        var menuPanel = subOpen.closest('.frido-menu-panel');
        var handle = subOpen.getAttribute('data-mobile-open-sub');
        if (menuPanel && handle) openMobileSub(menuPanel, handle);
        return;
      }

      var backBtn = t.closest && t.closest('[data-mobile-back]');
      if (backBtn) {
        e.preventDefault();
        var menuFromBack = backBtn.closest('.frido-menu-panel');
        if (menuFromBack) closeMobileSub(menuFromBack);
        return;
      }

      if (t.classList && t.classList.contains('frido-menu-panel')) {
        setMenuOpen(t, false);
      }
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        qsa('.frido-menu-panel.is-open').forEach(function (p) {
          setMenuOpen(p, false);
        });
        if (header) {
          qsa('.frido-mega.is-open', header).forEach(function (m) {
            m.hidden = true;
            m.classList.remove('is-open');
          });
          qsa('[data-mega-panel].is-open', header).forEach(function (item) {
            item.classList.remove('is-open');
            var link = qs('.frido-header__nav-link', item);
            if (link) link.setAttribute('aria-expanded', 'false');
          });
          var zone = qs('.frido-header__mega-zone', header);
          if (zone) zone.classList.remove('has-open');
        }
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  document.addEventListener('shopify:section:load', function () {
    initAnnouncementRotate();
    updateMenuPanelTop();
  });

  window.addEventListener('resize', updateMenuPanelTop);
  window.addEventListener('orientationchange', updateMenuPanelTop);
})();
