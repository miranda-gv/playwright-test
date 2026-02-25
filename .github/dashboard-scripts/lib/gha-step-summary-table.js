
// This script reads Playwright test results from test-reports/playwright-report.json, 
// calculates summary statistics (passed, failed, skipped tests, and total duration), 
// and generates an HTML table with these results. It then appends this summary to the 
// GitHub Actions workflow summary using the GITHUB_STEP_SUMMARY environment variable.

// Note: Ensure that the path to the JSON report and the structure of the report 
// match what this script expects.

const fs = require('fs');
const results = JSON.parse(fs.readFileSync('test-reports/playwright-report.json', 'utf-8'));

const stats = {
  passed: 0,
  failed: 0,
  skipped: 0,
  duration: 0,
};

function parseSuites(suites) {
  for (const suite of suites) {
    if (suite.suites) {
      parseSuites(suite.suites);
    }

    if (suite.specs) {
      for (const spec of suite.specs) {
        for (const test of spec.tests) {
          for (const run of test.results) {
            stats.duration += run.duration || 0;
            if (run.status === 'passed') stats.passed++;
            else if (run.status === 'skipped') stats.skipped++;
            else stats.failed++;
          }
        }
      }
    }
  }
}

parseSuites(results.suites);

const totalTests = stats.passed + stats.failed + stats.skipped;
const seconds = (stats.duration / 1000).toFixed(2);

// Determine the result symbol
const resultSymbol = stats.failed > 0 ? '🔴' : '🟢';

// <h2>Playwright Test Run Summary</h2>

const html = `
<br>
<h3>Execution Summary</h3>
<table>
  <tr>
    <th>Results</th>
    <th>Tests 📝</th>
    <th>Passed ✅</th>
    <th>Failed ❌</th>
    <th>Skipped ⏭️</th>
    <th>Duration ⏱️</th>
  </tr>
  <tr>
    <td style="font-size: 1.5rem;">${resultSymbol}</td>
    <td>${totalTests}</td>
    <td>${stats.passed}</td>
    <td>${stats.failed}</td>
    <td>${stats.skipped}</td>
    <td>${seconds}s</td>
  </tr>
</table>
`;

fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, html);
