import { createSeededRandom, shuffleCopy } from './shuffle'
import type { Difficulty, Question } from './types'

export type LearnLevel = 'beginner' | 'intermediate' | 'freeplay'

export const LEARN_LEVEL_LABELS: Record<LearnLevel, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  freeplay: 'Freeplay',
}

export const ALL_LEARN_LEVELS: LearnLevel[] = [
  'beginner',
  'intermediate',
  'freeplay',
]

const BEGINNER_ORDER: Difficulty[] = ['easy', 'medium', 'hard']
const INTERMEDIATE_ORDER: Difficulty[] = ['medium', 'hard', 'easy']

/**
 * Beginner: easy → medium → hard (shuffled within each band).
 * Intermediate: medium → hard → easy.
 * Freeplay: fully shuffled; caller uses all questions.
 */
export function orderQuestionsForLearn(
  questions: Question[],
  level: LearnLevel,
  seed: number,
  count: number | 'all',
): Question[] {
  const active = questions.filter((question) => !question.archivedAt)
  const random = createSeededRandom(seed)

  if (level === 'freeplay') {
    return shuffleCopy(active, random)
  }

  const order = level === 'beginner' ? BEGINNER_ORDER : INTERMEDIATE_ORDER
  const buckets: Record<Difficulty, Question[]> = {
    easy: [],
    medium: [],
    hard: [],
  }
  for (const question of active) {
    buckets[question.difficulty].push(question)
  }

  const ordered = order.flatMap((difficulty) =>
    shuffleCopy(buckets[difficulty], random),
  )

  if (count === 'all') {
    return ordered
  }
  return ordered.slice(0, Math.max(0, count))
}
