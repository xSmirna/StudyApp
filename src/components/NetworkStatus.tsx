import { useEffect, useState } from 'react'
import { getOnlineStatus, subscribeOnlineStatus } from '../services/networkStatus'

export function NetworkStatus() {
  const [online, setOnline] = useState(getOnlineStatus)

  useEffect(() => subscribeOnlineStatus(setOnline), [])

  return (
    <p
      className={online ? 'network-status online' : 'network-status offline'}
      role="status"
      aria-live="polite"
    >
      {online ? 'Online' : 'Offline'}
    </p>
  )
}
