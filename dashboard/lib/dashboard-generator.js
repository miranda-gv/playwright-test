// Dashboard HTML and file generation helpers for process-artifacts.js
const fs = require('fs');
const { SIZE_LIMIT_MB, DASHBOARD_DESIGN } = require('./config');
const DESIGNS = require('./dashboard-designs');

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
      <link rel="stylesheet" href="../../themes/${designConfig.css}">
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
  if (!runHtmlPath) throw new Error('runHtmlPath is undefined for placeholder HTML');
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
  <link rel="stylesheet" href="../../themes/${designConfig.css}">
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
  if (!runHtmlPath) throw new Error('runHtmlPath is undefined for run HTML');
  fs.writeFileSync(runHtmlPath, html);
}

function generateRootDashboardHtml({ GITHUB_REPOSITORY, stats, processedData, formatDateInEST, extractRunNumber, SIZE_LIMIT_MB, SHOW_STATUS_BORDERS }) {
  const designConfig = DESIGNS[DASHBOARD_DESIGN];
  const themeList = JSON.stringify(designConfig.themes);
  let containerClass = 'container';
  if (DASHBOARD_DESIGN === 'cyberpunk') containerClass += ' surface cyberpunk-shadow';
  let fontLinks = '';
  if (DASHBOARD_DESIGN === 'cyberglow') {
    fontLinks = '\n  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;700&family=Inter:wght@300;400;500;700&family=Outfit:wght@300;400;500;700&family=Space+Grotesk:wght@300;400;500;700&display=swap" rel="stylesheet">';
  } else if (DASHBOARD_DESIGN === 'cyberpunk') {
    fontLinks = '\n  <link href="https://fonts.googleapis.com/css?family=Orbitron:700,900&display=swap" rel="stylesheet">\n  <link href="https://fonts.googleapis.com/css?family=Share+Tech+Mono&display=swap" rel="stylesheet">';
  } else if (DASHBOARD_DESIGN === 'editorial') {
    fontLinks = '\n  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700;900&family=EB+Garamond:ital,wght@0,400;0,500;1,400&display=swap" rel="stylesheet">';
  } else if (DASHBOARD_DESIGN === 'synthwave') {
    fontLinks = '\n  <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&family=VT323&display=swap" rel="stylesheet">';
  } else if (DASHBOARD_DESIGN === 'artdeco') {
    fontLinks = '\n  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,600;1,300;1,600&family=Josefin+Sans:wght@300;400;600&display=swap" rel="stylesheet">';
  } else if (DASHBOARD_DESIGN === 'forest') {
    fontLinks = '\n  <link href="https://fonts.googleapis.com/css2?family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&family=Source+Code+Pro:wght@400;500&display=swap" rel="stylesheet">';
  } else if (DASHBOARD_DESIGN === 'glassmorphism') {
    fontLinks = '\n  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;700&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet">';
  }
  let rootIndexHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Playwright Reports Dashboard</title>${fontLinks}
  <link rel="stylesheet" href="./themes/${designConfig.css}">
  <script src="./dashboard/dashboard-logic.js" defer></script>
</head>
<body class="theme-${designConfig.themes[0]}">
  <div class="${containerClass}">
    <!-- header and info blocks (unchanged) -->
    ${DASHBOARD_DESIGN === 'artdeco' ? `
      <div class="header">
        <div class="deco-line"><span>Test Automation</span></div>
        <h1><strong>Playwright Reports</strong>Dashboard</h1>
        <div class="deco-ornament">◆ ◇ ◆</div>
        <div class="theme-switcher-wrapper">
          <span class="theme-selector" data-themes='${themeList}'>
            <label for="theme-select">Theme</label>
            <select id="theme-select"></select>
          </span>
        </div>
      </div>
    ` : DASHBOARD_DESIGN === 'forest' ? `
      <div class="header">
        <p class="header-tag">// Automation Suite</p>
        <h1>Playwright Reports<br><em>Dashboard</em></h1>
        <div class="header-line"></div>
        <div class="theme-switcher-wrapper">
          <span class="theme-selector" data-themes='${themeList}'>
            <label for="theme-select">Theme</label>
            <select id="theme-select"></select>
          </span>
        </div>
      </div>
    ` : DASHBOARD_DESIGN === 'glassmorphism' ? `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
        <h1 style="margin-bottom: 0;">Playwright Reports Dashboard</h1>
        <div class="theme-switcher-wrapper" style="margin-bottom: 0;">
          <span class="theme-selector" data-themes='${themeList}'>
            <label for="theme-select">Theme</label>
            <select id="theme-select"></select>
          </span>
        </div>
      </div>
    ` : DASHBOARD_DESIGN === 'cyberpunk' ? `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
        <h1 style="margin-bottom: 0;">Playwright Reports Dashboard</h1>
        <div class="theme-switcher-wrapper" style="margin-bottom: 0;">
          <span class="theme-selector" data-themes='${themeList}'>
            <label for="theme-select">Theme</label>
            <select id="theme-select"></select>
          </span>
        </div>
      </div>
    ` : DASHBOARD_DESIGN === 'editorial' ? `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
        <h1 style="margin-bottom: 0;">Playwright Reports Dashboard</h1>
        <div class="theme-switcher-wrapper" style="margin-bottom: 0;">
          <span class="theme-selector" data-themes='${themeList}'>
            <label for="theme-select">Theme</label>
            <select id="theme-select"></select>
          </span>
        </div>
      </div>
    ` : DASHBOARD_DESIGN === 'synthwave' ? `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
        <h1 style="margin-bottom: 0;">Playwright Reports Dashboard</h1>
        <div class="theme-switcher-wrapper" style="margin-bottom: 0;">
          <span class="theme-selector" data-themes='${themeList}'>
            <label for="theme-select">Theme</label>
            <select id="theme-select"></select>
          </span>
        </div>
      </div>
    ` : '<h1>Playwright Reports Dashboard</h1>'}
    ${DASHBOARD_DESIGN === 'cyberglow' ? `
      <div class="dashboard-info dashboard-info-flex">
        <div class="dashboard-info-main">
          <div class="dashboard-info-lines">
            <p><strong>Repository:</strong> <span>${GITHUB_REPOSITORY}</span></p>
            <p><strong>Total Branches:</strong> <span>${stats.totalBranches}</span></p>
            <p><strong>Total Artifacts:</strong> <span id="total-artifacts">${stats.totalArtifacts}</span></p>
            <div class="dashboard-info-row">
              <span class="last-updated">Last updated: ${formatDateInEST(new Date())}</span>
              <span class="dashboard-info-theme-inline">
                <span class="theme-selector" data-themes='${themeList}'>
                  <label for="theme-select">Theme</label>
                  <select id="theme-select"></select>
                </span>
              </span>
            </div>
          </div>
        </div>
      </div>
    ` : DASHBOARD_DESIGN === 'glassmorphism' ? `
      <div class="dashboard-info">
        <p><strong>Repository</strong>${GITHUB_REPOSITORY}</p>
        <p><strong>Total Branches</strong>${stats.totalBranches}</p>
        <p><strong>Total Artifacts</strong><span id="total-artifacts">${stats.totalArtifacts}</span></p>
        <p class="last-updated">Last updated: ${formatDateInEST(new Date())}</p>
      </div>
    ` : DASHBOARD_DESIGN === 'forest' ? `
      <div class="dashboard-info">
        <div class="info-block"><div class="key">Repository</div><div class="val">${GITHUB_REPOSITORY}</div></div>
        <div class="info-block"><div class="key">Branches</div><div class="val">${stats.totalBranches}</div></div>
        <div class="info-block"><div class="key">Artifacts</div><div class="val" id="total-artifacts">${stats.totalArtifacts}</div></div>
        <div class="last-updated">Last updated: ${formatDateInEST(new Date())}</div>
      </div>
    ` : `
      <div class="dashboard-info">
        <p><strong>Repository:</strong> ${GITHUB_REPOSITORY}</p>
        <p><strong>Total Branches:</strong> ${stats.totalBranches}</p>
        <p><strong>Total Artifacts:</strong> <span id="total-artifacts">${stats.totalArtifacts}</span></p>
        <p class="last-updated">Last updated: ${formatDateInEST(new Date())}</p>
      </div>
    `}
    <div id="accordions">
`;
  // Sort branches (main first, then alphabetically)
  const sortedBranches = [...processedData.keys()].sort((a, b) => {
    if (a === 'main') return -1;
    if (b === 'main') return 1;
    return a.localeCompare(b);
  });
  for (const branchName of sortedBranches) {
    const artifacts = processedData.get(branchName).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
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
      const timestamp = new Date(artifact.created_at).toISOString().replace(/:/g, '-').replace(/\..+/, '');
      const reportUrl = `./${branchName}/${timestamp}/index.html`;
      const conclusion = artifact.run_conclusion || 'unknown';
      const statusClass = SHOW_STATUS_BORDERS ? getStatusClass(conclusion) : '';
      if (artifact.is_placeholder) {
        rootIndexHtml += `
          <div class="run-item placeholder ${statusClass}">
            <div class="run-details-left">
              <span class="run-id">#${runNumber} (${formattedDate})</span>
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
            </div>
            <div class="run-links">
              <a href="${reportUrl}" target="_blank" class="report-link">View Report</a>
              <a href="${workflowUrl}" target="_blank" class="workflow-link">View Workflow</a>
            </div>
          </div>
        `;
      }
    }
    rootIndexHtml += '</div></div>';
  }
  rootIndexHtml += `
        </div>
      </div>
      <script src="./dashboard/dashboard-logic.js"></script>
    </body>
    </html>
  `;
  return rootIndexHtml;
}

module.exports = {
  writePlaceholderHtml,
  writeTimestampIndexHtml,
  generateRootDashboardHtml,
  getStatusClass,
};
