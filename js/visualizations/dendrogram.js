/**
 * dendrogram.js
 * Enhanced Dendrogram (Tree) visualization with sunburst-style zoom and label handling
 */

import { showSidePanel } from '../utilities.js';

export function renderDendrogram(data, showTooltip, hideTooltip) {
  const container = document.getElementById('visualization');
  let width = container.clientWidth;
  let height = container.clientHeight;

  if (!width || !height) return;

  d3.select('#visualization').selectAll('*').remove();

  const svg = d3.select('#visualization')
    .append('svg')
    .attr('width', width)
    .attr('height', height)
    .style('display', 'block');

  // Margins
  const margin = { top: 20, right: 120, bottom: 20, left: 80 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const g = svg.append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

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
      if (!node.children && !node._children) {
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

  // Tree layout - horizontal with dynamic spacing that scales with viewport
  const tree = d3.tree()
    .size([innerHeight * 0.9, innerWidth * 0.7])  // Use more of available space
    .separation((a, b) => {
      // Dynamic spacing based on viewport height - scales automatically
      const viewportScale = Math.max(innerHeight / 600, 1); // Scale factor based on viewport
      const baseSpacing = a.parent === b.parent ? 2.5 : 3.5; // Increased base spacing
      const depthMultiplier = Math.max(a.depth, b.depth) * 0.8;  // More spacing at deeper levels
      return (baseSpacing + depthMultiplier) * viewportScale;  // Scales with viewport
    });

  const root = d3.hierarchy(data);

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

  // FIRST: Create cluster node for root's terminal leaves
  if (root.children) {
    const terminalLeaves = root.children.filter(child => !child.children || child.children.length === 0);
    const depthOneCategories = root.children.filter(child => child.children && child.children.length > 0);

    if (terminalLeaves.length > 0) {
      // Create cluster node for terminal leaves
      const clusterData = {
        name: `Other Solutions (${terminalLeaves.length})`,
        _isCluster: true
      };
      const clusterNode = d3.hierarchy(clusterData);
      clusterNode._clusteredLeaves = terminalLeaves; // Store actual leaves
      clusterNode.data._isCluster = true;

      // CRITICAL: Set parent reference and depth for proper link creation
      clusterNode.parent = root;
      clusterNode.depth = 1;
      clusterNode.height = 0;

      // Replace root's children: depth-1 categories + cluster node
      root.children = [...depthOneCategories, clusterNode];
    }
  }

  // Initialize with only depth 1 visible (root + main categories + cluster)
  root.descendants().forEach(d => {
    d._descendantCount = d.descendants().length - 1; // Count for sizing
    if (d.children) {
      d._children = d.children; // Store for collapse/expand
      // Collapse all children of depth-1 nodes (hide depth 2+)
      if (d.depth >= 1 && !d.data._isCluster) {
        d.children = null;
      }
    }
  });

  // Initialize starting positions for transitions
  root.x0 = innerHeight / 2;
  root.y0 = 0;

  // State
  let i = 0; // Unique node ID counter for D3 enter/exit
  let frozenTooltipNode = null;
  let tooltipFreezeTimer = null;
  let wasDragging = false;
  let focusNode = root; // Track currently focused node for zoom-to-path (FIX #3)

  // Create link generator with null safety
  const linkGenerator = d3.linkHorizontal()
    .x(d => d ? d.y : 0)
    .y(d => d ? d.x : 0);

  // Helper function to recursively hide/show node and all descendants
  function setHiddenRecursive(node, hidden) {
    node._hiddenBySiblingSelection = hidden;
    if (node.children) {
      node.children.forEach(child => setHiddenRecursive(child, hidden));
    }
    if (node._children) {
      node._children.forEach(child => setHiddenRecursive(child, hidden));
    }
  }

  // Helper function to cluster terminal nodes for any parent (>5 terminals)
  function clusterTerminalNodes(parentNode) {
    if (!parentNode.children) return;

    // Check both .children and ._children to identify categories (collapsed nodes have ._children)
    const terminals = parentNode.children.filter(child =>
      (!child.children || child.children.length === 0) && (!child._children || child._children.length === 0)
    );
    const categories = parentNode.children.filter(child =>
      (child.children && child.children.length > 0) || (child._children && child._children.length > 0)
    );

    // Only cluster if more than 5 terminal nodes
    if (terminals.length > 5) {
      const clusterData = {
        name: `Other Solutions (${terminals.length})`,
        _isCluster: true,
        _isTerminalCluster: true
      };
      const clusterNode = d3.hierarchy(clusterData);
      clusterNode._clusteredLeaves = terminals;
      clusterNode.data._isCluster = true;
      clusterNode.parent = parentNode;
      clusterNode.depth = parentNode.depth + 1;
      clusterNode.height = 0;

      // Replace children with categories + cluster
      parentNode.children = [...categories, clusterNode];
    }
  }

  // Initial render
  update(root);

  // Update function - proper D3 tree pattern with enter/exit/update
  function update(source) {
    // Recalculate tree layout
    const treeData = tree(root);
    let nodes = treeData.descendants();
    let links = treeData.links();

    // Filter out nodes hidden by sibling selection
    nodes = nodes.filter(d => !d._hiddenBySiblingSelection);
    links = links.filter(d => !d.source._hiddenBySiblingSelection && !d.target._hiddenBySiblingSelection);

    // Calculate initial bounds to find maxX
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    nodes.forEach(d => {
      if (!d.data._isCluster) { // Exclude cluster for initial bounds
        minX = Math.min(minX, d.x);
        maxX = Math.max(maxX, d.x);
        minY = Math.min(minY, d.y);
        maxY = Math.max(maxY, d.y);
      }
    });

    // Position cluster node CLOSER to bottom category and near root
    nodes.forEach(d => {
      if (d.data._isCluster && d.depth === 1) {
        // Move closer to bottom category (x is vertical in horizontal layout)
        d.x = maxX + 18; // Closer to bottom node for shorter link
        // Position VERY close to root horizontally (Y is horizontal in horizontal tree)
        d.y = minY + 70; // Slightly closer to root
      }
    });

    // Recalculate bounds including cluster
    minX = Infinity;
    maxX = -Infinity;
    minY = Infinity;
    maxY = -Infinity;
    nodes.forEach(d => {
      minX = Math.min(minX, d.x);
      maxX = Math.max(maxX, d.x);
      minY = Math.min(minY, d.y);
      maxY = Math.max(maxY, d.y);
    });

    const treeWidth = maxY - minY;
    const treeHeight = maxX - minX;

    // Calculate scale to fit tree in viewport with padding (0.85 = 85% use of viewport)
    const scaleX = treeWidth > 0 ? (innerWidth * 0.85) / treeWidth : 1;
    const scaleY = treeHeight > 0 ? (innerHeight * 0.85) / treeHeight : 1;
    const scale = Math.min(scaleX, scaleY, 1);

    // SMART SIZING: Calculate overlap prevention factor
    const depth1Nodes = nodes.filter(d => d.depth === 1 && !d.data._isCluster);
    const avgSpacing = depth1Nodes.length > 1
      ? (maxX - minX) / (depth1Nodes.length - 1)
      : innerHeight;

    // Calculate proportional sizes first, then check for overlap
    // Smart scaling: sqrt keeps growth manageable as content increases
    const calculateProportionalRadius = (d) => {
      if (d.data._isCluster) {
        const count = d._clusteredLeaves ? d._clusteredLeaves.length : 0;
        return 15 + Math.sqrt(count) * 2.5; // Modest scaling for cluster
      }
      if (d.depth === 0) {
        const count = d._descendantCount || 1;
        return 40 + Math.sqrt(count) * 3; // Root: better scaling
      }
      if (d.depth === 1) {
        const count = d._descendantCount || 1;
        return 15 + Math.sqrt(count) * 4; // Main categories: bigger now, scales well
      }
      if (d._children) {
        const count = d._descendantCount || 1;
        return 8 + Math.sqrt(count) * 2.5;
      }
      return 4;
    };

    // Find max proportional radius for depth-1 nodes
    const maxProportionalRadius = Math.max(
      ...depth1Nodes.map(d => calculateProportionalRadius(d))
    );

    // Overlap prevention: balanced approach - big nodes but no overlap
    // Max radius can be up to 75% of spacing (bigger nodes, still no overlap)
    const maxAllowedRadius = avgSpacing * 0.75 * scale;
    const overlapPrevention = Math.min(1.0, maxAllowedRadius / maxProportionalRadius);

    console.log('DENDROGRAM SCALING:', {
      treeWidth, treeHeight, innerWidth, innerHeight,
      scaleX, scaleY, finalScale: scale,
      minX, maxX, minY, maxY,
      avgSpacing, maxProportionalRadius, maxAllowedRadius, overlapPrevention,
      depth1Count: depth1Nodes.length
    });

    // Calculate translation to center and fit tree in viewport
    const scaledWidth = treeWidth * scale;
    const scaledHeight = treeHeight * scale;

    // Center the tree within available space and add margin
    const translateX = margin.left - minY * scale + (innerWidth - scaledWidth) / 2;
    const translateY = margin.top - minX * scale + (innerHeight - scaledHeight) / 2;

    // Apply scale and translate to fit tree perfectly in viewport
    g.attr('transform', `translate(${translateX},${translateY}) scale(${scale})`);

    console.log('Applied transform:', `translate(${translateX},${translateY}) scale(${scale})`);

    // **************** Nodes section ****************

    // Update the nodes using a unique ID for enter/exit
    const node = g.selectAll('g.node')
      .data(nodes, d => d.id || (d.id = ++i));

    // Enter any new nodes at the parent's previous position
    const nodeEnter = node.enter().append('g')
      .attr('class', 'node')
      .attr('transform', d => `translate(${source.y0},${source.x0})`)
      .style('cursor', d => {
        const items = d.data?.urls || d.data?.content || d.data?.items || [];
        return (d.children || d._children || items.length > 0) ? 'pointer' : 'default';
      })
      .on('mouseover', function(event, d) {
        // Clear any frozen tooltip to allow new ones to show
        if (frozenTooltipNode) {
          if (tooltipFreezeTimer) clearTimeout(tooltipFreezeTimer);
          frozenTooltipNode = null;
        }

        // Show hover box for ALL nodes (both circles and rectangles)
        d3.select(this).select('circle')
          .attr('stroke', '#000')
          .attr('stroke-width', 2);
        d3.select(this).select('rect')
          .attr('stroke', '#000')
          .attr('stroke-width', 2);

        const tooltip = d3.select('#tooltip');
        const name = d.data.name || d.data.entity_name || '';
        const items = d.data?.urls || d.data?.content || d.data?.items || [];

        // Show tooltip CLOSE to cursor, slightly above (stays in place)
        tooltip
          .datum(d)
          .style('display', 'block')
          .style('visibility', 'visible')
          .style('opacity', '1')
          .style('pointer-events', 'none')  // Don't block clicks initially
          .style('left', (event.pageX + 5) + 'px')
          .style('top', (event.pageY - 35) + 'px');

        // Special tooltip for cluster nodes
        if (d.data._isCluster) {
          const count = d._clusteredLeaves ? d._clusteredLeaves.length : 0;
          tooltip.html(`
            <div style="font-weight: bold; margin-bottom: 4px;">${name}</div>
            <div style="font-size: 12px; color: #666;">
              ${count} solution${count === 1 ? '' : 's'} - Click to view
            </div>
          `);
        } else if (d.children || d._children) {
          const numChildren = (d.children || d._children).length;
          tooltip.html(`
            <div style="font-weight: bold; margin-bottom: 4px;">${name}</div>
            <div style="font-size: 12px; color: #666;">
              ${numChildren} subcategor${numChildren === 1 ? 'y' : 'ies'} - Click to expand
            </div>
          `);
        } else if (items.length > 0) {
          tooltip.html(`
            <div style="font-weight: bold; margin-bottom: 4px;">${name}</div>
            <div style="font-size: 12px; color: #666;">
              ${items.length} item${items.length === 1 ? '' : 's'} - Click to view
            </div>
          `);
        } else {
          tooltip.html(`
            <div style="font-weight: bold; margin-bottom: 4px;">${name}</div>
          `);
        }

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
        // Remove stroke from circles
        d3.select(this).select('circle')
          .attr('stroke', d => {
            if (d.data.isSearchMatch) return '#cc0000';
            if (d._children) return '#fff';
            return 'none';
          })
          .attr('stroke-width', d => {
            if (d.data.isSearchMatch) return 2;
            if (d._children) return 3;
            return 0;
          });

        // Remove stroke from rectangles (cluster nodes)
        d3.select(this).select('rect')
          .attr('stroke', '#fff')
          .attr('stroke-width', 2);

        if (!frozenTooltipNode) {
          const tooltip = d3.select('#tooltip');
          tooltip
            .style('display', 'none')
            .style('pointer-events', 'none');
        }
      })
      .on('click', function(event, d) {
        if (wasDragging || event.metaKey || event.ctrlKey) {
          event.stopPropagation();
          return;
        }

        const sidePanel = document.getElementById('sidePanel');
        const items = d.data?.urls || d.data?.content || d.data?.items || [];

        // Handle cluster node - show all URLs in side panel
        if (d.data._isCluster && d._clusteredLeaves) {
          // Collect all URLs from all clustered leaves
          const allUrls = [];
          d._clusteredLeaves.forEach(leaf => {
            const leafItems = leaf.data?.urls || leaf.data?.content || leaf.data?.items || [];
            allUrls.push(...leafItems);
          });

          // Create a synthetic node with all URLs for side panel display
          const syntheticNode = {
            data: {
              name: d.data.name,
              urls: allUrls
            }
          };

          showSidePanel(sidePanel, syntheticNode);
        } else if (d.children || d._children) {
          // Click on node with children - expand and hide siblings
          // First ensure children are visible
          if (d._children) {
            d.children = d._children;
            d._children = null;
          }

          // Cluster terminal nodes if needed (>5 terminals)
          clusterTerminalNodes(d);

          // Ensure only immediate children are visible (collapse grandchildren)
          if (d.children) {
            d.children.forEach(child => {
              if (child.children) {
                child._children = child.children;
                child.children = null;
              }
            });
          }

          // Hide siblings and handle ancestor visibility based on depth
          if (d.depth === 1) {
            // Depth-1 click: Hide root and siblings (zoom to this branch)
            root._hiddenBySiblingSelection = true; // Hide root only
            setHiddenRecursive(d, false); // Show clicked node and its children
            if (d.parent && d.parent.children) {
              d.parent.children.forEach(sibling => {
                if (sibling !== d) {
                  setHiddenRecursive(sibling, true); // Hide sibling and all descendants
                }
              });
            }
          } else {
            // Deeper levels: Hide siblings only, keep ancestors visible
            if (d.parent && d.parent.children) {
              d.parent.children.forEach(sibling => {
                if (sibling !== d) {
                  setHiddenRecursive(sibling, true); // Hide sibling and all descendants
                } else {
                  setHiddenRecursive(sibling, false); // Show clicked node and its children
                }
              });
            }
          }

          update(d);
        } else if (items && items.length > 0) {
          // Terminal leaf with content - open side panel
          showSidePanel(sidePanel, d);
        } else if (d.data.url) {
          // Single URL - open it
          window.open(d.data.url, '_blank');
        }

        event.stopPropagation();
      });

    // Add shapes to entering nodes (squares for terminals/clusters, circles for others)
    nodeEnter.each(function(d) {
      const isTerminal = !d.children && !d._children;
      if (d.data._isCluster || isTerminal) {
        // Terminal nodes and cluster nodes: add SQUARE (rect)
        d3.select(this).append('rect')
          .attr('width', 1e-6)
          .attr('height', 1e-6)
          .attr('x', 0)
          .attr('y', 0)
          .style('fill', getNodeColor(d));
      } else {
        // Category nodes: add circles
        d3.select(this).append('circle')
          .attr('r', 1e-6)
          .style('fill', getNodeColor(d));
      }
    });

    // Calculate responsive font sizes based on viewport
    const baseFontSize = Math.max(12, Math.min(innerWidth / 60, 18)); // Scale between 12px and 18px

    // Add labels to entering nodes (including terminals)
    nodeEnter.append('text')
      .attr('dy', '.35em')
      .attr('x', d => (d.children || d._children) ? -10 : 10)
      .attr('text-anchor', d => (d.children || d._children) ? 'end' : 'start')
      .style('fill-opacity', 1e-6) // Start invisible for transition
      .style('font-size', d => {
        // Terminal nodes and clusters get smaller font
        const isTerminal = !d.children && !d._children;
        if (isTerminal || d.data._isCluster) return `${baseFontSize * 0.75}px`;

        if (d.depth === 1) return `${baseFontSize * 1.2}px`; // Larger for depth-1
        if (d.depth === 2) return `${baseFontSize}px`;
        return `${baseFontSize * 0.9}px`;
      })
      .style('fill', 'white')
      .style('font-weight', d => d.depth === 1 ? '700' : 'normal')
      .style('pointer-events', 'none')
      .style('display', 'block'); // Show all labels including terminals

    // UPDATE existing nodes
    const nodeUpdate = nodeEnter.merge(node);

    // Transition to the proper position
    nodeUpdate.transition()
      .duration(750)
      .attr('transform', d => `translate(${d.y},${d.x})`);

    // Update circles (regular nodes) with PROPORTIONAL sizing + overlap prevention
    nodeUpdate.select('circle')
      .transition()
      .duration(750)
      .attr('r', d => {
        if (d.data.isSearchMatch) return 6;
        const proportionalSize = calculateProportionalRadius(d);
        return proportionalSize * overlapPrevention;
      })
      .attr('fill', d => {
        if (d.data.isSearchMatch) return '#ff4444';
        // Use category-based colors for all nodes
        return getNodeColor(d);
      })
      .attr('fill-opacity', d => {
        if (d.data._isCluster) {
          // Very transparent for cluster - should look like ghost
          return 0.35;
        }
        if (!d.children && !d._children) {
          return 0.6; // Terminal nodes
        }
        return 0.5; // Category nodes with children
      })
      .attr('stroke', d => {
        if (d.data.isSearchMatch) return '#cc0000';
        if (d._children) return '#fff';
        return 'none';
      })
      .attr('stroke-width', d => {
        if (d.data.isSearchMatch) return 2;
        if (d._children) return 3;
        return 0;
      });

    // Update rectangles (terminal nodes and clusters) - SQUARE shape
    nodeUpdate.select('rect')
      .transition()
      .duration(750)
      .attr('width', d => {
        const proportionalSize = calculateProportionalRadius(d);
        return proportionalSize * overlapPrevention * 2;
      })
      .attr('height', d => {
        const proportionalSize = calculateProportionalRadius(d);
        return proportionalSize * overlapPrevention * 2;
      })
      .attr('x', d => {
        const proportionalSize = calculateProportionalRadius(d);
        return -proportionalSize * overlapPrevention; // Center the square
      })
      .attr('y', d => {
        const proportionalSize = calculateProportionalRadius(d);
        return -proportionalSize * overlapPrevention; // Center the square
      })
      .attr('fill', d => {
        if (d.data.isSearchMatch) return '#ff4444';
        // Use category-based colors for all nodes
        return getNodeColor(d);
      })
      .attr('fill-opacity', d => {
        if (d.data._isCluster) {
          // Very transparent for cluster - should look like ghost
          return 0.35;
        }
        if (!d.children && !d._children) {
          return 0.6; // Terminal nodes
        }
        return 0.5; // Category nodes with children
      })
      .attr('stroke', d => {
        if (d.data.isSearchMatch) return '#cc0000';
        return '#fff';
      })
      .attr('stroke-width', d => {
        if (d.data.isSearchMatch) return 2;
        return 2;
      });

    // Update the label text and positioning
    nodeUpdate.select('text')
      .transition()
      .duration(750)
      .attr('x', d => (d.children || d._children) ? -10 : 10)
      .attr('text-anchor', d => (d.children || d._children) ? 'end' : 'start')
      .style('font-size', d => {
        // Terminal nodes and clusters get smaller font
        const isTerminal = !d.children && !d._children;
        if (isTerminal || d.data._isCluster) return `${baseFontSize * 0.75}px`;

        if (d.depth === 1) return `${baseFontSize * 1.2}px`; // Larger for depth-1
        if (d.depth === 2) return `${baseFontSize}px`;
        return `${baseFontSize * 0.9}px`;
      })
      .text(d => {
        const name = d.data.name || d.data.entity_name || '';

        // For cluster nodes, name already includes count (e.g., "Other Solutions (15)")
        if (d.data._isCluster) {
          return name;
        }

        // For terminal nodes (squares), add entry count
        const isTerminalLeaf = !d.children && !d._children;
        if (isTerminalLeaf) {
          const items = d.data?.urls || d.data?.content || d.data?.items || [];
          if (items.length > 0) {
            return `${name} (${items.length})`;
          }
          return name;
        }

        // For category nodes (circles), show truncated name
        if (d.depth === 1) {
          const maxChars = 22;
          if (name.length > maxChars) {
            return name.substring(0, maxChars - 1) + '…';
          }
          return name;
        }

        // For other nodes (depth 2+ with children), show truncated name
        const maxChars = 22;
        if (name.length > maxChars) {
          return name.substring(0, maxChars - 1) + '…';
        }
        return name;
      })
      .style('fill-opacity', 1) // All labels visible
      .style('display', 'block'); // All labels visible

    // EXIT - Remove any exiting nodes (instant, no fade)
    const nodeExit = node.exit()
      .attr('transform', d => `translate(${source.y},${source.x})`)
      .remove();

    // No fade animation for exit (instant removal handled above)

    // **************** Links section ****************

    const link = g.selectAll('path.link')
      .data(links, d => d.target.id);

    // Enter any new links at the parent's previous position
    const linkEnter = link.enter().insert('path', 'g')
      .attr('class', 'link')
      .style('stroke', 'rgba(144, 224, 239, 0.7)')
      .style('stroke-width', '3px')
      .style('fill', 'none')
      .attr('d', d => {
        const o = {x: source.x0, y: source.y0};
        return linkGenerator({source: o, target: o});
      });

    // UPDATE existing links
    const linkUpdate = linkEnter.merge(link);

    // Ensure all links have proper styling (including cluster link)
    linkUpdate
      .style('stroke', 'rgba(144, 224, 239, 0.7)')
      .style('stroke-width', '3px')
      .style('fill', 'none');

    // Transition back to the parent element position
    linkUpdate.transition()
      .duration(750)
      .attr('d', d => {
        // Safety check - ensure source and target exist
        if (!d.source || !d.target) {
          return '';
        }

        // Use standard horizontal link for all nodes (including clusters)
        return linkGenerator(d);
      });

    // Remove any exiting links (instant, no animation)
    link.exit().remove();

    // Store the old positions for transition
    nodes.forEach(d => {
      d.x0 = d.x;
      d.y0 = d.y;
    });
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
      // If frozen, tooltip stays visible until timer expires
    });

  // Listen for reset event from global home button
  const resetHandler = () => {
    // Reset to root and restore initial collapsed state (show only 3 main categories)
    root.descendants().forEach(d => {
      // Clear sibling selection flags
      d._hiddenBySiblingSelection = false;

      if (d.depth >= 1) {
        // Re-collapse depth 1+ nodes to show only main categories
        if (d._children || d.children) {
          d._children = d._children || d.children;
          d.children = null;
        }
      }
    });
    // Reset view to root
    update(root);
  };

  // Listen for up event from global up button
  // For dendrogram, collapse all expanded nodes (similar to reset)
  const upHandler = () => {
    // Collapse all nodes back to initial state
    root.descendants().forEach(d => {
      d._hiddenBySiblingSelection = false;
      if (d.depth >= 1) {
        if (d._children || d.children) {
          d._children = d._children || d.children;
          d.children = null;
        }
      }
    });
    update(root);
  };

  // Add event listeners
  window.addEventListener('resetVisualization', resetHandler);
  window.addEventListener('goUpLevel', upHandler);

  // Clean up event listeners on window resize (when visualization is re-rendered)
  const cleanupHandlers = () => {
    window.removeEventListener('resetVisualization', resetHandler);
    window.removeEventListener('goUpLevel', upHandler);
  };

  // Handle window resize - updates like circlePacking
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      width = container.clientWidth;
      height = container.clientHeight;

      if (!width || !height) return;

      // Update SVG dimensions
      svg.attr('width', width).attr('height', height);

      const newInnerWidth = width - margin.left - margin.right;
      const newInnerHeight = height - margin.top - margin.bottom;
      tree.size([newInnerHeight, newInnerWidth]);

      // Re-render with updated dimensions and scaling
      update(root);
    }, 150);
  });
}
