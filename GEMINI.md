# Gemini CLI Configuration for this Project

This `GEMINI.md` file provides context and instructions to the Gemini CLI agent for the **Playwright Dashboard Automation** project.

## Project Description

This project is a comprehensive end-to-end testing and reporting solution. It combines **Playwright** for browser automation with a custom **Dashboard Automation** system that processes test artifacts from GitHub Actions to generate a multi-theme, static HTML dashboard.

### Key Features
- **E2E Testing:** Uses Playwright with TypeScript.
- **Advanced Reporting:** Integrates `monocart-reporter`, `playwright-ctrf-json-reporter`, and standard HTML/JSON reporters.
- **Dashboard Automation:** A custom Node.js system (in `dashboard/`) that fetches, extracts, and summarizes GitHub Action artifacts across different branches.
- **Dynamic Theming:** Supports multiple dashboard designs (e.g., `cyberglow`, `cyberpunk`, `editorial`, `synthwave`, `artdeco`, `forest`, `glassmorphism`).
- **Interactive Controls:** All designs include a theme selector dropdown for switching between color/font variations (e.g., Blue, Green, Purple, Gold) in real-time.

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
- `dashboard/`: Core logic for the dashboard automation system.
    - `process-artifacts.js`: Main entry point for processing artifacts.
    - `lib/config.js`: Central configuration, including the default `DASHBOARD_DESIGN`.
    - `lib/dashboard-generator.js`: Logic for generating the HTML dashboard with theme selectors.
    - `themes/`: CSS files for each design (e.g., `cyberglow.css`, `cyberpunk.css`).
- `./test-reports/`: Local output directory for test results (Monocart, Playwright HTML, CTRF).
- `./site/`: Target directory for the generated static dashboard.
- `playwright.config.ts`: Main Playwright configuration.
- `monocart.config.ts`: Custom configuration for the Monocart reporter.
- `config/.env`: Environment variables (`GITHUB_TOKEN`, `GITHUB_REPOSITORY`).

## Dashboard Configuration & Design

### Selecting a Design
- **Local:** Set the `DASHBOARD_DESIGN` environment variable (e.g., `DASHBOARD_DESIGN=cyberglow npm run process-artifacts`).
- **CI (GitHub Actions):** The `Generate Report Dashboard` workflow includes a `design` dropdown in the `workflow_dispatch` trigger for manual runs. It defaults to `cyberglow`.

### Customizing Styles (e.g., Cyberglow)
- **CSS:** Styles are kept lean and consolidated in the `dashboard/themes/` directory.
- **Fonts:** Most designs use theme-specific fonts (e.g., `Space Grotesk`, `Inter`, `DM Sans`, `Outfit`). These are loaded via Google Fonts in `dashboard-generator.js`.
- **Colors:** Theme variables (e.g., `--accent-color`, `--bg-color`) are defined in the CSS files and toggled via body classes (e.g., `.theme-purple`).

## Coding Conventions & Guidelines

- **TypeScript:** Use strong typing for all new test code and utilities.
- **Dashboard Scripts:** The scripts in `dashboard/` use CommonJS (`require`/`module.exports`) for compatibility with various Node.js execution environments in CI.
- **Styles:** Keep CSS streamlined and avoid redundant definitions. Prefer consolidated variables for theme variations.
- **Fonts:** When adding or changing fonts, update both the CSS `font-family` and the Google Fonts links in `lib/dashboard-generator.js`.
- **Linting & Formatting:** Adhere to ESLint and Prettier configurations. Run `npm run lint` and `npm run format` before finalizing changes.
- **Dates:** Always use `luxon` for date manipulation, specifically targeting the `America/New_York` timezone as per project convention.

## Custom Instructions for Gemini

- **New Tests:** Place in `./tests/playwright/`. Follow the naming convention `*.spec.ts`.
- **Dashboard Modifications:** 
    - UI changes should be made in `dashboard/lib/dashboard-designs.js` or the corresponding CSS in `dashboard/themes/`.
    - Logic changes should be in the relevant `lib/` utility.
- **Design Deployment:** When updating a design, ensure the theme selector (`#theme-select`) is correctly integrated into the HTML template in `lib/dashboard-generator.js`.
- **Reproducing Issues:** Always check `artifacts_data/artifacts.json` or local `test-reports/` if debugging reporting issues.
- **Environment:** When suggesting shell commands, ensure they are compatible with Node.js 22.
- **Configuration:** Be cautious when modifying `playwright.config.ts` as it manages multiple reporters essential for the dashboard pipeline.
