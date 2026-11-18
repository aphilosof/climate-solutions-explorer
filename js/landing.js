// Landing page: old shared links to the Explorer carried their state in the
// hash of the root address (climatesolutionsmap.earth/#viz=treemap&search=...).
// The Explorer now lives at /explorer/, so such links are forwarded there,
// hash intact, before the landing page paints.
(function () {
  var keys = ['viz', 'search', 'type', 'tag', 'author', 'location', 'dateFrom', 'dateTo', 'node'];
  var hash = window.location.hash.slice(1);
  if (!hash) return;
  var params;
  try { params = new URLSearchParams(hash); } catch (e) { return; }
  for (var i = 0; i < keys.length; i++) {
    if (params.has(keys[i])) {
      document.documentElement.className += ' is-forwarding';
      window.location.replace('/explorer/#' + hash);
      return;
    }
  }
})();
