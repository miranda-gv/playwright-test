// Dashboard design selection
// Set to the key from dashboard-designs.js (e.g., 'cyberglow', 'neonwave')
// Can be overridden by the DASHBOARD_DESIGN environment variable
// cyberglow, cyberpunk, editorial, synthwave, artdeco, forest, glassmorphism etc.
const DASHBOARD_DESIGN = process.env.DASHBOARD_DESIGN || 'artdeco'; 

// Configuration and environment variable checks for process-artifacts.js
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPOSITORY = process.env.GITHUB_REPOSITORY; // Format: "owner/repo"
const ARTIFACT_NAME = 'report-folder';
const SIZE_LIMIT_MB = 50;
const SIZE_LIMIT_BYTES = SIZE_LIMIT_MB * 1024 * 1024; // 50MB in bytes
const DAYS_TO_KEEP = 30; // Keep artifacts from last 30 days for all branches
const NUMBER_OF_ARTIFACTS_TO_SHOW = 2; // How many most recent artifacts per branch, regardless of age to be kept on the dashboard
const SPECIAL_BRANCHES = ['main', 'test', 'dev'];
const MAX_CONCURRENT_DOWNLOADS = 8; // Limit concurrent downloads to avoid overwhelming the API
const MAX_CONCURRENT_EXTRACTIONS = 4; // Limit concurrent extractions to avoid I/O bottleneck

const EXCLUDE_BRANCHES = []; // Add any branch names here that should be excluded from processing

// UI Configuration
const SHOW_EMOJIS = false; // Set to true to show result emojis (✅, ❌, etc.)
const SHOW_STATUS_BORDERS = true; // Set to true to show status-colored left borders
  
if (!GITHUB_TOKEN || !GITHUB_REPOSITORY) {
  console.error('Error: GITHUB_TOKEN and GITHUB_REPOSITORY environment variables are required.');
  process.exit(1);
}

module.exports = {
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
  SHOW_EMOJIS,
  SHOW_STATUS_BORDERS,
  DASHBOARD_DESIGN,
};