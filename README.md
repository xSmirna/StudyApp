# Study App

Local-first Progressive Web App for private study and revision. All study data stays in the browser profile on this PC (IndexedDB via Dexie). There is no backend, account system or cloud sync.

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
npm run build    # production build
npm run preview  # preview production build
```

## Architecture

- `src/domain/` — types, IDs, validation, pure rules
- `src/db/` — Dexie schema, repositories, errors
- `src/features/` — feature modules (populated in later stages)
- `src/components/` — shared UI
- `src/pages/` — top-level screens
- `src/services/` — cross-cutting services

## Stage status

- Stage 1: app shell, Dexie schema, subject/chapter CRUD, repository layer, Vitest setup.
- Stage 2: five question types, question CRUD/archive, chapter filters/search/pagination, JSON backup Replace All + Smart Merge.
- Stage 3: Learn / Revision / Exam / Custom quizzes, stable-ID grading, keyboard shortcuts, resume/discard, Practice Incorrect.
- Stage 4: spaced repetition (already wired into quizzes), productive study time, history/statistics, secret achievements.
