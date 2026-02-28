// Dashboard Configuration
// =======================
// Set the dashboard design (key from dashboard-designs.js)
// Can be overridden by the DASHBOARD_DESIGN environment variable
const DASHBOARD_DESIGN = process.env.DASHBOARD_DESIGN || 'artdeco'; // e.g., 'cyberglow', 'cyberpunk', etc.

// --- Required Environment Variables ---
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPOSITORY = process.env.GITHUB_REPOSITORY; // Format: "owner/repo"

// --- Artifact & Retention Settings ---
const ARTIFACT_NAME = 'report-folder';
const SIZE_LIMIT_MB = 50;
const SIZE_LIMIT_BYTES = SIZE_LIMIT_MB * 1024 * 1024; // 50MB in bytes
const DAYS_TO_KEEP = 30; // Keep artifacts from last 30 days
const ARTIFACTS_PER_BRANCH = 2; // Most recent artifacts per branch to keep
const SPECIAL_BRANCHES = ['main', 'test', 'dev'];
const EXCLUDE_BRANCHES = []; // Branches to exclude from processing

// --- Performance Tuning ---
const MAX_CONCURRENT_DOWNLOADS = 8; // Limit concurrent downloads
const MAX_CONCURRENT_EXTRACTIONS = 4; // Limit concurrent extractions

// --- UI Configuration ---
const SHOW_EMOJIS = false; // Show result emojis (✅, ❌, etc.)
const SHOW_STATUS_BORDERS = true; // Show status-colored left borders

// --- Validation ---
if (!GITHUB_TOKEN || !GITHUB_REPOSITORY) {
  console.error('Error: GITHUB_TOKEN and GITHUB_REPOSITORY environment variables are required.');
  process.exit(1);
}

// --- Exports ---
module.exports = {
  GITHUB_TOKEN,
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
  DASHBOARD_DESIGN,
};