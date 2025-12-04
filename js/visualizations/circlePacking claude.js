/**
 * circlePacking.js
 * Circle Packing visualization with zoom capability
 */

export function renderCirclePacking(data, showTooltip, hideTooltip) {
  const width = document.getElementById('visualization').clientWidth;
  const height = document.getElementById('visualization').clientHeight;
  const diameter = Math.min(width, height);

  console.log('Circle Packing dimensions:', { width, height, diameter });

  if (!width || !height) {
    console.error('Invalid dimensions for Circle Packing');
    return;
  }

  const svg = d3.select('#visualization')
    .append('svg')
    .attr('width', width)
    .attr('height', height);

  // Create pack layout
  const pack = d3.pack()
    .size([diameter - 4, diameter - 4])
    .padding(3);

  // Create hierarchy
  const root = d3.hierarchy(data)
    .sum(d => {
      // Only leaf nodes (no children) get size 1
      if (!d.children || d.children.length === 0) {
        return 1;
      }
      return 0;
    })
    .sort((a, b) => b.value - a.value);

  console.log('Hierarchy created, root value:', root.value, 'height:', root.height);

  // Apply pack layout
  try {
    pack(root);
    console.log('Pack succeeded, root circle:', { x: root.x, y: root.y, r: root.r });
  } catch (error) {
    console.error('Pack failed:', error);
    console.log('Root node details:', root);
    throw error;
  }

  // ORIGINAL beautiful color scale
  const color = d3.scaleLinear()
    .domain([0, root.height])
    .range(['#40916c', '#0096c7'])
    .interpolate(d3.interpolateHcl);

  // Zoom state
  let focus = root;
  let view;

  // Main group with centering transform
  const g = svg.append('g')
    .attr('transform', `translate(${width/2 - diameter/2 + 2}, ${height/2 - diameter/2 + 2})`);

  // Create separate groups for circles and text to ensure proper z-order
  const circlesGroup = g.append('g').attr('class', 'circles-layer');
  const textGroup = g.append('g').attr('class', 'text-layer');

  // Draw ALL circles first (in circles layer)
  const circles = circlesGroup.selectAll('circle')
    .data(root.descendants())
    .join('circle')
    .attr('transform', d => `translate(${d.x},${d.y})`)
    .attr('r', d => d.r)
    .attr('fill', d => {
      // Search highlighting in red
      if (d.data.isSearchMatch) return '#ff4444';
      // Original design: gradient for parents, solid green for leaves
      return d.children ? color(d.depth) : '#40916c';
    })
    .attr('fill-opacity', d => d.children ? 0.3 : 0.6) // ORIGINAL transparency
    .style('opacity', d => d.depth === 0 ? 0 : 1) // Hide root node
    .style('cursor', 'pointer');

  // Draw ALL text labels AFTER circles (in text layer, on top)
  const labels = textGroup.selectAll('text')
    .data(root.descendants())
    .join('text')
    .attr('transform', d => `translate(${d.x},${d.y})`)
    .attr('dx', 0) // Will be updated during zoom for jittering
    .attr('dy', '0.3em') // Will be updated during zoom for jittering
    .attr('text-anchor', 'middle')
    .style('pointer-events', 'none') // Text doesn't capture events
    .style('fill', '#000')
    .style('font-weight', d => d.depth === 1 ? 'bold' : 'normal') // Bold for top categories
    .style('font-size', '12px') // Initial font size
    .style('opacity', d => d.depth === 0 ? 0 : 1) // Hide root node text
    .text(d => d.data.name || d.data.entity_name || '');

  // Add event handlers to circles (not text, since pointer-events: none)
  circles
    .on('mouseover', showTooltip)
    .on('mouseout', hideTooltip)
    .on('click', function(event, d) {
      if (event.defaultPrevented) return;
      event.stopPropagation();

      console.log(`Clicked on circle "${d.data.name}"`);

      // Priority logic:
      // 1. If node has children AND not focused → zoom
      // 2. If node is a leaf (no children) AND has items → open side panel
      // 3. If node is focused AND has items → open side panel
      // 4. If node has URL → open URL

      const hasChildren = d.children && d.children.length > 0;
      const items = d.data?.urls || d.data?.content || d.data?.items || [];
      const isLeaf = !hasChildren;

      if (hasChildren && focus !== d) {
        // Category node not focused: zoom in
        console.log(`  → Category node, zooming in`);
        zoom(d);
      } else if (items && items.length > 0) {
        // Leaf node or focused category with items: open side panel
        console.log(`  → Node has ${items.length} items, opening side panel`);
        const tooltip = d3.select('#tooltip');
        tooltip.datum(d); // Store data in tooltip
        tooltip.dispatch('click'); // Trigger tooltip click to open side panel
      } else if (d.data.url) {
        // Leaf node with URL but no items: open URL
        console.log(`  → Opening URL: ${d.data.url}`);
        window.open(d.data.url, '_blank');
      } else {
        console.log(`  → Already focused on this node`);
      }
    });

  // Click on background to zoom out
  svg.on('click', (event) => {
    if (event.target === svg.node() && focus !== root) {
      zoom(root);
    }
  });

  // Zoom function
  function zoom(d) {
    focus = d;

    const transition = svg.transition()
      .duration(750)
      .tween('zoom', () => {
        const i = d3.interpolateZoom(view, [focus.x, focus.y, focus.r * 2]);
        return t => zoomTo(i(t));
      });
  }

  // Apply zoom transformation
  function zoomTo(v) {
    const k = diameter / v[2];
    view = v;

    // Transform and scale
    g.attr('transform', `translate(${width/2 - v[0]*k + 2}, ${height/2 - v[1]*k + 2})scale(${k})`);

    // Collect visible labels for collision detection
    const visibleLabels = [];

    // Update text visibility and size based on zoom
    labels.each(function(d) {
      const element = d3.select(this);
      const name = d.data.name || d.data.entity_name || '';
      const effRadius = d.r * k;

      // CRITICAL: Only show labels for nodes with children (categories)
      // Never show labels for terminal/leaf nodes (individual content items)
      const hasChildren = d.children && d.children.length > 0;
      if (!hasChildren) {
        element.style('display', 'none').style('opacity', 0);
        return;
      }

      // Show text based on effective radius and depth relative to focus
      const isDirectChild = d.parent === focus;
      const isGrandChild = d.parent && d.parent.parent === focus;
      const isGreatGrandChild = d.parent && d.parent.parent && d.parent.parent.parent === focus;

      // Smart depth-based visibility: only show labels that matter
      let shouldShow = false;
      let minEffRadius = 0;

      if (isDirectChild) {
        // Always show direct children (main categories when zoomed in)
        shouldShow = true;
        minEffRadius = 30; // Reasonable minimum to avoid tiny labels
      } else if (isGrandChild) {
        // Show grandchildren only if they're large enough
        shouldShow = true;
        minEffRadius = 80; // Higher threshold to reduce clutter
      } else if (isGreatGrandChild) {
        // Only show great-grandchildren if VERY large (max zoom on small category)
        shouldShow = true;
        minEffRadius = 150; // Very high threshold - rare case
      } else {
        // Don't show labels beyond 3 levels deep from focus
        shouldShow = false;
      }

      // Additional check: circle must be large enough in actual size
      const minActualRadius = isDirectChild ? 10 : 25;

      if (shouldShow && effRadius > minEffRadius && d.r > minActualRadius) {
        // Calculate font size based on EFFECTIVE radius (zoom-adjusted)
        let fontSize;
        if (effRadius < 40) {
          fontSize = 9;
        } else if (effRadius < 70) {
          fontSize = 10;
        } else if (effRadius < 100) {
          fontSize = 11;
        } else if (effRadius < 150) {
          fontSize = 12;
        } else if (effRadius < 220) {
          fontSize = 14;
        } else {
          fontSize = Math.min(18, 14 + (effRadius - 220) / 100); // Cap at 18px
        }

        // Bold for top-level categories
        if (d.depth === 1) {
          fontSize = Math.max(fontSize, 12);
        }

        // Calculate how much text fits (conservative to avoid overlap)
        const charWidth = fontSize * 0.65; // More accurate width estimation
        const maxChars = Math.floor((effRadius * 1.4) / charWidth); // More conservative

        // Try to break on word boundaries for better readability
        let displayText = name;
        if (name.length > maxChars) {
          const words = name.split(' ');
          let truncated = '';
          for (const word of words) {
            if ((truncated + word).length <= maxChars - 3) {
              truncated += (truncated ? ' ' : '') + word;
            } else {
              break;
            }
          }
          displayText = truncated ? truncated + '...' : name.substring(0, Math.max(0, maxChars - 3)) + '...';
        }

        // Store label info for collision detection
        visibleLabels.push({
          element,
          d,
          fontSize,
          displayText,
          effRadius,
          x: d.x * k,
          y: d.y * k,
          textWidth: displayText.length * charWidth,
          textHeight: fontSize * 1.3, // Account for line height
          priority: isDirectChild ? 1 : (isGrandChild ? 2 : 3) // Priority for collision resolution
        });

        element
          .style('display', 'inline')
          .style('opacity', 1)
          .style('font-size', fontSize + 'px')
          .text(displayText);
      } else {
        element
          .style('display', 'none')
          .style('opacity', 0);
      }
    });

    // Apply collision detection and repositioning
    // Sort by priority first (direct children > grandchildren), then by size
    visibleLabels.sort((a, b) => {
      if (a.priority !== b.priority) {
        return a.priority - b.priority; // Lower priority number = higher importance
      }
      return b.effRadius - a.effRadius; // Larger circles first
    });

    // Initialize label positions (will be adjusted for collisions)
    visibleLabels.forEach(label => {
      label.adjustedX = label.x;
      label.adjustedY = label.y;
    });

    // Iterative label positioning to resolve overlaps
    const maxIterations = 15;
    let totalDisplacements = 0;

    for (let iter = 0; iter < maxIterations; iter++) {
      let hadCollision = false;

      for (let i = 0; i < visibleLabels.length; i++) {
        const labelA = visibleLabels[i];

        for (let j = 0; j < i; j++) {
          const labelB = visibleLabels[j];

          // Calculate distance between label centers (using adjusted positions)
          const dx = labelA.adjustedX - labelB.adjustedX;
          const dy = labelA.adjustedY - labelB.adjustedY;
          const distance = Math.sqrt(dx * dx + dy * dy);

          // Calculate minimum safe distance based on text dimensions
          // Add padding to ensure labels don't touch
          const safetyMargin = 1.3;
          const minDistanceX = (labelA.textWidth + labelB.textWidth) / 2;
          const minDistanceY = (labelA.textHeight + labelB.textHeight) / 2;
          const minDistance = Math.max(minDistanceX, minDistanceY) * safetyMargin;

          if (distance < minDistance) {
            hadCollision = true;

            let angle;
            let pushDistance;

            if (distance < 0.1) {
              // Labels are at the SAME position - need to separate them!
              // Use a systematic angle based on their index to spread them out
              angle = (i - j) * (Math.PI / 4); // 45 degree increments
              pushDistance = minDistance; // Push full distance apart
            } else {
              // Labels are close but not identical - push apart along line between them
              angle = Math.atan2(dy, dx);
              const overlap = minDistance - distance;
              pushDistance = overlap * 0.7; // More aggressive push
            }

            // Lower priority label gets pushed away
            labelA.adjustedX += Math.cos(angle) * pushDistance;
            labelA.adjustedY += Math.sin(angle) * pushDistance;

            // Push higher priority label in opposite direction for balance
            if (labelA.priority === labelB.priority) {
              labelB.adjustedX -= Math.cos(angle) * pushDistance * 0.5;
              labelB.adjustedY -= Math.sin(angle) * pushDistance * 0.5;
            }

            totalDisplacements++;
          }
        }
      }

      // If no collisions detected in this iteration, we're done
      if (!hadCollision) {
        console.log(`Label collision resolution converged in ${iter + 1} iterations (${totalDisplacements} total displacements)`);
        break;
      }
    }

    // Apply adjusted positions and check if labels are too far from their circles
    let hiddenCount = 0;
    let displacedCount = 0;

    visibleLabels.forEach(label => {
      // Calculate how far the label has moved from its original position (in screen space)
      const screenDx = label.adjustedX - label.x;
      const screenDy = label.adjustedY - label.y;
      const displacement = Math.sqrt(screenDx * screenDx + screenDy * screenDy);

      // Hide labels that have been pushed too far from their circle
      // (they're no longer clearly associated with their node)
      const maxDisplacement = label.effRadius * 1.8; // Slightly more lenient

      if (displacement > maxDisplacement) {
        // Label moved too far - hide it
        label.element.style('opacity', 0).style('display', 'none');
        hiddenCount++;
      } else {
        // Apply displacement using dx/dy attributes (these work in the SCALED coordinate system)
        // Since the parent group is already scaled by k, we need to apply the offset in unscaled units
        const offsetX = screenDx / k;
        const offsetY = screenDy / k;

        // Keep original transform (circle center), but offset with dx/dy
        label.element
          .attr('dx', offsetX)
          .attr('dy', offsetY + 0.3); // Include the baseline offset

        if (displacement > 1) {
          displacedCount++;
        }

        // Reduce opacity slightly for displaced labels to show uncertainty
        if (displacement > label.effRadius * 0.5) {
          label.element.style('opacity', 0.8);
        }
      }
    });

    console.log(`Labels: ${visibleLabels.length} total, ${displacedCount} displaced, ${hiddenCount} hidden due to excessive displacement`);
  }

  // Initialize zoom to root
  zoomTo([root.x, root.y, root.r * 2]);
}
