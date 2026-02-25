// GitHub API helpers for process-artifacts.js
const { execSync } = require('child_process');
const { GITHUB_TOKEN, GITHUB_REPOSITORY } = require('./config');

function execCommand(command, options = {}) {
  try {
    return execSync(command, { encoding: 'utf8', maxBuffer: 50 * 1024 * 1024, ...options });
  } catch (error) {
    console.error(`Command failed: ${command}`);
    console.error(error.message);
    throw error;
  }
}

async function fetchFromGitHubAPI(endpoint) {
  console.log(`Fetching from GitHub API: ${endpoint}`);
  const command = `gh api --paginate "${endpoint}" | jq -s '.'`;
  const result = execCommand(command);
  try {
    const parsed = JSON.parse(result);
    return parsed;
  } catch (error) {
    console.error(`Failed to parse JSON response for ${endpoint}:`, error.message);
    console.error(`Raw response (first 500 chars): ${result.substring(0, 500)}`);
    throw error;
  }
}

async function getActiveBranches() {
  console.log('Fetching active branches...');
  const response = await fetchFromGitHubAPI(`repos/${GITHUB_REPOSITORY}/branches`);
  let allBranches = [];
  if (Array.isArray(response)) {
    for (const pageResponse of response) {
      if (Array.isArray(pageResponse)) {
        allBranches.push(...pageResponse);
      }
    }
  } else {
    if (Array.isArray(response)) {
      allBranches = response;
    }
  }
  const branchNames = allBranches.map((b) => b.name).filter((name) => name);
  return new Set(branchNames);
}

async function getAllArtifacts() {
  console.log('Fetching all artifacts...');
  const response = await fetchFromGitHubAPI(`repos/${GITHUB_REPOSITORY}/actions/artifacts`);
  let allArtifacts = [];
  if (Array.isArray(response)) {
    for (const pageResponse of response) {
      if (pageResponse.artifacts && Array.isArray(pageResponse.artifacts)) {
        allArtifacts.push(...pageResponse.artifacts);
      }
    }
  } else if (response.artifacts && Array.isArray(response.artifacts)) {
    allArtifacts = response.artifacts;
  }
  console.log(`Found ${allArtifacts.length} total artifacts.`);
  return allArtifacts;
}

module.exports = {
  execCommand,
  fetchFromGitHubAPI,
  getActiveBranches,
  getAllArtifacts,
};
