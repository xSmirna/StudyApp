import type { AttemptOutcome } from './quizTypes'

export type GradableOption = {
  id: string
  isCorrect: boolean
}

function sameIdSet(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) {
    return false
  }
  const left = [...a].sort()
  const right = [...b].sort()
  return left.every((value, index) => value === right[index])
}

/** Grade by stable option IDs — never by visible index. */
export function gradeSingleChoice(
  selectedOptionIds: readonly string[],
  options: readonly GradableOption[],
): AttemptOutcome {
  const correctIds = options
    .filter((option) => option.isCorrect)
    .map((option) => option.id)
  if (selectedOptionIds.length !== 1 || correctIds.length !== 1) {
    return 'incorrect'
  }
  return selectedOptionIds[0] === correctIds[0] ? 'correct' : 'incorrect'
}

/** Exact set match only — no partial automatic credit in v1. */
export function gradeMultipleSelect(
  selectedOptionIds: readonly string[],
  options: readonly GradableOption[],
): AttemptOutcome {
  const correctIds = options
    .filter((option) => option.isCorrect)
    .map((option) => option.id)
  return sameIdSet(selectedOptionIds, correctIds) ? 'correct' : 'incorrect'
}

export function gradeTrueFalse(
  selectedBoolean: boolean | undefined,
  correctBoolean: boolean | undefined,
): AttemptOutcome {
  if (typeof selectedBoolean !== 'boolean' || typeof correctBoolean !== 'boolean') {
    return 'incorrect'
  }
  return selectedBoolean === correctBoolean ? 'correct' : 'incorrect'
}

export function gradeChoiceQuestion(
  type: 'single_choice' | 'multiple_select',
  selectedOptionIds: readonly string[],
  options: readonly GradableOption[],
): AttemptOutcome {
  return type === 'single_choice'
    ? gradeSingleChoice(selectedOptionIds, options)
    : gradeMultipleSelect(selectedOptionIds, options)
}
