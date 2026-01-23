---
marp: true
theme: uncover
paginate: true
size: 16:9
style: |
  section {
    font-size: 32px;
  }
  h1 {
    font-size: 60px;
  }
  h2 {
    font-size: 48px;
  }
---

<!-- _class: lead -->

# Climate Solutions Explorer
## Making Climate Action Discoverable

**ClimateDrift**
**January 2026**

---

## 🌍 The Problem

Climate solutions are **scattered everywhere:**

- Academic papers
- Industry reports
- News articles
- Innovation databases

**Result:** Hard to discover, connect, and compare solutions

---

## 💡 The Solution

<!-- Add screenshot: Full app view or hero image -->
![bg right:50% opacity:0.9](images/app-hero.png)

**Climate Solutions Explorer**

An interactive platform to **visualize, search, and explore** 1500+ climate solutions in one place

🌐 **https://aphilosof.github.io/climate-solutions-explorer/**

---

<!-- _class: lead -->

# 📊 Four Visualization Types

---

## 1️⃣ Circle Packing

<!-- Screenshot: Circle packing visualization in full view -->
![width:900px center](images/viz-circle-packing.png)

**Hierarchical bubbles**
- See the big picture
- Click to zoom and explore
- Size shows number of solutions

---

## 2️⃣ Dendrogram

<!-- Screenshot: Dendrogram with some branches expanded -->
![width:900px center](images/viz-dendrogram.png)

**Tree structure**
- Expand/collapse branches
- Best for understanding taxonomy
- Shows relationships clearly

---

## 3️⃣ Treemap

<!-- Screenshot: Treemap visualization -->
![width:900px center](images/viz-treemap.png)

**Space-filling rectangles**
- Maximum information density
- Drill down through categories
- Breadcrumb navigation

---

## 4️⃣ Sunburst

<!-- Screenshot: Sunburst visualization -->
![width:900px center](images/viz-sunburst.png)

**Radial rings**
- Beautiful circular layout
- Click to focus and zoom
- Shows hierarchy at a glance

---

## 🔍 Powerful Search

<!-- Screenshot: Search bar with query and highlighted results -->
![width:1000px](images/search-demo.png)

### Advanced Operators
- **Boolean**: `solar AND wind`
- **Exact phrases**: `"carbon capture"`
- **Exclusions**: `renewable -fossil`
- **Field-specific**: `author:MIT`, `date:2023`

### Real-time filtering by type, author, tags, date

---

## ⚡ Key Features

<!-- Screenshot: Split view showing tooltip and side panel -->
<!-- ![width:500px](images/feature-tooltip.png) ![width:500px](images/feature-panel.png) -->

✅ **Smart tooltips** - Hover for preview, click for details
✅ **Favorites** - Bookmark solutions with ⭐
✅ **Export** - JSON, CSV, SVG, PNG
✅ **Secure** - XSS protection, CSP, SRI hashes
✅ **Fast** - Loads in < 2 seconds

---

<!-- _class: lead -->

# 🤝 Community Powered

---

## 📝 Submission → Live Site

<!-- Diagram: Flow chart showing 4 steps -->
![width:900px center](images/data-flow-diagram.png)

**4 Simple Steps:**

1. **Submit** via Google Form (anyone can contribute)
2. **Review** by admin in secure panel
3. **Approve** moves to production database
4. **Auto-publish** to live site (1-2 min)

Fully automated pipeline!

---

## 🗄️ Data Architecture

<!-- Diagram: Architecture showing Google Sheets to Site flow -->
![bg right:50%](images/architecture-diagram.png)

### Two-Sheet System
- **Taxonomy** - Hierarchical categories (tree structure)
- **Content** - Individual solutions (1500+ entries)

### Automated Pipeline
**Google Sheets → TSV → JSON → Live Site**

Version controlled, automated updates via GitHub Actions

---

## 🛡️ Admin Panel

<!-- Screenshot: Admin panel interface (blur sensitive data!) -->
![width:1000px](images/admin-panel-blurred.png)

**Secure review interface** on Google Cloud

- Email whitelist + Google OAuth
- Edit before approval
- Bulk operations
- Audit trail

**Not in public repo** - Enterprise security

---

## 📊 By the Numbers

- **1,500+** climate solutions
- **20+** categories
- **50+** organizations
- **4** visualization types
- **< 2 sec** load time
- **Real-time** search

---

## 💡 Use Cases

**Researchers** - Discover related work, track trends
**Policymakers** - Understand landscape, find proven tech
**Entrepreneurs** - Spot gaps, identify opportunities
**Educators** - Teach comprehensively with visuals
**Investors** - Screen opportunities, track market

---

## 🚀 Future Vision

**Phase 2** - Enhanced interactivity, compare solutions
**Phase 3** - User accounts, community ratings
**Phase 4** - Trend analysis, impact metrics
**Phase 5** - REST API, integrations, embed widgets

---

## 🤝 How You Can Help

1. **Test & Feedback** - Try it, tell us what's missing
2. **Submit Solutions** - Share your work
3. **Spread the Word** - Tell your network
4. **Contribute Code** - GitHub PRs welcome
5. **Data Quality** - Review, validate, improve

---

<!-- _class: lead -->

# 🎯 Our Goal

Build the **definitive reference** for climate solutions worldwide

Comprehensive • Up-to-date • Community-driven • Free

---

## 🔗 Get Involved

<!-- Optional: QR code to live site -->
<!-- ![width:300px right](images/qr-code.png) -->

### Try It Now
🌐 **https://aphilosof.github.io/climate-solutions-explorer/**

### Contribute
💻 **github.com/aphilosof/climate-solutions-explorer**

### Contact
📧 **aphilosof@gmail.com**
📰 **climatedrift.substack.com**

---

<!-- _class: lead -->

<!-- Full-screen app screenshot as background -->
![bg](images/app-full-screen.png)

# Demo Time! 🚀

Let's explore together...

---

<!-- _class: lead -->

# Questions?

**Let's make climate action discoverable**

---

<!-- _class: lead -->

# Thank You! 🙏

**Climate Solutions Explorer**

https://aphilosof.github.io/climate-solutions-explorer/
