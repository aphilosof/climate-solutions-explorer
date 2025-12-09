/**
 * treemap.js
 * Treemap visualization with drill-down, side panel, and responsive features
 */

import { showSidePanel } from '../utilities.js';

export function renderTreemap(data, showTooltip, hideTooltip) {
  const container = document.getElementById('visualization');
  let width = container.clientWidth;
  let height = container.clientHeight;

  if (!width || !height) return;

  d3.select('#visualization').selectAll('*').remove();

  // Create breadcrumb navigation
  const breadcrumbContainer = d3.select('#visualization')
    .append('div')
    .attr('class', 'treemap-breadcrumb')
    .style('padding', '10px 20px')
    .style('background', 'rgba(0, 0, 0, 0.5)')
    .style('color', 'white')
    .style('font-size', '14px')
    .style('font-weight', '500')
    .style('display', 'flex')
    .style('align-items', 'center')
    .style('gap', '8px')
    .style('flex-wrap', 'wrap');

  const svg = d3.select('#visualization')
    .append('svg')
    .attr('width', width)
    .attr('height', height - 44)  // Adjust for breadcrumb height
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
  function getNodeColor(node, viewRoot = root) {
    // Get category name from stored tag (set during initial hierarchy build)
    let categoryName = node.data._category;

    // If viewing from root, check if this IS a depth-1 category
    if (viewRoot === root && node.depth === 1) {
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
    const categoryDepth = viewRoot === root ? 1 : 0;
    const relativeDepth = node.depth - categoryDepth;

    // If this IS the category node, use base color
    if (relativeDepth === 0) {
      return baseColor;
    }

    // For cluster nodes, use a lighter, more muted shade of the category color
    if (node.data._isCluster) {
      const hsl = d3.hsl(baseColor);
      // EXTRA gentle for cluster at root level - should look like ghost/background
      if (viewRoot === root) {
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

  const breadcrumbHeight = 44;
  const treemap = d3.treemap()
    .size([width, height - breadcrumbHeight])
    .padding(2)
    .round(true);

  const root = d3.hierarchy(data)
    .sum(d => (!d.children || d.children.length === 0) ? 1 : 0)
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
  let frozenTooltipNode = null;
  let tooltipFreezeTimer = null;
  let wasDragging = false;
  let currentRoot = root;  // Track current drill-down level
  let navigationStack = [];  // Track drill-down history for back navigation

  const g = svg.append('g');

  // Update breadcrumb navigation
  function updateBreadcrumb() {
    // Build full path: navigationStack + currentRoot
    const path = [...navigationStack, currentRoot];

    // Clear existing breadcrumb
    breadcrumbContainer.selectAll('*').remove();

    // Add breadcrumb items
    path.forEach((node, index) => {
      // Add separator arrow (except for first item)
      if (index > 0) {
        breadcrumbContainer.append('span')
          .style('color', 'rgba(255, 255, 255, 0.6)')
          .text('→');
      }

      // Add breadcrumb link
      const isLast = index === path.length - 1;
      const crumb = breadcrumbContainer.append('span')
        .style('cursor', isLast ? 'default' : 'pointer')
        .style('color', isLast ? 'white' : 'rgba(255, 255, 255, 0.8)')
        .style('text-decoration', isLast ? 'none' : 'none')
        .style('font-weight', isLast ? 'bold' : 'normal')
        .text(node.data.name || 'Root')
        .on('mouseover', function() {
          if (!isLast) {
            d3.select(this)
              .style('color', 'white')
              .style('text-decoration', 'underline');
          }
        })
        .on('mouseout', function() {
          if (!isLast) {
            d3.select(this)
              .style('color', 'rgba(255, 255, 255, 0.8)')
              .style('text-decoration', 'none');
          }
        });

      // Make clickable if not the last item
      if (!isLast) {
        crumb.on('click', () => {
          // Navigate to this level by popping stack until we reach it
          while (navigationStack.length > index) {
            navigationStack.pop();
          }
          drillDown(node, true);  // true = isBackNavigation
        });
      }
    });
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
          return node === root ? 0.35 : 0.65;
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
        const items = d.data?.urls || d.data?.content || d.data?.items || [];
        return (d.children || items.length > 0) ? 'pointer' : 'default';
      })
      .on('mouseover', function(event, d) {
        // Clear any frozen tooltip to allow new ones to show
        if (frozenTooltipNode) {
          if (tooltipFreezeTimer) clearTimeout(tooltipFreezeTimer);
          frozenTooltipNode = null;
        }

        // Highlight on hover
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

        // Check children FIRST to match click handler behavior
        if (d.children) {
          // Parent category - show subcategory count
          const numChildren = d.children.length;
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

        // Reset stroke based on node type
        const relativeDepth = d.depth - node.depth;
        const isDepth1Parent = relativeDepth === 1 && d.children;
        const defaultStroke = isDepth1Parent ? 'rgba(255, 255, 255, 0.6)' : 'rgba(255, 255, 255, 0.2)';
        const defaultStrokeWidth = isDepth1Parent ? 2 : 0.5;

        d3.select(this)
          .attr('stroke', isMatch ? '#cc0000' : defaultStroke)
          .attr('stroke-width', isMatch ? 2 : defaultStrokeWidth);

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

        // SPECIAL CASE: At root level, clicking anywhere should zoom into the depth-1 category
        if (currentRoot === root && d.depth >= 1) {
          // Check if this is a cluster node first (should open side panel, not zoom)
          if (d.data._isCluster) {
            const syntheticNode = {
              data: {
                name: d.data.name,
                urls: items
              }
            };
            showSidePanel(sidePanel, syntheticNode);
            event.stopPropagation();
            return;
          }

          // For any other node, find the depth-1 ancestor and zoom into it
          let ancestor = d;
          while (ancestor.depth > 1) {
            ancestor = ancestor.parent;
          }
          // Now ancestor is at depth 1 (or is d itself if d.depth === 1)
          drillDown(ancestor);
          event.stopPropagation();
          return;
        }

        // Check if this is a cluster node (for zoomed-in views)
        if (d.data._isCluster) {
          // Cluster node: open side panel with all clustered content
          const syntheticNode = {
            data: {
              name: d.data.name,
              urls: items
            }
          };
          showSidePanel(sidePanel, syntheticNode);
        } else if (d.children && d.children.length > 0) {
          // Parent node: drill down to this level
          drillDown(d);
        } else if (items && items.length > 0) {
          // Terminal leaf with content: directly open side panel
          showSidePanel(sidePanel, d);
        } else if (d.data.url) {
          // Leaf node with single URL: open it
          window.open(d.data.url, '_blank');
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
        const name = d.data.name || d.data.entity_name || '';
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
  window.addEventListener('resetVisualization', resetHandler);
  window.addEventListener('goUpLevel', upHandler);

  // Clean up event listeners on window resize (when visualization is re-rendered)
  const cleanupHandlers = () => {
    window.removeEventListener('resetVisualization', resetHandler);
    window.removeEventListener('goUpLevel', upHandler);
  };

  // Handle window resize with debounce
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      // Update dimensions
      width = container.clientWidth;
      height = container.clientHeight;

      if (!width || !height) return;

      // Update SVG size
      svg.attr('width', width).attr('height', height - breadcrumbHeight);

      // Update treemap size and recalculate
      treemap.size([width, height - breadcrumbHeight]);

      // Recalculate current root
      const newRoot = d3.hierarchy(currentRoot.data)
        .sum(d => (!d.children || d.children.length === 0) ? 1 : 0)
        .sort((a, b) => b.value - a.value);

      treemap(newRoot);
      render(newRoot);
    }, 150); // Debounce 150ms
  });

  // Initialize with root view
  render(root);
}
