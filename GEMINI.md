# Gemini CLI Configuration for this Project

This `GEMINI.md` file provides context and instructions to the Gemini CLI agent for the **Playwright Dashboard Automation** project.

## Project Description

This project is a comprehensive end-to-end testing and reporting solution. It combines **Playwright** for browser automation with a custom **Dashboard Automation** system that processes test artifacts from GitHub Actions to generate a multi-theme, static HTML dashboard.

### Key Features
- **E2E Testing:** Uses Playwright with TypeScript.
- **Advanced Reporting:** Integrates `monocart-reporter`, `playwright-ctrf-json-reporter`, and standard HTML/JSON reporters.
- **Dashboard Automation:** A custom Node.js system (in `.github/dashboard-scripts/`) that fetches, extracts, and summarizes GitHub Action artifacts across different branches.
- **Theming:** Supports multiple dashboard designs (e.g., Cyberpunk, Glassmorphism, Brutalist) defined in `dashboard-designs.js`.

## Tech Stack & Tools

- **Language:** TypeScript (Tests/Config) and JavaScript (Dashboard Scripts).
- **Runtime:** Node.js 22.x (enforced via `.nvmrc` and `package.json`).
- **Testing:** Playwright.
- **Reporters:** Monocart, CTRF.
- **Utilities:** Luxon (date handling), Cheerio (HTML parsing/manipulation), Dotenv.
- **CI/CD:** GitHub Actions.
- **Code Quality:** ESLint 10+, Prettier 3+.

## Important Directories & Files

- `./tests/playwright/`: Main directory for Playwright test specifications.
- `.github/dashboard-scripts/`: Core logic for the dashboard automation system.
    - `process-artifacts.js`: Main entry point for processing artifacts.
    - `lib/`: Utility scripts for GitHub API, dashboard generation, and design templates.
- `./test-reports/`: Local output directory for test results (Monocart, Playwright HTML, CTRF).
- `./site/`: Target directory for the generated static dashboard.
- `playwright.config.ts`: Main Playwright configuration.
- `monocart.config.ts`: Custom configuration for the Monocart reporter.
- `config/.env`: Environment variables (`GITHUB_TOKEN`, `GITHUB_REPOSITORY`).

## Coding Conventions & Guidelines

- **TypeScript:** Use strong typing for all new test code and utilities.
- **Dashboard Scripts:** The scripts in `.github/dashboard-scripts/` use CommonJS (`require`/`module.exports`) for compatibility with various Node.js execution environments in CI.
- **Linting & Formatting:** Adhere to ESLint and Prettier configurations. Run `npm run lint` and `npm run format` before finalizing changes.
- **Dates:** Always use `luxon` for date manipulation, specifically targeting the `America/New_York` timezone as per project convention.

## Custom Instructions for Gemini

- **New Tests:** Place in `./tests/playwright/`. Follow the naming convention `*.spec.ts`.
- **Dashboard Modifications:** 
    - UI changes should be made in `.github/dashboard-scripts/lib/dashboard-designs.js` or the corresponding CSS in `.github/dashboard-scripts/styles/`.
    - Logic changes should be in the relevant `lib/` utility.
- **Reproducing Issues:** Always check `artifacts_data/artifacts.json` or local `test-reports/` if debugging reporting issues.
- **Environment:** When suggesting shell commands, ensure they are compatible with Node.js 22.
- **Configuration:** Be cautious when modifying `playwright.config.ts` as it manages multiple reporters essential for the dashboard pipeline.
