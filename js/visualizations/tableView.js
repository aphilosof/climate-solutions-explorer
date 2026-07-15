/**
 * tableView.js
 * "List" view: every listing in the (filtered) hierarchy as a sortable table.
 *
 * Unlike the D3 views this is plain DOM. All cell content is set via
 * textContent (inert - nothing is parsed as HTML) and hrefs go through
 * sanitizeUrl, per the security model in CLAUDE.md.
 */

import { sanitizeUrl } from '../utilities.js';

const COLUMNS = [
  { key: 'title', label: 'Title' },
  { key: 'path', label: 'Category' },
  { key: 'type', label: 'Type' },
  { key: 'author', label: 'Author' },
  { key: 'date', label: 'Date' },
  { key: 'tags', label: 'Tags' },
];

/**
 * Flatten the hierarchy into one row per listing, carrying its taxonomy path.
 *
 * The preprocessed data holds every item TWICE: on the category node's `urls`
 * array and again inside a generated per-item leaf child (see
 * preprocessDataForD3 in utilities.js). Both hold references to the same item
 * object, so an identity set dedupes them - and because the category node is
 * visited first, the kept row carries the correct category path.
 */
function collectRows(node, trail = [], rows = [], seen = new Set()) {
  const name = node.name || node.entity_name || '';
  const here = name ? [...trail, name] : trail;
  const items = node.url_data || node.content || node.urls || node.items || [];
  for (const item of items) {
    if (typeof item !== 'object' || item === null) continue;
    if (seen.has(item)) continue;
    seen.add(item);
    rows.push({
      title: String(item.title || item.name || '(untitled)'),
      url: String(item.url || ''),
      // Skip the root node name in the displayed path
      path: here.slice(1).join(' › '),
      type: String(item.type_ || item.type || item.category || ''),
      author: String(item.author || item.creator || item.source || ''),
      date: String(item.date || ''),
      tags: String(item.tags || item.keywords || ''),
    });
  }
  for (const child of node.children || []) {
    collectRows(child, here, rows, seen);
  }
  return rows;
}

/** MM/DD/YYYY -> sortable number (missing/invalid dates sort last). */
function dateValue(s) {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(String(s).trim());
  if (!m) return -Infinity;
  return Number(m[3]) * 10000 + Number(m[1]) * 100 + Number(m[2]);
}

export function renderTable(data) {
  const container = document.getElementById('visualization');
  d3.select('#visualization').selectAll('*').remove();

  // The list has no drill-down concept
  if (window.resetBreadcrumbs) window.resetBreadcrumbs();

  const rows = collectRows(data);
  let sortKey = 'title';
  let sortAsc = true;

  const wrapper = document.createElement('div');
  wrapper.className = 'table-view';
  wrapper.setAttribute('role', 'region');
  wrapper.setAttribute('aria-label', `List of ${rows.length} climate solution listings`);

  const meta = document.createElement('div');
  meta.className = 'table-view-meta';
  meta.textContent = `${rows.length} listing${rows.length === 1 ? '' : 's'} — click a column header to sort`;
  wrapper.appendChild(meta);

  const scroller = document.createElement('div');
  scroller.className = 'table-view-scroller';
  const table = document.createElement('table');
  table.className = 'listing-table';

  const thead = document.createElement('thead');
  const headRow = document.createElement('tr');
  for (const col of COLUMNS) {
    const th = document.createElement('th');
    th.scope = 'col';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'table-sort-btn';
    btn.dataset.key = col.key;
    btn.textContent = col.label;
    btn.addEventListener('click', () => {
      if (sortKey === col.key) {
        sortAsc = !sortAsc;
      } else {
        sortKey = col.key;
        sortAsc = true;
      }
      renderBody();
    });
    th.appendChild(btn);
    headRow.appendChild(th);
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  table.appendChild(tbody);
  scroller.appendChild(table);
  wrapper.appendChild(scroller);
  container.appendChild(wrapper);

  function renderBody() {
    const sorted = [...rows].sort((a, b) => {
      let cmp;
      if (sortKey === 'date') {
        cmp = dateValue(a.date) - dateValue(b.date);
      } else {
        cmp = a[sortKey].localeCompare(b[sortKey], undefined, { sensitivity: 'base' });
      }
      return sortAsc ? cmp : -cmp;
    });

    // Sort indicators on headers
    thead.querySelectorAll('.table-sort-btn').forEach(b => {
      const active = b.dataset.key === sortKey;
      b.classList.toggle('sorted', active);
      b.setAttribute('aria-sort', active ? (sortAsc ? 'ascending' : 'descending') : 'none');
      b.textContent = COLUMNS.find(c => c.key === b.dataset.key).label
        + (active ? (sortAsc ? ' ▲' : ' ▼') : '');
    });

    tbody.textContent = '';
    const frag = document.createDocumentFragment();
    for (const row of sorted) {
      const tr = document.createElement('tr');

      const tdTitle = document.createElement('td');
      const safeUrl = sanitizeUrl(row.url);
      if (safeUrl && safeUrl !== '#') {
        const a = document.createElement('a');
        a.href = safeUrl;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.textContent = row.title;
        tdTitle.appendChild(a);
      } else {
        tdTitle.textContent = row.title;
      }
      tr.appendChild(tdTitle);

      for (const key of ['path', 'type', 'author', 'date', 'tags']) {
        const td = document.createElement('td');
        td.textContent = row[key];
        td.className = `col-${key}`;
        tr.appendChild(td);
      }
      frag.appendChild(tr);
    }
    tbody.appendChild(frag);
  }

  renderBody();

  // Cleanup: plain DOM, no window listeners or timers to remove
  if (window._tableViewCleanup) window._tableViewCleanup();
  window._tableViewCleanup = () => {};
}
