import { describe, expect, it } from 'vitest'
import {
  evaluateAchievements,
  hasRecordBreaker,
  hasThreeDayStreak,
} from './achievements'
import type { QuestionAttempt, QuizSession } from './quizTypes'

function session(
  partial: Partial<QuizSession> & Pick<QuizSession, 'id' | 'mode'>,
): QuizSession {
  return {
    subjectId: 's1',
    subjectNameSnapshot: 'Subject',
    chapterIds: ['c1'],
    chapterNameSnapshots: { c1: 'Chapter' },
    status: 'completed',
    startedAt: '2026-11-13T10:00:00.000Z',
    completedAt: '2026-11-13T10:10:00.000Z',
    settings: {
      seed: 1,
      questionIds: ['q1'],
      optionOrders: {},
      currentIndex: 0,
      questionCount: 'all',
      chapterIds: ['c1'],
    },
    ...partial,
  }
}

describe('achievement rules', () => {
  it('unlocks First Quiz and Perfect Exam from completed sessions', () => {
    const completed = [
      session({
        id: 'exam1',
        mode: 'exam',
        settings: {
          seed: 1,
          questionIds: ['q1', 'q2'],
          optionOrders: {},
          currentIndex: 0,
          questionCount: 2,
          chapterIds: ['c1'],
        },
      }),
    ]
    const attempts: QuestionAttempt[] = [
      {
        id: 'a1',
        sessionId: 'exam1',
        questionId: 'q1',
        questionTextSnapshot: 'Q1',
        questionType: 'true_false',
        difficulty: 'easy',
        automaticResult: 'correct',
        answeredAt: '2026-11-13T10:01:00.000Z',
      },
      {
        id: 'a2',
        sessionId: 'exam1',
        questionId: 'q2',
        questionTextSnapshot: 'Q2',
        questionType: 'short_answer',
        difficulty: 'easy',
        writtenSelfAssessment: 'correct',
        answeredAt: '2026-11-13T10:02:00.000Z',
      },
    ]

    const unlocked = evaluateAchievements({
      completedSessions: completed,
      attempts,
      dailyStudyTimes: [],
      activeQuestionsByChapter: { c1: ['q1', 'q2'] },
      alreadyUnlocked: new Set(),
    })

    expect(unlocked).toContain('first_quiz')
    expect(unlocked).toContain('perfect_exam')
    expect(unlocked).toContain('chapter_complete')
  })

  it('is idempotent when achievements are already unlocked', () => {
    const unlocked = evaluateAchievements({
      completedSessions: [session({ id: 's', mode: 'learn' })],
      attempts: [],
      dailyStudyTimes: [],
      activeQuestionsByChapter: {},
      alreadyUnlocked: new Set(['first_quiz']),
    })
    expect(unlocked).not.toContain('first_quiz')
  })

  it('detects a three-day streak of at least 5 minutes', () => {
    expect(
      hasThreeDayStreak(
        [
          { localDate: '2026-11-11', seconds: 300 },
          { localDate: '2026-11-12', seconds: 300 },
          { localDate: '2026-11-13', seconds: 300 },
        ],
        new Date('2026-11-13T12:00:00'),
      ),
    ).toBe(true)

    expect(
      hasThreeDayStreak(
        [
          { localDate: '2026-11-11', seconds: 299 },
          { localDate: '2026-11-12', seconds: 300 },
          { localDate: '2026-11-13', seconds: 300 },
        ],
        new Date('2026-11-13T12:00:00'),
      ),
    ).toBe(false)
  })

  it('requires two consecutive record-setting days for Record Breaker', () => {
    expect(
      hasRecordBreaker([
        { localDate: '2026-11-10', seconds: 100 },
        { localDate: '2026-11-11', seconds: 200 }, // new record over 100
        { localDate: '2026-11-12', seconds: 250 }, // exceeds day1 record
      ]),
    ).toBe(true)

    expect(
      hasRecordBreaker([
        { localDate: '2026-11-10', seconds: 300 },
        { localDate: '2026-11-11', seconds: 200 }, // not a record
        { localDate: '2026-11-12', seconds: 250 }, // still below 300
      ]),
    ).toBe(false)

    expect(
      hasRecordBreaker([
        { localDate: '2026-11-10', seconds: 100 },
        { localDate: '2026-11-12', seconds: 300 }, // not consecutive
      ]),
    ).toBe(false)
  })
})
