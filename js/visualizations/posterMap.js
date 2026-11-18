/**
 * Poster map: the printed Climate Drift solutions poster, drawn one to one.
 *
 * Geometry comes frozen from map/poster.json (extracted once from the PDF by
 * src/extract_poster_map.py): every label box, anchor, knob and link endpoint
 * is the poster's own, in PDF points, so the map IS the poster. Only the
 * colors (the Explorer's palette), the font and the dark background differ.
 * Listings are attached by js/map.js from the live database before render.
 *
 * Follows the module pattern of the other views: one render function, a
 * debounced resize handler, and a cleanup on window._posterMapCleanup.
 */
import { categoryColors, categoryIcons } from './shared.js';
import { sanitizeText } from '../utilities.js';
import { slugPath } from '../slug.js';

// Poster units: 1 unit = 1 CSS px at zoom 1. A 7-unit system font matches the
// poster's Avenir 7.73 pt label widths (median ratio 1.00 measured in Chrome).
const LABEL_FONT = 7;
const LABEL_LINE_DY = 9.76;    // the poster's wrapped-line pitch
const LABEL_BASELINE = 7.4;    // first baseline below the label box top
const KNOB_R = 3.25;
const DOT_R = 2;               // leaf-with-listings marker
const DOT_MIN_PX = 1.8;
const CARD_W = 280;            // summary card width (desktop)
const CARD_GAP = 16;           // card to label gap, on screen
const HOVER_PAD_PX = 7;        // pointer slack around a label, on screen
const LINE_PAD_PX = 6;         // pointer slack around a line, on screen
const LINK_SAMPLES = 16;       // straight segments per curve for the line hit test
const STUB_GAP = 6.3;          // label edge -> stub start, as printed
const LINK_GAP = 6.2;          // link end -> label edge, as printed
const LINK_WIDTH = 1.4;        // close to the printed 1.63 pt, a touch lighter on dark
const FIT_PADDING = 40;
const PHONE_MAX = 768;
// Zoomed out, labels are "greeked" into short lines of their own width (the
// structure stays connected) and cross-fade into text as they reach a
// readable size. Text may grow up to LABEL_BOOST_MAX while zoomed out, as far
// as the printed slack between a label and its stub allows.
const LABEL_TARGET_PX = 8;
const LABEL_BOOST_MAX = 1.25;
const LABEL_SLACK = 12;        // units between a label's edge and its knob
const GREEK_FADE = [3, 5.5];   // on-screen font px: fully greeked below, fully text above
// The twelve branch heads, the center and the strokes keep a minimum on-screen size.
const HEAD_MIN_PX = 13;
const HEAD_MIN_PX_PHONE = 10;
const HEAD_SCALE = 1.3;
const HEAD_ICON_SCALE = 1.05;   // emoji size relative to the head label        // heads are this much larger than labels when zoomed in
const LINK_MIN_PX = 1.1;
const KNOB_MIN_PX = 1.2;
const HIT_MIN_PX = 14;         // hover/tap target height on screen
// The poster's center: two 10.6 pt lines with the Climate Drift mark above them.
const CENTER_FONT = 11;
const CENTER_LINE_DY = 13.4;
const CENTER_FADE = [5, 8];    // on-screen font px: text and box hidden below, fully shown above
const CENTER_MARK_MIN_PX = 20; // the mark never renders smaller than this
const CENTER_PAD = 6;
const CENTER_ICON = [1198.7, 1623.4, 1225.1, 1649.9];   // the mark's box on the poster

// Poster heads that are not Explorer categories take the color of the
// category their nodes live under in the database. The poster also hangs
// Fuels & Chemicals under Industry; it keeps its own Explorer color so the
// same node is the same color on both pages.
const HEAD_COLOR_FALLBACK = { software: 'climate intelligence', workforce: 'buildings' };
const SUBHEAD_COLORS = [{ prefix: ['industry', 'fuels & chemicals'], key: 'fuels & chemicals' }];

export function renderPosterMap(poster, container, options = {}) {
  const explorerBase = options.explorerBase || '/#node=';
  const onHeadFit = options.onHeadFit || (() => {});
  const onCardOpen = options.onCardOpen || (() => {});

  // ---- data: parents, children, paths, colors, panel nodes ---------------
  const nodes = poster.nodes;
  const byId = new Map(nodes.map(n => [n.id, n]));
  const centerD = { data: { name: 'Climate Solutions' }, depth: 0, parent: null };
  nodes.forEach(n => { n.children = []; n.urls = n.urls || []; });
  nodes.forEach(n => {
    n.parentNode = n.parent === 'center' ? null : byId.get(n.parent);
    if (n.parentNode) n.parentNode.children.push(n);
  });
  nodes.forEach(n => {
    const names = [];
    for (let c = n; c; c = c.parentNode) names.unshift(c.name);
    n.pathNames = names;
    n.color = categoryColors[colorKey(n)] || '#0096c7';
    n.d = { data: { name: n.name, urls: n.urls }, depth: n.depth };
  });
  nodes.forEach(n => { n.d.parent = n.parentNode ? n.parentNode.d : centerD; });
  const heads = nodes.filter(n => n.depth === 1);
  heads.forEach(function count(n) {
    n.subtreeListings = n.urls.length + n.children.reduce((s, c) => s + count(c), 0);
    return n.subtreeListings;
  });

  function colorKey(n) {
    const lower = n.pathNames.map(s => s.toLowerCase().trim());
    for (const sub of SUBHEAD_COLORS) {
      if (sub.prefix.every((p, i) => lower[i] === p)) return sub.key;
    }
    return HEAD_COLOR_FALLBACK[lower[0]] || lower[0];
  }

  // ---- svg ----------------------------------------------------------------
  container.innerHTML = '';
  let W = container.clientWidth || 800;
  let H = container.clientHeight || 600;
  const svg = d3.select(container).append('svg')
    .attr('class', 'poster-map')
    .attr('width', W).attr('height', H)
    .attr('role', 'img')
    .attr('tabindex', 0)
    .attr('aria-label', `Climate Drift solutions map: ${nodes.length} categories in ${heads.length} branches, as on the printed poster. Scroll or pinch to zoom, drag to pan, click a branch to zoom into it, click a category to see its listings.`);
  const root = svg.append('g').attr('class', 'map-root');
  const linkLayer = root.append('g').attr('class', 'map-links');
  const centerLayer = root.append('g').attr('class', 'map-center-layer');
  const nodeLayer = root.append('g').attr('class', 'map-nodes');

  // links: the poster's own bezier between the poster's own endpoints
  const linkSel = linkLayer.selectAll('path.map-link').data(poster.links).join('path')
    .attr('class', 'map-link')
    .attr('stroke', l => byId.get(l.child).color)
    .attr('d', l => {
      const child = byId.get(l.child);
      const [x0, y0] = l.from;
      let [x1, y1] = l.to;
      // A few printed labels carry a small icon the link stops short of; the
      // map has no icon there, so the link runs to the label like all others.
      if (Math.abs(child.anchor[0] - x1) > LINK_GAP + 3) {
        x1 = child.anchor[0] + (child.side === 'right' ? -LINK_GAP : LINK_GAP);
        y1 = child.anchor[1];
      }
      const dx = x1 - x0, dy = y1 - y0;
      const c1 = [x0 + 0.24 * dx, y0 + 0.667 * dy], c2 = [x0 + 0.567 * dx, y1];
      // sample the curve once for the pointer hit test (hovering a line = hovering its category)
      l.samples = [];
      for (let i = 0; i <= LINK_SAMPLES; i++) {
        const u = i / LINK_SAMPLES, v = 1 - u;
        l.samples.push([
          v * v * v * x0 + 3 * v * v * u * c1[0] + 3 * v * u * u * c2[0] + u * u * u * x1,
          v * v * v * y0 + 3 * v * v * u * c1[1] + 3 * v * u * u * c2[1] + u * u * u * y1,
        ]);
      }
      return `M${x0},${y0}C${c1[0]},${c1[1]} ${c2[0]},${c2[1]} ${x1},${y1}`;
    });
  const linkByChild = new Map();
  linkSel.each(function(l) { linkByChild.set(l.child, d3.select(this)); });

  // stubs + knobs at every junction (nodes with children)
  const junctions = nodes.filter(n => n.knob);
  linkLayer.selectAll('line.map-stub').data(junctions).join('line')
    .attr('class', 'map-stub')
    .attr('stroke', n => n.color)
    .attr('x1', n => n.side === 'right' ? n.box[2] + STUB_GAP : n.box[0] - STUB_GAP)
    .attr('y1', n => n.knob[1])
    .attr('x2', n => n.knob[0]).attr('y2', n => n.knob[1]);
  const knobSel = linkLayer.selectAll('circle.map-knob').data(junctions).join('circle')
    .attr('class', 'map-knob')
    .attr('cx', n => n.knob[0]).attr('cy', n => n.knob[1]).attr('r', KNOB_R)
    .attr('stroke', n => n.color)
    .attr('fill', n => n.urls.length ? n.color : '#1c3739');   // hollow: the page's Deep teal

  // center: the poster's two lines with the Climate Drift mark above them, in
  // a small box the twelve branch links attach to. Counter-scaled as one group
  // while zoomed out; at the poster's own scale it sits exactly where printed.
  const cb = poster.center.box;
  const headStarts = poster.links.filter(l => l.parent === 'center').map(p => [p.from[0], p.from[1], p.from[0], p.from[1]]);
  const centerBox = unionBox([cb, CENTER_ICON].concat(headStarts));
  const ccx = (centerBox[0] + centerBox[2]) / 2, ccy = (centerBox[1] + centerBox[3]) / 2;
  const centerG = centerLayer.append('g').attr('class', 'map-center')
    .attr('transform', `translate(${ccx},${ccy})`);
  // Box and text sit at the poster's own size and fade in with zoom, like the
  // labels; the mark alone keeps a minimum on-screen size as the hub.
  const centerBoxSel = centerG.append('rect').attr('class', 'map-center-box')
    .attr('x', centerBox[0] - ccx - CENTER_PAD).attr('y', centerBox[1] - ccy - CENTER_PAD)
    .attr('width', centerBox[2] - centerBox[0] + 2 * CENTER_PAD)
    .attr('height', centerBox[3] - centerBox[1] + 2 * CENTER_PAD)
    .attr('rx', 0);
  const markW = CENTER_ICON[2] - CENTER_ICON[0], markH = CENTER_ICON[3] - CENTER_ICON[1];
  const markCx = (CENTER_ICON[0] + CENTER_ICON[2]) / 2 - ccx, markCy = (CENTER_ICON[1] + CENTER_ICON[3]) / 2 - ccy;
  const markSel = centerG.append('image').attr('class', 'map-center-mark')
    .attr('href', '/cd_logo_crop_green.png')
    .attr('x', -markW / 2).attr('y', -markH / 2).attr('width', markW).attr('height', markH)
    .attr('preserveAspectRatio', 'xMidYMid meet');
  const centerTextSel = centerG.append('text').attr('class', 'map-center-label').attr('text-anchor', 'middle');
  centerTextSel.selectAll('tspan').data(poster.center.lines).join('tspan')
    .attr('x', 0).attr('y', (d, i) => cb[1] - ccy + CENTER_FONT + i * CENTER_LINE_DY).text(d => d);
  function placeCenter(k) {
    const s = Math.max(1, CENTER_MARK_MIN_PX / (k * markW));
    markSel.attr('transform', `translate(${markCx},${markCy}) scale(${s})`);
    const fontPx = CENTER_FONT * k;
    const op = Math.max(0, Math.min(1, (fontPx - CENTER_FADE[0]) / (CENTER_FADE[1] - CENTER_FADE[0])));
    centerTextSel.style('opacity', op);
    centerBoxSel.style('opacity', op);
  }

  // nodes
  const nodeSel = nodeLayer.selectAll('g.map-node').data(nodes).join('g')
    .attr('class', n => 'map-node' + (n.depth === 1 ? ' map-head' : '') +
      (!n.children.length && !n.urls.length ? ' is-leaf-empty' : ''))
    .attr('data-depth', n => n.depth)
    .attr('data-id', n => n.id);
  const nodeEl = new Map();
  nodeSel.each(function(n) { nodeEl.set(n.id, d3.select(this)); });
  // Labels sit on the poster's own baseline at the poster's own size; only
  // the branch heads are counter-scaled while zoomed out (a CSS variable set
  // in the zoom handler).
  const labelSel = nodeSel.append('text').attr('class', 'map-label')
    .attr('text-anchor', n => n.side === 'right' ? 'start' : 'end')
    .attr('y', n => n.box[1] + LABEL_BASELINE);
  labelSel.each(function(n) {
    const t = d3.select(this);
    const lines = n.depth === 1 ? [n.name] : n.lines;
    lines.forEach((line, i) => {
      t.append('tspan').attr('x', n.anchor[0]).attr('dy', i === 0 ? 0 : LABEL_LINE_DY).text(line);
    });
    // how much this label may grow before it reaches its stub
    n.maxBoost = Math.min(LABEL_BOOST_MAX, 1 + LABEL_SLACK / Math.max(20, n.box[2] - n.box[0]));
  });
  const bodyLabels = labelSel.filter(n => n.depth > 1);
  // greeked labels: while text is too small to read, each label is a stroke in
  // its branch color from the incoming link's end to its own stub (or edge),
  // so a zoomed-out chain reads as one continuous line
  nodeSel.filter(n => n.depth > 1).append('line').attr('class', 'map-greek')
    .attr('stroke', n => n.color)
    .attr('x1', n => n.anchor[0] + (n.side === 'right' ? -LINK_GAP : LINK_GAP))
    .attr('x2', n => n.side === 'right'
      ? n.box[2] + (n.knob ? STUB_GAP : 1.5)
      : n.box[0] - (n.knob ? STUB_GAP : 1.5))
    .attr('y1', n => n.anchor[1]).attr('y2', n => n.anchor[1]);
  // a filled dot marks a leaf that has listings (junctions show that on their knob)
  const dotSel = nodeSel.filter(n => n.urls.length && !n.knob).append('circle').attr('class', 'map-dot')
    .attr('cx', n => n.side === 'right' ? n.box[2] + 4.5 : n.box[0] - 4.5)
    .attr('cy', n => n.anchor[1]).attr('r', DOT_R).attr('fill', n => n.color);
  // branch heads: the emoji sits centered under the name (placed in the zoom
  // handler, since the head is counter-scaled and its width changes with zoom)
  const headIconSel = nodeSel.filter(n => n.depth === 1).append('text').attr('class', 'map-head-icon')
    .attr('text-anchor', 'middle')
    .text(n => categoryIcons[colorKey(n)] || '');
  // widest head label at 7 units, scaled later to the on-screen minimum (phone fit padding)
  const headLabelSel = labelSel.filter(n => n.depth === 1);
  const headLabelUnits7 = Math.max(...headLabelSel.nodes().map(t => t.getComputedTextLength()));

  // keep the poster's geometry under a different font: squeeze only labels that overrun their box
  bodyLabels.selectAll('tspan').each(function() {
    const n = d3.select(this.parentNode).datum();
    const boxW = n.box[2] - n.box[0];
    const w = this.getComputedTextLength();
    if (w > boxW * 1.05) {
      this.setAttribute('textLength', boxW);
      this.setAttribute('lengthAdjust', 'spacingAndGlyphs');
      n.maxBoost = 1;
    }
  });

  // ---- zoom, fit, focus ---------------------------------------------------
  const allBox = unionBox(nodes.map(n => n.box).concat([cb]));
  // phones fit the head anchors (labels are counter-scaled, so their width is padded on screen)
  const headsBox = unionBox(heads.map(n => [n.anchor[0], n.box[1], n.anchor[0], n.box[3]]).concat([cb]));
  let currentFocus = null;
  let userZoomed = false;
  let headMinPx = HEAD_MIN_PX;
  let lastBoost = -1;
  const hint = document.getElementById('mapHint');

  const zoom = d3.zoom().scaleExtent([0.05, 10]).on('zoom', (event) => {
    const t = event.transform;
    const k = t.k;
    root.attr('transform', t);
    // label size: the printed size, grown a little while zoomed out, as far as the slack allows
    const boost = Math.min(LABEL_BOOST_MAX, Math.max(1, LABEL_TARGET_PX / (k * LABEL_FONT)));
    if (boost !== lastBoost) {
      lastBoost = boost;
      bodyLabels.attr('font-size', n => LABEL_FONT * Math.min(boost, n.maxBoost));
    }
    // text or greeked line, by on-screen size
    const fontPx = LABEL_FONT * boost * k;
    const textOp = Math.max(0, Math.min(1, (fontPx - GREEK_FADE[0]) / (GREEK_FADE[1] - GREEK_FADE[0])));
    // counter-scaling: a handful of variables, not 500 element writes
    const headFs = Math.max(LABEL_FONT * HEAD_SCALE, headMinPx / k);
    root.style('--head-fs', `${headFs}px`)
      .style('--link-w', `${Math.max(LINK_WIDTH, LINK_MIN_PX / k)}`)
      .style('--text-op', textOp)
      .style('--greek-op', (1 - textOp) * 0.85);
    knobSel.attr('r', Math.max(KNOB_R, KNOB_MIN_PX / k));
    dotSel.attr('r', Math.max(DOT_R, DOT_MIN_PX / k));
    // counter-scaled heads: remember their rendered box for the pointer hit test
    const iconFs = headFs * HEAD_ICON_SCALE;
    headLabelSel.each(function(n) {
      const b = this.getBBox();
      const cx = b.x + b.width / 2, top = b.y + b.height + headFs * 0.08;
      n.iconPos = [cx, top + iconFs * 0.9];
      // the emoji under the name belongs to the head for hover and click
      n.hitBox = [Math.min(b.x, cx - iconFs * 0.6), b.y, Math.max(b.x + b.width, cx + iconFs * 0.6), top + iconFs * 1.1];
    });
    headIconSel.attr('x', n => n.iconPos[0]).attr('y', n => n.iconPos[1]).attr('font-size', iconFs);
    placeCenter(k);
    positionCard();
    if (event.sourceEvent) {
      userZoomed = true;
      if (hint) hint.hidden = true;
    }
  });
  svg.call(zoom);

  function unionBox(boxes) {
    return boxes.reduce((a, b) => [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[2], b[2]), Math.max(a[3], b[3])]);
  }
  function subtreeBox(n) {
    const boxes = [];
    (function walk(m) { boxes.push(m.box); if (m.knob) boxes.push([m.knob[0] - 4, m.knob[1] - 4, m.knob[0] + 4, m.knob[1] + 4]); m.children.forEach(walk); })(n);
    return unionBox(boxes);
  }
  /** Fit a box (poster units) into the viewport minus screen insets {l, r, t, b} (px). */
  function fitBox(box, animate = true, pad = FIT_PADDING, insets = {}) {
    const l = insets.l || 0, r = insets.r || 0, tp = insets.t || 0, b = insets.b || 0;
    const availW = Math.max(120, W - l - r), availH = Math.max(120, H - tp - b);
    const k = Math.min(availW / (box[2] - box[0] + 2 * pad), availH / (box[3] - box[1] + 2 * pad));
    const cx = (l + W - r) / 2, cy = (tp + H - b) / 2;   // middle of the free area, even when clamped
    const t = d3.zoomIdentity.translate(cx - k * (box[0] + box[2]) / 2, cy - k * (box[1] + box[3]) / 2).scale(k);
    zoom.scaleExtent([Math.min(k, fitScale()) * 0.9, 10]);
    (animate ? svg.transition().duration(600) : svg).call(zoom.transform, t);
  }
  function fitScale() {
    return Math.min(W / (allBox[2] - allBox[0] + 2 * FIT_PADDING), H / (allBox[3] - allBox[1] + 2 * FIT_PADDING));
  }
  function inSubtree(m, n) {
    for (let c = m; c; c = c.parentNode) if (c === n) return true;
    return false;
  }
  function setFocus(n) {
    currentFocus = n;
    root.classed('has-focus', !!n);
    nodeSel.classed('is-dim', m => !!n && !inSubtree(m, n));
    linkSel.classed('is-dim', l => !!n && !inSubtree(byId.get(l.child), n));
    // The map always opens on the whole poster (Alon, 2026-10-15), so the
    // focus is deliberately not written into the address.
  }
  function fitNode(n, animate = true) {
    fitBox(subtreeBox(n), animate, FIT_PADDING, cardInsets(n));
    setFocus(n);
    if (n.depth === 1) onHeadFit(n);
  }
  function fitAll(animate = true) {
    const phone = W < PHONE_MAX;
    headMinPx = phone ? HEAD_MIN_PX_PHONE : HEAD_MIN_PX;
    const headLabelPx = headLabelUnits7 * headMinPx / LABEL_FONT;
    const side = phone ? headLabelPx + 8 : 0;
    closeCard();
    fitBox(phone ? headsBox : allBox, animate, FIT_PADDING, { l: side, r: side });
    setFocus(null);
    if (hint) hint.hidden = !phone || userZoomed;
  }
  /**
   * The one click action: zoom to a category and open its summary card. A
   * category with nothing below it keeps the zoom (fitting its parent first if
   * it is too small to read) and just opens its card.
   */
  function focusNode(n, animate = true) {
    if (n.children.length) {
      fitNode(n, animate);
    } else {
      const t = d3.zoomTransform(svg.node());
      const [sx, sy] = t.apply([n.anchor[0], n.anchor[1]]);
      const offscreen = sx < 0 || sx > W || sy < 0 || sy > H;
      if ((t.k < 1 || offscreen) && n.parentNode) fitNode(n.parentNode, animate);
      else if (!n.parentNode) fitNode(n, animate);
    }
    openCard(n);
  }

  // ---- tooltip, hover, click ----------------------------------------------
  // On the map the tooltip is information only: it never takes the pointer and
  // sits below-right of the cursor, away from the label being read. (A tooltip
  // that could take the pointer slid under the cursor while it moved along a
  // label, and the hover dropped.)
  const tooltip = d3.select('#tooltip')
    .style('pointer-events', 'none')
    .style('transition', 'opacity 0.15s');
  const touchOnly = window.matchMedia('(hover: none)').matches;
  let hideTimer = null;

  // ---- summary card ---------------------------------------------------------
  // The Map's own, deliberately small panel: what a category is, where it sits,
  // how much is listed under it, its sub-categories, and the way into the
  // Explorer. Reading the listings themselves happens in the Explorer.
  // Built with DOM text nodes only (no HTML from data).
  const card = document.createElement('div');
  card.className = 'map-card';
  card.id = 'mapCard';
  card.setAttribute('role', 'dialog');
  card.setAttribute('aria-label', 'Category summary');
  card.hidden = true;
  container.appendChild(card);
  let cardNode = null;
  const isPhone = () => W < PHONE_MAX;
  const plural = (c) => `${c} listing${c === 1 ? '' : 's'}`;

  /** Screen insets that keep the fitted subtree clear of the card. */
  function cardInsets(n) {
    if (isPhone()) return { b: Math.round(H * 0.42) };
    const room = CARD_W + 2 * CARD_GAP;
    return n.side === 'right' ? { l: room } : { r: room };
  }
  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function openCard(n) {
    cardNode = n;
    nodeSel.classed('is-selected', m => m === n);
    card.replaceChildren();
    card.style.setProperty('--branch', n.color);
    card.classList.toggle('is-sheet', isPhone());

    const close = el('button', 'map-card-close', '×');
    close.setAttribute('aria-label', 'Close');
    close.addEventListener('click', closeCard);
    const icon = n.depth === 1 ? (categoryIcons[colorKey(n)] || '') + ' ' : '';
    card.append(close, el('h3', 'map-card-title', icon + n.lines.join(' ')));
    // where it sits: each step is a way back up (the map has no breadcrumb bar)
    if (n.parentNode) {
      const path = el('div', 'map-card-path');
      const up = [];
      for (let c = n.parentNode; c; c = c.parentNode) up.unshift(c);
      up.forEach((a, i) => {
        if (i) path.append(el('span', 'map-card-sep', ' › '));
        const step = el('button', 'map-card-step', a.lines.join(' '));
        step.title = `Zoom out to ${a.name}`;
        step.addEventListener('click', () => focusNode(a));
        path.append(step);
      });
      card.append(path);
    }

    const own = n.urls.length, total = n.subtreeListings || 0;
    let count;
    if (!total) count = 'No listings yet';
    else if (!n.children.length) count = plural(total);
    else count = `${plural(total)} in this branch` + (own ? `, ${own} filed here` : '');
    card.append(el('div', 'map-card-count', count));

    if (n.children.length) {
      const chips = el('div', 'map-card-chips');
      n.children.forEach(c => {
        const chip = el('button', 'map-card-chip', c.lines.join(' '));
        if (!c.subtreeListings) chip.classList.add('is-empty');
        chip.addEventListener('click', () => focusNode(c));
        chips.append(chip);
      });
      card.append(chips);
    }
    if (n.dbPath && total) {
      const cta = el('a', 'map-card-cta', 'Open in the Explorer →');
      cta.href = explorerBase + slugPath(n.dbPath);   // slug characters only
      card.append(cta);
    }
    card.hidden = false;
    if (hint) hint.hidden = true;
    document.body.classList.toggle('map-sheet-open', isPhone());
    setHover(null);
    positionCard();
    onCardOpen(n);
  }
  function closeCard() {
    if (!cardNode) return;
    cardNode = null;
    card.hidden = true;
    document.body.classList.remove('map-sheet-open');
    nodeSel.classed('is-selected', false);
  }
  /** Keep the card beside its category (desktop) or docked at the bottom (phone). */
  function positionCard() {
    if (!cardNode || card.hidden) return;
    if (isPhone()) {
      card.style.left = card.style.top = '';
      card.style.visibility = 'visible';
      return;
    }
    const t = d3.zoomTransform(svg.node());
    const b = cardNode.hitBox || cardNode.box;
    const x0 = t.applyX(b[0]), x1 = t.applyX(b[2]);
    const cy = t.applyY((b[1] + b[3]) / 2);
    const w = card.offsetWidth || CARD_W, h = card.offsetHeight || 160;
    // toward the parent first (that side is clear after a fit), else the other side
    let left = cardNode.side === 'right' ? x0 - CARD_GAP - w : x1 + CARD_GAP;
    if (left < 8 || left + w > W - 8) left = cardNode.side === 'right' ? x1 + CARD_GAP : x0 - CARD_GAP - w;
    left = Math.max(8, Math.min(W - w - 8, left));
    const top = Math.max(8, Math.min(H - h - 8, cy - h / 2));
    card.style.left = `${left}px`;
    card.style.top = `${top}px`;
    card.style.visibility = (cy < -20 || cy > H + 20 || x1 < -20 || x0 > W + 20) ? 'hidden' : 'visible';
  }
  const onKey = (event) => { if (event.key === 'Escape') closeCard(); };
  document.addEventListener('keydown', onKey);

  function highlight(n, on) {
    for (let c = n; c; c = c.parentNode) {
      const l = linkByChild.get(c.id);
      if (l) l.classed('is-hot', on);
    }
  }
  function tooltipHtml(n) {
    const path = n.pathNames.slice(0, -1).join(' › ');
    const total = n.subtreeListings || 0;
    const what = !total ? 'no listings yet' : n.children.length ? `${plural(total)} in this branch` : plural(total);
    const hint = `${what} · click for details`;
    return `<div class="tooltip-name">${sanitizeText(n.name)}</div>` +
      `<div class="tooltip-details">${path ? sanitizeText(path) + '<br>' : ''}${hint}</div>`;
  }
  function place(event) {
    const el = tooltip.node();
    const w = el.offsetWidth || 220, h = el.offsetHeight || 60;
    let x = event.clientX + 16, y = event.clientY + 20;
    if (x + w > window.innerWidth - 8) x = event.clientX - 16 - w;     // flip left near the right edge
    if (y + h > window.innerHeight - 8) y = event.clientY - 20 - h;    // flip up near the bottom
    tooltip.style('left', (x + window.scrollX) + 'px').style('top', (y + window.scrollY) + 'px');
  }

  // ---- pointer: one hit test in poster units ------------------------------
  // The node under the pointer is found from the label boxes themselves (with
  // some slack on screen), not from SVG hit-testing, so hover and clicks
  // behave the same at every zoom and in every browser. The box the pointer is
  // inside wins; otherwise the nearest box within the slack.
  function nodeAt(clientX, clientY) {
    const t = d3.zoomTransform(svg.node());
    const r = svg.node().getBoundingClientRect();
    const [x, y] = t.invert([clientX - r.left, clientY - r.top]);
    const pad = Math.max(1.5, HOVER_PAD_PX / t.k);
    // nearest label box (distance 0 inside; ties go to the box whose middle is closer)
    let best = null, bestD = Infinity, labelDist = Infinity;
    for (const n of nodes) {
      const b = n.hitBox || n.box;
      const dx = Math.max(b[0] - x, 0, x - b[2]);
      const dy = Math.max(b[1] - y, 0, y - b[3]);
      if (dx > pad || dy > pad) continue;
      const dist = Math.hypot(dx, dy);
      const d = dist * 1000 + Math.abs(y - (b[1] + b[3]) / 2);
      if (d < bestD) { bestD = d; best = n; labelDist = dist; }
    }
    if (best && labelDist === 0) return best;   // inside a label: that label
    // A line leads into one category: hovering it is hovering that category; a
    // junction (stub + knob) belongs to the category whose lines split there.
    // A line under the cursor beats a label a few pixels away; labels win ties.
    const linePad = Math.max(1.5, LINE_PAD_PX / t.k);
    let lineD = Math.min(linePad, best ? labelDist : Infinity);
    for (const l of poster.links) {
      const s = l.samples;
      for (let i = 1; i < s.length; i++) {
        const d = segDist(x, y, s[i - 1], s[i]);
        if (d < lineD) { lineD = d; best = byId.get(l.child); }
      }
    }
    for (const n of junctions) {
      const sx = n.side === 'right' ? n.box[2] + STUB_GAP : n.box[0] - STUB_GAP;
      const d = segDist(x, y, [sx, n.knob[1]], n.knob);
      if (d < lineD) { lineD = d; best = n; }
    }
    return best;
  }
  function segDist(px, py, a, b) {
    const vx = b[0] - a[0], vy = b[1] - a[1];
    const len2 = vx * vx + vy * vy || 1;
    const u = Math.max(0, Math.min(1, ((px - a[0]) * vx + (py - a[1]) * vy) / len2));
    return Math.hypot(px - (a[0] + u * vx), py - (a[1] + u * vy));
  }
  let hovered = null;
  function setHover(n, event) {
    if (n === hovered) {
      if (n && event) place(event);
      return;
    }
    if (hovered) {
      nodeEl.get(hovered.id).classed('is-hover', false);
      highlight(hovered, false);
    }
    hovered = n;
    clearTimeout(hideTimer);
    if (n) {
      nodeEl.get(n.id).classed('is-hover', true);
      highlight(n, true);
      tooltip.datum(n.d).html(tooltipHtml(n)).style('display', 'block').style('opacity', 1);
      if (event) place(event);
      svg.style('cursor', 'pointer');
      // a tap fires no mouseleave: let the tip go after a beat
      if (touchOnly) hideTimer = setTimeout(() => setHover(null), 2500);
    } else {
      svg.style('cursor', null);
      hideTimer = setTimeout(() => tooltip.style('opacity', 0).style('display', 'none'), 120);
    }
  }
  function onNodeClick(n) {
    focusNode(n);
  }
  svg
    .on('mousemove', (event) => setHover(nodeAt(event.clientX, event.clientY), event))
    .on('mouseleave', () => setHover(null))
    .on('click', (event) => {
      const n = nodeAt(event.clientX, event.clientY);
      if (n) onNodeClick(n);
      else closeCard();                          // a click on empty map (not a drag) closes the card
    })
    .on('dblclick.zoom', null)
    .on('dblclick', (event) => {
      if (!nodeAt(event.clientX, event.clientY)) {
        zoom.scaleBy(svg.transition().duration(250), 2, d3.pointer(event, svg.node()));
      }
    });

  // ---- keyboard ----------------------------------------------------------
  svg.on('keydown', (event) => {
    const step = 60;
    const pan = (x, y) => zoom.translateBy(svg.transition().duration(150), x, y);
    switch (event.key) {
      case '+': case '=': zoom.scaleBy(svg.transition().duration(200), 1.4); break;
      case '-': case '_': zoom.scaleBy(svg.transition().duration(200), 1 / 1.4); break;
      case '0': fitAll(); break;
      case 'ArrowLeft': pan(step, 0); break;
      case 'ArrowRight': pan(-step, 0); break;
      case 'ArrowUp': pan(0, step); break;
      case 'ArrowDown': pan(0, -step); break;
      default: return;
    }
    event.preventDefault();
  });

  // ---- resize + cleanup ---------------------------------------------------
  let resizeTimer = null;
  const onResize = () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      W = container.clientWidth || W;
      H = container.clientHeight || H;
      svg.attr('width', W).attr('height', H);
      if (cardNode) card.classList.toggle('is-sheet', isPhone());
      if (!userZoomed) { currentFocus ? fitNode(currentFocus, false) : fitAll(false); }
      positionCard();
    }, 150);
  };
  window.addEventListener('resize', onResize);
  function cleanup() {
    window.removeEventListener('resize', onResize);
    clearTimeout(resizeTimer);
    document.removeEventListener('keydown', onKey);
    clearTimeout(hideTimer);
  }
  window._posterMapCleanup = cleanup;

  fitAll(false);

  return {
    fitAll,
    fitNode,
    zoomBy: (factor) => zoom.scaleBy(svg.transition().duration(200), factor),
    /** Fit the first poster node whose database slug path equals `slug`; returns whether one was found. */
    fitSlug(slug) {
      const n = nodes.find(m => m.dbPath && slugPath(m.dbPath) === slug);
      if (n) focusNode(n, false);
      return !!n;
    },
    closeCard,
    /** Same as a click on that node (used by the e2e specs). */
    activate(id) {
      const n = byId.get(id);
      if (n) onNodeClick(n);
      return !!n;
    },
    nodes,
    cleanup,
  };
}
