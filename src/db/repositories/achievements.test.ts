import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createChapter } from './chapters'
import { createQuestion } from './questions'
import { createSubject } from './subjects'
import { db } from '../database'
import { evaluateAndStoreAchievements, listUnlockedAchievements } from './achievements'
import { completeQuizSession, createQuizSession } from './quizSessions'
import { addStudySeconds } from './studyTime'
import { submitAnswer } from './quizSessions'
import type { QuizQuestionPayload } from '../../domain/quizTypes'

describe('achievement persistence', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
  })

  afterEach(async () => {
    db.close()
    await db.delete()
  })

  it('stores unlocks once even if reprocessed', async () => {
    const subject = await createSubject({ name: 'Math' })
    const chapter = await createChapter({
      subjectId: subject.id,
      name: 'Algebra',
    })
    const question = await createQuestion({
      chapterId: chapter.id,
      type: 'true_false',
      text: '2+2=4',
      difficulty: 'easy',
      correctBoolean: true,
    })

    const session = await createQuizSession({
      subjectId: subject.id,
      subjectNameSnapshot: subject.name,
      chapterIds: [chapter.id],
      chapterNameSnapshots: { [chapter.id]: chapter.name },
      mode: 'learn',
      settings: {
        seed: 1,
        questionIds: [question.id],
        optionOrders: {},
        currentIndex: 0,
        questionCount: 'all',
        chapterIds: [chapter.id],
      },
    })

    const payload: QuizQuestionPayload = {
      id: question.id,
      chapterId: chapter.id,
      type: 'true_false',
      text: question.text,
      difficulty: 'easy',
      correctBoolean: true,
      options: [],
    }

    await submitAnswer({
      sessionId: session.id,
      question: payload,
      selectedBoolean: true,
    })
    await completeQuizSession(session.id)

    const first = await listUnlockedAchievements()
    expect(first.map((item) => item.achievementId)).toContain('first_quiz')

    await evaluateAndStoreAchievements()
    await evaluateAndStoreAchievements()
    const second = await listUnlockedAchievements()
    expect(second.filter((item) => item.achievementId === 'first_quiz')).toHaveLength(
      1,
    )
  })

  it('can unlock streak achievements from study-time rows', async () => {
    await addStudySeconds(300, new Date('2026-11-11T12:00:00'))
    // Force specific local dates by writing rows directly for determinism
    await db.dailyStudyTime.bulkPut([
      { localDate: '2026-11-11', seconds: 300 },
      { localDate: '2026-11-12', seconds: 300 },
      { localDate: '2026-11-13', seconds: 300 },
    ])

    const unlocked = await evaluateAndStoreAchievements()
    expect(unlocked.map((item) => item.achievementId)).toContain(
      'three_day_streak',
    )
  })
})
