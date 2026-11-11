## Strategy at a glance

This suite uses a risk-based, layered approach: API tests validate business rules and contracts, E2E tests protect critical user journeys, and visual regression and accessibility checks target high-value UI areas. CI runs the `@smoke` suite on every push and pull request for rapid feedback, while full regression suites run on a schedule or manually. The design prioritizes test isolation, parallel execution, deterministic failures, and clear reporting.

## Scope & Test Distribution

Testing effort is concentrated in the fast API layer, with selective browser-based coverage for critical user journeys, visual regressions, and accessibility risks.

- **API:** Validates business rules, contract schemas, status codes, authorization, and multi-step resource lifecycles. Low-level utility logic, such as regex and formatting rules, is better suited to unit tests and is out of scope.
- **E2E:** Protects critical user journeys and high-impact negative paths.
- **Visual regression:** Targets stable, high-value UI areas where unintended visual changes matter most.
- **Accessibility:** Uses semantic assertions and ARIA snapshots on critical flows. Broader automated scanning and manual keyboard and screen-reader validation are required for comprehensive accessibility coverage.
- **Out of scope:** Performance, security, load, and unit testing are out of scope for this suite.

## CI & Feedback Loop

- **Smoke feedback:** Commits pushed to `main` and pull requests run the `@smoke` suite. This repository currently has only `main`, so pushed commits are the active trigger; pull-request support is retained for future collaboration.
- **Full regression:** Nightly scheduled and manual runs execute the complete suite.
- **Deployment hook:** The `app_deployed` repository dispatch is intended for a deployment pipeline to trigger tests after application deployments.
- **Diagnostics:** Manual runs can select the Playwright trace mode, such as `retain-on-failure` or `on-first-retry`.
- **Visual snapshot maintenance:** Manual runs can generate updated visual snapshots for review.
- **Reporting:** Every run produces an HTML report artifact; specific triggers also publish the latest report to GitHub Pages.

## Concurrency & Remote-Environment Stability

**Playwright Concurrency Diagnostic (`playwright-concurrency-diagnostic.yml`)**  
A manually triggered workflow that runs the suite at different worker counts
to investigate the remote RealWorld environment’s stability under concurrent
browser and API activity.

Diagnostic runs showed more failures at higher worker counts. Two-worker runs
included missing data and UI timeouts, while four-worker runs received HTTP
503 responses that caused downstream failures. This indicates that the RealWorld environment
is sensitive to concurrent load.

To reduce concurrent load on the backend, some multi-step CRUD tests
are tagged `@serial` and run with one worker after the parallel suite
finishes. The tests remain isolated; serialization only limits simultaneous
backend activity. This approach largely resolved the observed failures.

Tests marked `fixme` document limitations in the public demo
application, they are not skipped to keep CI green.

## Test Environment & Constraints

The suite tests a black-box application through its public HTTP API and browser UI.

- **External dependencies:** The suite depends on the availability and stability of the public application environment; it does not control application deployments or backend data retention.
- **Account-scoped isolation:** Application state is isolated per account. Actions—including interactions with default system entities—remain within the account’s context and are not visible to other users.
- **State lifetime:** Account state persists across re-authentication. The backend applies an undisclosed time-to-live (TTL) that reliably outlasts test execution cycles.

## Test Principles

- **Test isolation:** Mutating operations use uniquely generated accounts and data so tests can run independently and in parallel. Read-only checks may use shared accounts or unauthenticated sessions.
- **Cleanup by expiry:** Tests intentionally omit teardown hooks. Dynamically created accounts and data expire through the backend TTL described in the environment constraints.
- **Hybrid API/UI setup:** E2E tests use API requests for account creation, authentication, and prerequisite state, keeping the browser focused on the user-facing behavior under test.

## Tooling & Quality Gates

ESLint, Prettier, and a Husky pre-commit hook enforce consistent code quality and formatting before changes are committed. See `README.md` for setup details.
