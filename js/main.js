/**
 * main.js
 * Main orchestration module for Climate Solutions Visualization
 */

import {
  showTooltip,
  hideTooltip,
  clearTooltipTimeout,
  preprocessDataForD3,
  countNodes,
  extractTypesAndTags,
  populateTypeDropdown,
  populateTagDropdown,
  populateAuthorDropdown,
  populateLocationDropdown,
  setupDropdown,
  closeAllDropdowns,
  downloadJSON,
  downloadCSV,
  exportVisualizationAsSVG,
  exportVisualizationAsPNG,
  showSidePanel,
  hideSidePanel,
  hasManyItems,
  downloadItemsAsTSV,
  addFavorite,
  removeFavorite,
  getFavorites,
  isFavorite,
  clearFavorites,
  exportFavorites
} from './utilities.js';

import {
  initializeSearch,
  updateSearchInfo,
  getFilteredData,
  getSearchSuggestions,
  saveRecentSearch,
  highlightMatch,
  clearRecentSearches
} from './search.js';

import { renderCirclePacking } from './visualizations/circlePacking.js';
import { renderDendrogram } from './visualizations/dendrogram.js';
import { renderTreemap } from './visualizations/treemap.js';
import { renderSunburst } from './visualizations/sunburst.js';

// Global state
let globalData = null;
let searchIndex = null;
let searchQuery = '';
let currentType = 'all';
let currentTag = 'all';
let currentAuthor = 'all';
let currentLocation = 'all';
let currentDateFrom = '';
let currentDateTo = '';
let currentViz = 'sunburst';
const allTypes = new Set();
const allTags = new Set();
const allAuthors = new Set();
const allLocations = new Set();

// Search suggestions state
let selectedSuggestionIndex = -1;
let currentSuggestions = { recent: [], matching: [] };

// URL state management flag
let isApplyingURLState = false;

// ============================================================================
// LOADING STATE MANAGEMENT
// ============================================================================

/**
 * Show loading overlay with optional custom message
 * @param {string} message - Custom loading message (default: "Loading...")
 */
function showLoading(message = 'Loading...') {
  const overlay = document.getElementById('loadingOverlay');
  const text = document.getElementById('loadingText');

  if (overlay) {
    if (text) text.textContent = message;
    overlay.classList.remove('hiding');
    overlay.classList.add('active');
  }
}

/**
 * Hide loading overlay with fade-out animation
 */
function hideLoading() {
  const overlay = document.getElementById('loadingOverlay');

  if (overlay && overlay.classList.contains('active')) {
    overlay.classList.add('hiding');

    // Wait for animation to complete before hiding
    setTimeout(() => {
      overlay.classList.remove('active', 'hiding');
    }, 300);
  }
}

// Make loading functions globally available
window.showLoading = showLoading;
window.hideLoading = hideLoading;

// ============================================================================
// BREADCRUMB NAVIGATION
// ============================================================================

/**
 * Breadcrumb navigation path
 * Array of { name, node } objects representing current navigation path
 */
let breadcrumbPath = [];

/**
 * Update breadcrumb trail based on current navigation path
 * @param {Array} path - Array of {name, node} objects
 */
function updateBreadcrumbs(path = []) {
  const breadcrumbNav = document.getElementById('breadcrumbNav');
  const breadcrumbTrail = document.getElementById('breadcrumbTrail');

  if (!breadcrumbNav || !breadcrumbTrail) return;

  // Store path globally
  breadcrumbPath = path;

  // Clear existing trail
  breadcrumbTrail.innerHTML = '';

  // Show/hide breadcrumb nav based on path
  if (path.length === 0) {
    breadcrumbNav.style.display = 'none';
    return;
  }

  breadcrumbNav.style.display = 'flex';

  // Build breadcrumb items
  path.forEach((item, index) => {
    // Add separator
    const separator = document.createElement('span');
    separator.className = 'breadcrumb-separator';
    separator.textContent = '›';
    breadcrumbTrail.appendChild(separator);

    // Add breadcrumb item
    const breadcrumb = document.createElement('button');
    breadcrumb.className = 'breadcrumb-item';

    // Mark last item as current
    if (index === path.length - 1) {
      breadcrumb.classList.add('current');
    }

    const text = document.createElement('span');
    text.className = 'breadcrumb-text';
    text.textContent = item.name;

    breadcrumb.appendChild(text);
    breadcrumb.title = item.name;

    // Click handler to navigate to this level
    if (index < path.length - 1) {
      breadcrumb.addEventListener('click', () => {
        navigateToBreadcrumb(index);
      });
    }

    breadcrumbTrail.appendChild(breadcrumb);
  });
}

/**
 * Navigate to a specific breadcrumb level
 * @param {number} index - Index in breadcrumbPath to navigate to
 */
function navigateToBreadcrumb(index) {
  if (index < 0 || index >= breadcrumbPath.length) return;

  const targetItem = breadcrumbPath[index];

  // Dispatch custom event for visualizations to handle
  window.dispatchEvent(new CustomEvent('breadcrumbNavigate', {
    detail: {
      node: targetItem.node,
      index: index,
      path: breadcrumbPath.slice(0, index + 1)
    }
  }));

  // Update breadcrumbs to new path
  updateBreadcrumbs(breadcrumbPath.slice(0, index + 1));
}

/**
 * Push a new item to breadcrumb path
 * @param {string} name - Display name
 * @param {object} node - Data node object
 */
function pushBreadcrumb(name, node) {
  breadcrumbPath.push({ name, node });
  updateBreadcrumbs(breadcrumbPath);
}

/**
 * Reset breadcrumbs to root (empty path)
 */
function resetBreadcrumbs() {
  breadcrumbPath = [];
  updateBreadcrumbs([]);
}

// Make breadcrumb functions globally available
window.updateBreadcrumbs = updateBreadcrumbs;
window.pushBreadcrumb = pushBreadcrumb;
window.resetBreadcrumbs = resetBreadcrumbs;
window.navigateToBreadcrumb = navigateToBreadcrumb;

// Home button listener
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('breadcrumbHome')?.addEventListener('click', () => {
    window.dispatchEvent(new CustomEvent('resetVisualization'));
    resetBreadcrumbs();
  });
});

// ============================================================================
// URL DEEP LINKING
// ============================================================================

/**
 * Update URL hash with current application state
 * Format: #viz=sunburst&search=query&type=article&tag=renewable...
 */
function updateURL() {
  // Don't update URL if we're currently applying URL state (prevents loops)
  if (isApplyingURLState) return;

  const params = new URLSearchParams();

  // Add visualization type
  if (currentViz && currentViz !== 'sunburst') {
    params.set('viz', currentViz);
  }

  // Add search query
  if (searchQuery && searchQuery.trim()) {
    params.set('search', searchQuery.trim());
  }

  // Add filters
  if (currentType && currentType !== 'all') {
    params.set('type', currentType);
  }
  if (currentTag && currentTag !== 'all') {
    params.set('tag', currentTag);
  }
  if (currentAuthor && currentAuthor !== 'all') {
    params.set('author', currentAuthor);
  }
  if (currentLocation && currentLocation !== 'all') {
    params.set('location', currentLocation);
  }

  // Add date range
  if (currentDateFrom) {
    params.set('dateFrom', currentDateFrom);
  }
  if (currentDateTo) {
    params.set('dateTo', currentDateTo);
  }

  // Update URL hash
  const hash = params.toString();
  if (hash) {
    history.replaceState(null, '', `#${hash}`);
  } else {
    history.replaceState(null, '', window.location.pathname);
  }
}

/**
 * Parse URL hash and return state object
 * @returns {Object} Parsed state from URL
 */
function parseURL() {
  const hash = window.location.hash.substring(1); // Remove #
  if (!hash) return null;

  const params = new URLSearchParams(hash);
  const state = {};

  // Parse visualization type
  if (params.has('viz')) {
    state.viz = params.get('viz');
  }

  // Parse search query
  if (params.has('search')) {
    state.search = params.get('search');
  }

  // Parse filters
  if (params.has('type')) {
    state.type = params.get('type');
  }
  if (params.has('tag')) {
    state.tag = params.get('tag');
  }
  if (params.has('author')) {
    state.author = params.get('author');
  }
  if (params.has('location')) {
    state.location = params.get('location');
  }

  // Parse date range
  if (params.has('dateFrom')) {
    state.dateFrom = params.get('dateFrom');
  }
  if (params.has('dateTo')) {
    state.dateTo = params.get('dateTo');
  }

  return Object.keys(state).length > 0 ? state : null;
}

/**
 * Apply URL state to the application
 * @param {Object} state - Parsed URL state
 */
function applyURLState(state) {
  if (!state) return;

  isApplyingURLState = true;

  try {
    // Apply visualization type
    if (state.viz) {
      currentViz = state.viz;

      // Update UI
      const vizButtons = document.querySelectorAll('[data-viz]');
      vizButtons.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.viz === state.viz);
      });

      // Update selector display
      const vizValue = document.getElementById('vizValue');
      const activeBtn = document.querySelector(`[data-viz="${state.viz}"]`);
      if (vizValue && activeBtn) {
        vizValue.textContent = activeBtn.dataset.name;
      }
    }

    // Apply search query
    if (state.search) {
      searchQuery = state.search;
      const searchInput = document.getElementById('searchInput');
      if (searchInput) {
        searchInput.value = state.search;
      }
    }

    // Apply type filter
    if (state.type) {
      currentType = state.type;
      const typeValue = document.getElementById('typeValue');
      if (typeValue) {
        typeValue.textContent = state.type === 'all' ? 'All' : state.type;
      }
      // Update dropdown active state
      const typeButtons = document.querySelectorAll('#typeDropdown [data-type]');
      typeButtons.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.type === state.type);
      });
    }

    // Apply tag filter
    if (state.tag) {
      currentTag = state.tag;
      const tagValue = document.getElementById('tagValue');
      if (tagValue) {
        tagValue.textContent = state.tag === 'all' ? 'All' : state.tag;
      }
      // Update dropdown active state
      const tagButtons = document.querySelectorAll('#tagDropdown [data-tag]');
      tagButtons.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tag === state.tag);
      });
    }

    // Apply author filter
    if (state.author) {
      currentAuthor = state.author;
      const authorValue = document.getElementById('authorValue');
      if (authorValue) {
        authorValue.textContent = state.author === 'all' ? 'All' : state.author;
      }
      // Update dropdown active state
      const authorButtons = document.querySelectorAll('#authorDropdown [data-author]');
      authorButtons.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.author === state.author);
      });
    }

    // Apply location filter
    if (state.location) {
      currentLocation = state.location;
      const locationValue = document.getElementById('locationValue');
      if (locationValue) {
        locationValue.textContent = state.location === 'all' ? 'All' : state.location;
      }
      // Update dropdown active state
      const locationButtons = document.querySelectorAll('#locationDropdown [data-location]');
      locationButtons.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.location === state.location);
      });
    }

    // Apply date range
    if (state.dateFrom) {
      currentDateFrom = state.dateFrom;
      const dateFromInput = document.getElementById('dateFrom');
      if (dateFromInput) {
        dateFromInput.value = state.dateFrom;
      }
    }
    if (state.dateTo) {
      currentDateTo = state.dateTo;
      const dateToInput = document.getElementById('dateTo');
      if (dateToInput) {
        dateToInput.value = state.dateTo;
      }
    }

    // Render visualization with applied state
    renderVisualization();

    console.log('Applied URL state:', state);
  } finally {
    isApplyingURLState = false;
  }
}

// Tooltip and side panel references
const tooltip = d3.select('#tooltip');
const sidePanel = document.getElementById('sidePanel');

// Add click handler to tooltip for opening side panel
tooltip.on('click', function() {
  const d = d3.select(this).datum();
  if (d && d.data) {
    const items = d.data?.urls || d.data?.content || d.data?.items || [];
    if (items && items.length > 0) {
      console.log('Tooltip clicked, opening side panel');
      showSidePanel(sidePanel, d);
      hideTooltip(tooltip);
    }
  }
});

// Keep tooltip visible when mouse enters it
tooltip.on('mouseenter', function() {
  // Cancel any pending hide timeout when mouse enters tooltip
  clearTooltipTimeout();
  tooltip.classed('show', true);
});

// Hide tooltip when mouse leaves it
tooltip.on('mouseleave', function() {
  hideTooltip(tooltip);
});

// Global close function for side panel (accessible from onclick in HTML)
window.closeSidePanel = () => {
  hideSidePanel(sidePanel);
};

// Global download function for side panel TSV export
window.downloadPanelItems = (items, nodeName) => {
  downloadItemsAsTSV(items, nodeName);
};

// Global toggle favorite function for side panel
window.togglePanelFavorite = () => {
  const nodeId = window._currentNodeId;
  const nodeData = window._currentNodeData;

  if (!nodeId || !nodeData) return;

  const favorited = isFavorite(nodeId);

  if (favorited) {
    removeFavorite(nodeId);
  } else {
    addFavorite(nodeId, nodeData);
  }

  // Update button
  const favoriteIcon = document.getElementById('favoriteIcon');
  const favoriteBtn = document.getElementById('sidePanelFavoriteBtn');

  if (favoriteIcon && favoriteBtn) {
    const newFavorited = isFavorite(nodeId);
    favoriteIcon.textContent = newFavorited ? '⭐' : '☆';
    favoriteBtn.title = newFavorited ? 'Remove from favorites' : 'Add to favorites';
  }
};

// Render favorites list
function renderFavoritesList() {
  const favorites = getFavorites();
  const container = document.getElementById('favoritesContainer');
  const count = document.getElementById('favoritesCount');
  const exportBtn = document.getElementById('exportFavoritesBtn');
  const clearBtn = document.getElementById('clearFavoritesBtn');

  // Update count
  count.textContent = favorites.length;

  // Show/hide action buttons
  if (favorites.length > 0) {
    exportBtn.style.display = 'flex';
    clearBtn.style.display = 'flex';
  } else {
    exportBtn.style.display = 'none';
    clearBtn.style.display = 'none';
  }

  // Render favorites
  if (favorites.length === 0) {
    container.innerHTML = '<div class="favorites-empty">No favorites yet. Click the ⭐ button when viewing a solution to add it to your favorites.</div>';
    return;
  }

  let html = '';
  favorites.forEach(fav => {
    html += `
      <div class="favorite-item" data-fav-id="${fav.id}">
        <div class="favorite-item-name">${fav.name}</div>
        <div class="favorite-item-path">${fav.path}</div>
        <div class="favorite-item-actions">
          <button class="favorite-item-remove" onclick="window.removeFavoriteItem('${fav.id}')" title="Remove from favorites">Remove</button>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

// Global function to remove favorite item
window.removeFavoriteItem = (nodeId) => {
  if (confirm('Remove this item from favorites?')) {
    removeFavorite(nodeId);
  }
};

// Search suggestions functions
function renderSearchSuggestions(suggestions) {
  const suggestionsContainer = document.getElementById('searchSuggestions');

  if (!suggestions || (suggestions.recent.length === 0 && suggestions.matching.length === 0)) {
    suggestionsContainer.classList.remove('active');
    suggestionsContainer.innerHTML = '';
    selectedSuggestionIndex = -1;
    return;
  }

  let html = '';

  // Recent searches section
  if (suggestions.recent.length > 0) {
    html += '<div class="suggestion-section">';
    html += '<div class="suggestion-label">Recent Searches</div>';
    suggestions.recent.forEach((query, index) => {
      const isSelected = index === selectedSuggestionIndex;
      html += `<div class="suggestion-item ${isSelected ? 'selected' : ''}" data-type="recent" data-query="${query}">`;
      html += '<span class="suggestion-icon">🕐</span>';
      html += `<span class="suggestion-text">${query}</span>`;
      html += '</div>';
    });
    html += '</div>';
  }

  // Matching suggestions section
  if (suggestions.matching.length > 0) {
    const offset = suggestions.recent.length;
    html += '<div class="suggestion-section">';
    html += '<div class="suggestion-label">Suggestions</div>';
    suggestions.matching.forEach((nodeName, index) => {
      const isSelected = (offset + index) === selectedSuggestionIndex;
      const searchInput = document.getElementById('searchInput');
      const query = searchInput ? searchInput.value.trim() : '';
      const highlightedText = highlightMatch(nodeName, query);
      html += `<div class="suggestion-item ${isSelected ? 'selected' : ''}" data-type="match" data-query="${nodeName}">`;
      html += '<span class="suggestion-icon">🔍</span>';
      html += `<span class="suggestion-text">${highlightedText}</span>`;
      html += '</div>';
    });
    html += '</div>';
  }

  suggestionsContainer.innerHTML = html;
  suggestionsContainer.classList.add('active');

  // Add click handlers to suggestion items
  suggestionsContainer.querySelectorAll('.suggestion-item').forEach((item) => {
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      selectSuggestion(item.dataset.query);
    });
  });
}

function hideSearchSuggestions() {
  const suggestionsContainer = document.getElementById('searchSuggestions');
  suggestionsContainer.classList.remove('active');
  suggestionsContainer.innerHTML = '';
  selectedSuggestionIndex = -1;
}

function selectSuggestion(query) {
  const searchInput = document.getElementById('searchInput');
  searchInput.value = query;
  searchQuery = query;

  // Save to recent searches
  saveRecentSearch(query);

  // Hide suggestions
  hideSearchSuggestions();

  // Trigger search
  renderVisualization();
}

function handleSuggestionKeyboard(e) {
  const suggestionsContainer = document.getElementById('searchSuggestions');
  const isActive = suggestionsContainer.classList.contains('active');

  if (!isActive) return;

  const totalSuggestions = currentSuggestions.recent.length + currentSuggestions.matching.length;

  switch (e.key) {
    case 'ArrowDown':
      e.preventDefault();
      selectedSuggestionIndex = Math.min(selectedSuggestionIndex + 1, totalSuggestions - 1);
      renderSearchSuggestions(currentSuggestions);
      break;

    case 'ArrowUp':
      e.preventDefault();
      selectedSuggestionIndex = Math.max(selectedSuggestionIndex - 1, -1);
      renderSearchSuggestions(currentSuggestions);
      break;

    case 'Enter':
      if (selectedSuggestionIndex >= 0) {
        e.preventDefault();
        const allSuggestions = [...currentSuggestions.recent, ...currentSuggestions.matching];
        const selectedQuery = allSuggestions[selectedSuggestionIndex];
        selectSuggestion(selectedQuery);
      } else {
        // Save search when Enter is pressed without selection
        saveRecentSearch(searchQuery);
        hideSearchSuggestions();
      }
      break;

    case 'Escape':
      e.preventDefault();
      hideSearchSuggestions();
      break;
  }
}

// Load and initialize data
async function loadData() {
  showLoading('Loading climate solutions data...');

  try {
    const response = await fetch('db/latest/CD_Solution_map_2_content.json');
    const rawData = await response.json();

    showLoading('Processing data...');

    // Extract types, tags, authors, locations and build search index from RAW data (with urls arrays)
    extractTypesAndTags(rawData, allTypes, allTags, allAuthors, allLocations);
    populateTypeDropdown(allTypes, selectType);
    populateTagDropdown(allTags, selectTag);
    populateAuthorDropdown(allAuthors, selectAuthor);
    populateLocationDropdown(allLocations, selectLocation);
    searchIndex = initializeSearch(rawData);

    // THEN preprocess data to convert urls arrays into D3-compatible hierarchy
    globalData = preprocessDataForD3(rawData);
    console.log('Preprocessed data structure:', globalData);

    const count = countNodes(globalData);
    document.getElementById('searchInfo').textContent = `${count.toLocaleString()} solutions`;

    showLoading('Rendering visualization...');

    // Small delay to let UI update
    await new Promise(resolve => setTimeout(resolve, 100));

    renderVisualization();

    // Hide loading after render completes
    hideLoading();
  } catch (error) {
    console.error('Error loading data:', error);
    hideLoading();
    document.getElementById('visualization').innerHTML = `
      <div class="loading">
        <div class="loading-icon">⚠️</div>
        <div class="loading-text">Error loading data</div>
      </div>
    `;
  }
}

// Render visualization based on current selection
function renderVisualization() {
  // Show loading for visualization switches (brief)
  const vizNames = {
    'circle': 'Circle Packing',
    'dendrogram': 'Dendrogram',
    'treemap': 'Treemap',
    'sunburst': 'Sunburst'
  };
  showLoading(`Rendering ${vizNames[currentViz] || 'visualization'}...`);

  // Use setTimeout to allow loading UI to render before heavy computation
  setTimeout(() => {
    try {
      // Clear previous visualization
      d3.select('#visualization').selectAll('*').remove();

      const filteredData = getFilteredData(globalData, searchQuery, currentType, currentTag, currentAuthor, currentLocation, currentDateFrom, currentDateTo, searchIndex);

      if (!filteredData) {
        hideLoading();
        document.getElementById('visualization').innerHTML = `
          <div class="loading">
            <div class="loading-icon">🔍</div>
            <div class="loading-text">No results found</div>
          </div>
        `;
        return;
      }

      // Create wrapped tooltip functions with tooltip reference
      const wrappedShowTooltip = (event, d) => showTooltip(tooltip, event, d);
      const wrappedHideTooltip = () => hideTooltip(tooltip);

      // Clean up any lingering visualization elements before rendering
      d3.selectAll('.dendrogram-home').remove();
      d3.selectAll('.zoom-controls').remove();
      d3.selectAll('.treemap-zoom-controls').remove();

      switch (currentViz) {
        case 'circle':
          renderCirclePacking(filteredData, wrappedShowTooltip, wrappedHideTooltip);
          break;
        case 'dendrogram':
          renderDendrogram(filteredData, wrappedShowTooltip, wrappedHideTooltip);
          break;
        case 'treemap':
          renderTreemap(filteredData, wrappedShowTooltip, wrappedHideTooltip);
          break;
        case 'sunburst':
          renderSunburst(filteredData, wrappedShowTooltip, wrappedHideTooltip);
          break;
      }

      // DISABLED - Show the home and up buttons after rendering visualization
      // Uncomment to re-enable home and up arrow navigation buttons
      /*
      if (window.showHomeButton) {
        window.showHomeButton();
      }
      if (window.showUpButton) {
        window.showUpButton();
      }
      */

      updateSearchInfo(filteredData);

      // Hide loading after render completes
      hideLoading();
    } catch (error) {
      console.error('Error rendering visualization:', error);
      hideLoading();
    }
  }, 50); // Small delay to let loading UI render

  // Update URL with current state (for deep linking)
  updateURL();
}

// Handle home button click - simply re-render the visualization to reset state
window.addEventListener('resetVisualization', () => {
  renderVisualization();
});

// Type filter selection
function selectType(type, btn) {
  currentType = type;
  document.getElementById('typeValue').textContent = type === 'all' ? 'All' : type;

  // Update active state
  document.querySelectorAll('#typeDropdown .dropdown-option').forEach(opt => {
    opt.classList.remove('active');
  });
  btn.classList.add('active');

  closeAllDropdowns();
  renderVisualization();
}

// Tag filter selection
function selectTag(tag, btn) {
  currentTag = tag;
  document.getElementById('tagValue').textContent = tag === 'all' ? 'All' : tag;

  // Update active state
  document.querySelectorAll('#tagDropdown .dropdown-option').forEach(opt => {
    opt.classList.remove('active');
  });
  btn.classList.add('active');

  closeAllDropdowns();
  renderVisualization();
}

// Author filter selection
function selectAuthor(author, btn) {
  currentAuthor = author;
  document.getElementById('authorValue').textContent = author === 'all' ? 'All' : author;

  // Update active state
  document.querySelectorAll('#authorDropdown .dropdown-option').forEach(opt => {
    opt.classList.remove('active');
  });
  btn.classList.add('active');

  closeAllDropdowns();
  renderVisualization();
}

// Location filter selection
function selectLocation(location, btn) {
  currentLocation = location;
  document.getElementById('locationValue').textContent = location === 'all' ? 'All' : location;

  // Update active state
  document.querySelectorAll('#locationDropdown .dropdown-option').forEach(opt => {
    opt.classList.remove('active');
  });
  btn.classList.add('active');

  closeAllDropdowns();
  renderVisualization();
}

// Reset all filters
function resetAllFilters() {
  // Reset state variables
  searchQuery = '';
  currentType = 'all';
  currentTag = 'all';
  currentAuthor = 'all';
  currentLocation = 'all';
  currentDateFrom = '';
  currentDateTo = '';

  // Clear search input
  document.getElementById('searchInput').value = '';

  // Clear date range inputs
  document.getElementById('dateFrom').value = '';
  document.getElementById('dateTo').value = '';

  // Reset filter display values
  document.getElementById('typeValue').textContent = 'All';
  document.getElementById('tagValue').textContent = 'All';
  document.getElementById('authorValue').textContent = 'All';
  document.getElementById('locationValue').textContent = 'All';

  // Reset active states in dropdowns
  document.querySelectorAll('#typeDropdown .dropdown-option').forEach(opt => {
    opt.classList.remove('active');
    if (opt.dataset.type === 'all') opt.classList.add('active');
  });
  document.querySelectorAll('#tagDropdown .dropdown-option').forEach(opt => {
    opt.classList.remove('active');
    if (opt.dataset.tag === 'all') opt.classList.add('active');
  });
  document.querySelectorAll('#authorDropdown .dropdown-option').forEach(opt => {
    opt.classList.remove('active');
    if (opt.dataset.author === 'all') opt.classList.add('active');
  });
  document.querySelectorAll('#locationDropdown .dropdown-option').forEach(opt => {
    opt.classList.remove('active');
    if (opt.dataset.location === 'all') opt.classList.add('active');
  });

  // Re-render visualization
  renderVisualization();
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  // Setup dropdowns
  setupDropdown('vizSelector', 'vizDropdown');
  setupDropdown('typeSelector', 'typeDropdown');
  setupDropdown('tagSelector', 'tagDropdown');
  setupDropdown('authorSelector', 'authorDropdown');
  setupDropdown('locationSelector', 'locationDropdown');

  // Setup visualization selector
  document.querySelectorAll('#vizDropdown .dropdown-option').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      currentViz = btn.dataset.viz;
      document.getElementById('vizValue').textContent = btn.textContent;

      // Update active state
      document.querySelectorAll('#vizDropdown .dropdown-option').forEach(opt => {
        opt.classList.remove('active');
      });
      btn.classList.add('active');

      closeAllDropdowns();
      renderVisualization();
    });
  });

  // Setup search with suggestions
  const searchInput = document.getElementById('searchInput');

  searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value.trim();

    // Get and render suggestions
    if (globalData) {
      currentSuggestions = getSearchSuggestions(searchQuery, globalData);
      renderSearchSuggestions(currentSuggestions);
    }

    // Only re-render visualization if user has typed something or cleared the search
    if (searchQuery.length > 0 || e.target.value === '') {
      renderVisualization();
    }
  });

  // Handle keyboard navigation for suggestions
  searchInput.addEventListener('keydown', handleSuggestionKeyboard);

  // Show recent searches when search input is focused
  searchInput.addEventListener('focus', () => {
    if (globalData && searchInput.value.trim().length === 0) {
      currentSuggestions = getSearchSuggestions('', globalData);
      renderSearchSuggestions(currentSuggestions);
    }
  });

  // Hide suggestions when clicking outside
  document.addEventListener('click', (e) => {
    const suggestionsContainer = document.getElementById('searchSuggestions');
    if (!searchInput.contains(e.target) && !suggestionsContainer.contains(e.target)) {
      hideSearchSuggestions();
    }
  });

  // Setup advanced search panel
  const advancedSearchToggle = document.getElementById('advancedSearchToggle');
  const advancedSearchPanel = document.getElementById('advancedSearchPanel');

  advancedSearchToggle.addEventListener('click', () => {
    const isVisible = advancedSearchPanel.style.display !== 'none';

    if (isVisible) {
      advancedSearchPanel.style.display = 'none';
      advancedSearchToggle.classList.remove('active');
    } else {
      advancedSearchPanel.style.display = 'block';
      advancedSearchToggle.classList.add('active');
    }
  });

  // Setup example queries
  document.querySelectorAll('.search-example').forEach(example => {
    example.addEventListener('click', () => {
      const query = example.getAttribute('data-query');
      searchInput.value = query;
      searchQuery = query;

      // Hide advanced panel
      advancedSearchPanel.style.display = 'none';
      advancedSearchToggle.classList.remove('active');

      // Trigger search
      renderVisualization();
    });
  });

  // Setup date range filters
  document.getElementById('dateFrom').addEventListener('change', (e) => {
    currentDateFrom = e.target.value;
    renderVisualization();
  });

  document.getElementById('dateTo').addEventListener('change', (e) => {
    currentDateTo = e.target.value;
    renderVisualization();
  });

  // Setup reset filters button
  document.getElementById('resetFilters').addEventListener('click', () => {
    resetAllFilters();
  });

  // Setup export buttons - export FILTERED data
  document.getElementById('exportJSON').addEventListener('click', () => {
    // Get current filtered data
    const filteredData = getFilteredData(
      globalData,
      searchQuery,
      currentType,
      currentTag,
      currentAuthor,
      currentLocation,
      currentDateFrom,
      currentDateTo,
      searchIndex
    );

    // Pass filter metadata
    const filters = {
      search: searchQuery,
      type: currentType,
      tag: currentTag,
      author: currentAuthor,
      location: currentLocation,
      dateFrom: currentDateFrom,
      dateTo: currentDateTo
    };

    downloadJSON(filteredData || globalData, filters);
  });

  document.getElementById('exportCSV').addEventListener('click', () => {
    // Get current filtered data
    const filteredData = getFilteredData(
      globalData,
      searchQuery,
      currentType,
      currentTag,
      currentAuthor,
      currentLocation,
      currentDateFrom,
      currentDateTo,
      searchIndex
    );

    // Pass filter metadata
    const filters = {
      search: searchQuery,
      type: currentType,
      tag: currentTag,
      author: currentAuthor,
      location: currentLocation,
      dateFrom: currentDateFrom,
      dateTo: currentDateTo
    };

    downloadCSV(filteredData || globalData, filters);
  });

  // Setup SVG export button
  document.getElementById('exportSVG').addEventListener('click', () => {
    const filters = {
      search: searchQuery,
      type: currentType,
      tag: currentTag,
      author: currentAuthor,
      location: currentLocation,
      dateFrom: currentDateFrom,
      dateTo: currentDateTo
    };

    exportVisualizationAsSVG(filters);
  });

  // Setup PNG export button
  document.getElementById('exportPNG').addEventListener('click', () => {
    const filters = {
      search: searchQuery,
      type: currentType,
      tag: currentTag,
      author: currentAuthor,
      location: currentLocation,
      dateFrom: currentDateFrom,
      dateTo: currentDateTo
    };

    exportVisualizationAsPNG(filters);
  });

  // Close dropdowns when clicking outside
  document.addEventListener('click', closeAllDropdowns);

  // Window resize handler
  let resizeTimeout;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      renderVisualization();
    }, 250);
  });

  // Setup favorites functionality
  // Render favorites list on page load
  renderFavoritesList();

  // Listen for favorites changes
  window.addEventListener('favoritesChanged', () => {
    renderFavoritesList();
  });

  // Export favorites button
  document.getElementById('exportFavoritesBtn').addEventListener('click', () => {
    exportFavorites();
  });

  // Clear favorites button
  document.getElementById('clearFavoritesBtn').addEventListener('click', () => {
    if (confirm('Are you sure you want to clear all favorites? This cannot be undone.')) {
      clearFavorites();
    }
  });

  // Setup browser navigation (back/forward buttons)
  window.addEventListener('popstate', () => {
    console.log('Popstate event - restoring state from URL');
    const urlState = parseURL();
    if (urlState) {
      applyURLState(urlState);
    }
  });

  // Load data
  loadData();

  // Apply URL state after data is loaded (if URL has parameters)
  // This will be called after loadData completes
  const initialURLState = parseURL();
  if (initialURLState) {
    console.log('Initial URL state detected:', initialURLState);
    // Wait for data to load before applying URL state
    const checkDataLoaded = setInterval(() => {
      if (globalData && searchIndex) {
        clearInterval(checkDataLoaded);
        applyURLState(initialURLState);
      }
    }, 100);
  }
});
