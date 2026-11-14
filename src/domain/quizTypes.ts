import type { LearnLevel } from './learnSelection'
import type {
  Difficulty,
  EntityId,
  IsoDateTime,
  QuestionType,
  TableFillData,
} from './types'

export type { LearnLevel } from './learnSelection'

export type QuizMode =
  | 'learn'
  | 'revision'
  | 'exam'
  | 'custom'
  | 'practice_incorrect'

export type QuizStatus = 'in_progress' | 'completed' | 'discarded'

export type AttemptOutcome = 'correct' | 'partially_correct' | 'incorrect'

export type SelectionStrategy = 'prioritise_due_failed' | 'balanced_random'

export type QuizSessionSettings = {
  seed: number
  questionIds: string[]
  optionOrders: Record<string, string[]>
  currentIndex: number
  questionCount: number | 'all'
  chapterIds: string[]
  types?: QuestionType[]
  difficulties?: Difficulty[]
  selectionStrategy?: SelectionStrategy
  timerMinutes?: number
  practiceSourceSessionId?: string
  learnLevel?: LearnLevel
  stopOnIncorrect?: boolean
}

export interface QuizSession {
  id: EntityId
  subjectId: EntityId
  subjectNameSnapshot: string
  chapterIds: EntityId[]
  chapterNameSnapshots: Record<string, string>
  mode: QuizMode
  status: QuizStatus
  startedAt: IsoDateTime
  completedAt?: IsoDateTime
  settings: QuizSessionSettings
  durationSeconds?: number
}

export interface QuestionAttempt {
  id: EntityId
  sessionId: EntityId
  questionId: EntityId
  questionTextSnapshot: string
  questionType: QuestionType
  difficulty: Difficulty
  shownOptionOrder?: EntityId[]
  selectedOptionIds?: EntityId[]
  selectedBoolean?: boolean
  writtenSelfAssessment?: AttemptOutcome
  automaticResult?: AttemptOutcome
  answeredAt: IsoDateTime
  timeSpentSeconds?: number
}

export interface QuestionReviewState {
  questionId: EntityId
  lastAttemptAt?: IsoDateTime
  nextDueAt?: IsoDateTime
  intervalDays: number
  successfulReviewCount: number
  attemptCount: number
  incorrectCount: number
  lastOutcome?: AttemptOutcome
}

export type QuizQuestionPayload = {
  id: EntityId
  chapterId: EntityId
  type: QuestionType
  text: string
  difficulty: Difficulty
  referenceAnswer?: string
  explanation?: string
  correctBoolean?: boolean
  gaps?: string[]
  table?: TableFillData
  options: Array<{
    id: EntityId
    text: string
    order: number
    isCorrect: boolean
  }>
}

export function resolveAttemptOutcome(
  attempt: Pick<
    QuestionAttempt,
    'automaticResult' | 'writtenSelfAssessment'
  >,
): AttemptOutcome | undefined {
  return attempt.writtenSelfAssessment ?? attempt.automaticResult
}

export function isMissedOutcome(outcome: AttemptOutcome | undefined): boolean {
  return outcome === 'incorrect' || outcome === 'partially_correct'
}
