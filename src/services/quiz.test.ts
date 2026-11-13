import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createChapter } from '../db/repositories/chapters'
import { createQuestion } from '../db/repositories/questions'
import {
  getAttemptForQuestion,
  listAttemptsForSession,
} from '../db/repositories/quizSessions'
import { createSubject } from '../db/repositories/subjects'
import { db } from '../db/database'
import {
  completeQuizSession,
  practiceIncorrectFromSession,
  startQuiz,
  submitAnswer,
} from './quiz'

describe('quiz engine integration', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
  })

  afterEach(async () => {
    db.close()
    await db.delete()
  })

  async function seed() {
    const subject = await createSubject({ name: 'Science' })
    const chapterA = await createChapter({
      subjectId: subject.id,
      name: 'Chapter A',
    })
    const chapterB = await createChapter({
      subjectId: subject.id,
      name: 'Chapter B',
    })

    const q1 = await createQuestion({
      chapterId: chapterA.id,
      type: 'single_choice',
      text: 'Pick B',
      difficulty: 'easy',
      options: [
        { text: 'A', isCorrect: false, order: 0 },
        { text: 'B', isCorrect: true, order: 1 },
      ],
    })
    const q2 = await createQuestion({
      chapterId: chapterB.id,
      type: 'true_false',
      text: 'Sky is blue',
      difficulty: 'easy',
      correctBoolean: true,
    })
    const q3 = await createQuestion({
      chapterId: chapterA.id,
      type: 'short_answer',
      text: 'Define cell',
      difficulty: 'medium',
      referenceAnswer: 'Basic unit of life',
    })

    return { subject, chapterA, chapterB, q1, q2, q3 }
  }

  it('learn mode uses one chapter only', async () => {
    const { subject, chapterA, q1, q3 } = await seed()
    const { session, questions } = await startQuiz({
      mode: 'learn',
      subjectId: subject.id,
      chapterIds: [chapterA.id],
      questionCount: 'all',
      seed: 1,
    })
    expect(session.chapterIds).toEqual([chapterA.id])
    expect(questions.map((item) => item.id).sort()).toEqual(
      [q1.id, q3.id].sort(),
    )
  })

  it('revision/exam can use multiple chapters from one subject', async () => {
    const { subject, chapterA, chapterB } = await seed()
    const revision = await startQuiz({
      mode: 'revision',
      subjectId: subject.id,
      chapterIds: [chapterA.id, chapterB.id],
      questionCount: 'all',
      seed: 2,
      selectionStrategy: 'balanced_random',
    })
    expect(revision.questions.length).toBe(3)

    const exam = await startQuiz({
      mode: 'exam',
      subjectId: subject.id,
      chapterIds: [chapterA.id, chapterB.id],
      questionCount: 2,
      seed: 3,
    })
    expect(exam.questions.length).toBe(2)
  })

  it('does not duplicate attempts on repeated submit', async () => {
    const { subject, chapterA, q1 } = await seed()
    const { session, questions } = await startQuiz({
      mode: 'learn',
      subjectId: subject.id,
      chapterIds: [chapterA.id],
      questionCount: 'all',
      seed: 4,
    })
    const question = questions.find((item) => item.id === q1.id)!
    const correctId = question.options.find((option) => option.isCorrect)!.id

    await submitAnswer({
      sessionId: session.id,
      question,
      selectedOptionIds: [correctId],
      shownOptionOrder: question.options.map((option) => option.id),
    })
    await submitAnswer({
      sessionId: session.id,
      question,
      selectedOptionIds: [correctId],
      shownOptionOrder: question.options.map((option) => option.id),
    })

    const attempts = await listAttemptsForSession(session.id)
    const forQuestion = attempts.filter((attempt) => attempt.questionId === q1.id)
    expect(forQuestion).toHaveLength(1)
    expect(forQuestion[0]?.automaticResult).toBe('correct')
  })

  it('Practice Incorrect launches only missed questions', async () => {
    const { subject, chapterA, q1, q3 } = await seed()
    const { session, questions } = await startQuiz({
      mode: 'custom',
      subjectId: subject.id,
      chapterIds: [chapterA.id],
      questionCount: 'all',
      seed: 5,
      selectionStrategy: 'balanced_random',
    })

    const choice = questions.find((item) => item.id === q1.id)!
    const written = questions.find((item) => item.id === q3.id)!
    const wrongId = choice.options.find((option) => !option.isCorrect)!.id

    await submitAnswer({
      sessionId: session.id,
      question: choice,
      selectedOptionIds: [wrongId],
      shownOptionOrder: choice.options.map((option) => option.id),
    })
    await submitAnswer({
      sessionId: session.id,
      question: written,
      writtenSelfAssessment: 'partially_correct',
    })
    await completeQuizSession(session.id)

    const practice = await practiceIncorrectFromSession(session.id)
    expect(practice.questions.map((item) => item.id).sort()).toEqual(
      [q1.id, q3.id].sort(),
    )
    expect(practice.session.mode).toBe('practice_incorrect')
  })

  it('exam hides review-state updates until completion', async () => {
    const { subject, chapterB, q2 } = await seed()
    const { session, questions } = await startQuiz({
      mode: 'exam',
      subjectId: subject.id,
      chapterIds: [chapterB.id],
      questionCount: 'all',
      seed: 6,
    })
    const question = questions[0]!
    await submitAnswer({
      sessionId: session.id,
      question,
      selectedBoolean: true,
    })

    expect(await db.questionReviewStates.get(q2.id)).toBeUndefined()
    await completeQuizSession(session.id)
    const review = await db.questionReviewStates.get(q2.id)
    expect(review?.lastOutcome).toBe('correct')

    const attempt = await getAttemptForQuestion(session.id, q2.id)
    expect(attempt?.automaticResult).toBe('correct')
  })
})
