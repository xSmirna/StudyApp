import { useEffect, useState, type FormEvent } from 'react'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { CreamButton } from '../components/CreamButton'
import { ErrorBanner } from '../components/ErrorBanner'
import {
  createChapter,
  deleteChapter,
  listChaptersBySubject,
  updateChapter,
} from '../db/repositories/chapters'
import { getSubject } from '../db/repositories/subjects'
import type { Chapter, Subject } from '../domain/types'
import type { Route } from '../navigation'
import { getSubjectProgress, type ProgressStats } from '../services/statistics'
import { toUserMessage } from '../services/errors'

interface SubjectDetailPageProps {
  subjectId: string
  onNavigate: (route: Route) => void
}

export function SubjectDetailPage({
  subjectId,
  onNavigate,
}: SubjectDetailPageProps) {
  const [subject, setSubject] = useState<Subject | null>(null)
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [pendingDelete, setPendingDelete] = useState<Chapter | null>(null)
  const [progress, setProgress] = useState<ProgressStats | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  async function refresh() {
    const [nextSubject, nextChapters, nextProgress] = await Promise.all([
      getSubject(subjectId),
      listChaptersBySubject(subjectId),
      getSubjectProgress(subjectId),
    ])
    setSubject(nextSubject ?? null)
    setChapters(nextChapters)
    setProgress(nextProgress)
  }

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const [nextSubject, nextChapters, nextProgress] = await Promise.all([
          getSubject(subjectId),
          listChaptersBySubject(subjectId),
          getSubjectProgress(subjectId),
        ])
        if (!cancelled) {
          setSubject(nextSubject ?? null)
          setChapters(nextChapters)
          setProgress(nextProgress)
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
  }, [subjectId])

  async function handleCreate(event: FormEvent) {
    event.preventDefault()
    try {
      await createChapter({
        subjectId,
        name,
        description,
      })
      setName('')
      setDescription('')
      setError(null)
      await refresh()
    } catch (err) {
      setError(toUserMessage(err))
    }
  }

  async function handleSaveEdit(id: string) {
    try {
      await updateChapter(id, {
        name: editName,
        description: editDescription,
      })
      setEditingId(null)
      setEditName('')
      setEditDescription('')
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
      await deleteChapter(pendingDelete.id)
      setPendingDelete(null)
      setError(null)
      await refresh()
    } catch (err) {
      setError(toUserMessage(err))
    }
  }

  if (loading) {
    return (
      <section className="page">
        <p>Loading…</p>
      </section>
    )
  }

  if (!subject) {
    return (
      <section className="page">
        <h1>Subject not found</h1>
        <button type="button" onClick={() => onNavigate({ name: 'subjects' })}>
          Back to subjects
        </button>
      </section>
    )
  }

  const progressTitle = `${subject.name} progress`

  return (
    <section className="page">
      {error ? <ErrorBanner message={error} onDismiss={() => setError(null)} /> : null}

      <div className="panel grove-panel progress-quiz-panel">
        <div className="progress-quiz-main">
          <div className="panel-title-row">
            <CreamButton
              iconOnly
              aria-label="Back to subjects"
              title="Back to subjects"
              onClick={() => onNavigate({ name: 'subjects' })}
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
                  d="M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z"
                />
              </svg>
            </CreamButton>
            <h1 className="panel-inline-title">{progressTitle}</h1>
          </div>
          {progress ? (
            <ul className="plain-list">
              <li>
                Attempted {progress.attemptedQuestions} of{' '}
                {progress.activeQuestions} active questions
              </li>
              <li>Correct attempt records: {progress.correctAttempts}</li>
              <li>Overdue for review: {progress.overdueQuestions}</li>
            </ul>
          ) : (
            <p className="muted">Loading progress…</p>
          )}
        </div>

        <CreamButton
          className="start-quiz-button"
          onClick={() =>
            onNavigate({
              name: 'quiz-setup',
              subjectId,
              mode: 'custom',
            })
          }
        >
          Start a quiz
        </CreamButton>
      </div>

      <form className="stack-form panel grove-panel" onSubmit={handleCreate}>
        <h2>Add chapter</h2>
        <label htmlFor="new-chapter-name">Chapter name</label>
        <input
          id="new-chapter-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          autoComplete="off"
        />
        <label htmlFor="new-chapter-description">Description (optional)</label>
        <textarea
          id="new-chapter-description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={3}
        />
        <button type="submit">Create chapter</button>
      </form>

      {chapters.length === 0 ? (
        <p className="muted">No chapters yet.</p>
      ) : null}

      <ul className="entity-list">
        {chapters.map((chapter) => (
          <li key={chapter.id} className="entity-row">
            {editingId === chapter.id ? (
              <div className="stack-form">
                <label htmlFor={`edit-chapter-name-${chapter.id}`}>Name</label>
                <input
                  id={`edit-chapter-name-${chapter.id}`}
                  value={editName}
                  onChange={(event) => setEditName(event.target.value)}
                />
                <label htmlFor={`edit-chapter-description-${chapter.id}`}>
                  Description
                </label>
                <textarea
                  id={`edit-chapter-description-${chapter.id}`}
                  value={editDescription}
                  onChange={(event) => setEditDescription(event.target.value)}
                  rows={3}
                />
                <div className="row-actions">
                  <button
                    type="button"
                    onClick={() => void handleSaveEdit(chapter.id)}
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(null)
                      setEditName('')
                      setEditDescription('')
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div>
                  <button
                    type="button"
                    className="linkish"
                    onClick={() =>
                      onNavigate({
                        name: 'chapter',
                        subjectId,
                        chapterId: chapter.id,
                      })
                    }
                  >
                    {chapter.name}
                  </button>
                  {chapter.description ? (
                    <p className="muted">{chapter.description}</p>
                  ) : null}
                </div>
                <div className="row-actions">
                  <button
                    type="button"
                    onClick={() =>
                      onNavigate({
                        name: 'chapter',
                        subjectId,
                        chapterId: chapter.id,
                      })
                    }
                  >
                    Open
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(chapter.id)
                      setEditName(chapter.name)
                      setEditDescription(chapter.description ?? '')
                    }}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="danger"
                    onClick={() => setPendingDelete(chapter)}
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
          title="Delete chapter?"
          message={`Delete "${pendingDelete.name}"? Its questions and options will also be deleted.`}
          onConfirm={() => void confirmDelete()}
          onCancel={() => setPendingDelete(null)}
        />
      ) : null}
    </section>
  )
}
