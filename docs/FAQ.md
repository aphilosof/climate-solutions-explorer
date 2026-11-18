# Frequently Asked Questions

Everything you need to know about the Climate Solutions Explorer

---

## What is the Climate Solutions Explorer?

The Climate Solutions Explorer maps the climate-solution landscape in one place.
Each entry is a real solution, an article, company, technology, tool, project, or dataset, tied to its source, its sector, and its place in a shared taxonomy. In an era of AI generated content deluge, the Explorer offers expert-curated solutions, so what you find is real and vetted.

---

## Why does it exist?

Climate solutions live in thousands of disconnected places: academic papers,
industry reports, news articles, innovation databases, and company websites. Anyone trying to
understand a sector has faced the same challenges of finding good articles and deep dives, comparing approaches, finding the people and companies working on a problem, and finding value in hours of scrolling and scanning content. The Explorer pulls
that material into one structured, searchable place, linking people and companies, technologies and challenges, to make research easier.

---

## How can different users benefit from it?

### The newcomer looking for a new direction
Someone new to climate, or unsure where to focus, does not yet know what to search
for. The circle-packing view puts the whole field in front of them, each sector
sized by how much knowledge exists inside it, where the opportunities lie and where their skills are needed. They can move from Power into solar into a single company and learn how the landscape is built to guide them in their journey into a sector.
Example: **Circle packing → a sector → a subcategory → a solution**

### The researcher going deep on a problem
A researcher or climate professional tracking a topic wants to find writings and deep dives and the people that can help them learn more. They need to link problems and solutions together, they are looking to learn fast, avoid fluff and sifting through dozens of tabs. Entries light up as they type search terms, a filter separates the analysis from the technologies, the people from the companies. Every entry
carries a link straight to its source. Being power users they can collect entries along the way and export them to a TSV, for further work downstream.
Example: **Search a term → Type: Article or Type: Technology → open an entry → source link**

### The investor sizing up a sector
An investor deciding whether a sector deserves a place in the portfolio wants to
see where the activity actually is, where there are gaps, or opportunities to scale. The treemap shows it at a glance: in Carbon
Removal, direct air capture fills a large block while enhanced weathering is still
a sliver. A few clicks turn that read into a company shortlist to weigh against a thesis.
Example: **Treemap → a sector → Type: Company → open a company → Export CSV**

### The job seeker or marketer building a shortlist
Someone hunting for the right companies usually works one sector at a time. The explorer allows flagging the companies, and the people associated with them, as they explore a sector on the map. The shortlist lives in their browser and can be exported easily.
Example: **Search `type:company software` → ⭐ the ones you want → Export favorites (JSON)**

### The contributor adding to the map
A climate professional, company CEO, or researcher looking to gain exposure to their work can
submit through a form. It is reviewed by an admin and added to the map if approved. Weekly updates are published on LinkedIn.
**Google Form → admin review → approval → added to map**

---

## Who created this tool?

This tool was created by [Climate Drift](https://climatedrift.substack.com/), a community dedicated to accelerating climate solutions and helping professionals transition into climate careers. Climate Drift curates insights, opportunities, and resources to help navigate the climate solutions landscape.

---

## How do I use the visualizations?

The Explorer offers five different visualization types:

- **Sunburst:** A radial partition showing hierarchical relationships. Click on any segment to zoom in, and click the center circle to zoom back out.
- **Bubbles:** Nested circles representing the hierarchy. Click to zoom into categories, Shift+Click to zoom without showing tooltips.
- **Mosaic:** Rectangular tiles showing proportional sizes. Click any category to drill down into its subcategories.
- **Branches:** A tree diagram layout. Click nodes to expand/collapse branches and explore hierarchical relationships.
- **List:** A sortable table of every listing — click any column header to sort by title, category, type, author, or date.
<!-- Force Network temporarily disabled (needs rework) — restore the bullet and bump the count above when re-enabled
- **Force Network:** A physics-based network graph. Click nodes to expand/collapse and explore connections.
-->


Use the visualization selector in the sidebar menu to switch between different views.

---

## How does the search function work?

The search bar supports powerful Boolean operators:

- **AND:** Find solutions that match all terms (e.g., `solar AND energy`)
- **OR:** Find solutions that match any term (e.g., `wind OR hydro`)
- **NOT:** Exclude specific terms (e.g., `renewable NOT fossil`)

The search looks through titles, descriptions, tags, authors, and all content to find relevant matches. Results are highlighted in red across all visualizations.

---

## What do the filters do?

You can filter the data by:

- **Type:** Filter by content type (e.g., articles, reports, tools)
- **Tag:** Filter by specific topics or keywords
- **Author:** View content from specific organizations or authors
- **Location:** Filter by geographic region or country

Filters work together - you can combine multiple filters to narrow down results. Use the "Reset Filters" button to clear all active filters and return to the full dataset.

---

## What are the "Other Solutions" clusters?

When a category has 5 or more terminal solutions (leaf nodes without subcategories), they are grouped into an "Other Solutions" cluster to keep the visualization clean and navigable. Clicking on these clusters opens a side panel where you can view and access all the individual solutions.

---

## How can I contribute to the database?

We welcome contributions! If you know of climate solutions, articles, or resources that should be included:

- Contact us at [info@climatesolutionsmap.earth](mailto:info@climatesolutionsmap.earth)
- Submit suggestions through the [Climate Drift Substack](https://climatedrift.substack.com/)
- Contribute to the GitHub repository (link in footer)
- Submit an entry via the [Climate Solution Map Submission Form](https://forms.gle/uNyqmvkd6XGxRq38A)

All submissions are reviewed by our team to ensure quality and relevance before being added to the database.

---

## Can I export the data?

Yes! Use the export buttons in the sidebar menu to download the current dataset:

- **JSON:** Download the full hierarchical data structure in JSON format
- **CSV:** Download a flattened table view suitable for spreadsheet analysis
- **SVG:** Export the current visualization as a scalable vector graphic
- **PNG:** Export the current visualization as a high-resolution image

All formats include relevant metadata (titles, URLs, authors, tags, descriptions, etc.).

---

## What technologies power this tool?

The Climate Solutions Explorer is built with:

- **D3.js v7:** For interactive data visualizations
- **MiniSearch:** For full-text search with Boolean operators
- **Vanilla JavaScript (ES6):** Modular architecture for maintainability
- **Python:** Data processing pipeline for converting Google Sheets to JSON

The tool is open-source and available on GitHub (link in footer).

---

## How often is the data updated?

The database is updated regularly as new climate solutions, articles, and resources are published. Climate Drift's editorial team continuously curates content to ensure the Explorer reflects the latest developments in climate action.

---

## Is this tool free to use?

Yes! The Climate Solutions Explorer is completely free to use. Our mission is to make climate solutions accessible to everyone - researchers, professionals, students, and anyone interested in climate action.

---

## I found a bug or have a feature request. How do I report it?

We appreciate your feedback! You can:

- Report issues on our [GitHub repository](https://github.com/aphilosof/climate-solutions-explorer)
- Email us at [info@climatesolutionsmap.earth](mailto:info@climatesolutionsmap.earth)
- Reach out through [Climate Drift's Substack](https://climatedrift.substack.com/)
