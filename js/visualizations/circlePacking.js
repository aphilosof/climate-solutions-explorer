/**
 * circlePacking.js - Observable physics + our design
 * Dynamic font sizing, proper centering, smart label filtering
 */

import { showSidePanel } from '../utilities.js';

export function renderCirclePacking(data, showTooltip, hideTooltip) {
  const container = document.getElementById('visualization');
  let width = container.clientWidth;
  let height = container.clientHeight;
  let diameter = Math.min(width, height);

  if (!width || !height) return;

  d3.select('#visualization').selectAll('*').remove();

  const svg = d3.select('#visualization')
    .append('svg')
    .attr('width', width)
    .attr('height', height)
    .style('cursor', 'pointer');

  // Category-specific color palette (depth-1 categories get unique colors)
  const categoryColors = {
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

  // Helper function to generate a hash from a string (for consistent random shades)
  function hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  // Helper function to get color for a node based on its category and depth
  function getNodeColor(node) {
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

  // Pack layout
  const pack = d3.pack()
    .size([diameter - 4, diameter - 4])
    .padding(3);

  const root = d3.hierarchy(data)
    .sum(d => (!d.children || d.children.length === 0 ? 1 : 0))
    .sort((a, b) => b.value - a.value);

  // Tag each node with its category (depth-1 ancestor name) for color consistency
  function tagNodesWithCategory(node, categoryName = null) {
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

  tagNodesWithCategory(root);

  pack(root);

  let focus = root;
  let view;
  let frozenTooltipNode = null;  // Track WHICH node tooltip is frozen for
  let tooltipFreezeTimer = null;
  let panX = 0;  // Pan offset X
  let panY = 0;  // Pan offset Y
  let zoomScale = 1;  // Geometric zoom scale
  let isScrollZoomMode = false;  // Track scroll zoom vs click zoom mode

  // Main group - centered
  const g = svg.append('g')
    .attr('transform', `translate(${width/2},${height/2})`);

  // Create circles
  const node = g.selectAll('circle')
    .data(root.descendants())
    .join('circle')
    .attr('fill', d => {
      // Check if node matches any filter (search, type, tag, author, location)
      const isMatch = d.data.isSearchMatch || d.data.isTypeMatch || d.data.isTagMatch ||
                      d.data.isAuthorMatch || d.data.isLocationMatch || d.data.isDateMatch;
      if (isMatch) return '#ff4444';
      // Use category-based colors for all nodes
      return getNodeColor(d);
    })
    .attr('fill-opacity', d => {
      if (d.data._isCluster) {
        // Very transparent for cluster - should look like ghost
        return 0.35;
      }
      if (!d.children || d.children.length === 0) {
        return 0.6; // Terminal nodes
      }
      return 0.5; // Category nodes with children
    })
    .attr('stroke', d => {
      // Add stroke for matched nodes
      const isMatch = d.data.isSearchMatch || d.data.isTypeMatch || d.data.isTagMatch ||
                      d.data.isAuthorMatch || d.data.isLocationMatch || d.data.isDateMatch;
      return isMatch ? '#cc0000' : null;
    })
    .attr('stroke-width', d => {
      // Add stroke width for matched nodes
      const isMatch = d.data.isSearchMatch || d.data.isTypeMatch || d.data.isTagMatch ||
                      d.data.isAuthorMatch || d.data.isLocationMatch || d.data.isDateMatch;
      return isMatch ? 2 : 0;
    })
    .style('opacity', d => d.depth === 0 ? 0 : 1)
    .attr('pointer-events', null)  // Enable pointer events for all
    .style('cursor', d => {
      const items = d.data?.urls || d.data?.content || d.data?.items || [];
      return (d.children || items.length > 0) ? 'pointer' : 'default';
    })
    .on('mouseover', function(event, d) {
      // Clear any frozen tooltip to allow new ones to show
      if (frozenTooltipNode) {
        if (tooltipFreezeTimer) clearTimeout(tooltipFreezeTimer);
        frozenTooltipNode = null;
      }

      // Show hover box for ALL nodes (both parent and leaf)
      d3.select(this).attr('stroke', '#000').attr('stroke-width', 2);

      const tooltip = d3.select('#tooltip');
      const name = d.data.name || d.data.entity_name || '';
      const items = d.data?.urls || d.data?.content || d.data?.items || [];

      // Show tooltip CLOSE to cursor, slightly above
      tooltip
        .datum(d)
        .style('display', 'block')
        .style('visibility', 'visible')
        .style('opacity', '1')
        .style('pointer-events', 'none')  // Don't block clicks initially
        .style('left', (event.pageX + 5) + 'px')
        .style('top', (event.pageY - 35) + 'px');  // Above cursor

      // Check children FIRST to match click handler behavior
      if (d.children) {
        // Parent category - show subcategory count (matches click zoom behavior)
        const numChildren = d.children.length;
        tooltip.html(`
          <div style="font-weight: bold; margin-bottom: 4px;">${name}</div>
          <div style="font-size: 12px; color: #666;">
            ${numChildren} subcategor${numChildren === 1 ? 'y' : 'ies'} - Click to zoom
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
        // Empty node - just show name, no action text
        tooltip.html(`
          <div style="font-weight: bold; margin-bottom: 4px;">${name}</div>
        `);
      }

      // Freeze tooltip and make it clickable
      frozenTooltipNode = d;
      tooltip.style('pointer-events', 'auto');  // Clickable

      if (tooltipFreezeTimer) clearTimeout(tooltipFreezeTimer);
      tooltipFreezeTimer = setTimeout(() => {
        frozenTooltipNode = null;
        tooltip
          .style('display', 'none')
          .style('pointer-events', 'none');
      }, 3000);  // 3 seconds (shorter)
    })
    .on('mouseout', function(event, d) {
      // Check if node matches any filter
      const isMatch = d.data.isSearchMatch || d.data.isTypeMatch || d.data.isTagMatch ||
                      d.data.isAuthorMatch || d.data.isLocationMatch || d.data.isDateMatch;
      // Reset to match stroke (red) or no stroke
      d3.select(this)
        .attr('stroke', isMatch ? '#cc0000' : null)
        .attr('stroke-width', isMatch ? 2 : 0);

      // Only hide tooltip if it's not frozen
      if (!frozenTooltipNode) {
        const tooltip = d3.select('#tooltip');
        tooltip
          .style('display', 'none')
          .style('pointer-events', 'none');
      }
    })
    .on('click', function(event, d) {
      // Prevent click if we just finished dragging OR if Cmd/Ctrl is held
      if (wasDragging || event.metaKey || event.ctrlKey) {
        event.stopPropagation();
        return;
      }

      const sidePanel = document.getElementById('sidePanel');
      const hasChildren = d.children && d.children.length > 0;
      const items = d.data?.urls || d.data?.content || d.data?.items || [];

      if (hasChildren) {
        // Parent node: zoom in
        if (focus !== d) {
          zoom(event, d);
        }
      } else if (items && items.length > 0) {
        // Leaf node with content: directly open side panel (NO TOOLTIP)
        showSidePanel(sidePanel, d);
      } else if (d.data.url) {
        // Leaf node with single URL: open it
        window.open(d.data.url, '_blank');
      }

      event.stopPropagation();
    });

  // Create labels - for ALL nodes (including leaf nodes at high zoom)
  const label = g.selectAll('text')
    .data(root.descendants())
    .join('text')
    .attr('pointer-events', 'none')
    .attr('text-anchor', 'middle')
    .style('fill', '#000')
    .style('font-weight', d => d.depth === 1 ? 'bold' : 'normal')
    .style('fill-opacity', d => {
      // Only show labels for children of root that have their own children
      return (d.parent === root && d.children) ? 1 : 0;
    })
    .style('display', d => {
      return (d.parent === root && d.children) ? 'inline' : 'none';
    })
    .text(d => d.data.name || d.data.entity_name || '');

  // Setup tooltip click handler to open side panel
  const tooltip = d3.select('#tooltip');
  const sidePanel = document.getElementById('sidePanel');

  tooltip
    .style('cursor', 'pointer')
    .on('click', function() {
      const d = d3.select(this).datum();
      if (d) {
        // Open side panel with node data
        showSidePanel(sidePanel, d);

        // Clear frozen state and hide tooltip
        frozenTooltipNode = null;
        if (tooltipFreezeTimer) {
          clearTimeout(tooltipFreezeTimer);
          tooltipFreezeTimer = null;
        }
        d3.select(this)
          .style('display', 'none')
          .style('pointer-events', 'none');
      }
    })
    .on('mouseout', function() {
      // Only hide tooltip if NOT frozen
      if (!frozenTooltipNode) {
        d3.select(this)
          .style('display', 'none')
          .style('pointer-events', 'none');
      }
      // If frozen, tooltip stays visible until timer expires
    });

  // Click background to zoom out
  svg.on('click', (event) => {
    if (event.target === svg.node() && !wasDragging) {
      zoom(event, root);
    }
  });

  // Add drag/pan functionality with middle mouse button OR Cmd/Ctrl + drag (trackpad-friendly)
  let isDragging = false;
  let wasDragging = false;
  svg.on('mousedown', function(event) {
    // Middle mouse button (scroll wheel click) OR Cmd/Ctrl + left click (trackpad - works anywhere)
    const isTrackpadPan = (event.button === 0 && (event.metaKey || event.ctrlKey));
    const isMiddleClick = event.button === 1;
    const isBackgroundClick = (event.button === 0 && event.target === this && !event.metaKey && !event.ctrlKey);

    if (isMiddleClick || isTrackpadPan || isBackgroundClick) {
      event.preventDefault();
      isDragging = true;
      wasDragging = false;
      svg.style('cursor', 'grabbing');
    }
  });

  svg.on('mousemove', function(event) {
    if (isDragging) {
      wasDragging = true;  // Mark that we actually moved while dragging
      isScrollZoomMode = true;  // Enter scroll zoom mode for panning
      panX += event.movementX;
      panY += event.movementY;
      zoomTo(view);
    }
  });

  svg.on('mouseup', () => {
    if (isDragging) {
      isDragging = false;
      svg.style('cursor', null);

      // Prevent clicks immediately after dragging
      if (wasDragging) {
        setTimeout(() => {
          wasDragging = false;
        }, 100);
      }
    }
  });

  svg.on('mouseleave', () => {
    if (isDragging) {
      isDragging = false;
      svg.style('cursor', null);
    }
  });

  // Add scroll wheel zoom/pan
  svg.on('wheel', function(event) {
    event.preventDefault();
    isScrollZoomMode = true;  // Enter scroll zoom mode

    if (event.shiftKey) {
      // Shift + scroll: pan vertically
      panY -= event.deltaY * 0.5;
      zoomTo(view);
    } else if (event.ctrlKey || event.metaKey) {
      // Ctrl/Cmd + scroll: pan horizontally
      panX -= event.deltaY * 0.5;
      zoomTo(view);
    } else {
      // Normal scroll: zoom
      if (event.deltaY < 0) {
        zoomScale *= 1.1;
      } else {
        zoomScale /= 1.1;
      }
      zoomTo(view);
    }
  });


  // Initialize
  zoomTo([root.x, root.y, root.r * 2]);

  // Handle window resize
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      // Update dimensions
      width = container.clientWidth;
      height = container.clientHeight;
      diameter = Math.min(width, height);

      if (!width || !height) return;

      // Update SVG size
      svg.attr('width', width).attr('height', height);

      // Update pack layout size and re-apply
      pack.size([diameter - 4, diameter - 4]);
      pack(root);

      // Re-render current view to update positions
      zoomTo(view);
    }, 150); // Debounce resize events
  });

  function zoomTo(v) {
    const k = (diameter / v[2]) * zoomScale;  // Apply geometric zoom scale
    view = v;

    // Apply zoom transform - only include pan offset in scroll zoom mode (pure Observable for click zoom)
    if (isScrollZoomMode) {
      g.attr('transform', `translate(${width/2 + panX},${height/2 + panY})scale(${k})translate(${-v[0]},${-v[1]})`);
    } else {
      // Click zoom: pure Observable pattern, no pan offset
      g.attr('transform', `translate(${width/2},${height/2})scale(${k})translate(${-v[0]},${-v[1]})`);
    }

    // Update circles
    node
      .attr('transform', d => `translate(${d.x},${d.y})`)
      .attr('r', d => d.r);

    // Update labels - Different logic for click zoom vs scroll zoom
    let shownLabels = 0;

    // Determine target depth for scroll zoom based on zoom level
    // k=1 → depth 1, k=2 → depth 2, k=4 → depth 3, etc.
    const targetDepth = isScrollZoomMode
      ? Math.min(Math.max(1, Math.floor(Math.log2(k)) + 1), root.height)
      : null;

    console.log(`Mode: ${isScrollZoomMode ? 'SCROLL' : 'CLICK'}, k=${k.toFixed(2)}, targetDepth=${targetDepth}`);

    // Only interrupt transitions in scroll mode (click mode needs smooth opacity transitions)
    if (isScrollZoomMode) {
      label.interrupt();
    }

    label
      .attr('transform', d => `translate(${d.x},${d.y})`)
      .each(function(d) {
        const element = d3.select(this);
        const name = d.data.name || d.data.entity_name || '';
        const isLeaf = !d.children;

        // Calculate effective visual radius
        const nodeEffRadius = d.r * k;

        let shouldShow = false;

        if (isScrollZoomMode) {
          // SCROLL ZOOM MODE: Show ALL nodes at target depth that are large enough
          if (d.depth === targetDepth && nodeEffRadius > 30) {
            shouldShow = true;
          }
        } else {
          // CLICK ZOOM MODE: Observable pattern - show ONLY children of focus
          if (d.parent === focus) {
            if (isLeaf) {
              // Leaf nodes: show if large enough
              shouldShow = nodeEffRadius > 15;
            } else {
              // Parent nodes: always show when they're children of focus
              shouldShow = true;
            }
          }
        }

        // Only manage display/opacity in scroll zoom mode
        // In click zoom mode, let the transition handle it to avoid conflicts
        if (isScrollZoomMode) {
          if (shouldShow) {
            element.style('display', 'inline');
            element.style('fill-opacity', 1);
            console.log(`  SHOWING label: "${name}" (depth=${d.depth}, effRadius=${nodeEffRadius.toFixed(1)})`);
            shownLabels++;
          } else {
            element.style('display', 'none');
            element.style('fill-opacity', 0);
          }
        } else {
          // Click zoom mode: just track which should show (transition handles visibility)
          if (shouldShow) {
            console.log(`  SHOULD SHOW label: "${name}" (depth=${d.depth}, effRadius=${nodeEffRadius.toFixed(1)})`);
            shownLabels++;
          }
        }

        // Dynamic font sizing - small but legible
        const fontSize = isLeaf
          ? Math.max(1, Math.min(3, d.r / 12))   // Leaf: 1-3px legible
          : Math.max(5, Math.min(10, d.r / 4.5)); // Parent: unchanged

        // VERY aggressive truncation for leaves to fit in circles
        const charWidth = fontSize * 0.7;
        const maxWidth = isLeaf ? d.r * 0.8 : d.r * 1.6;  // Leaves: only 40% of diameter!
        const maxChars = Math.floor(maxWidth / charWidth);

        // Truncate to fit
        let displayText = name;
        if (maxChars < 2) {
          displayText = '';
        } else if (name.length > maxChars) {
          displayText = name.substring(0, Math.max(1, maxChars - 1)) + '.';
        }

        element
          .style('font-size', fontSize + 'px')
          .text(displayText);
      });

    console.log(`>>> Total labels shown in zoomTo: ${shownLabels}`);
  }

  function zoom(event, d) {
    isScrollZoomMode = false;  // Enter click zoom mode
    focus = d;
    zoomScale = 1;  // Reset geometric zoom (Observable pattern - click zoom is hierarchical only)
    panX = 0;  // Reset pan offset (pure Observable pattern)
    panY = 0;

    const transition = svg.transition()
      .duration(event && event.altKey ? 7500 : 750)
      .tween('zoom', () => {
        const i = d3.interpolateZoom(view, [focus.x, focus.y, focus.r * 2]);
        return t => zoomTo(i(t));
      });

    // Observable pattern: manage label visibility
    label
      .filter(function(d) {
        return d.parent === focus || this.style.display === 'inline';
      })
      .transition(transition)
      .style('fill-opacity', d => {
        // Show labels for ALL direct children of focus (including leaf nodes)
        if (d.parent === focus) {
          // For leaf nodes (no children), only show if circle is large enough
          if (!d.children) {
            const k = diameter / (focus.r * 2);  // Pure hierarchical zoom (zoomScale already reset to 1)
            const effRadius = d.r * k;
            return effRadius > 15 ? 1 : 0;  // Very small threshold for leaf labels
          }
          return 1;  // Always show parent node labels
        }
        return 0;
      })
      .on('start', function(d) {
        if (d.parent === focus) this.style.display = 'inline';
      })
      .on('end', function(d) {
        if (d.parent !== focus) this.style.display = 'none';
      });

    // Update breadcrumbs when zooming
    updateBreadcrumbsForCirclePacking(d, root);
  }

  // Helper function to build breadcrumb path from root to current node
  function buildPath(node, rootNode) {
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

  // Update breadcrumbs for current focus
  function updateBreadcrumbsForCirclePacking(focusNode, rootNode) {
    if (!window.updateBreadcrumbs) return;

    // If we're at root, hide breadcrumbs
    if (focusNode === rootNode) {
      window.resetBreadcrumbs();
      return;
    }

    // Build path from root to focus
    const path = buildPath(focusNode, rootNode);
    window.updateBreadcrumbs(path);
  }

  // Listen for breadcrumb navigation events
  const breadcrumbHandler = (e) => {
    const targetNode = e.detail.node;
    if (targetNode) {
      // Zoom to the target node
      zoom({ altKey: false }, targetNode);
    }
  };

  const resetHandler = () => {
    // Reset to root view
    zoom({ altKey: false }, root);
  };

  // Add event listeners
  window.addEventListener('breadcrumbNavigate', breadcrumbHandler);
  window.addEventListener('resetVisualization', resetHandler);

  // Cleanup function (called when visualization changes)
  const cleanup = () => {
    window.removeEventListener('breadcrumbNavigate', breadcrumbHandler);
    window.removeEventListener('resetVisualization', resetHandler);
  };

  // Store cleanup function for next render
  if (window._circlePackingCleanup) {
    window._circlePackingCleanup();
  }
  window._circlePackingCleanup = cleanup;
}
