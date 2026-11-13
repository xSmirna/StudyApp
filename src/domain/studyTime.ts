import { addLocalDays, toLocalDateKey } from './spacedRepetition'

export const IDLE_TIMEOUT_MS = 60_000
export const STREAK_MIN_SECONDS = 5 * 60

export type DailyStudyTime = {
  localDate: string
  seconds: number
}

export type StudyTimeSnapshot = {
  todaySeconds: number
  weekSeconds: number
  totalSeconds: number
}

/** Start of the local calendar week (Monday). */
export function startOfLocalWeek(date: Date): Date {
  const local = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const day = local.getDay() // 0 Sun .. 6 Sat
  const offset = day === 0 ? -6 : 1 - day
  local.setDate(local.getDate() + offset)
  local.setHours(0, 0, 0, 0)
  return local
}

export function localDatesInRangeInclusive(
  start: Date,
  end: Date,
): string[] {
  const dates: string[] = []
  let cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate())
  const last = new Date(end.getFullYear(), end.getMonth(), end.getDate())
  while (cursor.getTime() <= last.getTime()) {
    dates.push(toLocalDateKey(cursor))
    cursor = addLocalDays(cursor, 1)
  }
  return dates
}

export function summarizeStudyTime(
  rows: DailyStudyTime[],
  now: Date = new Date(),
): StudyTimeSnapshot {
  const todayKey = toLocalDateKey(now)
  const weekStart = startOfLocalWeek(now)
  const weekKeys = new Set(
    localDatesInRangeInclusive(weekStart, now),
  )

  let todaySeconds = 0
  let weekSeconds = 0
  let totalSeconds = 0

  for (const row of rows) {
    totalSeconds += row.seconds
    if (row.localDate === todayKey) {
      todaySeconds += row.seconds
    }
    if (weekKeys.has(row.localDate)) {
      weekSeconds += row.seconds
    }
  }

  return { todaySeconds, weekSeconds, totalSeconds }
}

export function formatDuration(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds))
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const rem = seconds % 60
  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }
  if (minutes > 0) {
    return `${minutes}m ${rem}s`
  }
  return `${rem}s`
}

/**
 * Pure helper for wall-clock accrual used by the tracker and tests.
 * Counts elapsed time only while visible+active and before idle timeout.
 */
export function accrueActiveSeconds(input: {
  lastTickAt: number
  now: number
  lastInteractionAt: number
  visible: boolean
  active: boolean
  idleTimeoutMs?: number
}): { seconds: number; stillActive: boolean; nextTickAt: number | null } {
  const idleTimeoutMs = input.idleTimeoutMs ?? IDLE_TIMEOUT_MS
  if (!input.visible || !input.active) {
    return { seconds: 0, stillActive: false, nextTickAt: null }
  }

  const idleDeadline = input.lastInteractionAt + idleTimeoutMs
  if (input.lastTickAt >= idleDeadline) {
    return { seconds: 0, stillActive: false, nextTickAt: null }
  }

  const end = Math.min(input.now, idleDeadline)
  const seconds = Math.max(0, (end - input.lastTickAt) / 1000)
  const stillActive = input.now < idleDeadline
  return {
    seconds,
    stillActive,
    nextTickAt: stillActive ? input.now : null,
  }
}
