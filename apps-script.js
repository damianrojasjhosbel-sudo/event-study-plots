// =============================================================
//  Google Apps Script — Event Study Plotter
//  Saves files to Google Drive AND pushes JSON to GitHub repo
//
//  SETUP:
//  1. Go to script.google.com → New Project
//  2. Paste this code
//  3. Set the CONFIG variables below
//  4. Deploy → New Deployment → Web App
//     - Execute as: Me
//     - Who has access: Anyone
//  5. Copy the deployment URL into your plotter's PROXY_URL
// =============================================================

// ============ CONFIG ============
const DRIVE_FOLDER_ID = '1tTAnGNItSXm-_KkY5ne74597KcchFGGj';  // Google Drive folder ID

const GITHUB_TOKEN   = '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';       // Fine-grained personal access token
const GITHUB_OWNER   = 'damianrojasjhosbel-sudo';     // GitHub username
const GITHUB_REPO    = 'event-study-plots';        // Repo name
const GITHUB_BRANCH  = 'main';
// ================================

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const filename = data.filename;
    const csvText  = data.csv;
    const pngB64   = data.png;
    const jsonText = data.json;

    const folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);

    // Save CSV to Drive
    if (csvText) {
      folder.createFile(filename + '.csv', csvText, 'text/csv');
    }

    // Save PNG to Drive
    if (pngB64) {
      const pngBlob = Utilities.newBlob(
        Utilities.base64Decode(pngB64), 'image/png', filename + '.png'
      );
      folder.createFile(pngBlob);
    }

    // Save JSON to Drive
    if (jsonText) {
      folder.createFile(filename + '.json', jsonText, 'application/json');
    }

    // Push JSON to GitHub
    let githubResult = { pushed: false };
    if (jsonText && GITHUB_TOKEN !== 'YOUR_GITHUB_TOKEN') {
      try {
        githubResult = pushToGitHub(filename + '.json', jsonText);
      } catch (ghErr) {
        githubResult = { pushed: false, error: ghErr.message };
      }
    }

    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        filename: filename,
        github: githubResult
      }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  // GET endpoint: returns list of all JSON files in the Drive folder
  try {
    const folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
    const files = folder.getFilesByType('application/json');
    const studies = [];

    while (files.hasNext()) {
      const file = files.next();
      if (file.getName().endsWith('.json')) {
        try {
          const content = JSON.parse(file.getBlob().getDataAsString());
          // Filter out test entries
          const title = (content.paper?.title || '').toLowerCase().replace(/[^a-z]/g, '');
          if (title && !/^[asd]+$/.test(title)) {
            studies.push(content);
          }
        } catch (parseErr) {
          // Skip malformed files
        }
      }
    }

    // Sort by timestamp descending
    studies.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    return ContentService
      .createTextOutput(JSON.stringify({ success: true, studies }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ============ GITHUB PUSH ============
function pushToGitHub(filename, content) {
  const path = 'data/' + filename;
  const apiUrl = 'https://api.github.com/repos/' + GITHUB_OWNER + '/' + GITHUB_REPO + '/contents/' + path;

  // Check if file already exists (to get sha for update)
  let sha = null;
  try {
    const checkRes = UrlFetchApp.fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer ' + GITHUB_TOKEN,
        'Accept': 'application/vnd.github+json'
      },
      muteHttpExceptions: true
    });
    if (checkRes.getResponseCode() === 200) {
      sha = JSON.parse(checkRes.getContentText()).sha;
    }
  } catch (e) {
    // File doesn't exist yet, that's fine
  }

  // Create or update file
  const payload = {
    message: 'Add event study: ' + filename,
    content: Utilities.base64Encode(content),
    branch: GITHUB_BRANCH
  };
  if (sha) payload.sha = sha;

  const res = UrlFetchApp.fetch(apiUrl, {
    method: 'PUT',
    headers: {
      'Authorization': 'Bearer ' + GITHUB_TOKEN,
      'Accept': 'application/vnd.github+json',
      'Content-Type': 'application/json'
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });

  const code = res.getResponseCode();
  if (code === 200 || code === 201) {
    return { pushed: true };
  } else {
    return { pushed: false, error: 'GitHub API returned ' + code + ': ' + res.getContentText() };
  }
}
