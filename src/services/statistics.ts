import { db } from '../db/database'
import { listUnlockedAchievements } from '../db/repositories/achievements'
import { getStudyTimeSnapshot } from '../db/repositories/studyTime'
import type { AchievementUnlock } from '../domain/achievements'
import type { QuestionAttempt, QuizSession } from '../domain/quizTypes'
import { resolveAttemptOutcome } from '../domain/quizTypes'
import { isOverdue } from '../domain/spacedRepetition'
import type { StudyTimeSnapshot } from '../domain/studyTime'
import { formatDuration } from '../domain/studyTime'

export type SessionSummary = {
  session: QuizSession
  questionCount: number
  correct: number
  partiallyCorrect: number
  incorrect: number
  automaticGraded: number
  selfAssessed: number
}

export type ProgressStats = {
  activeQuestions: number
  attemptedQuestions: number
  correctAttempts: number
  incorrectAttempts: number
  overdueQuestions: number
}

export type ProfileProgressStats = {
  completedQuizzes: number
  totalAttempts: number
  correctAttempts: number
  partiallyCorrectAttempts: number
  incorrectAttempts: number
  activeQuestions: number
  attemptedQuestions: number
}

function summarizeAttempts(attempts: QuestionAttempt[]) {
  let correct = 0
  let partiallyCorrect = 0
  let incorrect = 0
  let automaticGraded = 0
  let selfAssessed = 0

  for (const attempt of attempts) {
    if (attempt.automaticResult) automaticGraded += 1
    if (attempt.writtenSelfAssessment) selfAssessed += 1
    const outcome = resolveAttemptOutcome(attempt)
    if (outcome === 'correct') correct += 1
    else if (outcome === 'partially_correct') partiallyCorrect += 1
    else if (outcome === 'incorrect') incorrect += 1
  }

  return {
    correct,
    partiallyCorrect,
    incorrect,
    automaticGraded,
    selfAssessed,
  }
}

export async function listCompletedSessionSummaries(): Promise<SessionSummary[]> {
  const sessions = await db.quizSessions
    .where('status')
    .equals('completed')
    .toArray()
  sessions.sort((a, b) =>
    (b.completedAt ?? b.startedAt).localeCompare(a.completedAt ?? a.startedAt),
  )

  const summaries: SessionSummary[] = []
  for (const session of sessions) {
    const attempts = await db.questionAttempts
      .where('sessionId')
      .equals(session.id)
      .toArray()
    summaries.push({
      session,
      questionCount: session.settings.questionIds.length,
      ...summarizeAttempts(attempts),
    })
  }
  return summaries
}

export async function getSessionSummary(
  sessionId: string,
): Promise<SessionSummary | undefined> {
  const session = await db.quizSessions.get(sessionId)
  if (!session || session.status !== 'completed') {
    return undefined
  }
  const attempts = await db.questionAttempts
    .where('sessionId')
    .equals(sessionId)
    .toArray()
  return {
    session,
    questionCount: session.settings.questionIds.length,
    ...summarizeAttempts(attempts),
  }
}

export async function getSubjectProgress(
  subjectId: string,
): Promise<ProgressStats> {
  const chapters = await db.chapters.where('subjectId').equals(subjectId).toArray()
  const chapterIds = new Set(
    chapters.filter((chapter) => !chapter.archivedAt).map((chapter) => chapter.id),
  )
  const questions = (await db.questions.toArray()).filter(
    (question) =>
      chapterIds.has(question.chapterId) && !question.archivedAt,
  )
  return progressForQuestions(questions.map((question) => question.id))
}

export async function getChapterProgress(
  chapterId: string,
): Promise<ProgressStats> {
  const questions = await db.questions.where('chapterId').equals(chapterId).toArray()
  const activeIds = questions
    .filter((question) => !question.archivedAt)
    .map((question) => question.id)
  return progressForQuestions(activeIds)
}

async function progressForQuestions(questionIds: string[]): Promise<ProgressStats> {
  const idSet = new Set(questionIds)
  const attempts = await db.questionAttempts.toArray()
  const reviewStates = await db.questionReviewStates.bulkGet(questionIds)
  const attempted = new Set<string>()
  let correctAttempts = 0
  let incorrectAttempts = 0

  for (const attempt of attempts) {
    if (!idSet.has(attempt.questionId)) continue
    attempted.add(attempt.questionId)
    const outcome = resolveAttemptOutcome(attempt)
    if (outcome === 'correct') {
      correctAttempts += 1
    } else if (outcome === 'incorrect') {
      incorrectAttempts += 1
    }
  }

  let overdueQuestions = 0
  for (const state of reviewStates) {
    if (state && isOverdue(state)) {
      overdueQuestions += 1
    }
  }

  return {
    activeQuestions: questionIds.length,
    attemptedQuestions: attempted.size,
    correctAttempts,
    incorrectAttempts,
    overdueQuestions,
  }
}

export async function getProfileProgress(): Promise<ProfileProgressStats> {
  const [questions, attempts, summaries] = await Promise.all([
    db.questions.toArray(),
    db.questionAttempts.toArray(),
    listCompletedSessionSummaries(),
  ])
  const activeIds = questions
    .filter((question) => !question.archivedAt)
    .map((question) => question.id)
  const activeSet = new Set(activeIds)
  const attempted = new Set<string>()
  let correctAttempts = 0
  let partiallyCorrectAttempts = 0
  let incorrectAttempts = 0
  let totalAttempts = 0

  for (const attempt of attempts) {
    if (!activeSet.has(attempt.questionId)) continue
    totalAttempts += 1
    attempted.add(attempt.questionId)
    const outcome = resolveAttemptOutcome(attempt)
    if (outcome === 'correct') correctAttempts += 1
    else if (outcome === 'partially_correct') partiallyCorrectAttempts += 1
    else if (outcome === 'incorrect') incorrectAttempts += 1
  }

  return {
    completedQuizzes: summaries.length,
    totalAttempts,
    correctAttempts,
    partiallyCorrectAttempts,
    incorrectAttempts,
    activeQuestions: activeIds.length,
    attemptedQuestions: attempted.size,
  }
}

export async function listAttemptsForQuestion(
  questionId: string,
): Promise<QuestionAttempt[]> {
  const attempts = await db.questionAttempts
    .where('questionId')
    .equals(questionId)
    .toArray()
  return attempts.sort((a, b) => b.answeredAt.localeCompare(a.answeredAt))
}

export async function getDashboardStats(): Promise<{
  studyTime: StudyTimeSnapshot
  completedQuizzes: number
  recentSessions: SessionSummary[]
  unlocks: AchievementUnlock[]
  profileProgress: ProfileProgressStats
  studyTimeLabels: {
    today: string
    week: string
    total: string
  }
}> {
  const [studyTime, summaries, unlocks, profileProgress] = await Promise.all([
    getStudyTimeSnapshot(),
    listCompletedSessionSummaries(),
    listUnlockedAchievements(),
    getProfileProgress(),
  ])

  return {
    studyTime,
    completedQuizzes: summaries.length,
    recentSessions: summaries.slice(0, 5),
    unlocks,
    profileProgress,
    studyTimeLabels: {
      today: formatDuration(studyTime.todaySeconds),
      week: formatDuration(studyTime.weekSeconds),
      total: formatDuration(studyTime.totalSeconds),
    },
  }
}
