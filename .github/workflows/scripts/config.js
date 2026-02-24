// Configuration and environment variable checks for process-artifacts.js

const path = require('path');
const os = require('os');

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPOSITORY = process.env.GITHUB_REPOSITORY; // Format: "owner/repo"
// Support multiple artifact names (set directly here)
const ARTIFACT_NAMES = ['report-folder'];
const SIZE_LIMIT_MB = 50;
const SIZE_LIMIT_BYTES = SIZE_LIMIT_MB * 1024 * 1024; // 50MB in bytes
const DAYS_TO_KEEP = 30; // Keep artifacts from last 30 days for all branches
const SPECIAL_BRANCHES = ['main', 'test', 'dev'];

// New config options for branch filtering
const EXCLUDE_BRANCHES = process.env.EXCLUDE_BRANCHES
  ? process.env.EXCLUDE_BRANCHES.split(',').map(b => b.trim())
  : []; // e.g. 'master,old-branch'
// Removed FILTER_BY_ARTIFACT_NAME, always filter by ARTIFACT_NAME
const FILTER_BY_BRANCH = process.env.FILTER_BY_BRANCH === 'false' ? false : true;
const MAX_CONCURRENT_DOWNLOADS = 8; // Limit concurrent downloads to avoid overwhelming the API
const MAX_CONCURRENT_EXTRACTIONS = 4; // Limit concurrent extractions to avoid I/O bottleneck

if (!GITHUB_TOKEN || !GITHUB_REPOSITORY) {
  console.error('Error: GITHUB_TOKEN and GITHUB_REPOSITORY environment variables are required.');
  process.exit(1);
}

module.exports = {
  GITHUB_TOKEN,
  GITHUB_REPOSITORY,
  ARTIFACT_NAMES,
  SIZE_LIMIT_MB,
  SIZE_LIMIT_BYTES,
  DAYS_TO_KEEP,
  SPECIAL_BRANCHES,
  MAX_CONCURRENT_DOWNLOADS,
  MAX_CONCURRENT_EXTRACTIONS,
  EXCLUDE_BRANCHES,
  FILTER_BY_BRANCH,
};
