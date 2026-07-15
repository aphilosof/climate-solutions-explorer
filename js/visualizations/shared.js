/**
 * shared.js
 * Code shared by the visualization modules. Everything here used to exist as
 * five separate copies (one per module), which meant every fix had to be
 * applied five times. One definition, imported everywhere.
 *
 * Treemap intentionally keeps its own getNodeColor (root-view semantics) and
 * its own tooltip click handler (clicking its tooltip drills down instead of
 * opening the side panel).
 */

import { showSidePanel } from '../utilities.js';

// Category-specific color palette (depth-1 categories get unique colors)
export const categoryColors = {
  'power': '#ffba08',              // Warm Gold
  'transportation': '#003f88',     // Dark Navy Blue
  'protect nature': '#2d6a4f',     // Forest Green
  'water': '#00b4d8',              // Bright Cyan
  'food & agriculture': '#95d5b2', // Light Green
  'food and agriculture': '#95d5b2', // Alternative spelling
  'buildings': '#6c757d',          // Stone Gray
  'carbon removal': '#a67c52',     // Soft Brown (gentle earth tone)
  'circular economy': '#06a77d',   // Teal
  'fuels & chemicals': '#9d4edd',  // Deep Violet
  'fuels and chemicals': '#9d4edd', // Alternative spelling
  'industry': '#4361ee',           // Industrial Blue
  'finance': '#e09f3e',            // Amber
  'climate intelligence': '#c9665d' // Muted Coral (softer red/pink)
};

// Deterministic hash from a string (for consistent color variation per node)
export function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Color for a node based on its category and depth.
 * Terminal check covers both plain hierarchies (no/empty children) and
 * collapse-capable ones (dendrogram/force network stash children in _children).
 */
export function getNodeColor(node) {
  // Get category name from stored tag (set during initial hierarchy build)
  let categoryName = node.data._category;

  // If viewing from root, check if this IS a depth-1 category
  if (node.depth === 1) {
    categoryName = node.data.name || node.data.entity_name || '';
  }

  // If no category found, use default
  if (!categoryName) {
    return '#0096c7';
  }

  // Normalize category name to lowercase for case-insensitive matching
  const normalizedName = categoryName.toLowerCase().trim();
  const baseColor = categoryColors[normalizedName] || '#0096c7'; // Fallback to default blue

  // If this IS the category node, use base color
  if (node.depth === 1) {
    return baseColor;
  }

  // For cluster nodes, use a lighter, more muted shade of the category color
  if (node.data._isCluster) {
    const hsl = d3.hsl(baseColor);
    // EXTRA gentle for cluster - should look like ghost/background
    hsl.l = Math.min(0.92, hsl.l * 2.2); // Almost white
    hsl.s = Math.max(0.05, hsl.s * 0.2); // Almost no saturation
    return hsl.toString();
  }

  // For children, create varied shades based on node name (consistent but distinct)
  const colorObj = d3.color(baseColor);
  if (colorObj) {
    const hsl = d3.hsl(colorObj);
    const nodeName = node.data.name || node.data.entity_name || '';

    // Use hash of node name to generate consistent variation
    const hash = hashString(nodeName);

    // Create variation in both lightness and saturation
    const lightnessVariation = ((hash % 50) / 100) - 0.1; // Range: -0.1 to +0.4
    const saturationVariation = ((hash % 20) / 100) - 0.1; // Range: -0.1 to +0.1

    // For terminal nodes (no children anywhere), use muted colors
    const isTerminal = (!node.children || node.children.length === 0) && !node._children;
    if (isTerminal) {
      hsl.l = Math.max(0.25, Math.min(0.7, hsl.l * 0.9 + lightnessVariation * 0.5)); // Less dark
      hsl.s = Math.max(0.2, Math.min(0.6, hsl.s * 0.6 + saturationVariation * 0.5)); // Much more muted
      return hsl.toString();
    }

    // For category nodes with children, adjust based on variation
    hsl.l = Math.max(0.3, Math.min(0.75, hsl.l + lightnessVariation));
    hsl.s = Math.max(0.3, Math.min(1, hsl.s + saturationVariation));
    return hsl.toString();
  }

  return baseColor;
}

// Tag each node with its category (depth-1 ancestor name) for color consistency
export function tagNodesWithCategory(node, categoryName = null) {
  // If this is a depth-1 node, it IS the category
  if (node.depth === 1) {
    categoryName = node.data.name || node.data.entity_name || '';
  }

  // Store category on the data object (so it persists through hierarchy rebuilds)
  if (categoryName && !node.data._category) {
    node.data._category = categoryName;
  }

  // Recursively tag children
  if (node.children) {
    node.children.forEach(child => tagNodesWithCategory(child, categoryName));
  }
}

// Build the breadcrumb path array from a node up to (but excluding) the root
export function buildPath(node, rootNode) {
  const path = [];
  let current = node;

  while (current && current !== rootNode) {
    path.unshift({
      name: current.data.name || current.data.entity_name || 'Unnamed',
      node: current
    });
    current = current.parent;
  }

  return path;
}

/**
 * Tooltip lifecycle state machine, shared by every visualization:
 *  - while hovering, the tooltip stays (frozen + clickable);
 *  - when the cursor leaves the element or the tooltip, it hides after a
 *    short grace period (cancelled if the cursor moves onto the tooltip);
 *  - touch devices never fire mouseout, so a timed auto-hide runs instead.
 *
 * Each render call creates its own instance; call cleanup() on teardown.
 */
export function createTooltipLifecycle(graceMs = 600, touchHideMs = 2500) {
  let frozenNode = null;
  let timer = null;

  const tooltip = () => d3.select('#tooltip');

  const cancelTimer = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  };

  const hideNow = () => {
    frozenNode = null;
    tooltip()
      .style('display', 'none')
      .style('pointer-events', 'none');
  };

  return {
    isFrozen: () => frozenNode !== null,
    frozen: () => frozenNode,
    cancelTimer,
    hideNow,

    /** Start of mouseover: clear any frozen state from a previous hover. */
    clearFrozen() {
      cancelTimer();
      frozenNode = null;
    },

    /** End of mouseover: freeze the tooltip (clickable); touch auto-hide. */
    freeze(node) {
      frozenNode = node;
      tooltip().style('pointer-events', 'auto');
      cancelTimer();
      // Touch devices never fire mouseout, so the leave-grace can't run:
      // auto-hide after a beat instead of leaving the tooltip stuck open.
      if (window.matchMedia('(hover: none)').matches) {
        timer = setTimeout(hideNow, touchHideMs);
      }
    },

    /** Cursor left the element or the tooltip: hide after the grace period. */
    scheduleHide() {
      cancelTimer();
      timer = setTimeout(hideNow, graceMs);
    },

    /** Tooltip was clicked and acted on: dismiss immediately. */
    dismiss() {
      cancelTimer();
      hideNow();
    },

    cleanup: cancelTimer,
  };
}

/**
 * Standard #tooltip element handlers: click opens the side panel for the
 * frozen node's data, hovering keeps the tooltip alive, leaving schedules
 * the grace hide. (Treemap attaches its own click handler instead.)
 */
export function attachTooltipPanelHandlers(life) {
  const sidePanel = document.getElementById('sidePanel');
  d3.select('#tooltip')
    .style('cursor', 'pointer')
    .on('click', function() {
      const d = d3.select(this).datum();
      if (d) {
        showSidePanel(sidePanel, d);
        life.dismiss();
      }
    })
    .on('mouseover.keepalive', () => life.cancelTimer())
    .on('mouseout', () => life.scheduleHide());
}
