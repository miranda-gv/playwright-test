# Gemini CLI Configuration for this Project

This `GEMINI.md` file provides context and instructions to the Gemini CLI agent for this specific project.

## Project Description

This is an end-to-end testing project using Playwright and TypeScript. It is configured to run tests against the Chromium browser. The project is set up for Continuous Integration (CI) with specific configurations for retries and parallelism.

## Coding Conventions & Guidelines

*   **Language:** TypeScript
*   **Linter:** ESLint (configuration in `eslint.config.mjs`)
*   **Formatter:** Prettier (configuration in `.prettierrc`)
*   **Style:** Adhere to the existing coding style. All code should be strongly-typed and follow the established linting and formatting rules.

## Important Directories & Files

*   `./tests`: Main directory for all test files.
*   `./test-reports`: Output directory for various test reports.
*   `playwright.config.ts`: Main Playwright configuration file.
*   `package.json`: Defines project dependencies and scripts.
*   `utils/`: Contains helper functions and utilities for the tests.

## Custom Instructions for Gemini

*   When creating new tests, place them in the `./tests` directory.
*   Ensure that any new code follows the existing coding style and conventions.
*   When adding new functionality, consider if it requires a new test and suggest one if appropriate.
*   Do not modify the contents of the `./test-reports` directory.
