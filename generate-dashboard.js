
// generate-dashboard.js

// This script fetches the list of report folders from the GitHub Pages branch,
// downloads the latest report index.html files, and generates a dashboard linking to them.

const fs = require("fs");
const path = require("path");
const https = require("https");
const cheerio = require('cheerio');

// CONFIGURATION
const GHPAGES_URL = "https://github.com/miranda-gv/playwright-test/tree/gh-pages";
const GHPAGES_DIR = path.join(__dirname, "gh-pages");
const TEMPLATE_PATH = path.join(__dirname, ".github/scripts", "report-design.html");
const OUTPUT_PATH = path.join(GHPAGES_DIR, "index.html");

function fetchReportFolders(callback) {
  https.get(GHPAGES_URL, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      const $ = cheerio.load(data);
      // Find links to folders matching the report naming pattern
          const folders = [];
          $('a').each((_, el) => {
            const text = $(el).text();
            // Match pattern: YYYY-MM-DD_HH-MM-SS (or similar)
            if (text && /^\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}/.test(text)) {
              folders.push(text.replace(/\/$/, ''));
            }
          });
          callback(folders);
    });
  }).on('error', err => {
    console.error('Error fetching report folders:', err.message);
    callback([]);
  });
}

fetchReportFolders((folders) => {
  downloadAllReports(folders, generateDashboard);
});

if (!fs.existsSync(GHPAGES_DIR)) {
  fs.mkdirSync(GHPAGES_DIR, { recursive: true });
}

function downloadReport(folder, callback) {
  const url = `https://raw.githubusercontent.com/miranda-gv/playwright-test/gh-pages/${folder}/index.html`;
  const destDir = path.join(GHPAGES_DIR, folder);
  const destFile = path.join(destDir, "index.html");

  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  https.get(url, (res) => {
    if (res.statusCode !== 200) {
      console.error(`Failed to download ${url}: ${res.statusCode}`);
      callback();
      return;
    }
    const file = fs.createWriteStream(destFile);
    res.pipe(file);
    file.on("finish", () => {
      file.close(callback);
    });
  }).on("error", (err) => {
    console.error(`Error downloading ${url}: ${err.message}`);
    callback();
  });
}

function downloadAllReports(folders, done) {
  let i = 0;
  function next() {
    if (i < folders.length) {
      downloadReport(folders[i], next);
      i++;
    } else {
      done();
    }
  }
  next();
}

function generateDashboard() {
  const template = fs.readFileSync(TEMPLATE_PATH, "utf-8");
  const allDirs = fs
    .readdirSync(GHPAGES_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory() && d.name.match(/^20/))
    .map((d) => d.name)
    .sort((a, b) => b.localeCompare(a));

  let reportItems = "";
  const latestDir = allDirs[0];
  if (latestDir) {
    reportItems += `<li class="latest"><a href="./${latestDir}/index.html">Run: ${latestDir}</a></li>`;
  }
  for (const dir of allDirs.slice(1)) {
    reportItems += `<li><a href="./${dir}/index.html">Run: ${dir}</a></li>`;
  }

  const finalHtml = template.replace("<!-- REPORT_ITEMS -->", reportItems);
  fs.writeFileSync(OUTPUT_PATH, finalHtml, "utf-8");
  console.log(`Dashboard generated at ${OUTPUT_PATH}`);
}




