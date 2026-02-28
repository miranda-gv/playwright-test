// Modularized process-artifacts.js
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: 'config/.env' });

// --- Config and Imports ---
const {
  GITHUB_REPOSITORY,
  ARTIFACT_NAME,
  SIZE_LIMIT_MB,
  SIZE_LIMIT_BYTES,
  DAYS_TO_KEEP,
  ARTIFACTS_PER_BRANCH,
  SPECIAL_BRANCHES,
  MAX_CONCURRENT_DOWNLOADS,
  MAX_CONCURRENT_EXTRACTIONS,
  EXCLUDE_BRANCHES,
  SHOW_EMOJIS,
  SHOW_STATUS_BORDERS,
} = require('./lib/config');
const { execCommand, getActiveBranches, getAllArtifacts, getAllRuns } = require('./lib/github-api');
const {
  formatDateInEST,
  extractRunNumber,
  downloadArtifact,
  processConcurrently,
  filterRelevantArtifacts,
  enrichArtifactsWithConclusion,
  groupArtifactsByBranch,
} = require('./lib/artifact-utils');
const { writePlaceholderHtml, writeTimestampIndexHtml } = require('./lib/dashboard-generator');

// --- Main Orchestration ---
async function main() {
  const startTime = Date.now();
  console.log(`Repository: ${GITHUB_REPOSITORY}`);

  // --- Directory Setup ---
  const siteDir = 'site';
  const themesDir = path.join(siteDir, 'themes');
  const dashboardDir = path.join(siteDir, 'dashboard');
  const artifactsDataDir = 'artifacts_data';

  if (fs.existsSync(siteDir)) {
    fs.rmSync(siteDir, { recursive: true, force: true });
  }
  fs.mkdirSync(themesDir, { recursive: true });
  fs.mkdirSync(dashboardDir, { recursive: true });
  if (!fs.existsSync(artifactsDataDir)) {
    fs.mkdirSync(artifactsDataDir, { recursive: true });
  }

  // --- Copy Static Files ---
  const { DASHBOARD_DESIGN } = require('./lib/config');
  const designConfig = require('./lib/dashboard-designs')[DASHBOARD_DESIGN];
  if (!designConfig || !designConfig.css) {
    throw new Error(`Design '${DASHBOARD_DESIGN}' is not defined in dashboard-designs.js`);
  }
  const cssFile = designConfig.css;
  const localThemesDir = path.join(__dirname, 'themes');
  // Copy CSS to themes
  fs.copyFileSync(path.join(localThemesDir, cssFile), path.join(themesDir, cssFile));
  // Copy dashboard-logic.js to dashboard
  fs.copyFileSync(path.join(__dirname,'lib', 'dashboard-logic.js'), path.join(dashboardDir, 'dashboard-logic.js'));

  // --- Stats Object ---
  const stats = { totalBranches: 0, totalArtifacts: 0, totalFiles: 0, processingErrors: 0 };

  // --- Phase 1: Fetch, Filter, Enrich, Group Artifacts ---
  console.log('\n--- Phase 1: Fetching and Filtering Data ---');
  const [activeBranches, allArtifacts, allRuns] = await Promise.all([
    getActiveBranches(),
    getAllArtifacts(),
    getAllRuns(),
  ]);
  const runResults = new Map();
  allRuns.forEach(run => runResults.set(run.id, run.conclusion));
  if (activeBranches.size === 0) {
    console.error('ERROR: No active branches found! This likely indicates an API or parsing issue.');
    console.log('Falling back to processing all artifact branches without filtering.');
  }
  const filteredArtifacts = filterRelevantArtifacts(allArtifacts, {
    ARTIFACT_NAME,
    EXCLUDE_BRANCHES,
    DAYS_TO_KEEP,
  });
  const enrichedArtifacts = enrichArtifactsWithConclusion(filteredArtifacts, runResults);
  const artifactsByBranch = groupArtifactsByBranch(enrichedArtifacts);
  const processedData = new Map();

  // --- Phase 1b: Per-Branch Filtering and Placeholder Marking ---
  for (const branchName in artifactsByBranch) {
    if (activeBranches.size > 0 && !activeBranches.has(branchName)) {
      console.log(`- Skipping branch '${branchName}' (no longer exists)`);
      continue;
    }
    let artifacts = artifactsByBranch[branchName].sort((a, b) => b.id - a.id); // Newest first
    if (
      typeof ARTIFACTS_PER_BRANCH === 'number' &&
      ARTIFACTS_PER_BRANCH > 0 &&
      artifacts.length > ARTIFACTS_PER_BRANCH
    ) {
      artifacts = artifacts.slice(0, ARTIFACTS_PER_BRANCH);
      console.log(`- Limiting to ${ARTIFACTS_PER_BRANCH} most recent artifacts for branch '${branchName}'`);
    }
    console.log(`- Branch '${branchName}': Found ${artifacts.length} builds from last ${DAYS_TO_KEEP} days`);
    const processedArtifacts = artifacts.map((artifact) => {
      if (!SPECIAL_BRANCHES.includes(branchName) && artifact.size_in_bytes > SIZE_LIMIT_BYTES) {
        console.log(`  - Artifact ${artifact.id} (${Math.round(artifact.size_in_bytes / 1024 / 1024)}MB) marked as placeholder`);
        return { ...artifact, is_placeholder: true };
      }
      return artifact;
    });
    processedData.set(branchName, processedArtifacts);
  }
  stats.totalBranches = processedData.size;

  // --- Phase 2: Prepare Downloads and Placeholders ---
  console.log('\n--- Phase 2: Preparing Downloads and Placeholders ---');
  const downloadQueue = [];
  const artifactMetadata = new Map();
  for (const [branchName, artifacts] of processedData.entries()) {
    for (const artifact of artifacts) {
      const runId = artifact.workflow_run.id;
      const timestamp = new Date(artifact.created_at).toISOString().replace(/:/g, '-').replace(/\..+/, '');
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
        console.log(`  - Creating placeholder for large artifact ${artifact.id} in branch ${branchName}`);
        writePlaceholderHtml({ branchName, runNumber, formattedDate, workflowUrl, timestampDir: runDir, runHtmlPath });
      } else {
        downloadQueue.push({ artifact, branchName, extractionDir, runHtmlPath, runId, timestamp });
        artifactMetadata.set(`${branchName}-${runId}-${artifact.id}`, { runNumber, formattedDate, workflowUrl, runHtmlPath, runId, timestamp });
      }
    }
  }
  stats.totalArtifacts = downloadQueue.length;
  console.log(`Prepared ${downloadQueue.length} artifacts for download.`);

  // --- Phase 3: Download and Extract Artifacts ---
  console.log(`\n--- Phase 3: Downloading and Processing ${downloadQueue.length} artifacts ---`);
  const downloadStartTime = Date.now();
  const downloadResults = await processConcurrently(
    downloadQueue,
    async (item) => {
      const { artifact, branchName, extractionDir } = item;
      try {
        const result = await downloadArtifact(artifact, branchName, extractionDir);
        return { ...item, ...result };
      } catch (error) {
        throw { ...item, error };
      }
    },
    MAX_CONCURRENT_DOWNLOADS,
  );
  const successfulDownloads = [];
  downloadResults.forEach((result) => {
    if (result.status === 'fulfilled') {
      successfulDownloads.push(result.value);
    } else {
      const { artifact, branchName, error } = result.reason;
      console.error(`✗ Download failed for artifact ${artifact.id} (branch: ${branchName}): ${error && error.message ? error.message : error}`);
      stats.processingErrors++;
    }
  });
  const downloadDuration = ((Date.now() - downloadStartTime) / 1000).toFixed(1);
  console.log(`\nDownload phase complete: ${successfulDownloads.length}/${downloadQueue.length} successful (${downloadDuration}s)`);

  // --- Phase 3b: Extract Artifacts ---
  console.log(`\n--- Phase 3b: Extracting and Processing ${successfulDownloads.length} artifacts ---`);
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
      fs.unlinkSync(zipPath);
      const entries = fs.readdirSync(extractionDir, { withFileTypes: true });
      const subdirs = entries.filter(e => e.isDirectory()).map(e => e.name);
      if (subdirs.length === 1) {
        const subDir = path.join(extractionDir, subdirs[0]);
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
      if (!fs.existsSync(runHtmlPath)) {
          const key = `${branchName}-${runId}-${artifact.id}`;
          const metadata = artifactMetadata.get(key);
          console.log('  - Warning: index.html not found after extraction, generating fallback.');
          writeTimestampIndexHtml({ branchName, timestamp, metadata, extractedFiles, timestampDir: extractionDir, runHtmlPath, runId });
      }
      console.log('completed...');
      return { extractedFiles, artifact };
    },
    MAX_CONCURRENT_EXTRACTIONS,
  );
  extractionResults.forEach((result) => {
    if (result.status === 'fulfilled') {
      stats.totalFiles += result.value.extractedFiles.length;
    } else {
      console.error(`Extraction failed: ${result.reason.message}`);
      stats.processingErrors++;
    }
  });
  const extractionDuration = ((Date.now() - extractionStartTime) / 1000).toFixed(1);
  console.log(`\nExtraction phase complete: ${extractionResults.length} artifacts processed (${extractionDuration}s)`);

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
    SHOW_EMOJIS,
    SHOW_STATUS_BORDERS,
  });
  fs.writeFileSync(path.join(siteDir, 'index.html'), rootIndexHtml);

  // --- Phase 5: Create artifacts.json ---
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
    console.error('Error: Failed to write artifacts.json. Check disk space and permissions.', error);
    process.exit(1);
  }
  console.log('Created artifacts_data/artifacts.json');

  // --- Final Stats ---
  const totalDuration = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log('\n--- Processing Complete ---');
  console.log(`Total branches: ${stats.totalBranches}`);
  console.log(`Total artifacts processed: ${stats.totalArtifacts}`);
  console.log(`Total files extracted: ${stats.totalFiles}`);
  console.log(`Processing errors: ${stats.processingErrors}`);
  console.log(`Total processing time: ${totalDuration}s\n`);
  return stats;
}

// --- Script Entrypoint ---
(async () => {
  try {
    await main();
  } catch (error) {
    console.error('Error processing artifacts:', error);
    process.exit(1);
  }
})();
