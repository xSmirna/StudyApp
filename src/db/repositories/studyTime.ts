import { toLocalDateKey } from '../../domain/spacedRepetition'
import {
  summarizeStudyTime,
  type DailyStudyTime,
  type StudyTimeSnapshot,
} from '../../domain/studyTime'
import { db } from '../database'

export async function listDailyStudyTimes(): Promise<DailyStudyTime[]> {
  return db.dailyStudyTime.orderBy('localDate').toArray()
}

export async function getDailyStudyTime(
  localDate: string,
): Promise<DailyStudyTime | undefined> {
  return db.dailyStudyTime.get(localDate)
}

export async function addStudySeconds(
  seconds: number,
  now: Date = new Date(),
): Promise<DailyStudyTime> {
  if (seconds <= 0) {
    const localDate = toLocalDateKey(now)
    const existing = await db.dailyStudyTime.get(localDate)
    return existing ?? { localDate, seconds: 0 }
  }

  const localDate = toLocalDateKey(now)
  const existing = await db.dailyStudyTime.get(localDate)
  const updated: DailyStudyTime = {
    localDate,
    seconds: (existing?.seconds ?? 0) + seconds,
  }
  await db.dailyStudyTime.put(updated)
  return updated
}

export async function getStudyTimeSnapshot(
  now: Date = new Date(),
): Promise<StudyTimeSnapshot> {
  const rows = await listDailyStudyTimes()
  return summarizeStudyTime(rows, now)
}
