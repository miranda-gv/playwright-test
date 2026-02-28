// Artifact utility functions for process-artifacts.js
const fs = require('fs');
const os = require('os');
const path = require('path');
const { GITHUB_TOKEN } = require('./config');
const { execCommand } = require('./github-api');

/**
 * Formats a date in EST timezone for display on the dashboard.
 * @param {string|Date} date - The date to format.
 * @returns {string} - The formatted date string in EST.
 */
function formatDateInEST(date) {
  const options = {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: true,
    timeZone: 'America/New_York',
  };
  return new Date(date).toLocaleString('en-US', options) + ' EST';
}

/**
 * Extracts the run number from a workflow_run URL.
 * @param {string} url - The URL of the workflow run.
 * @returns {string} - The extracted run number or 'Unknown' if not found.
 */
function extractRunNumber(url) {
  if (!url) return 'Unknown';
  const match = url.match(/\/runs\/(\d+)/);
  return match ? match[1] : 'Unknown';
}

/**
 * Downloads an artifact using curl with retries and timeout, saving to a temporary location.
 * @param {object} artifact - The artifact object containing download information.
 * @param {string} branchName - The name of the branch associated with the artifact.
 * @param {string} timestampDir - The directory to save the downloaded artifact.
 * @returns {Promise<object>} - A promise that resolves with the artifact download details.
 */
async function downloadArtifact(artifact, branchName, timestampDir) {
  return new Promise((resolve, reject) => {
    const zipPath = path.join(timestampDir, 'artifact.zip');
    const tokenFilePath = path.join(
      os.tmpdir(),
      `token-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    );
    try {
      fs.writeFileSync(tokenFilePath, `Authorization: token ${GITHUB_TOKEN}`, { mode: 0o600 });
      console.log(`Downloading artifact ${artifact.id} for branch ${branchName}...`);
      execCommand(
        `curl -s -L -H @${tokenFilePath} -o "${zipPath}" "${artifact.archive_download_url}" --connect-timeout 30 --max-time 300 --retry 3 --retry-delay 1 --compressed`,
      );
      console.log('completed...');
      if (!fs.existsSync(zipPath) || fs.statSync(zipPath).size === 0) {
        throw new Error('Downloaded file is empty or does not exist.');
      }
      resolve({ artifact, branchName, timestampDir, zipPath });
    } catch (error) {
      console.error(`Error downloading artifact ${artifact.id} for branch ${branchName}:`, error);
      reject({ artifact, branchName, error });
    } finally {
      if (fs.existsSync(tokenFilePath)) {
        fs.unlinkSync(tokenFilePath);
      }
    }
  });
}

/**
 * Processes items in batches with limited concurrency to avoid overwhelming the API or system resources.
 * @param {Array} items - The items to process.
 * @param {Function} processor - The function to process each item.
 * @param {number} maxConcurrent - The maximum number of concurrent operations.
 * @returns {Promise<Array>} - A promise that resolves with the results of the processing.
 */
async function processConcurrently(items, processor, maxConcurrent) {
  const results = [];
  for (let i = 0; i < items.length; i += maxConcurrent) {
    const batch = items.slice(i, i + maxConcurrent);
    const batchResults = await Promise.allSettled(batch.map(processor));
    results.push(...batchResults);
  }
  return results;
}

/**
 * Filters artifacts based on name, expiration status, branch exclusion list, and creation date.
 * @param {Array} artifacts - The array of artifacts to filter.
 * @param {Object} options - The filtering options.
 * @param {string} options.ARTIFACT_NAME - The name of the artifact to filter by.
 * @param {Array<string>} options.EXCLUDE_BRANCHES - The list of branches to exclude.
 * @param {number} options.DAYS_TO_KEEP - The number of days to keep artifacts.
 * @returns {Array} - The filtered array of artifacts.
 */
function filterRelevantArtifacts(artifacts, {
  ARTIFACT_NAME,
  EXCLUDE_BRANCHES,
  DAYS_TO_KEEP
}) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - DAYS_TO_KEEP);
  return artifacts.filter(
    (artifact) =>
      artifact.name === ARTIFACT_NAME &&
      !artifact.expired &&
      (!Array.isArray(EXCLUDE_BRANCHES) || !EXCLUDE_BRANCHES.includes(artifact.workflow_run.head_branch)) &&
      new Date(artifact.created_at) >= cutoffDate,
  );
}

/**
 * Enriches artifacts with the conclusion of their associated workflow runs.
 * @param {Array} artifacts - The array of artifacts to enrich.
 * @param {Map<number, string>} runResults - A map of workflow run IDs to their conclusions.
 * @returns {Array} - The enriched array of artifacts.
 */
function enrichArtifactsWithConclusion(artifacts, runResults) {
  return artifacts.map(artifact => ({
    ...artifact,
    run_conclusion: runResults.get(artifact.workflow_run.id) || 'unknown'
  }));
}

/**
 * Groups artifacts by their associated branch.
 * @param {Array} artifacts - The array of artifacts to group.
 * @returns {Object} - An object where keys are branch names and values are arrays of artifacts.
 */
function groupArtifactsByBranch(artifacts) {
  return artifacts.reduce((acc, artifact) => {
    const branch = artifact.workflow_run.head_branch;
    if (!acc[branch]) acc[branch] = [];
    acc[branch].push(artifact);
    return acc;
  }, {});
}

module.exports = {
  formatDateInEST,
  extractRunNumber,
  downloadArtifact,
  processConcurrently,
  filterRelevantArtifacts,
  enrichArtifactsWithConclusion,
  groupArtifactsByBranch,
};
