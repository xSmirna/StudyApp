# Study App --- Cursor Development Specification

**Document purpose:** This is the source of truth for building the first
usable release of a private, single-user study and revision application.

**Product direction:** A local-first Progressive Web App (PWA),
installed through Microsoft Edge or Google Chrome. The app must work
offline after its first successful load. Each PC/browser profile has its
own independent data.

**Important:** Do not start by generating the entire application in one
pass. Follow the implementation stages in this document, run the tests
after each stage, and stop to report blockers rather than inventing
missing requirements.

------------------------------------------------------------------------

## 1. Product summary

Build a single-user study application for manually creating subjects,
chapters and questions, then practising questions in several modes. It
must keep all study content and activity data locally in the user's
browser.

The application interface is English-only. The user may write question
text, answer options and reference answers in English, Greek, French, or
other Unicode text. Do not translate, detect, restrict or otherwise
process the language of question content.

The user will customise the visual appearance later. Therefore,
prioritise a simple, consistent, functional interface over visual
polish. Use plain, accessible layouts and sensible defaults. Do not
spend time inventing branding, decorative illustrations or elaborate
animations.

### Non-negotiable product rules

1.  Single user; no accounts, sign-in, server-side database or cloud
    synchronisation.
2.  No study data is sent to any server or third party.
3.  No analytics, telemetry, advertising, tracking pixels, external
    fonts, remote images or unnecessary third-party scripts.
4.  The app must be usable offline after it has been loaded and
    installed successfully.
5.  All data belongs to the local browser origin/profile on that PC.
    Different PCs do not share data.
6.  Subjects and questions are created manually in v1. No Excel/CSV
    import in v1.
7.  No images, PDFs, attachments, audio or video in v1.
8.  The interface is English-only. Question content supports Unicode,
    including Greek and French characters.
9.  Quizzes are always restricted to one selected subject. A quiz may
    cover one chapter or multiple chapters within that subject,
    depending on the mode and the user's selections. Never mix subjects
    in one quiz.
10. "Study time" means productive active time in the app, not the
    duration of a quiz alone and not time spent with the app open but
    idle.
11. Secret achievements must be implemented in v1, with their
    names/descriptions hidden until unlocked.
12. Build a reliable core first. Do not silently add future features
    listed in the exclusions below.

------------------------------------------------------------------------

## 2. Technology and architecture

Use the following stack unless a genuine compatibility issue is
discovered. If changing any item, explain why and ask before changing
the architecture.

-   React
-   TypeScript with strict type checking
-   Vite
-   Dexie.js for IndexedDB access
-   IndexedDB as the only application data store
-   `vite-plugin-pwa` (or its current maintained equivalent) for
    service-worker/PWA support
-   React Router only if multiple routes genuinely simplify the app; a
    simple single-page navigation state is acceptable
-   CSS modules or simple CSS for the initial functional UI. Avoid
    imposing a design system; the owner will restyle the app.
-   Vitest and React Testing Library for automated tests
-   Playwright for a small set of end-to-end tests if practical
-   GitHub Pages for static hosting and distribution
-   GitHub Actions for repeatable build/deployment

Do not add a backend, API server, hosted database, authentication
provider, paid service or runtime dependency.

### Architecture boundaries

Keep the code modular and maintainable:

-   `src/domain/`: domain types, validation and pure business rules
-   `src/db/`: Dexie database definition, repositories and migrations
-   `src/features/`: subjects, chapters, questions, quiz modes, review,
    history, statistics and achievements
-   `src/components/`: shared functional UI components
-   `src/pages/` or equivalent: top-level screens
-   `src/services/`: study-time tracking, backup/restore, PWA update
    handling
-   `src/`: app entry point and routing/navigation

Use a repository/data-access layer. UI components must not directly
manipulate IndexedDB tables. This is important so storage can be changed
later without rewriting the entire UI.

Do not create abstractions that have no current use. Keep the first
release understandable to a non-specialist maintainer.

### PWA and offline behaviour

-   Deploy only over HTTPS. GitHub Pages provides HTTPS for its hosted
    pages.
-   Configure the correct Vite `base` path for the chosen GitHub Pages
    URL. Do not assume the site is hosted at the domain root.
-   Cache the application shell and required static assets so the app
    opens offline after its first successful online load.
-   Do not cache or proxy any remote study-data service because none
    should exist.
-   Show a clear, non-blocking notice when an app update is available.
    Do not discard or overwrite local data during an update.
-   Do not reload in the middle of an active quiz without warning. Apply
    an update after the user chooses to reload or after the current
    activity ends.
-   Request persistent browser storage with
    `navigator.storage.persist()` where supported. Treat the result as a
    request, not a guarantee. If denied or unsupported, the app must
    still work.
-   Include an offline/online indicator if it can be done simply and
    reliably.
-   Do not claim that IndexedDB is encrypted. It is not inherently
    encrypted by this design.

------------------------------------------------------------------------

## 3. Privacy and security requirements

### Data flow

The app may download its own static application files and check for
application updates. It must not transmit subjects, chapters, questions,
answers, attempts, grades, study time, statistics or achievement data.

Do not implement: - analytics or crash-reporting SDKs that transmit user
data - remote logging - cloud backup - user accounts - telemetry -
external API calls - cross-device synchronisation

A developer may use network inspection during testing to verify this
requirement. The only expected network traffic during normal use is for
the app's own static files and update checks.

### Local security model

This is a single-user application running inside a browser. Use normal
browser origin isolation and the user's Windows account as the primary
access boundary.

-   Do not add an app PIN in v1. A PIN screen inside a browser app would
    be a convenience barrier, not strong protection against someone who
    can access the same Windows account or browser profile.
-   Recommend that the owner use a password-protected Windows account
    and, where available, Windows device encryption/BitLocker.
-   Do not represent IndexedDB data as encrypted at rest.
-   Do not expose a development server to the local network.
-   Do not include secrets, API keys or credentials in the source code.

### Backup and restore

Implement manual export and import in v1 because browser storage can be
cleared, browser profiles can be removed, and local storage is not a
substitute for backup.

Requirements: - Export the complete app data into a versioned backup
file. - Include a clear filename containing the app name and export
date. - Validate the file format and schema version before importing. -
Show a preview/confirmation before replacing or merging existing data. -
Default to a safe restore strategy: make a backup of current data before
replacement, and require explicit confirmation before replacing it. - Do
not silently overwrite data. - Reject malformed files with a useful
error message; never partially import a file without telling the user. -
Include an export format version and database schema version. - Test
backup/restore round trips, including Greek and French characters.

**Encryption decision for v1:** Do not invent a custom encryption
scheme. Implement a reliable, clearly labelled JSON export/import first.
Explain in the UI that exported JSON backups are not password-encrypted
and should be kept somewhere private. Password-encrypted backups can be
a later feature after a separately reviewed Web Crypto design. This
avoids giving the owner a false sense of security.

------------------------------------------------------------------------

## 4. Functional scope

### 4.1 Subjects

The user can: - Create a subject. - View all subjects. - Rename/edit a
subject. - Delete a subject after an explicit confirmation. - Open a
subject to see its chapters and subject-level progress.

A subject has a stable ID, name, creation timestamp and updated
timestamp.

Deleting a subject must explain that its chapters, questions and related
history will also be deleted. Do not cascade-delete without
confirmation.

### 4.2 Chapters

Within a subject, the user can: - Create a chapter. - Rename/edit a
chapter. - Delete a chapter after confirmation. - View the chapter's
questions and progress. - Open a chapter to study or manage its
questions.

A chapter belongs to exactly one subject. A chapter has a stable ID,
name, optional description, ordering value and timestamps.

### 4.3 Questions

Questions belong to exactly one chapter. Support these types in v1:

1.  Single choice: exactly one correct option.
2.  Multiple select: one or more correct options.
3.  True/false.
4.  Short written answer.
5.  Long written answer.

Each question has: - Stable ID - Chapter ID - Question type - Question
text - Difficulty: easy, medium or hard - Optional reference answer for
written questions - Optional explanation shown after answering/revealing
the answer - Created/updated timestamps - Active/archived state if
needed to preserve history safely

For choice questions: - Options have stable IDs, text and ordering. -
Correctness is stored against option IDs, never against the option's
current display position. - The user can add, edit, remove and reorder
options. - Single-choice questions must have exactly one correct
option. - Multiple-select questions must have at least one correct
option. - Prevent saving invalid questions and explain what needs
fixing.

For true/false: - Store the correct boolean value explicitly.

For written questions: - Store a reference answer. - During a quiz, the
user may reveal the reference answer. - After revealing/answering, the
user can mark their response as Correct, Partially correct or
Incorrect. - Do not attempt AI grading, automatic text matching or
automatic language evaluation. - Numerical partial marks and personal
correction notes are future features, not v1.

All text inputs must support Unicode. Do not apply English-only
validation to question content.

Question deletion must require confirmation. Prefer soft
deletion/archive if needed to keep historical attempts valid. If a
question is archived, it must not appear in new quiz selection, but its
historical attempts remain readable.

### 4.4 Question management screen

Within a chapter, show a list of questions with enough information to
identify them, their type and difficulty. Provide create, edit and
delete/archive actions.

Provide basic filters for question type and difficulty only if they are
straightforward. Do not build a complex question-bank search system in
v1.

------------------------------------------------------------------------

## 5. Study and quiz modes

All quiz modes begin by selecting a subject. No quiz may include
questions from more than one subject.

A quiz may include: - one chapter, or - multiple selected chapters from
the same subject.

### 5.1 Learn a chapter

-   Select one subject and one chapter.
-   Present questions in a learning-oriented flow.
-   Allow the user to reveal the answer/explanation.
-   For written questions, allow self-assessment as Correct / Partially
    correct / Incorrect.
-   Record each attempt and result.
-   Do not require a timer.

### 5.2 Revision

-   Select one subject and one or more chapters.
-   Select a question count or "all eligible questions".
-   Prioritise questions due for review and questions previously
    answered incorrectly, while retaining some variety.
-   The selection rules must be deterministic/testable given a fixed
    random seed where practical.
-   Allow the user to see feedback after each question.

### 5.3 Exam simulation

-   Select one subject and one or more chapters.
-   Let the user choose a question count up to the available eligible
    questions.
-   Shuffle question order.
-   Shuffle answer option order independently for each question.
-   Do not reveal correctness or explanations until the quiz is
    submitted.
-   Automatically grade single choice, multiple select and true/false.
-   Written questions are self-assessed after submission using Correct /
    Partially correct / Incorrect.
-   A timer may be offered as an optional setting; it must not be
    mandatory.
-   Show a results summary after submission.

For multiple-select automatic grading, v1 rule: the answer is correct
only if the selected set exactly matches the correct set. No partial
automatic credit in v1.

### 5.4 Custom session

"Custom session" means a quiz configuration, not the daily study-time
tracker.

-   Select one subject.
-   Select one or more chapters within that subject.
-   Choose the number of questions.
-   Optionally filter by question type and difficulty.
-   Choose whether to prioritise due/failed questions or use a
    balanced/random selection.
-   Never combine subjects.

### 5.5 Randomisation correctness

Randomise: - question order - visible order of options for choice
questions

Do not change stable question IDs or option IDs when shuffling. Grading
must compare selected option IDs against correct option IDs. Never grade
based on the visible option index.

Use a testable shuffle function. Avoid mutating the original stored
option array.

### 5.6 Quiz completion and interruption

-   Save an attempt as soon as the user submits/answers it, not only at
    the very end of the quiz.
-   If the app closes or refreshes mid-quiz, do not silently fabricate a
    completed result.
-   Either persist an in-progress quiz safely and offer resume, or
    clearly mark it abandoned. Choose one approach and document it.
    Preferred v1: persist the in-progress quiz and offer Resume /
    Discard on reopening.
-   A discarded/abandoned quiz must not be counted as a completed quiz.
-   Prevent duplicate attempt records if the user submits twice due to a
    double click or refresh.

------------------------------------------------------------------------

## 6. Spaced repetition and question selection

Implement a transparent, simple spaced-repetition system in v1. Do not
claim to implement a scientifically validated algorithm unless one is
actually implemented and documented.

Store review state per question: - last attempted date/time - next due
date/time - consecutive successful reviews or equivalent simple interval
state - number of attempts - number of incorrect results - last result

Use the following initial rule set, implemented as a pure, unit-tested
function: - Incorrect: due again the next day. - Partially correct: due
again in 2 days. - Correct on first recorded review: due again in 3
days. - Correct on a subsequent review: increase the interval using a
simple multiplier, capped at 60 days. - A failed review resets the
success interval. - Dates use the user's local calendar/time zone
consistently. - The exact interval calculation must be documented in
code and tests.

For revision selection, prioritise: 1. overdue questions, 2. previously
incorrect questions, 3. questions due soon, 4. other eligible questions.

Do not permanently exclude a question because it has been answered
correctly. The user should be able to practise all questions in a
chapter.

Difficulty is a selectable filter/weighting, not a hidden assumption. If
difficulty weighting is enabled, document the weights and test them.
Provide a simple balanced/default option.

Do not build an opaque recommendation engine.

------------------------------------------------------------------------

## 7. Productive study time

The dashboard's "Today" study time measures active use of the app across
the day, not only quiz time.

Initial tracking rules: - Count time only while the app document is
visible and the user has interacted recently. - Stop counting when the
app becomes hidden or loses visibility. - Stop counting after 60 seconds
without user activity. - Resume counting after the next user
interaction. - Avoid double-counting when multiple timers/events fire. -
Persist accumulated time periodically and when the page becomes
hidden/unloads where possible. - Use the PC's local date for daily
totals. - Explain that browser/device shutdown or a sudden crash can
cause a small amount of the most recent uncommitted time to be lost. -
Do not count time spent in another browser tab or while the app is in
the background.

Display at minimum: - productive time today - productive time this
week - total productive time - completed quizzes - recent activity

Do not label quiz duration as total study time. Quiz duration may be
displayed separately if implemented.

------------------------------------------------------------------------

## 8. History, results and statistics

Record completed quiz/session history with: - stable session ID -
subject ID and subject name snapshot - included chapter IDs and names
snapshot - mode - start/end timestamps - question count - correct /
partially correct / incorrect counts - automatically graded and
self-assessed result breakdown - duration, if available - per-question
attempt references

Provide: - history list, newest first - session result detail -
subject-level progress - chapter-level progress - question attempt
history - productive study time summaries

Statistics must be calculated from stored records, not hardcoded or
guessed. Handle deleted/archived content gracefully by using stored name
snapshots where necessary.

For v1, keep charts optional and simple. Correctness and consistency
matter more than chart polish.

------------------------------------------------------------------------

## 9. Secret achievements (required in v1)

Implement a small, data-driven achievement system. Achievement
definitions must be centralised and unit-tested. Achievement names and
descriptions must not be shown before unlock; the interface may show a
generic "Hidden achievement" placeholder or simply omit locked
achievements.

Initial achievements:

1.  **First Quiz** --- unlock after the first completed quiz.
2.  **Chapter Complete** --- unlock when every active question in a
    chapter has at least one completed attempt. This means attempted,
    not necessarily answered correctly.
3.  **Three-Day Streak** --- unlock after productive study time is
    recorded on three consecutive local calendar days. A day counts if
    at least 5 minutes of productive time is recorded.
4.  **Record Breaker** --- unlock when the user sets a new all-time
    daily productive-time record on two consecutive local calendar days.
    Day 2 must exceed the record set by day 1. Both days must have
    tracked productive time; days are based on the PC's local calendar.
5.  **Perfect Exam** --- unlock after an exam simulation with every
    question graded Correct. Written questions count according to the
    user's self-assessment.

Achievement unlocking must be idempotent: reprocessing the same event
must not create duplicate unlocks. Store unlock timestamp and
achievement ID. Do not expose future achievement names in the UI.

------------------------------------------------------------------------

## 10. Data model (initial proposal)

Use stable UUIDs (or another well-tested unique ID strategy) for all
entities. Store timestamps in ISO 8601 UTC strings or numeric epoch
values consistently. Store local-date keys separately where daily
aggregation requires them.

Suggested entities:

-   `Subject`
    -   `id`, `name`, `createdAt`, `updatedAt`
-   `Chapter`
    -   `id`, `subjectId`, `name`, `description?`, `order`, `createdAt`,
        `updatedAt`, `archivedAt?`
-   `Question`
    -   `id`, `chapterId`, `type`, `text`, `difficulty`,
        `referenceAnswer?`, `explanation?`, `createdAt`, `updatedAt`,
        `archivedAt?`
-   `Option`
    -   `id`, `questionId`, `text`, `order`, `isCorrect`
-   `QuestionReviewState`
    -   `questionId`, `lastAttemptAt?`, `nextDueAt?`, `intervalDays`,
        `successfulReviewCount`, `attemptCount`, `incorrectCount`,
        `lastOutcome?`
-   `QuizSession`
    -   `id`, `subjectId`, `subjectNameSnapshot`, `chapterIds`,
        `chapterNameSnapshots`, `mode`, `status`, `startedAt`,
        `completedAt?`, `settings`, `durationSeconds?`
-   `QuestionAttempt`
    -   `id`, `sessionId`, `questionId`, `questionTextSnapshot`,
        `questionType`, `difficulty`, `shownOptionOrder?`,
        `selectedOptionIds?`, `writtenSelfAssessment?`,
        `automaticResult?`, `answeredAt`, `timeSpentSeconds?`
-   `DailyStudyTime`
    -   `localDate`, `seconds`
-   `AchievementUnlock`
    -   `achievementId`, `unlockedAt`
-   `AppMetadata`
    -   schema version, backup metadata and other genuinely necessary
        app-level settings

This is a proposal, not permission to add unnecessary complexity. Refine
the schema only where required by the functional rules. Add Dexie schema
version migrations. Never destroy user data during an upgrade.

### Data integrity

-   Enforce foreign-key relationships in repository/domain operations,
    since IndexedDB does not provide relational foreign keys.
-   Validate references before writes.
-   Deleting a parent must have an explicit, tested cascade or archive
    policy.
-   Keep historical attempts readable if a question/chapter/subject is
    renamed or archived.
-   Use transactions for multi-table writes that must succeed or fail
    together.

------------------------------------------------------------------------

## 11. Screens and navigation

The first release needs these functional areas. Keep navigation simple;
the owner will handle appearance later.

1.  **Dashboard**
    -   today's productive time
    -   weekly/total time
    -   recent quizzes
    -   subject list
    -   achievements unlocked
2.  **Subjects**
    -   create, edit, delete and open subjects
3.  **Subject detail**
    -   chapters
    -   subject progress
    -   start revision/custom quiz for selected chapters
4.  **Chapter detail**
    -   question list
    -   create/edit/delete questions
    -   learn chapter
5.  **Question editor**
    -   type-specific fields
    -   validation
    -   difficulty
6.  **Quiz setup**
    -   subject, chapters, mode and available settings
7.  **Quiz player**
    -   question and answer interaction
    -   answer reveal/feedback appropriate to mode
    -   progress indicator
8.  **Results**
    -   outcome summary and per-question review
9.  **History**
    -   completed sessions and details
10. **Settings / Data**
    -   export backup
    -   import/restore backup
    -   storage persistence request/status if available
    -   app version and update notice

All interface labels and system messages must be English. User-authored
question content must be displayed exactly as entered, including Greek
and French.

------------------------------------------------------------------------

## 12. Explicitly out of scope for v1

Do not implement these unless the owner separately approves a later
phase:

-   user accounts, sign-in or multiple profiles
-   server, API or hosted database
-   cloud sync or online backup
-   multi-subject quizzes
-   question import from Excel/CSV
-   images, PDFs or attachments
-   audio/video
-   AI grading or AI question generation
-   automatic grading of written answers
-   numerical partial marks
-   personal correction notes on written answers
-   app PIN / in-app password lock
-   password-encrypted backup (v1 backup is plain JSON with a clear
    warning)
-   mobile-native app
-   collaboration/sharing
-   elaborate custom visual design
-   complex analytics/recommendation engine
-   paid services or subscriptions

The app should be structured so future work can add features without
compromising the local-first design, but do not build speculative
infrastructure now.

------------------------------------------------------------------------

## 13. Quality requirements and acceptance tests

Cursor must create and run tests. A feature is not complete merely
because it appears on screen.

### Core acceptance tests

**Subjects and chapters** - Create, rename and delete subjects. -
Create, rename and delete chapters. - Deletion confirmation works. - A
chapter cannot accidentally appear under another subject.

**Questions** - Create and edit every supported question type. -
Validation prevents invalid single-choice/multiple-select questions. -
Greek and French text survives save, reload, export and import. -
Archived/deleted questions do not appear in new quizzes. - Historical
attempts remain understandable.

**Grading** - Single choice grades by stable option ID. - Multiple
select is correct only for an exact set match. - True/false grades
correctly. - Written self-assessment stores Correct / Partially correct
/ Incorrect. - Randomising options never changes the correct answer. -
Repeated submission does not duplicate an attempt.

**Modes** - Learn Chapter uses one chapter. - Revision and exam
simulation can use multiple chapters from one subject. - Custom session
obeys selected subject, chapters, count, filters and selection
strategy. - No mode can combine subjects. - Exam mode hides feedback
until submission.

**Spaced repetition** - Each outcome sets the documented next due
date. - Failed review resets interval. - Due/failed prioritisation
behaves as documented. - Tests use a fixed clock/time zone where
possible.

**Study time** - Visible active use is counted. - Hidden/background time
is not counted. - Idle time after 60 seconds is not counted. - Multiple
event handlers do not double-count. - Daily totals use local calendar
dates.

**Achievements** - Each of the five unlock conditions works. - Locked
achievements remain hidden. - Reprocessing events does not duplicate
unlocks. - Record Breaker requires two consecutive record-setting days.

**Backup** - Export creates a versioned file. - Import validates before
changing data. - Invalid import leaves current data untouched. - Restore
round trip preserves all entities and Unicode. - Existing data is backed
up before replacement.

**Offline/privacy** - After one successful online load, disconnect the
network and verify the app opens and core features work. - Verify there
are no requests sending study data to any endpoint. - Verify no
analytics/tracking dependencies are installed. - Verify app update does
not delete local data.

### Engineering quality

-   TypeScript strict mode enabled; avoid `any` unless justified and
    isolated.
-   No placeholder buttons or fake functionality in a release candidate.
-   No swallowed exceptions; show useful user-facing errors and log only
    locally when necessary.
-   Avoid unsafe HTML injection.
-   Validate all user-entered data.
-   Use accessible labels and keyboard-operable controls.
-   Handle empty states and destructive actions.
-   Keep business logic in pure functions where possible and unit test
    it.
-   Include a README with exact setup, run, test, build and deploy
    commands.
-   Include a changelog or version notes for releases.
-   Do not claim tests passed unless they were actually run.

------------------------------------------------------------------------

## 14. Staged implementation plan

Cursor must work in these stages and report results after each stage.

### Stage 0 --- Verify environment and plan

-   Inspect the repository and installed tool versions.
-   Check current official documentation for chosen libraries and
    browser APIs.
-   Identify any incompatibilities before coding.
-   Produce a concise implementation plan and proposed file tree.
-   Do not invent package versions or commands. Use current stable
    compatible versions and commit the lockfile.

### Stage 1 --- App shell and local database

-   Create Vite + React + TypeScript project.
-   Configure strict TypeScript.
-   Configure Dexie schema and first migration.
-   Add repository layer and basic error handling.
-   Create a minimal dashboard and subject/chapter CRUD.
-   Add unit tests.

### Stage 2 --- Question management

-   Implement all five question types and validation.
-   Add question CRUD and stable option IDs.
-   Test Unicode persistence and backup round trip.

### Stage 3 --- Quiz engine

-   Implement Learn Chapter, Revision, Exam Simulation and Custom
    Session.
-   Implement randomisation and stable-ID grading.
-   Persist in-progress sessions and completed attempts.
-   Add automated tests for every grading and mode rule.

### Stage 4 --- Review, study time, history and achievements

-   Implement spaced repetition.
-   Implement productive-time tracking.
-   Implement history and statistics.
-   Implement the five secret achievements.
-   Test date boundaries, idle tracking and idempotency.

### Stage 5 --- PWA, offline and deployment

-   Configure manifest, icons (simple placeholders are acceptable
    initially), service worker and offline caching.
-   Configure GitHub Pages base path and GitHub Actions deployment.
-   Add update notice behaviour.
-   Test install and offline use in current Edge and Chrome on Windows.
-   Verify no study data leaves the device.

### Stage 6 --- Release readiness

-   Run all unit, integration and end-to-end tests.
-   Run production build.
-   Test export/import and recovery.
-   Test on a clean browser profile.
-   Produce a concise release report listing:
    -   features completed
    -   tests actually run and their results
    -   known limitations
    -   deployment URL
    -   exact installation steps
    -   backup instructions
    -   any decisions requiring owner approval

Do not skip stages or mark incomplete requirements as complete.

------------------------------------------------------------------------

## 15. Cursor operating instructions

Paste these rules into Cursor's project instructions or keep this
document open as the project source of truth:

1.  Treat this document as the authoritative requirements specification.
2.  Do not invent requirements, features, data, test results, deployment
    URLs, package versions or successful outcomes.
3.  If a requirement is ambiguous or conflicts with another requirement,
    stop and ask the owner. Do not silently choose a behaviour that
    changes product scope.
4.  Before using a library or browser API, verify its current official
    documentation and compatibility.
5.  Make small, reviewable changes. Explain what files you changed and
    why.
6.  After each stage, run the relevant tests and report the actual
    command and result.
7.  Never delete, reset or overwrite user data to fix a migration or
    bug.
8.  Never add telemetry, analytics, cloud services or external network
    calls without explicit owner approval.
9.  Do not add features listed as out of scope.
10. Do not spend time on visual design. Use simple functional UI; the
    owner will style it later.
11. Keep the project runnable at every stage.
12. If you cannot verify something, say so plainly.

**First instruction to Cursor:** Read this entire specification. Perform
Stage 0 only. Do not start implementation until you have reported the
plan, file tree, dependency choices and any questions or conflicts.
