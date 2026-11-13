# Study App

Local-first Progressive Web App for private study and revision. All study data stays in the browser profile on this PC (IndexedDB via Dexie). There is no backend, account system or cloud sync.

**Hosted URL (GitHub Pages):** https://xSmirna.github.io/StudyApp/

## Requirements

- Node.js current LTS
- npm (bundled with Node.js)

## Setup

```bash
npm install
```

## Commands

```bash
npm run dev      # local development server
npm test         # unit/integration tests (Vitest + fake-indexeddb)
npm run build    # production build (includes service worker)
npm run preview  # preview production build
```

## Install as a PWA (Edge / Chrome on Windows)

1. Open https://xSmirna.github.io/StudyApp/ while online (first visit only).
2. In Edge/Chrome, use **Install** / **Apps** → Install Study App (or the install icon in the address bar).
3. After the first successful load, the app shell works offline.
4. Study data never leaves this browser profile. There is no account or cloud sync.

## Deployment

Pushing to `main` runs `.github/workflows/deploy.yml`:

1. `npm ci`
2. `npm test`
3. `npm run build`
4. Deploy `dist/` to GitHub Pages

In the GitHub repository: **Settings → Pages → Source = GitHub Actions**.

Vite `base` is `/StudyApp/` for the project Pages URL.

## Privacy notes

- Only static app files and update checks use the network.
- No analytics, telemetry, or remote study-data APIs.
- IndexedDB is **not** encrypted by this design.
- Request persistent storage from Settings if available (not guaranteed).

## Architecture

- `src/domain/` — types, IDs, validation, pure rules
- `src/db/` — Dexie schema, repositories, errors
- `src/features/` — feature modules
- `src/components/` — shared UI
- `src/pages/` — top-level screens
- `src/services/` — study time, backup, PWA update, storage

## Stage status

- Stage 1: app shell, Dexie schema, subject/chapter CRUD, repository layer, Vitest setup.
- Stage 2: five question types, question CRUD/archive, chapter filters/search/pagination, JSON backup Replace All + Smart Merge.
- Stage 3: Learn / Revision / Exam / Custom quizzes, stable-ID grading, keyboard shortcuts, resume/discard, Practice Incorrect.
- Stage 4: spaced repetition, productive study time, history/statistics, secret achievements.
- Stage 5: PWA/service worker, update notice, storage quota/persist, online/offline indicator, GitHub Pages Actions deploy.
