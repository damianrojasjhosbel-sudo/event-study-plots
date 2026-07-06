# Event Study Plots — did_multiplegt Dashboard

Two connected pages:
- **`submit.html`** — Form where researchers submit event study data + CSV → generates plot → saves to Google Drive & GitHub
- **`index.html`** — Dashboard that displays all submitted event studies with interactive plots

When someone submits via the form, their study automatically appears on the dashboard.

---

## Setup

### 1. Create GitHub repo

```bash
git init event-study-plots
cd event-study-plots
# Copy all files from this zip into the repo
```

### 2. Edit CONFIG in both HTML files

**`index.html`** — find the CONFIG section:
```javascript
const GITHUB_OWNER  = 'YOUR_USERNAME';     // ← your GitHub username
const GITHUB_REPO   = 'event-study-plots'; // ← repo name
```

**`submit.html`** — the `PROXY_URL` already points to your Apps Script. Update if needed.

### 3. Deploy the Google Apps Script

1. Go to [script.google.com](https://script.google.com) → New Project
2. Paste the contents of `apps-script.js`
3. Set the config variables:
   - `DRIVE_FOLDER_ID` — your Google Drive folder ID
   - `GITHUB_TOKEN` — a [fine-grained personal access token](https://github.com/settings/tokens?type=beta) with **Contents: Read & Write** permission on this repo only
   - `GITHUB_OWNER` — your GitHub username
   - `GITHUB_REPO` — `event-study-plots`
4. Deploy → New Deployment → Web App → Anyone can access
5. Copy the URL into `submit.html`'s `PROXY_URL`

### 4. Enable GitHub Pages

Push to GitHub, then go to **Settings → Pages → Source: `main` / `root`** → Save.

Your site will be at: `https://YOUR_USERNAME.github.io/event-study-plots/`

---

## How it works

```
Researcher fills form (submit.html)
         ↓
   Clicks "Accept & Save"
         ↓
   Apps Script receives data
         ↓
   ┌─────┴─────┐
   ↓           ↓
Google Drive  GitHub repo
(CSV+PNG+JSON) (JSON in data/)
               ↓
         GitHub Pages
         serves dashboard
               ↓
      Dashboard (index.html)
      loads all JSONs from
      GitHub API automatically
```

### Adding a new study = just submit the form
No manual file editing needed. The Apps Script pushes the JSON to `data/` and the dashboard picks it up.

---

## Creating a GitHub Token

1. Go to https://github.com/settings/tokens?type=beta
2. **New fine-grained token**
3. Name: `event-study-plots`
4. Repository access: **Only select repositories** → pick `event-study-plots`
5. Permissions → Repository → **Contents: Read and Write**
6. Generate → copy the token into `apps-script.js`

This token can ONLY write files to one repo. It's stored server-side in the Apps Script, not exposed to users.

---

## JSON Format

```json
{
  "id": "es_1234567890",
  "timestamp": "2026-04-14T07:26:43.605Z",
  "paper": {
    "title": "Paper Title",
    "authors": "Author (Year)",
    "link": "https://doi.org/...",
    "figure_number": "Figure 4",
    "takeaway": "One-line summary",
    "description": "Detailed description..."
  },
  "treatment": { "type": "binary|discrete|continuous", ... },
  "methodology": { "code_language": "stata", "code": "did_multiplegt_dyn ...", ... },
  "results": {
    "confidence_level": 95,
    "data": [
      { "period": -4, "estimate": 0.00022, "std_error": 0.00496, "lb": -0.009, "ub": 0.009 }
    ]
  }
}
```
