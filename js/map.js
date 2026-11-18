/**
 * Map page entry point: loads the frozen poster geometry and the live
 * database, attaches today's listings to each poster node, and renders.
 * Deliberately does not import main.js (the Explorer's module throws without
 * the sidebar DOM); the panel, tooltip and sanitizers come from utilities.js.
 */
import { renderPosterMap } from './visualizations/posterMap.js';
import { trackEvent } from './analytics.js';
import { slugify } from './slug.js';

// The Explorer's address; its #node= deep link opens it focused on a category.
const EXPLORER_NODE_URL = '/explorer/#node=';

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
}

/** Walk the live database by each poster node's dbPath and attach its own listings. */
function attachListings(poster, db) {
  const missing = [];
  for (const n of poster.nodes) {
    let cur = n.dbPath ? db : null;
    for (const seg of n.dbPath || []) {
      cur = (cur.children || []).find(c => c.name === seg);
      if (!cur) break;
    }
    if (!cur) {
      n.urls = [];
      if (n.dbPath) missing.push(n.dbPath.join(' > '));
      n.dbPath = null;   // no listings and no Explorer link for a node the database no longer has
    } else {
      n.urls = cur.url_data || [];
    }
  }
  if (missing.length) console.debug('poster nodes whose database path no longer exists:', missing);
}

function showError(container, err) {
  container.innerHTML = '';
  const box = document.createElement('div');
  box.className = 'loading';
  box.textContent = '⚠️ Could not load the map. Please reload the page.';
  container.appendChild(box);
  console.error('Map load failed:', err);
}

document.addEventListener('DOMContentLoaded', async () => {
  const container = document.getElementById('visualization');
  if (!container) return;
  try {
    const [poster, db] = await Promise.all([
      fetchJson('/map/poster.json'),
      fetchJson('/db/latest/CD_Solution_map_2_content.json'),
    ]);
    attachListings(poster, db);
    // The map always opens on the whole poster; drop any hash from older links.
    if (window.location.hash) history.replaceState(null, '', window.location.pathname);
    const map = renderPosterMap(poster, container, {
      explorerBase: EXPLORER_NODE_URL,
      onHeadFit: (n) => trackEvent(`map:branch:${slugify(n.name)}`),
      onCardOpen: (n) => trackEvent(`map:card:${slugify(n.name)}`),
    });
    window.posterMap = map;   // handy for the e2e specs and the console

    const zoomIn = document.getElementById('mapZoomIn');
    const zoomOut = document.getElementById('mapZoomOut');
    const reset = document.getElementById('mapReset');
    if (zoomIn) zoomIn.addEventListener('click', () => map.zoomBy(1.4));
    if (zoomOut) zoomOut.addEventListener('click', () => map.zoomBy(1 / 1.4));
    if (reset) reset.addEventListener('click', () => map.fitAll());

  } catch (err) {
    showError(container, err);
  }
});
