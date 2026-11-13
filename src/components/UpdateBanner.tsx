import { useEffect, useState } from 'react'
import {
  getPwaUpdateState,
  subscribePwaUpdates,
  type PwaUpdateController,
} from '../services/pwaUpdate'

interface UpdateBannerProps {
  /** When true, reload is offered but warned against interrupting a quiz. */
  quizActive: boolean
}

export function UpdateBanner({ quizActive }: UpdateBannerProps) {
  const [state, setState] = useState<PwaUpdateController>(getPwaUpdateState())

  useEffect(() => subscribePwaUpdates(setState), [])

  if (!state.needRefresh && !state.offlineReady) {
    return null
  }

  if (state.needRefresh) {
    return (
      <div className="update-banner" role="status">
        <div>
          <strong>App update available</strong>
          <p className="muted">
            Local study data is not discarded by an update. Reload when you are
            ready
            {quizActive
              ? ' — finish or leave the active quiz first to avoid interrupting it.'
              : '.'}
          </p>
        </div>
        <div className="row-actions">
          <button
            type="button"
            onClick={() => state.applyUpdate()}
            disabled={quizActive}
          >
            Reload now
          </button>
          <button type="button" onClick={() => state.dismiss()}>
            Later
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="update-banner ready" role="status">
      <div>
        <strong>Ready for offline use</strong>
        <p className="muted">
          The app shell is cached. After this first successful load you can open
          Study App without a network connection.
        </p>
      </div>
      <button type="button" onClick={() => state.dismiss()}>
        OK
      </button>
    </div>
  )
}
