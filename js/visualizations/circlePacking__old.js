/**
 * circlePacking.js
 * Circle Packing visualization with Fixed Collision Detection
 */

export function renderCirclePacking(data, showTooltip, hideTooltip) {
  const container = document.getElementById('visualization');
  const width = container.clientWidth;
  const height = container.clientHeight;
  const diameter = Math.min(width, height);

  console.log('Circle Packing dimensions:', { width, height, diameter });

  if (!width || !height) {
    console.error('Invalid dimensions for Circle Packing');
    return;
  }

  // Clear previous
  d3.select('#visualization').selectAll('*').remove();

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

  // Apply pack layout
  try {
    pack(root);
  } catch (error) {
    console.error('Pack failed:', error);
    return;
  }

  // Color scale
  const color = d3.scaleLinear()
    .domain([0, root.height])
    .range(['#40916c', '#0096c7'])
    .interpolate(d3.interpolateHcl);

  // Zoom state
  let focus = root;
  let view;

  // Main group
  const g = svg.append('g')
    .attr('transform', `translate(${width/2 - diameter/2 + 2}, ${height/2 - diameter/2 + 2})`);

  // Layers
  const circlesGroup = g.append('g').attr('class', 'circles-layer');
  const textGroup = g.append('g').attr('class', 'text-layer');

  // Draw Circles
  const circles = circlesGroup.selectAll('circle')
    .data(root.descendants())
    .join('circle')
    .attr('transform', d => `translate(${d.x},${d.y})`)
    .attr('r', d => d.r)
    .attr('fill', d => {
      if (d.data.isSearchMatch) return '#ff4444';
      return d.children ? color(d.depth) : '#40916c';
    })
    .attr('fill-opacity', d => d.children ? 0.3 : 0.6)
    .style('opacity', d => d.depth === 0 ? 0 : 1)
    .style('cursor', 'pointer');

  // Draw Labels
  const labels = textGroup.selectAll('text')
    .data(root.descendants())
    .join('text')
    .attr('transform', d => `translate(${d.x},${d.y})`) // Initial position
    .attr('text-anchor', 'middle')
    .style('pointer-events', 'none')
    .style('fill', '#000')
    .style('font-weight', d => d.depth === 1 ? 'bold' : 'normal')
    .style('opacity', 0); // Hidden by default, shown in zoomTo

  // Event Handlers
  circles
    .on('mouseover', showTooltip)
    .on('mouseout', hideTooltip)
    .on('click', function(event, d) {
      if (event.defaultPrevented) return;
      event.stopPropagation();

      const hasChildren = d.children && d.children.length > 0;
      const items = d.data?.urls || d.data?.content || d.data?.items || [];

      if (hasChildren && focus !== d) {
        zoom(d);
      } else if (items && items.length > 0) {
        const tooltip = d3.select('#tooltip');
        tooltip.datum(d);
        tooltip.dispatch('click');
      } else if (d.data.url) {
        window.open(d.data.url, '_blank');
      }
    });

  svg.on('click', (event) => {
    if (event.target === svg.node() && focus !== root) {
      zoom(root);
    }
  });

  function zoom(d) {
    focus = d;
    const transition = svg.transition()
      .duration(750)
      .tween('zoom', () => {
        const i = d3.interpolateZoom(view, [focus.x, focus.y, focus.r * 2]);
        return t => zoomTo(i(t));
      });
  }

  // --- CORE LOGIC ---
  function zoomTo(v) {
    const k = diameter / v[2];
    view = v;

    // Apply global transform
    g.attr('transform', `translate(${width/2 - v[0]*k + 2}, ${height/2 - v[1]*k + 2})scale(${k})`);

    // 1. PREPARE LABELS
    const visibleLabels = [];

    labels.each(function(d, i) {
      const element = d3.select(this);
      const name = d.data.name || d.data.entity_name || '';
      const effRadius = d.r * k;
      
      // --- YOUR ORIGINAL DESIGN LOGIC STARTS HERE ---
      const hasChildren = d.children && d.children.length > 0;
      const isDirectChild = d.parent === focus;
      const isGrandChild = d.parent && d.parent.parent === focus;
      
      if (!hasChildren && !isDirectChild) {
        element.style('display', 'none').style('opacity', 0);
        return;
      }

      const minRadius = isDirectChild ? 20 : 40;

      if (effRadius > minRadius) {
        // FONT SCALING: Aggressive scaling based on zoom level
        let fontSize = Math.max(10, Math.min(18, effRadius / 4));
        if (d.depth === 1) fontSize = Math.max(fontSize, 12);

        // AGGRESSIVE zoom-based font reduction
        if (k > 2) {
          // Progressive reduction:
          // k=2: 0%, k=4: 25%, k=6: 45%, k=8: 60%, k=10+: 70%
          const zoomReduction = Math.min(0.7, (k - 2) * 0.12);
          fontSize = fontSize * (1 - zoomReduction);
          fontSize = Math.max(6, fontSize); // Minimum 6px
        }

        const charWidth = fontSize * 0.6;
        const maxChars = Math.floor((effRadius * 1.8) / charWidth);
        let displayText = name;
        if (name.length > maxChars) {
          displayText = name.substring(0, maxChars - 2) + '..';
        }
        // --- YOUR ORIGINAL DESIGN LOGIC ENDS HERE ---

        visibleLabels.push({
          element,
          d,
          text: displayText,
          fontSize,
          // Dimensions
          width: displayText.length * charWidth,
          height: fontSize * 1.2,
          // PHYSICS: Start at exact circle center
          x: d.x * k,
          y: d.y * k,
          adjustedX: d.x * k,  // Start at center, physics will separate
          adjustedY: d.y * k,
          // Priority
          priority: isDirectChild ? 10 : 1
        });

        element
          .style('display', 'inline')
          .style('opacity', 1)
          .style('font-size', fontSize + 'px')
          .text(displayText);
      } else {
        element.style('display', 'none').style('opacity', 0);
      }
    });

    // 2. COLLISION RESOLUTION - More iterations and stronger push at high zoom
    const iterations = k > 5 ? 40 : 25; // More iterations when zoomed in

    for (let iter = 0; iter < iterations; iter++) {
      visibleLabels.sort((a, b) => b.priority - a.priority);

      for (let i = 0; i < visibleLabels.length; i++) {
        const a = visibleLabels[i];
        for (let j = i + 1; j < visibleLabels.length; j++) {
          const b = visibleLabels[j];

          let dx = a.adjustedX - b.adjustedX;
          let dy = a.adjustedY - b.adjustedY;
          let dist = Math.sqrt(dx * dx + dy * dy);

          // If distance is practically zero (concentric circles), force separation
          if (dist < 0.1) {
            dx = (Math.random() - 0.5); // Random nudge X
            dy = 1;                     // Force push Y
            dist = 1;
          }

          // Box Collision with MORE padding at high zoom
          const paddingMultiplier = k > 5 ? 0.7 : 0.6;
          const minX = (a.width + b.width) * paddingMultiplier;
          const minY = (a.height + b.height) * paddingMultiplier;

          if (Math.abs(dx) < minX && Math.abs(dy) < minY) {
            const overlapX = minX - Math.abs(dx);
            const overlapY = minY - Math.abs(dy);

            // STRONGER push - scale with zoom level
            const pushStrength = k > 5 ? 0.4 : 0.25; // Much stronger at high zoom

            // Move along shortest path
            if (overlapY < overlapX) {
              const sign = dy > 0 ? 1 : -1;
              const move = overlapY * pushStrength;
              a.adjustedY += sign * move;
              b.adjustedY -= sign * move;
            } else {
              const sign = dx > 0 ? 1 : -1;
              const move = overlapX * pushStrength;
              a.adjustedX += sign * move;
              b.adjustedX -= sign * move;
            }
          }
        }
      }
    }

    // 3. APPLY POSITIONS (with strict displacement limit)
    visibleLabels.forEach(l => {
      // Calculate offset from center
      let dx = l.adjustedX - l.x;
      let dy = l.adjustedY - l.y;
      const displacement = Math.sqrt(dx * dx + dy * dy);

      // STRICT limit: Keep labels VERY close to circles
      // At high zoom, allow less displacement
      const maxDisplacementRatio = k > 5 ? 0.4 : 0.5; // 40-50% of radius
      const maxDisplacement = l.d.r * k * maxDisplacementRatio;

      if (displacement > maxDisplacement) {
        const scale = maxDisplacement / displacement;
        dx *= scale;
        dy *= scale;
      }

      l.element
        .attr('dx', dx / k)
        .attr('dy', (dy / k) + 0.3 + 'em');
    });
  }

  // Initial Zoom
  zoomTo([root.x, root.y, root.r * 2]);
}