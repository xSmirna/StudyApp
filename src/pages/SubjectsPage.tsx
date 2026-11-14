import { useEffect, useState, type CSSProperties, type FormEvent } from 'react'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { CreamButton } from '../components/CreamButton'
import { ErrorBanner } from '../components/ErrorBanner'
import {
  createSubject,
  deleteSubject,
  listSubjects,
  updateSubject,
} from '../db/repositories/subjects'
import type { Subject } from '../domain/types'
import type { Route } from '../navigation'
import {
  createConstellationDustPattern,
  dustPatternToStyle,
  ensureConstellationDust,
  removeConstellationDust,
  saveConstellationDust,
  type ConstellationDustPattern,
} from '../services/constellationDust'
import { toUserMessage } from '../services/errors'

interface SubjectsPageProps {
  onNavigate: (route: Route) => void
}

export function SubjectsPage({ onNavigate }: SubjectsPageProps) {
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [dustBySubject, setDustBySubject] = useState<
    Record<string, ConstellationDustPattern>
  >({})
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [pendingDelete, setPendingDelete] = useState<Subject | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  function syncDustPatterns(items: Subject[]) {
    const next: Record<string, ConstellationDustPattern> = {}
    for (const subject of items) {
      next[subject.id] = ensureConstellationDust(subject.id)
    }
    setDustBySubject(next)
  }

  async function refresh() {
    const items = await listSubjects()
    setSubjects(items)
    syncDustPatterns(items)
  }

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const items = await listSubjects()
        if (!cancelled) {
          setSubjects(items)
          syncDustPatterns(items)
          setError(null)
        }
      } catch (err) {
        if (!cancelled) {
          setError(toUserMessage(err))
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [])

  async function handleCreate(event: FormEvent) {
    event.preventDefault()
    try {
      const created = await createSubject({ name })
      const pattern = createConstellationDustPattern()
      saveConstellationDust(created.id, pattern)
      setDustBySubject((prev) => ({ ...prev, [created.id]: pattern }))
      setName('')
      setCreating(false)
      setError(null)
      await refresh()
    } catch (err) {
      setError(toUserMessage(err))
    }
  }

  async function handleSaveEdit(id: string) {
    try {
      await updateSubject(id, { name: editName })
      setEditingId(null)
      setEditName('')
      setError(null)
      await refresh()
    } catch (err) {
      setError(toUserMessage(err))
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) {
      return
    }
    try {
      const deletedId = pendingDelete.id
      await deleteSubject(deletedId)
      removeConstellationDust(deletedId)
      setDustBySubject((prev) => {
        const next = { ...prev }
        delete next[deletedId]
        return next
      })
      setPendingDelete(null)
      setError(null)
      await refresh()
    } catch (err) {
      setError(toUserMessage(err))
    }
  }

  const showConstellation = !loading && subjects.length > 0

  return (
    <section className="page subjects-page">
      <div className="page-title-row constellation-root">
        <span className="constellation-root-node" aria-hidden="true" />
        <h1>Subjects</h1>
        <CreamButton
          iconOnly
          aria-label={creating ? 'Cancel new subject' : 'Add subject'}
          aria-expanded={creating}
          onClick={() => {
            setCreating((open) => !open)
            setError(null)
            if (creating) {
              setName('')
            }
          }}
        >
          {creating ? '×' : '+'}
        </CreamButton>
      </div>

      {error ? <ErrorBanner message={error} onDismiss={() => setError(null)} /> : null}

      {creating ? (
        <form className="inline-form" onSubmit={(event) => void handleCreate(event)}>
          <label className="sr-only" htmlFor="new-subject-name">
            New subject name
          </label>
          <input
            id="new-subject-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. Biology"
            autoComplete="off"
            autoFocus
          />
          <CreamButton type="submit">Create</CreamButton>
        </form>
      ) : null}

      {loading ? <p>Loading…</p> : null}

      {!loading && subjects.length === 0 && !creating ? (
        <p className="muted">No subjects yet.</p>
      ) : null}

      {showConstellation ? (
        <div className="constellation-tree">
          <div className="constellation-spine" aria-hidden="true">
            <span className="constellation-dust" />
          </div>

          <ul className="entity-list subject-list">
            {subjects.map((subject) => {
              const isEditing = editingId === subject.id

              return (
                <li key={subject.id} className="subject-item">
                  <span className="constellation-branch" aria-hidden="true">
                    <span className="constellation-branch-line">
                      <span
                        className="constellation-branch-dust"
                        style={
                          dustPatternToStyle(
                            dustBySubject[subject.id] ??
                              ensureConstellationDust(subject.id),
                          ) as CSSProperties
                        }
                      />
                    </span>
                  </span>

                  <div
                    className={[
                      'entity-row',
                      'subject-row',
                      'forest-panel',
                      isEditing ? 'subject-card-editing' : 'subject-card',
                    ].join(' ')}
                    role={isEditing ? undefined : 'link'}
                    tabIndex={isEditing ? undefined : 0}
                    aria-label={
                      isEditing ? undefined : `Open subject ${subject.name}`
                    }
                    onClick={
                      isEditing
                        ? undefined
                        : () =>
                            onNavigate({
                              name: 'subject',
                              subjectId: subject.id,
                            })
                    }
                    onKeyDown={
                      isEditing
                        ? undefined
                        : (event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault()
                              onNavigate({
                                name: 'subject',
                                subjectId: subject.id,
                              })
                            }
                          }
                    }
                  >
                    <span className="constellation-node" aria-hidden="true" />

                    {isEditing ? (
                      <div
                        className="inline-form"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <label
                          className="sr-only"
                          htmlFor={`edit-subject-${subject.id}`}
                        >
                          Rename subject
                        </label>
                        <input
                          id={`edit-subject-${subject.id}`}
                          value={editName}
                          onChange={(event) => setEditName(event.target.value)}
                        />
                        <CreamButton
                          onClick={() => void handleSaveEdit(subject.id)}
                        >
                          Save
                        </CreamButton>
                        <CreamButton
                          onClick={() => {
                            setEditingId(null)
                            setEditName('')
                          }}
                        >
                          Cancel
                        </CreamButton>
                      </div>
                    ) : (
                      <>
                        <span className="entity-title">{subject.name}</span>
                        <div
                          className="row-actions"
                          onClick={(event) => event.stopPropagation()}
                          onKeyDown={(event) => event.stopPropagation()}
                        >
                          <CreamButton
                            iconOnly
                            aria-label={`Edit ${subject.name}`}
                            title="Edit"
                            onClick={() => {
                              setEditingId(subject.id)
                              setEditName(subject.name)
                            }}
                          >
                            <svg
                              viewBox="0 0 24 24"
                              width="18"
                              height="18"
                              aria-hidden="true"
                              focusable="false"
                            >
                              <path
                                fill="currentColor"
                                d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zm2.92 2.33H5v-.92l8.06-8.06.92.92L5.92 19.58zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"
                              />
                            </svg>
                          </CreamButton>
                          <CreamButton
                            iconOnly
                            aria-label={`Delete ${subject.name}`}
                            title="Delete"
                            onClick={() => setPendingDelete(subject)}
                          >
                            <svg
                              viewBox="0 0 24 24"
                              width="18"
                              height="18"
                              aria-hidden="true"
                              focusable="false"
                            >
                              <path
                                fill="currentColor"
                                d="M6 7h12v2H6V7zm2 3h8l-.7 10.05a1 1 0 0 1-1 .95H9.7a1 1 0 0 1-1-.95L9 10zm3-5h2l1 1h4v2H5V6h4l1-1z"
                              />
                            </svg>
                          </CreamButton>
                        </div>
                      </>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      ) : null}

      {pendingDelete ? (
        <ConfirmDialog
          title="Delete subject?"
          message={`Deleting "${pendingDelete.name}" will also delete its chapters, questions and related history. This cannot be undone.`}
          onConfirm={() => void confirmDelete()}
          onCancel={() => setPendingDelete(null)}
        />
      ) : null}
    </section>
  )
}
