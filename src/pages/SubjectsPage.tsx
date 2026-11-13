import { useEffect, useState, type FormEvent } from 'react'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { ErrorBanner } from '../components/ErrorBanner'
import {
  createSubject,
  deleteSubject,
  listSubjects,
  updateSubject,
} from '../db/repositories/subjects'
import type { Subject } from '../domain/types'
import type { Route } from '../navigation'
import { toUserMessage } from '../services/errors'

interface SubjectsPageProps {
  onNavigate: (route: Route) => void
}

export function SubjectsPage({ onNavigate }: SubjectsPageProps) {
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [name, setName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [pendingDelete, setPendingDelete] = useState<Subject | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  async function refresh() {
    const items = await listSubjects()
    setSubjects(items)
  }

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const items = await listSubjects()
        if (!cancelled) {
          setSubjects(items)
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
      await createSubject({ name })
      setName('')
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
      await deleteSubject(pendingDelete.id)
      setPendingDelete(null)
      setError(null)
      await refresh()
    } catch (err) {
      setError(toUserMessage(err))
    }
  }

  return (
    <section className="page">
      <h1>Subjects</h1>
      <p className="muted">Create and manage study subjects.</p>

      {error ? <ErrorBanner message={error} onDismiss={() => setError(null)} /> : null}

      <form className="inline-form" onSubmit={handleCreate}>
        <label htmlFor="new-subject-name">New subject</label>
        <input
          id="new-subject-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="e.g. Biology"
          autoComplete="off"
        />
        <button type="submit">Create</button>
      </form>

      {loading ? <p>Loading…</p> : null}

      {!loading && subjects.length === 0 ? (
        <p className="muted">No subjects yet.</p>
      ) : null}

      <ul className="entity-list">
        {subjects.map((subject) => (
          <li key={subject.id} className="entity-row">
            {editingId === subject.id ? (
              <div className="inline-form">
                <label className="sr-only" htmlFor={`edit-subject-${subject.id}`}>
                  Rename subject
                </label>
                <input
                  id={`edit-subject-${subject.id}`}
                  value={editName}
                  onChange={(event) => setEditName(event.target.value)}
                />
                <button type="button" onClick={() => void handleSaveEdit(subject.id)}>
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(null)
                    setEditName('')
                  }}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  className="linkish"
                  onClick={() =>
                    onNavigate({ name: 'subject', subjectId: subject.id })
                  }
                >
                  {subject.name}
                </button>
                <div className="row-actions">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(subject.id)
                      setEditName(subject.name)
                    }}
                  >
                    Rename
                  </button>
                  <button
                    type="button"
                    className="danger"
                    onClick={() => setPendingDelete(subject)}
                  >
                    Delete
                  </button>
                </div>
              </>
            )}
          </li>
        ))}
      </ul>

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
