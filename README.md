# StockFill

Offline-first Progressive Web App (PWA) that helps service station teams build and maintain pick lists for restocking store areas
without a backend. All data lives locally in IndexedDB via Dexie so the experience works even when connectivity is unreliable.

## Table of contents

- [Features](#features)
- [Tech stack](#tech-stack)
- [Getting started](#getting-started)
- [Available scripts](#available-scripts)
- [Development workflow](#development-workflow)
- [Testing and coverage](#testing-and-coverage)
- [Data model](#data-model)
- [Offline and PWA behavior](#offline-and-pwa-behavior)
- [Directory layout](#directory-layout)
- [Seed data](#seed-data)
- [Build and deploy](#build-and-deploy)

## Features

- Mobile-first UX for creating and updating pick lists quickly.
- Dexie-backed IndexedDB storage with no remote API dependencies.
- PWA manifest and service worker for offline usage and installability.
- Barcode scanning support via ZXing.
- CSV export/import utilities for product data.

## Tech stack

- React + Vite (TypeScript, strict mode)
- Dexie for data storage
- React Router for navigation
- Material UI for UI components
- Vitest and React Testing Library for tests
- Playwright for optional end-to-end testing

## Getting started

1. Install dependencies (Node 20+ recommended):
   ```bash
   npm install
   ```
2. Run the dev server:
   ```bash
   npm run dev
   ```
   Vite prints a local URL; open it in your browser or mobile emulator.

## Available scripts

- `npm run dev` – start the Vite development server.
- `npm run build` – type-check, copy PWA assets, and build the production bundle.
- `npm run preview` – preview a production build locally.
- `npm run lint` – run ESLint across the project.
- `npm test` – run the unit and component test suite.
- `npm run test:coverage` – execute tests with coverage thresholds enforced.
- `npm run test:e2e` – run Playwright tests (requires browsers installed via `npx playwright install`).

## Development workflow

- Keep the app offline-ready: avoid adding remote API calls and ensure Dexie-backed flows continue to function.
- Run `npm run lint` and `npm test` before opening a pull request to catch style and regression issues early.
- Use TypeScript and prefer named exports for new modules.
- Maintain small, focused components and hooks to preserve readability.

## Testing and coverage

The test suite uses Vitest with React Testing Library. Coverage thresholds are enforced via the Vite test configuration to keep
statements, branches, functions, and lines at or above 80%. Run tests locally with:

```
npm run test:coverage
```

The suite includes unit coverage for product management flows, pick list utilities, numeric steppers, autocompletion, and dialog
behaviors to ensure core UX remains stable.

See [TESTING.md](./TESTING.md) for additional testing utilities.

## Data model

Dexie tables are defined with the following shape:

- **Products**: `id`, `name`, `category`, `unit_type`, `bulk_name?`, `units_per_bulk?`, `barcode?`, `archived`, `created_at`,
  `updated_at`
- **Areas**: `id`, `name`, `created_at`, `updated_at`
- **PickLists**: `id`, `area_id`, `created_at`, `completed_at?`, `notes?`
- **PickItems**: `id`, `pick_list_id`, `product_id`, `quantity`, `is_carton`, `status`, `created_at`, `updated_at`

Schema changes must go through Dexie migrations to keep existing installations functional.

## Offline and PWA behavior

- `src/pwa/manifest.json` and `src/pwa/service-worker.js` are copied into `public/` during `npm run build`.
- The service worker precaches static assets and keeps the app shell available offline.
- Avoid breaking Dexie caching by keeping IndexedDB interactions on the main thread and preserving object store names.

## Directory layout

Key folders in `src/`:

- `components/` – Reusable UI components.
- `screens/` – Route-level screens wired to the router.
- `context/` – Providers such as the Dexie DB provider.
- `db/` – Dexie configuration, migrations, and seed helpers.
- `hooks/` – Custom hooks that encapsulate business logic.
- `models/` – TypeScript interfaces for domain entities.
- `pwa/` – Manifest and service worker sources.
- `utils/` – Small utilities (e.g., barcode parsing, gesture helpers).

## Seed data

Use the CSV template in [`docs/seed`](./docs/seed/README.md) to preload products. The template describes each column and the
expected data types for generating Dexie seed records.

## Build and deploy

- Production build: `npm run build` (writes output to `dist/`).
- Docker: build the multi-stage image defined in `Dockerfile` and serve via `docker-compose.yml` (exposes port `8080`).
- Ensure `public/manifest.json` and `public/service-worker.js` are present before deploying so the PWA installs correctly.
