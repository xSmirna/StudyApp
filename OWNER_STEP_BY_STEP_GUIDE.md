# Your Step-by-Step Guide --- Building and Installing Your Study App

This guide is written for someone who does not want to become a software
developer. You will use Cursor as your coding assistant, while this
guide tells you what to install, what to click, what to paste and how to
check the result.

The app is planned as a **local-first PWA**: - It opens in its own
app-like window through Edge or Chrome. - It works offline after the
first successful load. - Your study data stays in that PC's browser
storage. - Each PC starts with its own separate, empty database. - There
is no account, server database or cloud synchronisation.

The Cursor specification is the detailed source of truth. Keep it in the
project folder and give it to Cursor before asking it to build anything.

------------------------------------------------------------------------

## Part A --- What you need

### On the PC where you develop the app

You will need: 1. Windows 11, or a compatible Windows 10 PC. 2.
Microsoft Edge or Google Chrome. 3. Cursor. 4. Node.js (the current
supported LTS release). 5. Git. 6. A free GitHub account.

You do **not** need to install Python, SQLite, a database server, a web
server or any programming language separately.

### On another PC where you only use the finished app

You need: - Windows with a compatible, up-to-date Edge or Chrome
browser. - Internet for the first visit/install and later updates. - No
Cursor, Node.js, Git, Python or database installation.

Windows 10 may run the app if its browser is compatible, but Microsoft
ended ordinary Windows 10 support on 14 October 2025. For security,
Windows 11 is preferable; keep Windows and the browser updated.

------------------------------------------------------------------------

## Part B --- Prepare your development PC

### Step 1 --- Create a project folder

1.  Open File Explorer.
2.  Create a folder somewhere easy to find, for example
    `Documents\StudyApp`.
3.  Do not put your only copy of the project inside Downloads or a
    temporary folder.

### Step 2 --- Create a GitHub account

1.  Go to `https://github.com`.
2.  Create a free account if you do not already have one.
3.  Verify your email address.
4.  Keep your password safe and enable two-factor authentication if you
    are comfortable doing so.

GitHub will hold the app's source code and the public static files
needed to install it. It will **not** hold your local study database.

### Step 3 --- Install Node.js

1.  Go to `https://nodejs.org`.
2.  Download the current **LTS** release for Windows.
3.  Run the installer.
4.  Accept the normal defaults.
5.  If Windows asks you to restart, do so.

To check it: 1. Open the Windows Start menu. 2. Type `PowerShell` and
open it. 3. Enter `node --version` and press Enter. 4. Enter
`npm --version` and press Enter.

You should see version numbers. If Windows says the commands are not
recognised, restart Windows and try again. Do not download Node.js from
unofficial websites.

### Step 4 --- Install Git

1.  Go to `https://git-scm.com/downloads`.
2.  Download Git for Windows.
3.  Run the installer and use the recommended defaults.
4.  Open PowerShell and enter `git --version`.

You should see a version number.

### Step 5 --- Install Cursor

1.  Go to `https://cursor.com`.
2.  Download Cursor for Windows.
3.  Install and open it.
4.  Sign in or follow the current onboarding instructions. Check
    Cursor's current plan and usage limits before relying on any
    paid-only feature; the project itself does not require a paid
    hosting service.

------------------------------------------------------------------------

## Part C --- Give Cursor the specification

### Step 6 --- Put the documents in the project folder

Save these two documents in your `StudyApp` folder: -
`CURSOR_DEVELOPMENT_SPEC.md` - `OWNER_STEP_BY_STEP_GUIDE.md`

Keep the specification unchanged unless you deliberately decide to
change a requirement.

### Step 7 --- Open the folder in Cursor

1.  Open Cursor.
2.  Choose **File → Open Folder**.
3.  Select your `StudyApp` folder.
4.  If Cursor asks whether you trust the folder, only approve it because
    you created it.
5.  Open `CURSOR_DEVELOPMENT_SPEC.md` in Cursor.

### Step 8 --- Ask Cursor to plan, not code yet

Paste this into Cursor Chat:

> Read `CURSOR_DEVELOPMENT_SPEC.md` completely. Treat it as the
> authoritative product specification. Perform Stage 0 only. Inspect the
> environment, check current official documentation for the proposed
> dependencies and browser APIs, and report the proposed file tree,
> dependency choices, implementation plan, risks and any questions. Do
> not write application code yet. Do not invent versions, commands or
> test results.

Read the report. If Cursor proposes a backend, cloud database, login,
paid service, analytics or cross-device sync, tell it that these
contradict the specification and ask it to correct the plan.

### Step 9 --- Build in stages

When the plan is acceptable, ask Cursor to perform **Stage 1 only**.

After it finishes: 1. Ask it to explain what it changed in plain
English. 2. Ask it to run the tests and show the actual results. 3. Ask
it to tell you how to start the app locally. 4. Try the app yourself. 5.
If it works, save the changes in Git (Cursor may offer a Source Control
panel).

Then repeat for Stage 2, Stage 3, Stage 4, Stage 5 and Stage 6. Do not
ask it to build everything in one enormous prompt.

Use this prompt at the start of each stage:

> Implement only the next incomplete stage in
> `CURSOR_DEVELOPMENT_SPEC.md`. Do not start later stages. Keep the app
> runnable. Run the relevant tests, report the exact commands and actual
> results, list changed files, and identify anything incomplete or
> requiring my decision. Do not claim success unless you verified it.

If something breaks, paste the exact error message into Cursor and ask
it to explain the cause before changing unrelated code.

### Step 10 --- Test the app before publishing

At minimum, personally check: - You can create a subject and chapter. -
You can create each question type. - Greek and French characters save
and display correctly. - Correct answers remain correct when options are
shuffled. - A quiz only contains chapters from the selected subject. -
Results and history are saved. - Productive time stops when the app is
idle or in another tab. - Achievements unlock only when their rules are
met. - Exporting and restoring a backup works. - The app still opens
after you disconnect the internet, once it has been loaded successfully
online.

Do not use your only copy of important study material as the first
backup/restore test. Test with sample data first.

------------------------------------------------------------------------

## Part D --- Publish the app

### Step 11 --- Create a GitHub repository

When Cursor says the project is ready to publish:

1.  On GitHub, choose **New repository**.
2.  Give it a simple name such as `study-app`.
3.  For a private personal project, choose **Private** if the current
    GitHub Pages plan/settings allow the deployment you intend to use.
    If Pages requires a public repository for your account/plan, decide
    whether you are comfortable making the application source public
    before proceeding.
4.  Do not upload any real study database or backup file to GitHub.
5.  Follow Cursor's instructions to connect your local project to the
    repository and push the code.

Important: A public GitHub repository means the source code is public.
It does not automatically publish your IndexedDB data, but never commit
backup files, personal data, passwords or secrets.

### Step 12 --- Enable deployment

Ask Cursor to configure GitHub Actions and GitHub Pages as specified in
Stage 5. Then:

1.  Open the repository on GitHub.
2.  Open the **Actions** tab.
3.  Check that the deployment workflow completed successfully.
4.  Open **Settings → Pages**.
5.  Check the published site URL shown by GitHub.
6.  Open that exact URL in Edge or Chrome.

Do not guess the URL. Use the one GitHub displays.

GitHub Pages is static hosting. It serves the app files; it is not a
database and should never receive your study content.

------------------------------------------------------------------------

## Part E --- Install and use it

### Step 13 --- Install on the development PC

1.  Open the published app URL in Edge or Chrome.
2.  Wait for the app to finish loading while online.
3.  Use the browser's install option. In Edge this is commonly available
    from the app/site menu as **Apps → Install this site as an app**;
    wording can change between browser versions.
4.  Confirm installation.
5.  Launch it from the Windows Start menu or the shortcut created by the
    browser.
6.  Create a test subject and question.

The first successful online load is important because it downloads the
app files and prepares offline caching.

### Step 14 --- Install on another PC

1.  Open the same published URL on that PC.
2.  Install it using Edge or Chrome.
3.  Launch the app.
4.  It will create a new, empty local database on that PC.
5.  You do not need to install development tools.

The two PCs will not share questions, progress or statistics. That is
intentional.

### Step 15 --- Check offline operation

After the first online load/install: 1. Close the app. 2. Disconnect
that PC from the internet. 3. Open the installed app again. 4. Check
that your subjects, questions and core study features still work.

Updates will be obtained when the PC is online again. The app should
show an update notice and should not interrupt an active quiz.

------------------------------------------------------------------------

## Part F --- Protect your data

### Step 16 --- Make backups

The v1 backup is a JSON file and is **not password-encrypted**.

1.  Open the app's Settings/Data area.
2.  Choose Export Backup.
3.  Save the file somewhere private, such as an external drive or a
    folder protected by your Windows account.
4.  Do not upload it to the public GitHub repository.
5.  Make a backup before browser resets, uninstalling the browser,
    changing Windows profiles or replacing the PC.
6.  Occasionally test restoring a backup using test data.

If you clear browser site data, reset the browser profile or remove the
relevant browser data, you may lose the app's local database. Installing
the app on another PC does not transfer the data.

### Step 17 --- Basic security

-   Use a password-protected Windows account.
-   Keep Windows and Edge/Chrome updated.
-   Use Windows device encryption/BitLocker if available on your device.
-   Do not let other people use your Windows account if the study data
    is private.
-   Keep backup files private; the v1 JSON backup is readable by anyone
    who obtains it.
-   Remember: local browser storage is not inherently encrypted by the
    app.

There is no app PIN in v1. This is deliberate: a PIN inside a browser
app would not protect the database from someone who already has access
to the same Windows account and browser profile.

------------------------------------------------------------------------

## Part G --- Updating the app later

When you want a new feature or a bug fix:

1.  Open the project folder in Cursor.
2.  Make sure your code is pushed to GitHub.
3.  Export a backup of your study data before testing a release that
    changes the database.
4.  Tell Cursor exactly what you want changed.
5.  Ask it to check the specification and identify whether the change
    affects the database or existing data.
6.  Ask it to add or update tests.
7.  Test the change locally.
8.  Ask Cursor to deploy only after the tests pass.
9.  Wait for the GitHub Actions deployment to finish.
10. Open the app while online and accept the update notice when safe.

Never accept a database migration that deletes or resets existing data.
Ask Cursor to explain the migration and how it preserves existing
records before deploying it.

------------------------------------------------------------------------

## Part H --- If something goes wrong

### The app does not open offline

Reconnect to the internet and open the published URL once. Wait for it
to finish loading, then try offline again. If it still fails, report the
browser name/version and exact error to Cursor.

### Your subjects/questions have disappeared

Stop using the app until you have checked whether the correct browser
profile is open. Check whether browser site data was cleared. Restore
the most recent backup if necessary. Do not ask Cursor to reset the
database.

### The app does not update

Reconnect to the internet, open the app, wait for the update notice and
follow its instructions. Do not clear browser data as a first
troubleshooting step.

### Cursor suggests a cloud service or account system

Remind it: "The specification requires a single-user, local-first app.
No backend, accounts, cloud sync, analytics or transmission of study
data. Please revise your plan."

### You are unsure about a command

Do not run commands you do not understand if they delete files, reset
databases, change security settings or publish data. Ask Cursor to
explain the command and its effects first.

------------------------------------------------------------------------

## Final checklist

Before considering the project finished, you should have:

-   [ ] The Cursor specification saved in the project.
-   [ ] Cursor completed all implementation stages.
-   [ ] Tests run and results reported honestly.
-   [ ] Greek and French question text tested.
-   [ ] All five question types working.
-   [ ] All four study modes working.
-   [ ] Shuffling and grading tested.
-   [ ] Spaced repetition working.
-   [ ] Productive study time and secret achievements working.
-   [ ] Export and restore tested.
-   [ ] Offline operation tested.
-   [ ] No study-data network traffic.
-   [ ] GitHub Pages deployment working.
-   [ ] App installed on the main PC.
-   [ ] App installed and tested on the second PC.
-   [ ] A backup stored somewhere safe.

**The most important rule:** keep a separate backup of your study data.
The app is local-first, which protects privacy, but local storage is not
a substitute for backup.
