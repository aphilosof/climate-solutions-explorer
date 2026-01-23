# Images Folder

Store all presentation images here.

## Recommended Screenshots to Take

### Visualizations (Priority 1)
- [ ] `viz-circle-packing.png` - Full circle packing view
- [ ] `viz-dendrogram.png` - Dendrogram with some branches expanded
- [ ] `viz-treemap.png` - Treemap view
- [ ] `viz-sunburst.png` - Sunburst visualization

### Features (Priority 2)
- [ ] `search-demo.png` - Search bar with example query showing highlighted results
- [ ] `feature-tooltip.png` - Hover tooltip showing solution details
- [ ] `feature-panel.png` - Side panel with content list
- [ ] `feature-filters.png` - Filter panel open

### App Screenshots (Priority 3)
- [ ] `app-hero.png` - Hero screenshot (clean, full view of a visualization)
- [ ] `app-full-screen.png` - Full-screen app view for demo slide backgrounds

### Admin (Optional - if presenting to admins)
- [ ] `admin-panel-blurred.png` - Admin panel (blur sensitive data!)
- [ ] `admin-review.png` - Review interface

### Diagrams (Create with tools)
- [ ] `data-flow-diagram.png` - 4-step flow: Submit → Review → Approve → Publish
- [ ] `architecture-diagram.png` - Google Sheets → TSV → JSON → Site
- [ ] `qr-code.png` - QR code to live site (use https://www.qr-code-generator.com/)

## How to Take Screenshots

### Browser Setup
1. Open your app: http://localhost:8000
2. Set browser window to 1920x1080
3. Use browser dev tools (F12) → Device toolbar (Cmd+Shift+M)
4. Zoom if needed for visibility

### macOS
- `Cmd + Shift + 4` - Select area
- `Cmd + Shift + 3` - Full screen

### Windows
- `Win + Shift + S` - Snipping tool

### Browser Built-in
- Firefox: `Shift + F2`, then type `screenshot --fullpage`
- Chrome: DevTools → `Cmd+Shift+P` → "Capture screenshot"

## Image Optimization

After taking screenshots, optimize them:

```bash
# Using ImageMagick (install: brew install imagemagick)
convert original.png -quality 85 -resize 1920x optimized.png

# Or use online tools:
# - https://tinypng.com/
# - https://squoosh.app/
```

## Quick Reference: Image Syntax

```markdown
<!-- Basic image -->
![](images/screenshot.png)

<!-- With size -->
![width:900px](images/screenshot.png)

<!-- Centered -->
![width:900px center](images/screenshot.png)

<!-- Background right side (50% width) -->
![bg right:50%](images/screenshot.png)

<!-- Full background -->
![bg](images/hero.png)

<!-- Side by side -->
![width:500px](images/left.png) ![width:500px](images/right.png)
```

## File Naming Convention

Use lowercase with hyphens:
- ✅ `viz-circle-packing.png`
- ❌ `Viz_Circle_Packing.png`

Keep names descriptive:
- ✅ `search-demo-highlighted.png`
- ❌ `screenshot1.png`
