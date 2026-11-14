import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
} from 'react'
import { ChapterLearnDialog } from '../components/ChapterLearnDialog'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { CreamButton } from '../components/CreamButton'
import { ErrorBanner } from '../components/ErrorBanner'
import { ProgressRadarChart } from '../components/ProgressRadarChart'
import {
  createChapter,
  deleteChapter,
  listChaptersBySubject,
  updateChapter,
} from '../db/repositories/chapters'
import { db } from '../db/database'
import { getSubject } from '../db/repositories/subjects'
import type { Chapter, Subject } from '../domain/types'
import type { Route } from '../navigation'
import {
  createConstellationDustPattern,
  dustPatternToStyle,
  ensureConstellationDust,
  removeConstellationDust,
  saveConstellationDust,
  type ConstellationDustPattern,
} from '../services/constellationDust'
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
  const [dustByChapter, setDustByChapter] = useState<
    Record<string, ConstellationDustPattern>
  >({})
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [pendingDelete, setPendingDelete] = useState<Chapter | null>(null)
  const [learnChapter, setLearnChapter] = useState<Chapter | null>(null)
  const [questionCounts, setQuestionCounts] = useState<Record<string, number>>(
    {},
  )
  const [progress, setProgress] = useState<ProgressStats | null>(null)
  const [progressCollapsed, setProgressCollapsed] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [trailPath, setTrailPath] = useState<string>('')
  const [trailViewBox, setTrailViewBox] = useState('0 0 80 200')
  const flowRef = useRef<HTMLDivElement>(null)
  const backButtonRef = useRef<HTMLButtonElement>(null)
  const addChapterButtonRef = useRef<HTMLButtonElement>(null)

  function syncDustPatterns(items: Chapter[]) {
    const next: Record<string, ConstellationDustPattern> = {}
    for (const chapter of items) {
      next[chapter.id] = ensureConstellationDust(chapter.id)
    }
    setDustByChapter(next)
  }

  async function loadQuestionCounts(items: Chapter[]) {
    const counts: Record<string, number> = {}
    for (const chapter of items) {
      const questions = await db.questions
        .where('chapterId')
        .equals(chapter.id)
        .toArray()
      counts[chapter.id] = questions.filter((question) => !question.archivedAt)
        .length
    }
    setQuestionCounts(counts)
  }

  async function refresh() {
    const [nextSubject, nextChapters, nextProgress] = await Promise.all([
      getSubject(subjectId),
      listChaptersBySubject(subjectId),
      getSubjectProgress(subjectId),
    ])
    setSubject(nextSubject ?? null)
    setChapters(nextChapters)
    setProgress(nextProgress)
    syncDustPatterns(nextChapters)
    await loadQuestionCounts(nextChapters)
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
          syncDustPatterns(nextChapters)
          await loadQuestionCounts(nextChapters)
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
      const created = await createChapter({
        subjectId,
        name,
        description,
      })
      const pattern = createConstellationDustPattern()
      saveConstellationDust(created.id, pattern)
      setDustByChapter((prev) => ({ ...prev, [created.id]: pattern }))
      setName('')
      setDescription('')
      setCreating(false)
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
      const deletedId = pendingDelete.id
      await deleteChapter(deletedId)
      removeConstellationDust(deletedId)
      setDustByChapter((prev) => {
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

  useLayoutEffect(() => {
    function updateTrail() {
      const flow = flowRef.current
      const back = backButtonRef.current
      const plus = addChapterButtonRef.current
      if (!flow || !back || !plus) {
        return
      }

      const flowRect = flow.getBoundingClientRect()
      const backRect = back.getBoundingClientRect()
      const plusRect = plus.getBoundingClientRect()

      const x1 = backRect.left + backRect.width / 2 - flowRect.left
      const y1 = backRect.top + backRect.height / 2 - flowRect.top
      const x2 = plusRect.left + plusRect.width / 2 - flowRect.left
      const y2 = plusRect.top + plusRect.height / 2 - flowRect.top

      const dx = x2 - x1
      const dy = y2 - y1
      const midY = y1 + dy * 0.48
      const sway = Math.max(18, Math.min(42, Math.abs(dy) * 0.12))

      const c1x = x1 - sway * 0.85
      const c1y = y1 + dy * 0.22
      const c2x = x1 + dx * 0.35 + sway
      const c2y = midY
      const c3x = x2 + sway * 0.55
      const c3y = y1 + dy * 0.72

      setTrailViewBox(
        `0 0 ${Math.max(flowRect.width, x2 + 40)} ${Math.max(flowRect.height, y2 + 20)}`,
      )
      setTrailPath(
        [
          `M ${x1.toFixed(1)} ${y1.toFixed(1)}`,
          `C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${(x1 + dx * 0.52).toFixed(1)} ${midY.toFixed(1)}`,
          `S ${c3x.toFixed(1)} ${c3y.toFixed(1)}, ${x2.toFixed(1)} ${y2.toFixed(1)}`,
        ].join(' '),
      )
    }

    updateTrail()
    window.addEventListener('resize', updateTrail)
    return () => window.removeEventListener('resize', updateTrail)
  }, [progressCollapsed, creating, chapters.length, subject?.name, loading])

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
        <CreamButton onClick={() => onNavigate({ name: 'subjects' })}>
          Back to subjects
        </CreamButton>
      </section>
    )
  }

  const progressTitle = `${subject.name} progress`
  const showConstellation = chapters.length > 0

  return (
    <section className="page subjects-page">
      {error ? <ErrorBanner message={error} onDismiss={() => setError(null)} /> : null}

      <div className="subject-flow" ref={flowRef}>
        <div className="progress-quiz-row">
          <CreamButton
            ref={backButtonRef}
            iconOnly
            className="progress-back-button"
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

          <div
            className={[
              'panel',
              'grove-panel',
              'progress-quiz-panel',
              progressCollapsed ? 'is-collapsed' : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            <div className="progress-quiz-main">
              <div className="panel-title-row">
                <h1 className="panel-inline-title">{progressTitle}</h1>
                <CreamButton
                  iconOnly
                  className="progress-collapse-button"
                  aria-label={
                    progressCollapsed
                      ? 'Show progress details'
                      : 'Hide progress details'
                  }
                  aria-expanded={!progressCollapsed}
                  title={progressCollapsed ? 'Expand' : 'Collapse'}
                  onClick={() => setProgressCollapsed((value) => !value)}
                >
                  <svg
                    viewBox="0 0 24 24"
                    width="18"
                    height="18"
                    aria-hidden="true"
                    focusable="false"
                  >
                    {progressCollapsed ? (
                      <path
                        fill="currentColor"
                        d="M7.41 8.59 12 13.17l4.59-4.58L18 10l-6 6-6-6z"
                      />
                    ) : (
                      <path
                        fill="currentColor"
                        d="M7.41 15.41 12 10.83l4.59 4.58L18 14l-6-6-6 6z"
                      />
                    )}
                  </svg>
                </CreamButton>
              </div>
              {!progressCollapsed ? (
                progress ? (
                  <ProgressRadarChart progress={progress} />
                ) : (
                  <p className="muted">Loading progress…</p>
                )
              ) : null}
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
        </div>

        <div className="progress-chapters-connector" aria-hidden="true">
          {trailPath ? (
            <svg
              className="progress-chapters-path"
              viewBox={trailViewBox}
              preserveAspectRatio="none"
            >
              <path
                className="progress-chapters-stroke"
                d={trailPath}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ) : null}
          <span className="progress-chapters-dust" />
        </div>

        <div className="page-title-row constellation-root chapters-heading">
          <span className="constellation-root-node" aria-hidden="true" />
          <h2 className="section-title">Chapters</h2>
          <CreamButton
            ref={addChapterButtonRef}
            iconOnly
            aria-label={creating ? 'Cancel new chapter' : 'Add chapter'}
            aria-expanded={creating}
            onClick={() => {
              setCreating((open) => !open)
              setError(null)
              if (creating) {
                setName('')
                setDescription('')
              }
            }}
          >
            {creating ? '×' : '+'}
          </CreamButton>
        </div>

      {creating ? (
        <form
          className="stack-form"
          onSubmit={(event) => void handleCreate(event)}
        >
          <label className="sr-only" htmlFor="new-chapter-name">
            Chapter name
          </label>
          <input
            id="new-chapter-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Chapter name"
            autoComplete="off"
            autoFocus
          />
          <label className="sr-only" htmlFor="new-chapter-description">
            Description (optional)
          </label>
          <textarea
            id="new-chapter-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Description (optional)"
            rows={2}
          />
          <CreamButton type="submit">Create</CreamButton>
        </form>
      ) : null}

      {!showConstellation && !creating ? (
        <p className="muted">No chapters yet.</p>
      ) : null}

      {showConstellation ? (
        <div className="constellation-tree">
          <div className="constellation-spine" aria-hidden="true">
            <span className="constellation-dust" />
          </div>

          <ul className="entity-list subject-list">
            {chapters.map((chapter) => {
              const isEditing = editingId === chapter.id

              return (
                <li key={chapter.id} className="subject-item">
                  <span className="constellation-branch" aria-hidden="true">
                    <span className="constellation-branch-line">
                      <span
                        className="constellation-branch-dust"
                        style={
                          dustPatternToStyle(
                            dustByChapter[chapter.id] ??
                              ensureConstellationDust(chapter.id),
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
                      isEditing ? undefined : `Open chapter ${chapter.name}`
                    }
                    onClick={
                      isEditing
                        ? undefined
                        : () =>
                            onNavigate({
                              name: 'chapter',
                              subjectId,
                              chapterId: chapter.id,
                            })
                    }
                    onKeyDown={
                      isEditing
                        ? undefined
                        : (event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault()
                              onNavigate({
                                name: 'chapter',
                                subjectId,
                                chapterId: chapter.id,
                              })
                            }
                          }
                    }
                  >
                    <span className="constellation-node" aria-hidden="true" />

                    {isEditing ? (
                      <div
                        className="stack-form"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <label
                          className="sr-only"
                          htmlFor={`edit-chapter-name-${chapter.id}`}
                        >
                          Name
                        </label>
                        <input
                          id={`edit-chapter-name-${chapter.id}`}
                          value={editName}
                          onChange={(event) => setEditName(event.target.value)}
                        />
                        <label
                          className="sr-only"
                          htmlFor={`edit-chapter-description-${chapter.id}`}
                        >
                          Description
                        </label>
                        <textarea
                          id={`edit-chapter-description-${chapter.id}`}
                          value={editDescription}
                          onChange={(event) =>
                            setEditDescription(event.target.value)
                          }
                          rows={2}
                        />
                        <div className="row-actions">
                          <CreamButton
                            onClick={() => void handleSaveEdit(chapter.id)}
                          >
                            Save
                          </CreamButton>
                          <CreamButton
                            onClick={() => {
                              setEditingId(null)
                              setEditName('')
                              setEditDescription('')
                            }}
                          >
                            Cancel
                          </CreamButton>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div>
                          <span
                            className="entity-title"
                            data-full-title={chapter.name}
                            title={chapter.name}
                          >
                            {chapter.name}
                          </span>
                          {chapter.description ? (
                            <p className="muted entity-subtitle">
                              {chapter.description}
                            </p>
                          ) : null}
                        </div>
                        <div
                          className="row-actions"
                          onClick={(event) => event.stopPropagation()}
                          onKeyDown={(event) => event.stopPropagation()}
                        >
                          <CreamButton
                            aria-label={`Learn ${chapter.name}`}
                            title="Learn this chapter"
                            onClick={() => setLearnChapter(chapter)}
                          >
                            Learn this chapter
                          </CreamButton>
                          <CreamButton
                            iconOnly
                            aria-label={`Edit ${chapter.name}`}
                            title="Edit"
                            onClick={() => {
                              setEditingId(chapter.id)
                              setEditName(chapter.name)
                              setEditDescription(chapter.description ?? '')
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
                            aria-label={`Delete ${chapter.name}`}
                            title="Delete"
                            onClick={() => setPendingDelete(chapter)}
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
      </div>

      {pendingDelete ? (
        <ConfirmDialog
          title="Delete chapter?"
          message={`Delete "${pendingDelete.name}"? Its questions and options will also be deleted.`}
          onConfirm={() => void confirmDelete()}
          onCancel={() => setPendingDelete(null)}
        />
      ) : null}

      {learnChapter ? (
        <ChapterLearnDialog
          subjectId={subjectId}
          chapter={learnChapter}
          questionCount={questionCounts[learnChapter.id] ?? 0}
          onCancel={() => setLearnChapter(null)}
          onStarted={(sessionId) => {
            setLearnChapter(null)
            onNavigate({ name: 'quiz-player', sessionId })
          }}
        />
      ) : null}
    </section>
  )
}
