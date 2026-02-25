# Playwright Dashboard Automation

This project automates the collection, processing, and dashboarding of Playwright (or similar) test artifacts from GitHub Actions workflows.

## Quick Start

1. **Clone this repository**

2. **Set up environment variables**
   - Copy `.env.example` to `.env` (if present) or create a `.env` file in the `config/` folder.
   - Set the following variables:
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
   node .github/dashboard-scripts/process-artifacts.js
   ```

6. **View the dashboard**
   - Open `site/index.html` in your browser.

## Configuration
- Most settings (artifact name, size limits, branches, etc.) can be adjusted in `.github/dashboard-scripts/lib/config.js`.
- Only `GITHUB_TOKEN` and `GITHUB_REPOSITORY` are required in `.env` for most users.

## Code Style
- ESLint and Prettier are configured for consistent code style. Use `npm run lint` or format on save in VS Code.

## Node.js Version
- Project is pinned to Node.js 22.x via `.nvmrc` and `package.json`.

## License
This project is private and not licensed for use, copying, or distribution.
