import { describe, expect, it } from 'vitest'
import {
  BACKUP_APP_NAME,
  BACKUP_FORMAT_VERSION,
  buildExportFilename,
  chooseNewerByUpdatedAt,
  parseAndValidateBackup,
  previewBackup,
} from './backup'

function minimalValidBackup(overrides: Record<string, unknown> = {}) {
  return {
    formatVersion: BACKUP_FORMAT_VERSION,
    schemaVersion: 4,
    appName: BACKUP_APP_NAME,
    exportedAt: '2026-11-14T10:00:00.000Z',
    data: {
      subjects: [
        {
          id: 'sub-1',
          name: 'Maths',
          createdAt: '2026-11-01T00:00:00.000Z',
          updatedAt: '2026-11-01T00:00:00.000Z',
        },
      ],
      chapters: [],
      questions: [],
      options: [],
      quizSessions: [],
      questionAttempts: [],
      questionReviewStates: [],
      dailyStudyTime: [],
      achievementUnlocks: [],
      appMetadata: [{ key: 'schemaVersion', value: '4' }],
    },
    ...overrides,
  }
}

describe('parseAndValidateBackup', () => {
  it('accepts a minimal valid backup and builds a preview', () => {
    const backup = parseAndValidateBackup(minimalValidBackup())
    expect(backup.formatVersion).toBe(BACKUP_FORMAT_VERSION)
    expect(backup.appName).toBe(BACKUP_APP_NAME)
    expect(backup.data.subjects).toHaveLength(1)

    const preview = previewBackup(backup)
    expect(preview.subjectCount).toBe(1)
    expect(preview.formatVersion).toBe(BACKUP_FORMAT_VERSION)
    expect(preview.schemaVersion).toBe(4)
  })

  it('rejects non-object payloads', () => {
    expect(() => parseAndValidateBackup(null)).toThrow(/JSON object/i)
    expect(() => parseAndValidateBackup('not-json-object')).toThrow(
      /JSON object/i,
    )
    expect(() => parseAndValidateBackup([])).toThrow(/JSON object/i)
  })

  it('rejects unsupported format versions', () => {
    expect(() =>
      parseAndValidateBackup(minimalValidBackup({ formatVersion: 99 })),
    ).toThrow(/Unsupported backup format version/i)
  })

  it('rejects wrong app names', () => {
    expect(() =>
      parseAndValidateBackup(minimalValidBackup({ appName: 'OtherApp' })),
    ).toThrow(/appName must be "StudyApp"/i)
  })

  it('rejects missing schemaVersion and exportedAt', () => {
    const missingSchema = minimalValidBackup()
    delete (missingSchema as { schemaVersion?: number }).schemaVersion
    expect(() => parseAndValidateBackup(missingSchema)).toThrow(
      /schemaVersion/i,
    )

    const missingExported = minimalValidBackup({ exportedAt: 123 })
    expect(() => parseAndValidateBackup(missingExported)).toThrow(/exportedAt/i)
  })

  it('rejects corrupted subjects / questions arrays', () => {
    expect(() =>
      parseAndValidateBackup(
        minimalValidBackup({
          data: {
            ...minimalValidBackup().data,
            subjects: [{ id: 1, name: 'bad' }],
          },
        }),
      ),
    ).toThrow(/Subject at index 0/i)

    expect(() =>
      parseAndValidateBackup(
        minimalValidBackup({
          data: {
            ...minimalValidBackup().data,
            questions: 'not-an-array',
          },
        }),
      ),
    ).toThrow(/questions/i)
  })

  it('rejects invalid daily study time and achievement unlock entries', () => {
    expect(() =>
      parseAndValidateBackup(
        minimalValidBackup({
          data: {
            ...minimalValidBackup().data,
            dailyStudyTime: [{ localDate: '2026-11-14', seconds: 'nope' }],
          },
        }),
      ),
    ).toThrow(/Daily study time/i)

    expect(() =>
      parseAndValidateBackup(
        minimalValidBackup({
          data: {
            ...minimalValidBackup().data,
            achievementUnlocks: [{ achievementId: 'first_quiz' }],
          },
        }),
      ),
    ).toThrow(/Achievement unlock/i)
  })
})

describe('chooseNewerByUpdatedAt', () => {
  it('prefers the incoming record when newer or equal', () => {
    const local = {
      id: '1',
      updatedAt: '2026-11-10T00:00:00.000Z',
      text: 'local',
    }
    const incoming = {
      id: '1',
      updatedAt: '2026-11-11T00:00:00.000Z',
      text: 'incoming',
    }
    expect(chooseNewerByUpdatedAt(local, incoming).text).toBe('incoming')
    expect(
      chooseNewerByUpdatedAt(
        { ...local, updatedAt: '2026-11-11T00:00:00.000Z' },
        incoming,
      ).text,
    ).toBe('incoming')
  })

  it('keeps local when newer', () => {
    const local = {
      id: '1',
      updatedAt: '2026-11-12T00:00:00.000Z',
      text: 'local',
    }
    const incoming = {
      id: '1',
      updatedAt: '2026-11-11T00:00:00.000Z',
      text: 'incoming',
    }
    expect(chooseNewerByUpdatedAt(local, incoming).text).toBe('local')
  })
})

describe('buildExportFilename', () => {
  it('includes StudyApp and the export date', () => {
    expect(buildExportFilename('2026-11-14T09:30:00.000Z')).toBe(
      'StudyApp-backup-2026-11-14.json',
    )
  })
})
