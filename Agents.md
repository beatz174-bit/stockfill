Purpose

StockFill is an offline-first Progressive Web App (PWA) designed to help service station staff create pick lists used to restock various store areas (drinks fridge, chips, chocolate, dairy, deli, etc.).
It uses IndexedDB (Dexie) for local storage, no backend, and runs fully offline.

All code generated must follow the architecture, conventions, and rules below.

1. Core Architecture

StockFill is:

🟩 React + Vite

🟩 PWA (service worker + manifest)

🟩 Dexie.js for local DB (IndexedDB)

🟩 React Router for navigation

🟩 Context + Hooks for app logic

🟩 Mobile-first UI

🟩 Hosted via Docker using Nginx

There is no remote API.
All data stays local to the device.

2. Directory Structure

Codex must always generate files within this structure:
