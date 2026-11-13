export type ValidationResult =
  | { ok: true; value: string }
  | { ok: false; error: string }

const MAX_NAME_LENGTH = 200
const MAX_DESCRIPTION_LENGTH = 2000

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
