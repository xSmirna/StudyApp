import { useEffect, useMemo, useState } from 'react'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { ErrorBanner } from '../components/ErrorBanner'
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
  const [keyword, setKeyword] = useState('')
  const [typeFilter, setTypeFilter] = useState<QuestionType | 'all'>('all')
  const [difficultyFilter, setDifficultyFilter] = useState<Difficulty | 'all'>(
    'all',
  )
  const [includeArchived, setIncludeArchived] = useState(false)
  const [page, setPage] = useState(1)
  const [pendingArchive, setPendingArchive] = useState<Question | null>(null)
  const [pendingDelete, setPendingDelete] = useState<Question | null>(null)
  const [progress, setProgress] = useState<ProgressStats | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

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
      await deleteQuestion(pendingDelete.id)
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

  if (!subject || !chapter || chapter.subjectId !== subjectId) {
    return (
      <section className="page">
        <h1>Chapter not found</h1>
        <button
          type="button"
          onClick={() => onNavigate({ name: 'subject', subjectId })}
        >
          Back to subject
        </button>
      </section>
    )
  }

  return (
    <section className="page">
      <button
        type="button"
        className="linkish"
        onClick={() => onNavigate({ name: 'subject', subjectId })}
      >
        ← Back to {subject.name}
      </button>
      <h1>{chapter.name}</h1>
      <p className="muted">
        Manage questions for this chapter. Text search supports Unicode.
      </p>

      {error ? <ErrorBanner message={error} onDismiss={() => setError(null)} /> : null}

      {progress ? (
        <div className="panel">
          <h2>Chapter progress</h2>
          <ul className="plain-list">
            <li>
              Attempted {progress.attemptedQuestions} of{' '}
              {progress.activeQuestions} active questions
            </li>
            <li>Correct attempt records: {progress.correctAttempts}</li>
            <li>Overdue for review: {progress.overdueQuestions}</li>
          </ul>
        </div>
      ) : null}

      <div className="panel-header">
        <h2>Questions ({filtered.length})</h2>
        <div className="row-actions">
          <button
            type="button"
            onClick={() =>
              onNavigate({
                name: 'quiz-setup',
                subjectId,
                mode: 'learn',
                chapterId,
              })
            }
          >
            Learn chapter
          </button>
          <button
            type="button"
            onClick={() =>
              onNavigate({
                name: 'question-new',
                subjectId,
                chapterId,
              })
            }
          >
            Add question
          </button>
        </div>
      </div>

      <div className="filter-bar">
        <label htmlFor="question-search">Search</label>
        <input
          id="question-search"
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          placeholder="Filter by question text"
          autoComplete="off"
        />

        <label htmlFor="type-filter">Type</label>
        <select
          id="type-filter"
          value={typeFilter}
          onChange={(event) =>
            setTypeFilter(event.target.value as QuestionType | 'all')
          }
        >
          <option value="all">All types</option>
          {ALL_QUESTION_TYPES.map((value) => (
            <option key={value} value={value}>
              {QUESTION_TYPE_LABELS[value]}
            </option>
          ))}
        </select>

        <label htmlFor="difficulty-filter">Difficulty</label>
        <select
          id="difficulty-filter"
          value={difficultyFilter}
          onChange={(event) =>
            setDifficultyFilter(event.target.value as Difficulty | 'all')
          }
        >
          <option value="all">All difficulties</option>
          {ALL_DIFFICULTIES.map((value) => (
            <option key={value} value={value}>
              {DIFFICULTY_LABELS[value]}
            </option>
          ))}
        </select>

        <label>
          <input
            type="checkbox"
            checked={includeArchived}
            onChange={(event) => setIncludeArchived(event.target.checked)}
          />{' '}
          Show archived
        </label>
      </div>

      {pagination.pageItems.length === 0 ? (
        <p className="muted">No questions match the current filters.</p>
      ) : null}

      <ul className="entity-list">
        {pagination.pageItems.map((question) => (
          <li key={question.id} className="entity-row">
            <div>
              <strong>{question.text}</strong>
              <p className="muted">
                {QUESTION_TYPE_LABELS[question.type]} ·{' '}
                {DIFFICULTY_LABELS[question.difficulty]}
                {question.archivedAt ? ' · Archived' : ''}
              </p>
            </div>
            <div className="row-actions">
              <button
                type="button"
                onClick={() =>
                  onNavigate({
                    name: 'question-edit',
                    subjectId,
                    chapterId,
                    questionId: question.id,
                  })
                }
              >
                Edit
              </button>
              {question.archivedAt ? (
                <button
                  type="button"
                  onClick={() => void restoreQuestion(question.id).then(refresh)}
                >
                  Restore
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setPendingArchive(question)}
                >
                  Archive
                </button>
              )}
              <button
                type="button"
                className="danger"
                onClick={() => setPendingDelete(question)}
              >
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>

      {filtered.length > QUESTIONS_PAGE_SIZE ? (
        <div className="pagination">
          <button
            type="button"
            disabled={pagination.page <= 1}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
          >
            Previous
          </button>
          <span>
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <button
            type="button"
            disabled={pagination.page >= pagination.totalPages}
            onClick={() =>
              setPage((current) =>
                Math.min(pagination.totalPages, current + 1),
              )
            }
          >
            Next
          </button>
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
    </section>
  )
}
