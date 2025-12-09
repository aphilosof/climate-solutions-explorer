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
  showSidePanel,
  hideSidePanel,
  hasManyItems,
  downloadItemsAsTSV
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
  try {
    const response = await fetch('db/latest/CD_Solution_map_2_content.json');
    const rawData = await response.json();

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

    renderVisualization();
  } catch (error) {
    console.error('Error loading data:', error);
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
  // Clear previous visualization
  d3.select('#visualization').selectAll('*').remove();

  const filteredData = getFilteredData(globalData, searchQuery, currentType, currentTag, currentAuthor, currentLocation, currentDateFrom, currentDateTo, searchIndex);

  if (!filteredData) {
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

  // Show the home and up buttons after rendering visualization
  if (window.showHomeButton) {
    window.showHomeButton();
  }
  if (window.showUpButton) {
    window.showUpButton();
  }

  updateSearchInfo(filteredData);
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

  // Setup export buttons
  document.getElementById('exportJSON').addEventListener('click', () => {
    downloadJSON(globalData);
  });

  document.getElementById('exportCSV').addEventListener('click', () => {
    downloadCSV(globalData);
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

  // Load data
  loadData();
});
