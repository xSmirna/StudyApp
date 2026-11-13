import { useEffect, useRef, useState } from 'react'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { ErrorBanner } from '../components/ErrorBanner'
import { APP_VERSION } from '../config'
import type { BackupPreview, StudyAppBackup } from '../domain/backup'
import {
  downloadJsonFile,
  exportBackupJson,
  readBackupFile,
  restoreBackup,
} from '../services/backup'
import { toUserMessage } from '../services/errors'
import {
  getPersistenceStatus,
  getStorageEstimate,
  requestPersistentStorage,
  type PersistenceStatus,
  type StorageEstimateSummary,
} from '../services/storage'
import {
  getPwaUpdateState,
  subscribePwaUpdates,
  type PwaUpdateController,
} from '../services/pwaUpdate'

export function SettingsPage() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [pendingBackup, setPendingBackup] = useState<StudyAppBackup | null>(
    null,
  )
  const [preview, setPreview] = useState<BackupPreview | null>(null)
  const [strategy, setStrategy] = useState<'replace' | 'merge'>('merge')
  const [confirmReplace, setConfirmReplace] = useState(false)
  const [busy, setBusy] = useState(false)
  const [estimate, setEstimate] = useState<StorageEstimateSummary | null>(null)
  const [persistence, setPersistence] = useState<PersistenceStatus | null>(null)
  const [pwaState, setPwaState] = useState<PwaUpdateController>(
    getPwaUpdateState(),
  )

  async function refreshStorage() {
    const [nextEstimate, nextPersistence] = await Promise.all([
      getStorageEstimate(),
      getPersistenceStatus(),
    ])
    setEstimate(nextEstimate)
    setPersistence(nextPersistence)
  }

  useEffect(() => {
    void refreshStorage()
    return subscribePwaUpdates(setPwaState)
  }, [])

  async function handleExport() {
    setBusy(true)
    setError(null)
    try {
      const exported = await exportBackupJson()
      downloadJsonFile(exported.filename, exported.json)
      setMessage(`Exported ${exported.filename}`)
    } catch (err) {
      setError(toUserMessage(err))
    } finally {
      setBusy(false)
    }
  }

  async function handleFileSelected(file: File | null) {
    if (!file) return
    setBusy(true)
    setError(null)
    setMessage(null)
    try {
      const result = await readBackupFile(file)
      setPendingBackup(result.backup)
      setPreview(result.preview)
      setStrategy('merge')
    } catch (err) {
      setPendingBackup(null)
      setPreview(null)
      setError(toUserMessage(err))
    } finally {
      setBusy(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  async function runRestore(selected: 'replace' | 'merge') {
    if (!pendingBackup) return
    setBusy(true)
    setError(null)
    try {
      await restoreBackup(pendingBackup, selected)
      setPendingBackup(null)
      setPreview(null)
      setConfirmReplace(false)
      setMessage(
        selected === 'replace'
          ? 'Replace All completed. A safety backup was downloaded first.'
          : 'Smart Merge completed.',
      )
      await refreshStorage()
    } catch (err) {
      setError(toUserMessage(err))
    } finally {
      setBusy(false)
    }
  }

  async function handlePersistRequest() {
    setBusy(true)
    setError(null)
    try {
      const result = await requestPersistentStorage()
      setPersistence(result)
      setMessage(result.message)
      await refreshStorage()
    } catch (err) {
      setError(toUserMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="page">
      <h1>Settings / Data</h1>
      <p className="muted">
        Export and import stay on this device. Exported JSON backups are not
        password-encrypted — keep them somewhere private. IndexedDB is not
        inherently encrypted by this app.
      </p>

      {error ? <ErrorBanner message={error} onDismiss={() => setError(null)} /> : null}
      {message ? <p className="success-banner" role="status">{message}</p> : null}

      <div className="panel">
        <h2>App version</h2>
        <ul className="plain-list">
          <li>Version: {APP_VERSION}</li>
          <li>
            Update status:{' '}
            {pwaState.needRefresh
              ? 'Update available (see banner). Reloading does not wipe local data.'
              : pwaState.offlineReady
                ? 'Ready for offline use'
                : 'Up to date / checking via service worker when installed'}
          </li>
        </ul>
        {pwaState.needRefresh ? (
          <button type="button" onClick={() => pwaState.applyUpdate()}>
            Reload to apply update
          </button>
        ) : null}
      </div>

      <div className="panel">
        <h2>Browser storage</h2>
        <p className="muted">
          Persistence is a request, not a guarantee. If denied or unsupported,
          the app still works.
        </p>
        <ul className="plain-list">
          <li>
            Usage: {estimate?.usageLabel ?? '…'} / {estimate?.quotaLabel ?? '…'}{' '}
            ({estimate?.percentLabel ?? '…'})
          </li>
          <li>
            Persistent storage:{' '}
            {persistence?.persisted === true
              ? 'Granted'
              : persistence?.persisted === false
                ? 'Not granted'
                : 'Unsupported / unknown'}
          </li>
        </ul>
        <p className="muted">{persistence?.message}</p>
        <div className="row-actions">
          <button
            type="button"
            onClick={() => void handlePersistRequest()}
            disabled={busy}
          >
            Request persistent storage
          </button>
          <button
            type="button"
            onClick={() => void refreshStorage()}
            disabled={busy}
          >
            Refresh estimate
          </button>
        </div>
      </div>

      <div className="panel">
        <h2>Export backup</h2>
        <p className="muted">
          Downloads a versioned JSON file named with StudyApp and the export
          date.
        </p>
        <button type="button" onClick={() => void handleExport()} disabled={busy}>
          Export backup
        </button>
      </div>

      <div className="panel">
        <h2>Import / restore</h2>
        <p className="muted">
          Choose a backup file, review the preview, then pick Replace All or
          Smart Merge. Nothing is changed until you confirm.
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          onChange={(event) =>
            void handleFileSelected(event.target.files?.[0] ?? null)
          }
        />

        {preview && pendingBackup ? (
          <div className="import-preview">
            <h3>Backup preview</h3>
            <ul className="plain-list">
              <li>Exported: {preview.exportedAt}</li>
              <li>
                Format v{preview.formatVersion} / schema v
                {preview.schemaVersion}
              </li>
              <li>Subjects: {preview.subjectCount}</li>
              <li>Chapters: {preview.chapterCount}</li>
              <li>Questions: {preview.questionCount}</li>
              <li>Options: {preview.optionCount}</li>
              <li>Quiz sessions: {preview.quizSessionCount}</li>
              <li>Attempts: {preview.attemptCount}</li>
              <li>Study days: {preview.studyDayCount}</li>
              <li>Achievements: {preview.achievementCount}</li>
            </ul>

            <fieldset className="option-fieldset">
              <legend>Restore strategy</legend>
              <label>
                <input
                  type="radio"
                  name="restore-strategy"
                  checked={strategy === 'merge'}
                  onChange={() => setStrategy('merge')}
                />{' '}
                Smart Merge — keep newer local records by UUID / updatedAt
              </label>
              <label>
                <input
                  type="radio"
                  name="restore-strategy"
                  checked={strategy === 'replace'}
                  onChange={() => setStrategy('replace')}
                />{' '}
                Replace All — download a safety backup, then wipe and restore
              </label>
            </fieldset>

            <div className="row-actions">
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  if (strategy === 'replace') {
                    setConfirmReplace(true)
                  } else {
                    void runRestore('merge')
                  }
                }}
              >
                Continue with {strategy === 'replace' ? 'Replace All' : 'Smart Merge'}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setPendingBackup(null)
                  setPreview(null)
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {confirmReplace ? (
        <ConfirmDialog
          title="Replace all local data?"
          message="A safety backup of your current data will download first. Then current local data will be wiped and replaced by the imported backup."
          confirmLabel="Replace All"
          onConfirm={() => void runRestore('replace')}
          onCancel={() => setConfirmReplace(false)}
        />
      ) : null}
    </section>
  )
}
