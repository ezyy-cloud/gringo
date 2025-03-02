import { useEffect, useState } from 'react'

const OfflineFallback = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  if (isOnline) return null

  return (
    <div className="offline-fallback">
      <div className="offline-content">
        <h2>You're offline</h2>
        <p>Please check your internet connection to continue using Gringo.</p>
        <div className="offline-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" fill="currentColor" viewBox="0 0 16 16">
            <path d="M10.706 3.294A12.545 12.545 0 0 0 8 3C5.259 3 2.723 3.882.663 5.379a.485.485 0 0 0-.048.736.518.518 0 0 0 .668.05A11.448 11.448 0 0 1 8 4c.63 0 1.249.05 1.852.148l.854-.854zM8 6c-1.905 0-3.68.56-5.166 1.526a.48.48 0 0 0-.063.745.525.525 0 0 0 .652.065 8.448 8.448 0 0 1 4.577-1.336c.293 0 .582.014.866.042l.895-.895A7.444 7.444 0 0 0 8 6Zm-2.65 5.625a2.53 2.53 0 0 1 1.337-.694l1.313-1.313a2.52 2.52 0 0 0-.546-.06c-1.28 0-2.316.952-2.316 2.128a2.13 2.13 0 0 0 .212.939l.002-.002zM9 8.5a1.5 1.5 0 0 1 1.5-1.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1A1.5 1.5 0 0 1 9 8.5zm1.5-1.5A1.5 1.5 0 0 0 9 8.5v1A1.5 1.5 0 0 0 10.5 11h1a.5.5 0 0 0 .5-.5v-1a.5.5 0 0 0-.5-.5H11zM5 0a.5.5 0 0 1 .5.5.5.5 0 0 1-.5.5A4.5 4.5 0 0 0 .5 5.5a.5.5 0 0 1-.5.5.5.5 0 0 1-.5-.5A5.5 5.5 0 0 1 5 0z"/>
          </svg>
        </div>
      </div>
    </div>
  )
}

export default OfflineFallback 