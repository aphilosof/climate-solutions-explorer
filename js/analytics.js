/**
 * analytics.js
 * Thin wrapper around GoatCounter (cookieless, no personal data, no consent
 * banner required). The counting script is self-hosted at js/vendor/count.js
 * and skips localhost automatically, so development and the e2e suite never
 * produce analytics traffic.
 *
 * Events are recorded as synthetic pageview paths, GoatCounter's convention
 * for custom events. Everything here is fire-and-forget: analytics being
 * blocked or absent must never affect the app.
 */

/** Record a custom event (e.g. 'viz:treemap', 'search:solar', 'panel-open'). */
export function trackEvent(path) {
  try {
    if (window.goatcounter && typeof window.goatcounter.count === 'function') {
      window.goatcounter.count({ path: String(path).slice(0, 100), event: true });
    }
  } catch (e) {
    // Analytics must never break the app
  }
}

let lastSearchTracked = '';

/** Track a search once it settles (called from the debounced search handler). */
export function trackSearch(query) {
  const q = String(query || '').trim().toLowerCase();
  if (q.length < 3 || q === lastSearchTracked) return;
  lastSearchTracked = q;
  trackEvent(`search:${q.slice(0, 60)}`);
}
