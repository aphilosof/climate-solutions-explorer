/**
 * search_WORKING.js - Exact copy of working implementation from index______.html
 * Search indexing and filtering functionality
 */

import { countNodes } from './utilities.js';

let searchIndex = null;
let miniSearch = null;

// Initialize search index with MiniSearch from D3 hierarchy root
export function initializeSearch(hierarchyRoot) {
  const documents = [];
  let docId = 0;

  function extractSearchableContent(node, path = []) {
    const currentPath = [...path, node.data.name];

    // Create comprehensive searchable text for the node
    const nodeSearchText = [
      node.data.name || '',
      node.data.description || '',
      node.data.title || '',
      node.data.summary || '',
      currentPath.join(' ')
    ].filter(text => text && text.trim()).join(' ');

    // Add the node itself to the index
    const nodeDoc = {
      id: `node_${docId++}`,
      name: node.data.name || '',
      description: nodeSearchText,
      type: node.data.type || '',
      author: node.data.author || '',
      tags: Array.isArray(node.data.tags) ? node.data.tags.join(' ') : '',
      content_text: nodeSearchText,
      url: node.data.url || '',
      node_path: currentPath.join(' > '),
      depth: node.depth,
      node_reference: node  // CRITICAL: Store reference to D3 node
    };

    documents.push(nodeDoc);

    // Extract ALL content items from various array properties
    const itemsArrays = [
      node.data.content || [],
      node.data.urls || [],
      node.data.items || []
    ];

    itemsArrays.forEach(items => {
      if (Array.isArray(items) && items.length > 0) {
        items.forEach(item => {
          if (item && typeof item === 'object') {
            // Create searchable text from all item properties
            const itemSearchText = [
              item.title || item.name || '',
              item.description || item.summary || item.abstract || '',
              item.url || '',
              Array.isArray(item.tags) ? item.tags.join(' ') : (item.tags || ''),
              Array.isArray(item.keywords) ? item.keywords.join(' ') : '',
              item.author || item.creator || item.source || '',
              currentPath.join(' ') // Include parent path
            ].filter(text => text && text.trim()).join(' ');

            const itemDoc = {
              id: `item_${docId++}`,
              name: item.title || item.name || nodeDoc.name,
              description: itemSearchText,
              type: item.type_ || item.type || nodeDoc.type,
              author: item.author || item.creator || item.source || '',
              tags: Array.isArray(item.tags) ? item.tags.join(' ') : (item.tags || ''),
              content_text: itemSearchText,
              url: item.url || '',
              node_path: currentPath.join(' > '),
              depth: node.depth,
              node_reference: node  // Point to parent node
            };

            documents.push(itemDoc);
          }
        });
      }
    });

    // Recursively process children
    if (node.children) {
      node.children.forEach(child => extractSearchableContent(child, currentPath));
    }
  }

  // Build index from hierarchy
  extractSearchableContent(hierarchyRoot);

  console.log(`Extracted ${documents.length} searchable documents`);

  // Store search index array for reference lookup
  searchIndex = documents;

  // Create MiniSearch instance with combineWith: 'AND' in searchOptions
  miniSearch = new MiniSearch({
    fields: ['name', 'description', 'author', 'type', 'tags', 'content_text', 'url'],
    storeFields: ['id', 'name', 'node_path', 'depth', 'url'],
    searchOptions: {
      prefix: true,
      fuzzy: 0.2,
      boost: { name: 3, type: 2, description: 1.5, tags: 1.2, content_text: 1.0 },
      combineWith: 'AND'  // KEY: All terms must match
    }
  });

  miniSearch.addAll(documents);
  console.log(`Search index built with ${documents.length} items`);

  return { miniSearch, searchIndex };
}

// Clean search term by removing boolean operators
function cleanSearchTerm(term) {
  if (!term) return '';

  const cleaned = term
    .replace(/\b(AND|OR|NOT)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  return cleaned;
}

// Search for a single term or phrase
function searchSingleTerm(term) {
  if (!term || term.length < 1) return [];

  const cleanTerm = cleanSearchTerm(term);
  if (!cleanTerm) return [];

  console.log(`Searching single term: "${cleanTerm}"`);

  try {
    // Handle quoted phrases
    if (cleanTerm.startsWith('"') && cleanTerm.endsWith('"')) {
      const phrase = cleanTerm.slice(1, -1);
      return miniSearch.search(phrase, {
        prefix: false,
        fuzzy: 0.1,
        combineWith: 'AND'
      });
    }

    // Regular term search
    return miniSearch.search(cleanTerm, {
      prefix: true,
      fuzzy: 0.2,
      combineWith: 'AND'
    });
  } catch (error) {
    console.error(`Error searching for term "${cleanTerm}":`, error);
    return [];
  }
}

// Check if query contains boolean operators
function containsBooleanOperators(query) {
  return /\b(AND|OR|NOT)\b/i.test(query);
}

// Execute boolean search
function executeBooleanSearch(queryText) {
  console.log(`Executing boolean search for: "${queryText}"`);

  // Handle OR operator first (lowest precedence)
  if (/\bOR\b/i.test(queryText)) {
    return handleOrSearch(queryText);
  }

  // Handle AND operator
  if (/\bAND\b/i.test(queryText)) {
    return handleAndSearch(queryText);
  }

  // Handle NOT operator
  if (/\bNOT\b/i.test(queryText)) {
    return handleNotSearch(queryText);
  }

  // Fallback to simple search
  return miniSearch.search(queryText, { prefix: true, combineWith: 'AND' });
}

// Handle OR searches - union of results
function handleOrSearch(queryText) {
  const orParts = queryText.split(/\s+OR\s+/i).map(part => part.trim());
  console.log('OR parts:', orParts);

  const allResults = new Map();

  orParts.forEach(part => {
    let partResults = [];

    if (/\b(AND|NOT)\b/i.test(part)) {
      partResults = executeBooleanSearch(part);
    } else {
      const cleanPart = part.trim();
      if (cleanPart) {
        partResults = searchSingleTerm(cleanPart);
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
function handleAndSearch(queryText) {
  const andParts = queryText.split(/\s+AND\s+/i).map(part => part.trim());
  console.log('AND parts:', andParts);

  if (andParts.length === 0) return [];

  // Get results for first part
  let results = searchSingleTerm(andParts[0]);

  // Intersect with results from remaining parts
  for (let i = 1; i < andParts.length; i++) {
    const part = andParts[i].trim();
    if (!part) continue;

    const partResults = searchSingleTerm(part);
    const partIds = new Set(partResults.map(r => r.id));

    // Keep only results that appear in both sets
    results = results.filter(result => partIds.has(result.id));

    if (results.length === 0) break;
  }

  console.log(`AND search intersected ${andParts.length} parts into ${results.length} results`);
  return results.sort((a, b) => b.score - a.score);
}

// Handle NOT searches - exclude results
function handleNotSearch(queryText) {
  const notMatch = queryText.match(/^(.+?)\s+NOT\s+(.+)$/i);

  if (!notMatch) {
    const notAtStart = queryText.match(/^NOT\s+(.+)$/i);
    if (notAtStart) {
      const excludeTerm = cleanSearchTerm(notAtStart[1]);
      if (excludeTerm) {
        const allResults = miniSearch.search('', { prefix: true });
        const excludeResults = searchSingleTerm(excludeTerm);
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
      includeResults = executeBooleanSearch(includePart);
    } else {
      includeResults = searchSingleTerm(includePart);
    }
  }

  let excludeResults = [];
  if (excludePart.trim()) {
    excludeResults = searchSingleTerm(excludePart);
  }

  const excludeIds = new Set(excludeResults.map(r => r.id));
  const results = includeResults.filter(result => !excludeIds.has(result.id));

  console.log(`NOT search: ${includeResults.length} include - ${excludeResults.length} exclude = ${results.length} results`);
  return results;
}

// Perform search and return results
export function performSearch(query) {
  if (!miniSearch || !query || query.length < 1) {
    return [];
  }

  console.log(`Performing search for: "${query}"`);

  // Check for boolean operators
  if (containsBooleanOperators(query)) {
    console.log('Boolean operators detected');
    return executeBooleanSearch(query);
  }

  // Simple search with combineWith: 'AND'
  try {
    const results = miniSearch.search(query, {
      prefix: true,
      fuzzy: 0.2,
      combineWith: 'AND'
    });
    console.log(`Search found ${results.length} results`);
    return results;
  } catch (error) {
    console.error('Search failed:', error);
    return [];
  }
}

// Get search index for lookups
export function getSearchIndex() {
  return searchIndex;
}

// Update search result count display
export function updateSearchInfo(count) {
  document.getElementById('searchInfo').textContent = `${count.toLocaleString()} result${count !== 1 ? 's' : ''}`;
}
