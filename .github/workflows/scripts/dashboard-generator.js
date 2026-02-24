// Dashboard HTML and file generation helpers for process-artifacts.js
const fs = require('fs');
const path = require('path');
const { SIZE_LIMIT_MB } = require('./config');

function writePlaceholderHtml({ branchName, runNumber, formattedDate, workflowUrl, timestampDir }) {
  const placeholderHtml = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Artifact Too Large - ${branchName} #${runNumber}</title>
      <link rel="stylesheet" href="../../scripts/blue.css">
    </head>
    <body>
      <div class="container">
        <div class="back-link">
          <a href="../../index.html">← Back to Dashboard</a>
        </div>
        <h1>Artifact Too Large</h1>
        <h2>Branch: ${branchName}</h2>
        <h3>Run: #${runNumber} (${formattedDate})</h3>
        <p>The artifact for this run was larger than ${SIZE_LIMIT_MB}MB and is not available for viewing in this dashboard.</p>
        <p>You can download it directly from the GitHub Actions workflow run page.</p>
        <div style="text-align: center; margin: 1.5rem 0;">
          <a href="${workflowUrl}" target="_blank" class="workflow-link">View Workflow Run on GitHub</a>
        </div>
      </div>
    </body>
    </html>
  `;
  fs.writeFileSync(path.join(timestampDir, 'index.html'), placeholderHtml);
}

function writeTimestampIndexHtml({ branchName, timestamp, metadata, extractedFiles, timestampDir }) {
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${branchName} - ${timestamp} - Test Results</title>
      <link rel="stylesheet" href="../../scripts/blue.css">
    </head>
    <body>
      <div class="container">
        <div class="back-link">
          <a href="../../index.html">← Back to Dashboard</a>
        </div>
        <h1>${branchName}</h1>
        <h2>#${metadata.runNumber} (${metadata.formattedDate})</h2>
        <div style="text-align: center; margin: 1.5rem 0;">
          <a href="${metadata.workflowUrl}" target="_blank" class="workflow-link">View Workflow Run</a>
        </div>
        <div class="file-list">
          <h3>Files</h3>
          ${
            extractedFiles.length > 0
              ? `<ul>${extractedFiles.map((file) => `<li><a href="./${file}">${file}</a></li>`).join('\n        ')}</ul>`
              : '<p style="text-align: center">No files found in this artifact.</p>'
          }
        </div>
      </div>
    </body>
    </html>
  `;
  fs.writeFileSync(path.join(timestampDir, 'index.html'), html);
}

module.exports = {
  writePlaceholderHtml,
  writeTimestampIndexHtml,
};
