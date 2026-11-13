import type { IsoDateTime } from './types'

export function nowIso(): IsoDateTime {
  return new Date().toISOString()
}
