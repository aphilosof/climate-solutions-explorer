/**
 * utilities.js
 * Utility functions for data processing, tooltips, and exports
 */

// Tooltip functions
const CONTENT_THRESHOLD = 2; // Show in side panel if more than 2 items
const TOOLTIP_HIDE_DELAY = 800; // Delay before hiding tooltip (ms)
let tooltipHideTimeout = null; // Timeout for delayed hiding

export function showTooltip(tooltip, event, d) {
  // Clear any pending hide timeout
  if (tooltipHideTimeout) {
    clearTimeout(tooltipHideTimeout);
    tooltipHideTimeout = null;
  }
  const name = d.data?.name || d.data?.entity_name || 'Unknown';
  const type = d.data?.type || '';

  tooltip.select('.tooltip-name').text(name);

  // Check for content items in urls/content/items arrays
  const items = d.data?.urls || d.data?.content || d.data?.items || [];

  console.log(`Tooltip for "${name}": ${items ? items.length : 0} items`);

  if (items && Array.isArray(items) && items.length > 0) {
    // Check threshold: >2 items → show prompt, ≤2 items → show content
    if (items.length > CONTENT_THRESHOLD) {
      // More than threshold: Show prompt to click TOOLTIP (not circle)
      console.log(`  → Showing "click to view" prompt (${items.length} > ${CONTENT_THRESHOLD})`);
      let detailsHtml = `<div style="text-align: center; padding: 10px;">`;
      detailsHtml += `<div style="margin-bottom: 5px;"><strong>${items.length} items available</strong></div>`;
      detailsHtml += `<div style="font-size: 0.9em; color: #aaa;">Click this box to view details</div>`;
      detailsHtml += `</div>`;
      tooltip.select('.tooltip-details').html(detailsHtml);

      // Make tooltip clickable and store data for click handler
      tooltip.classed('clickable', true);
      tooltip.datum(d); // Store node data in tooltip

      // Position tooltip ONCE and don't update position on mousemove
      // Only set position if not already showing
      if (!tooltip.classed('show')) {
        tooltip
          .style('left', (event.pageX + 15) + 'px')
          .style('top', (event.pageY - 15) + 'px');
      }
      // Don't update position if already visible - let user click it
    } else {
      console.log(`  → Showing inline content (${items.length} ≤ ${CONTENT_THRESHOLD})`);
      // Threshold or less: Show content inline, make it clickable so user can interact
      tooltip.classed('clickable', true);
      tooltip.datum(d); // Store node data in tooltip

      let detailsHtml = `<div style="margin-bottom: 5px;"><strong>Content (${items.length} items):</strong></div>`;
      detailsHtml += `<div style="font-size: 0.85em; color: #aaa; margin-bottom: 8px;">Click to view in side panel</div>`;

      items.forEach(item => {
        const itemTitle = item.title || item.name || 'Untitled';
        const itemType = item.type_ || item.type || '';
        const itemAuthor = item.author || item.creator || '';
        const itemUrl = item.url || '';
        const itemDate = item.date || '';

        detailsHtml += `<div style="margin: 8px 0; padding: 6px; border-left: 2px solid #40916c; background: rgba(64, 145, 108, 0.05);">`;

        if (itemUrl) {
          detailsHtml += `<div style="font-weight: 500;"><a href="${itemUrl}" target="_blank" onclick="event.stopPropagation()" style="color: #40916c; text-decoration: none;">${itemTitle}</a></div>`;
        } else {
          detailsHtml += `<div style="font-weight: 500;">${itemTitle}</div>`;
        }

        if (itemType || itemAuthor || itemDate) {
          detailsHtml += `<div style="font-size: 0.85em; color: #666; margin-top: 3px;">`;
          if (itemType) detailsHtml += `Type: ${itemType}`;
          if (itemAuthor) detailsHtml += ` | Author: ${itemAuthor}`;
          if (itemDate) detailsHtml += ` | ${itemDate}`;
          detailsHtml += `</div>`;
        }

        detailsHtml += `</div>`;
      });

      tooltip.select('.tooltip-details').html(detailsHtml);

      // Position ONCE and keep it fixed so user can interact with links
      if (!tooltip.classed('show')) {
        tooltip
          .style('left', (event.pageX + 15) + 'px')
          .style('top', (event.pageY - 15) + 'px');
      }
    }
  } else {
    // Fallback to type display if no content items
    tooltip.classed('clickable', false);
    tooltip.select('.tooltip-details').text(type ? `Type: ${type}` : '');

    // Position normally
    tooltip
      .style('left', (event.pageX + 15) + 'px')
      .style('top', (event.pageY - 15) + 'px');
  }

  // Always show the tooltip
  tooltip.classed('show', true);
}

// Clear tooltip hide timeout
export function clearTooltipTimeout() {
  if (tooltipHideTimeout) {
    clearTimeout(tooltipHideTimeout);
    tooltipHideTimeout = null;
  }
}

export function hideTooltip(tooltip) {
  // Clear any existing timeout
  clearTooltipTimeout();

  // For clickable tooltips, delay hiding to give user time to move mouse to tooltip
  if (tooltip.classed('clickable')) {
    tooltipHideTimeout = setTimeout(() => {
      // Only hide if mouse is not over tooltip
      const tooltipNode = tooltip.node();
      if (tooltipNode && !tooltipNode.matches(':hover')) {
        tooltip.classed('show', false);
        tooltip.classed('clickable', false);
      }
    }, TOOLTIP_HIDE_DELAY); // Longer grace period
  } else {
    // For non-clickable tooltips, hide immediately
    tooltip.classed('show', false);
    tooltip.classed('clickable', false);
  }
}

// Side panel functions
export function showSidePanel(sidePanel, d) {
  const name = d.data?.name || d.data?.entity_name || 'Unknown';
  const items = d.data?.urls || d.data?.content || d.data?.items || [];

  if (!items || !Array.isArray(items) || items.length === 0) {
    return; // Don't show panel if no items
  }

  // Store items and node data in global variables
  window._currentPanelItems = items;
  window._currentPanelName = name;
  window._currentNodeData = d.data;
  window._currentNodeId = d.data?.name || name; // Use name as ID

  // Check if this node is favorited
  const favorited = isFavorite(window._currentNodeId);
  const starIcon = favorited ? '⭐' : '☆';
  const starTitle = favorited ? 'Remove from favorites' : 'Add to favorites';

  // Build panel content
  let contentHtml = `
    <div class="side-panel-header">
      <h3>${name}</h3>
      <div class="side-panel-actions">
        <button class="favorite-btn" id="sidePanelFavoriteBtn" onclick="window.togglePanelFavorite()" title="${starTitle}">
          <span id="favoriteIcon">${starIcon}</span>
        </button>
        <button class="download-btn" onclick="window.downloadPanelItems(window._currentPanelItems, window._currentPanelName)" title="Download as TSV">
          <span>📥</span>
          <span>Download TSV</span>
        </button>
        <button class="close-btn" onclick="window.closeSidePanel()">×</button>
      </div>
    </div>
    <div class="side-panel-body">
      <div style="margin-bottom: 10px;"><strong>${items.length} Items:</strong></div>
  `;

  items.forEach((item, index) => {
    const itemTitle = item.title || item.name || 'Untitled';
    const itemType = item.type_ || item.type || '';
    const itemAuthor = item.author || item.creator || '';
    const itemUrl = item.url || '';
    const itemDate = item.date || '';
    const itemDescription = item.description || item.abstract || '';
    const itemTags = item.tags || '';

    contentHtml += `<div class="side-panel-item">`;
    contentHtml += `<div class="item-number">${index + 1}</div>`;
    contentHtml += `<div class="item-content">`;

    if (itemUrl) {
      contentHtml += `<div class="item-title"><a href="${itemUrl}" target="_blank" onclick="event.stopPropagation()">${itemTitle}</a></div>`;
    } else {
      contentHtml += `<div class="item-title">${itemTitle}</div>`;
    }

    if (itemType || itemAuthor || itemDate) {
      contentHtml += `<div class="item-meta">`;
      if (itemType) contentHtml += `<span>Type: ${itemType}</span>`;
      if (itemAuthor) contentHtml += `<span>Author: ${itemAuthor}</span>`;
      if (itemDate) contentHtml += `<span>Date: ${itemDate}</span>`;
      contentHtml += `</div>`;
    }

    if (itemDescription) {
      contentHtml += `<div class="item-description">${itemDescription}</div>`;
    }

    if (itemTags) {
      const tagsArray = Array.isArray(itemTags) ? itemTags : itemTags.split(',').map(t => t.trim());
      contentHtml += `<div class="item-tags">`;
      tagsArray.forEach(tag => {
        contentHtml += `<span class="tag">${tag}</span>`;
      });
      contentHtml += `</div>`;
    }

    contentHtml += `</div></div>`;
  });

  contentHtml += `</div>`;

  sidePanel.innerHTML = contentHtml;
  sidePanel.classList.add('open');
}

export function hideSidePanel(sidePanel) {
  sidePanel.classList.remove('open');
}

// Helper to check if node has many items (above threshold)
export function hasManyItems(d) {
  const items = d.data?.urls || d.data?.content || d.data?.items || [];
  return items && Array.isArray(items) && items.length > CONTENT_THRESHOLD;
}

// Data preprocessing: Convert urls arrays into proper D3 hierarchy nodes
export function preprocessDataForD3(node) {
  const processed = {
    name: node.name || node.entity_name || 'Unnamed'
  };

  // Preserve node-level properties
  if (node.type) processed.type = node.type;
  if (node.tags) processed.tags = node.tags;

  // IMPORTANT: Preserve original items array for tooltip/side panel access
  const items = node.url_data || node.urls || node.content || node.items || [];
  if (Array.isArray(items) && items.length > 0) {
    processed.urls = items; // Store original items array
  }

  // Collect all children (both category children and content items)
  const childNodes = [];

  // First, recursively process existing category children
  if (node.children && Array.isArray(node.children) && node.children.length > 0) {
    node.children.forEach(child => {
      const processedChild = preprocessDataForD3(child);
      // Only include child if it has content (children or is a leaf)
      if (processedChild.children || processedChild.isLeaf) {
        childNodes.push(processedChild);
      }
    });
  }

  // Then, convert urls/content/items arrays into leaf children
  if (Array.isArray(items) && items.length > 0) {
    items.forEach(item => {
      // Extract meaningful name from various sources
      let itemName = item.title || item.name;

      // If no title/name, try to use URL domain or description as fallback
      if (!itemName && item.url) {
        try {
          const urlObj = new URL(item.url);
          itemName = urlObj.hostname.replace('www.', '');
        } catch (e) {
          itemName = item.url.substring(0, 50);
        }
      }

      if (!itemName && item.description) {
        itemName = item.description.substring(0, 50) + '...';
      }

      if (!itemName) {
        itemName = 'Untitled';
      }

      const leafNode = {
        name: itemName,
        url: item.url || '',
        type: item.type_ || item.type || '',
        author: item.author || item.creator || '',
        tags: item.tags || [],
        description: item.description || item.abstract || '',
        date: item.date || '',
        confidence: item.confidence,
        isLeaf: true,  // Mark as actual content leaf
        // IMPORTANT: Preserve the original item as a single-item array for tooltip
        urls: [item]  // Wrap in array so tooltip code works consistently
      };
      childNodes.push(leafNode);
    });
  }

  // Add children array if we have children, OR mark as leaf if we have none
  if (childNodes.length > 0) {
    processed.children = childNodes;
  } else {
    // Empty category node - mark as placeholder leaf
    processed.isLeaf = true;
    processed.isEmpty = true;
  }

  return processed;
}

// Count total nodes in hierarchy
export function countNodes(data) {
  if (!data) return 0;

  let count = 0;
  function traverse(node) {
    if (!node) return;
    count++;
    if (node.children) node.children.forEach(traverse);
  }
  traverse(data);
  return count;
}

// Extract unique types and tags from data
export function extractTypesAndTags(node, allTypes, allTags, allAuthors = null, allLocations = null) {
  // Extract from node-level properties (if they exist)
  if (node.type) allTypes.add(node.type);
  if (node.tags && Array.isArray(node.tags)) {
    node.tags.forEach(tag => allTags.add(tag));
  }

  // Extract from content arrays (url_data, urls, content, items)
  const items = node.url_data || node.urls || node.content || node.items || [];
  if (Array.isArray(items) && items.length > 0) {
    items.forEach(item => {
      // Handle various property name patterns
      const type = item.type_ || item.type || item.category;
      const tags = item.tags || item.keywords || item.categories;
      const author = item.author || item.creator || item.source;
      const location = item.location || item.country || item.region;

      if (type && String(type).trim()) {
        allTypes.add(String(type).trim());
      }

      // Extract authors
      if (allAuthors && author && String(author).trim()) {
        allAuthors.add(String(author).trim());
      }

      // Extract locations
      if (allLocations && location && String(location).trim()) {
        allLocations.add(String(location).trim());
      }

      // Handle tags - can be array or comma-separated string
      if (Array.isArray(tags)) {
        tags.forEach(tag => {
          if (tag && String(tag).trim()) {
            allTags.add(String(tag).trim());
          }
        });
      } else if (tags && typeof tags === 'string') {
        // Split comma-separated tags
        tags.split(',').forEach(tag => {
          const trimmed = tag.trim();
          if (trimmed) {
            allTags.add(trimmed);
          }
        });
      }
    });
  }

  // Recursively process children
  if (node.children) {
    node.children.forEach(child => extractTypesAndTags(child, allTypes, allTags, allAuthors, allLocations));
  }
}

// Populate type dropdown
export function populateTypeDropdown(allTypes, onSelect) {
  const dropdown = document.getElementById('typeDropdown');
  const sortedTypes = Array.from(allTypes).sort();

  sortedTypes.forEach(type => {
    const btn = document.createElement('button');
    btn.className = 'dropdown-option';
    btn.dataset.type = type;
    btn.textContent = type;
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      onSelect(type, btn);
    });
    dropdown.appendChild(btn);
  });
}

// Populate tag dropdown
export function populateTagDropdown(allTags, onSelect) {
  const dropdown = document.getElementById('tagDropdown');
  const sortedTags = Array.from(allTags).sort();

  sortedTags.forEach(tag => {
    const btn = document.createElement('button');
    btn.className = 'dropdown-option';
    btn.dataset.tag = tag;
    btn.textContent = tag;
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      onSelect(tag, btn);
    });
    dropdown.appendChild(btn);
  });
}

// Populate author dropdown
export function populateAuthorDropdown(allAuthors, onSelect) {
  const dropdown = document.getElementById('authorDropdown');
  const sortedAuthors = Array.from(allAuthors).sort();

  sortedAuthors.forEach(author => {
    const btn = document.createElement('button');
    btn.className = 'dropdown-option';
    btn.dataset.author = author;
    btn.textContent = author;
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      onSelect(author, btn);
    });
    dropdown.appendChild(btn);
  });
}

// Populate location dropdown
export function populateLocationDropdown(allLocations, onSelect) {
  const dropdown = document.getElementById('locationDropdown');
  const sortedLocations = Array.from(allLocations).sort();

  sortedLocations.forEach(location => {
    const btn = document.createElement('button');
    btn.className = 'dropdown-option';
    btn.dataset.location = location;
    btn.textContent = location;
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      onSelect(location, btn);
    });
    dropdown.appendChild(btn);
  });
}

// Setup dropdown functionality
export function setupDropdown(btnId, dropdownId) {
  const btn = document.getElementById(btnId);
  const dropdown = document.getElementById(dropdownId);

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    closeAllDropdowns();
    dropdown.classList.toggle('show');
  });
}

// Close all dropdowns
export function closeAllDropdowns() {
  document.querySelectorAll('.dropdown').forEach(d => d.classList.remove('show'));
}

// Flatten hierarchy for export
export function flattenHierarchy(node, parent = null, result = []) {
  const entry = {
    name: node.name || node.entity_name || '',
    parent: parent || '',
    type: node.type || '',
    tags: Array.isArray(node.tags) ? node.tags.join(', ') : '',
    url: node.url || '',
    author: node.author || '',
    description: node.description || '',
    date: node.date || ''
  };

  result.push(entry);

  if (node.children) {
    node.children.forEach(child => {
      flattenHierarchy(child, node.name, result);
    });
  }

  return result;
}

// Generate filename with filter info
export function generateExportFilename(extension, filters = {}) {
  const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const parts = ['climate-solutions'];

  // Add filter info to filename
  if (filters.search && filters.search.trim()) {
    parts.push(`search-${filters.search.replace(/[^a-z0-9]/gi, '-').substring(0, 20)}`);
  }
  if (filters.type && filters.type !== 'all') {
    parts.push(`type-${filters.type.replace(/[^a-z0-9]/gi, '-')}`);
  }
  if (filters.tag && filters.tag !== 'all') {
    parts.push(`tag-${filters.tag.replace(/[^a-z0-9]/gi, '-')}`);
  }
  if (filters.author && filters.author !== 'all') {
    parts.push(`author-${filters.author.replace(/[^a-z0-9]/gi, '-').substring(0, 20)}`);
  }
  if (filters.location && filters.location !== 'all') {
    parts.push(`location-${filters.location.replace(/[^a-z0-9]/gi, '-')}`);
  }
  if (filters.dateFrom || filters.dateTo) {
    const dateRange = `${filters.dateFrom || 'start'}-to-${filters.dateTo || 'end'}`;
    parts.push(dateRange);
  }

  parts.push(timestamp);

  return `${parts.join('_')}.${extension}`;
}

// Download data as JSON with metadata
export function downloadJSON(data, filters = {}) {
  // Count total nodes
  const nodeCount = countNodes(data);

  // Create export object with metadata
  const exportData = {
    metadata: {
      exportDate: new Date().toISOString(),
      totalNodes: nodeCount,
      filters: {
        search: filters.search || '',
        type: filters.type || 'all',
        tag: filters.tag || 'all',
        author: filters.author || 'all',
        location: filters.location || 'all',
        dateFrom: filters.dateFrom || '',
        dateTo: filters.dateTo || ''
      }
    },
    data: data
  };

  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = generateExportFilename('json', filters);
  a.click();
  URL.revokeObjectURL(url);
}

// Download data as CSV (deduplicated, no metadata comments)
export function downloadCSV(data, filters = {}) {
  const flatData = flattenHierarchy(data);

  if (flatData.length === 0) {
    alert('No data to export');
    return;
  }

  // Deduplicate entries based on URL (or name+url if no URL)
  const uniqueData = [];
  const seen = new Set();

  flatData.forEach(row => {
    // Create unique key: use URL if available, otherwise name+parent combination
    const uniqueKey = row.url ? row.url : `${row.name}|${row.parent}`;

    if (!seen.has(uniqueKey)) {
      seen.add(uniqueKey);
      uniqueData.push(row);
    }
  });

  const headers = Object.keys(uniqueData[0]);
  const csvContent = [
    headers.join(','),
    ...uniqueData.map(row =>
      headers.map(header => {
        const value = row[header] || '';
        return `"${String(value).replace(/"/g, '""')}"`;
      }).join(',')
    )
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = generateExportFilename('csv', filters);
  a.click();
  URL.revokeObjectURL(url);
}

// Download the source TSV file
export function downloadItemsAsTSV(items, nodeName) {
  // Path to the source TSV file
  const tsvPath = 'db/latest/CD_Solution_map_2_content.tsv';

  // Create download link
  const a = document.createElement('a');
  a.href = tsvPath;
  a.download = 'CD_Solution_map_2_content.tsv';
  a.click();
}

// Export current visualization as SVG
export function exportVisualizationAsSVG(filters = {}) {
  const svg = document.querySelector('#visualization svg');

  if (!svg) {
    alert('No visualization found to export');
    return;
  }

  // Clone the SVG to avoid modifying the original
  const clonedSvg = svg.cloneNode(true);

  // Get computed styles and add them inline
  const styleSheets = document.styleSheets;
  let cssText = '';

  // Extract relevant CSS rules
  for (let i = 0; i < styleSheets.length; i++) {
    try {
      const rules = styleSheets[i].cssRules || styleSheets[i].rules;
      if (rules) {
        for (let j = 0; j < rules.length; j++) {
          const rule = rules[j];
          if (rule.selectorText && (
            rule.selectorText.includes('svg') ||
            rule.selectorText.includes('path') ||
            rule.selectorText.includes('circle') ||
            rule.selectorText.includes('text') ||
            rule.selectorText.includes('line') ||
            rule.selectorText.includes('rect')
          )) {
            cssText += rule.cssText + '\n';
          }
        }
      }
    } catch (e) {
      // Skip stylesheets that can't be accessed (CORS)
      console.warn('Could not access stylesheet:', e);
    }
  }

  // Add styles to SVG
  const styleElement = document.createElementNS('http://www.w3.org/2000/svg', 'style');
  styleElement.textContent = cssText;
  clonedSvg.insertBefore(styleElement, clonedSvg.firstChild);

  // Serialize SVG to string
  const serializer = new XMLSerializer();
  const svgString = serializer.serializeToString(clonedSvg);

  // Add XML declaration
  const svgBlob = new Blob(
    ['<?xml version="1.0" encoding="UTF-8"?>\n' + svgString],
    { type: 'image/svg+xml;charset=utf-8' }
  );

  // Download
  const url = URL.createObjectURL(svgBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = generateExportFilename('svg', filters);
  a.click();
  URL.revokeObjectURL(url);
}

// Export current visualization as PNG
export function exportVisualizationAsPNG(filters = {}) {
  const svg = document.querySelector('#visualization svg');

  if (!svg) {
    alert('No visualization found to export');
    return;
  }

  // Hide tooltip and side panel before export
  const tooltip = document.getElementById('tooltip');
  const sidePanel = document.getElementById('sidePanel');
  const originalTooltipDisplay = tooltip ? tooltip.style.display : '';
  const originalSidePanelDisplay = sidePanel ? sidePanel.style.display : '';

  if (tooltip) tooltip.style.display = 'none';
  if (sidePanel) sidePanel.style.display = 'none';

  // Clone the SVG to avoid modifying the original
  const clonedSvg = svg.cloneNode(true);

  // Get SVG dimensions
  const bbox = svg.getBoundingClientRect();
  const width = bbox.width;
  const height = bbox.height;

  // Get computed styles and add them inline
  const styleSheets = document.styleSheets;
  let cssText = '';

  // Extract relevant CSS rules
  for (let i = 0; i < styleSheets.length; i++) {
    try {
      const rules = styleSheets[i].cssRules || styleSheets[i].rules;
      if (rules) {
        for (let j = 0; j < rules.length; j++) {
          const rule = rules[j];
          if (rule.selectorText && (
            rule.selectorText.includes('svg') ||
            rule.selectorText.includes('path') ||
            rule.selectorText.includes('circle') ||
            rule.selectorText.includes('text') ||
            rule.selectorText.includes('line') ||
            rule.selectorText.includes('rect')
          )) {
            cssText += rule.cssText + '\n';
          }
        }
      }
    } catch (e) {
      // Skip stylesheets that can't be accessed (CORS)
      console.warn('Could not access stylesheet:', e);
    }
  }

  // Add styles to SVG
  const styleElement = document.createElementNS('http://www.w3.org/2000/svg', 'style');
  styleElement.textContent = cssText;
  clonedSvg.insertBefore(styleElement, clonedSvg.firstChild);

  // Set explicit width and height on cloned SVG
  clonedSvg.setAttribute('width', width);
  clonedSvg.setAttribute('height', height);

  // Serialize SVG to string
  const serializer = new XMLSerializer();
  const svgString = serializer.serializeToString(clonedSvg);

  // Create image from SVG
  const img = new Image();
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  // Set canvas size (2x for higher resolution)
  const scale = 2;
  canvas.width = width * scale;
  canvas.height = height * scale;

  // Scale context for high DPI
  ctx.scale(scale, scale);

  // Fill white background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  img.onload = function() {
    // Draw image onto canvas
    ctx.drawImage(img, 0, 0, width, height);

    // Restore tooltip and side panel display
    if (tooltip) tooltip.style.display = originalTooltipDisplay;
    if (sidePanel) sidePanel.style.display = originalSidePanelDisplay;

    // Convert canvas to blob and download
    canvas.toBlob(blob => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = generateExportFilename('png', filters);
      a.click();
      URL.revokeObjectURL(url);
    }, 'image/png', 1.0);
  };

  img.onerror = function(error) {
    // Restore tooltip and side panel display
    if (tooltip) tooltip.style.display = originalTooltipDisplay;
    if (sidePanel) sidePanel.style.display = originalSidePanelDisplay;

    console.error('Error loading SVG image:', error);
    alert('Failed to export PNG. Please try SVG export instead.');
  };

  // Create data URL from SVG string
  const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);
  img.src = url;
}

// ==================== FAVORITES MANAGEMENT ====================

const FAVORITES_KEY = 'climate-solutions-favorites';

// Add a node to favorites
export function addFavorite(nodeId, nodeData) {
  const favorites = getFavorites();

  // Check if already favorited
  if (favorites.some(fav => fav.id === nodeId)) {
    return false; // Already in favorites
  }

  // Create favorite entry
  const favorite = {
    id: nodeId,
    name: nodeData.name,
    path: getNodePath(nodeData),
    timestamp: new Date().toISOString(),
    data: nodeData // Store full node data for later use
  };

  favorites.push(favorite);
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));

  // Dispatch event to update UI
  window.dispatchEvent(new CustomEvent('favoritesChanged'));

  return true;
}

// Remove a node from favorites
export function removeFavorite(nodeId) {
  const favorites = getFavorites();
  const filtered = favorites.filter(fav => fav.id !== nodeId);

  if (filtered.length === favorites.length) {
    return false; // Not in favorites
  }

  localStorage.setItem(FAVORITES_KEY, JSON.stringify(filtered));

  // Dispatch event to update UI
  window.dispatchEvent(new CustomEvent('favoritesChanged'));

  return true;
}

// Get all favorites
export function getFavorites() {
  try {
    const stored = localStorage.getItem(FAVORITES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    console.error('Error reading favorites:', e);
    return [];
  }
}

// Check if a node is favorited
export function isFavorite(nodeId) {
  const favorites = getFavorites();
  return favorites.some(fav => fav.id === nodeId);
}

// Clear all favorites
export function clearFavorites() {
  localStorage.removeItem(FAVORITES_KEY);
  window.dispatchEvent(new CustomEvent('favoritesChanged'));
}

// Export favorites as JSON
export function exportFavorites() {
  const favorites = getFavorites();

  if (favorites.length === 0) {
    alert('No favorites to export');
    return;
  }

  const exportData = {
    exportDate: new Date().toISOString(),
    totalFavorites: favorites.length,
    favorites: favorites
  };

  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `climate-solutions-favorites-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// Helper function to get node path
function getNodePath(nodeData) {
  const pathParts = [];
  let current = nodeData;

  while (current) {
    if (current.name) {
      pathParts.unshift(current.name);
    }
    current = current.parent;
  }

  return pathParts.join(' > ');
}
