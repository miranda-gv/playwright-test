// Artifact utility functions for process-artifacts.js
const fs = require('fs');
const os = require('os');
const path = require('path');
const { GITHUB_TOKEN } = require('./config');
const { execCommand } = require('./github-api');

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

function extractRunNumber(url) {
  if (!url) return 'Unknown';
  const match = url.match(/\/runs\/(\d+)/);
  return match ? match[1] : 'Unknown';
}

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

async function processConcurrently(items, processor, maxConcurrent) {
  const results = [];
  for (let i = 0; i < items.length; i += maxConcurrent) {
    const batch = items.slice(i, i + maxConcurrent);
    const batchResults = await Promise.allSettled(batch.map(processor));
    results.push(...batchResults);
  }
  return results;
}

module.exports = {
  formatDateInEST,
  extractRunNumber,
  downloadArtifact,
  processConcurrently,
};
