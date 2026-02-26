// Dashboard HTML and file generation helpers for process-artifacts.js
const fs = require('fs');
const { SIZE_LIMIT_MB, DASHBOARD_DESIGN } = require('./config');
const DESIGNS = require('./dashboard-designs');

/**
 * Gets emoji for run result
 * @param {string} result - Run result status
 * @returns {string} Emoji
 */
function getResultEmoji(result) {
  const emojiMap = {
    success: '✅',
    failure: '❌',
    timed_out: '⚠️',
    cancelled: '🚫',
    startup_failure: '❌',
  };
  // Handle common GitHub Actions conclusion states
  if (result === 'succeeded') return '✅';
  if (result === 'failed') return '❌';
  if (result === 'partiallySucceeded') return '⚠️';
  if (result === 'canceled') return '🚫';
  
  return emojiMap[result] || '❓';
}

/**
 * Gets CSS class for run status
 * @param {string} result - Run result status
 * @returns {string} CSS class name
 */
function getStatusClass(result) {
  if (result === 'success' || result === 'succeeded') return 'status-success';
  if (result === 'failure' || result === 'failed' || result === 'startup_failure') return 'status-fail';
  return 'status-other';
}

function writePlaceholderHtml({ branchName, runNumber, formattedDate, workflowUrl, runHtmlPath }) {
  const designConfig = DESIGNS[DASHBOARD_DESIGN];
  const placeholderHtml = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Artifact Too Large - ${branchName} #${runNumber}</title>
      <link rel="stylesheet" href="../../scripts/${designConfig.css}">
    </head>
    <body class="theme-${designConfig.themes[0]}">
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
  if (!runHtmlPath) {
    throw new Error('runHtmlPath is undefined for placeholder HTML');
  }
  fs.writeFileSync(runHtmlPath, placeholderHtml);
}

function writeTimestampIndexHtml({ branchName, timestamp, metadata, extractedFiles, runHtmlPath }) {
  const designConfig = DESIGNS[DASHBOARD_DESIGN];
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${branchName} - ${timestamp} - Test Results</title>
  <link rel="stylesheet" href="../../scripts/${designConfig.css}">
</head>
<body class="theme-${designConfig.themes[0]}">
  <div class="container">
    <div class="back-link">
      <a href="../../index.html">← Back to Dashboard</a>
    </div>
    <h1>${branchName}</h1>
    <h2>Run #${metadata.runNumber} (${metadata.formattedDate})</h2>
    <div style="text-align: center; margin: 1.5rem 0;">
      <a href="${metadata.workflowUrl}" target="_blank" class="workflow-link">View Workflow Run on GitHub</a>
    </div>
    <div class="file-list">
      <h3>Extracted Artifact Files</h3>
      ${
        extractedFiles.length > 0
          ? `<ul>${extractedFiles.map((file) => `<li><a href="./${file}">${file}</a></li>`).join('\n        ')}</ul>`
          : '<p style="text-align: center">No files found in this artifact.</p>'
      }
    </div>
    <div style="margin-top: 2rem; padding: 1rem; background: #f8f9fa; border-radius: 4px; font-size: 0.9rem;">
      <p><strong>Note:</strong> A direct Playwright/Monocart report (index.html) was not found in the root of this artifact. Above are the files that were extracted.</p>
    </div>
  </div>
</body>
</html>
`;
  if (!runHtmlPath) {
    throw new Error('runHtmlPath is undefined for run HTML');
  }
  fs.writeFileSync(runHtmlPath, html);
}
function generateRootDashboardHtml({ GITHUB_REPOSITORY, stats, processedData, formatDateInEST, extractRunNumber, SIZE_LIMIT_MB, SHOW_EMOJIS, SHOW_STATUS_BORDERS }) {
  const designConfig = DESIGNS[DASHBOARD_DESIGN];
  const themeList = JSON.stringify(designConfig.themes);
  let rootIndexHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Playwright Reports Dashboard</title>
  <link rel="stylesheet" href="./scripts/${designConfig.css}">
</head>
<body class="theme-${designConfig.themes[0]}">
  <div class="container">
    <h1>Playwright Reports Dashboard</h1>
    <div class="theme-switcher-wrapper">
      <div class="theme-selector" data-themes='${themeList}'>
        <label for="theme-select">Select Theme</label>
        <select id="theme-select"></select>
      </div>
    </div>
    <div class="dashboard-info">
      <p><strong>Repository:</strong> ${GITHUB_REPOSITORY}</p>
      <p><strong>Total Branches:</strong> ${stats.totalBranches}</p>
      <p><strong>Total Artifacts:</strong> <span id="total-artifacts">${stats.totalArtifacts}</span></p>
      <p class="last-updated">Last updated: ${formatDateInEST(new Date())}</p>
    </div>
    <div id="accordions">
`;

  // Sort branches (main first, then alphabetically)
  const sortedBranches = [...processedData.keys()].sort((a, b) => {
    if (a === 'main') return -1;
    if (b === 'main') return 1;
    return a.localeCompare(b);
  });

  for (const branchName of sortedBranches) {
    const artifacts = processedData
      .get(branchName)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    rootIndexHtml += `
      <div class="accordion">
        <div class="accordion-header" onclick="window.toggleAccordion(this)">
          <h3>${branchName}</h3>
          <span class="count">${artifacts.length} runs</span>
        </div>
        <div class="accordion-content">
    `;

    for (const artifact of artifacts) {
      const workflowUrl = `https://github.com/${GITHUB_REPOSITORY}/actions/runs/${artifact.workflow_run.id}`;
      const runNumber = extractRunNumber(workflowUrl);
      const formattedDate = formatDateInEST(artifact.created_at);
      const timestamp = new Date(artifact.created_at)
        .toISOString()
        .replace(/:/g, '-')
        .replace(/\..+/, '');
      // New: link to site/[branch]/[run-date]/index.html
      const reportUrl = `./${branchName}/${timestamp}/index.html`;
      const conclusion = artifact.run_conclusion || 'unknown';
      const emoji = getResultEmoji(conclusion);
      const statusClass = SHOW_STATUS_BORDERS ? getStatusClass(conclusion) : '';

      if (artifact.is_placeholder) {
        rootIndexHtml += `
          <div class="run-item placeholder ${statusClass}">
            <div class="run-details-left">
              <span class="run-id">#${runNumber} (${formattedDate})</span>
              ${SHOW_EMOJIS ? `<span class="run-result" title="${conclusion}">${emoji}</span>` : ''}
              <span class="placeholder-notice">Artifact > ${SIZE_LIMIT_MB}MB</span>
            </div>
            <div class="run-links">
              <a href="${workflowUrl}" target="_blank" class="workflow-link">View on GitHub</a>
              <a href="${reportUrl}" target="_blank" class="report-link">View Placeholder</a>
            </div>
          </div>
        `;
      } else {
        rootIndexHtml += `
          <div class="run-item ${statusClass}">
            <div class="run-details-left">
              <span class="run-id">#${runNumber} (${formattedDate})</span>
              ${SHOW_EMOJIS ? `<span class="run-result" title="${conclusion}">${emoji}</span>` : ''}
            </div>
            <div class="run-links">
              <a href="${reportUrl}" target="_blank" class="report-link">View Report</a>
              <a href="${workflowUrl}" target="_blank" class="workflow-link">View Workflow</a>
            </div>
          </div>
        `;
      }
    }

    rootIndexHtml += '</div></div>'; // Close accordion-content and accordion
  }

  rootIndexHtml += `
        </div>
      </div>
      <script src="./scripts/dashboard-logic.js"></script>
    </body>
    </html>
  `;
  return rootIndexHtml;
}

module.exports = {
  writePlaceholderHtml,
  writeTimestampIndexHtml,
  generateRootDashboardHtml,
  getResultEmoji,
  getStatusClass,
};
