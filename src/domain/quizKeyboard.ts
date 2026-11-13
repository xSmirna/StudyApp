/**
 * Keyboard helpers for active quizzes. Shortcuts apply only when focus is
 * not inside an input, textarea, or select.
 */
export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false
  }
  const tag = target.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
    return true
  }
  return target.isContentEditable
}

export function optionIndexFromKey(key: string): number | null {
  if (/^[1-9]$/.test(key)) {
    return Number(key) - 1
  }
  const upper = key.toUpperCase()
  if (/^[A-I]$/.test(upper)) {
    return upper.charCodeAt(0) - 65
  }
  return null
}

export type QuizKeyAction =
  | { type: 'select_option'; index: number }
  | { type: 'reveal' }
  | { type: 'advance' }

export function quizKeyAction(key: string): QuizKeyAction | null {
  const optionIndex = optionIndexFromKey(key)
  if (optionIndex !== null) {
    return { type: 'select_option', index: optionIndex }
  }
  if (key === ' ' || key === 'Spacebar') {
    return { type: 'reveal' }
  }
  if (key === 'Enter') {
    return { type: 'advance' }
  }
  return null
}
