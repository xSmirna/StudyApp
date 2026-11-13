import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { ErrorBanner } from '../components/ErrorBanner'
import { listChaptersBySubject } from '../db/repositories/chapters'
import { getSubject } from '../db/repositories/subjects'
import { db } from '../db/database'
import type {
  QuizMode,
  SelectionStrategy,
} from '../domain/quizTypes'
import type {
  Chapter,
  Difficulty,
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
import { startQuiz } from '../services/quiz'
import { toUserMessage } from '../services/errors'

interface QuizSetupPageProps {
  subjectId: string
  mode: QuizMode
  initialChapterId?: string
  onNavigate: (route: Route) => void
}

const MODE_TITLES: Record<QuizMode, string> = {
  learn: 'Learn a chapter',
  revision: 'Revision',
  exam: 'Exam simulation',
  custom: 'Custom session',
  practice_incorrect: 'Practice incorrect',
}

export function QuizSetupPage({
  subjectId,
  mode,
  initialChapterId,
  onNavigate,
}: QuizSetupPageProps) {
  const [subject, setSubject] = useState<Subject | null>(null)
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [eligibleCounts, setEligibleCounts] = useState<Record<string, number>>(
    {},
  )
  const [selectedChapterIds, setSelectedChapterIds] = useState<string[]>(
    initialChapterId ? [initialChapterId] : [],
  )
  const [countMode, setCountMode] = useState<'all' | 'number'>('all')
  const [questionCount, setQuestionCount] = useState(10)
  const [types, setTypes] = useState<QuestionType[]>([])
  const [difficulties, setDifficulties] = useState<Difficulty[]>([])
  const [strategy, setStrategy] = useState<SelectionStrategy>(
    mode === 'revision' ? 'prioritise_due_failed' : 'balanced_random',
  )
  const [timerMinutes, setTimerMinutes] = useState<number | ''>('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [starting, setStarting] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const [nextSubject, nextChapters] = await Promise.all([
          getSubject(subjectId),
          listChaptersBySubject(subjectId),
        ])
        const counts: Record<string, number> = {}
        for (const chapter of nextChapters) {
          const questions = await db.questions
            .where('chapterId')
            .equals(chapter.id)
            .toArray()
          counts[chapter.id] = questions.filter((q) => !q.archivedAt).length
        }
        if (!cancelled) {
          setSubject(nextSubject ?? null)
          setChapters(nextChapters)
          setEligibleCounts(counts)
          if (!initialChapterId && nextChapters[0] && mode === 'learn') {
            setSelectedChapterIds([nextChapters[0].id])
          }
          setError(null)
        }
      } catch (err) {
        if (!cancelled) setError(toUserMessage(err))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [subjectId, initialChapterId, mode])

  const totalEligible = useMemo(() => {
    return selectedChapterIds.reduce(
      (sum, id) => sum + (eligibleCounts[id] ?? 0),
      0,
    )
  }, [selectedChapterIds, eligibleCounts])

  function toggleChapter(chapterId: string) {
    if (mode === 'learn') {
      setSelectedChapterIds([chapterId])
      return
    }
    setSelectedChapterIds((current) =>
      current.includes(chapterId)
        ? current.filter((id) => id !== chapterId)
        : [...current, chapterId],
    )
  }

  function toggleType(type: QuestionType) {
    setTypes((current) =>
      current.includes(type)
        ? current.filter((item) => item !== type)
        : [...current, type],
    )
  }

  function toggleDifficulty(difficulty: Difficulty) {
    setDifficulties((current) =>
      current.includes(difficulty)
        ? current.filter((item) => item !== difficulty)
        : [...current, difficulty],
    )
  }

  async function handleStart(event: FormEvent) {
    event.preventDefault()
    setStarting(true)
    setError(null)
    try {
      const result = await startQuiz({
        mode,
        subjectId,
        chapterIds: selectedChapterIds,
        questionCount: countMode === 'all' ? 'all' : questionCount,
        types: mode === 'custom' && types.length > 0 ? types : undefined,
        difficulties:
          mode === 'custom' && difficulties.length > 0
            ? difficulties
            : undefined,
        selectionStrategy:
          mode === 'revision' || mode === 'custom' ? strategy : undefined,
        timerMinutes:
          mode === 'exam' && timerMinutes !== '' ? Number(timerMinutes) : undefined,
      })
      onNavigate({ name: 'quiz-player', sessionId: result.session.id })
    } catch (err) {
      setError(toUserMessage(err))
    } finally {
      setStarting(false)
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
      <h1>{MODE_TITLES[mode]}</h1>
      <p className="muted">
        Quizzes are limited to one subject. Archived questions are excluded.
      </p>

      {error ? <ErrorBanner message={error} onDismiss={() => setError(null)} /> : null}

      <form className="stack-form" onSubmit={(event) => void handleStart(event)}>
        <fieldset className="option-fieldset">
          <legend>{mode === 'learn' ? 'Chapter' : 'Chapters'}</legend>
          {chapters.map((chapter) => (
            <label key={chapter.id}>
              <input
                type={mode === 'learn' ? 'radio' : 'checkbox'}
                name="chapter"
                checked={selectedChapterIds.includes(chapter.id)}
                onChange={() => toggleChapter(chapter.id)}
              />{' '}
              {chapter.name} ({eligibleCounts[chapter.id] ?? 0} questions)
            </label>
          ))}
        </fieldset>

        {mode !== 'learn' ? (
          <>
            <label htmlFor="count-mode">Question count</label>
            <select
              id="count-mode"
              value={countMode}
              onChange={(event) =>
                setCountMode(event.target.value as 'all' | 'number')
              }
            >
              <option value="all">All eligible ({totalEligible})</option>
              <option value="number">Choose a number</option>
            </select>
            {countMode === 'number' ? (
              <>
                <label htmlFor="question-count">Number of questions</label>
                <input
                  id="question-count"
                  type="number"
                  min={1}
                  max={Math.max(1, totalEligible)}
                  value={questionCount}
                  onChange={(event) =>
                    setQuestionCount(Number(event.target.value))
                  }
                />
              </>
            ) : null}
          </>
        ) : null}

        {mode === 'revision' || mode === 'custom' ? (
          <>
            <label htmlFor="strategy">Selection strategy</label>
            <select
              id="strategy"
              value={strategy}
              onChange={(event) =>
                setStrategy(event.target.value as SelectionStrategy)
              }
            >
              <option value="prioritise_due_failed">
                Prioritise due / previously incorrect
              </option>
              <option value="balanced_random">Balanced / random</option>
            </select>
          </>
        ) : null}

        {mode === 'custom' ? (
          <>
            <fieldset className="option-fieldset">
              <legend>Filter by type (optional)</legend>
              {ALL_QUESTION_TYPES.map((type) => (
                <label key={type}>
                  <input
                    type="checkbox"
                    checked={types.includes(type)}
                    onChange={() => toggleType(type)}
                  />{' '}
                  {QUESTION_TYPE_LABELS[type]}
                </label>
              ))}
            </fieldset>
            <fieldset className="option-fieldset">
              <legend>Filter by difficulty (optional)</legend>
              {ALL_DIFFICULTIES.map((difficulty) => (
                <label key={difficulty}>
                  <input
                    type="checkbox"
                    checked={difficulties.includes(difficulty)}
                    onChange={() => toggleDifficulty(difficulty)}
                  />{' '}
                  {DIFFICULTY_LABELS[difficulty]}
                </label>
              ))}
            </fieldset>
          </>
        ) : null}

        {mode === 'exam' ? (
          <>
            <label htmlFor="timer">Optional timer (minutes)</label>
            <input
              id="timer"
              type="number"
              min={1}
              placeholder="Leave blank for no timer"
              value={timerMinutes}
              onChange={(event) =>
                setTimerMinutes(
                  event.target.value === '' ? '' : Number(event.target.value),
                )
              }
            />
          </>
        ) : null}

        <button type="submit" disabled={starting || selectedChapterIds.length === 0}>
          {starting ? 'Starting…' : 'Start quiz'}
        </button>
      </form>
    </section>
  )
}
