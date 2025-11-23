# AGENTS.md --- StockFill

## Purpose

StockFill is an offline-first Progressive Web App (PWA) designed to help
service station staff create pick lists used to restock various store
areas (drinks fridge, chips, chocolate, dairy, deli, etc.).\
It uses **IndexedDB (Dexie)** for local storage, has **no backend**, and
runs fully offline.

All code generated must follow the architecture, conventions, and rules
below.

------------------------------------------------------------------------

## 1. Core Architecture

StockFill is:

-   React + Vite\
-   PWA (service worker + manifest)\
-   Dexie.js for local DB (IndexedDB)\
-   React Router\
-   Context + Hooks\
-   Mobile-first UI\
-   Hosted via Docker using Nginx

There is **no remote API**.\
All data stays local to the device.

------------------------------------------------------------------------

## 2. Directory Structure

Codex must always generate files within this structure (project root is
where `package.json` lives and all npm commands run from there):

    /
      /public
        manifest.json (copied from src/pwa)
        service-worker.js (copied from src/pwa)
      /src
        /components
        /screens
        /hooks
        /db
          index.ts
          migrations.ts
          seed.ts
        /models
          Product.ts
          Area.ts
          PickList.ts
          PickItem.ts
        /context
          DBProvider.tsx
        /utils
          barcode.ts
          longPress.ts
          swipe.ts
        /pwa
          service-worker.js
          manifest.json
        App.tsx
        main.tsx
      Dockerfile
      docker-compose.yml
      nginx.conf
      vite.config.ts
      AGENTS.md
    /.vscode (workspace-level editor settings and launch/task config)

Codex must not introduce alternative or conflicting structures, and all
commands such as `npm install`, `npm run dev`, and `npm run build` must
execute from the project root (not a nested `app` folder).

------------------------------------------------------------------------

## 3. Data Model Specification

Dexie tables must be implemented exactly as follows:

### Products

    id: string (UUID)
    name: string
    category: string
    unit_type: string
    bulk_name?: string
    units_per_bulk?: number
    barcode?: string
    archived: boolean
    created_at: number
    updated_at: number

### Areas

    id: string
    name: string
    created_at: number
    updated_at: number

### PickLists

    id: string
    area_id: string
    created_at: number
    completed_at?: number
    notes?: string

### PickItems

    id: string
    pick_list_id: string
    product_id: string
    quantity: number
    is_carton: boolean
    status: "pending" | "picked" | "skipped"
    created_at: number
    updated_at: number

Pick items record a single packaging type per row: set `is_carton` to `true` when counting
cartons (using the product's `bulk_name`) or `false` for single units (using `unit_type`). If
both units and cartons are needed for the same product, store them as two PickItem records so
quantities remain distinct.

------------------------------------------------------------------------

## 4. UI & UX Rules

-   Mobile-first screens\
-   Large touch targets\
-   Clean, minimal UI\
-   Use MUI components\
-   Follow workflow conventions\
-   Avoid excessive modal dialogs\
-   Ensure barcode scanning is fast\
-   Ensure gesture operations are smooth

------------------------------------------------------------------------

## 5. Core Screens

### HomeScreen

-   Start New Pick List\
-   View Pick Lists\
-   Manage Products\
-   Manage Areas\
-   Scan Barcode (quick add)

### StartPickListScreen

-   Choose Area\
-   Start button

### ActivePickListScreen

-   List of PickItems\
-   Use the checkbox in each row to toggle between pending and picked without removing the item\
-   Row controls provide explicit +1 unit and +1 bulk actions (no long-press or swipe)\
-   Add Item button\
-   Complete List button

### AddItemScreen

-   Search\
-   Category filter\
-   Scan barcode\
-   Increment units & cartons separately (saved as distinct PickItems)\
-   Add to pick list

### ManageProductsScreen

-   List\
-   Search\
-   Filters\
-   Edit product\
-   Add product

### ManageAreasScreen

-   Add\
-   Edit\
-   Delete

### BarcodeScannerScreen

-   Live camera preview\
-   On detection → resolve product or prompt creation

------------------------------------------------------------------------

## 6. Interaction Rules

### Checkbox Toggle

Use a checkbox in each pick item row to switch between `"pending"` and `"picked"` without removing the item from the list. Picked rows must remain visible with clear status cues (e.g., checkmarks/strikethrough).

### Increment Controls

Provide explicit controls to increase `quantity_units` and `quantity_bulk` (no long-press). Avoid swipe gestures for status changes or deletion on pick item rows.

### Barcode Scanning

-   Use `@zxing/browser`\
-   Fallback to native `BarcodeDetector`

------------------------------------------------------------------------

## 7. Hooks Requirements

### Database Hooks

-   `useProducts()`\
-   `useProduct(id)`\
-   `usePickList(id)`\
-   `usePickLists()`\
-   `usePickItems(pickListId)`\
-   `useAreas()`

### Interaction Hooks

-   `useLongPress()`\
-   `useSwipe()`\
-   `useBarcodeScanner()`

### PWA Hooks

-   `useServiceWorker()`

------------------------------------------------------------------------

## 8. Component Requirements

-   ProductRow\
-   PickItemRow\
-   NumericStepper\
-   BarcodeScannerView\
-   LongPressButton

All components must use TypeScript and be reusable.

------------------------------------------------------------------------

## 9. State Management Rules

-   Use Context for DB provider\
-   No Redux\
-   Long-lived data must come from Dexie\
-   No external APIs\
-   Full offline functionality

------------------------------------------------------------------------

## 10. PWA Requirements

### manifest.json

-   name\
-   short_name\
-   icons\
-   display: standalone\
-   background_color\
-   theme_color

### service-worker.js

-   Precache static assets\
-   Cache index.html\
-   Cache route requests\
-   Provide offline fallback

Must NOT break Dexie.

------------------------------------------------------------------------

## 11. Docker Requirements

### Dockerfile

-   Node build stage\
-   Nginx serve stage\
-   Copy build to `/var/www/html`\
-   Must include service worker + PWA files

### docker-compose.yml

Expose port 8080:

    ports:
      - "8080:80"

------------------------------------------------------------------------

## 12. Code Style Rules

-   TypeScript only\
-   Strict mode\
-   Prettier formatting\
-   Named exports unless default is clearer\
-   No files larger than 300--400 lines\
-   Keep architecture consistent

------------------------------------------------------------------------

## 13. UX Workflow Requirements

-   Minimise taps\
-   Prioritise mobile experience\
-   Search must be instant\
-   Barcode scanning must be quick\
-   Product creation must be minimal friction\
-   Auto-save pick lists\
-   Smooth animations on long press
-   Pick list rows use checkboxes to toggle items between pending and picked; no swipe or long-press gestures should be required to update status, and picked rows stay visible with clear status cues

------------------------------------------------------------------------

## 14. Testing and Validation

Codex must generate:

-   Unit tests for hooks\
-   Component tests with React Testing Library\
-   e2e tests only if explicitly requested

Must support offline mode.

------------------------------------------------------------------------

## 15. Things Codex Must NOT Do

Codex must **never**:

-   Create a backend\
-   Use remote APIs\
-   Break PWA functionality\
-   Change Dexie schema without migrations\
-   Introduce Redux\
-   Modify directory structure\
-   Remove offline support\
-   Add multi-user logic

------------------------------------------------------------------------

## 16. Output Rules for Codex

-   Include file paths at top of each snippet\
-   No placeholder TODOs\
-   Code must be runnable\
-   Must follow existing patterns\
-   Must ensure offline correctness

------------------------------------------------------------------------

## 17. Project Evolution Rules

-   New features must follow these patterns\
-   DB changes must use migrations\
-   Schema must remain forward-compatible

------------------------------------------------------------------------

## 18. Summary

This document defines how Codex must generate, modify, and maintain the
StockFill codebase.\
Codex must follow this specification **exactly**, ensuring consistency
and maintainability across all future changes.
