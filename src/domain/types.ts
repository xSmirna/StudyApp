export type EntityId = string

export type IsoDateTime = string

export interface Subject {
  id: EntityId
  name: string
  createdAt: IsoDateTime
  updatedAt: IsoDateTime
}

export interface Chapter {
  id: EntityId
  subjectId: EntityId
  name: string
  description?: string
  order: number
  createdAt: IsoDateTime
  updatedAt: IsoDateTime
  archivedAt?: IsoDateTime
}

export interface AppMetadata {
  key: string
  value: string
}

export type CreateSubjectInput = {
  name: string
}

export type UpdateSubjectInput = {
  name: string
}

export type CreateChapterInput = {
  subjectId: EntityId
  name: string
  description?: string
}

export type UpdateChapterInput = {
  name: string
  description?: string
}
