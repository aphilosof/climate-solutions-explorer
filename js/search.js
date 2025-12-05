/**
 * search.js
 * Search indexing and filtering functionality
 */

import { countNodes } from './utilities.js';

let searchIndex = null;

// Initialize search index with MiniSearch
export function initializeSearch(data) {
  const documents = [];

  function extractDocs(node, path = []) {
    const nodeName = node.name || node.entity_name || '';
    const currentPath = [...path, nodeName];

    // Collect ALL text content from this node and its content items
    const items = node.url_data || node.urls || node.content || node.items || [];
    const allContentText = [];

    // Add node info
    if (nodeName) allContentText.push(nodeName);
    if (node.description) allContentText.push(node.description);
    if (node.tags) allContentText.push(Array.isArray(node.tags) ? node.tags.join(' ') : node.tags);

    // Add ALL content item text
    if (Array.isArray(items)) {
      items.forEach(item => {
        if (item && typeof item === 'object') {
          if (item.title || item.name) allContentText.push(item.title || item.name);
          if (item.description || item.abstract) allContentText.push(item.description || item.abstract);
          if (item.author || item.creator) allContentText.push(item.author || item.creator);
          if (item.type_ || item.type) allContentText.push(item.type_ || item.type);
          if (item.tags) allContentText.push(Array.isArray(item.tags) ? item.tags.join(' ') : item.tags);
        }
      });
    }

    // Add path for context
    allContentText.push(currentPath.join(' '));

    // Create ONE document per node with ALL its content
    if (nodeName) {
      const contentTextStr = allContentText.filter(t => t && String(t).trim()).join(' ');

      documents.push({
        id: documents.length,
        name: nodeName,
        description: contentTextStr,
        content_text: contentTextStr,  // CRITICAL: All searchable content
        type: node.type || '',
        tags: node.tags ? (Array.isArray(node.tags) ? node.tags.join(' ') : node.tags) : '',
        path: currentPath.join(' > '),
        node: node
      });
    }

    // Recurse to children
    if (node.children) {
      node.children.forEach(child => extractDocs(child, currentPath));
    }
  }

  extractDocs(data);

  searchIndex = new MiniSearch({
    fields: ['name', 'description', 'content_text', 'type', 'tags', 'path'],
    storeFields: ['name', 'type', 'path'],
    searchOptions: {
      boost: { name: 3, type: 2, path: 1.8, content_text: 1.5, description: 1.2, tags: 1.2 },
      fuzzy: 0.2,
      combineWith: 'AND'  // CRITICAL: All search terms must match
    }
  });

  searchIndex.addAll(documents);
  console.log(`Search index built with ${documents.length} items`);

  return searchIndex;
}

// Update search result count display
export function updateSearchInfo(filteredData) {
  const count = countNodes(filteredData);
  document.getElementById('searchInfo').textContent = `${count.toLocaleString()} result${count !== 1 ? 's' : ''}`;
}

// Get filtered data based on search query, type, tag, author, location, and date range
export function getFilteredData(globalData, searchQuery, currentType, currentTag, currentAuthor, currentLocation, dateFrom, dateTo, searchIndexInstance) {
  let data = globalData;
  let matchedNames = null;

  // Apply search
  if (searchQuery) {
    let results;

    // Check if query contains boolean operators
    if (containsBooleanOperators(searchQuery)) {
      results = executeBooleanSearch(searchQuery, searchIndexInstance);
    } else {
      // Use searchSingleTerm for consistent behavior with combineWith: 'AND'
      results = searchSingleTerm(searchQuery, searchIndexInstance);
    }

    // Extract matched names instead of node references (since preprocessing creates new nodes)
    // Filter out empty names
    matchedNames = new Set(results.map(r => r.name).filter(name => name && name.trim()));
    console.log('Search results:', results.length, 'unique names:', matchedNames.size);
    console.log('First 5 matched names:', Array.from(matchedNames).slice(0, 5));
    console.log('Sample result:', results[0]);
    data = filterBySearchNames(data, matchedNames);
  }

  // Apply type filter
  if (currentType !== 'all') {
    data = filterByType(data, currentType);
  }

  // Apply tag filter
  if (currentTag !== 'all') {
    data = filterByTag(data, currentTag);
  }

  // Apply author filter
  if (currentAuthor !== 'all') {
    data = filterByAuthor(data, currentAuthor);
  }

  // Apply location filter
  if (currentLocation !== 'all') {
    data = filterByLocation(data, currentLocation);
  }

  // Apply date range filter
  if (dateFrom || dateTo) {
    data = filterByDateRange(data, dateFrom, dateTo);
  }

  // Mark nodes for highlighting if search was performed
  if (matchedNames) {
    markSearchHighlightsByName(data, matchedNames);
  }

  // Mark nodes for filter highlighting
  if (currentType !== 'all') {
    markTypeMatches(data, currentType);
  }
  if (currentTag !== 'all') {
    markTagMatches(data, currentTag);
  }
  if (currentAuthor !== 'all') {
    markAuthorMatches(data, currentAuthor);
  }
  if (currentLocation !== 'all') {
    markLocationMatches(data, currentLocation);
  }
  if (dateFrom || dateTo) {
    markDateMatches(data, dateFrom, dateTo);
  }

  return data;
}

// Check if query contains boolean operators
function containsBooleanOperators(query) {
  return /\b(AND|OR|NOT)\b/i.test(query);
}

// Execute boolean search
function executeBooleanSearch(queryText, searchIndexInstance) {
  console.log(`Executing boolean search for: "${queryText}"`);

  // Handle OR operator first (lowest precedence)
  if (/\bOR\b/i.test(queryText)) {
    return handleOrSearch(queryText, searchIndexInstance);
  }

  // Handle AND operator
  if (/\bAND\b/i.test(queryText)) {
    return handleAndSearch(queryText, searchIndexInstance);
  }

  // Handle NOT operator
  if (/\bNOT\b/i.test(queryText)) {
    return handleNotSearch(queryText, searchIndexInstance);
  }

  // Fallback to simple search
  return searchIndexInstance.search(queryText, { prefix: true });
}

// Handle OR searches - union of results
function handleOrSearch(queryText, searchIndexInstance) {
  const orParts = queryText.split(/\s+OR\s+/i).map(part => part.trim());
  console.log('OR parts:', orParts);

  const allResults = new Map();

  orParts.forEach(part => {
    let partResults = [];

    if (/\b(AND|NOT)\b/i.test(part)) {
      partResults = executeBooleanSearch(part, searchIndexInstance);
    } else {
      const cleanPart = part.trim();
      if (cleanPart) {
        partResults = searchSingleTerm(cleanPart, searchIndexInstance);
      }
    }

    partResults.forEach(result => {
      if (!allResults.has(result.id) || allResults.get(result.id).score < result.score) {
        allResults.set(result.id, result);
      }
    });
  });

  const results = Array.from(allResults.values()).sort((a, b) => b.score - a.score);
  console.log(`OR search combined ${orParts.length} parts into ${results.length} results`);
  return results;
}

// Handle AND searches - intersection of results
function handleAndSearch(queryText, searchIndexInstance) {
  const andParts = queryText.split(/\s+AND\s+/i).map(part => part.trim());
  console.log('AND parts:', andParts);

  if (andParts.length === 0) return [];

  // Get results for first part with combineWith: 'AND'
  let results = searchSingleTerm(andParts[0], searchIndexInstance);

  // Intersect with results from remaining parts
  for (let i = 1; i < andParts.length; i++) {
    const part = andParts[i].trim();
    if (!part) continue;

    const partResults = searchSingleTerm(part, searchIndexInstance);
    const partIds = new Set(partResults.map(r => r.id));

    // Keep only results that appear in both sets
    results = results.filter(result => partIds.has(result.id));

    if (results.length === 0) break; // No point continuing if no intersection
  }

  console.log(`AND search intersected ${andParts.length} parts into ${results.length} results`);
  return results.sort((a, b) => b.score - a.score);
}

// Search for a single term or phrase
function searchSingleTerm(term, searchIndexInstance) {
  if (!term || term.length < 1) return [];

  const cleanTerm = cleanSearchTerm(term);
  if (!cleanTerm) return [];

  console.log(`Searching single term: "${cleanTerm}"`);

  try {
    // Handle quoted phrases
    if (cleanTerm.startsWith('"') && cleanTerm.endsWith('"')) {
      const phrase = cleanTerm.slice(1, -1);
      return searchIndexInstance.search(phrase, {
        prefix: false,
        fuzzy: 0.1,
        combineWith: 'AND'
      });
    }

    // Regular term search with combineWith: 'AND' so "solar energy" requires BOTH words
    return searchIndexInstance.search(cleanTerm, {
      prefix: true,
      fuzzy: 0.2,
      combineWith: 'AND'
    });
  } catch (error) {
    console.error(`Error searching for term "${cleanTerm}":`, error);
    return [];
  }
}

// Clean search term by removing boolean operators
function cleanSearchTerm(term) {
  if (!term) return '';

  // Remove boolean operators that might be left over
  const cleaned = term
    .replace(/\b(AND|OR|NOT)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  return cleaned;
}

// Handle NOT searches - exclude results
function handleNotSearch(queryText, searchIndexInstance) {
  const notMatch = queryText.match(/^(.+?)\s+NOT\s+(.+)$/i);

  if (!notMatch) {
    const notAtStart = queryText.match(/^NOT\s+(.+)$/i);
    if (notAtStart) {
      const excludeTerm = cleanSearchTerm(notAtStart[1]);
      if (excludeTerm) {
        // Get all results and exclude the NOT term
        const allResults = searchIndexInstance.search('', { prefix: true });
        const excludeResults = searchSingleTerm(excludeTerm, searchIndexInstance);
        const excludeIds = new Set(excludeResults.map(r => r.id));

        const results = allResults.filter(result => !excludeIds.has(result.id));
        console.log(`NOT search excluded ${excludeResults.length} results, returning ${results.length}`);
        return results;
      }
    }
    return [];
  }

  const [, includePart, excludePart] = notMatch;
  console.log(`NOT search: include "${includePart}", exclude "${excludePart}"`);

  let includeResults = [];
  if (includePart.trim()) {
    if (/\b(AND|OR)\b/i.test(includePart)) {
      includeResults = executeBooleanSearch(includePart, searchIndexInstance);
    } else {
      includeResults = searchSingleTerm(includePart, searchIndexInstance);
    }
  }

  let excludeResults = [];
  if (excludePart.trim()) {
    excludeResults = searchSingleTerm(excludePart, searchIndexInstance);
  }

  const excludeIds = new Set(excludeResults.map(r => r.id));
  const results = includeResults.filter(result => !excludeIds.has(result.id));

  console.log(`NOT search: ${includeResults.length} include - ${excludeResults.length} exclude = ${results.length} results`);
  return results;
}

// Mark nodes that matched search for highlighting in visualizations (by name)
// Returns true if this node or any descendant matched
function markSearchHighlightsByName(node, matchedNames) {
  if (!node) return false;

  // Check if this node's name matched the search directly
  const directMatch = matchedNames.has(node.name);
  node.isSearchMatch = directMatch;

  // Recursively mark children and check if any descendants matched
  let hasMatchedDescendants = false;
  if (node.children && Array.isArray(node.children)) {
    node.children.forEach(child => {
      const childOrDescendantMatched = markSearchHighlightsByName(child, matchedNames);
      if (childOrDescendantMatched) {
        hasMatchedDescendants = true;
      }
    });
  }

  // If any descendant matched, mark this node as having matched descendants
  if (hasMatchedDescendants) {
    node.hasMatchedDescendants = true;
    // Also mark as search match so it gets highlighted (but we can distinguish in viz)
    node.isSearchMatch = true;
  }

  return directMatch || hasMatchedDescendants;
}

// Filter by search results (by name instead of object reference)
function filterBySearchNames(node, matchedNames, depth = 0) {
  if (!node) return null;

  // Check if this node's name matches
  const nodeMatches = matchedNames.has(node.name);

  if (nodeMatches && depth < 3) {
    console.log(`  ${'  '.repeat(depth)}✓ Match: "${node.name}"`);
  }

  // Check children recursively
  let filteredChildren = [];
  if (node.children && Array.isArray(node.children)) {
    filteredChildren = node.children
      .map(child => filterBySearchNames(child, matchedNames, depth + 1))
      .filter(child => child !== null);
  }

  // Include this node if:
  // 1. Its name matches the search, OR
  // 2. Any of its children matched (so we can show the hierarchy path)
  if (nodeMatches || filteredChildren.length > 0) {
    return { ...node, children: filteredChildren.length > 0 ? filteredChildren : node.children };
  }

  return null;
}

// Mark nodes that match type filter for highlighting
// Returns true if this node or any descendant matched
function markTypeMatches(node, type) {
  if (!node) return false;

  const directMatch = node.type === type;
  node.isTypeMatch = directMatch;

  let hasMatchedDescendants = false;
  if (node.children && Array.isArray(node.children)) {
    node.children.forEach(child => {
      if (markTypeMatches(child, type)) {
        hasMatchedDescendants = true;
      }
    });
  }

  if (hasMatchedDescendants) {
    node.hasTypeMatchedDescendants = true;
    node.isTypeMatch = true;
  }

  return directMatch || hasMatchedDescendants;
}

// Filter by type
function filterByType(node, type) {
  const nodeMatches = node.type === type;

  if (node.children) {
    const filteredChildren = node.children
      .map(child => filterByType(child, type))
      .filter(child => child !== null);

    if (nodeMatches || filteredChildren.length > 0) {
      return { ...node, children: filteredChildren };
    }
  } else if (nodeMatches) {
    return { ...node };
  }

  return null;
}

// Mark nodes that match tag filter for highlighting
// Returns true if this node or any descendant matched
function markTagMatches(node, tag) {
  if (!node) return false;

  const directMatch = node.tags && node.tags.includes(tag);
  node.isTagMatch = directMatch;

  let hasMatchedDescendants = false;
  if (node.children && Array.isArray(node.children)) {
    node.children.forEach(child => {
      if (markTagMatches(child, tag)) {
        hasMatchedDescendants = true;
      }
    });
  }

  if (hasMatchedDescendants) {
    node.hasTagMatchedDescendants = true;
    node.isTagMatch = true;
  }

  return directMatch || hasMatchedDescendants;
}

// Filter by tag
function filterByTag(node, tag) {
  const nodeMatches = node.tags && node.tags.includes(tag);

  if (node.children) {
    const filteredChildren = node.children
      .map(child => filterByTag(child, tag))
      .filter(child => child !== null);

    if (nodeMatches || filteredChildren.length > 0) {
      return { ...node, children: filteredChildren };
    }
  } else if (nodeMatches) {
    return { ...node };
  }

  return null;
}

// Mark nodes that match author filter for highlighting
// Returns true if this node or any descendant matched
function markAuthorMatches(node, author) {
  if (!node) return false;

  const items = node.urls || node.content || node.items || [];
  const directMatch = Array.isArray(items) && items.some(item => {
    const itemAuthor = item.author || item.creator || item.source;
    return itemAuthor === author;
  });
  node.isAuthorMatch = directMatch;

  let hasMatchedDescendants = false;
  if (node.children && Array.isArray(node.children)) {
    node.children.forEach(child => {
      if (markAuthorMatches(child, author)) {
        hasMatchedDescendants = true;
      }
    });
  }

  if (hasMatchedDescendants) {
    node.hasAuthorMatchedDescendants = true;
    node.isAuthorMatch = true;
  }

  return directMatch || hasMatchedDescendants;
}

// Filter by author - check in content items
function filterByAuthor(node, author) {
  // Check if any content items match the author
  const items = node.urls || node.content || node.items || [];
  const nodeMatches = Array.isArray(items) && items.some(item => {
    const itemAuthor = item.author || item.creator || item.source;
    return itemAuthor === author;
  });

  if (node.children) {
    const filteredChildren = node.children
      .map(child => filterByAuthor(child, author))
      .filter(child => child !== null);

    if (nodeMatches || filteredChildren.length > 0) {
      return { ...node, children: filteredChildren };
    }
  } else if (nodeMatches) {
    return { ...node };
  }

  return null;
}

// Mark nodes that match location filter for highlighting
// Returns true if this node or any descendant matched
function markLocationMatches(node, location) {
  if (!node) return false;

  const items = node.urls || node.content || node.items || [];
  const directMatch = Array.isArray(items) && items.some(item => {
    const itemLocation = item.location || item.country || item.region;
    return itemLocation === location;
  });
  node.isLocationMatch = directMatch;

  let hasMatchedDescendants = false;
  if (node.children && Array.isArray(node.children)) {
    node.children.forEach(child => {
      if (markLocationMatches(child, location)) {
        hasMatchedDescendants = true;
      }
    });
  }

  if (hasMatchedDescendants) {
    node.hasLocationMatchedDescendants = true;
    node.isLocationMatch = true;
  }

  return directMatch || hasMatchedDescendants;
}

// Filter by location - check in content items
function filterByLocation(node, location) {
  // Check if any content items match the location
  const items = node.urls || node.content || node.items || [];
  const nodeMatches = Array.isArray(items) && items.some(item => {
    const itemLocation = item.location || item.country || item.region;
    return itemLocation === location;
  });

  if (node.children) {
    const filteredChildren = node.children
      .map(child => filterByLocation(child, location))
      .filter(child => child !== null);

    if (nodeMatches || filteredChildren.length > 0) {
      return { ...node, children: filteredChildren };
    }
  } else if (nodeMatches) {
    return { ...node };
  }

  return null;
}

// ============================================================================
// DATE FILTERING
// ============================================================================

/**
 * Parse date string to Date object
 * Handles various formats: YYYY-MM-DD, YYYY-MM, YYYY, ISO strings
 */
function parseDate(dateStr) {
  if (!dateStr) return null;

  try {
    // Handle various date formats
    const str = String(dateStr).trim();

    // ISO format or full date
    if (str.match(/^\d{4}-\d{2}-\d{2}/)) {
      return new Date(str);
    }

    // Year-month format (YYYY-MM)
    if (str.match(/^\d{4}-\d{2}$/)) {
      return new Date(str + '-01');
    }

    // Year only (YYYY)
    if (str.match(/^\d{4}$/)) {
      return new Date(str + '-01-01');
    }

    // Try to parse as-is
    const date = new Date(str);
    if (!isNaN(date.getTime())) {
      return date;
    }
  } catch (e) {
    // Invalid date
  }

  return null;
}

/**
 * Mark nodes that match date range for highlighting
 * Returns true if this node or any descendant matched
 */
function markDateMatches(node, dateFrom, dateTo) {
  if (!node) return false;

  const items = node.urls || node.content || node.items || [];
  const directMatch = Array.isArray(items) && items.some(item => {
    const itemDate = parseDate(item.date || item.published_date || item.publish_date);
    if (!itemDate) return false;

    // Check if date is within range
    const fromDate = dateFrom ? parseDate(dateFrom) : null;
    const toDate = dateTo ? parseDate(dateTo) : null;

    if (fromDate && itemDate < fromDate) return false;
    if (toDate && itemDate > toDate) return false;

    return true;
  });

  node.isDateMatch = directMatch;

  let hasMatchedDescendants = false;
  if (node.children && Array.isArray(node.children)) {
    node.children.forEach(child => {
      if (markDateMatches(child, dateFrom, dateTo)) {
        hasMatchedDescendants = true;
      }
    });
  }

  if (hasMatchedDescendants) {
    node.hasDateMatchedDescendants = true;
    node.isDateMatch = true;
  }

  return directMatch || hasMatchedDescendants;
}

/**
 * Filter by date range - check content items
 */
function filterByDateRange(node, dateFrom, dateTo) {
  const items = node.urls || node.content || node.items || [];
  const nodeMatches = Array.isArray(items) && items.some(item => {
    const itemDate = parseDate(item.date || item.published_date || item.publish_date);
    if (!itemDate) return false;

    const fromDate = dateFrom ? parseDate(dateFrom) : null;
    const toDate = dateTo ? parseDate(dateTo) : null;

    if (fromDate && itemDate < fromDate) return false;
    if (toDate && itemDate > toDate) return false;

    return true;
  });

  if (node.children) {
    const filteredChildren = node.children
      .map(child => filterByDateRange(child, dateFrom, dateTo))
      .filter(child => child !== null);

    if (nodeMatches || filteredChildren.length > 0) {
      return { ...node, children: filteredChildren };
    }
  } else if (nodeMatches) {
    return { ...node };
  }

  return null;
}
