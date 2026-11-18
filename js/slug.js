/**
 * URL slugs for taxonomy node names, shared by the Map page and the Explorer
 * deep link. Must stay identical to slugify() in src/generate_static_pages.py,
 * which names the /browse/<slug>/ pages: lowercase, "&" becomes " and ",
 * runs of anything but letters and digits become "-", trimmed.
 */
export function slugify(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Slug path for a list of node names, root excluded: ["Power", "Renewables"] -> "power/renewables". */
export function slugPath(names) {
  return (names || []).map(slugify).filter(Boolean).join('/');
}
