// generate-html.js

// Purpose: Generate an index.html page for GitHub Pages with links to all test report runs.
// This script generates an index.html file for the GitHub Pages dashboard:

// Reads a template HTML file (report-design.html).
// Scans the gh-pages directory for report folders.
// Formats each folder name as a readable date.
// Builds a list of links to each report, highlighting the latest run.
// Inserts the list into the template and writes the final HTML to gh-pages/index.html.

const fs = require("fs");
const path = require("path");

// Environment variable passed from workflow
const REPORT_DIR = process.env.REPORT_DIR;

const pagesPath = "gh-pages"; // The gh-pages directory is checked out at the root
const templatePath = path.join(__dirname, "report-design.html");
const outputPath = path.join(pagesPath, "index.html");

const template = fs.readFileSync(templatePath, "utf-8");

if (!fs.existsSync(pagesPath)) {
  fs.mkdirSync(pagesPath, { recursive: true });
}

// Create a consistent date formatter function
function formatDate(date) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/New_York"
  }).format(date);
}

function formatDirectoryDate(dirName) {
  // Try to match format: YYYY-MM-DD_HH-MM-SS_runid
  let match = dirName.match(/^(\d{4})-(\d{2})-(\d{2})_(\d{2})-(\d{2})-(\d{2})(?:_\d+)?$/);
  
  if (!match) {
    // Try alternative format: YYYY-MM-DD_HH-MM-SS (without run ID)
    match = dirName.match(/^(\d{4})-(\d{2})-(\d{2})_(\d{2})-(\d{2})-(\d{2})$/);
  }
  
  if (!match) {
    // Try shorter format: YYYY-MM-DD_HH-MM
    match = dirName.match(/^(\d{4})-(\d{2})-(\d{2})_(\d{2})-(\d{2})$/);
  }
  
  if (match) {
    const [_, year, month, day, hour, minute, second = 0] = match;
    // Create date string in ISO format and explicitly set timezone
    const dateString = `${year}-${month}-${day}T${hour}:${minute}:${second || '00'}-04:00`;
    const date = new Date(dateString);
    return formatDate(date);
  }
  
  // Fallback if directory name doesn't match any expected format
  return dirName;
}

const allDirs = fs
  .readdirSync(pagesPath, { withFileTypes: true })
  .filter((d) => d.isDirectory() && d.name.match(/^20/))
  .map((d) => d.name)
  .sort((a, b) => b.localeCompare(a)); // Descending

let reportItems = "";

// Latest run
const now = formatDate(new Date());
reportItems += `<li class="latest"><a href="./${REPORT_DIR}/index.html">Run: ${REPORT_DIR} <span class="date">Generated on ${now}</span></a></li>`;

// Older runs
for (const dir of allDirs) {
  if (dir !== REPORT_DIR) {
    const formattedDate = formatDirectoryDate(dir);
    reportItems += `<li><a href="./${dir}/index.html">Run: ${dir} <span class="date">Generated on ${formattedDate}</span></a></li>`;
  }
}

// Replace placeholder
const finalHtml = template.replace("<!-- REPORT_ITEMS -->", reportItems);
fs.writeFileSync(outputPath, finalHtml, "utf-8");
