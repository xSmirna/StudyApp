import type { EntityId } from './types'

export function createId(): EntityId {
  return crypto.randomUUID()
}
