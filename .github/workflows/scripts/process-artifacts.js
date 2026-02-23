// Modularized process-artifacts.js
const fs = require('fs');
const path = require('path');
const {
  GITHUB_TOKEN,
  GITHUB_REPOSITORY,
  ARTIFACT_NAME,
  SIZE_LIMIT_MB,
  SIZE_LIMIT_BYTES,
  DAYS_TO_KEEP,
  SPECIAL_BRANCHES,
  MAX_CONCURRENT_DOWNLOADS,
  MAX_CONCURRENT_EXTRACTIONS,
} = require('./config');
const {
  execCommand,
  fetchFromGitHubAPI,
  getActiveBranches,
  getAllArtifacts,
} = require('./github-api');
const {
  formatDateInEST,
  extractRunNumber,
  downloadArtifact,
  processConcurrently,
} = require('./artifact-utils');
const {
  writePlaceholderHtml,
  writeTimestampIndexHtml,
} = require('./dashboard-generator');

async function main() {
  const startTime = Date.now();
  console.log('--- GitHub Actions Artifact Dashboard Generator ---');
  console.log(`Repository: ${GITHUB_REPOSITORY}`);

  // Setup directories
  const siteDir = 'site';
  const scriptsDir = path.join(siteDir, 'scripts');
  const artifactsDataDir = 'artifacts_data';

  if (fs.existsSync(siteDir)) {
    fs.rmSync(siteDir, { recursive: true, force: true });
  }
  fs.mkdirSync(scriptsDir, { recursive: true });

  if (!fs.existsSync(artifactsDataDir)) {
    fs.mkdirSync(artifactsDataDir, { recursive: true });
  }

  // Copy static files
  fs.copyFileSync('.github/workflows/scripts/styles.css', path.join(scriptsDir, 'styles.css'));
  fs.copyFileSync('.github/workflows/scripts/dashboard.js', path.join(scriptsDir, 'dashboard.js'));

  const stats = { totalBranches: 0, totalArtifacts: 0, totalFiles: 0, processingErrors: 0 };

  // --- Phase 1: Fetch and Filter Data ---
  console.log('\n--- Phase 1: Fetching and Filtering Data ---');

  const [activeBranches, allArtifacts] = await Promise.all([
    getActiveBranches(),
    getAllArtifacts(),
  ]);

  // Sanity check: if we have no active branches, something is wrong
  if (activeBranches.size === 0) {
    console.error(
      'ERROR: No active branches found! This likely indicates an API or parsing issue.',
    );
    console.log('Falling back to processing all artifact branches without filtering.');
  }

  // Filter artifacts by name, expiration, exclude master branch, and date
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - DAYS_TO_KEEP);
  console.log(
    `Date filter: keeping artifacts from ${cutoffDate.toISOString().split('T')[0]} onwards`,
  );

  const relevantArtifacts = allArtifacts.filter(
    (artifact) =>
      artifact.name === ARTIFACT_NAME &&
      !artifact.expired &&
      artifact.workflow_run.head_branch !== 'master' &&
      new Date(artifact.created_at) >= cutoffDate,
  );

  console.log(
    `Filtered to ${relevantArtifacts.length} relevant artifacts from last ${DAYS_TO_KEEP} days.`,
  );

  // Group artifacts by branch
  const artifactsByBranch = relevantArtifacts.reduce((acc, artifact) => {
    const branch = artifact.workflow_run.head_branch;
    if (!acc[branch]) acc[branch] = [];
    acc[branch].push(artifact);
    return acc;
  }, {});

  const processedData = new Map();

  // Apply filtering rules for each branch
  for (const branchName in artifactsByBranch) {
    // Skip branches that no longer exist (unless we have no active branches data)
    if (activeBranches.size > 0 && !activeBranches.has(branchName)) {
      console.log(`- Skipping branch '${branchName}' (no longer exists)`);
      continue;
    }

    let artifacts = artifactsByBranch[branchName].sort((a, b) => b.id - a.id); // Newest first

    console.log(
      `- Branch '${branchName}': Found ${artifacts.length} builds from last ${DAYS_TO_KEEP} days`,
    );

    // Apply size filtering for non-special branches
    const processedArtifacts = artifacts.map((artifact) => {
      if (!SPECIAL_BRANCHES.includes(branchName) && artifact.size_in_bytes > SIZE_LIMIT_BYTES) {
        console.log(
          `  - Artifact ${artifact.id} (${Math.round(artifact.size_in_bytes / 1024 / 1024)}MB) marked as placeholder`,
        );
        return { ...artifact, is_placeholder: true };
      }
      return artifact;
    });

    processedData.set(branchName, processedArtifacts);
  }

  stats.totalBranches = processedData.size;

  // --- Phase 2: Prepare Downloads and Handle Placeholders ---
  console.log('\n--- Phase 2: Preparing Downloads and Placeholders ---');

  const downloadQueue = [];
  const artifactMetadata = new Map();

  for (const [branchName, artifacts] of processedData.entries()) {
    const branchDir = path.join(siteDir, branchName);
    if (!fs.existsSync(branchDir)) {
      fs.mkdirSync(branchDir);
    }

    for (const artifact of artifacts) {
      const timestamp = new Date(artifact.created_at)
        .toISOString()
        .replace(/:/g, '-')
        .replace(/\..+/, '');
      const timestampDir = path.join(branchDir, timestamp);

      if (!fs.existsSync(timestampDir)) {
        fs.mkdirSync(timestampDir);
      }

      const workflowUrl = `https://github.com/${GITHUB_REPOSITORY}/actions/runs/${artifact.workflow_run.id}`;
      const runNumber = extractRunNumber(workflowUrl);
      const formattedDate = formatDateInEST(artifact.created_at);

      if (artifact.is_placeholder) {
        console.log(
          `  - Creating placeholder for large artifact ${artifact.id} in branch ${branchName}`,
        );
        writePlaceholderHtml({ branchName, runNumber, formattedDate, workflowUrl, timestampDir });
      } else {
        const key = `${branchName}-${timestamp}-${artifact.id}`;
        artifactMetadata.set(key, {
          artifact,
          branchName,
          timestampDir,
          reportUrl: `./${branchName}/${timestamp}/index.html`,
          runNumber,
          formattedDate,
          workflowUrl,
        });
        downloadQueue.push(downloadArtifact(artifact, branchName, timestampDir));
      }
    }
  }

  stats.totalArtifacts = downloadQueue.length;
  console.log(`Prepared ${downloadQueue.length} artifacts for download.`);

  // --- Phase 3: Download and Process Artifacts ---
  console.log(`\n--- Phase 3: Downloading and Processing ${downloadQueue.length} artifacts ---`);
  const downloadStartTime = Date.now();

  // Process downloads in controlled batches for better performance
  const downloadResults = await processConcurrently(
    downloadQueue,
    (downloadPromise) => downloadPromise,
    MAX_CONCURRENT_DOWNLOADS,
  );

  const successfulDownloads = [];

  downloadResults.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      successfulDownloads.push(result.value);
      console.log(`✓ Download ${index + 1}/${downloadResults.length} completed`);
    } else {
      const { artifact, branchName, error } = result.reason;
      console.error(
        `✗ Download failed for artifact ${artifact.id} (branch: ${branchName}): ${error.message}`,
      );
      stats.processingErrors++;
    }
  });

  const downloadDuration = ((Date.now() - downloadStartTime) / 1000).toFixed(1);
  console.log(
    `Download phase complete: ${successfulDownloads.length}/${downloadQueue.length} successful (${downloadDuration}s)`,
  );

  // Process successful downloads in parallel
  console.log(
    `\n--- Phase 3b: Extracting and Processing ${successfulDownloads.length} artifacts ---`,
  );
  const extractionStartTime = Date.now();

  const extractionResults = await processConcurrently(
    successfulDownloads,
    async ({ artifact, branchName, timestampDir, zipPath }) => {
      const timestamp = new Date(artifact.created_at)
        .toISOString()
        .replace(/:/g, '-')
        .replace(/\..+/, '');

      console.log(`Extracting artifact ${artifact.id} to ${timestampDir}...`);
      execCommand(`unzip -q -o "${zipPath}" -d "${timestampDir}"`); // -q for quiet, faster output

      const extractedFiles = fs.readdirSync(timestampDir).filter((file) => file !== 'artifact.zip');
      fs.unlinkSync(zipPath); // Remove zip file

      // Get metadata for this artifact
      const key = `${branchName}-${timestamp}-${artifact.id}`;
      const metadata = artifactMetadata.get(key);

      // Create index.html if it doesn't exist
      if (!fs.existsSync(path.join(timestampDir, 'index.html'))) {
        writeTimestampIndexHtml({ branchName, timestamp, metadata, extractedFiles, timestampDir });
      }

      return { extractedFiles, artifact };
    },
    MAX_CONCURRENT_EXTRACTIONS,
  );

  // Count successful extractions and files
  extractionResults.forEach((result) => {
    if (result.status === 'fulfilled') {
      stats.totalFiles += result.value.extractedFiles.length;
    } else {
      console.error(`Extraction failed: ${result.reason.message}`);
      stats.processingErrors++;
    }
  });

  const extractionDuration = ((Date.now() - extractionStartTime) / 1000).toFixed(1);
  console.log(
    `Extraction phase complete: ${extractionResults.length} artifacts processed (${extractionDuration}s)`,
  );

  // --- Phase 4: Generate Final Dashboard ---
  console.log('\n--- Phase 4: Generating Final Dashboard ---');

  let rootIndexHtml = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Acceptance Test Results Dashboard</title>
      <link rel="stylesheet" href="./scripts/styles.css">
      <script>
        window.totalArtifacts = ${stats.totalArtifacts};
      </script>
    </head>
    <body>
      <div class="container">
        <h1>Acceptance Test Results Dashboard</h1>
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

      if (artifact.is_placeholder) {
        rootIndexHtml += `
          <div class="run-item placeholder">
            <div class="run-info">
              <span class="run-id">#${runNumber} (${formattedDate})</span>
              <span class="placeholder-notice">Artifact > ${SIZE_LIMIT_MB}MB</span>
            </div>
            <div class="run-links">
              <a href="${workflowUrl}" target="_blank" class="workflow-link">View on GitHub</a>
            </div>
          </div>
        `;
      } else {
        const timestamp = new Date(artifact.created_at)
          .toISOString()
          .replace(/:/g, '-')
          .replace(/\..+/, '');
        const reportUrl = `./${branchName}/${timestamp}/index.html`;

        rootIndexHtml += `
          <div class="run-item">
            <div class="run-info">
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

    rootIndexHtml += `</div></div>`; // Close accordion-content and accordion
  }

  rootIndexHtml += `
        </div>
      </div>
      <script src="./scripts/dashboard.js"></script>
    </body>
    </html>
  `;

  fs.writeFileSync(path.join(siteDir, 'index.html'), rootIndexHtml);

  // --- Phase 5: Create artifacts.json for step-summary.js ---
  console.log('\n--- Phase 5: Creating artifacts.json ---');

  const artifactsJson = {};
  for (const [branchName, artifacts] of processedData.entries()) {
    artifactsJson[branchName] = artifacts.map((artifact) => ({
      id: artifact.id,
      name: artifact.name,
      created_at: artifact.created_at,
      workflow_run: artifact.workflow_run,
      is_placeholder: artifact.is_placeholder || false,
    }));
  }

  try {
    fs.writeFileSync(
      path.join(artifactsDataDir, 'artifacts.json'),
      JSON.stringify(artifactsJson, null, 2),
    );
  } catch (error) {
    console.error(
      `Error: Failed to write artifacts.json. Check disk space and permissions.`,
      error,
    );
    process.exit(1);
  }
  console.log('Created artifacts_data/artifacts.json for step-summary.js');

  const totalDuration = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log('\n--- Processing Complete ---');
  console.log(`Total branches: ${stats.totalBranches}`);
  console.log(`Total artifacts processed: ${stats.totalArtifacts}`);
  console.log(`Total files extracted: ${stats.totalFiles}`);
  console.log(`Processing errors: ${stats.processingErrors}`);
  console.log(`Total processing time: ${totalDuration}s`);

  return stats;
}

main().catch((error) => {
  console.error('Error processing artifacts:', error);
  process.exit(1);
});
