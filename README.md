# Playwright Dashboard Automation


This project automates the collection, processing, and dashboarding of Playwright (or similar) test artifacts from GitHub Actions workflows. It is designed to be plug-and-play: you can copy the tests, workflow YAML, and dashboard scripts into any repository and it will work with minimal changes.

## Quick Start

1. **Clone this repository**


2. **Set up environment variables**
    - Create a `.env` file in the `config/` folder with at least:
       ```env
       GITHUB_TOKEN=your_github_token_here
       GITHUB_REPOSITORY=owner/repo
       ```
    - The token must have access to the repository and Actions artifacts.

3. **Install dependencies**
   ```sh
   npm install
   ```

4. **Set Node.js version**
   - Use Node.js 22.x (see `.nvmrc` and `package.json` engines field).
   - If using nvm:
     ```sh
     nvm use
     ```


5. **Run the dashboard script**
   ```sh
   npm run process-artifacts
   # or
   node /dashboard/process-artifacts.js
   ```
   - This will process all recent workflow artifacts, extract them, and generate a dashboard in the `site/` folder.
   - It also creates `artifacts_data/artifacts.json`, a summary file used by other scripts and the dashboard.


6. **View the dashboard**
   - Open `site/index.html` in your browser.
   - The dashboard is static and can be deployed to GitHub Pages or any static host.


## Configuration
- Most settings (artifact name, size limits, branches, etc.) can be adjusted in `/dashboard/lib/config.js`.
- Only `GITHUB_TOKEN` and `GITHUB_REPOSITORY` are required in `.env` for most users.


## Artifacts Summary File

After processing, a summary file is created at `artifacts_data/artifacts.json`. This file contains metadata about all processed artifacts, grouped by branch. It is used by:
- The dashboard to quickly display available runs and their status.
- The GitHub Actions workflow summary step, which runs:
   ```sh
   node /dashboard/lib/step-summary-url.js "artifacts_data/artifacts.json" "<DEPLOYMENT_URL>"
   ```
   This script finds the latest artifact and adds a link to the workflow summary.

## Plug-and-Play Usage

You can reuse this setup in any repository by copying:
- The `dashboard/` folder (including all scripts and styles)
- The workflow YAML files
- The `config/` folder and `.env` setup
- The `package.json` scripts and dependencies

Just update the `.env` file and any repo-specific config as needed.

## Code Style
- ESLint and Prettier are configured for consistent code style. Use `npm run lint` or format on save in VS Code.


## Node.js Version
- Project is pinned to Node.js 22.x via `.nvmrc` and `package.json`.


## License
This project is private and not licensed for use, copying, or distribution.
