// step-summary.js
/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable no-undef */
/* The above comments disable the ESLint rules that are causing problems
  when using CommonJS syntax in a TypeScript file.
  
  This script is intended to be run in a GitHub Actions workflow
  and is responsible for generating a summary of the latest test results
  and adding it to the workflow summary.
  It reads the artifacts data from a JSON file, finds the most recent artifact
  across all branches, and generates a URL for the latest report.
*/

const fs = require('fs');

// Get command line arguments
const artifactsJsonPath = process.argv[2];
const deploymentUrl = process.argv[3];

// Read artifacts data
let artifactsData;
try {
  const fileContent = fs.readFileSync(artifactsJsonPath, 'utf8');
  artifactsData = JSON.parse(fileContent);
} catch (error) {
  console.error('Error reading artifacts data:', error);
  process.exit(1);
}

// Find the most recent artifact across all branches
let latestArtifact = null;
let latestBranch = null;
let latestTimestamp = null;

Object.entries(artifactsData).forEach(([branch, artifacts]) => {
  artifacts.forEach(artifact => {
    const artifactDate = new Date(artifact.created_at);
    if (!latestArtifact || artifactDate > new Date(latestArtifact.created_at)) {
      latestArtifact = artifact;
      latestBranch = branch;
      latestTimestamp = artifactDate.toISOString().replace(/:/g, '-').replace(/\..+/, '');
    }
  });
});

// Generate the URL for the latest report
const latestReportUrl = latestArtifact 
  ? `${deploymentUrl}${latestBranch}/${latestTimestamp}/index.html` 
  : null;

// Add to workflow summary
const summaryContent = `
The dashboard has been successfully deployed to GitHub Pages.

### :rocket: Latest Report
${latestReportUrl ? `[View Latest Run (${latestBranch})](${latestReportUrl})` : 'No reports available yet.'}

### :link: Dashboard URL
[View Dashboard](${deploymentUrl})
`;

try {
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, summaryContent);
  console.log('Successfully added content to GitHub step summary.');
} catch (error) {
   console.error('Error writing to GitHub step summary:', error);
   process.exit(1);
}
