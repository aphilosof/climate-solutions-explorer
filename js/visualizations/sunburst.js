/**
 * sunburst.js
 * Sunburst (Radial Partition) visualization with circlePacking-style interactions
 */

import { showSidePanel } from '../utilities.js';

export function renderSunburst(data, showTooltip, hideTooltip) {
  const container = document.getElementById('visualization');
  let width = container.clientWidth;
  let height = container.clientHeight;
  let radius = Math.min(width, height) / 2;

  if (!width || !height) return;

  d3.select('#visualization').selectAll('*').remove();

  const svg = d3.select('#visualization')
    .append('svg')
    .attr('width', width)
    .attr('height', height);

  const g = svg.append('g')
    .attr('transform', `translate(${width / 2},${height / 2})`);

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

  const partition = d3.partition()
    .size([2 * Math.PI, radius]);

  const root = d3.hierarchy(data)
    .sum(d => d.children ? 0 : 1);

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

  // Helper function to cluster terminal nodes for any parent (≥3 terminals)
  function clusterTerminalNodes(parentNode) {
    if (!parentNode.children) return;

    const terminals = parentNode.children.filter(child =>
      !child.children || child.children.length === 0
    );
    const categories = parentNode.children.filter(child =>
      child.children && child.children.length > 0
    );

    // Only cluster if 3 or more terminal nodes (more aggressive clustering)
    if (terminals.length >= 3) {
      // Aggregate all URLs from terminal nodes
      const aggregatedURLs = [];
      terminals.forEach(terminal => {
        const items = terminal.data?.urls || terminal.data?.content || terminal.data?.items || [];
        aggregatedURLs.push(...items);
      });

      const clusterData = {
        name: `Other Solutions (${terminals.length})`,
        _isCluster: true,
        _isTerminalCluster: true,
        urls: aggregatedURLs // Store aggregated URLs for side panel
      };
      const clusterNode = d3.hierarchy(clusterData);
      clusterNode._clusteredLeaves = terminals; // Store original terminal nodes
      clusterNode.data._isCluster = true;
      clusterNode.parent = parentNode;
      clusterNode.depth = parentNode.depth + 1;
      clusterNode.height = 0;

      // Replace children with categories + cluster
      parentNode.children = [...categories, clusterNode];
    }
  }

  // Apply clustering recursively to all levels
  function applyClusteringRecursive(node) {
    if (!node.children) return;

    // First, recursively apply to all children (depth-first)
    node.children.forEach(child => applyClusteringRecursive(child));

    // Then cluster this node's terminal children
    clusterTerminalNodes(node);
  }

  applyClusteringRecursive(root);

  partition(root);

  // Store original partition coordinates for reset functionality
  root.descendants().forEach(d => {
    d.x0_orig = d.x0;
    d.x1_orig = d.x1;
    d.y0_orig = d.y0;
    d.y1_orig = d.y1;
  });

  const arc = d3.arc()
    .startAngle(d => d.x0)
    .endAngle(d => d.x1)
    .innerRadius(d => d.y0)
    .outerRadius(d => d.y1);

  // Tooltip state management
  let frozenTooltipNode = null;
  let tooltipFreezeTimer = null;
  let wasDragging = false;  // Track dragging to prevent accidental clicks
  let focus = root;  // Track currently focused node

  const path = g.selectAll('path')
    .data(root.descendants().filter(d => d.depth > 0))
    .join('path')
    .attr('fill', d => {
      // Check if node matches any filter (search, type, tag, author, location)
      const isMatch = d.data.isSearchMatch || d.data.isTypeMatch || d.data.isTagMatch ||
                      d.data.isAuthorMatch || d.data.isLocationMatch || d.data.isDateMatch;

      // Highlight matches in red
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
    .attr('d', arc)
    .attr('stroke', d => {
      // Check if node matches any filter
      const isMatch = d.data.isSearchMatch || d.data.isTypeMatch || d.data.isTagMatch ||
                      d.data.isAuthorMatch || d.data.isLocationMatch || d.data.isDateMatch;

      // Cluster nodes get distinctive dashed border
      if (d.data._isCluster) return 'rgba(255, 255, 255, 0.5)';
      return isMatch ? '#cc0000' : 'rgba(255, 255, 255, 0.2)';
    })
    .attr('stroke-width', d => {
      // Check if node matches any filter
      const isMatch = d.data.isSearchMatch || d.data.isTypeMatch || d.data.isTagMatch ||
                      d.data.isAuthorMatch || d.data.isLocationMatch || d.data.isDateMatch;

      // Cluster nodes get thicker border
      if (d.data._isCluster) return 2;
      return isMatch ? 2 : 1;
    })
    .attr('stroke-dasharray', d => d.data._isCluster ? '5,3' : null)
    .style('cursor', d => {
      const items = d.data?.urls || d.data?.content || d.data?.items || [];
      return (d.data._isCluster || d.children || items.length > 0) ? 'pointer' : 'default';
    })
    .on('mouseover', function(event, d) {
      // Clear any frozen tooltip to allow new ones to show
      if (frozenTooltipNode) {
        if (tooltipFreezeTimer) clearTimeout(tooltipFreezeTimer);
        frozenTooltipNode = null;
      }

      // Highlight arc on hover
      d3.select(this).attr('stroke', '#000').attr('stroke-width', 3);

      const tooltip = d3.select('#tooltip');
      const name = d.data.name || d.data.entity_name || '';
      const items = d.data?.urls || d.data?.content || d.data?.items || [];

      // Show tooltip near cursor
      tooltip
        .datum(d)
        .style('display', 'block')
        .style('visibility', 'visible')
        .style('opacity', '1')
        .style('pointer-events', 'none')
        .style('left', (event.pageX + 5) + 'px')
        .style('top', (event.pageY - 35) + 'px');

      // Handle cluster nodes specially - show aggregated item count
      if (d.data._isCluster) {
        tooltip.html(`
          <div style="font-weight: bold; margin-bottom: 4px;">${name}</div>
          <div style="font-size: 12px; color: #666;">
            📋 ${items.length} solution${items.length === 1 ? '' : 's'} - Click to view list
          </div>
        `);
      } else if (d.children) {
        // Check if children are actual subcategories (with their own children) or just terminal nodes
        const hasRealSubcategories = d.children.some(child => child.children && child.children.length > 0);

        if (hasRealSubcategories) {
          // Has actual subcategories - will zoom in
          const numChildren = d.children.length;
          tooltip.html(`
            <div style="font-weight: bold; margin-bottom: 4px;">${name}</div>
            <div style="font-size: 12px; color: #666;">
              🔍 ${numChildren} subcategor${numChildren === 1 ? 'y' : 'ies'} - Click to zoom in
            </div>
          `);
        } else {
          // Only has terminal nodes - count total solutions across all children
          let totalSolutions = 0;
          d.children.forEach(child => {
            const childItems = child.data?.urls || child.data?.content || child.data?.items || [];
            totalSolutions += childItems.length;
          });
          tooltip.html(`
            <div style="font-weight: bold; margin-bottom: 4px;">${name}</div>
            <div style="font-size: 12px; color: #666;">
              📋 ${totalSolutions} solution${totalSolutions === 1 ? '' : 's'} - Click to view list
            </div>
          `);
        }
      } else if (items.length > 0) {
        // Terminal leaf with items - show item count
        tooltip.html(`
          <div style="font-weight: bold; margin-bottom: 4px;">${name}</div>
          <div style="font-size: 12px; color: #666;">
            📋 ${items.length} solution${items.length === 1 ? '' : 's'} - Click to view list
          </div>
        `);
      } else {
        // Empty node - just show name
        tooltip.html(`
          <div style="font-weight: bold; margin-bottom: 4px;">${name}</div>
        `);
      }

      // Freeze tooltip and make it clickable
      frozenTooltipNode = d;
      tooltip.style('pointer-events', 'auto');

      if (tooltipFreezeTimer) clearTimeout(tooltipFreezeTimer);
      tooltipFreezeTimer = setTimeout(() => {
        frozenTooltipNode = null;
        tooltip
          .style('display', 'none')
          .style('pointer-events', 'none');
      }, 3000);
    })
    .on('mouseout', function(event, d) {
      // Check if node matches any filter
      const isMatch = d.data.isSearchMatch || d.data.isTypeMatch || d.data.isTagMatch ||
                      d.data.isAuthorMatch || d.data.isLocationMatch || d.data.isDateMatch;

      // Reset stroke
      d3.select(this).attr('stroke', isMatch ? '#cc0000' : 'rgba(255, 255, 255, 0.2)')
        .attr('stroke-width', isMatch ? 2 : 1);

      // Only hide tooltip if not frozen
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
      const items = d.data?.urls || d.data?.content || d.data?.items || [];

      // Handle cluster nodes specially - always open side panel with aggregated URLs
      if (d.data._isCluster) {
        showSidePanel(sidePanel, d);
        event.stopPropagation();
        return;
      }

      const hasChildren = d.children && d.children.length > 0;

      if (hasChildren) {
        // Parent node: zoom/focus on this arc
        zoomToNode(d);
      } else if (items && items.length > 0) {
        // Terminal leaf with content: directly open side panel
        showSidePanel(sidePanel, d);
      } else if (d.data.url) {
        // Leaf node with single URL: open it
        window.open(d.data.url, '_blank');
      }

      event.stopPropagation();
    });

  // Add text labels to arcs
  const labels = g.selectAll('text')
    .data(root.descendants().filter(d => d.depth > 0))
    .join('text')
    .attr('transform', d => {
      // Calculate arc centroid for text position
      const angle = (d.x0 + d.x1) / 2;
      const radius = (d.y0 + d.y1) / 2;
      const x = Math.sin(angle) * radius;
      const y = -Math.cos(angle) * radius;

      // Rotate text to align with arc
      // Flip text on left side for readability
      const rotation = (angle * 180 / Math.PI - 90);
      const finalRotation = rotation > 90 ? rotation + 180 : rotation;

      return `translate(${x},${y}) rotate(${finalRotation})`;
    })
    .attr('text-anchor', 'middle')
    .attr('dy', '0.35em')
    .style('font-size', d => {
      // Font size based on radial depth and angular width
      const arcWidth = (d.x1 - d.x0) * radius;
      const arcHeight = d.y1 - d.y0;
      return Math.max(8, Math.min(14, Math.min(arcWidth / 6, arcHeight / 3))) + 'px';
    })
    .style('fill', 'white')
    .style('pointer-events', 'none')
    .style('user-select', 'none')
    .style('font-weight', '500')
    .text(d => {
      // Hide cluster node labels (keep category labels)
      if (d.data._isCluster) return '';

      // At root view: only show root (depth 0) and first circle (depth 1) labels
      if (focus === root) {
        if (d.depth > 1) return ''; // Hide depth 2+ at root view
      } else {
        // When zoomed in: only show labels for focus and its direct children
        // Calculate relative depth from focus
        const relativeDepth = d.depth - focus.depth;
        if (relativeDepth > 1) return ''; // Hide nodes more than 1 level deeper than focus
        if (relativeDepth < 0) return ''; // Hide ancestors
      }

      // Only show text if arc is large enough
      const arcAngle = d.x1 - d.x0;
      const arcHeight = d.y1 - d.y0;

      if (arcAngle < 0.05 || arcHeight < 15) return ''; // Too small

      const name = d.data.name || d.data.entity_name || '';

      // Truncate text to fit arc width
      const arcWidth = arcAngle * radius;
      const fontSize = Math.max(8, Math.min(14, Math.min(arcWidth / 6, arcHeight / 3)));
      const charWidth = fontSize * 0.6;
      const maxChars = Math.floor(arcWidth / charWidth);

      if (maxChars < 3) return '';
      if (name.length > maxChars) {
        return name.substring(0, maxChars - 1) + '…';
      }
      return name;
    });

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
    });

  // Click center circle to show root's terminal nodes cluster or zoom out to root
  g.append('circle')
    .attr('r', radius * 0.15)
    .attr('fill', '#40916c')
    .attr('fill-opacity', 0.3)
    .attr('stroke', '#40916c')
    .attr('stroke-width', 2)
    .style('cursor', 'pointer')
    .on('mouseover', function(event) {
      // Highlight center circle on hover
      d3.select(this)
        .attr('fill-opacity', 0.5)
        .attr('stroke-width', 3);

      // Show tooltip
      const tooltip = d3.select('#tooltip');
      const clusterNode = root.children?.find(child => child.data._isCluster);

      if (focus === root && clusterNode) {
        const items = clusterNode.data?.urls || [];
        tooltip
          .style('display', 'block')
          .style('visibility', 'visible')
          .style('opacity', '1')
          .style('pointer-events', 'none')
          .style('left', (event.pageX + 5) + 'px')
          .style('top', (event.pageY - 35) + 'px')
          .html(`
            <div style="font-weight: bold; margin-bottom: 4px;">Climate Solutions</div>
            <div style="font-size: 12px; color: #666;">
              📋 ${items.length} root solution${items.length === 1 ? '' : 's'} - Click to view list
            </div>
          `);
      } else {
        tooltip
          .style('display', 'block')
          .style('visibility', 'visible')
          .style('opacity', '1')
          .style('pointer-events', 'none')
          .style('left', (event.pageX + 5) + 'px')
          .style('top', (event.pageY - 35) + 'px')
          .html(`
            <div style="font-weight: bold; margin-bottom: 4px;">Climate Solutions</div>
            <div style="font-size: 12px; color: #666;">
              ⬆️ Click to zoom out to root view
            </div>
          `);
      }
    })
    .on('mouseout', function() {
      // Reset center circle appearance
      d3.select(this)
        .attr('fill-opacity', 0.3)
        .attr('stroke-width', 2);

      // Hide tooltip
      d3.select('#tooltip')
        .style('display', 'none')
        .style('pointer-events', 'none');
    })
    .on('click', () => {
      if (!wasDragging) {
        // Check if we're currently at root view
        if (focus === root) {
          // Find the cluster node in root's children (if it exists)
          const clusterNode = root.children?.find(child => child.data._isCluster);
          if (clusterNode) {
            // Open side panel with root's terminal nodes
            const sidePanel = document.getElementById('sidePanel');
            showSidePanel(sidePanel, clusterNode);
          }
        } else {
          // Zoom back to root
          zoomToNode(root);
        }
      }
    });

  // Add "Climate Solution" text label to center circle (only visible at root view)
  const centerLabel = g.append('text')
    .attr('text-anchor', 'middle')
    .attr('dy', '0.35em')
    .style('font-size', '14px')
    .style('font-weight', 'bold')
    .style('fill', '#40916c')
    .style('pointer-events', 'none')
    .style('user-select', 'none')
    .text('Climate Solutions');

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
  function updateBreadcrumbsForSunburst(focusNode, rootNode) {
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
      zoomToNode(targetNode);
    }
  };

  // Listen for reset event from global home button
  const resetHandler = () => {
    zoomToNode(root);
  };

  // Listen for up event from global up button
  const upHandler = () => {
    if (focus.parent) {
      zoomToNode(focus.parent);
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
  };

  // Store cleanup function for next render
  if (window._sunburstCleanup) {
    window._sunburstCleanup();
  }
  window._sunburstCleanup = cleanup;

  // Zoom/focus function - actually zoom/transform arcs
  function zoomToNode(p) {
    focus = p;

    const transition = g.transition()
      .duration(750);

    // Hide center label when zoomed in, show when at root
    centerLabel.transition(transition)
      .style('opacity', p === root ? 1 : 0);

    // Calculate radial scale based on available space and deepest descendant
    let scale;

    if (p === root) {
      // When resetting to root, use no scaling (scale = 1)
      scale = 1;
    } else {
      // Find maximum outer radius among all descendants to ensure everything fits
      let maxRadius = p.y1;
      p.descendants().forEach(d => {
        if (d.y1 > maxRadius) maxRadius = d.y1;
      });

      // Scale so the full subtree fits within 90% of viewport (leaving margin)
      const availableRadius = radius * 0.9;
      scale = availableRadius / (maxRadius - p.y0);
    }

    // Pre-calculate target positions for all nodes
    root.descendants().forEach(d => {
      if (p === root) {
        // Reset to original partition values
        d.targetX0 = d.x0_orig;
        d.targetX1 = d.x1_orig;
        d.targetY0 = d.y0_orig;
        d.targetY1 = d.y1_orig;
      } else {
        // Zoom into focused node
        d.targetX0 = Math.max(0, Math.min(1, (d.x0_orig - p.x0_orig) / (p.x1_orig - p.x0_orig))) * 2 * Math.PI;
        d.targetX1 = Math.max(0, Math.min(1, (d.x1_orig - p.x0_orig) / (p.x1_orig - p.x0_orig))) * 2 * Math.PI;
        d.targetY0 = Math.max(0, (d.y0_orig - p.y0_orig) * scale);
        d.targetY1 = (d.y1_orig - p.y0_orig) * scale;
      }
    });

    path.transition(transition)
      .attrTween('d', d => {
        const xInterpolate = d3.interpolate(d.x0, d.targetX0);
        const x1Interpolate = d3.interpolate(d.x1, d.targetX1);
        const yInterpolate = d3.interpolate(d.y0, d.targetY0);
        const y1Interpolate = d3.interpolate(d.y1, d.targetY1);

        return t => {
          d.x0 = xInterpolate(t);
          d.x1 = x1Interpolate(t);
          d.y0 = yInterpolate(t);
          d.y1 = y1Interpolate(t);
          return arc(d);
        };
      })
      .style('opacity', d => {
        // Hide arcs not in focus path
        const isFocusPath = (d === p) || isAncestor(d, p) || isDescendant(d, p);
        return isFocusPath ? 1 : 0;
      })
      .attr('pointer-events', d => {
        // Only enable pointer events for visible arcs
        const isFocusPath = (d === p) || isAncestor(d, p) || isDescendant(d, p);
        return isFocusPath ? null : 'none';
      });

    // Update labels during zoom transition - use TARGET positions
    labels
      .style('font-size', d => {
        // Calculate based on TARGET arc size (after zoom)
        const arcWidth = (d.targetX1 - d.targetX0) * radius;
        const arcHeight = d.targetY1 - d.targetY0;
        // Use larger font sizes when zoomed in (based on scale)
        const maxFont = p === root ? 14 : Math.min(18, 14 * Math.sqrt(scale));
        return Math.max(8, Math.min(maxFont, Math.min(arcWidth / 6, arcHeight / 3))) + 'px';
      })
      .text(d => {
        // Hide cluster node labels (keep category labels)
        if (d.data._isCluster) return '';

        // At root view: only show root (depth 0) and first circle (depth 1) labels
        if (p === root) {
          if (d.depth > 1) return ''; // Hide depth 2+ at root view
        } else {
          // When zoomed in: only show labels for focus and its direct children
          // Calculate relative depth from focus
          const relativeDepth = d.depth - p.depth;
          if (relativeDepth > 1) return ''; // Hide nodes more than 1 level deeper than focus
          if (relativeDepth < 0) return ''; // Hide ancestors
        }

        // Calculate visibility based on TARGET arc size (after zoom)
        const arcAngle = d.targetX1 - d.targetX0;
        const arcHeight = d.targetY1 - d.targetY0;

        // More lenient thresholds when zoomed in
        const minAngle = p === root ? 0.05 : 0.02;
        const minHeight = p === root ? 15 : 8;

        if (arcAngle < minAngle || arcHeight < minHeight) return '';

        const name = d.data.name || d.data.entity_name || '';
        const arcWidth = arcAngle * radius;
        const maxFont = p === root ? 14 : Math.min(18, 14 * Math.sqrt(scale));
        const fontSize = Math.max(8, Math.min(maxFont, Math.min(arcWidth / 6, arcHeight / 3)));
        const charWidth = fontSize * 0.6;
        const maxChars = Math.floor(arcWidth / charWidth);

        if (maxChars < 3) return '';
        if (name.length > maxChars) {
          return name.substring(0, maxChars - 1) + '…';
        }
        return name;
      })
      .transition(transition)
      .attr('transform', d => {
        // Animate to target position
        const angle = (d.targetX0 + d.targetX1) / 2;
        const r = (d.targetY0 + d.targetY1) / 2;
        const x = Math.sin(angle) * r;
        const y = -Math.cos(angle) * r;

        const rotation = (angle * 180 / Math.PI - 90);
        const finalRotation = rotation > 90 ? rotation + 180 : rotation;

        return `translate(${x},${y}) rotate(${finalRotation})`;
      })
      .style('opacity', d => {
        // Match arc opacity - hide labels for non-focused arcs
        const isFocusPath = (d === p) || isAncestor(d, p) || isDescendant(d, p);
        return isFocusPath ? 1 : 0;
      });

    // Update breadcrumbs when zooming
    updateBreadcrumbsForSunburst(p, root);
  }

  // Check if node d is an ancestor of node target
  function isAncestor(d, target) {
    let current = target.parent;
    while (current) {
      if (current === d) return true;
      current = current.parent;
    }
    return false;
  }

  // Check if node d is a descendant of node target
  function isDescendant(d, target) {
    let current = d.parent;
    while (current) {
      if (current === target) return true;
      current = current.parent;
    }
    return false;
  }

  // Handle window resize with debounce
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      // Update dimensions
      width = container.clientWidth;
      height = container.clientHeight;
      radius = Math.min(width, height) / 2;

      if (!width || !height) return;

      // Update SVG size
      svg.attr('width', width).attr('height', height);

      // Update center translation
      g.attr('transform', `translate(${width / 2},${height / 2})`);

      // Update partition size and recalculate
      partition.size([2 * Math.PI, radius]);
      partition(root);

      // Update arc paths with new positions
      path.attr('d', arc);

      // Update labels with new positions and sizes
      labels
        .attr('transform', d => {
          const angle = (d.x0 + d.x1) / 2;
          const r = (d.y0 + d.y1) / 2;
          const x = Math.sin(angle) * r;
          const y = -Math.cos(angle) * r;
          const rotation = (angle * 180 / Math.PI - 90);
          const finalRotation = rotation > 90 ? rotation + 180 : rotation;
          return `translate(${x},${y}) rotate(${finalRotation})`;
        })
        .style('font-size', d => {
          const arcWidth = (d.x1 - d.x0) * radius;
          const arcHeight = d.y1 - d.y0;
          return Math.max(8, Math.min(14, Math.min(arcWidth / 6, arcHeight / 3))) + 'px';
        })
        .text(d => {
          // Hide cluster node labels (keep category labels)
          if (d.data._isCluster) return '';

          // At root view: only show root (depth 0) and first circle (depth 1) labels
          if (focus === root) {
            if (d.depth > 1) return ''; // Hide depth 2+ at root view
          } else {
            // When zoomed in: only show labels for focus and its direct children
            // Calculate relative depth from focus
            const relativeDepth = d.depth - focus.depth;
            if (relativeDepth > 1) return ''; // Hide nodes more than 1 level deeper than focus
            if (relativeDepth < 0) return ''; // Hide ancestors
          }

          const arcAngle = d.x1 - d.x0;
          const arcHeight = d.y1 - d.y0;

          if (arcAngle < 0.05 || arcHeight < 15) return '';
          const name = d.data.name || d.data.entity_name || '';
          const arcWidth = arcAngle * radius;
          const fontSize = Math.max(8, Math.min(14, Math.min(arcWidth / 6, arcHeight / 3)));
          const charWidth = fontSize * 0.6;
          const maxChars = Math.floor(arcWidth / charWidth);
          if (maxChars < 3) return '';
          if (name.length > maxChars) {
            return name.substring(0, maxChars - 1) + '…';
          }
          return name;
        });

      // Update center circle radius
      svg.select('circle')
        .attr('r', radius * 0.15);

      // Update zoom controls position (responsive)
      const isMobileResize = width < 768;
      if (isMobileResize) {
        zoomControls
          .style('left', '50%')
          .style('bottom', '5px')
          .style('top', null)
          .style('transform', 'translateX(-50%)')
          .style('flex-direction', 'row')
          .style('background', 'rgba(0, 0, 0, 0.3)')
          .style('padding', '6px')
          .style('border-radius', '8px');
      } else {
        zoomControls
          .style('left', '20px')
          .style('top', '50%')
          .style('bottom', null)
          .style('transform', 'translateY(-50%)')
          .style('flex-direction', 'column')
          .style('background', null)
          .style('padding', null)
          .style('border-radius', null);
      }

      // Re-apply current zoom state
      zoomToNode(focus);
    }, 150); // Debounce 150ms
  });
}
