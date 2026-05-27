(function () {
  function updateProgress(track, fill) {
    const panels = track.querySelectorAll('[data-frido-fit-panel]');
    const count = panels.length;
    if (!count) return;

    const panelWidth = track.clientWidth || 1;
    const index = Math.min(
      count - 1,
      Math.max(0, Math.round(track.scrollLeft / panelWidth))
    );
    fill.style.width = ((index + 1) / count) * 100 + '%';
  }

  function initCompare(root) {
    const track = root.querySelector('[data-frido-fit-track]');
    const fill = root.querySelector('[data-frido-fit-progress-fill]');
    if (!track || !fill) return;

    const onScroll = () => updateProgress(track, fill);
    track.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    onScroll();
  }

  function boot() {
    document.querySelectorAll('[data-frido-fit-compare]').forEach(initCompare);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  document.addEventListener('shopify:section:load', (event) => {
    const root = event.target.querySelector('[data-frido-fit-compare]');
    if (root) initCompare(root);
  });
})();
