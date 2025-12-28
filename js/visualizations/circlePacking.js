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

  // STEP 1: Pre-compute label metadata (performance optimization)
  // Calculate priority rankings ONCE instead of on every render
  function initializeLabelMetadata(node) {
    if (!node.children) return;

    // For each child, compute its priority ranking among siblings
    const siblings = node.children;

    // Sort siblings by radius (largest first)
    const sorted = siblings.slice().sort((a, b) => b.r - a.r);

    // Assign priority rank and metadata to each sibling
    siblings.forEach(sibling => {
      sibling._labelPriority = sorted.indexOf(sibling); // 0 = largest, 1 = second largest, etc.
      sibling._siblingCount = siblings.length;
      sibling._isLeaf = !sibling.children;
    });

    // Recursively process children
    siblings.forEach(sibling => initializeLabelMetadata(sibling));
  }

  // Initialize metadata for entire tree
  initializeLabelMetadata(root);

  // Create canvas for measuring actual text width
  // CRITICAL: Must measure at actual visual font size (fontSize * k) since SVG text is inside scale(k) transform
  const textMeasureCanvas = document.createElement('canvas');
  const textMeasureCtx = textMeasureCanvas.getContext('2d');

  let focus = root;
  let view;
  let frozenTooltipNode = null;  // Track WHICH node tooltip is frozen for
  let tooltipFreezeTimer = null;
  let panX = 0;  // Pan offset X
  let panY = 0;  // Pan offset Y
  let zoomScale = 1;  // Geometric zoom scale
  let isScrollZoomMode = false;  // Track scroll zoom vs click zoom mode

  // Momentum panning variables
  let velocityX = 0;
  let velocityY = 0;
  let lastMoveTime = 0;
  let lastMoveX = 0;
  let lastMoveY = 0;
  let momentumAnimationFrame = null;

  // Scroll throttling variables (DISABLED - uncomment when re-enabling scroll zoom)
  // let scrollPending = false;
  // let pendingScrollDelta = 0;

  // Main group - centered
  const g = svg.append('g')
    .attr('transform', `translate(${width/2},${height/2})`);

  // DISABLED - Zoom level indicator (uncomment when re-enabling scroll zoom)
  /*
  // Add zoom level indicator
  const zoomIndicator = svg.append('g')
    .attr('class', 'zoom-indicator')
    .attr('transform', `translate(${width - 80}, ${height - 40})`)
    .style('opacity', 0);

  zoomIndicator.append('rect')
    .attr('width', 70)
    .attr('height', 30)
    .attr('rx', 5)
    .style('fill', 'rgba(0, 0, 0, 0.7)')
    .style('stroke', 'rgba(255, 255, 255, 0.3)')
    .style('stroke-width', 1);

  const zoomText = zoomIndicator.append('text')
    .attr('x', 35)
    .attr('y', 20)
    .attr('text-anchor', 'middle')
    .style('fill', 'white')
    .style('font-size', '14px')
    .style('font-weight', 'bold')
    .style('pointer-events', 'none')
    .text('1.0x');

  let zoomIndicatorTimer = null;
  */

  // DISABLED - Function to show zoom indicator with auto-fade (uncomment when re-enabling scroll zoom)
  /*
  function showZoomIndicator(zoomLevel) {
    // Clear any existing timer
    if (zoomIndicatorTimer) {
      clearTimeout(zoomIndicatorTimer);
    }

    // Update text and show indicator
    zoomText.text(`${zoomLevel.toFixed(1)}x`);
    zoomIndicator
      .interrupt()
      .transition()
      .duration(150)
      .style('opacity', 1);

    // Auto-hide after 1.5 seconds
    zoomIndicatorTimer = setTimeout(() => {
      zoomIndicator
        .transition()
        .duration(300)
        .style('opacity', 0);
    }, 1500);
  }
  */

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

  // Double-click on background to zoom out
  svg.on('dblclick', (event) => {
    event.preventDefault();
    if (event.target === svg.node()) {
      // Double-click background: zoom out to root
      zoom(event, root);
    }
  });

  // Add double-click handling to nodes (alternative to single click)
  node.on('dblclick', function(event, d) {
    event.preventDefault();
    event.stopPropagation();

    // Double-click on node: zoom in or out depending on current focus
    const sidePanel = document.getElementById('sidePanel');
    const hasChildren = d.children && d.children.length > 0;
    const items = d.data?.urls || d.data?.content || d.data?.items || [];

    if (hasChildren) {
      // Parent node: zoom in
      if (focus !== d) {
        zoom(event, d);
      } else {
        // Already focused: zoom out to parent
        if (d.parent) {
          zoom(event, d.parent);
        }
      }
    } else if (items && items.length > 0) {
      // Leaf node: open side panel
      showSidePanel(sidePanel, d);
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

      // Cancel any momentum animation when starting new drag
      if (momentumAnimationFrame) {
        cancelAnimationFrame(momentumAnimationFrame);
        momentumAnimationFrame = null;
      }

      // Initialize velocity tracking
      velocityX = 0;
      velocityY = 0;
      lastMoveTime = Date.now();
      lastMoveX = event.clientX;
      lastMoveY = event.clientY;
    }
  });

  svg.on('mousemove', function(event) {
    if (isDragging) {
      wasDragging = true;  // Mark that we actually moved while dragging
      isScrollZoomMode = true;  // Enter scroll zoom mode for panning

      // Calculate velocity for momentum
      const now = Date.now();
      const dt = now - lastMoveTime;
      if (dt > 0) {
        velocityX = (event.clientX - lastMoveX) / dt * 16; // Normalize to ~60fps
        velocityY = (event.clientY - lastMoveY) / dt * 16;
      }
      lastMoveTime = now;
      lastMoveX = event.clientX;
      lastMoveY = event.clientY;

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

        // Apply momentum if velocity is significant
        const speed = Math.sqrt(velocityX * velocityX + velocityY * velocityY);
        if (speed > 0.5) {
          applyMomentum();
        }
      }
    }
  });

  // Momentum animation with decay
  function applyMomentum() {
    const friction = 0.92; // Decay factor (0-1, higher = less friction)
    const minSpeed = 0.1; // Stop when velocity is below this

    function animate() {
      // Apply velocity to pan
      panX += velocityX;
      panY += velocityY;

      // Apply friction (exponential decay)
      velocityX *= friction;
      velocityY *= friction;

      // Update view
      zoomTo(view);

      // Continue if still moving
      const speed = Math.sqrt(velocityX * velocityX + velocityY * velocityY);
      if (speed > minSpeed) {
        momentumAnimationFrame = requestAnimationFrame(animate);
      } else {
        momentumAnimationFrame = null;
      }
    }

    momentumAnimationFrame = requestAnimationFrame(animate);
  }

  svg.on('mouseleave', () => {
    if (isDragging) {
      isDragging = false;
      svg.style('cursor', null);
    }
  });

  // SCROLL ZOOM DISABLED - Commenting out due to issues
  // Uncomment to re-enable scroll wheel zoom/pan functionality
  /*
  // Add scroll wheel zoom/pan
  // Zoom limits for smoother experience
  const MIN_ZOOM = 0.5;   // Don't zoom out too far
  const MAX_ZOOM = 10;    // Don't zoom in too much
  const ZOOM_STEP = 1.05; // Smaller increment for smoother scroll zoom (was 1.1)

  svg.on('wheel', function(event) {
    event.preventDefault();

    // Cancel any momentum animation when scrolling
    if (momentumAnimationFrame) {
      cancelAnimationFrame(momentumAnimationFrame);
      momentumAnimationFrame = null;
    }

    // If transitioning from click zoom to scroll zoom, normalize the view
    // This prevents "stuck" scroll zoom when focused on small nodes
    if (!isScrollZoomMode) {
      // Calculate current visual scale
      const currentK = diameter / view[2];

      // Switch to root-based view for scroll zoom
      const rootViewSize = root.r * 2;

      // Adjust zoomScale to maintain current visual scale
      // currentK = (diameter / rootViewSize) * zoomScale
      // So: zoomScale = currentK * rootViewSize / diameter
      zoomScale = currentK * rootViewSize / diameter;

      // Clamp to zoom limits
      zoomScale = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoomScale));

      // Keep current view center (focus position) but use root-based window size
      view = [focus.x, focus.y, rootViewSize];
    }

    isScrollZoomMode = true;  // Enter scroll zoom mode

    if (event.shiftKey) {
      // Shift + scroll: pan vertically
      panY -= event.deltaY * 0.5;
      applyScrollChange();
    } else if (event.ctrlKey || event.metaKey) {
      // Ctrl/Cmd + scroll: pan horizontally
      panX -= event.deltaY * 0.5;
      applyScrollChange();
    } else {
      // Normal scroll: zoom with limits
      // Accumulate scroll delta for throttling
      pendingScrollDelta += event.deltaY;

      if (!scrollPending) {
        scrollPending = true;
        requestAnimationFrame(() => {
          const oldScale = zoomScale;

          // Apply accumulated scroll
          if (pendingScrollDelta < 0) {
            zoomScale = Math.min(MAX_ZOOM, zoomScale * Math.pow(ZOOM_STEP, Math.abs(pendingScrollDelta) / 100));
          } else {
            zoomScale = Math.max(MIN_ZOOM, zoomScale / Math.pow(ZOOM_STEP, Math.abs(pendingScrollDelta) / 100));
          }

          // Only update if scale actually changed (not at limits)
          if (zoomScale !== oldScale) {
            zoomTo(view);
            showZoomIndicator(zoomScale);
          }

          // Reset throttle state
          scrollPending = false;
          pendingScrollDelta = 0;
        });
      }
    }
  });

  // Helper function for non-zoom scroll changes (panning)
  function applyScrollChange() {
    if (!scrollPending) {
      scrollPending = true;
      requestAnimationFrame(() => {
        zoomTo(view);
        scrollPending = false;
      });
    }
  }
  */

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

      // Reposition zoom indicator
      zoomIndicator.attr('transform', `translate(${width - 80}, ${height - 40})`);

      // Update pack layout size and re-apply
      pack.size([diameter - 4, diameter - 4]);
      pack(root);

      // Re-render current view to update positions
      zoomTo(view);
    }, 150); // Debounce resize events
  });

  // STEP 2: Unified label visibility function
  // Single decision function that works for ALL zoom modes (scroll, click, drag)
  // Uses pre-computed metadata for fast, consistent decisions
  function shouldShowLabel(d, focusNode, k, viewCenter, viewportDiameter) {
    // Never show root label
    if (d === root) return false;

    // Only show direct children of focus
    if (d.parent !== focusNode) return false;

    // Calculate effective visual radius
    const effRadius = d.r * k;

    // Minimum size threshold (different for leaves vs parents)
    // Leaves: 18px minimum, Parents: 20px minimum (relaxed to show more labels)
    const minRadius = d._isLeaf ? 18 : 20;
    if (effRadius < minRadius) return false;

    // Viewport bounds checking - relaxed for circle packing circular distribution
    // In circle packing, children naturally spread in a circle around center
    const dx = d.x - viewCenter[0];
    const dy = d.y - viewCenter[1];
    const distanceFromCenter = Math.sqrt(dx * dx + dy * dy);
    const distanceInPixels = distanceFromCenter * k;  // Convert to pixel coordinates
    const viewportThreshold = viewportDiameter * 0.50;  // 50% threshold (was 35%)
    if (distanceInPixels >= viewportThreshold) return false;

    // Priority culling (top 12 largest siblings) - increased to show more main categories
    // Uses pre-computed priority from Step 1
    const maxLabels = 12;
    if (d._labelPriority >= maxLabels) return false;

    // All criteria met - show label
    return true;
  }

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

    // STEP 3: Unified label rendering - same logic for all zoom modes
    let shownLabels = 0;
    let hiddenByCollision = 0;
    const labelBoundingBoxes = []; // Track shown labels for collision detection

    label
      .attr('transform', d => `translate(${d.x},${d.y})`)
      .each(function(d) {
        const element = d3.select(this);
        const name = d.data.name || d.data.entity_name || '';

        // UNIFIED: Single call to shouldShowLabel() for all modes (scroll, click, pan, drag)
        let shouldShow = shouldShowLabel(d, focus, k, view, diameter);

        // COLLISION DETECTION: Check if this label would overlap with already-shown labels
        if (shouldShow) {
          const nodeEffRadius = d.r * k;

          // CONTEXT-AWARE FONT SIZING: Adapts to actual local spacing between circles
          // Calculate distance to nearest sibling to determine available space
          let minDistance = Infinity;
          const siblings = d.parent.children;
          for (const sibling of siblings) {
            if (sibling === d) continue;
            const dx = sibling.x - d.x;
            const dy = sibling.y - d.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const gap = distance - d.r - sibling.r; // Actual gap between circle edges
            if (gap < minDistance) {
              minDistance = gap;
            }
          }

          // SMART ADAPTIVE SIZING: Use geometric mean of gap and circle size
          // This naturally balances both constraints without arbitrary multipliers:
          // - Large circle + large gap = large font
          // - Small circle + small gap = small font
          // - Mismatched sizes = intermediate font
          const visualGap = minDistance * k;
          const fontSizeFromMean = Math.sqrt(visualGap * nodeEffRadius);

          // Apply only readability bounds (min/max for legibility)
          const maxVisualFontSize = Math.max(10, Math.min(20, fontSizeFromMean));
          const fontSize = maxVisualFontSize / k; // Convert back to data coordinates

          // Calculate what text will actually be displayed (same logic as rendering)
          const availableWidth = nodeEffRadius * 2 * 0.75;
          const charWidth = fontSize * 0.55;
          const maxChars = Math.floor(availableWidth / charWidth);
          const displayedText = name.length <= maxChars ? name : name.substring(0, maxChars - 1) + '…';

          // MEASURE ACTUAL rendered width using canvas (accounts for font metrics, bold, stroke)
          // CRITICAL: SVG text is inside scale(k) transform, so visual font size is fontSize * k
          const visualFontSize = fontSize * k;  // Calculate visual font size
          textMeasureCtx.font = `600 ${visualFontSize}px sans-serif`;  // Match actual visual font size
          const textMetrics = textMeasureCtx.measureText(displayedText);
          const visualTextWidth = textMetrics.width;  // Visual pixel width BEFORE division
          const actualTextWidth = visualTextWidth / k;  // Convert visual pixels back to data coordinates

          // Add safety margin for stroke width (0.4px stroke on both sides = +0.8px, plus extra for safety)
          // CRITICAL: actualTextWidth is ALREADY in data coordinates (visualTextWidth / k)
          // Don't divide by k again! Use directly for bounding box.
          const strokePadding = fontSize * 0.15;  // Padding in data coordinates (fontSize is data-space)
          const estimatedWidth = actualTextWidth + strokePadding;  // Total width in data coordinates
          const labelHeight = fontSize * 1.5;  // Height in data coordinates

          // These values are ALREADY in data coordinates - use directly!
          const widthInData = estimatedWidth;
          const heightInData = labelHeight;

          // Label bounding box in DATA coordinates (where d.x and d.y live)
          const labelBox = {
            x: d.x - widthInData / 2,
            y: d.y - heightInData / 2,
            width: widthInData,
            height: heightInData,
            name: name  // DEBUG: track which label this is
          };

          // Check collision with existing labels (all in data coordinates)
          const hasCollision = labelBoundingBoxes.some(box => {
            const overlaps = !(labelBox.x + labelBox.width < box.x ||
                     labelBox.x > box.x + box.width ||
                     labelBox.y + labelBox.height < box.y ||
                     labelBox.y > box.y + box.height);
            return overlaps;
          });

          if (hasCollision) {
            shouldShow = false;
            hiddenByCollision++;
          } else {
            // No collision - add to tracking array
            labelBoundingBoxes.push(labelBox);
          }
        }

        // Update visibility immediately for instant feedback
        if (shouldShow) {
          element.style('display', 'inline');
          element.style('fill-opacity', 1);
          shownLabels++;
        } else {
          element.style('display', 'none');
          element.style('fill-opacity', 0);
        }

        // Skip rendering if this label shouldn't be shown (prevents ghost labels)
        if (!shouldShow) {
          element.selectAll('tspan').remove();
          element.text('');
          return;
        }

        // SMART LABEL RENDERING - Calculate what fits, no arbitrary thresholds
        // Fast calculations for smooth zoom/rendering

        // Calculate effective visual radius
        const nodeEffRadius = d.r * k;

        // CONTEXT-AWARE FONT SIZING: Adapts to actual local spacing (matches collision detection)
        // Calculate distance to nearest sibling to determine available space
        let minDistance = Infinity;
        const siblings = d.parent.children;
        for (const sibling of siblings) {
          if (sibling === d) continue;
          const dx = sibling.x - d.x;
          const dy = sibling.y - d.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const gap = distance - d.r - sibling.r; // Actual gap between circle edges
          if (gap < minDistance) {
            minDistance = gap;
          }
        }

        // SMART ADAPTIVE SIZING: Use geometric mean of gap and circle size (matches collision detection)
        const visualGap = minDistance * k;
        const fontSizeFromMean = Math.sqrt(visualGap * nodeEffRadius);
        const maxVisualFontSize = Math.max(10, Math.min(20, fontSizeFromMean));
        const fontSize = maxVisualFontSize / k; // Convert back to data coordinates

        // Calculate available space using VISUAL radius (not data radius!)
        // Use 75% of diameter to keep text well within circle boundaries
        const availableWidth = nodeEffRadius * 2 * 0.75;
        const charWidth = fontSize * 0.55;
        const maxChars = Math.floor(availableWidth / charWidth);

        // Hide if nothing meaningful fits (< 4 chars)
        if (maxChars < 4) {
          element.selectAll('tspan').remove();
          element.text('');
          return;
        }

        // Strategy 6: Smart Text Truncation - ALWAYS single line, no wrapping
        // Professional, clean look with predictable sizing
        let displayText;
        if (name.length <= maxChars) {
          // Full text fits
          displayText = name;
        } else {
          // Truncate with ellipsis
          displayText = name.substring(0, maxChars - 1) + '…';
        }

        // Clear existing text and tspans
        element.selectAll('tspan').remove();
        element.text('');

        // Apply professional styling - MUST match canvas font for collision detection
        element
          .style('font-family', 'sans-serif')  // CRITICAL: match canvas measurement font
          .style('font-size', fontSize + 'px')
          .style('font-weight', '600') // Always bold for parent nodes
          .style('text-anchor', 'middle')
          .text(displayText);
      });
  }

  function zoom(event, d) {
    isScrollZoomMode = false;  // Enter click zoom mode
    focus = d;
    zoomScale = 1;  // Reset geometric zoom (Observable pattern - click zoom is hierarchical only)
    panX = 0;  // Reset pan offset (pure Observable pattern)
    panY = 0;

    const transition = svg.transition()
      .duration(event && event.altKey ? 7500 : 750) // Fast direct transition (was 1200ms)
      .ease(d3.easeCubicInOut) // Smooth easing for less abrupt transitions
      .tween('zoom', () => {
        // Direct interpolation - no intermediate zoom out/in
        const i = d3.interpolate(view, [focus.x, focus.y, focus.r * 2]);
        return t => zoomTo(i(t));
      });

    // STEP 5: Unified transition - use same shouldShowLabel() function
    label
      .filter(function(d) {
        return d.parent === focus || this.style.display === 'inline';
      })
      .transition(transition)
      .style('fill-opacity', d => {
        // Use unified label visibility function
        const k = diameter / (focus.r * 2);
        const viewCenter = [focus.x, focus.y];
        return shouldShowLabel(d, focus, k, viewCenter, diameter) ? 1 : 0;
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

  // Show home button for navigation
  if (window.showHomeButton) {
    window.showHomeButton();
  }
}
