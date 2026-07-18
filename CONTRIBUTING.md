# Contributing to Keypt

Thanks for helping make a clipboard manager people can leave installed. Keypt is intentionally small; contributions should strengthen the existing loop rather than broaden the product into a workspace.

## Good contributions

- Platform correctness on macOS and Windows
- Privacy and security hardening
- Lower idle CPU, memory, wakeups, or disk writes
- Accessibility and keyboard behavior
- Clipboard format compatibility and sensitive-content exclusions
- Clear bug fixes, tests, documentation, localization readiness, and restrained visual polish

Accounts, cloud sync, AI, collaboration, rich editing, collections, a dashboard, telemetry, and speculative integrations are out of scope. Read [`PRODUCT.md`](PRODUCT.md) before proposing a feature and [`DESIGN.md`](DESIGN.md) before changing UI.

## Set up

Use Node.js `20.19+` or `22.12+` on macOS or Windows.

```bash
npm ci
npm run dev
```

`npm run dev:renderer` opens generated demo data in a browser for UI work without clipboard access. Native behavior must still be checked in Electron on the affected operating system.

## Before a pull request

Run the complete local gate:

```bash
npm run check
npm run build
npm run test:e2e
```

For native or packaging changes, also run `npm run package` on the affected platform. Do not include `release/`, `out/`, test reports, user vaults, `.env` files, signing material, or clipboard samples in a commit.

## Code expectations

- Keep TypeScript strict and avoid `any` at trust boundaries.
- Validate new IPC input in the main process and expose only the smallest preload method needed.
- Never give the renderer Node.js, `ipcRenderer`, filesystem, shell, or unrestricted network access.
- Use fixed executable paths and argument arrays for platform commands; never interpolate clipboard data into a shell string.
- Keep clipboard data encrypted at rest and out of logs, snapshots, fixtures, issue bodies, and telemetry.
- Make retention and failure behavior deterministic and testable.
- Preserve keyboard access, visible focus, reduced motion, forced colors, and both themes.
- Use existing design tokens and component vocabulary. Avoid one-off colors, radii, or motion.

Prettier owns formatting. ESLint and TypeScript own static correctness. Unit tests use Vitest; the native boundary uses Playwright's Electron driver.

## Pull requests

Keep a pull request focused and explain:

1. The user or platform problem.
2. The chosen behavior and any privacy impact.
3. What was tested, including operating system and architecture for native changes.
4. Any limitation that remains.

Add or update tests for behavior changes. Include before/after screenshots only for visible UI work, and ensure they contain generated data. Maintainers may close a technically sound change when it conflicts with Keypt's product boundaries; small scope is a core requirement, not a temporary roadmap choice.

## Issues and security

Use the structured GitHub issue templates for public bugs and feature proposals. Never paste real clipboard contents, decrypted vault data, secrets, signing output containing credentials, or personal paths into an issue.

Do not open public issues for suspected vulnerabilities. Follow [`SECURITY.md`](SECURITY.md) and use GitHub private vulnerability reporting.

By contributing, you agree that your contribution is licensed under the repository's [MIT License](LICENSE).
