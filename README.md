# Climate Solutions Visualization Tool

A platform for exploring climate solutions data through interactive visualizations and intelligent search capabilities.



## 🌟 Features

### 📊 Multiple Visualization Types
- **Circle Packing**: Hierarchical data as nested circles with zoom navigation
- **Dendrogram**: Tree-like node-link diagrams with expand/collapse
- **Treemap**: Rectangular area-based representations with drill-down navigation  
- **Sunburst**: Radial charts with concentric rings and smooth transitions

### 🔍 Advanced Search & Filtering
- **Boolean Operators**: Use AND, OR, NOT for complex queries
- **Exact Phrase Matching**: Quote terms for precise matches ("solar power")
- **Exclude Terms**: Use minus (-) to exclude results (renewable -fossil)
- **Field-Specific Search**: Target specific fields (author:, type:, tag:, date:)
- **Date Range Queries**: Search by year or range (date:2023 or date:2023-2024)
- **Real-time Suggestions**: Auto-complete with recent searches and matching items
- **Multi-category Filters**: Filter by type, author, location, tags, and date range
- **Visual Highlighting**: Search results highlighted with non-matches dimmed
- **Search Within Results**: Combine filters with advanced operators for precision

### 🎯 Interactive Features
- **Smart Tooltips**: Hover for preview, click for persistent detailed information
- **Favorites/Bookmarks**: Save solutions with ⭐ button, export as JSON
- **Zoom & Pan**: Navigate through data hierarchies seamlessly
- **Color Coding**: Multiple color schemes including focus-based themes
- **Export Options**: Download filtered data as JSON/CSV or visualizations as SVG/PNG
- **Responsive Design**: Works on desktop and tablet devices

## 🚀 Quick Start

### Prerequisites
- Modern web browser (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+)
- Web server (for local development) or GitHub Pages/similar hosting

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/aphilosof/climate-solutions-viz.git
   cd climate-solutions-viz
   ```

2. **Prepare your data**
   - Option 1 - Place your climate solutions data file as `CD_Solution_map_2_DB_prototype_V3.json` in the root directory
    - See [Data Format](#data-format) section for structure requirements
   -  Option 2 - complie the json file from the two `CD Solution map 2.0 DB prototype - V3` google sheet.
    - Download the two sheets as `Taxonomy`.tsv and `Content.tsv`
    - Create a json file using `tsv_to_json_from_taxonomy_and_content_sheets_claude.py`

3. **Launch the application**
   ```bash
   # Using Python 
   python -m http.server 8000
   
   # Using Node.js 
   npx http-server

   # Visual Studio Code 
   Use Live Server
   
   # Or open index.html in your browser if using modern browser with local file support (Chrome might not work)
   ```

4. **Access the application**
   - Open `http://localhost:8000` in your browser
   - Select a visualization type and click "Load Visualization"

## 🚀 Deployment

This project uses a **two-repository strategy** for deployment:
- 🔒 **Private development repository**: [climate-solutions-explorer-private](https://github.com/aphilosof/climate-solutions-explorer-private) (this repo)
- 🌍 **Public production repository**: [climate-solutions-explorer](https://github.com/aphilosof/climate-solutions-explorer)

### How It Works

Every push to the `main` branch of the **private** repository automatically:
1. ✅ Triggers a GitHub Actions workflow
2. ✅ Copies only production files to the **public** repository
3. ✅ Excludes development files (CLAUDE.md, test files, Python scripts, etc.)
4. ✅ Deploys the clean site to GitHub Pages from the public repo

This keeps your development files, AI instructions, and work-in-progress private while making the production site publicly accessible.

### Live Site

The site is automatically deployed at:
```
https://aphilosof.github.io/climate-solutions-explorer/
```

### Deployment Workflow

**Normal Development:**
```bash
# 1. Work on your private repo (climate-solutions-explorer-private)
# Make changes to index.html, js/, styles.css, etc.

# 2. Commit and push to main
git add .
git commit -m "Your changes"
git push origin main

# 3. GitHub Actions automatically:
#    - Copies production files
#    - Pushes to public repo's main branch
#    - GitHub Pages updates live site (takes ~1-2 minutes)
```

**Manual Deployment Trigger:**
- Go to **private repo** → **Actions** tab
- Select "Deploy to Public Repository"
- Click "Run workflow"

### What Gets Deployed

**Production files** (deployed to public repository):
- `index.html`, `styles.css`
- `js/` folder (all visualization modules)
- `docs/` folder (FAQ)
- `db/latest/` folder (production data - ~856 KB)
- `cd_logo_crop_green.png`
- `LICENSE`, `README.md`

**Development files** (stay private):
- `CLAUDE.md` (AI development instructions)
- `src/` (Python data processing scripts)
- `db/varsions/` & `db/legacy_dbs/` (version history & old databases - ~11 MB)
- `test_search.html` (test suite)
- `.github/workflows/` (deployment configuration)
- Old HTML versions (`index______.html`, etc.)
- Development documentation (`IMPLEMENTATION_CHECKLIST.md`, etc.)

### Repository Structure

```
Private Repo (climate-solutions-explorer-private)
├── All development files
├── CLAUDE.md ← Your AI development guide
├── src/ ← Python scripts
├── test_search.html ← Test suite
└── .github/workflows/ ← Deployment automation

                    ↓ (GitHub Actions)

Public Repo (climate-solutions-explorer)
├── index.html
├── styles.css
├── js/
├── docs/
└── Production files only → GitHub Pages
```

### Monitoring Deployments

Check deployment status:
1. Go to **private repo**: [Actions tab](https://github.com/aphilosof/climate-solutions-explorer-private/actions)
2. View the latest "Deploy to Public Repository" workflow
3. Click on the workflow to see detailed logs
4. Verify public repo was updated: [climate-solutions-explorer](https://github.com/aphilosof/climate-solutions-explorer)

### First-Time Setup

For detailed setup instructions, see: `/tmp/two-repo-setup-instructions.md`

Quick summary:
1. Create public repository: `climate-solutions-explorer`
2. Rename this repo to: `climate-solutions-explorer-private` (make private)
3. Create GitHub Personal Access Token with `repo` scope
4. Add token as `PUBLIC_REPO_TOKEN` secret in private repo settings
5. Enable GitHub Pages on public repo (Settings → Pages → Deploy from `main` branch)
6. Push to main branch to trigger first deployment

## 📋 Usage Guide

### Getting Started
1. **Load Data**: Select a visualization type from the dropdown and click "Load Visualization"
2. **Explore**: Hover over elements for quick previews, click for detailed information
3. **Search**: Use the natural language search box to find specific content
4. **Filter**: Use dropdown filters to focus on specific types, authors, or tags
5. **Navigate**: Use visualization-specific controls for zooming, expanding, or drilling down

### Advanced Search Guide

The search system supports powerful operators for precise queries. Click the "⚙️ Advanced Search" button in the sidebar to see all operators and examples.

#### Search Operators

**Exact Phrase Match**
```
"solar power"          → Only results with exact phrase "solar power"
"carbon capture"       → Exact match for "carbon capture"
```

**Exclude Terms**
```
renewable -fossil      → Renewable energy but exclude fossil fuel mentions
solar -expensive       → Solar solutions excluding expensive ones
-wind                  → Everything except wind-related content
```

**Boolean Operators**
```
solar AND wind         → Results must contain both terms
solar OR wind          → Results with either term
solar NOT fossil       → Solar results excluding fossil
```

**Field-Specific Search**
```
author:ClimateDrift    → Search only in author field
type:article           → Filter by content type
tag:renewable          → Search by tag
date:2023              → Find content from 2023
date:2023-2024         → Date range search
```

**Complex Queries**
```
"solar power" author:ClimateDrift              → Exact phrase by specific author
renewable -fossil type:article                 → Renewable articles excluding fossil
wind OR solar date:2023                        → Wind or solar from 2023
"carbon capture" tag:technology -expensive     → Carbon capture tech, not expensive
author:Tesla type:innovation date:2023-2024    → Tesla innovations from 2023-2024
```

#### Search Tips

1. **Combine operators** for precise results:
   - `"climate solutions" author:MIT -fossil date:2023`

2. **Use quotes** for multi-word exact matches:
   - `"renewable energy"` vs `renewable energy`

3. **Field-specific searches** work with filters:
   - Apply a Type filter, then use `author:ClimateDrift` to further narrow

4. **Date searches** complement date range filters:
   - Use `date:2023` in search OR the date range filter in sidebar

5. **Exclude terms** to refine results:
   - Start broad, then add exclusions: `energy -nuclear -fossil`

#### Search Suggestions

- **Recent Searches**: Press focus on search box (click or tab) to see recent queries
- **Auto-complete**: Start typing to see matching solution names
- **Keyboard Navigation**: Use arrow keys ↑↓ to navigate suggestions, Enter to select

### Favorites & Bookmarks

Save important solutions for later reference:

1. **Add to Favorites**: Click a solution to open the side panel, then click the ⭐ button
2. **View Favorites**: Open sidebar (☰ menu) → "My Favorites" section
3. **Manage Favorites**:
   - Click on any favorite to view details
   - Click "Remove" to delete individual favorites
   - Click "Export Favorites" to download as JSON
   - Click "Clear All" to remove all favorites
4. **Favorites Storage**: Saved in browser localStorage (persists across sessions)

### Export Options

Export your filtered data or visualizations:

**Data Export** (from sidebar):
- **JSON**: Download filtered data in JSON format
- **CSV**: Download filtered data as CSV spreadsheet

**Visualization Export** (from sidebar):
- **SVG**: Export current visualization as scalable vector graphic
- **PNG**: Export current visualization as high-resolution image (2x resolution)

All exports include active filter information in the filename for easy reference.

### Keyboard Shortcuts
- **Shift + Click**: Navigate/zoom without showing tooltip
- **Click**: Show sticky tooltip with detailed information
- **Escape**: Close sticky tooltips (when implemented)

## 📁 Data Format

### Required JSON Structure
```json
{
  "name": "Climate Solutions",
  "children": [
    {
      "name": "Energy Solutions",
      "content": [
        {
          "title": "Solar Panel Innovation",
          "url": "https://example.com/solar-innovation",
          "author": "Tech Company Inc",
          "type_": "Renewable Energy",
          "tags": ["solar", "renewable", "innovation"],
          "description": "Advanced solar panel technology...",
          "date": "2023-01-15",
          "confidence": 0.9
        }
      ],
      "children": [
        {
          "name": "Solar Power",
          "urls": [...]
        }
      ]
    }
  ]
}
```

### Flexible Property Names
The system automatically handles various naming conventions:
- **Type**: `type_`, `type`, `category`
- **Author**: `author`, `creator`, `source`
- **Tags**: `tags`, `keywords`, `categories`
- **Content Arrays**: `content`, `urls`, `items`

### Color Schemes
Modify the `defaultColorScale` and theme-specific colors in the JavaScript section:
```javascript
const defaultColorScale = d3.scaleOrdinal()
  .domain([0, 1, 2, 3, 4, 5, 6, 7])
  .range(['#bfbfbf', '#849191', '#4c4c4c', '#dbb8e3', '#a3c9a8', '#84b6f4', '#fdcb6e', '#ff7675']);
```

### Search Configuration
Adjust search parameters in the MiniSearch initialization:
```javascript
miniSearch = new MiniSearch({
  fields: ['name', 'description', 'author', 'type', 'tags', 'content_text', 'url'],
  searchOptions: {
    prefix: true,
    fuzzy: 0.2,  // Adjust fuzzy matching tolerance
    boost: { name: 3, type: 2, description: 1.5, tags: 1.2 }
  }
});
```

## 🐛 Troubleshooting

### Common Issues

**"No data loaded" or visualization doesn't appear:**
- Ensure `CD_Solution_map_2_DB_prototype_V3.json` exists and is valid JSON
- Check browser console for loading errors
- Verify you're serving files through a web server (not file://)

**Search not working:**
- Open browser console and check for library loading errors
- Try the debug command: `testSearch("test")`
- Ensure search index was built successfully

**Performance issues with large datasets:**
- Consider reducing data size or implementing progressive loading
- Disable animations for better performance
- Check browser memory usage in developer tools



## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details. # To do

## 🙏 Acknowledgments

---

