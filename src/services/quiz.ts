import { listChaptersBySubject } from '../db/repositories/chapters'
import { listReviewStatesForQuestions } from '../db/repositories/reviewStates'
import {
  completeQuizSession,
  createQuizSession,
  discardQuizSession,
  getQuizSession,
  listAttemptsForSession,
  listInProgressSessions,
  loadQuizQuestions,
  submitAnswer,
  updateSessionProgress,
} from '../db/repositories/quizSessions'
import { db } from '../db/database'
import { NotFoundError, ValidationError } from '../db/errors'
import { getSubject } from '../db/repositories/subjects'
import { selectQuestionsForQuiz } from '../domain/questionSelection'
import type {
  AttemptOutcome,
  QuizMode,
  QuizQuestionPayload,
  QuizSession,
  QuizSessionSettings,
  SelectionStrategy,
} from '../domain/quizTypes'
import { isMissedOutcome, resolveAttemptOutcome } from '../domain/quizTypes'
import { createSeedFromNow, createSeededRandom, shuffleCopy } from '../domain/shuffle'
import type { Difficulty, QuestionType } from '../domain/types'
import { isChoiceType } from '../domain/types'

export type StartQuizInput = {
  mode: QuizMode
  subjectId: string
  chapterIds: string[]
  questionCount: number | 'all'
  types?: QuestionType[]
  difficulties?: Difficulty[]
  selectionStrategy?: SelectionStrategy
  timerMinutes?: number
  practiceQuestionIds?: string[]
  practiceSourceSessionId?: string
  seed?: number
}

export async function startQuiz(input: StartQuizInput): Promise<{
  session: QuizSession
  questions: QuizQuestionPayload[]
}> {
  const subject = await getSubject(input.subjectId)
  if (!subject) {
    throw new NotFoundError('Subject', input.subjectId)
  }

  const chapters = await listChaptersBySubject(input.subjectId)
  const selectedChapters = chapters.filter((chapter) =>
    input.chapterIds.includes(chapter.id),
  )
  if (selectedChapters.length === 0) {
    throw new ValidationError('Select at least one chapter from this subject.')
  }
  if (selectedChapters.some((chapter) => chapter.subjectId !== input.subjectId)) {
    throw new ValidationError('A quiz cannot combine chapters from different subjects.')
  }

  const seed = input.seed ?? createSeedFromNow()
  const random = createSeededRandom(seed)

  let selectedIds: string[]

  if (input.mode === 'practice_incorrect' && input.practiceQuestionIds) {
    selectedIds = [...input.practiceQuestionIds]
  } else if (input.mode === 'learn') {
    if (selectedChapters.length !== 1) {
      throw new ValidationError('Learn mode uses exactly one chapter.')
    }
    const questions = await db.questions
      .where('chapterId')
      .equals(selectedChapters[0]!.id)
      .toArray()
    const active = questions.filter((question) => !question.archivedAt)
    const ordered =
      input.selectionStrategy === 'balanced_random'
        ? shuffleCopy(active, random)
        : active.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    selectedIds = ordered.map((question) => question.id)
  } else {
    const chapterIdSet = new Set(selectedChapters.map((chapter) => chapter.id))
    const allQuestions = await db.questions.toArray()
    const pool = allQuestions.filter(
      (question) =>
        chapterIdSet.has(question.chapterId) && !question.archivedAt,
    )
    const reviewMap = await listReviewStatesForQuestions(
      pool.map((question) => question.id),
    )
    const strategy: SelectionStrategy =
      input.selectionStrategy ??
      (input.mode === 'revision' ? 'prioritise_due_failed' : 'balanced_random')

    const selected = selectQuestionsForQuiz({
      questions: pool.map((question) => ({
        ...question,
        review: reviewMap.get(question.id),
      })),
      count: input.questionCount,
      seed,
      strategy,
      types: input.types,
      difficulties: input.difficulties,
    })
    selectedIds = selected.map((question) => question.id)
  }

  if (selectedIds.length === 0) {
    throw new ValidationError('No eligible questions match this quiz setup.')
  }

  if (
    input.mode === 'exam' ||
    input.mode === 'custom' ||
    input.mode === 'revision'
  ) {
    if (input.questionCount !== 'all' && typeof input.questionCount === 'number') {
      selectedIds = selectedIds.slice(0, input.questionCount)
    }
  }

  if (input.mode === 'exam' || input.mode === 'custom') {
    selectedIds = shuffleCopy(selectedIds, random)
  }

  const questions = await loadQuizQuestions(selectedIds)
  const optionOrders: Record<string, string[]> = {}
  for (const question of questions) {
    if (isChoiceType(question.type)) {
      const shuffledOptions = shuffleCopy(question.options, random)
      optionOrders[question.id] = shuffledOptions.map((option) => option.id)
    }
  }

  const settings: QuizSessionSettings = {
    seed,
    questionIds: questions.map((question) => question.id),
    optionOrders,
    currentIndex: 0,
    questionCount: input.questionCount,
    chapterIds: selectedChapters.map((chapter) => chapter.id),
    types: input.types,
    difficulties: input.difficulties,
    selectionStrategy: input.selectionStrategy,
    timerMinutes: input.timerMinutes,
    practiceSourceSessionId: input.practiceSourceSessionId,
  }

  const chapterNameSnapshots: Record<string, string> = {}
  for (const chapter of selectedChapters) {
    chapterNameSnapshots[chapter.id] = chapter.name
  }

  const session = await createQuizSession({
    subjectId: subject.id,
    subjectNameSnapshot: subject.name,
    chapterIds: selectedChapters.map((chapter) => chapter.id),
    chapterNameSnapshots,
    mode: input.mode,
    settings,
  })

  return { session, questions }
}

export async function practiceIncorrectFromSession(sessionId: string): Promise<{
  session: QuizSession
  questions: QuizQuestionPayload[]
}> {
  const source = await getQuizSession(sessionId)
  if (!source || source.status !== 'completed') {
    throw new ValidationError('Practice Incorrect requires a completed quiz.')
  }

  const attempts = await listAttemptsForSession(sessionId)
  const missedIds = attempts
    .filter((attempt) => isMissedOutcome(resolveAttemptOutcome(attempt)))
    .map((attempt) => attempt.questionId)

  if (missedIds.length === 0) {
    throw new ValidationError('No incorrect or partially correct questions to practise.')
  }

  return startQuiz({
    mode: 'practice_incorrect',
    subjectId: source.subjectId,
    chapterIds: source.chapterIds,
    questionCount: 'all',
    practiceQuestionIds: missedIds,
    practiceSourceSessionId: source.id,
    selectionStrategy: 'balanced_random',
  })
}

export async function resumeQuiz(sessionId: string): Promise<{
  session: QuizSession
  questions: QuizQuestionPayload[]
  attempts: Awaited<ReturnType<typeof listAttemptsForSession>>
}> {
  const session = await getQuizSession(sessionId)
  if (!session) {
    throw new NotFoundError('QuizSession', sessionId)
  }
  if (session.status !== 'in_progress') {
    throw new ValidationError('Only in-progress quizzes can be resumed.')
  }
  const questions = await loadQuizQuestions(session.settings.questionIds)
  const attempts = await listAttemptsForSession(sessionId)
  return { session, questions, attempts }
}

export {
  completeQuizSession,
  discardQuizSession,
  listInProgressSessions,
  listAttemptsForSession,
  submitAnswer,
  updateSessionProgress,
  getQuizSession,
}

export type AnswerDraft = {
  selectedOptionIds?: string[]
  selectedBoolean?: boolean
  writtenSelfAssessment?: AttemptOutcome
}
