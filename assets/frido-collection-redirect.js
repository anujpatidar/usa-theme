/**
 * Shopify ignores ?filter.p.tag= unless Search & Discovery filters are configured.
 * Redirect to path-based tag URLs: /collections/all/women+shoes
 */
(function () {
  const url = new URL(window.location.href);
  const tagParams = url.searchParams.getAll('filter.p.tag');
  if (!tagParams.length) return;

  const parts = url.pathname.split('/').filter(Boolean);
  if (parts.length > 2) return;

  function handleizeTag(tag) {
    return tag
      .toLowerCase()
      .trim()
      .replace(/['"]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  const handles = tagParams.map(handleizeTag).filter(Boolean);
  if (!handles.length) return;

  url.pathname = url.pathname.replace(/\/$/, '') + '/' + handles.join('+');
  while (url.searchParams.has('filter.p.tag')) {
    url.searchParams.delete('filter.p.tag');
  }

  window.location.replace(url.toString());
})();
