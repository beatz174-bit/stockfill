# Contributing

Thank you for helping improve StockFill! This guide explains how to set up a local environment, follow the coding conventions, and
submit changes.

## Ground rules

- StockFill is an offline-first PWA. Avoid adding remote API calls or backend dependencies.
- Dexie is the source of truth for persisted data. Schema updates must be applied via Dexie migrations to avoid data loss.
- Use TypeScript with strict mode and prefer named exports for new modules.
- Keep components and hooks small and focused; avoid files exceeding a few hundred lines where possible.
- Follow the existing mobile-first UX patterns and preserve accessibility cues.

## Prerequisites

- Node.js 20+ and npm
- Optional: Docker for containerized builds and previews
- Optional: Playwright browsers for running `npm run test:e2e` (`npx playwright install`)

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the dev server:
   ```bash
   npm run dev
   ```
3. Open the printed URL in your browser or mobile emulator.

## Development workflow

- Create small, focused branches for each feature or fix.
- Keep PWA assets up to date when changing files in `src/pwa/`; the build step copies them into `public/`.
- Ensure offline behavior remains intact by exercising flows without network connectivity when possible.

## Testing and quality

Run these commands before submitting a pull request:

- Lint: `npm run lint`
- Unit/component tests: `npm test`
- Coverage (enforced at 80%+ for statements/branches/functions/lines): `npm run test:coverage`
- End-to-end tests (optional, requires browsers): `npm run test:e2e`

## Commit and PR guidelines

- Write clear commit messages that describe the change.
- Provide context in pull request descriptions: what changed, why, and how it was tested.
- Avoid introducing breaking schema changes without a migration plan.

## Reporting bugs

- Include reproduction steps, expected vs. actual behavior, and environment details (browser, OS, device type).
- Attach screenshots for UI regressions when possible.
