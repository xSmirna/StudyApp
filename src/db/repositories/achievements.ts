import {
  evaluateAchievements,
  getAchievementDefinition,
  type AchievementId,
  type AchievementUnlock,
} from '../../domain/achievements'
import { nowIso } from '../../domain/time'
import { db } from '../database'

export async function listUnlockedAchievements(): Promise<AchievementUnlock[]> {
  const unlocks = await db.achievementUnlocks.toArray()
  return unlocks.sort((a, b) => a.unlockedAt.localeCompare(b.unlockedAt))
}

export async function unlockAchievement(
  achievementId: AchievementId,
): Promise<AchievementUnlock> {
  const existing = await db.achievementUnlocks.get(achievementId)
  if (existing) {
    return existing
  }
  const unlock: AchievementUnlock = {
    achievementId,
    unlockedAt: nowIso(),
  }
  await db.achievementUnlocks.put(unlock)
  return unlock
}

export async function evaluateAndStoreAchievements(): Promise<
  AchievementUnlock[]
> {
  const [
    completedSessions,
    attempts,
    dailyStudyTimes,
    chapters,
    questions,
    existingUnlocks,
  ] = await Promise.all([
    db.quizSessions.where('status').equals('completed').toArray(),
    db.questionAttempts.toArray(),
    db.dailyStudyTime.toArray(),
    db.chapters.toArray(),
    db.questions.toArray(),
    db.achievementUnlocks.toArray(),
  ])

  const activeQuestionsByChapter: Record<string, string[]> = {}
  for (const chapter of chapters) {
    if (chapter.archivedAt) continue
    activeQuestionsByChapter[chapter.id] = questions
      .filter(
        (question) =>
          question.chapterId === chapter.id && !question.archivedAt,
      )
      .map((question) => question.id)
  }

  const alreadyUnlocked = new Set(
    existingUnlocks.map((item) => item.achievementId),
  )
  const newlyEarned = evaluateAchievements({
    completedSessions,
    attempts,
    dailyStudyTimes,
    activeQuestionsByChapter,
    alreadyUnlocked,
  })

  const created: AchievementUnlock[] = []
  for (const id of newlyEarned) {
    // Idempotent write
    const unlock = await unlockAchievement(id)
    if (!alreadyUnlocked.has(id)) {
      created.push(unlock)
    }
  }
  return created
}

export function describeUnlock(unlock: AchievementUnlock) {
  return {
    ...unlock,
    ...getAchievementDefinition(unlock.achievementId),
  }
}
