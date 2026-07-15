# Climate Solutions Visualization Tool

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Data License: CC BY 4.0](https://img.shields.io/badge/Data%20License-CC%20BY%204.0-lightgrey.svg)](https://creativecommons.org/licenses/by/4.0/)
[![Climate Action](https://img.shields.io/badge/Climate-Action-green.svg)](https://climatedrift.com)

A platform for exploring climate solutions data through interactive visualizations and intelligent search capabilities.



## 🌟 Features

### 📊 Multiple Visualization Types
- **Bubbles** (circle packing): Hierarchical data as nested circles with zoom navigation
- **Branches** (dendrogram): Tree-like node-link diagrams with expand/collapse
- **Mosaic** (treemap): Rectangular area-based representations with drill-down navigation
- **Sunburst**: Radial charts with concentric rings and smooth transitions
- **Force Network** (temporarily disabled): Physics-based node-link network with draggable nodes

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
   git clone https://github.com/aphilosof/climate-solutions-explorer-private.git
   cd climate-solutions-explorer-private
   ```

2. **Prepare your data**
   - **Option 1 (Recommended)**: Use automated TSV to JSON conversion
     - Export data from Google Sheets as TSV files
     - Place in `db/latest/` directory as `CD_Solution_map_2_taxonomy.tsv` and `CD_Solution_map_2_content.tsv`
     - Push to GitHub - automatic conversion happens via GitHub Actions
     - See [Data Management & Automation](#-data-management--automation) for details
   - **Option 2**: Place pre-generated JSON file in `db/latest/` directory
     - File: `CD_Solution_map_2_content.json`
     - See [Data Format](#data-format) section for structure requirements

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

### Testing

The project ships with a Playwright end-to-end suite (~27 tests: rendering of every visualization, treemap navigation and breadcrumbs, tooltip behavior, search and filters — any JavaScript console error fails the run):

```bash
npm install   # once — dev tooling only, the site itself has no build step
npm test      # ~1 minute; also runs in CI on every push and pull request
```

## 🚀 Deployment

This project uses a **two-repository strategy** for deployment:
- 🔒 **Private development repository**: [climate-solutions-explorer-private](https://github.com/aphilosof/climate-solutions-explorer-private) (this repo)
- 🌍 **Public production repository**: [climate-solutions-explorer](https://github.com/aphilosof/climate-solutions-explorer)

### How It Works

Deployment is a **manual, versioned release** (Actions → "Deploy to Public Repository" → Run workflow):
1. ✅ Copies an explicit allowlist of production files (never admin data or internal docs)
2. ✅ Validates all critical files are present and no admin columns leak
3. ✅ Force-pushes an orphan branch to the **public** repository (clean, history-free)
4. ✅ GitHub Pages serves the site from the public repo

This keeps your development files, AI instructions, and work-in-progress private while making the production site publicly accessible.

### Live Site

The site is automatically deployed at:
```
https://climatesolutionsmap.earth
```

Temporary GitHub Pages URL (before custom domain setup):
```
https://aphilosof.github.io/climate-solutions-explorer/
```

### Deployment Workflow

**Normal Development:**
```bash
# 1. Work on your private repo (climate-solutions-explorer-private)
# Make changes to index.html, js/, styles.css, etc.

# 2. Commit and push to main (this does NOT deploy)
git add .
git commit -m "Your changes"
git push origin main
```

**Deploying a Release:**
- Go to **private repo** → **Actions** tab
- Select "Deploy to Public Repository" → "Run workflow"
- Provide a version tag (e.g. `v1.0.3`) and optional description
- The live site updates ~1-2 minutes after the workflow completes

**Data updates are automated:** a scheduled workflow syncs the content database from its Google Sheet source (twice monthly or on demand), validates it, archives the previous version, generates release notes, and deploys — no manual steps. Code releases remain deliberate, manual, versioned deploys as described above.

### What Gets Deployed

**Production files** (deployed to public repository):
- `index.html`, `styles.css`
- `js/` folder (all visualization modules)
- `docs/`: FAQ and Privacy pages only (`FAQ.html`, `PRIVACY.html`, their markdown, `markdown-loader.js`)
- `db/latest/CD_Solution_map_2_content.json` + `version.txt` (public data only — TSVs never deploy)
- `cd_logo_crop_green.png`, `og-image.jpg`
- `LICENSE`, `README.md`, `robots.txt`, `sitemap.xml`, `404.html`

**Development files** (stay private):
- `CLAUDE.md` (AI development instructions)
- `src/` (Python data processing scripts)
- `db/latest/*.tsv` (raw sheet exports with admin columns)
- `docs/internal/` (guides, security docs, data structure reference)
- `Admin_Panel/` (Google Apps Script)
- `test_search.html` (test suite)
- `.github/workflows/` (deployment configuration)

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

For detailed setup instructions, see: `docs/internal/GITHUB_PAGES_SETUP.md`

Quick summary:
1. Create public repository: `climate-solutions-explorer`
2. Rename this repo to: `climate-solutions-explorer-private` (make private)
3. Create GitHub Personal Access Token with `repo` scope
4. Add token as `PUBLIC_REPO_TOKEN` secret in private repo settings
5. Enable GitHub Pages on public repo (Settings → Pages → Deploy from `main` branch)
6. Run the "Deploy to Public Repository" workflow (manual trigger with a version tag)

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

> **📖 Complete Documentation**: For comprehensive data structure documentation including field specifications, validation rules, best practices, and examples, see [DATA_STRUCTURE.md](docs/internal/DATA_STRUCTURE.md)

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

## 🔄 Data Management & Automation

### Automated TSV to JSON Conversion

This repository includes **automated data processing** using GitHub Actions. When you update TSV data files, the system automatically converts them to JSON with version tracking and changelog generation.

#### How It Works

**Automatic Conversion:**
1. Export updated data from Google Sheets as TSV files
2. Place files in `db/latest/` directory:
   - `CD_Solution_map_2_taxonomy.tsv` (hierarchical structure)
   - `CD_Solution_map_2_content.tsv` (content entries)
3. Commit and push to GitHub
4. **GitHub Actions automatically**:
   - Converts TSV → JSON using the V7 Python script
   - Generates `db/latest/CD_Solution_map_2_content.json`
   - Auto-increments version number in `version.txt`
   - Logs changes to `version_history.txt` with statistics
   - Commits all updates with detailed message

**Manual Trigger:**
- Go to **Actions** tab in GitHub
- Select "Convert TSV to JSON"
- Click "Run workflow"

#### Version Tracking

Every data update automatically creates:

**`version.txt`** - Current version number (semantic versioning)
```
1.0.5
```

**`version_history.txt`** - Complete changelog with statistics
```
2025-12-12 10:30:45 UTC | v1.0.0 | Taxonomy: 234 lines | Content: 1567 lines | JSON: 456789 bytes
2025-12-12 14:23:12 UTC | v1.0.1 | Taxonomy: 234 lines | Content: 1589 lines | JSON: 458901 bytes
2025-12-13 09:15:30 UTC | v1.0.2 | Taxonomy: 245 lines | Content: 1612 lines | JSON: 462345 bytes
```

**Git Commit Messages** - Rich details for every update
```
🤖 Auto-generate JSON v1.0.5

Updated data from TSV files:
- Taxonomy: 234 lines
- Content: 1567 lines
- Timestamp: 2025-12-12 14:23:12 UTC

Generated with Claude Code https://claude.com/claude-code
```

#### Benefits

✅ **No Local Setup** - Conversion runs on GitHub servers
✅ **Always Up-to-Date** - JSON automatically updated when TSV changes
✅ **Version Controlled** - All changes tracked in Git history
✅ **Automatic Versioning** - Semantic version numbers auto-increment
✅ **Change Tracking** - Complete history with timestamps and statistics
✅ **Detailed Commits** - Rich commit messages with data metrics
✅ **Audit Trail** - Full traceability of all data updates

#### Manual Conversion (Fallback)

If you need to run the conversion locally:
```bash
python src/tsv_to_json_from_taxonomy_and_content_sheets_V7.py \
  --taxonomy db/latest/CD_Solution_map_2_taxonomy.tsv \
  --content db/latest/CD_Solution_map_2_content.tsv \
  --output db/latest/CD_Solution_map_2_content.json
```

#### Workflow Configuration

The automation is configured in `.github/workflows/convert-tsv-to-json.yml`

**Triggers:**
- Automatic: When any `.tsv` file in `db/latest/` is pushed
- Manual: Via GitHub Actions UI

**What Gets Updated:**
- `db/latest/CD_Solution_map_2_content.json` - Generated data
- `db/latest/version.txt` - Version number
- `db/latest/version_history.txt` - Full changelog

For detailed documentation, see [TSV_TO_JSON_AUTOMATION.md](docs/internal/TSV_TO_JSON_AUTOMATION.md)

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

**TSV to JSON automation fails:**
- Check **Actions** tab in GitHub for error details
- Verify TSV files are in `db/latest/` directory with correct names:
  - `CD_Solution_map_2_taxonomy.tsv`
  - `CD_Solution_map_2_content.tsv`
- Ensure TSV files have proper headers and format
- Check that workflow has write permissions to repository
- See [TSV_TO_JSON_AUTOMATION.md](docs/internal/TSV_TO_JSON_AUTOMATION.md) for detailed troubleshooting

**JSON not updating after TSV push:**
- Verify workflow ran successfully in **Actions** tab
- Check if TSV files actually changed (workflow only commits if content changed)
- Ensure workflow is watching correct file paths (`db/latest/*.tsv`)
- Try manual trigger: Actions → "Convert TSV to JSON" → "Run workflow"



## 📄 License

This project uses a **dual-license** structure to maximize both code reusability and data attribution:

### Code License: MIT
The application code, visualizations, scripts, and HTML/CSS/JS files are licensed under the **MIT License**.

**You are free to:**
- Use commercially
- Modify and adapt
- Distribute and sublicense
- Use privately

**Requirements:**
- Include copyright notice and license text in copies

See the [LICENSE](LICENSE) file for full MIT License text.

### Data License: CC BY 4.0
The climate solutions database (all JSON files in `db/` directory) is licensed under **Creative Commons Attribution 4.0 International (CC BY 4.0)**.

**You are free to:**
- Share and redistribute the data
- Adapt, remix, and build upon the data
- Use commercially

**Requirements:**
- Provide attribution to Climate Drift
- Indicate if changes were made
- Link to the license

**Attribution:**
```
Climate Solutions Explorer by Climate Drift (https://climatedrift.com)
```

Full license details: [LICENSE](LICENSE) | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)

---

## 📚 Citing This Project

If you use the Climate Solutions Explorer or database in your research, please cite it:

### Software Citation (APA)
```
Philosof, A., & Climate Drift. (2026). Climate Solutions Explorer (Version 1.0.0)
[Computer software]. https://github.com/aphilosof/climate-solutions-explorer
```

### Data Citation (APA)
```
Philosof, A., & Climate Drift. (2026). Climate Solutions Database (Version 1.0.0)
[Data set]. Licensed under CC BY 4.0.
https://climatesolutionsmap.earth
```

### BibTeX

**Software:**
```bibtex
@software{Philosof_Climate_Solutions_Explorer_2026,
  author = {Philosof, Alon and {Climate Drift}},
  license = {MIT},
  title = {{Climate Solutions Explorer}},
  url = {https://github.com/aphilosof/climate-solutions-explorer},
  version = {1.0.0},
  year = {2026}
}
```

**Data:**
```bibtex
@dataset{Philosof_Climate_Solutions_Database_2026,
  author = {Philosof, Alon and {Climate Drift}},
  license = {CC-BY-4.0},
  title = {{Climate Solutions Database}},
  url = {https://climatesolutionsmap.earth},
  version = {1.0.0},
  year = {2026}
}
```

**GitHub Citation**: Click "Cite this repository" button in the About section (uses [CITATION.cff](CITATION.cff))

## 🙏 Acknowledgments

---

