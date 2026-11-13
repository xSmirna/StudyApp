export type PwaUpdateController = {
  needRefresh: boolean
  offlineReady: boolean
  applyUpdate: () => void
  dismiss: () => void
}

type Listener = (state: PwaUpdateController) => void

let needRefresh = false
let offlineReady = false
let updateSW: ((reloadPage?: boolean) => Promise<void>) | null = null
const listeners = new Set<Listener>()

function emit() {
  const snapshot = getPwaUpdateState()
  for (const listener of listeners) {
    listener(snapshot)
  }
}

export function getPwaUpdateState(): PwaUpdateController {
  return {
    needRefresh,
    offlineReady,
    applyUpdate: () => {
      void updateSW?.(true)
    },
    dismiss: () => {
      needRefresh = false
      offlineReady = false
      emit()
    },
  }
}

export function subscribePwaUpdates(listener: Listener): () => void {
  listeners.add(listener)
  listener(getPwaUpdateState())
  return () => {
    listeners.delete(listener)
  }
}

/**
 * Registers the service worker with prompt-for-update behaviour.
 * Reloading is deferred to the caller so an active quiz is not interrupted.
 */
export async function registerPwaUpdates(): Promise<void> {
  if (!import.meta.env.PROD) {
    return
  }

  const { registerSW } = await import('virtual:pwa-register')
  updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      needRefresh = true
      emit()
    },
    onOfflineReady() {
      offlineReady = true
      emit()
    },
  })
}
