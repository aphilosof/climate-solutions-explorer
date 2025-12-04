/**
 * circlePacking.js - DYNAMIC ADAPTIVE VERSION (OBSERVABLE-STYLE)
 * Smart font sizing that adapts to actual collision results
 */

export function renderCirclePacking(data, showTooltip, hideTooltip) {
  const container = document.getElementById('visualization');
  const width = container.clientWidth;
  const height = container.clientHeight;
  const diameter = Math.min(width, height);

  if (!width || !height) return;

  d3.select('#visualization').selectAll('*').remove();

  const svg = d3.select('#visualization')
    .append('svg')
    .attr('width', width)
    .attr('height', height);

  const pack = d3.pack()
    .size([diameter - 4, diameter - 4])
    .padding(3);

  const root = d3.hierarchy(data)
    .sum(d => (!d.children || d.children.length === 0 ? 1 : 0))
    .sort((a, b) => b.value - a.value);

  try {
    pack(root);
  } catch (error) {
    console.error('Pack failed:', error);
    return;
  }

  const color = d3.scaleLinear()
    .domain([0, root.height])
    .range(['#40916c', '#0096c7'])
    .interpolate(d3.interpolateHcl);

  let focus = root;
  let view;

  const g = svg.append('g')
    .attr('transform', `translate(${width/2 - diameter/2 + 2}, ${height/2 - diameter/2 + 2})`);

  const circlesGroup = g.append('g').attr('class', 'circles-layer');
  const textGroup = g.append('g').attr('class', 'text-layer');

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

  const labels = textGroup.selectAll('text')
    .data(root.descendants())
    .join('text')
    .attr('transform', d => `translate(${d.x},${d.y})`)
    .attr('text-anchor', 'middle')
    .style('pointer-events', 'none')
    .style('fill', '#000')
    .style('font-weight', d => d.depth === 1 ? 'bold' : 'normal')
    .style('opacity', 0);

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

  // DYNAMIC ADAPTIVE LABELING
  function zoomTo(v) {
    const k = diameter / v[2];
    view = v;
    g.attr('transform', `translate(${width/2 - v[0]*k + 2}, ${height/2 - v[1]*k + 2})scale(${k})`);

    const candidates = [];

    // 1. INITIAL CANDIDATE SELECTION
    labels.each(function(d, i) {
      const element = d3.select(this);
      const name = d.data.name || d.data.entity_name || '';
      const hasChildren = d.children && d.children.length > 0;
      const isDirectChild = d.parent === focus;

      if (!hasChildren) {
        element.style('display', 'none').style('opacity', 0);
        return;
      }

      const effRadius = d.r * k;
      const minEffRadius = isDirectChild ? 25 : 60;
      if (effRadius < minEffRadius) {
        element.style('display', 'none').style('opacity', 0);
        return;
      }

      // INITIAL font size based on UNIFORM SCALING (your original intention)
      let fontSize;
      if (effRadius < 40) fontSize = 9;
      else if (effRadius < 70) fontSize = 10;
      else if (effRadius < 100) fontSize = 11;
      else if (effRadius < 150) fontSize = 12;
      else fontSize = Math.min(18, 14 + (effRadius - 150) / 100);

      // Add Jitter offset for physics stability
      const jitter = i * 0.2; 

      candidates.push({
        element,
        name,
        effRadius,
        fontSize, // THIS WILL BE ADJUSTED IN THE LOOP
        isDirectChild,
        x: d.x * k,
        y: d.y * k,
        // Start position includes jitter
        adjustedX: (d.x * k) + Math.cos(jitter), 
        adjustedY: (d.y * k) + Math.sin(jitter),
        // Priority based on relevance and size
        priority: (isDirectChild ? 1000 : 100) + effRadius
      });
    });

    // Sort by priority (highest first)
    candidates.sort((a, b) => b.priority - a.priority);


    // 2. ADAPTIVE ITERATION LOOP
    const maxRounds = 10; // Max attempts to fit the labels
    const collisionIters = 20;
    const pushStrength = 0.5; // Strong force for dense packing

    for (let round = 0; round < maxRounds; round++) {
      // Update dimensions based on current font size before collision check
      candidates.forEach(c => {
        const charWidth = c.fontSize * 0.7; // Generous horizontal estimate
        c.textWidth = c.name.length * charWidth;
        c.height = c.fontSize * 1.5; // Generous vertical estimate

        // Truncate based on current font size
        const maxChars = Math.floor((c.effRadius * 1.6) / charWidth);
        c.displayText = c.name.length > maxChars ? c.name.substring(0, Math.max(0, maxChars - 2)) + '..' : c.name;
      });

      let hadDisplacement = false;
      
      // RUN COLLISION PHYSICS
      for (let iter = 0; iter < collisionIters; iter++) {
        for (let i = 0; i < candidates.length; i++) {
          const a = candidates[i];
          for (let j = i + 1; j < candidates.length; j++) {
            const b = candidates[j];

            let dx = a.adjustedX - b.adjustedX;
            let dy = a.adjustedY - b.adjustedY;
            let dist = Math.sqrt(dx * dx + dy * dy);

            // Handle zero distance
            if (dist < 0.1) { dx = 0.1; dy = 1; dist = 1; } 

            const minX = (a.textWidth + b.textWidth) / 2;
            const minY = (a.height + b.height) / 2;

            if (Math.abs(dx) < minX && Math.abs(dy) < minY) {
              hadDisplacement = true;
              const overlapX = minX - Math.abs(dx);
              const overlapY = minY - Math.abs(dy);

              if (overlapY < overlapX * 1.5) { // Prefer Vertical Push
                const sign = dy > 0 ? 1 : -1;
                const move = overlapY * pushStrength;
                b.adjustedY -= sign * move;
                a.adjustedY += sign * move;
              } else {
                const sign = dx > 0 ? 1 : -1;
                const move = overlapX * pushStrength;
                b.adjustedX -= sign * move;
                a.adjustedX += sign * move;
              }
            }
          }
        }
      }
      if (!hadDisplacement && round > 0) break; // Optimization

      // ADAPTIVE RESIZE STEP: Check displacement, reduce font size if too far
      let anyResized = false;
      candidates.forEach(c => {
        const dx = c.adjustedX - c.x;
        const dy = c.adjustedY - c.y;
        const displacement = Math.sqrt(dx * dx + dy * dy);
        // Max displacement is 50% of the circle's scaled radius
        const maxDisplacement = c.effRadius * 0.5;

        if (displacement > maxDisplacement && c.fontSize > 9) {
          // Label is floating away, shrink it to make it more "flexible"
          c.fontSize *= 0.8;
          c.fontSize = Math.max(9, c.fontSize);
          
          // Reset position to try again with the smaller font
          c.adjustedX = c.x;
          c.adjustedY = c.y;
          anyResized = true;
        }
      });

      if (!anyResized) break; // Converged
    }

    // 3. FINAL PASS: Render or Cull
    candidates.forEach(c => {
      const dx = c.adjustedX - c.x;
      const dy = c.adjustedY - c.y;
      const displacement = Math.sqrt(dx * dx + dy * dy);
      const maxDisplacement = c.effRadius * 0.6; // Slightly more lenient final check

      if (displacement > maxDisplacement || c.fontSize < 9) {
        // Label is too displaced or too small after attempts - HIDE
        c.element.style('display', 'none').style('opacity', 0);
      } else {
        // SHOW with final position and font
        c.element
          .style('display', 'inline')
          .style('opacity', 1)
          .style('font-size', c.fontSize + 'px')
          .text(c.displayText)
          .attr('dx', dx / k)
          .attr('dy', (dy / k) + 0.3 + 'em');
      }
    });
  }

  zoomTo([root.x, root.y, root.r * 2]);
}