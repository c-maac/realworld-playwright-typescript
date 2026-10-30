# RealWorld Playwright Tests

This repository contains a TypeScript test suite built with Playwright for the public RealWorld Conduit application. Tests use the remote services at `https://api.realworld.show` and `https://demo.realworld.show`; the application itself is not hosted by this repository.

## What the suite covers

The suite validates the RealWorld Conduit API and web application through API, end-to-end, visual regression, and accessibility tests.
For scope, priorities, exclusions, environment constraints, and testing principles, see [TEST_STRATEGY.md](./TEST_STRATEGY.md).

## Tech stack

- Node.js and npm
- TypeScript with `strict` mode enabled
- Playwright Test (`@playwright/test`) as the test framework and runner
- ESLint with `typescript-eslint` and Prettier for linting and formatting
- Husky and lint-staged for the pre-commit formatting/linting hook

Dependency versions are recorded in [package.json](./package.json) and [package-lock.json](./package-lock.json).

## Installation

Install the project dependencies from the committed lockfile:

```bash
npm ci
```

Download the Playwright browser binaries:

```bash
npx playwright install
```

On Linux, use this command instead to install the browser binaries and their required system dependencies:

```bash
npx playwright install --with-deps
```

## Code quality

Check linting and formatting:

```bash
npm run lint
npm run format:check
```

Format supported files:

```bash
npm run format
```

A Husky pre-commit hook runs automatically when you create a Git commit.

## Running tests

Run all configured projects:

```bash
npx playwright test
```

Run tests with visible browser windows:

```bash
npx playwright test --headed
```

Select tests by the `@smoke` title tag or by a matching title phrase:

```bash
npx playwright test --grep "@smoke"
npx playwright test --grep "register a new user"
```

Run a specific project:

```bash
npx playwright test --project=<project-name>
```

Examples:

```bash
npx playwright test --project=chromium
npx playwright test --project=api
```

The `api` project runs API tests. All the other projects run browser based tests configured in [`playwright.config.ts`](./playwright.config.ts).

For interactive debugging:

```bash
npx playwright test --debug
npx playwright test --ui
```

### Reports and traces

After a run, view the HTML report with:

```bash
npx playwright show-report
```

Playwright stores test results and failure artifacts under `test-results/`. When a trace is generated, open it with:

```bash
npx playwright show-trace <path-to-trace.zip>
```

To control trace capture for a local run, use Playwright’s `--trace` option:

```bash
npx playwright test --trace retain-on-failure
```

## Visual regression baselines

Visual baselines are stored in Git and used by CI for visual regression comparisons.

A visual test fails on its first CI run when no baseline exists. Use the **Update visual regression baselines** GitHub Actions workflow to rerun the visual tests with `--update-snapshots`, then review and commit the generated baselines.

Do not replace a CI-generated Ubuntu baseline with a locally generated macOS or Windows baseline.

Generate or update baselines:

1. In **Actions → Playwright Tests → Run workflow**, set **Update visual regression baselines** to `true` and run the workflow.
2. Download and review the `updated-visual-baselines` artifact.
3. Copy the approved PNG files into `tests/visual/critical-ui.visual.spec.ts-snapshots/`.
4. Commit and push the updated baselines.

## Project structure

```text
.github/workflows/          GitHub Actions workflows
src/
  components/               Shared UI components, such as the header
  fixtures/                 Shared Playwright fixtures, including authenticated pages
  helpers/                  API setup, generated users, and schema contract validation
  pages/                    Page objects for application screens
tests/
  accessibility/            Accessibility assertions and ARIA snapshots
  api/                      API tests grouped by resource
  e2e/                      Browser journeys grouped by feature
  visual/                   Visual regression tests and their snapshot baselines
playwright.config.ts        Projects, base URLs, workers, retries, and reporter
TEST_STRATEGY.md            Scope, isolation, CI strategy, and coverage principles
```
