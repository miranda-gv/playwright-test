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
  NUMBER_OF_ARTIFACTS_TO_SHOW,
  SPECIAL_BRANCHES,
  MAX_CONCURRENT_DOWNLOADS,
  MAX_CONCURRENT_EXTRACTIONS,
  EXCLUDE_BRANCHES,
} = require('./lib/config');
const { execCommand, getActiveBranches, getAllArtifacts } = require('./lib/github-api');
const { formatDateInEST, extractRunNumber, downloadArtifact, processConcurrently } = require('./lib/artifact-utils');
const { writePlaceholderHtml, writeTimestampIndexHtml } = require('./lib/dashboard-generator');

async function main() {
  const startTime = Date.now();
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
    const styleFiles = ['blue.css', 'green.css', 'gold.css', 'purple.css'];
    for (const style of styleFiles) {
      fs.copyFileSync(
        `.github/scripts2/styles/${style}`,
        path.join(scriptsDir, style)
      );
    }
    fs.copyFileSync('.github/scripts2/styles/dashboard-logic.js', path.join(scriptsDir, 'dashboard-logic.js'));

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


  // Filter artifacts by name, expiration, branch exclusion list, and date
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - DAYS_TO_KEEP);
  console.log(
    `Date filter: keeping artifacts from ${cutoffDate.toISOString().split('T')[0]} onwards`,
  );

  const relevantArtifacts = allArtifacts.filter(
    (artifact) =>
      artifact.name === ARTIFACT_NAME &&
      !artifact.expired &&
      (!Array.isArray(EXCLUDE_BRANCHES) || !EXCLUDE_BRANCHES.includes(artifact.workflow_run.head_branch)) &&
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

    // Limit to NUMBER_OF_ARTIFACTS_TO_SHOW most recent artifacts if set
    if (
      typeof NUMBER_OF_ARTIFACTS_TO_SHOW === 'number' &&
      NUMBER_OF_ARTIFACTS_TO_SHOW > 0 &&
      artifacts.length > NUMBER_OF_ARTIFACTS_TO_SHOW
    ) {
      artifacts = artifacts.slice(0, NUMBER_OF_ARTIFACTS_TO_SHOW);
      console.log(
        `  - Limiting to ${NUMBER_OF_ARTIFACTS_TO_SHOW} most recent artifacts for branch '${branchName}'`
      );
    }

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
    for (const artifact of artifacts) {
      const runId = artifact.workflow_run.id;
      const timestamp = new Date(artifact.created_at)
        .toISOString()
        .replace(/:/g, '-')
        .replace(/\..+/, '');
      // Use timestamp as the unique folder for each run
      const runDir = path.join(siteDir, branchName, timestamp);
      if (!fs.existsSync(runDir)) {
        fs.mkdirSync(runDir, { recursive: true });
      }
      const runHtmlPath = path.join(runDir, 'index.html');
      const extractionDir = runDir;

      const workflowUrl = `https://github.com/${GITHUB_REPOSITORY}/actions/runs/${runId}`;
      const runNumber = extractRunNumber(workflowUrl);
      const formattedDate = formatDateInEST(artifact.created_at);

      if (artifact.is_placeholder) {
        console.log(
          `  - Creating placeholder for large artifact ${artifact.id} in branch ${branchName}`,
        );
        writePlaceholderHtml({ branchName, runNumber, formattedDate, workflowUrl, timestampDir: runDir, runHtmlPath });
      } else {
        // Queue artifact for download and extraction
        downloadQueue.push({
          artifact,
          branchName,
          extractionDir,
          runHtmlPath,
          runId,
          timestamp,
        });
        // Store metadata for later use in extraction
        artifactMetadata.set(
          `${branchName}-${runId}-${artifact.id}`,
          {
            runNumber,
            formattedDate,
            workflowUrl,
            runHtmlPath,
            runId,
            timestamp,
          }
        );
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
    async (item) => {
      const { artifact, branchName, extractionDir } = item;
      try {
        const result = await downloadArtifact(artifact, branchName, extractionDir);
        // Merge original queue item data with download result
        return { ...item, ...result };
      } catch (error) {
        // Ensure error object has item data for logging
        throw { ...item, error };
      }
    },
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
        `✗ Download failed for artifact ${artifact.id} (branch: ${branchName}): ${error && error.message ? error.message : error}`,
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
    async (item) => {
      const { artifact, branchName, extractionDir, runHtmlPath, runId, timestamp, zipPath } = item;
      console.log(`Extracting artifact ${artifact.id} to ${extractionDir}...`);
      
      if (!fs.existsSync(extractionDir)) {
        fs.mkdirSync(extractionDir, { recursive: true });
      }

      execCommand(`unzip -q -o "${zipPath}" -d "${extractionDir}"`);
      fs.unlinkSync(zipPath); // Remove zip file

      // After unzipping, check if there's a nested directory (from the 'Package report' step)
      // The artifact contains: package/REPORT_DIR/index.html
      // So extractionDir will have a subdirectory.
      const entries = fs.readdirSync(extractionDir, { withFileTypes: true });
      const subdirs = entries.filter(e => e.isDirectory()).map(e => e.name);
      
      if (subdirs.length === 1) {
        const subDir = path.join(extractionDir, subdirs[0]);
        console.log(`  - Moving contents from ${subdirs[0]} to parent directory`);
        const files = fs.readdirSync(subDir);
        for (const file of files) {
          const oldPath = path.join(subDir, file);
          const newPath = path.join(extractionDir, file);
          if (fs.existsSync(newPath)) {
            if (fs.lstatSync(newPath).isDirectory()) {
                fs.rmSync(newPath, { recursive: true, force: true });
            } else {
                fs.unlinkSync(newPath);
            }
          }
          fs.renameSync(oldPath, newPath);
        }
        fs.rmdirSync(subDir);
      }

      const extractedFiles = fs.readdirSync(extractionDir);
      
      // Verification: Ensure index.html exists
      if (!fs.existsSync(runHtmlPath)) {
          // Get metadata for this artifact
          const key = `${branchName}-${runId}-${artifact.id}`;
          const metadata = artifactMetadata.get(key);
          console.log(`  - Warning: index.html not found after extraction, generating fallback.`);
          writeTimestampIndexHtml({ branchName, timestamp, metadata, extractedFiles, timestampDir: extractionDir, runHtmlPath, runId });
      } else {
          console.log(`  - Found index.html at ${runHtmlPath}`);
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
  const { generateRootDashboardHtml } = require('./lib/dashboard-generator');
  const rootIndexHtml = generateRootDashboardHtml({
    GITHUB_REPOSITORY,
    stats,
    processedData,
    formatDateInEST,
    extractRunNumber,
    SIZE_LIMIT_MB,
  });
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
  console.log('Created artifacts_data/artifacts.json for gha-step-summary.js');

  const totalDuration = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log('\n--- Processing Complete ---');
  console.log(`Total branches: ${stats.totalBranches}`);
  console.log(`Total artifacts processed: ${stats.totalArtifacts}`);
  console.log(`Total files extracted: ${stats.totalFiles}`);
  console.log(`Processing errors: ${stats.processingErrors}`);
  console.log(`Total processing time: ${totalDuration}s`);

  return stats;
}

// Ensure main() is called in a way that supports async/await in CommonJS
(async () => {
  try {
    await main();
  } catch (error) {
    console.error('Error processing artifacts:', error);
    process.exit(1);
  }
})();
