# Climate Solutions Data Structure Documentation

## Table of Contents

1. [Overview](#overview)
2. [Architecture & Design](#architecture--design)
3. [JSON Schema Reference](#json-schema-reference)
4. [Field Specifications](#field-specifications)
5. [Property Name Variations](#property-name-variations)
6. [Data Flow Pipeline](#data-flow-pipeline)
7. [TSV Source Format](#tsv-source-format)
8. [Complete Examples](#complete-examples)
9. [Validation Rules](#validation-rules)
10. [Best Practices](#best-practices)
11. [Data Processing & Preprocessing](#data-processing--preprocessing)
12. [Version History](#version-history)
13. [Integration Points](#integration-points)
14. [Troubleshooting](#troubleshooting)
15. [Appendix](#appendix)

---

## Overview

### Purpose

The Climate Solutions data structure is a **hierarchical JSON format** designed to organize climate solutions, research, and resources in a tree-like taxonomy. This structure enables:

- **Multi-level categorization** of climate solutions (e.g., Energy → Renewable → Solar → Specific Technologies)
- **Interactive visualizations** (Circle Packing, Treemap, Sunburst, Dendrogram)
- **Advanced search and filtering** across all content
- **Scalable data management** from simple to complex taxonomies

### Why Hierarchical JSON?

**Advantages:**
- ✅ **Natural representation** of category-subcategory relationships
- ✅ **Flexible depth** - supports any number of nesting levels
- ✅ **Dual content model** - categories can have both subcategories AND direct content
- ✅ **D3.js compatibility** - works seamlessly with D3 hierarchy methods
- ✅ **Human-readable** - easy to understand and edit
- ✅ **Searchable** - can be indexed for full-text search across all levels

### Use Cases

1. **Visualization Rendering**: D3.js hierarchical layouts require parent-child relationships
2. **Search Indexing**: MiniSearch indexes all nodes and their content for full-text search
3. **Filtering**: Extract unique types, authors, tags from the entire tree
4. **Navigation**: Breadcrumb trails, drill-down, zoom interactions
5. **Data Export**: Generate CSV/JSON with hierarchical context preserved

---

## Architecture & Design

### Hierarchical Tree Structure

The data follows a **recursive tree structure** where each node can contain:
- **Child nodes** (subcategories) - other category nodes
- **Content items** (leaf data) - actual resources, articles, solutions
- **Both** - a category can have subcategories AND direct content

```
Root
├── Category A
│   ├── Subcategory A1
│   │   ├── Content Item 1
│   │   ├── Content Item 2
│   │   └── Content Item 3
│   └── Subcategory A2
│       └── Content Item 4
└── Category B
    ├── Content Item 5 (direct content on category)
    └── Subcategory B1
        └── Content Item 6
```

### Node Types

**1. Root Node**
- Single top-level node
- Always has `name` and `children[]`
- Represents the entire dataset

**2. Category Nodes (Intermediate)**
- Have `name` property
- Contain `children[]` array (subcategories)
- May also contain `content[]`/`urls[]`/`items[]` (direct content)
- Can have metadata (description, tags, etc.)

**3. Leaf Nodes**
- Terminal nodes (no children)
- Only contain `content[]`/`urls[]`/`items[]`
- Represent specific solutions/resources

**4. Hybrid Nodes**
- Have both `children[]` AND `content[]`
- Example: "Solar Energy" category with direct articles + subcategories

### Depth Levels

- **Depth 0**: Root node
- **Depth 1**: Top-level categories (Energy, Agriculture, Transportation, etc.)
- **Depth 2**: Subcategories (Renewable, Efficiency, Storage, etc.)
- **Depth 3+**: Further specialization (Solar, Wind, Hydro, etc.)

**Recommended maximum depth**: 5-6 levels (for visualization clarity)

### Relationship Types

**Parent-Child (Category)**
```json
{
  "name": "Parent Category",
  "children": [
    { "name": "Child Category 1" },
    { "name": "Child Category 2" }
  ]
}
```

**Category-Content**
```json
{
  "name": "Category",
  "content": [
    { "title": "Resource 1", "url": "..." },
    { "title": "Resource 2", "url": "..." }
  ]
}
```

---

## JSON Schema Reference

### Top-Level Root Structure

```json
{
  "name": "Climate Solutions",
  "description": "Optional description of the entire dataset",
  "version": "V5",
  "children": [
    { /* Category nodes */ }
  ]
}
```

**Root Properties:**
- `name` (string, required) - Name of the root/dataset
- `description` (string, optional) - Dataset description
- `version` (string, optional) - Version identifier
- `children` (array, required) - Top-level categories

### Category Node Structure

```json
{
  "name": "Category Name",
  "description": "Optional category description",
  "tags": ["tag1", "tag2"],
  "children": [
    { /* Subcategory nodes */ }
  ],
  "content": [
    { /* Content items */ }
  ]
}
```

**Category Properties:**
- `name` (string, required) - Category identifier
- `description` (string, optional) - Category summary
- `tags` (array[string], optional) - Category tags
- `children` (array[object], optional) - Subcategories
- `content` (array[object], optional) - Direct content items
- `urls` (array[object], optional) - Alternative name for content
- `items` (array[object], optional) - Alternative name for content

### Content Item Structure

```json
{
  "title": "Resource Title",
  "url": "https://example.com/resource",
  "author": "Organization or Author Name",
  "type_": "Article",
  "tags": ["climate", "renewable", "solar"],
  "description": "Detailed description or abstract of the resource",
  "date": "2023-06-15",
  "confidence": 0.85,
  "UID": "unique_identifier_123"
}
```

**Content Properties:**
- `title` (string, required) - Resource title/name
- `url` (string, required) - Link to resource
- `author` (string, optional) - Creator/source attribution
- `type_` (string, optional) - Content type/category
- `tags` (array[string], optional) - Resource tags
- `description` (string, optional) - Summary/abstract
- `date` (string, optional) - Publication date (ISO 8601: YYYY-MM-DD)
- `confidence` (number, optional) - Quality score (0.0 to 1.0)
- `UID` (string, optional) - Unique identifier

---

## Field Specifications

### Category Node Fields

#### `name` (string, **required**)
**Purpose**: Identifies the category/node in the hierarchy

**Format**: Plain text string
- Short descriptive names (2-5 words ideal)
- Title case recommended: "Renewable Energy"
- Avoid special characters except hyphens and ampersands

**Examples:**
```json
"name": "Solar Energy"
"name": "Carbon Capture & Storage"
"name": "Sustainable Agriculture"
```

**Constraints:**
- Must be unique among siblings (same parent)
- No trailing/leading whitespace
- Non-empty string

---

#### `description` (string, optional)
**Purpose**: Provides context and summary for the category

**Format**: Plain text or markdown-compatible string
- 1-3 sentences recommended
- Can include basic markdown formatting

**Examples:**
```json
"description": "Technologies and solutions for capturing solar energy and converting it to electricity"
"description": "Methods for removing CO₂ from the atmosphere or preventing its release"
```

**Best Practices:**
- Keep under 200 characters for tooltip display
- Focus on what distinguishes this category
- Use present tense, active voice

---

#### `children[]` (array[object], optional)
**Purpose**: Contains subcategories (child nodes)

**Format**: Array of category node objects
- Can be empty array `[]` or omitted
- Each child is a full category node (recursive)

**Example:**
```json
"children": [
  {
    "name": "Solar",
    "content": [...]
  },
  {
    "name": "Wind",
    "content": [...]
  }
]
```

**Constraints:**
- Must be an array (not null)
- Children can have their own children (nesting)
- Recommended max depth: 5-6 levels

---

#### `content[]` / `urls[]` / `items[]` (array[object], optional)
**Purpose**: Contains actual resources/solutions at this category level

**Format**: Array of content item objects
- Use `content` for new data (V5 standard)
- `urls` and `items` supported for backward compatibility

**Example:**
```json
"content": [
  {
    "title": "Solar Panel Efficiency Breakthrough",
    "url": "https://example.com/article",
    "author": "MIT",
    "type_": "Research",
    "date": "2023-06-15"
  }
]
```

**Constraints:**
- Each item must have at minimum `title` and `url`
- Can be empty array or omitted
- No limit on number of items (but consider performance for 1000+ items)

---

#### `tags[]` (array[string], optional)
**Purpose**: Categorize the node with keywords for search/filtering

**Format**: Array of lowercase tag strings
- Use kebab-case for multi-word tags: `"carbon-capture"`
- Singular form preferred: `"technology"` not `"technologies"`

**Examples:**
```json
"tags": ["renewable", "solar", "photovoltaic"]
"tags": ["carbon-removal", "direct-air-capture", "technology"]
```

**Best Practices:**
- 2-5 tags per node ideal
- Consistent vocabulary across dataset
- Avoid redundant tags (e.g., if parent has "energy", children don't need it)

---

### Content Item Fields

#### `title` (string, **required**)
**Purpose**: Name/headline of the resource

**Format**: Plain text
- Full title as published
- Title case recommended
- Can include subtitles with colon or dash

**Examples:**
```json
"title": "The Future of Solar Energy in Developing Nations"
"title": "Carbon Capture: A Comprehensive Review"
"title": "Wind Farm Efficiency Study 2023"
```

**Constraints:**
- Non-empty string
- Recommended max length: 150 characters (for display)

---

#### `url` (string, **required**)
**Purpose**: Link to the full resource

**Format**: Valid HTTP/HTTPS URL
- Must start with `http://` or `https://`
- Can include query parameters and fragments

**Examples:**
```json
"url": "https://climatedrift.com/solar-innovation"
"url": "https://doi.org/10.1234/science.abc123"
"url": "https://example.com/article?id=456#section2"
```

**Constraints:**
- Must be valid URL format
- HTTPS preferred over HTTP
- Should be accessible (not behind hard paywalls if possible)

---

#### `author` / `creator` / `source` (string, optional)
**Purpose**: Attribution to creator or publishing organization

**Format**: Plain text
- Organization name OR individual author
- Use official name format
- Multiple authors: comma-separated or primary author only

**Examples:**
```json
"author": "ClimateDrift"
"author": "MIT Climate Portal"
"author": "Dr. Jane Smith"
"author": "Smith et al."
```

**Best Practices:**
- Consistent formatting across dataset
- Prefer organization name for institutional content
- Use "et al." for multi-author papers

---

#### `type_` / `type` / `category` (string, optional)
**Purpose**: Classify the content type

**Format**: Plain text category
- Title case recommended
- Use controlled vocabulary for consistency

**Common Types:**
```json
"type_": "Article"
"type_": "Research Paper"
"type_": "Case Study"
"type_": "Technology"
"type_": "Policy Brief"
"type_": "News"
"type_": "Video"
"type_": "Report"
```

**Best Practices:**
- Define standard types for your dataset
- Use 5-15 distinct types (not too granular)
- Enables filtering by content type

---

#### `tags[]` / `keywords[]` / `categories[]` (array[string], optional)
**Purpose**: Topical keywords for search and filtering

**Format**: Array of lowercase tag strings
- Multi-word tags use kebab-case or underscores
- Related to content topic, not category

**Examples:**
```json
"tags": ["solar-energy", "photovoltaic", "efficiency", "cost-reduction"]
"tags": ["carbon-capture", "direct-air-capture", "scalability"]
```

**Best Practices:**
- 3-7 tags per item ideal
- Overlap with category tags for findability
- Include synonyms for better search

---

#### `description` / `abstract` (string, optional)
**Purpose**: Summary or excerpt of the content

**Format**: Plain text
- 1-3 paragraphs recommended
- First sentence should be self-contained summary

**Examples:**
```json
"description": "This study examines the economic viability of large-scale solar installations in sub-Saharan Africa. Results show a 40% cost reduction compared to 2020 benchmarks, with significant potential for grid-scale deployment by 2025."
```

**Best Practices:**
- Keep under 500 characters for tooltip display
- Full abstract/description can be longer (up to 2000 chars)
- Use plain language, avoid jargon
- Include key findings or takeaways

---

#### `date` (string, optional)
**Purpose**: Publication or creation date

**Format**: ISO 8601 date string: `YYYY-MM-DD`
- Year only: `"2023"`
- Year-month: `"2023-06"`
- Full date: `"2023-06-15"`

**Examples:**
```json
"date": "2023-06-15"
"date": "2023-06"
"date": "2023"
```

**Constraints:**
- Must be valid date if provided
- Use ISO 8601 format only (not "June 2023" or "6/15/2023")
- Cannot be future date (for published content)

**Search Support:**
- Enables date range filtering
- Can search by year: `date:2023`
- Can search by range: `date:2023-2024`

---

#### `confidence` (number, optional)
**Purpose**: Quality or relevance score

**Format**: Floating point number between 0.0 and 1.0
- 1.0 = highest confidence/quality
- 0.5 = medium confidence
- 0.0 = low confidence

**Examples:**
```json
"confidence": 0.95  // Peer-reviewed research
"confidence": 0.75  // Industry report
"confidence": 0.50  // Blog post or opinion
```

**Use Cases:**
- Ranking search results
- Filtering low-quality content
- Visualization sizing or opacity
- Quality indicators in UI

**Best Practices:**
- Define clear criteria for scoring
- 0.8-1.0: Peer-reviewed, verified sources
- 0.6-0.8: Reputable organizations, established media
- 0.4-0.6: General content, unverified claims
- 0.0-0.4: Speculative or low-quality

---

#### `UID` (string, optional)
**Purpose**: Unique identifier for the content item

**Format**: String identifier
- Alphanumeric with underscores/hyphens
- Must be globally unique within dataset

**Examples:**
```json
"UID": "solar_panel_2023_001"
"UID": "cc_tech_mit_456"
"UID": "renewable_wind_789"
```

**Generation:**
- Auto-generated by admin panel: `{category}_{timestamp}_{random}`
- Can be manual for curated content
- Can use DOI, ISBN, or other standard identifiers

**Use Cases:**
- Deduplication
- Cross-referencing
- Updates and versioning
- Bookmarking/favorites

---

## Property Name Variations

The system supports **flexible property naming** for backward compatibility and data source flexibility.

### Content Array Names

**Standard (V5)**: `content`
```json
{ "content": [...] }
```

**Alternatives (supported):**
```json
{ "urls": [...] }      // Legacy V3/V4 format
{ "items": [...] }     // Alternative naming
```

**Note**: During preprocessing, all variations are converted to `children[]` for D3.js compatibility.

---

### Author Field Names

**Standard**: `author`
```json
{ "author": "ClimateDrift" }
```

**Alternatives:**
```json
{ "creator": "MIT" }
{ "source": "Nature Journal" }
```

**Fallback Order**: Check `author` → `creator` → `source`

---

### Type Field Names

**Standard**: `type_`
```json
{ "type_": "Article" }
```

**Alternatives:**
```json
{ "type": "Research" }      // Common alternative
{ "category": "Policy" }    // Less common
```

**Note**: `type_` uses underscore to avoid JavaScript reserved word conflicts.

**Fallback Order**: Check `type_` → `type` → `category`

---

### Tags Field Names

**Standard**: `tags`
```json
{ "tags": ["solar", "renewable"] }
```

**Alternatives:**
```json
{ "keywords": ["wind", "energy"] }
{ "categories": ["climate", "mitigation"] }
```

**Fallback Order**: Check `tags` → `keywords` → `categories`

---

### Description Field Names

**Standard**: `description`
```json
{ "description": "Summary of the article..." }
```

**Alternatives:**
```json
{ "abstract": "Research abstract..." }
{ "summary": "Brief overview..." }
```

**Fallback Order**: Check `description` → `abstract` → `summary`

---

## Data Flow Pipeline

### Overview

```
Google Sheets (2 Sheets)
         ↓
    TSV Export
         ↓
 Python Script (V7)
         ↓
   JSON Output
         ↓
  GitHub Actions (Auto-versioning)
         ↓
  Web Application
         ↓
  D3 Visualizations
```

### Detailed Flow

#### 1. Google Sheets → TSV Export

**Source**: "CD Solution map 2.0 DB prototype - V5" spreadsheet

**Two Sheets:**
1. **Taxonomy Sheet** - Hierarchical structure with IDs
2. **Content Sheet** - Leaf entries with parent ID references

**Export Process:**
- File → Download → Tab-separated values (.tsv)
- Save as `CD_Solution_map_2_taxonomy.tsv` and `CD_Solution_map_2_content.tsv`
- Place in `db/latest/` directory

---

#### 2. TSV → JSON Conversion (Python V7)

**Script**: `src/tsv_to_json_from_taxonomy_and_content_sheets_V7.py`

**Process:**
1. Read both TSV files
2. Parse hierarchical structure from Taxonomy sheet
3. Map content items to correct parent nodes
4. Build recursive JSON tree
5. Output to `db/latest/CD_Solution_map_2_content.json`

**Command:**
```bash
python src/tsv_to_json_from_taxonomy_and_content_sheets_V7.py \
  --taxonomy db/latest/CD_Solution_map_2_taxonomy.tsv \
  --content db/latest/CD_Solution_map_2_content.tsv \
  --output db/latest/CD_Solution_map_2_content.json
```

---

#### 3. GitHub Actions (Automated)

**Workflow**: `.github/workflows/convert-tsv-to-json.yml`

**Triggers:**
- Push to `db/latest/*.tsv` files
- Manual dispatch from Actions tab

**Steps:**
1. Convert TSV → JSON
2. Calculate file statistics
3. Auto-increment version number
4. Update `version.txt` and `version_history.txt`
5. Commit all changes with detailed message

**Output Files:**
- `db/latest/CD_Solution_map_2_content.json` - Generated JSON
- `db/latest/version.txt` - Current version (e.g., "1.0.5")
- `db/latest/version_history.txt` - Complete changelog

---

#### 4. Web Application Loading

**File**: `js/main.js`

**Process:**
```javascript
// Fetch JSON data
const response = await fetch('db/latest/CD_Solution_map_2_content.json');
const rawData = await response.json();

// Preprocess for D3.js
const processedData = preprocessDataForD3(rawData);

// Build search index
buildSearchIndex(rawData);

// Render visualization
renderCirclePacking(processedData);
```

---

#### 5. D3.js Visualization Rendering

**Preprocessing** (`js/utilities.js`):
- Convert `content[]`/`urls[]` → `children[]`
- Calculate sizes for leaf nodes
- Add hierarchy metadata

**D3 Hierarchy**:
```javascript
const root = d3.hierarchy(processedData)
  .sum(d => d.value || 1)
  .sort((a, b) => b.value - a.value);
```

**Layouts:**
- Circle Packing: `d3.pack()`
- Treemap: `d3.treemap()`
- Sunburst: `d3.partition()`
- Dendrogram: `d3.tree()`

---

## TSV Source Format

### Taxonomy Sheet Structure

**Purpose**: Defines hierarchical category structure with parent-child relationships

**Required Columns:**
- `ID` - Unique identifier for this category (e.g., "1", "1.1", "1.1.1")
- `Parent_ID` - ID of parent category (empty for root/top-level)
- `Name` - Category name
- `Description` - Category description (optional)
- `Tags` - Comma-separated tags (optional)

**Example:**
```tsv
ID      Parent_ID   Name                    Description                         Tags
1                   Energy Solutions        Technologies for clean energy       energy,solutions
1.1     1           Renewable Energy        Renewable power generation          renewable,clean-energy
1.1.1   1.1         Solar                   Solar power technologies            solar,photovoltaic
1.1.2   1.1         Wind                    Wind power technologies             wind,turbines
1.2     1           Energy Efficiency       Improving energy efficiency         efficiency,conservation
2                   Transportation          Sustainable transportation          transport,mobility
```

**ID Format:**
- Numeric dot notation: `1`, `1.1`, `1.1.1`, `1.1.2`, `1.2`
- Depth indicated by dots:
  - `1` = depth 1 (top-level)
  - `1.1` = depth 2 (subcategory of 1)
  - `1.1.1` = depth 3 (subcategory of 1.1)

**Parent_ID Rules:**
- Empty for top-level categories
- Must reference existing ID
- Cannot reference self
- No circular references allowed

---

### Content Sheet Structure

**Purpose**: Stores actual content items (articles, resources, solutions)

**Required Columns:**
- `Mapped_ID_in_Tax` - References ID from Taxonomy sheet (parent category)
- `Title` - Content title
- `URL` - Link to resource
- `Author` - Creator/source (optional)
- `Type` - Content type (optional)
- `Tags` - Comma-separated tags (optional)
- `Description` - Summary/abstract (optional)
- `Date` - Publication date YYYY-MM-DD (optional)
- `Confidence` - Score 0.0-1.0 (optional)
- `UID` - Unique identifier (optional, auto-generated if missing)

**Example:**
```tsv
Mapped_ID_in_Tax    Title                           URL                                 Author          Type        Tags                        Description                         Date        Confidence  UID
1.1.1               Solar Panel Breakthrough        https://example.com/solar1          MIT             Research    solar,efficiency,tech       New solar panel achieves 40%...     2023-06-15  0.95        solar_2023_001
1.1.1               Affordable Solar for Africa     https://example.com/solar2          ClimateDrift    Article     solar,africa,access         Case study of solar deployment...   2023-05-20  0.85        solar_2023_002
1.1.2               Offshore Wind Farm Study        https://example.com/wind1           Stanford        Research    wind,offshore,energy        Analysis of offshore wind...        2023-07-01  0.90        wind_2023_003
```

**Mapped_ID_in_Tax Rules:**
- Must reference valid ID from Taxonomy sheet
- Multiple content items can have same Mapped_ID_in_Tax (many-to-one)
- Content is attached to the specified category node

**Tags Format:**
- Comma-separated: `solar,renewable,efficiency`
- No quotes needed
- Trimmed of whitespace
- Converted to array in JSON: `["solar", "renewable", "efficiency"]`

---

### Conversion Logic

**Taxonomy Processing:**
1. Read all rows from Taxonomy sheet
2. Create node object for each row
3. Build parent-child relationships using ID/Parent_ID
4. Construct recursive tree structure

**Content Processing:**
1. Read all rows from Content sheet
2. Group by `Mapped_ID_in_Tax`
3. Find matching node in taxonomy tree
4. Attach content items as `content[]` array to node

**Result:**
```json
{
  "name": "Solar",
  "description": "Solar power technologies",
  "tags": ["solar", "photovoltaic"],
  "content": [
    {
      "title": "Solar Panel Breakthrough",
      "url": "https://example.com/solar1",
      "author": "MIT",
      "type_": "Research",
      "tags": ["solar", "efficiency", "tech"],
      "description": "New solar panel achieves 40%...",
      "date": "2023-06-15",
      "confidence": 0.95,
      "UID": "solar_2023_001"
    }
  ]
}
```

---

## Complete Examples

### Example 1: Minimal Valid Structure

**Simplest possible valid data:**
```json
{
  "name": "Root",
  "children": [
    {
      "name": "Category 1",
      "content": [
        {
          "title": "Article 1",
          "url": "https://example.com/1"
        }
      ]
    }
  ]
}
```

**What's included:**
- Root with name
- One category child
- One content item with minimum required fields (title, url)

---

### Example 2: Simple Two-Level Hierarchy

```json
{
  "name": "Climate Solutions",
  "children": [
    {
      "name": "Energy",
      "description": "Energy-related solutions",
      "tags": ["energy", "power"],
      "children": [
        {
          "name": "Solar",
          "content": [
            {
              "title": "Solar Innovation 2023",
              "url": "https://example.com/solar",
              "author": "MIT",
              "type_": "Research",
              "tags": ["solar", "innovation"],
              "date": "2023-06-15",
              "confidence": 0.9
            }
          ]
        },
        {
          "name": "Wind",
          "content": [
            {
              "title": "Offshore Wind Study",
              "url": "https://example.com/wind",
              "author": "Stanford",
              "type_": "Research",
              "date": "2023-05-20"
            }
          ]
        }
      ]
    },
    {
      "name": "Transportation",
      "content": [
        {
          "title": "Electric Vehicle Trends",
          "url": "https://example.com/ev",
          "type_": "Article"
        }
      ]
    }
  ]
}
```

**Structure:**
- Root → 2 top-level categories (Energy, Transportation)
- Energy → 2 subcategories (Solar, Wind)
- Each leaf category has content items
- Mixed field usage (some with all fields, some minimal)

---

### Example 3: Complex Multi-Level Hierarchy

```json
{
  "name": "Climate Solutions Database",
  "description": "Comprehensive climate solutions taxonomy",
  "version": "V5",
  "children": [
    {
      "name": "Mitigation",
      "description": "Solutions that reduce greenhouse gas emissions",
      "tags": ["mitigation", "reduction", "emissions"],
      "children": [
        {
          "name": "Energy",
          "description": "Energy sector solutions",
          "children": [
            {
              "name": "Renewable Energy",
              "description": "Clean, renewable power generation",
              "children": [
                {
                  "name": "Solar",
                  "description": "Solar photovoltaic and thermal technologies",
                  "tags": ["solar", "photovoltaic", "pv"],
                  "content": [
                    {
                      "title": "Next-Gen Perovskite Solar Cells",
                      "url": "https://example.com/perovskite",
                      "author": "Nature Energy",
                      "type_": "Research Paper",
                      "tags": ["solar", "perovskite", "efficiency", "materials"],
                      "description": "Breakthrough in perovskite solar cell stability increases efficiency to 28% with 10-year lifespan.",
                      "date": "2023-08-12",
                      "confidence": 0.95,
                      "UID": "solar_perovskite_2023_08"
                    },
                    {
                      "title": "Community Solar Programs: A Case Study",
                      "url": "https://example.com/community-solar",
                      "author": "ClimateDrift",
                      "type_": "Case Study",
                      "tags": ["solar", "community", "access", "equity"],
                      "description": "Analysis of successful community solar initiatives in rural communities, highlighting cost savings and adoption barriers.",
                      "date": "2023-07-20",
                      "confidence": 0.85,
                      "UID": "solar_community_2023_07"
                    }
                  ]
                },
                {
                  "name": "Wind",
                  "description": "Wind turbine technologies",
                  "tags": ["wind", "turbines"],
                  "content": [
                    {
                      "title": "Floating Offshore Wind Platforms",
                      "url": "https://example.com/floating-wind",
                      "author": "MIT Energy Initiative",
                      "type_": "Technology Review",
                      "tags": ["wind", "offshore", "floating", "deep-water"],
                      "description": "Technical and economic analysis of floating wind platforms for deep-water installations.",
                      "date": "2023-09-05",
                      "confidence": 0.90
                    }
                  ]
                }
              ]
            },
            {
              "name": "Energy Storage",
              "description": "Technologies for storing electrical energy",
              "content": [
                {
                  "title": "Grid-Scale Battery Systems",
                  "url": "https://example.com/batteries",
                  "author": "Tesla Energy",
                  "type_": "White Paper",
                  "date": "2023-06-01",
                  "confidence": 0.80
                }
              ]
            }
          ]
        }
      ]
    },
    {
      "name": "Adaptation",
      "description": "Solutions for adapting to climate impacts",
      "tags": ["adaptation", "resilience"],
      "children": [
        {
          "name": "Agriculture",
          "content": [
            {
              "title": "Drought-Resistant Crop Varieties",
              "url": "https://example.com/drought-crops",
              "author": "AgTech Institute",
              "type_": "Research",
              "date": "2023-04-15"
            }
          ]
        }
      ]
    }
  ]
}
```

**Features demonstrated:**
- 4 depth levels (Root → Mitigation → Energy → Renewable → Solar)
- Both Mitigation and Adaptation top-level categories
- Descriptions at every level
- Mixed content distribution (some categories have many items, others few)
- Full field usage with all optional fields
- Multiple content items per category

---

### Example 4: Hybrid Node (Category with Both Children and Content)

```json
{
  "name": "Renewable Energy",
  "description": "Overview of renewable energy technologies",
  "content": [
    {
      "title": "Renewable Energy Overview 2023",
      "url": "https://example.com/renewable-overview",
      "author": "IEA",
      "type_": "Report",
      "description": "Comprehensive overview of renewable energy sector trends and projections.",
      "date": "2023-01-15",
      "confidence": 0.95
    }
  ],
  "children": [
    {
      "name": "Solar",
      "content": [
        {
          "title": "Solar Technology Advances",
          "url": "https://example.com/solar-tech"
        }
      ]
    },
    {
      "name": "Wind",
      "content": [
        {
          "title": "Wind Power Trends",
          "url": "https://example.com/wind-trends"
        }
      ]
    }
  ]
}
```

**Use Case:**
- Category-level overview content (the IEA report applies to entire "Renewable Energy" category)
- Subcategories for specific technologies
- Allows users to access general info at parent level OR drill down to specifics

---

### Example 5: Real-World Snippet (from actual dataset)

```json
{
  "name": "Climate Solutions Map",
  "children": [
    {
      "name": "Mitigation",
      "children": [
        {
          "name": "Energy",
          "children": [
            {
              "name": "Renewable",
              "children": [
                {
                  "name": "Solar PV",
                  "content": [
                    {
                      "title": "How Perovskite Solar Cells Could Transform Energy",
                      "url": "https://climatedrift.com/perovskite-solar",
                      "author": "ClimateDrift",
                      "type_": "Article",
                      "tags": ["solar", "perovskite", "materials", "efficiency"],
                      "description": "Exploring the potential of perovskite solar cells to revolutionize solar energy with higher efficiency and lower costs.",
                      "date": "2023-08-15",
                      "confidence": 0.85,
                      "UID": "cd_solar_perovskite_001"
                    }
                  ]
                }
              ]
            }
          ]
        }
      ]
    }
  ]
}
```

---

## Validation Rules

### Required Fields

**Category Nodes:**
- ✅ `name` - MUST be present and non-empty string

**Content Items:**
- ✅ `title` - MUST be present and non-empty string
- ✅ `url` - MUST be present and valid URL format

**All other fields are optional**

---

### Data Type Constraints

| Field | Type | Format | Validation |
|-------|------|--------|------------|
| `name` | string | Plain text | Non-empty, no leading/trailing whitespace |
| `description` | string | Plain text | Max 2000 characters recommended |
| `tags` | array[string] | `["tag1", "tag2"]` | Each tag must be string, lowercase preferred |
| `children` | array[object] | `[{...}, {...}]` | Each child must be valid node object |
| `content` | array[object] | `[{...}, {...}]` | Each item must be valid content object |
| `title` | string | Plain text | Non-empty, max 200 characters recommended |
| `url` | string | URL | Must start with `http://` or `https://` |
| `author` | string | Plain text | Max 100 characters |
| `type_` | string | Plain text | Max 50 characters |
| `date` | string | ISO 8601 | Format: `YYYY`, `YYYY-MM`, or `YYYY-MM-DD` |
| `confidence` | number | Float | Range: 0.0 to 1.0 inclusive |
| `UID` | string | Alphanumeric | Unique within dataset |

---

### Hierarchical Constraints

**No Circular References:**
- A node cannot be its own ancestor
- `children[]` cannot include the parent node

**Unique Sibling Names:**
- Child nodes under same parent should have unique names
- Not strictly enforced but recommended for clarity

**Maximum Depth:**
- No hard limit, but 5-6 levels recommended
- Deeper hierarchies may impact visualization performance

**Content vs Children:**
- Node can have `content[]` only
- Node can have `children[]` only
- Node can have BOTH `content[]` and `children[]`
- Empty nodes (no content, no children) are valid but discouraged

---

### URL Validation

**Valid URLs:**
```json
✅ "https://example.com/article"
✅ "https://doi.org/10.1234/abc.123"
✅ "https://climatedrift.com/solutions?tag=solar#overview"
✅ "http://legacy-site.com/page" (HTTP acceptable)
```

**Invalid URLs:**
```json
❌ "example.com/article" (missing protocol)
❌ "www.example.com" (missing protocol)
❌ "ftp://example.com/file" (wrong protocol)
❌ "" (empty string)
❌ null (must be string)
```

---

### Date Validation

**Valid Dates:**
```json
✅ "2023"
✅ "2023-06"
✅ "2023-06-15"
✅ "2023-12-31"
```

**Invalid Dates:**
```json
❌ "June 2023" (not ISO 8601)
❌ "6/15/2023" (not ISO 8601)
❌ "2023-13-01" (invalid month)
❌ "2023-06-32" (invalid day)
❌ "2025-12-31" (future date, if validating published content)
```

---

### Tag Validation

**Valid Tags:**
```json
✅ ["solar", "renewable", "energy"]
✅ ["carbon-capture", "direct-air-capture"]
✅ ["climate_mitigation"]
```

**Invalid Tags:**
```json
❌ "solar,renewable" (should be array, not comma-separated string)
❌ ["Solar", "Renewable"] (should be lowercase)
❌ ["tag with spaces"] (use kebab-case or underscores)
❌ [123, 456] (must be strings, not numbers)
```

---

### Confidence Score Validation

**Valid Scores:**
```json
✅ 0.0
✅ 0.5
✅ 0.85
✅ 1.0
✅ 1 (integer acceptable, treated as 1.0)
```

**Invalid Scores:**
```json
❌ -0.5 (negative)
❌ 1.5 (over 1.0)
❌ "0.85" (string, must be number)
❌ null (if present, must be number)
```

---

## Best Practices

### Naming Conventions

**Category Names:**
- Use title case: "Renewable Energy" not "renewable energy"
- Keep concise: 2-5 words ideal
- Be descriptive: "Solar Photovoltaic" better than "Solar PV" if not obvious
- Avoid abbreviations unless widely known (OK: "CO₂", Avoid: "CCUS" → use "Carbon Capture")
- Be consistent across levels

**Content Titles:**
- Use original published title
- Include subtitle if it adds important context
- Don't add editorial commentary in brackets

**Tags:**
- Always lowercase: `"solar"` not `"Solar"`
- Use hyphens for multi-word: `"carbon-capture"` not `"carbon_capture"` or `"carboncapture"`
- Singular form: `"technology"` not `"technologies"`
- Be consistent: choose one term and stick with it (e.g., `"renewable"` OR `"renewables"`, not both)

---

### Optimal Hierarchy Depth

**Recommended Structure:**
- **Depth 1** (Root): Dataset name
- **Depth 2**: Major domains (Energy, Agriculture, Transportation, etc.)
- **Depth 3**: Sub-domains (Renewable, Efficiency, Storage, etc.)
- **Depth 4**: Specific technologies (Solar, Wind, Hydro, etc.)
- **Depth 5**: Technology variants (Crystalline, Thin-Film, Perovskite, etc.)
- **Depth 6**: MAX - avoid going deeper

**Why limit depth:**
- Visualizations become cluttered beyond 5-6 levels
- Users have difficulty navigating deep hierarchies
- Search becomes more important than navigation at extreme depths

**When to add depth:**
- Clear logical subdivision exists
- Multiple items would otherwise be at same level
- Benefits navigation and understanding

**When NOT to add depth:**
- Only 1-2 items would be in subcategory
- Distinction is not meaningful to users
- Forces artificial categorization

---

### Content Organization

**Group Related Content:**
```json
{
  "name": "Solar Energy",
  "children": [
    {
      "name": "Technology",
      "content": [/* technology articles */]
    },
    {
      "name": "Policy",
      "content": [/* policy articles */]
    },
    {
      "name": "Economics",
      "content": [/* economic analysis */]
    }
  ]
}
```

**Use Hybrid Nodes for Overviews:**
```json
{
  "name": "Renewable Energy",
  "content": [
    {
      "title": "Renewable Energy: Complete Overview",
      /* General overview content */
    }
  ],
  "children": [
    { "name": "Solar", /* ... */ },
    { "name": "Wind", /* ... */ }
  ]
}
```

**Avoid Over-Granular Categories:**
```json
// ❌ Too granular
{
  "name": "Solar",
  "children": [
    { "name": "2023 Articles" },
    { "name": "2022 Articles" },
    { "name": "2021 Articles" }
  ]
}

// ✅ Better: use tags and date filtering
{
  "name": "Solar",
  "content": [
    { "title": "...", "date": "2023-06-15", "tags": ["solar"] },
    { "title": "...", "date": "2022-08-20", "tags": ["solar"] }
  ]
}
```

---

### Tag Strategy

**Define Tag Vocabulary:**
- Create list of approved tags before data entry
- Limit to 50-100 distinct tags for dataset
- Document tag meanings and usage

**Tag Levels:**
```
High-level: energy, agriculture, transportation
Mid-level: renewable, solar, wind, efficiency
Specific: photovoltaic, perovskite, offshore
```

**Tag Both Category and Content:**
```json
{
  "name": "Solar",
  "tags": ["solar", "renewable", "energy"],  // Category tags
  "content": [
    {
      "title": "Perovskite Solar Cells",
      "tags": ["solar", "perovskite", "materials", "efficiency"]  // Content tags
    }
  ]
}
```

**Overlap is Good:**
- Content tags can repeat category tags
- Helps search find items through multiple paths
- Don't worry about redundancy

---

### Description Guidelines

**Category Descriptions:**
- 1-2 sentences
- Explain what's IN this category
- Use present tense: "Contains solutions for..." not "Will contain..."

**Content Descriptions:**
- First sentence = standalone summary
- Key findings or takeaways
- Plain language, avoid jargon
- Length: 100-500 characters (for tooltip display)

**Example:**
```json
{
  "description": "This study examines the economic viability of large-scale solar installations in sub-Saharan Africa. Results show a 40% cost reduction compared to 2020 benchmarks, with significant potential for grid-scale deployment by 2025. Financing challenges and policy recommendations are discussed."
}
```

---

### Date Formatting

**Always Use ISO 8601:**
```json
✅ "2023-06-15"  // Full date
✅ "2023-06"     // Month precision
✅ "2023"        // Year only

❌ "June 15, 2023"
❌ "6/15/2023"
❌ "15-06-2023"
```

**When to Use Different Precisions:**
- Full date (`YYYY-MM-DD`): Published articles, research papers
- Month (`YYYY-MM`): Reports, whitepapers published "June 2023"
- Year (`YYYY`): Books, aggregated data, when exact date unknown

---

### Confidence Scoring Guidelines

**Define Clear Criteria:**

| Score Range | Quality Level | Examples |
|-------------|---------------|----------|
| 0.90 - 1.00 | Highest | Peer-reviewed research, government reports, established academic institutions |
| 0.75 - 0.89 | High | Reputable news outlets, industry reports from established organizations |
| 0.60 - 0.74 | Medium | General articles from recognized sources, credible blogs |
| 0.40 - 0.59 | Low-Medium | Opinion pieces, startup blogs, unverified claims |
| 0.00 - 0.39 | Low | Speculative content, unverified sources, promotional material |

**Scoring Factors:**
- Source credibility (peer-review, reputation)
- Recency (recent = higher confidence for technical content)
- Methodology (research-based vs opinion)
- Citations (well-cited = higher confidence)

**Example Usage:**
```json
{
  "title": "Nature Climate Change: Solar Efficiency Study",
  "confidence": 0.95,  // Peer-reviewed journal
}
```
```json
{
  "title": "TechCrunch: New Solar Startup Promises 50% Efficiency",
  "confidence": 0.50,  // News article about unproven claims
}
```

---

## Data Processing & Preprocessing

### Preprocessing Overview

Before data reaches D3.js visualizations, it undergoes preprocessing to transform it into a format compatible with D3's hierarchy methods.

**Script**: `js/utilities.js` → `preprocessDataForD3(data)`

**Purpose:**
- Convert various content array names → uniform `children[]`
- Calculate sizes for leaf nodes (required for sizing visualizations)
- Preserve original structure while adding D3-compatible properties

---

### Transformation Steps

#### 1. Content Array Conversion

**Before:**
```json
{
  "name": "Solar",
  "content": [
    { "title": "Article 1", "url": "..." },
    { "title": "Article 2", "url": "..." }
  ]
}
```

**After:**
```json
{
  "name": "Solar",
  "children": [
    { "name": "Article 1", "url": "...", "value": 1 },
    { "name": "Article 2", "url": "...", "value": 1 }
  ]
}
```

**What happens:**
- `content[]` array → `children[]` array
- Each content item becomes a child node
- `title` → `name` (D3 expects `name` property)
- `value: 1` added for size calculation
- Original properties preserved

---

#### 2. Handling Multiple Content Array Names

**Input variations:**
```json
{ "content": [...] }   // Standard
{ "urls": [...] }      // Legacy
{ "items": [...] }     // Alternative
```

**All converted to:**
```json
{ "children": [...] }
```

**Code logic:**
```javascript
if (node.content) {
  node.children = node.content.map(item => ({ ...item, name: item.title, value: 1 }));
  delete node.content;
} else if (node.urls) {
  node.children = node.urls.map(item => ({ ...item, name: item.title, value: 1 }));
  delete node.urls;
} else if (node.items) {
  node.children = node.items.map(item => ({ ...item, name: item.title, value: 1 }));
  delete node.items;
}
```

---

#### 3. Recursive Processing

Preprocessing is **recursive** - applies to entire tree:

```javascript
function preprocessDataForD3(node) {
  // Convert content arrays
  if (node.content || node.urls || node.items) {
    // ... conversion logic ...
  }

  // Recursively process children
  if (node.children && node.children.length > 0) {
    node.children = node.children.map(child => preprocessDataForD3(child));
  }

  return node;
}
```

**Result**: Every node in the tree is processed, from root to deepest leaf.

---

#### 4. Size Calculation

D3 layouts require size values for nodes:

**Leaf nodes** (content items): `value: 1`
```json
{ "name": "Article 1", "value": 1 }
```

**Category nodes**: Size = sum of children
```javascript
const root = d3.hierarchy(data)
  .sum(d => d.value || 0)  // Sum up values from leaves
```

**Example:**
```
Solar (value computed as sum)
├── Article 1 (value: 1)
├── Article 2 (value: 1)
└── Article 3 (value: 1)
Total: 3
```

---

### D3 Hierarchy Creation

After preprocessing, create D3 hierarchy:

```javascript
const root = d3.hierarchy(preprocessedData)
  .sum(d => d.value || 1)      // Size calculation
  .sort((a, b) => b.value - a.value);  // Sort by size
```

**What D3 adds:**
- `parent` - Reference to parent node
- `depth` - Depth level in tree (0 = root)
- `height` - Height of subtree (0 = leaf)
- `value` - Computed sum of descendants
- `data` - Original data object

**Access pattern:**
```javascript
// Original data properties
node.data.name        // "Solar Energy"
node.data.description // "Solar power technologies"

// D3-added properties
node.depth            // 3
node.value            // 15 (sum of descendants)
node.parent.data.name // "Renewable Energy"
```

---

### Search Index Generation

Search indexing uses **raw data** (before preprocessing):

**Why?**
- Need to index both category nodes AND content items
- Want to preserve original structure for search results
- Content items as separate documents, not converted to children

**Process:**
```javascript
function buildSearchIndex(rawData) {
  const docs = extractDocs(rawData);  // Flatten tree to documents
  miniSearch.addAll(docs);            // Index all documents
}
```

**Document extraction:**
```javascript
function extractDocs(node, path = []) {
  const docs = [];

  // Index the category node itself
  docs.push({
    id: generateId(node, path),
    name: node.name,
    type: node.type_ || '',
    path: path.join(' > '),
    content_text: aggregateContent(node)  // All child content
  });

  // Index content items as separate docs
  if (node.content) {
    node.content.forEach(item => {
      docs.push({
        id: item.UID || generateId(item, path),
        name: item.title,
        author: item.author || '',
        type: item.type_ || '',
        content_text: item.description || ''
      });
    });
  }

  // Recurse
  if (node.children) {
    node.children.forEach(child => {
      docs.push(...extractDocs(child, [...path, node.name]));
    });
  }

  return docs;
}
```

**Result**: Both category nodes and content items are searchable.

---

## Version History

### Current Version: V5

**File**: `CD_Solution_map_2_DB_prototype_V5.json`

**Features:**
- Standardized `content[]` array name
- Comprehensive field set (title, url, author, type_, tags, description, date, confidence, UID)
- Support for hybrid nodes (categories with both children and content)
- Flexible property naming (backward compatibility)
- TSV source from Google Sheets (two-sheet structure)

---

### Changes from V4

**Data Structure:**
- `content` now preferred over `urls` (though `urls` still supported)
- Added `confidence` field for quality scoring
- Standardized `type_` (with underscore) over `type`

**Source Format:**
- Two-sheet TSV structure (Taxonomy + Content)
- ID-based mapping instead of path-based

**Conversion Script:**
- V7 Python script with command-line arguments
- Better error handling and validation

---

### Changes from V3

**Major Changes:**
- Introduced hierarchical TSV source (previously direct JSON editing)
- Added UID field for unique identification
- Expanded tag support (from simple keywords to structured tags)
- Added description field at category level

---

### Migration from Older Versions

**V3/V4 → V5:**

1. **Update content array name** (optional, backward compatible):
   ```json
   // Old
   { "urls": [...] }

   // New (preferred)
   { "content": [...] }
   ```

2. **Add confidence scores**:
   ```json
   {
     "title": "Article",
     "confidence": 0.85  // Add this field
   }
   ```

3. **Standardize type field**:
   ```json
   // Old
   { "type": "Research" }

   // New (preferred)
   { "type_": "Research" }
   ```

4. **Add UIDs** (if missing):
   ```json
   {
     "title": "Article",
     "UID": "generated_unique_id"  // Add this
   }
   ```

**Backward Compatibility:**
- V5 code reads V3/V4 data without issues
- `urls` and `items` automatically converted to `children`
- `type` and `type_` both work
- Missing fields are simply not displayed (graceful degradation)

---

## Integration Points

### Visualization Consumption

All four visualizations consume preprocessed data:

**Circle Packing** (`js/visualizations/circlePacking.js`):
```javascript
const root = d3.hierarchy(processedData)
  .sum(d => d.value || 1)
  .sort((a, b) => b.value - a.value);

const pack = d3.pack().size([width, height]).padding(3);
pack(root);
```

**Treemap** (`js/visualizations/treemap.js`):
```javascript
const root = d3.hierarchy(processedData)
  .sum(d => d.value || 1)
  .sort((a, b) => b.value - a.value);

const treemap = d3.treemap().size([width, height]).padding(1);
treemap(root);
```

**Sunburst** (`js/visualizations/sunburst.js`):
```javascript
const root = d3.hierarchy(processedData)
  .sum(d => d.value || 1);

const partition = d3.partition().size([2 * Math.PI, radius]);
partition(root);
```

**Dendrogram** (`js/visualizations/dendrogram.js`):
```javascript
const root = d3.hierarchy(processedData);

const tree = d3.tree().size([height, width - 200]);
tree(root);
```

---

### Search Integration

**Index Building** (`js/search.js`):
```javascript
function buildSearchIndex(rawData) {
  // Extract documents from raw data
  const docs = extractDocs(rawData);

  // Create MiniSearch instance
  miniSearch = new MiniSearch({
    fields: ['name', 'description', 'author', 'type', 'tags', 'content_text', 'path'],
    storeFields: ['name', 'path', 'type'],
    searchOptions: {
      prefix: true,
      fuzzy: 0.2,
      combineWith: 'AND',
      boost: { name: 3, type: 2, path: 1.8, content_text: 1.5 }
    }
  });

  // Add all documents
  miniSearch.addAll(docs);
}
```

**Searching**:
```javascript
const results = miniSearch.search('solar energy', {
  boost: { name: 3 },
  prefix: true,
  fuzzy: 0.2
});
```

---

### Filter Extraction

**Extract Unique Types** (`js/utilities.js`):
```javascript
function extractTypes(data) {
  const types = new Set();

  function traverse(node) {
    // Get type from category or content items
    if (node.type_ || node.type) {
      types.add(node.type_ || node.type);
    }

    // Check content items
    if (node.content) {
      node.content.forEach(item => {
        if (item.type_ || item.type) {
          types.add(item.type_ || item.type);
        }
      });
    }

    // Recurse
    if (node.children) {
      node.children.forEach(traverse);
    }
  }

  traverse(data);
  return Array.from(types).sort();
}
```

**Similar functions exist for**:
- `extractAuthors(data)`
- `extractTags(data)`
- `extractDateRange(data)`

---

### Export Formats

**JSON Export**:
```javascript
function exportAsJSON(data, filename) {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  downloadBlob(blob, filename);
}
```

**CSV Export** (flattened hierarchy):
```javascript
function exportAsCSV(data) {
  const rows = [];

  function flatten(node, path = []) {
    const currentPath = [...path, node.name || node.title];

    // If leaf node, add as row
    if (node.url) {
      rows.push({
        Path: currentPath.join(' > '),
        Title: node.title || node.name,
        URL: node.url,
        Author: node.author || '',
        Type: node.type_ || node.type || '',
        Date: node.date || ''
      });
    }

    // Recurse
    if (node.children) {
      node.children.forEach(child => flatten(child, currentPath));
    }
  }

  flatten(data);
  return convertToCSV(rows);
}
```

---

## Troubleshooting

### Common Data Structure Errors

#### Error: "Cannot read property 'name' of undefined"

**Cause**: Missing required `name` property on a node

**Fix**: Ensure all category nodes have `name`:
```json
// ❌ Invalid
{
  "children": [...]
}

// ✅ Valid
{
  "name": "Category Name",
  "children": [...]
}
```

---

#### Error: "Data is not hierarchical"

**Cause**: Root is an array instead of object

**Fix**: Wrap in root object:
```json
// ❌ Invalid (array at root)
[
  { "name": "Category 1" },
  { "name": "Category 2" }
]

// ✅ Valid (object at root)
{
  "name": "Root",
  "children": [
    { "name": "Category 1" },
    { "name": "Category 2" }
  ]
}
```

---

#### Error: Circular JSON structure

**Cause**: Node references itself as child (preprocessing error)

**Check**: Ensure no node appears in its own `children` array

**Debug**:
```javascript
function detectCircular(node, ancestors = new Set()) {
  if (ancestors.has(node)) {
    console.error('Circular reference detected!', node);
    return true;
  }

  if (node.children) {
    const newAncestors = new Set(ancestors).add(node);
    return node.children.some(child => detectCircular(child, newAncestors));
  }

  return false;
}
```

---

#### Error: "sum() requires numeric value"

**Cause**: D3 hierarchy trying to sum non-numeric values

**Fix**: Ensure leaf nodes have numeric `value`:
```javascript
// In preprocessDataForD3
content.forEach(item => {
  item.value = 1;  // Add numeric value
});
```

---

### Validation Tools

#### JSON Schema Validator

Create a JSON schema file for validation:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["name"],
  "properties": {
    "name": { "type": "string", "minLength": 1 },
    "description": { "type": "string" },
    "tags": { "type": "array", "items": { "type": "string" } },
    "children": {
      "type": "array",
      "items": { "$ref": "#" }
    },
    "content": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["title", "url"],
        "properties": {
          "title": { "type": "string", "minLength": 1 },
          "url": { "type": "string", "format": "uri" },
          "author": { "type": "string" },
          "type_": { "type": "string" },
          "tags": { "type": "array", "items": { "type": "string" } },
          "description": { "type": "string" },
          "date": { "type": "string", "pattern": "^\\d{4}(-\\d{2})?(-\\d{2})?$" },
          "confidence": { "type": "number", "minimum": 0, "maximum": 1 },
          "UID": { "type": "string" }
        }
      }
    }
  }
}
```

**Usage** (Node.js with Ajv):
```javascript
const Ajv = require('ajv');
const ajv = new Ajv();
const schema = require('./data-schema.json');
const data = require('./CD_Solution_map_2_DB_prototype_V5.json');

const valid = ajv.validate(schema, data);
if (!valid) {
  console.error('Validation errors:', ajv.errors);
}
```

---

#### Browser Console Validation

Quick validation in browser:

```javascript
// Check for missing names
function findMissingNames(node, path = []) {
  const issues = [];

  if (!node.name && !node.title) {
    issues.push({ path, issue: 'Missing name/title' });
  }

  if (node.children) {
    node.children.forEach((child, i) => {
      issues.push(...findMissingNames(child, [...path, `children[${i}]`]));
    });
  }

  return issues;
}

// Check for invalid URLs
function findInvalidURLs(node, path = []) {
  const issues = [];

  if (node.url && !node.url.match(/^https?:\/\//)) {
    issues.push({ path, url: node.url, issue: 'Invalid URL format' });
  }

  if (node.content) {
    node.content.forEach((item, i) => {
      if (item.url && !item.url.match(/^https?:\/\//)) {
        issues.push({
          path: [...path, `content[${i}]`],
          url: item.url,
          issue: 'Invalid URL format'
        });
      }
    });
  }

  if (node.children) {
    node.children.forEach((child, i) => {
      issues.push(...findInvalidURLs(child, [...path, `children[${i}]`]));
    });
  }

  return issues;
}

// Run validation
const nameIssues = findMissingNames(rawData);
const urlIssues = findInvalidURLs(rawData);

console.log('Name issues:', nameIssues);
console.log('URL issues:', urlIssues);
```

---

### Debugging Malformed Data

#### Visualize the Structure

```javascript
// Print tree structure
function printTree(node, indent = 0) {
  const prefix = '  '.repeat(indent);
  console.log(`${prefix}${node.name || node.title || '[NO NAME]'}`);

  if (node.content) {
    console.log(`${prefix}  [${node.content.length} content items]`);
  }

  if (node.children) {
    node.children.forEach(child => printTree(child, indent + 1));
  }
}

printTree(rawData);
```

**Output:**
```
Climate Solutions
  Mitigation
    Energy
      Renewable
        Solar
          [3 content items]
        Wind
          [2 content items]
```

---

#### Find Deep Paths

```javascript
function findDeepPaths(node, depth = 0, path = [], maxDepth = 5) {
  const currentPath = [...path, node.name || '[NO NAME]'];

  if (depth > maxDepth) {
    console.warn(`Deep path (depth ${depth}):`, currentPath.join(' > '));
  }

  if (node.children) {
    node.children.forEach(child => {
      findDeepPaths(child, depth + 1, currentPath, maxDepth);
    });
  }
}

findDeepPaths(rawData);
```

---

#### Count Statistics

```javascript
function getStats(node) {
  let stats = {
    totalNodes: 0,
    totalContent: 0,
    maxDepth: 0,
    nodesWithContent: 0,
    nodesWithChildren: 0,
    hybridNodes: 0
  };

  function traverse(n, depth = 0) {
    stats.totalNodes++;
    stats.maxDepth = Math.max(stats.maxDepth, depth);

    if (n.content && n.content.length > 0) {
      stats.nodesWithContent++;
      stats.totalContent += n.content.length;
    }

    if (n.children && n.children.length > 0) {
      stats.nodesWithChildren++;
    }

    if (n.content && n.children) {
      stats.hybridNodes++;
    }

    if (n.children) {
      n.children.forEach(child => traverse(child, depth + 1));
    }
  }

  traverse(node);
  return stats;
}

console.table(getStats(rawData));
```

**Output:**
```
┌────────────────────┬────────┐
│ Stat               │ Value  │
├────────────────────┼────────┤
│ totalNodes         │ 245    │
│ totalContent       │ 856    │
│ maxDepth           │ 5      │
│ nodesWithContent   │ 178    │
│ nodesWithChildren  │ 67     │
│ hybridNodes        │ 12     │
└────────────────────┴────────┘
```

---

## Appendix

### Complete JSON Schema (Formal)

See **Validation Tools** section above for formal JSON Schema definition.

---

### TypeScript Interfaces

```typescript
interface CategoryNode {
  name: string;
  description?: string;
  tags?: string[];
  children?: (CategoryNode | ContentNode)[];
  content?: ContentItem[];
  urls?: ContentItem[];      // Legacy
  items?: ContentItem[];     // Alternative
}

interface ContentItem {
  title: string;
  url: string;
  author?: string;
  creator?: string;          // Alternative
  source?: string;           // Alternative
  type_?: string;
  type?: string;             // Alternative
  category?: string;         // Alternative
  tags?: string[];
  keywords?: string[];       // Alternative
  categories?: string[];     // Alternative
  description?: string;
  abstract?: string;         // Alternative
  date?: string;             // ISO 8601: YYYY-MM-DD
  confidence?: number;       // 0.0 to 1.0
  UID?: string;
}

interface RootNode extends CategoryNode {
  version?: string;
}

// After preprocessing
interface ProcessedNode {
  name: string;
  value?: number;
  children?: ProcessedNode[];
  // ... all original properties preserved
}

// D3 Hierarchy Node
interface HierarchyNode {
  data: ProcessedNode;
  parent: HierarchyNode | null;
  children?: HierarchyNode[];
  depth: number;
  height: number;
  value: number;
}
```

---

### Field Index (Alphabetical)

| Field | Type | Required | Node Type | Description |
|-------|------|----------|-----------|-------------|
| `abstract` | string | No | Content | Alternative to `description` |
| `author` | string | No | Content | Content creator/source |
| `categories` | array[string] | No | Both | Alternative to `tags` |
| `category` | string | No | Content | Alternative to `type_` |
| `children` | array[object] | No* | Category | Child nodes (subcategories) |
| `confidence` | number | No | Content | Quality score (0.0-1.0) |
| `content` | array[object] | No | Category | Content items (standard V5) |
| `creator` | string | No | Content | Alternative to `author` |
| `date` | string | No | Content | Publication date (ISO 8601) |
| `description` | string | No | Both | Summary/abstract |
| `items` | array[object] | No | Category | Alternative to `content` |
| `keywords` | array[string] | No | Both | Alternative to `tags` |
| `name` | string | Yes | Both | Node/category name |
| `source` | string | No | Content | Alternative to `author` |
| `tags` | array[string] | No | Both | Keywords for search/filtering |
| `title` | string | Yes | Content | Content title |
| `type` | string | No | Content | Alternative to `type_` |
| `type_` | string | No | Content | Content type/classification |
| `UID` | string | No | Content | Unique identifier |
| `url` | string | Yes | Content | Link to resource |
| `urls` | array[object] | No | Category | Alternative to `content` (legacy) |
| `value` | number | No | Both | Size value (added by preprocessing) |
| `version` | string | No | Root | Dataset version |

\* At least one of `children` or `content` should be present (otherwise node is empty)

---

### Glossary

**Category Node**: An intermediate node in the hierarchy that can contain subcategories (children) and/or content items.

**Content Item**: A leaf-level data object representing an actual resource, article, or solution with a title and URL.

**D3 Hierarchy**: A D3.js data structure representing tree data with computed properties like parent, depth, and value.

**Depth**: The number of levels from the root to a given node (root = 0, children of root = 1, etc.).

**Hybrid Node**: A category node that contains both subcategories (children) and direct content items.

**ISO 8601**: International standard for date formatting (YYYY-MM-DD).

**Leaf Node**: A terminal node with no children, typically containing only content items.

**Preprocessing**: Data transformation step that converts raw JSON to D3-compatible format.

**Raw Data**: Original JSON structure before preprocessing.

**Recursive Structure**: A data structure where nodes can contain other nodes of the same type (tree structure).

**Root Node**: The top-level node of the hierarchy (depth 0).

**Semantic Versioning**: Version numbering scheme (MAJOR.MINOR.PATCH, e.g., 1.0.5).

**TSV**: Tab-Separated Values file format (like CSV but with tabs).

---

## Contributing

To contribute data or report issues with the data structure:

1. **Data Issues**: Report in GitHub Issues with "data" label
2. **Structure Proposals**: Submit as GitHub Discussion
3. **Validation Errors**: Include output from validation tools
4. **New Fields**: Propose use cases and examples

---

## Resources

- [D3.js Hierarchy Documentation](https://d3js.org/d3-hierarchy)
- [MiniSearch Documentation](https://lucaong.github.io/minisearch/)
- [JSON Schema](https://json-schema.org/)
- [ISO 8601 Date Format](https://www.iso.org/iso-8601-date-and-time-format.html)

---

**Document Version**: 1.0
**Last Updated**: 2025-12-16
**Maintainer**: Climate Solutions Visualization Team
