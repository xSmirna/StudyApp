import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { CreamButton } from '../components/CreamButton'
import { ErrorBanner } from '../components/ErrorBanner'
import { QuestionEditorDialog } from '../components/QuestionEditorDialog'
import { getChapter } from '../db/repositories/chapters'
import {
  archiveQuestion,
  deleteQuestion,
  listQuestionsByChapter,
  restoreQuestion,
} from '../db/repositories/questions'
import { getSubject } from '../db/repositories/subjects'
import {
  QUESTIONS_PAGE_SIZE,
  filterQuestions,
  paginateItems,
} from '../domain/questionFilter'
import type {
  Chapter,
  Difficulty,
  Question,
  QuestionType,
  Subject,
} from '../domain/types'
import {
  ALL_DIFFICULTIES,
  ALL_QUESTION_TYPES,
  DIFFICULTY_LABELS,
  QUESTION_TYPE_LABELS,
} from '../domain/types'
import type { Route } from '../navigation'
import {
  ensureConstellationDust,
  removeConstellationDust,
  dustPatternToStyle,
  type ConstellationDustPattern,
} from '../services/constellationDust'
import { getChapterProgress, type ProgressStats } from '../services/statistics'
import { toUserMessage } from '../services/errors'

interface ChapterDetailPageProps {
  subjectId: string
  chapterId: string
  onNavigate: (route: Route) => void
}

export function ChapterDetailPage({
  subjectId,
  chapterId,
  onNavigate,
}: ChapterDetailPageProps) {
  const [subject, setSubject] = useState<Subject | null>(null)
  const [chapter, setChapter] = useState<Chapter | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [dustByQuestion, setDustByQuestion] = useState<
    Record<string, ConstellationDustPattern>
  >({})
  const [keyword, setKeyword] = useState('')
  const [typeFilter, setTypeFilter] = useState<QuestionType | 'all'>('all')
  const [difficultyFilter, setDifficultyFilter] = useState<Difficulty | 'all'>(
    'all',
  )
  const [includeArchived, setIncludeArchived] = useState(false)
  const [page, setPage] = useState(1)
  const [pendingArchive, setPendingArchive] = useState<Question | null>(null)
  const [pendingDelete, setPendingDelete] = useState<Question | null>(null)
  const [creatingQuestion, setCreatingQuestion] = useState(false)
  const [progress, setProgress] = useState<ProgressStats | null>(null)
  const [progressCollapsed, setProgressCollapsed] = useState(false)
  const [infoOpen, setInfoOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [trailPath, setTrailPath] = useState('')
  const [trailViewBox, setTrailViewBox] = useState('0 0 80 200')
  const flowRef = useRef<HTMLDivElement>(null)
  const backButtonRef = useRef<HTMLButtonElement>(null)
  const addQuestionButtonRef = useRef<HTMLButtonElement>(null)

  function syncDustPatterns(items: Question[]) {
    const next: Record<string, ConstellationDustPattern> = {}
    for (const question of items) {
      next[question.id] = ensureConstellationDust(question.id)
    }
    setDustByQuestion(next)
  }

  async function refresh() {
    const [nextSubject, nextChapter, nextQuestions, nextProgress] =
      await Promise.all([
        getSubject(subjectId),
        getChapter(chapterId),
        listQuestionsByChapter(chapterId, { includeArchived: true }),
        getChapterProgress(chapterId),
      ])
    setSubject(nextSubject ?? null)
    setChapter(nextChapter ?? null)
    setQuestions(nextQuestions)
    setProgress(nextProgress)
    syncDustPatterns(nextQuestions)
  }

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const [nextSubject, nextChapter, nextQuestions, nextProgress] =
          await Promise.all([
            getSubject(subjectId),
            getChapter(chapterId),
            listQuestionsByChapter(chapterId, { includeArchived: true }),
            getChapterProgress(chapterId),
          ])
        if (!cancelled) {
          setSubject(nextSubject ?? null)
          setChapter(nextChapter ?? null)
          setQuestions(nextQuestions)
          setProgress(nextProgress)
          syncDustPatterns(nextQuestions)
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
  }, [subjectId, chapterId])

  useEffect(() => {
    setPage(1)
  }, [keyword, typeFilter, difficultyFilter, includeArchived])

  const filtered = useMemo(
    () =>
      filterQuestions(questions, {
        keyword,
        type: typeFilter,
        difficulty: difficultyFilter,
        includeArchived,
      }),
    [questions, keyword, typeFilter, difficultyFilter, includeArchived],
  )

  const pagination = paginateItems(filtered, page, QUESTIONS_PAGE_SIZE)
  const showConstellation = pagination.pageItems.length > 0

  async function confirmArchive() {
    if (!pendingArchive) return
    try {
      await archiveQuestion(pendingArchive.id)
      setPendingArchive(null)
      setError(null)
      await refresh()
    } catch (err) {
      setError(toUserMessage(err))
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return
    try {
      const deletedId = pendingDelete.id
      await deleteQuestion(deletedId)
      removeConstellationDust(deletedId)
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
      const plus = addQuestionButtonRef.current
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
  }, [progressCollapsed, infoOpen, filtered.length, chapter?.name, loading])

  if (loading) {
    return (
      <section className="page">
        <p>Loading…</p>
      </section>
    )
  }

  if (!subject || !chapter || chapter.subjectId !== subjectId) {
    return (
      <section className="page">
        <h1>Chapter not found</h1>
        <CreamButton onClick={() => onNavigate({ name: 'subject', subjectId })}>
          Back to subject
        </CreamButton>
      </section>
    )
  }

  const progressTitle = `${chapter.name} progress`

  return (
    <section className="page subjects-page">
      {error ? <ErrorBanner message={error} onDismiss={() => setError(null)} /> : null}

      <div className="subject-flow" ref={flowRef}>
        <div className="progress-quiz-row">
          <CreamButton
            ref={backButtonRef}
            iconOnly
            className="progress-back-button"
            aria-label={`Back to ${subject.name}`}
            title={`Back to ${subject.name}`}
            onClick={() => onNavigate({ name: 'subject', subjectId })}
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
                <div className="info-button-wrap">
                  <CreamButton
                    iconOnly
                    className="progress-collapse-button"
                    aria-label="Chapter info"
                    aria-expanded={infoOpen}
                    title="Info"
                    onClick={() => setInfoOpen((open) => !open)}
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
                        d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"
                      />
                    </svg>
                  </CreamButton>
                  {infoOpen ? (
                    <div className="info-popover" role="note">
                      Manage questions for this chapter. Text search supports
                      Unicode.
                    </div>
                  ) : null}
                </div>
              </div>
              {!progressCollapsed ? (
                progress ? (
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
                )
              ) : null}
            </div>
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
          <h2 className="section-title">Questions ({filtered.length})</h2>
          <CreamButton
            ref={addQuestionButtonRef}
            iconOnly
            aria-label="Add question"
            title="Add question"
            onClick={() => setCreatingQuestion(true)}
          >
            +
          </CreamButton>
        </div>
      </div>

      <div className="panel grove-panel filter-panel">
        <div className="filter-bar">
          <label className="sr-only" htmlFor="question-search">
            Search
          </label>
          <input
            id="question-search"
            className="filter-search"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="search by title"
            autoComplete="off"
          />

          <label className="sr-only" htmlFor="type-filter">
            Type
          </label>
          <select
            id="type-filter"
            className="filter-select"
            value={typeFilter}
            onChange={(event) =>
              setTypeFilter(event.target.value as QuestionType | 'all')
            }
            aria-label="Type"
          >
            <option value="all">All types</option>
            {ALL_QUESTION_TYPES.map((value) => (
              <option key={value} value={value}>
                {QUESTION_TYPE_LABELS[value]}
              </option>
            ))}
          </select>

          <label className="sr-only" htmlFor="difficulty-filter">
            Difficulty
          </label>
          <select
            id="difficulty-filter"
            className="filter-select"
            value={difficultyFilter}
            onChange={(event) =>
              setDifficultyFilter(event.target.value as Difficulty | 'all')
            }
            aria-label="Difficulty"
          >
            <option value="all">All difficulties</option>
            {ALL_DIFFICULTIES.map((value) => (
              <option key={value} value={value}>
                {DIFFICULTY_LABELS[value]}
              </option>
            ))}
          </select>

          <label className="filter-toggle" title="Show archived">
            <span className="sr-only">Show archived</span>
            <input
              type="checkbox"
              checked={includeArchived}
              onChange={(event) => setIncludeArchived(event.target.checked)}
            />
            <span className="filter-toggle-track" aria-hidden="true">
              <span className="filter-toggle-thumb" />
            </span>
            <span className="filter-toggle-label">Archived</span>
          </label>
        </div>
      </div>

      {!showConstellation ? (
        <p className="muted">No questions match the current filters.</p>
      ) : null}

      {showConstellation ? (
        <div className="constellation-tree">
          <div className="constellation-spine" aria-hidden="true">
            <span className="constellation-dust" />
          </div>

          <ul className="entity-list subject-list">
            {pagination.pageItems.map((question) => (
              <li key={question.id} className="subject-item">
                <span className="constellation-branch" aria-hidden="true">
                  <span className="constellation-branch-line">
                    <span
                      className="constellation-branch-dust"
                      style={
                        dustPatternToStyle(
                          dustByQuestion[question.id] ??
                            ensureConstellationDust(question.id),
                        ) as CSSProperties
                      }
                    />
                  </span>
                </span>

                <div
                  className="entity-row subject-row forest-panel subject-card"
                  role="link"
                  tabIndex={0}
                  aria-label={`Edit question ${question.text}`}
                  onClick={() =>
                    onNavigate({
                      name: 'question-edit',
                      subjectId,
                      chapterId,
                      questionId: question.id,
                    })
                  }
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      onNavigate({
                        name: 'question-edit',
                        subjectId,
                        chapterId,
                        questionId: question.id,
                      })
                    }
                  }}
                >
                  <span className="constellation-node" aria-hidden="true" />
                  <div>
                    <span className="entity-title">{question.text}</span>
                    <p className="muted entity-subtitle">
                      {QUESTION_TYPE_LABELS[question.type]} ·{' '}
                      {DIFFICULTY_LABELS[question.difficulty]}
                      {question.archivedAt ? ' · Archived' : ''}
                    </p>
                  </div>
                  <div
                    className="row-actions"
                    onClick={(event) => event.stopPropagation()}
                    onKeyDown={(event) => event.stopPropagation()}
                  >
                    <CreamButton
                      iconOnly
                      aria-label={`Edit ${question.text}`}
                      title="Edit"
                      onClick={() =>
                        onNavigate({
                          name: 'question-edit',
                          subjectId,
                          chapterId,
                          questionId: question.id,
                        })
                      }
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
                    {question.archivedAt ? (
                      <CreamButton
                        iconOnly
                        aria-label={`Restore ${question.text}`}
                        title="Restore"
                        onClick={() =>
                          void restoreQuestion(question.id).then(refresh)
                        }
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
                            d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6a6 6 0 0 1-9.33 5 1 1 0 1 0-1.5 1.32A8 8 0 0 0 20 13c0-4.42-3.58-8-8-8z"
                          />
                        </svg>
                      </CreamButton>
                    ) : (
                      <CreamButton
                        iconOnly
                        aria-label={`Archive ${question.text}`}
                        title="Archive"
                        onClick={() => setPendingArchive(question)}
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
                            d="M20.54 5.23 19.15 3.55A1.5 1.5 0 0 0 17.96 3H6.04a1.5 1.5 0 0 0-1.19.55L3.46 5.23A1.5 1.5 0 0 0 3 6.5V8a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V6.5c0-.47-.18-.92-.46-1.27zM5.12 5l.78-.95h12.2l.78.95H5.12zM5 10v9a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-9H5zm4 2h6v2H9v-2z"
                          />
                        </svg>
                      </CreamButton>
                    )}
                    <CreamButton
                      iconOnly
                      aria-label={`Delete ${question.text}`}
                      title="Delete"
                      onClick={() => setPendingDelete(question)}
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
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {filtered.length > QUESTIONS_PAGE_SIZE ? (
        <div className="pagination">
          <CreamButton
            disabled={pagination.page <= 1}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
          >
            Previous
          </CreamButton>
          <span>
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <CreamButton
            disabled={pagination.page >= pagination.totalPages}
            onClick={() =>
              setPage((current) => Math.min(pagination.totalPages, current + 1))
            }
          >
            Next
          </CreamButton>
        </div>
      ) : null}

      {pendingArchive ? (
        <ConfirmDialog
          title="Archive question?"
          message="Archived questions stay in history later, but will not appear in new quizzes."
          confirmLabel="Archive"
          onConfirm={() => void confirmArchive()}
          onCancel={() => setPendingArchive(null)}
        />
      ) : null}

      {pendingDelete ? (
        <ConfirmDialog
          title="Delete question permanently?"
          message="This permanently removes the question and its options from this browser profile."
          onConfirm={() => void confirmDelete()}
          onCancel={() => setPendingDelete(null)}
        />
      ) : null}

      {creatingQuestion ? (
        <QuestionEditorDialog
          chapterId={chapterId}
          onCancel={() => setCreatingQuestion(false)}
          onCreated={async () => {
            setCreatingQuestion(false)
            setError(null)
            await refresh()
          }}
        />
      ) : null}
    </section>
  )
}
