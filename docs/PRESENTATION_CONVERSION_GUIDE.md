# How to Convert PRESENTATION.md to Slides

This guide shows you how to convert the Markdown presentation to various slide formats.

## Option 1: Google Slides (Recommended for Ease)

### Method A: Copy-Paste (Quickest)
1. Open [Google Slides](https://slides.google.com/)
2. Create new presentation
3. Open `PRESENTATION.md` in a text editor
4. Copy sections between `---` markers (these are slide breaks)
5. Paste into Google Slides (one section per slide)
6. Add images, adjust formatting

### Method B: Use Slides for GitHub
1. Install [Slides for GitHub Chrome Extension](https://chrome.google.com/webstore)
2. Upload `PRESENTATION.md` to GitHub
3. View on GitHub and convert automatically
4. Export as Google Slides or PowerPoint

---

## Option 2: Marp (Best for Developers)

**Marp** = Markdown Presentation Ecosystem (creates beautiful slides from Markdown)

### Installation
```bash
# Install Marp CLI
npm install -g @marp-team/marp-cli

# Or use VS Code extension
# Search "Marp for VS Code" in extensions
```

### Convert to HTML Slides
```bash
# Basic conversion
marp docs/PRESENTATION.md -o presentation.html

# With theme
marp docs/PRESENTATION.md -o presentation.html --theme gaia

# Watch mode (auto-refresh)
marp docs/PRESENTATION.md -w --theme gaia
```

### Convert to PDF
```bash
marp docs/PRESENTATION.md -o presentation.pdf --pdf --theme gaia
```

### Convert to PowerPoint
```bash
marp docs/PRESENTATION.md -o presentation.pptx --pptx --theme gaia
```

### Available Themes
- `default` - Clean and simple
- `gaia` - Modern with gradients
- `uncover` - Minimalist with animations

### VS Code Extension
1. Install "Marp for VS Code"
2. Open `PRESENTATION.md`
3. Click "Open Preview" (top right icon)
4. Export via command palette: `Marp: Export Slide Deck`

---

## Option 3: reveal.js (Best for Web Presentations)

**reveal.js** = HTML presentation framework (runs in browser)

### Quick Start
```bash
# Clone reveal.js
git clone https://github.com/hakimel/reveal.js.git
cd reveal.js

# Copy your presentation
cp ../PRESENTATION.md slides.md

# Install dependencies
npm install

# Start server
npm start
```

Visit `http://localhost:8000` to view slides

### Convert Markdown to reveal.js HTML
```bash
# Install Pandoc
brew install pandoc  # macOS
# or download from https://pandoc.org/

# Convert
pandoc docs/PRESENTATION.md -t revealjs -s -o presentation.html --slide-level=2
```

### Features
- Arrow key navigation
- Speaker notes
- PDF export (print to PDF in Chrome)
- Remote control via phone
- Multiplexing (present to multiple viewers)

---

## Option 4: PowerPoint (Microsoft)

### Method A: Via Pandoc
```bash
# Install Pandoc
brew install pandoc  # macOS

# Convert to PowerPoint
pandoc docs/PRESENTATION.md -o presentation.pptx
```

### Method B: Via Marp (see Option 2)
```bash
marp docs/PRESENTATION.md -o presentation.pptx --pptx
```

### Method C: Copy-Paste
1. Open PowerPoint
2. Create blank presentation
3. Copy sections from `PRESENTATION.md`
4. Paste into slides (one section per slide)
5. Apply theme and formatting

---

## Option 5: Keynote (Apple)

### Method A: Via Pandoc → PowerPoint → Keynote
```bash
# 1. Convert to PowerPoint
pandoc docs/PRESENTATION.md -o presentation.pptx

# 2. Open in Keynote (double-click .pptx on Mac)
# 3. File → Export → Keynote format
```

### Method B: Copy-Paste
1. Open Keynote
2. Create blank presentation
3. Copy sections from `PRESENTATION.md`
4. Paste into slides
5. Apply theme

---

## Styling Tips

### Add Custom CSS (Marp)
Create `presentation-style.css`:
```css
section {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  font-family: 'Helvetica Neue', Arial, sans-serif;
}

h1 {
  color: #FFD700;
  text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
}

code {
  background: rgba(255,255,255,0.1);
  padding: 2px 6px;
  border-radius: 3px;
}
```

Use with:
```bash
marp docs/PRESENTATION.md --theme presentation-style.css -o presentation.html
```

### Add Images
In `PRESENTATION.md`, add:
```markdown
![Description](path/to/image.png)
```

Or use absolute URLs:
```markdown
![Logo](https://example.com/logo.png)
```

### Add Speaker Notes (Marp)
```markdown
---

## Slide Title

Slide content here

<!-- This is a speaker note - won't appear on slide -->
```

### Embed Videos (HTML/reveal.js)
```markdown
<video src="demo.mp4" controls></video>
```

---

## Recommended Workflow

### For Quick Presentations
1. **Use Marp** with VS Code extension
2. Choose `gaia` theme
3. Export to HTML for web or PDF for print

### For Professional Presentations
1. **Convert with Marp to PowerPoint**
2. Open in PowerPoint/Keynote
3. Apply custom branding
4. Add animations and transitions

### For Interactive Web Demos
1. **Use reveal.js**
2. Host on GitHub Pages
3. Share URL for remote viewing
4. Use speaker view for presenter notes

---

## Adding Screenshots

### Capture App Screenshots
```bash
# Take screenshots of your app
# Recommended: Use browser's responsive mode (F12 → Device toolbar)

# Save as:
docs/images/viz-circle-packing.png
docs/images/viz-sunburst.png
docs/images/search-demo.png
docs/images/admin-panel.png
docs/images/data-flow.png
```

### Add to Presentation
```markdown
## Circle Packing Visualization

![Circle Packing](images/viz-circle-packing.png)

- Hierarchical bubbles
- Click to zoom
- See the big picture
```

---

## Live Demo Tips

### For In-Person Presentations
1. Open live site in browser
2. Have backup screenshots in case WiFi fails
3. Practice navigation beforehand
4. Use browser zoom (Cmd/Ctrl + +) for visibility

### For Remote Presentations
1. Use reveal.js or Marp HTML output
2. Share screen in Zoom/Teams/Google Meet
3. Have presenter notes visible on laptop
4. Share slide URL for audience to follow along

### Demo Checklist
- [ ] Browser bookmarks for key pages
- [ ] Sample searches prepared
- [ ] Example filters ready
- [ ] Admin panel test account (if showing)
- [ ] Backup plan if site is down
- [ ] Screenshots as fallback

---

## Example Conversion Commands

```bash
# All formats from one Markdown file!

# HTML (Marp, gaia theme)
marp PRESENTATION.md -o output/presentation.html --theme gaia

# PDF (Marp, for printing)
marp PRESENTATION.md -o output/presentation.pdf --pdf --theme gaia

# PowerPoint (Marp)
marp PRESENTATION.md -o output/presentation.pptx --pptx

# reveal.js HTML (Pandoc)
pandoc PRESENTATION.md -t revealjs -s -o output/reveal-presentation.html

# PowerPoint (Pandoc)
pandoc PRESENTATION.md -o output/pandoc-presentation.pptx

# PDF (Pandoc, via LaTeX beamer)
pandoc PRESENTATION.md -t beamer -o output/beamer-presentation.pdf
```

---

## Troubleshooting

### "Marp not found"
```bash
# Install globally
npm install -g @marp-team/marp-cli

# Or use npx (no install needed)
npx @marp-team/marp-cli PRESENTATION.md -o output.html
```

### "Pandoc not found"
```bash
# macOS
brew install pandoc

# Windows
choco install pandoc

# Linux
sudo apt-get install pandoc
```

### Images not showing
- Use relative paths: `images/screenshot.png`
- Or use absolute URLs: `https://example.com/image.png`
- Ensure images are in correct folder

### Formatting looks wrong
- Check that `---` separators are on their own lines
- Ensure blank lines around headings
- Validate Markdown syntax

---

## Additional Resources

### Marp
- Documentation: https://marp.app/
- Themes: https://github.com/marp-team/marp-core/tree/main/themes
- VS Code Extension: https://marketplace.visualstudio.com/items?itemName=marp-team.marp-vscode

### reveal.js
- Documentation: https://revealjs.com/
- Demo: https://revealjs.com/demo/
- Plugins: https://github.com/hakimel/reveal.js/wiki/Plugins,-Tools-and-Hardware

### Pandoc
- Documentation: https://pandoc.org/
- Try online: https://pandoc.org/try/
- Templates: https://github.com/jgm/pandoc/wiki/User-contributed-templates

### Markdown Guide
- Syntax: https://www.markdownguide.org/
- Cheat Sheet: https://www.markdownguide.org/cheat-sheet/

---

## Pro Tips

1. **Keep it simple**: Less text per slide = more impact
2. **Use visuals**: Screenshots, diagrams, charts
3. **Practice transitions**: Smooth flow between topics
4. **Time yourself**: Aim for 1-2 minutes per slide
5. **Interactive demos**: Show, don't just tell
6. **Backup plan**: Have offline version ready
7. **Audience engagement**: Ask questions, encourage interaction
8. **Follow-up**: Share slide deck and links afterward

Good luck with your presentation! 🎉
