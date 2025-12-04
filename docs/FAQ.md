# Frequently Asked Questions

Everything you need to know about the Climate Solutions Explorer

---

## What is the Climate Solutions Explorer?

The Climate Solutions Explorer is an interactive visualization tool created by [Climate Drift](https://climatedrift.substack.com/) to help you discover and explore climate solutions across various sectors. The platform aggregates climate-related articles, research, and resources into an intuitive, hierarchical visualization that makes it easy to navigate the complex landscape of climate action.

---

## Who created this tool?

This tool was created by [Climate Drift](https://climatedrift.substack.com/), a community dedicated to accelerating climate solutions and helping professionals transition into climate careers. Climate Drift curates insights, opportunities, and resources to help navigate the climate solutions landscape.

---

## How do I use the visualizations?

The Explorer offers four different visualization types:

- **Sunburst:** A radial partition showing hierarchical relationships. Click on any segment to zoom in, and click the center circle to zoom back out.
- **Circle Packing:** Nested circles representing the hierarchy. Click to zoom into categories, Shift+Click to zoom without showing tooltips.
- **Treemap:** Rectangular tiles showing proportional sizes. Click any category to drill down into its subcategories.
- **Dendrogram:** A tree diagram layout. Click nodes to expand/collapse branches and explore hierarchical relationships.

Use the visualization selector dropdown (top of the page) to switch between different views.

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

- Contact Climate Drift directly at [aphilosof@gmail.com](mailto:contact@example.com)
- Submit suggestions through the [Climate Drift Substack](https://climatedrift.substack.com/)
- Contribute to the GitHub repository (link in footer)
- Contribute an entry [Climate Solution Map Submission Form](https://forms.gle/uNyqmvkd6XGxRq38A)

All submissions are reviewed by our team to ensure quality and relevance before being added to the database.

---

## Can I export the data?

Yes! Use the export buttons in the footer to download the current dataset:

- **JSON:** Download the full hierarchical data structure in JSON format
- **CSV:** Download a flattened table view suitable for spreadsheet analysis

Both formats include all metadata (titles, URLs, authors, tags, descriptions, etc.).

---

## What technologies power this tool?

The Climate Solutions Explorer is built with:

- **D3.js v7:** For interactive data visualizations
- **MiniSearch:** For full-text search with Boolean operators
- **Vanilla JavaScript (ES6):** Modular architecture for maintainability
- **Python:** Data processing pipeline for converting Google Sheets to JSON

The tool is open-source and available on GitHub (link in footer).

---

## Why does it say "test dataset" in the disclaimer?

We're currently in beta testing with a curated subset of our full database. This allows us to refine the user experience, test features, and ensure data quality before launching the complete dataset. The full database will include thousands of climate solutions across all sectors and regions.

---

## How often is the data updated?

The database is updated regularly as new climate solutions, articles, and resources are published. Climate Drift's editorial team continuously curates content to ensure the Explorer reflects the latest developments in climate action.

---

## Is this tool free to use?

Yes! The Climate Solutions Explorer is completely free to use. Our mission is to make climate solutions accessible to everyone - researchers, professionals, students, and anyone interested in climate action.

---

## I found a bug or have a feature request. How do I report it?

We appreciate your feedback! You can:

- Report issues on our [GitHub repository](https://github.com/yourusername/climate-solutions-viz)
- Email us at [contact@example.com](mailto:contact@example.com)
- Reach out through [Climate Drift's Substack](https://climatedrift.substack.com/)
