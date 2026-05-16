(function () {
  /** Match Shopify tag handles used in /collections/all/women+shoes URLs */
  function handleizeTag(tag) {
    return tag
      .toLowerCase()
      .trim()
      .replace(/['"]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  function handleSubmit(event) {
    const form = event.target;
    if (!form.classList.contains('frido-shoe-finder__filters')) return;

    event.preventDefault();

    const action = form.getAttribute('action') || '/collections/all';
    const base = new URL(action, window.location.origin);
    const tags = [];

    form.querySelectorAll('.frido-shoe-finder__select').forEach((select) => {
      const tag = select.value.trim();
      if (tag) tags.push(handleizeTag(tag));
    });

    if (tags.length > 0) {
      base.pathname = base.pathname.replace(/\/$/, '') + '/' + tags.join('+');
      base.search = '';
    }

    window.location.assign(base.toString());
  }

  document.addEventListener('submit', handleSubmit);
})();
