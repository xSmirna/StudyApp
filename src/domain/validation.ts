import type { Difficulty, OptionInput, QuestionInput, QuestionType } from './types'
import { isChoiceType, isWrittenType } from './types'

export type ValidationResult =
  | { ok: true; value: string }
  | { ok: false; error: string }

export type QuestionValidationSuccess = {
  ok: true
  value: {
    text: string
    type: QuestionType
    difficulty: Difficulty
    referenceAnswer?: string
    explanation?: string
    correctBoolean?: boolean
    options: Array<{
      id?: string
      text: string
      isCorrect: boolean
      order: number
    }>
  }
}

export type QuestionValidationFailure = {
  ok: false
  error: string
}

export type QuestionValidationResult =
  | QuestionValidationSuccess
  | QuestionValidationFailure

const MAX_NAME_LENGTH = 200
const MAX_DESCRIPTION_LENGTH = 2000
const MAX_QUESTION_TEXT_LENGTH = 5000
const MAX_OPTION_TEXT_LENGTH = 1000
const MAX_REFERENCE_LENGTH = 5000
const MAX_EXPLANATION_LENGTH = 5000

export function validateRequiredName(raw: string): ValidationResult {
  const value = raw.trim()
  if (!value) {
    return { ok: false, error: 'Name is required.' }
  }
  if (value.length > MAX_NAME_LENGTH) {
    return {
      ok: false,
      error: `Name must be ${MAX_NAME_LENGTH} characters or fewer.`,
    }
  }
  return { ok: true, value }
}

export function validateOptionalDescription(
  raw: string | undefined,
): ValidationResult {
  const value = (raw ?? '').trim()
  if (value.length > MAX_DESCRIPTION_LENGTH) {
    return {
      ok: false,
      error: `Description must be ${MAX_DESCRIPTION_LENGTH} characters or fewer.`,
    }
  }
  return { ok: true, value }
}

function validateOptionalLongText(
  label: string,
  raw: string | undefined,
  maxLength: number,
): ValidationResult {
  const value = (raw ?? '').trim()
  if (value.length > maxLength) {
    return {
      ok: false,
      error: `${label} must be ${maxLength} characters or fewer.`,
    }
  }
  return { ok: true, value }
}

export function validateQuestionInput(
  input: QuestionInput,
): QuestionValidationResult {
  const text = input.text.trim()
  if (!text) {
    return { ok: false, error: 'Question text is required.' }
  }
  if (text.length > MAX_QUESTION_TEXT_LENGTH) {
    return {
      ok: false,
      error: `Question text must be ${MAX_QUESTION_TEXT_LENGTH} characters or fewer.`,
    }
  }

  const explanationResult = validateOptionalLongText(
    'Explanation',
    input.explanation,
    MAX_EXPLANATION_LENGTH,
  )
  if (!explanationResult.ok) {
    return explanationResult
  }

  const referenceResult = validateOptionalLongText(
    'Reference answer',
    input.referenceAnswer,
    MAX_REFERENCE_LENGTH,
  )
  if (!referenceResult.ok) {
    return referenceResult
  }

  if (input.type === 'true_false') {
    if (typeof input.correctBoolean !== 'boolean') {
      return {
        ok: false,
        error: 'True/false questions must set the correct answer to True or False.',
      }
    }

    return {
      ok: true,
      value: {
        text,
        type: input.type,
        difficulty: input.difficulty,
        explanation: explanationResult.value || undefined,
        correctBoolean: input.correctBoolean,
        options: [],
      },
    }
  }

  if (isWrittenType(input.type)) {
    return {
      ok: true,
      value: {
        text,
        type: input.type,
        difficulty: input.difficulty,
        referenceAnswer: referenceResult.value || undefined,
        explanation: explanationResult.value || undefined,
        options: [],
      },
    }
  }

  if (isChoiceType(input.type)) {
    const rawOptions = input.options ?? []
    if (rawOptions.length < 2) {
      return {
        ok: false,
        error: 'Choice questions need at least two options.',
      }
    }

    const options: OptionInput[] = []
    for (const [index, option] of rawOptions.entries()) {
      const optionText = option.text.trim()
      if (!optionText) {
        return {
          ok: false,
          error: `Option ${index + 1} text is required.`,
        }
      }
      if (optionText.length > MAX_OPTION_TEXT_LENGTH) {
        return {
          ok: false,
          error: `Option ${index + 1} must be ${MAX_OPTION_TEXT_LENGTH} characters or fewer.`,
        }
      }
      options.push({
        id: option.id,
        text: optionText,
        isCorrect: option.isCorrect,
        order: index,
      })
    }

    const correctCount = options.filter((option) => option.isCorrect).length
    if (input.type === 'single_choice' && correctCount !== 1) {
      return {
        ok: false,
        error: 'Single-choice questions must have exactly one correct option.',
      }
    }
    if (input.type === 'multiple_select' && correctCount < 1) {
      return {
        ok: false,
        error: 'Multiple-select questions must have at least one correct option.',
      }
    }

    return {
      ok: true,
      value: {
        text,
        type: input.type,
        difficulty: input.difficulty,
        explanation: explanationResult.value || undefined,
        options,
      },
    }
  }

  return { ok: false, error: 'Unsupported question type.' }
}
