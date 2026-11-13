export type StorageEstimateSummary = {
  supported: boolean
  usageBytes?: number
  quotaBytes?: number
  usageLabel: string
  quotaLabel: string
  percentLabel: string
}

export type PersistenceStatus = {
  supported: boolean
  persisted: boolean | null
  message: string
}

export function formatBytes(bytes: number | undefined): string {
  if (bytes === undefined || Number.isNaN(bytes)) {
    return 'Unknown'
  }
  if (bytes < 1024) {
    return `${bytes} B`
  }
  const units = ['KB', 'MB', 'GB', 'TB']
  let value = bytes / 1024
  let unitIndex = 0
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex += 1
  }
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[unitIndex]}`
}

export async function getStorageEstimate(): Promise<StorageEstimateSummary> {
  if (!navigator.storage?.estimate) {
    return {
      supported: false,
      usageLabel: 'Unavailable',
      quotaLabel: 'Unavailable',
      percentLabel: 'Unavailable',
    }
  }

  const estimate = await navigator.storage.estimate()
  const usage = estimate.usage
  const quota = estimate.quota
  const percent =
    usage !== undefined && quota !== undefined && quota > 0
      ? `${((usage / quota) * 100).toFixed(1)}%`
      : 'Unknown'

  return {
    supported: true,
    usageBytes: usage,
    quotaBytes: quota,
    usageLabel: formatBytes(usage),
    quotaLabel: formatBytes(quota),
    percentLabel: percent,
  }
}

export async function getPersistenceStatus(): Promise<PersistenceStatus> {
  if (!navigator.storage?.persisted) {
    return {
      supported: false,
      persisted: null,
      message:
        'Persistent storage is not supported in this browser. The app still works, but the browser may clear data under storage pressure.',
    }
  }

  const persisted = await navigator.storage.persisted()
  return {
    supported: true,
    persisted,
    message: persisted
      ? 'Persistent storage is granted for this origin. The browser is less likely to clear app data automatically.'
      : 'Persistent storage is not currently granted. The app still works; data may be cleared under storage pressure.',
  }
}

/**
 * Requests persistent storage. This is a request, not a guarantee.
 */
export async function requestPersistentStorage(): Promise<PersistenceStatus> {
  if (!navigator.storage?.persist) {
    return getPersistenceStatus()
  }

  const granted = await navigator.storage.persist()
  return {
    supported: true,
    persisted: granted,
    message: granted
      ? 'Persistent storage request granted.'
      : 'Persistent storage request was denied or deferred. The app still works without it.',
  }
}
