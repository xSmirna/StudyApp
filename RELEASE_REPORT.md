# Study App — Release Report (v0.1.0)

**Status:** Finalized — Stages 1–6 complete  
**Date:** 2026-11-14  
**App version:** `0.1.0` (from `package.json`)  
**Backup format version:** `1`  
**IndexedDB schema version:** `4`  
**Live deployment URL:** https://xSmirna.github.io/StudyApp/

This report covers Stages 1–6 as defined in `updated_cursor_development_specification.md`. Automated verification and owner manual browser verification are both complete.

---

## 1. Features completed

### Stage 1 — Foundation
- Vite + React + TypeScript app shell
- Dexie / IndexedDB local database and repository layer
- Subject and chapter CRUD
- Vitest + `fake-indexeddb` test harness
- Modular layout: `src/domain/`, `src/db/`, `src/features/`, `src/pages/`, `src/services/`, `src/components/`

### Stage 2 — Questions and backup
- Five question types (multiple choice, multi-select, true/false, short answer, ordered)
- Question create / edit / archive
- Chapter filters, search, pagination
- Versioned JSON backup export
- Import with **Replace All** (safety backup first) and **Smart Merge** (UUID + `updatedAt`)
- Unicode content support (including Greek and French)

### Stage 3 — Quiz modes
- Learn a chapter, Revision, Exam simulation, Custom session
- Stable-ID grading (not position-based)
- Keyboard shortcuts
- Resume / discard in-progress sessions
- Practice Incorrect

### Stage 4 — Review, time, history, achievements
- Spaced repetition review state
- Productive study-time tracking (idle excluded after 60s)
- History and statistics
- Five secret achievements (names/descriptions hidden until unlocked)

### Stage 5 — PWA, offline, deployment
- `vite-plugin-pwa` service worker and web manifest
- Placeholder PWA icons
- GitHub Pages `base: '/StudyApp/'`
- GitHub Actions deploy workflow (`.github/workflows/deploy.yml`)
- Non-blocking update notice (reload disabled during active quiz)
- Storage estimate / persist request on Settings
- Online / offline indicator
- **Manual verification (Complete / Verified):** PWA install, full offline use, and zero study-data egress on Windows Chrome & Edge

### Stage 6 — Release readiness
- Full automated test run and production build verified
- Backup Replace / Merge / corruption recovery covered by automated tests and owner manual checks
- Release documentation produced and finalized
- **Manual verification (Complete / Verified):** clean browser profile, export/import Replace & Merge, corrupt JSON recovery, PWA install, offline functionality, zero data egress (Windows Chrome & Edge)

**Privacy posture:** no backend, no accounts, no analytics/telemetry SDKs, no remote study-data APIs. Network use is limited to loading/updating static app assets. Owner verified zero study-data egress.

---

## 2. Test suite summary and results

### Final confirmation run (2026-11-14)

#### Unit / integration suite

```text
> studyapp@0.1.0 test
> vitest run


 RUN  v5.1.0 E:/StudyApp


 Test Files  16 passed (16)
      Tests  66 passed (66)
   Start at  01:02:04
   Duration  5.40s (environment 72%, setup 20%, tests 3%, transform 2%, import 2%, worker 1%)
```

**Result:** **16** test files, **66** tests, **all passed**. Exit code `0`.

#### Production build

```text
> studyapp@0.1.0 build
> tsc -b && vite build

vite v8.3.8 building client environment for production...
✓ 69 modules transformed.
...
✓ built in 341ms

PWA v2.0.0
mode      generateSW
precache  17 entries (425.40 KiB)
files generated
  dist/sw.js
  dist/workbox-9c191d2f.js
```

**Result:** TypeScript build + Vite production build succeeded with **zero errors**. Service worker and precache generated. Exit code `0`.

### Coverage areas
| Area | Status |
|---|---|
| Subjects / chapters repositories | Covered (automated) |
| Questions / filters / validation | Covered (automated) |
| Quiz selection, shuffle, grading, keyboard | Covered (automated) |
| Spaced repetition / study time / achievements | Covered (automated) |
| Storage byte formatting | Covered (automated) |
| Backup export (versioned filename + schema) | Covered (automated) |
| Backup Replace All + safety download | **Complete (Verified)** — automated + owner manual |
| Backup Smart Merge | **Complete (Verified)** — automated + owner manual |
| Corrupt / invalid import recovery (no DB mutation) | **Complete (Verified)** — automated + owner manual |
| Clean browser profile | **Complete (Verified)** — owner manual |
| PWA install (Windows Chrome & Edge) | **Complete (Verified)** — owner manual |
| Offline functionality after first load | **Complete (Verified)** — owner manual |
| Zero study-data egress | **Complete (Verified)** — owner manual |

### Browser / e2e notes
- There is **no Playwright suite** in this repository (Vitest unit/integration only).
- Owner manual checks on Windows Chrome and Edge substitute for browser e2e for v0.1.0 and are **Complete (Verified)**.

### Backup / restore automated coverage
Covered in `src/domain/backup.test.ts` and `src/services/backup.test.ts`:
- Valid minimal backup parse + preview
- Rejects non-object, wrong format version, wrong `appName`, missing fields
- Rejects corrupted subjects/questions/study-time/achievement payloads
- Export filename `StudyApp-backup-YYYY-MM-DD.json` with format/schema versions
- Unicode Replace All round trip + safety backup download
- Smart Merge keeps newer local; applies newer incoming; retains non-conflicting local-only entities
- `readBackupFile` rejects invalid JSON / wrong app without changing IndexedDB
- Validation failure path does not mutate local data

---

## 3. Known limitations

1. **IndexedDB is not encrypted.** Exported JSON backups are also plain text (not password-encrypted). Keep backups private.
2. **`navigator.storage.persist()` is a request, not a guarantee.** Browsers may still clear data under storage pressure.
3. **Data is per browser profile / origin.** Edge vs Chrome, or different PCs, do not share data.
4. **No cloud sync, multi-device sync, or accounts** (by design).
5. **No Excel/CSV import; no media attachments** in v1.
6. **UI is functional, not polished.** Visual design is deferred to the owner.
7. **No Playwright e2e suite** yet (owner manual browser verification completed for v0.1.0).
8. **PWA offline** covers the cached app shell after first successful online load; study data is always local IndexedDB, never a remote study API.
9. **Service worker updates** require an explicit reload (and are blocked while a quiz is active).
10. **npm audit** may report transitive advisories from tooling (e.g. `vite-plugin-pwa` / `glob` deprecations); these are build-time dependencies, not runtime study-data network clients.

---

## 4. Live deployment URL

**https://xSmirna.github.io/StudyApp/**

Repository deploy path uses Vite `base: '/StudyApp/'`.  
CI: push to `main` → `.github/workflows/deploy.yml` → `npm ci` → `npm test` → `npm run build` → GitHub Pages artifact deploy.

Ensure GitHub **Settings → Pages → Source = GitHub Actions**.

---

## 5. Exact installation instructions (Windows — Chrome & Edge)

### A. Use in the browser (no install)
1. Open **https://xSmirna.github.io/StudyApp/** while online.
2. Wait for the first successful load (app shell caches).
3. Use Dashboard / Subjects / History / Settings as normal.

### B. Install as a PWA — Microsoft Edge
1. Open **https://xSmirna.github.io/StudyApp/** online.
2. Click the **App available** / install icon in the address bar, **or** menu **⋯ → Apps → Install this site as an app**.
3. Confirm **Install**.
4. Launch from the Start menu / Edge Apps.
5. After the first successful online load, the installed app can open offline.

### C. Install as a PWA — Google Chrome
1. Open **https://xSmirna.github.io/StudyApp/** online.
2. Click the install icon in the address bar, **or** menu **⋮ → Save and share → Install page as app…** (wording may vary slightly by Chrome version).
3. Confirm **Install**.
4. Launch from the Start menu / Chrome Apps.
5. After the first successful online load, the installed app can open offline.

### D. Local development (optional)
```bash
npm install
npm run dev
```

### Manual browser verification (Complete / Verified)
Owner signed off on Windows Chrome & Edge for:
- Clean browser profile first-run
- PWA installation
- Full offline functionality after first successful load
- Zero study-data egress
- Export/Import Replace and Merge
- Corrupted/malformed JSON rejection without touching existing IndexedDB data

---

## 6. Backup and restore instructions

Open **Settings / Data**.

### Export
1. Click **Export backup**.
2. A file named like `StudyApp-backup-YYYY-MM-DD.json` downloads.
3. Store it somewhere private (not encrypted by the app).

### Import — Smart Merge
1. Choose a `.json` backup file.
2. Review the preview counts.
3. Select **Smart Merge**.
4. Confirm.
5. Behaviour: entities are compared by stable UUID; where both sides exist, the record with the newer `updatedAt` wins. Missing entities are added. Newer local-only data is not wiped.

### Import — Replace All
1. Choose a `.json` backup file.
2. Review the preview counts.
3. Select **Replace All**.
4. Confirm the destructive dialog.
5. Behaviour: the app **first downloads a safety backup** of current local data (`StudyApp-safety-backup-YYYY-MM-DD.json`), then wipes local tables and restores from the imported file.

### Corrupt / invalid files
- Invalid JSON, wrong `appName`, unsupported format version, or corrupted entity payloads are rejected with an error message.
- Local IndexedDB is left unchanged when validation fails.
- **Owner verified:** Complete (Verified).

---

## 7. Technical decisions requiring owner approval

| Topic | Current decision | Status |
|---|---|---|
| No Playwright e2e suite in v0.1.0 | Vitest + owner manual browser verification | Accepted for v0.1.0 (manual checks Complete / Verified) |
| Password-encrypted backups | Deferred (plain JSON + warning) | Deferred per spec; still open for a future version |
| Visual design / branding | Minimal functional UI | Deferred to owner restyle |
| GitHub Pages project URL | `/StudyApp/` under `xSmirna.github.io` | Canonical for v0.1.0 |
| Persistent storage UX | Request button on Settings; denial is OK | Implemented as specified |
| Secret achievements | Hidden until unlocked | Implemented as specified |
| npm transitive advisories in tooling | Not treated as release blockers | Open for future dependency hygiene |
| Manual Edge/Chrome offline, clean-profile, install, egress | Owner verified | **Complete (Verified)** |

---

## 8. Stage 5 & Stage 6 checklist status

### Stage 5 — PWA, offline and deployment
| Spec item | Status |
|---|---|
| Manifest, icons, service worker, offline caching | **Complete (Verified)** |
| GitHub Pages base path and Actions deployment | **Complete (Verified)** |
| Update notice + storage quota/persist | **Complete (Verified)** |
| Install and offline use in Edge & Chrome on Windows | **Complete (Verified)** |
| No study data leaves the device | **Complete (Verified)** |

### Stage 6 — Release readiness
| Spec item | Status |
|---|---|
| Run all unit/integration tests (`npm test`) | **Complete (Verified)** — 16 files / 66 tests passed |
| Run production build (`npm run build`) | **Complete (Verified)** — zero errors |
| Export/import Replace & Merge + corrupt recovery | **Complete (Verified)** — automated + owner manual |
| Clean browser profile | **Complete (Verified)** |
| Produce release report | **Complete (Verified)** — this finalized document |
| Offline / install verification in Edge & Chrome | **Complete (Verified)** |

---

## 9. Changelog / version notes (v0.1.0)

First usable local-first Study PWA release:
- Full subject → chapter → question → quiz loop
- Spaced repetition, productive study time, history, secret achievements
- JSON backup Replace All / Smart Merge with corrupt-file recovery
- Installable PWA with GitHub Pages hosting and Actions deploy
- Owner-verified offline use and zero study-data egress on Windows Chrome & Edge

**Release readiness:** Stages 1–6 are complete. v0.1.0 is finalized for use at https://xSmirna.github.io/StudyApp/.
