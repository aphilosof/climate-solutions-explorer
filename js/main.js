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
  getFilteredData
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
let currentViz = 'sunburst';
const allTypes = new Set();
const allTags = new Set();
const allAuthors = new Set();
const allLocations = new Set();

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

  const filteredData = getFilteredData(globalData, searchQuery, currentType, currentTag, currentAuthor, currentLocation, searchIndex);

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

  // Show the home button after rendering visualization
  if (window.showHomeButton) {
    window.showHomeButton();
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

  // Clear search input
  document.getElementById('searchInput').value = '';

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

  // Setup search
  document.getElementById('searchInput').addEventListener('input', (e) => {
    searchQuery = e.target.value.trim();
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
