/**
 * treemap.js
 * Treemap visualization with drill-down, side panel, and responsive features
 */

import { showSidePanel, sanitizeText, sanitizeUrl } from '../utilities.js';
import { categoryColors, hashString, tagNodesWithCategory, createTooltipLifecycle } from './shared.js';

export function renderTreemap(data, showTooltip, hideTooltip) {
  const container = document.getElementById('visualization');
  let width = container.clientWidth;
  let height = container.clientHeight;

  if (!width || !height) return;

  d3.select('#visualization').selectAll('*').remove();

  const svg = d3.select('#visualization')
    .append('svg')
    .attr('role', 'img')
    .attr('aria-label', 'Mosaic: proportional tiles of climate solution categories. Click a tile to drill down.')
    .attr('width', width)
    .attr('height', height)  // Use full height - no inline breadcrumb
    .style('cursor', 'pointer');

  // Category-specific color palette (depth-1 categories get unique colors)
  

  // Helper function to generate a hash from a string (for consistent random shades)
  

  // Drill-down and resize recreate the hierarchy (new node objects), so root-view
  // detection must compare data references (which survive recreation), not nodes.
  const isRootView = (node) => node.data === data;

  // The labeled, visible tile for any rendered node: its depth-1 ancestor.
  // Every view root (original or recreated by drillDown/resize) has depth 0,
  // so depth 1 is always the immediate child of the current view.
  const visibleTile = (node) => {
    let tile = node;
    while (tile.depth > 1) tile = tile.parent;
    return tile;
  };

  // Helper function to get color for a node based on its category and depth
  function getNodeColor(node, viewRoot = root) {
    // Get category name from stored tag (set during initial hierarchy build)
    let categoryName = node.data._category;

    // If viewing from root, check if this IS a depth-1 category
    if (isRootView(viewRoot) && node.depth === 1) {
      categoryName = node.data.name || node.data.entity_name || '';
    }

    // If no category found, use default
    if (!categoryName) {
      return '#0096c7';
    }

    // Normalize category name to lowercase for case-insensitive matching
    const normalizedName = categoryName.toLowerCase().trim();
    const baseColor = categoryColors[normalizedName] || '#0096c7'; // Fallback to default blue

    // Calculate relative depth from the category (0 for category itself)
    // When viewing from root: depth-1 = category (relativeDepth 0), depth-2 = first child (relativeDepth 1)
    // When drilled down: depth-0 = category (relativeDepth 0), depth-1 = first child (relativeDepth 1)
    const categoryDepth = isRootView(viewRoot) ? 1 : 0;
    const relativeDepth = node.depth - categoryDepth;

    // If this IS the category node, use base color
    if (relativeDepth === 0) {
      return baseColor;
    }

    // For cluster nodes, use a lighter, more muted shade of the category color
    if (node.data._isCluster) {
      const hsl = d3.hsl(baseColor);
      // EXTRA gentle for cluster at root level - should look like ghost/background
      if (isRootView(viewRoot)) {
        hsl.l = Math.min(0.92, hsl.l * 2.2); // Almost white at root
        hsl.s = Math.max(0.05, hsl.s * 0.2); // Almost no saturation at root
      } else {
        hsl.l = Math.min(0.75, hsl.l * 1.3); // 30% lighter for gentler appearance
        hsl.s = Math.max(0.2, hsl.s * 0.7); // Reduce saturation for more muted look
      }
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
      // Map hash to a value between -0.2 and +0.3 for lightness variation
      const lightnessVariation = ((hash % 50) / 100) - 0.1; // Range: -0.1 to +0.4
      // Map hash to a value between -0.1 and +0.1 for saturation variation
      const saturationVariation = ((hash % 20) / 100) - 0.1; // Range: -0.1 to +0.1

      // For terminal nodes (no children), use muted colors
      if (!node.children || node.children.length === 0) {
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

  const treemap = d3.treemap()
    .size([width, height])
    .padding(2)
    .round(true);

  const root = d3.hierarchy(data)
    .sum(d => (!d.children || d.children.length === 0) ? 1 : 0)
    .sort((a, b) => b.value - a.value);

  // Tag each node with its category (depth-1 ancestor name) for color consistency
  

  tagNodesWithCategory(root);

  // Helper function to cluster terminal nodes for any parent (>= 5 terminals)
  function clusterTerminalNodes(parentNode) {
    if (!parentNode.children) return;

    const terminalLeaves = parentNode.children.filter(child => !child.children || child.children.length === 0);
    const categories = parentNode.children.filter(child => child.children && child.children.length > 0);

    // Only cluster if 5 or more terminal nodes
    if (terminalLeaves.length >= 5) {
      // Collect all URLs/content from terminal leaves
      const allContent = terminalLeaves.flatMap(leaf => {
        return leaf.data.urls || leaf.data.content || leaf.data.items || [];
      });

      const clusterData = {
        name: `Other Solutions (${terminalLeaves.length})`,
        _isCluster: true,
        _category: parentNode.data._category, // Inherit category from parent
        urls: allContent
      };

      const clusterNode = d3.hierarchy(clusterData);
      clusterNode._clusteredLeaves = terminalLeaves;
      clusterNode.parent = parentNode;
      clusterNode.depth = parentNode.depth + 1;
      clusterNode.height = 0;

      // Set cluster value to match the combined value of terminal leaves
      // Calculate total value from all terminal leaves
      const totalValue = terminalLeaves.reduce((sum, leaf) => sum + (leaf.value || 1), 0);
      clusterNode.value = totalValue;

      // Replace terminal leaves with single cluster node
      parentNode.children = [...categories, clusterNode];
    }
  }

  // Apply clustering to root
  clusterTerminalNodes(root);

  treemap(root);

  // Tooltip state management
  const tooltipLife = createTooltipLifecycle();
  let wasDragging = false;
  let currentRoot = root;  // Track current drill-down level
  let navigationStack = [];  // Track drill-down history for back navigation

  const g = svg.append('g');

  // Update global breadcrumb navigation
  function updateBreadcrumb() {
    if (!window.updateBreadcrumbs) return;

    // Build full path: navigationStack + currentRoot
    const fullPath = [...navigationStack, currentRoot];

    // Convert to breadcrumb format (skip root, start from depth-1)
    const breadcrumbPath = fullPath.slice(1).map(node => ({
      name: node.data.name || node.data.entity_name || 'Unnamed',
      node: node
    }));

    // If we're at root, hide breadcrumbs
    if (breadcrumbPath.length === 0) {
      window.resetBreadcrumbs();
    } else {
      window.updateBreadcrumbs(breadcrumbPath);
    }
  }

  // Render function for current level
  function render(node) {
    currentRoot = node;
    updateBreadcrumb();

    // Get all descendants to render
    const nodes = node.descendants().filter(d => d.depth > node.depth);

    // Clear existing content
    g.selectAll('*').remove();

    // Create TWO separate layers: rectangles first, then labels on top

    // LAYER 1: Rectangles
    const rects = g.selectAll('rect.cell-rect')
      .data(nodes)
      .join('rect')
      .attr('class', 'cell-rect')
      .attr('x', d => d.x0 - node.x0)
      .attr('y', d => d.y0 - node.y0)
      .attr('width', d => d.x1 - d.x0)
      .attr('height', d => d.y1 - d.y0)
      .attr('fill', d => {
        // Check if node matches any filter (search, type, tag, author, location)
        const isMatch = d.data.isSearchMatch || d.data.isTypeMatch || d.data.isTagMatch ||
                        d.data.isAuthorMatch || d.data.isLocationMatch || d.data.isDateMatch;

        if (isMatch) return '#ff4444';
        // Use category-based colors for all nodes
        return getNodeColor(d, node);
      })
      .attr('fill-opacity', d => {
        if (d.data._isCluster) {
          // Very transparent for cluster at root - should look like ghost
          return isRootView(node) ? 0.35 : 0.65;
        }
        if (!d.children || d.children.length === 0) {
          return 0.6; // Terminal nodes
        }
        return 0.5; // Category nodes with children
      })
      .attr('stroke', d => {
        // Check if node matches any filter
        const isMatch = d.data.isSearchMatch || d.data.isTypeMatch || d.data.isTagMatch ||
                        d.data.isAuthorMatch || d.data.isLocationMatch || d.data.isDateMatch;

        if (isMatch) return '#cc0000';
        // Depth-1 parent nodes get subtle semi-transparent borders
        const relativeDepth = d.depth - node.depth;
        if (relativeDepth === 1 && d.children) return 'rgba(255, 255, 255, 0.6)';
        return 'rgba(255, 255, 255, 0.2)';
      })
      .attr('stroke-width', d => {
        // Check if node matches any filter
        const isMatch = d.data.isSearchMatch || d.data.isTypeMatch || d.data.isTagMatch ||
                        d.data.isAuthorMatch || d.data.isLocationMatch || d.data.isDateMatch;

        if (isMatch) return 2;
        // Depth-1 parent nodes get subtle borders (2px)
        const relativeDepth = d.depth - node.depth;
        if (relativeDepth === 1 && d.children) return 2;
        return 0.5;
      })
      .style('cursor', d => {
        // Clicks act on the visible tile, so the cursor must reflect it too
        const target = visibleTile(d);
        const items = target.data?.urls || target.data?.content || target.data?.items || [];
        return (target.children || items.length > 0 || target.data.url) ? 'pointer' : 'default';
      })
      .on('mouseover', function(event, d) {
        // Clear any frozen tooltip to allow new ones to show
        tooltipLife.clearFrozen();

        // Describe and highlight the visible tile (what a click will act on),
        // not the deep unlabeled rect the cursor happens to be over.
        const target = visibleTile(d);
        rects.filter(dd => dd === target).attr('stroke', '#000').attr('stroke-width', 3);

        const tooltip = d3.select('#tooltip');
        const name = sanitizeText(target.data.name || target.data.entity_name || '');
        const items = target.data?.urls || target.data?.content || target.data?.items || [];

        // Show tooltip near cursor
        tooltip
          .datum(target)
          .style('display', 'block')
          .style('visibility', 'visible')
          .style('opacity', '1')
          .style('pointer-events', 'none')
          .style('left', (event.pageX + 5) + 'px')
          .style('top', (event.pageY - 35) + 'px');

        // Check children FIRST to match click handler behavior
        if (target.children) {
          // Parent category - show subcategory count
          const numChildren = target.children.length;
          tooltip.html(`
            <div style="font-weight: bold; margin-bottom: 4px;">${name}</div>
            <div style="font-size: 12px; color: #666;">
              ${numChildren} subcategor${numChildren === 1 ? 'y' : 'ies'} - Click to drill down
            </div>
          `);
        } else if (items.length > 0) {
          // Terminal leaf with items - show item count
          tooltip.html(`
            <div style="font-weight: bold; margin-bottom: 4px;">${name}</div>
            <div style="font-size: 12px; color: #666;">
              ${items.length} item${items.length === 1 ? '' : 's'} - Click to view
            </div>
          `);
        } else {
          // Empty node - just show name
          tooltip.html(`
            <div style="font-weight: bold; margin-bottom: 4px;">${name}</div>
          `);
        }

        // Freeze tooltip and make it clickable
        tooltipLife.freeze(target);  // clickable; touch devices get an auto-hide
      })
      .on('mouseout', function(event, d) {
        // Reset the highlighted visible tile (mouseover highlights the target, not `this`)
        const target = visibleTile(d);
        const isMatch = target.data.isSearchMatch || target.data.isTypeMatch || target.data.isTagMatch ||
                        target.data.isAuthorMatch || target.data.isLocationMatch || target.data.isDateMatch;

        // The visible tile is always at relative depth 1
        const isDepth1Parent = !!target.children;
        const defaultStroke = isDepth1Parent ? 'rgba(255, 255, 255, 0.6)' : 'rgba(255, 255, 255, 0.2)';
        const defaultStrokeWidth = isDepth1Parent ? 2 : 0.5;

        rects.filter(dd => dd === target)
          .attr('stroke', isMatch ? '#cc0000' : defaultStroke)
          .attr('stroke-width', isMatch ? 2 : defaultStrokeWidth);

        // Cursor left the node: hide the tooltip after a short grace period
        // (kept alive if the cursor moves onto the tooltip itself)
        tooltipLife.scheduleHide();
      })
      .on('click', function(event, d) {
        // Prevent click if we just finished dragging OR if Cmd/Ctrl is held
        if (wasDragging || event.metaKey || event.ctrlKey) {
          event.stopPropagation();
          return;
        }

        const sidePanel = document.getElementById('sidePanel');

        // All descendant rects render overlapping (children on top), so clicks
        // usually land on a deep, unlabeled tile. Act on the visible level
        // instead: the immediate child of the current view.
        const target = visibleTile(d);
        const items = target.data?.urls || target.data?.content || target.data?.items || [];

        if (target.data._isCluster) {
          // Cluster node: open side panel with all clustered content
          const syntheticNode = {
            data: {
              name: target.data.name,
              urls: items
            }
          };
          showSidePanel(sidePanel, syntheticNode);
        } else if (target.children && target.children.length > 0) {
          // Category tile: drill down one visible level
          drillDown(target);
        } else if (items.length > 0) {
          // Terminal leaf with content: directly open side panel
          showSidePanel(sidePanel, target);
        } else if (target.data.url) {
          // Leaf node with single URL: open it
          const safeUrl = sanitizeUrl(target.data.url);
          if (safeUrl && safeUrl !== '#') window.open(safeUrl, '_blank', 'noopener,noreferrer');
        }

        event.stopPropagation();
      });

    // LAYER 2: Labels (rendered AFTER all rectangles, so they're always on top)
    const labels = g.selectAll('text.cell-label')
      .data(nodes.filter(d => {
        // Show ONLY labels for relative depth 1 (immediate children of current view)
        const relativeDepth = d.depth - node.depth;
        const width = d.x1 - d.x0;
        const height = d.y1 - d.y0;
        // Only show if at depth 1 and rectangle is large enough (at least 40x40 pixels)
        return relativeDepth === 1 && width > 40 && height > 40;
      }))
      .join('text')
      .attr('class', 'cell-label')
      .attr('x', d => (d.x0 - node.x0) + 12)
      .attr('y', d => (d.y0 - node.y0) + 20)
      .style('font-size', '16px')
      .style('font-weight', 'bold')
      .style('fill', 'white')
      .style('pointer-events', 'none')
      .style('user-select', 'none')
      .each(function(d) {
        const textElement = d3.select(this);
        const name = sanitizeText(d.data.name || d.data.entity_name || '');
        const rectWidth = (d.x1 - d.x0) - 24; // Account for padding (12px on each side)
        const rectHeight = (d.y1 - d.y0) - 28; // Account for padding (12px left/right, 20px top, 8px bottom)
        const fontSize = 16;

        // Clear any existing text
        textElement.selectAll('tspan').remove();

        // For cluster nodes, ONLY show single-line label (no wrapping)
        if (d.data._isCluster) {
          const maxChars = Math.floor(rectWidth / (fontSize * 0.6));
          const displayName = name.length > maxChars ? name.substring(0, maxChars - 1) + '…' : name;
          textElement.append('tspan')
            .attr('x', textElement.attr('x'))
            .attr('dy', 0)
            .text(displayName);
          return;
        }

        // For other nodes, use text wrapping
        const words = name.split(/\s+/);
        const lineHeight = 1.2; // ems
        let line = [];
        let lineNumber = 0;
        let tspan = textElement.append('tspan')
          .attr('x', textElement.attr('x'))
          .attr('dy', 0);

        words.forEach((word) => {
          line.push(word);
          tspan.text(line.join(' '));

          // Check if line is too long
          if (tspan.node().getComputedTextLength() > rectWidth) {
            if (line.length === 1) {
              // Single word is too long, keep it but truncate
              const truncated = word.substring(0, Math.floor(rectWidth / (fontSize * 0.6))) + '…';
              tspan.text(truncated);
            } else {
              // Remove last word and start new line
              line.pop();
              tspan.text(line.join(' '));
              lineNumber++;

              // Check if we have room for another line
              if ((lineNumber + 1) * lineHeight * fontSize < rectHeight) {
                line = [word];
                tspan = textElement.append('tspan')
                  .attr('x', textElement.attr('x'))
                  .attr('dy', `${lineHeight}em`)
                  .text(word);
              } else {
                // No room, add ellipsis to current line
                tspan.text(tspan.text() + '…');
                return;
              }
            }
          }
        });
      });
  }

  // Drill down to a specific node
  function drillDown(node, isBackNavigation = false) {
    // If going forward (not back), save current root to navigation stack
    if (!isBackNavigation) {
      navigationStack.push(currentRoot);
    }

    // Recalculate treemap for this subtree
    const newRoot = d3.hierarchy(node.data)
      .sum(d => (!d.children || d.children.length === 0) ? 1 : 0)
      .sort((a, b) => b.value - a.value);

    // Tag nodes with category (category info is already in data._category, so this just ensures new nodes get tagged)
    tagNodesWithCategory(newRoot);

    // Apply clustering to this level
    clusterTerminalNodes(newRoot);

    treemap(newRoot);
    render(newRoot);
  }

  // Setup tooltip click handler to open side panel
  const tooltip = d3.select('#tooltip');
  const sidePanel = document.getElementById('sidePanel');

  tooltip
    .style('cursor', 'pointer')
    .on('click', function() {
      const d = d3.select(this).datum();
      if (d) {
        // Do what the tooltip text advertises: drill into categories,
        // open the side panel for leaves and clusters.
        if (d.children && d.children.length > 0) {
          // Skip if the frozen tooltip outlived a navigation into this same node
          if (d.data !== currentRoot.data) drillDown(d);
        } else {
          showSidePanel(sidePanel, d);
        }

        // Clear frozen state and hide tooltip
        tooltipLife.dismiss();
      }
    })
    .on('mouseover.keepalive', function() {
      // Cursor is over the tooltip: keep it visible
      tooltipLife.cancelTimer();
    })
    .on('mouseout', function() {
      // Cursor left the tooltip: hide it after a short grace period
      tooltipLife.scheduleHide();
    });

  // Click background to zoom out to parent
  svg.on('click', (event) => {
    if (event.target === svg.node() && !wasDragging) {
      // Go back using navigation stack
      if (navigationStack.length > 0) {
        const previousRoot = navigationStack.pop();
        drillDown(previousRoot, true);  // true = isBackNavigation
      }
    }
  });

  // Listen for breadcrumb navigation events
  const breadcrumbHandler = (e) => {
    const targetNode = e.detail.node;
    if (targetNode) {
      // Find the index of this node in the path
      const fullPath = [...navigationStack, currentRoot];
      const index = fullPath.indexOf(targetNode);

      if (index >= 0) {
        // Pop stack until we reach target node
        while (navigationStack.length > index) {
          navigationStack.pop();
        }
        drillDown(targetNode, true);  // true = isBackNavigation
      }
    }
  };

  // Listen for reset event from global home button
  const resetHandler = () => {
    // Clear navigation stack and go to root
    navigationStack = [];
    render(root);
  };

  // Listen for up event from global up button
  const upHandler = () => {
    // Go back using navigation stack
    if (navigationStack.length > 0) {
      const previousRoot = navigationStack.pop();
      drillDown(previousRoot, true);  // true = isBackNavigation
    }
  };

  // Add event listeners
  window.addEventListener('breadcrumbNavigate', breadcrumbHandler);
  window.addEventListener('resetVisualization', resetHandler);
  window.addEventListener('goUpLevel', upHandler);

  // Cleanup function (called when visualization changes)
  const cleanup = () => {
    window.removeEventListener('breadcrumbNavigate', breadcrumbHandler);
    window.removeEventListener('resetVisualization', resetHandler);
    window.removeEventListener('goUpLevel', upHandler);
    window.removeEventListener('resize', resizeHandler);
    tooltipLife.cleanup();
    if (resizeTimer) clearTimeout(resizeTimer);
  };

  // Store cleanup function for next render
  if (window._treemapCleanup) {
    window._treemapCleanup();
  }
  window._treemapCleanup = cleanup;

  // Handle window resize with debounce
  let resizeTimer;
  const resizeHandler = () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      width = container.clientWidth;
      height = container.clientHeight;

      if (!width || !height) return;

      svg.attr('width', width).attr('height', height);
      treemap.size([width, height]);

      const newRoot = d3.hierarchy(currentRoot.data)
        .sum(d => (!d.children || d.children.length === 0) ? 1 : 0)
        .sort((a, b) => b.value - a.value);

      tagNodesWithCategory(newRoot);
      clusterTerminalNodes(newRoot);
      treemap(newRoot);
      render(newRoot);
    }, 150);
  };
  window.addEventListener('resize', resizeHandler);

  // Initialize with root view
  render(root);
}
