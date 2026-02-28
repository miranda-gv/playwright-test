// GitHub API helpers for process-artifacts.js
const { execSync } = require('child_process');
const { GITHUB_REPOSITORY } = require('./config');

/**
 * Executes a shell command and returns the output as a string.
 * @param {string} command - The command to execute.
 * @param {object} options - Optional execSync options.
 * @returns {string} - The stdout from the command.
 * @throws Will throw an error if the command fails or if JSON parsing fails.
 */
function execCommand(command, options = {}) {
  try {
    return execSync(command, { encoding: 'utf8', maxBuffer: 50 * 1024 * 1024, ...options });
  } catch (error) {
    console.error(`Command failed: ${command}`);
    console.error(error.message);
    throw error;
  }
}

/**
 * Fetches data from the GitHub API using the gh CLI, handling pagination and parsing the JSON response.
 * @param {string} endpoint - The GitHub API endpoint to fetch data from.
 * @returns {Promise<any>} - The parsed JSON response from the API.
 * @throws Will throw an error if the command fails or if JSON parsing fails.
 */
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

/**
 *  Fetches all active branch names from the GitHub repository. Handles pagination and returns a Set of branch names.  
 * @returns {Promise<Set<string>>} - A set of active branch names.
 * @throws Will throw an error if the API request fails or if JSON parsing fails.
 */
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

/**
 * Fetches all artifacts for the GitHub repository. Handles pagination and returns an array of artifacts.
 * @returns {Promise<Array>} - An array of artifacts.
 * @throws Will throw an error if the API request fails or if JSON parsing fails.
 */
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

/** Fetches all workflow runs for the GitHub repository. Handles pagination and returns an array of workflow runs.
 * @returns {Promise<Array>} - An array of workflow runs.
 * @throws Will throw an error if the API request fails or if JSON parsing fails.
 */
async function getAllRuns() {
  console.log('Fetching all workflow runs...');
  const response = await fetchFromGitHubAPI(`repos/${GITHUB_REPOSITORY}/actions/runs`);
  let allRuns = [];
  if (Array.isArray(response)) {
    for (const pageResponse of response) {
      if (pageResponse.workflow_runs && Array.isArray(pageResponse.workflow_runs)) {
        allRuns.push(...pageResponse.workflow_runs);
      }
    }
  } else if (response.workflow_runs && Array.isArray(response.workflow_runs)) {
    allRuns = response.workflow_runs;
  }
  console.log(`Found ${allRuns.length} total workflow runs.`);
  return allRuns;
}

module.exports = {
  execCommand,
  fetchFromGitHubAPI,
  getActiveBranches,
  getAllArtifacts,
  getAllRuns,
};
