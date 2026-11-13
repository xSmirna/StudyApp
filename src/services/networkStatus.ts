export function getOnlineStatus(): boolean {
  if (typeof navigator === 'undefined') {
    return true
  }
  return navigator.onLine
}

export function subscribeOnlineStatus(
  listener: (online: boolean) => void,
): () => void {
  const onOnline = () => listener(true)
  const onOffline = () => listener(false)
  window.addEventListener('online', onOnline)
  window.addEventListener('offline', onOffline)
  listener(getOnlineStatus())
  return () => {
    window.removeEventListener('online', onOnline)
    window.removeEventListener('offline', onOffline)
  }
}
