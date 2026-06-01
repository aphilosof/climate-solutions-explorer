# TSV to JSON Automation

## Overview

This repository has automated TSV to JSON conversion using GitHub Actions. Whenever you push updated TSV files to the `db/latest/` directory, the workflow automatically:

1. Converts the TSV files to JSON using `src/tsv_to_json_from_taxonomy_and_content_sheets_V7.py`
2. Generates `db/latest/CD_Solution_map_2_content.json`
3. **Auto-increments version** in `version.txt` (semantic versioning)
4. **Logs changes** to `version_history.txt` with timestamp and file statistics
5. Commits all updated files back to the repository with detailed commit message

## How It Works

The automation is configured in `.github/workflows/convert-tsv-to-json.yml`

### Automatic Triggers

The workflow runs automatically when:
- Any `.tsv` file in `db/latest/` directory is pushed to the repository
- Specifically when `db/latest/CD_Solution_map_2_taxonomy.tsv` or `db/latest/CD_Solution_map_2_content.tsv` is updated

### Manual Trigger

You can also manually trigger the workflow:
1. Go to GitHub repository → **Actions** tab
2. Click on **"Convert TSV to JSON"** workflow
3. Click **"Run workflow"** button
4. Select the branch and click **"Run workflow"**

## Workflow Steps

1. **Checkout repository** - Gets the latest code
2. **Set up Python 3.11** - Installs Python environment
3. **Install dependencies** - No external dependencies needed (uses standard library)
4. **Run conversion** - Executes the Python script with:
   ```bash
   python src/tsv_to_json_from_taxonomy_and_content_sheets_V7.py \
     --taxonomy db/latest/CD_Solution_map_2_taxonomy.tsv \
     --content db/latest/CD_Solution_map_2_content.tsv \
     --output db/latest/CD_Solution_map_2_content.json
   ```
5. **Check for changes** - Verifies JSON was generated in `db/latest/`
6. **Update version** - Auto-increments version number and logs statistics:
   - Reads current version from `version.txt` (or starts at 1.0.0)
   - Increments patch version (e.g., 1.0.0 → 1.0.1)
   - Collects file statistics (line counts, file sizes)
   - Appends entry to `version_history.txt`
7. **Commit and push** - Commits all files with detailed message including version and statistics

## Usage Instructions

### From Google Sheets

1. **Export from Google Sheets**:
   - Open "CD Solution map 2.0 DB prototype - V5" spreadsheet
   - **Sheet 1 (Taxonomy)**: File → Download → Tab-separated values (.tsv)
   - **Sheet 2 (Content)**: File → Download → Tab-separated values (.tsv)

2. **Rename and place files**:
   - Rename taxonomy export to `CD_Solution_map_2_taxonomy.tsv`
   - Rename content export to `CD_Solution_map_2_content.tsv`
   - Place both files in the `db/latest/` directory

3. **Push to GitHub**:
   ```bash
   git add db/latest/CD_Solution_map_2_taxonomy.tsv db/latest/CD_Solution_map_2_content.tsv
   git commit -m "Update TSV files from Google Sheets"
   git push
   ```

4. **Watch the automation**:
   - Go to GitHub → **Actions** tab
   - See the workflow running
   - Once complete, the JSON file will be automatically committed to `db/latest/`

### Checking the Results

After the workflow completes:
- Check the latest commit (should have message like: "🤖 Auto-generate JSON v1.0.5")
- Commit message includes:
  - Version number
  - Taxonomy line count
  - Content line count
  - Timestamp
- Updated files:
  - `db/latest/CD_Solution_map_2_content.json` - Generated JSON
  - `db/latest/version.txt` - Current version number
  - `db/latest/version_history.txt` - Full changelog
- The updated JSON will automatically be used by the live site (if deployed)

### Version History

The workflow maintains a complete version history in `db/latest/version_history.txt`:

```
2025-12-12 10:30:45 UTC | v1.0.0 | Taxonomy: 234 lines | Content: 1567 lines | JSON: 456789 bytes
2025-12-12 14:23:12 UTC | v1.0.1 | Taxonomy: 234 lines | Content: 1589 lines | JSON: 458901 bytes
2025-12-13 09:15:30 UTC | v1.0.2 | Taxonomy: 245 lines | Content: 1612 lines | JSON: 462345 bytes
```

Each entry includes:
- **Timestamp** - When the conversion ran (UTC)
- **Version** - Semantic version number (auto-incremented)
- **Taxonomy lines** - Number of lines in taxonomy TSV
- **Content lines** - Number of lines in content TSV
- **JSON size** - Size of generated JSON in bytes

## Troubleshooting

### Workflow Fails

If the workflow fails:
1. Go to **Actions** tab → Click on failed workflow
2. Click on the failed job to see error details
3. Common issues:
   - TSV files in wrong location (should be in `db/latest/` directory)
   - TSV files have incorrect names (must be `CD_Solution_map_2_taxonomy.tsv` and `CD_Solution_map_2_content.tsv`)
   - TSV files have incorrect headers/format
   - Syntax error in conversion script

### JSON Not Generated

If workflow succeeds but JSON isn't updated:
- Check if there were actually changes to the TSV files
- Workflow only commits if JSON content changed
- Review workflow logs for "No changes to commit" message

### Manual Conversion (Fallback)

If automation doesn't work, you can still run locally:
```bash
python src/tsv_to_json_from_taxonomy_and_content_sheets_V7.py \
  --taxonomy db/latest/CD_Solution_map_2_taxonomy.tsv \
  --content db/latest/CD_Solution_map_2_content.tsv \
  --output db/latest/CD_Solution_map_2_content.json
```

## Benefits

✅ **No Local Setup** - Conversion runs on GitHub servers
✅ **Always Up-to-Date** - JSON automatically updated when TSV changes
✅ **Version Controlled** - All changes tracked in Git history
✅ **Accessible** - Anyone with repo access can trigger it
✅ **Automatic Versioning** - Semantic version numbers auto-increment
✅ **Change Tracking** - Complete history with timestamps and statistics
✅ **Detailed Commits** - Rich commit messages with data metrics
✅ **Reliable** - Consistent Python environment every time

## Notes

- The bot user is `github-actions[bot]`
- Workflow uses Python 3.11
- No external Python packages required
- Workflow runs on Ubuntu latest
- Conversion typically takes 30-60 seconds
