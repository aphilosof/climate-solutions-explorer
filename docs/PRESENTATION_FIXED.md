---
marp: true
theme: uncover
paginate: true
size: 16:9
style: |
  section {
    font-size: 28px;
  }
  h1 {
    font-size: 52px;
  }
  h2 {
    font-size: 42px;
  }
  h3 {
    font-size: 32px;
  }
  code {
    font-size: 20px;
  }
---

# Climate Solutions Explorer
## Interactive Visualization Platform for Climate Action

**Presented by: [Your Name]**
**ClimateDrift**
**January 2026**

---

## 🌍 The Challenge

**Climate solutions are scattered across:**
- Academic papers
- Industry reports
- Innovation databases
- News articles
- Research institutions

---

## 🌍 The Problem

- Hard to discover relevant solutions
- No unified view of the landscape
- Difficult to see connections between approaches
- Time-consuming manual research

> *"We need a way to explore the entire climate solutions ecosystem at once."*

---

## 💡 Our Solution

**Climate Solutions Explorer** - An interactive platform that:

✅ **Visualizes** 1500+ climate solutions in 4 different formats
✅ **Connects** related innovations and research
✅ **Searches** using advanced natural language queries

---

## 💡 Our Solution (cont.)

✅ **Filters** by type, author, tags, date range
✅ **Exports** data for research and analysis
✅ **Grows** through community contributions

**Live Demo:** https://aphilosof.github.io/climate-solutions-explorer/

---

## 📊 Four Ways to Explore (1/2)

### 1. **Circle Packing** - Hierarchical Bubbles
- See the "big picture" and drill down
- Size = number of solutions in category
- Click to zoom, shift+click for quick navigation

### 2. **Dendrogram** - Tree Diagram
- Explore relationships as a tree structure
- Expand/collapse branches on demand
- Best for understanding taxonomy

---

## 📊 Four Ways to Explore (2/2)

### 3. **Treemap** - Space-Filling Rectangles
- Maximum information density
- Drill down through categories
- Breadcrumb navigation back up

### 4. **Sunburst** - Radial Rings
- Beautiful circular layout
- Shows ancestors and descendants
- Click arc to focus and zoom

---

## 🔍 Search & Filtering (1/2)

### Natural Language Search
- **Boolean operators**: `solar AND wind`, `renewable OR nuclear`
- **Exact phrases**: `"carbon capture"` for precise matches
- **Exclusions**: `renewable -fossil` to exclude terms
- **Field-specific**: `author:MIT`, `type:article`, `date:2023`

---

## 🔍 Search & Filtering (2/2)

### Multi-Layered Filtering
- Type (Article, Report, Innovation, etc.)
- Author/Organization
- Tags (technology, policy, energy, etc.)
- Date range with slider

### Visual Feedback
- ✅ **Matches highlighted in red**
- **Non-matches dimmed**
- **Real-time suggestions** as you type

---

## 🎯 Key Features (1/2)

### Smart Tooltips
- **Hover**: Quick preview
- **Click**: Sticky detailed view
- **Links open in new tab** with security
- See title, author, type, date, description, tags

### Favorites & Bookmarks ⭐
- Save solutions with star button
- Export favorites as JSON
- Persist across sessions

---

## 🎯 Key Features (2/2)

### Export Options
- **Data**: JSON, CSV (filtered results)
- **Visualizations**: SVG (scalable), PNG (high-res)
- Filename includes active filters

### Responsive & Secure
- Works on desktop and tablet
- XSS protection (DOMPurify)
- Content Security Policy
- Subresource Integrity for CDN

---

## 📝 Contribution Process (1/3)

### Step 1: Submission (Public)
- Anyone can submit via Google Form
- Provide: Title, URL, Description, Tags, etc.
- No login required

### Step 2: Staging (Automatic)
- Entry goes to "Staging_Content" sheet
- System auto-generates unique UID
- Awaits review

---

## 📝 Contribution Process (2/3)

### Step 3: Review (Human)
- Admin reviews in secure Admin Panel
- Checks quality, accuracy, relevance
- Can edit entry before approval

**Two outcomes:**
- ✅ **Approve** → Moves to "Content_V5" production sheet
- ❌ **Reject** → Removed from staging

---

## 📝 Contribution Process (3/3)

### Step 4: Publish (Automatic)
- GitHub Actions converts TSV → JSON
- Updates live site automatically
- Takes 1-2 minutes to go live

**Fully automated pipeline** from approval to deployment!

---

## 🛡️ Admin Panel (1/2)

### Secure Review Interface

**Deployment:** Google Apps Script (Google Cloud)
**Access:** Email whitelist + Google OAuth
**URL:** Private (not in public repo)

---

## 🛡️ Admin Panel (2/2)

### Admin Functions
✅ View all pending submissions
✅ Edit entries before approval
✅ Approve or Reject with one click
✅ Bulk operations for efficiency
✅ Audit trail in sheet timestamps

### Security
- Google OAuth authentication
- Email-based access control
- HTTPS enforced
- Enterprise-grade Google Cloud infrastructure

---

## 🗄️ Database Structure (1/3)

### Two-Sheet System

**Taxonomy Sheet** - Hierarchical Structure
- Defines the category tree
- ID, Name, Parent_ID, Level, Path
- Example: Climate Solutions → Energy → Renewable → Solar

**Content Sheet** - Leaf Entries
- Individual solutions/articles/innovations
- UID, Title, URL, Mapped_ID, Author, Type, Tags

---

## 🗄️ Database Structure (2/3)

### Taxonomy Example

| ID | Name | Parent_ID | Level | Path |
|----|------|-----------|-------|------|
| 1 | Climate Solutions | NULL | 0 | 1 |
| 2 | Energy | 1 | 1 | 1.2 |
| 3 | Renewable Energy | 2 | 2 | 1.2.3 |
| 4 | Solar Power | 3 | 3 | 1.2.3.4 |

---

## 🗄️ Database Structure (3/3)

### Content Example

| UID | Title | Mapped_ID | Author | Type |
|-----|-------|-----------|--------|------|
| SOL-001 | Solar Panel X | 4 | MIT | Article |
| WIN-002 | Wind Turbine Y | 5 | NREL | Report |

**Automated Pipeline:** Google Sheets ↔️ JSON ↔️ Visualization

---

## 💾 Data Flow (1/2)

### From Google Sheets to Live Site

1. **Edit** data in Google Sheets (easy for non-technical users)
2. **Export** as TSV files (Taxonomy.tsv + Content.tsv)
3. **Commit** to GitHub private repo
4. **GitHub Actions** converts TSV → JSON automatically

---

## 💾 Data Flow (2/2)

5. **Version tracking** auto-increments (v1.0.5)
6. **Deploy** to public GitHub Pages
7. **Live** in 1-2 minutes!

✅ Version controlled (Git history)
✅ Automated updates (no manual steps)
✅ Easy rollback (Git revert)

---

## 🏗️ Technical Stack

### Frontend
- **D3.js v7** - Data visualization
- **MiniSearch v7.1.2** - Full-text search
- **DOMPurify v3.0.6** - XSS protection
- **Vanilla JavaScript ES6** - No frameworks

### Deployment
- **GitHub Actions** - Automated deployment
- **GitHub Pages** - Free hosting + CDN
- **Two-repo strategy** - Private dev, public prod

---

## 🏗️ Modular Architecture

```
index.html (UI shell)
  └─ js/main.js (orchestration)
      ├─ js/utilities.js (shared functions)
      ├─ js/search.js (search engine)
      └─ js/visualizations/
          ├─ circlePacking.js
          ├─ dendrogram.js
          ├─ treemap.js
          └─ sunburst.js
```

**Easy to maintain and extend!**

---

## 🔒 Security (Phase 1)

### Recently Completed ✅

✅ **XSS Prevention** - DOMPurify sanitization
✅ **SRI Hashes** - SHA-384 on all CDN scripts
✅ **Content Security Policy** - Strict resource loading
✅ **No Inline Handlers** - All event listeners proper

**Result:** Risk level reduced from MODERATE to LOW

---

## 📊 Current Statistics

### Data Metrics
- **~1,500+ climate solutions** catalogued
- **20+ categories** in taxonomy
- **50+ organizations** contributing
- **Database size:** ~850 KB JSON

### Performance
- **Load time:** < 2 seconds
- **Search response:** Real-time
- **Browser support:** All modern browsers

---

## 🤝 How You Can Help (1/2)

### 1. **Contribute Solutions**
- Submit via Google Form
- Share your research, innovations, articles

### 2. **Data Quality**
- Review and validate entries
- Suggest better categorizations
- Report broken links

---

## 🤝 How You Can Help (2/2)

### 3. **Taxonomy Development**
- Propose new categories
- Refine existing structure

### 4. **Technical Contributions**
- Frontend improvements (GitHub)
- Search enhancements
- New visualization types

### 5. **Spread the Word**
- Share with climate professionals
- Provide feedback

---

## 🚀 Future Roadmap

### Phase 2: Enhanced Interactivity (Q1 2026)
- Sticky tooltips with close buttons
- Advanced zoom/pan controls
- Compare solutions side-by-side

### Phase 3: Collaboration (Q2 2026)
- User accounts (optional)
- Community ratings/reviews
- Suggested related solutions (ML)

---

## 🚀 Future Phases

### Phase 4: Analytics (Q3 2026)
- Trend analysis over time
- Geographic distribution maps
- Impact metrics dashboard

### Phase 5: Integration & API (Q4 2026)
- REST API for developers
- Embed widgets for websites
- Integration with academic databases

---

## 💡 Use Cases (1/3)

### For Researchers
- **Discover** related work in your field
- **Track** innovations over time
- **Identify** collaboration opportunities
- **Export** citations for papers

### For Policymakers
- **Understand** the solution landscape
- **Find** proven technologies
- **Compare** approaches by region

---

## 💡 Use Cases (2/3)

### For Entrepreneurs
- **Spot** market gaps
- **Identify** promising technologies
- **Find** potential partners
- **Track** competitive landscape

### For Educators
- **Teach** climate solutions comprehensively
- **Show** interconnections visually
- **Assign** research exercises

---

## 💡 Use Cases (3/3)

### For Investors
- **Screen** investment opportunities
- **Due diligence** on technologies
- **Track** market trends
- **Identify** emerging innovations

---

## 📈 Success Metrics

### Engagement
- Monthly active users
- Average session duration
- Searches per session
- Exports and downloads

### Data Growth
- New submissions per month
- Approval rate
- Coverage across categories

---

## 🔗 Get Involved

### Live Platform
🌐 **https://aphilosof.github.io/climate-solutions-explorer/**

### GitHub Repository
💻 **https://github.com/aphilosof/climate-solutions-explorer**

### Contact
📧 **aphilosof@gmail.com**
📰 **climatedrift.substack.com**

---

## 🎯 Call to Action

### We Need Your Help!

**Immediate Opportunities:**
1. **Test the platform** - Find bugs, suggest improvements
2. **Submit solutions** - Share what you're working on
3. **Spread the word** - Tell your network
4. **Contribute code** - Help build features
5. **Provide feedback** - What's missing?

---

## 🎯 Our Vision

### Build the **definitive reference** for climate solutions worldwide

✅ Comprehensive
✅ Up-to-date
✅ Community-driven
✅ Freely accessible

### Let's Build This Together! 🌱

---

## Questions?

**Climate Solutions Explorer**
*Making climate action discoverable*

---

## Thank You! 🙏

**Live Demo:** https://aphilosof.github.io/climate-solutions-explorer/
**GitHub:** github.com/aphilosof/climate-solutions-explorer
**Email:** aphilosof@gmail.com

---

<!-- _class: lead -->

# Demo Time! 🚀

Let's explore the platform together...

---

## Appendix: Data Structure

### JSON Hierarchy Example
```json
{
  "name": "Climate Solutions",
  "children": [{
    "name": "Energy Solutions",
    "content": [{
      "title": "Solar Innovation",
      "url": "https://...",
      "author": "MIT",
      "type_": "Article",
      "tags": ["solar", "renewable"]
    }]
  }]
}
```

---

## Appendix: Search Features

### Operators Supported
- Boolean: `AND`, `OR`, `NOT`
- Exact: `"phrase match"`
- Exclusion: `-term`
- Fields: `author:`, `type:`, `tag:`, `date:`

### Example Query
```
"solar power" author:MIT -fossil date:2023
```

---

## Appendix: Security Details

### Phase 1 Complete
- DOMPurify v3.0.6 (XSS protection)
- SHA-384 SRI hashes (CDN security)
- Content Security Policy (strict rules)
- No inline event handlers

### Documentation
- SECURITY_AUDIT.md
- PRIVACY.md (GDPR/CCPA compliant)
- SECURITY_IMPLEMENTATION_GUIDE.md

---

## Appendix: Performance

### Load Times
- Initial page load: < 1s
- JSON data fetch: < 0.5s
- First visualization: < 1s
- **Total interactive: < 2s**

### Search Performance
- Simple query: < 50ms
- Complex boolean: < 150ms

---

## Appendix: Contributing

### Quality Guidelines
**Required:**
- Title (clear, descriptive)
- URL (working link)
- Author/Organization
- Type (Article, Report, etc.)
- Description (2-3 sentences)

**Optional:**
- Tags (3-5 keywords)
- Date
- Confidence level (0-1)

---

## Appendix: Resources

### Documentation
- README.md - Getting started
- DATA_STRUCTURE.md - Database schema
- CLAUDE.md - Developer guide

### Related Projects
- Project Drawdown
- IPCC Solutions Database
- Climate Tech VC Database

---

<!-- _class: lead -->

# Questions & Discussion

**What would you like to explore?**

