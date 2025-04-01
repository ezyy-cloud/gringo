import { StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { AppContextProvider } from './context/AppContext'
import { registerSW } from 'virtual:pwa-register'

// Loading fallback component
const LoadingFallback = () => (
  <div className="loading-fallback">
    <div className="spinner"></div>
    <p>Loading application...</p>
  </div>
);

// Register service worker for PWA capabilities
const updateSW = registerSW({
  onNeedRefresh() {
    if (confirm('New content available. Reload?')) {
      updateSW(true)
    }
  },
  onOfflineReady() {
  },
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AppContextProvider>
      <Suspense fallback={<LoadingFallback />}>
        <App />
      </Suspense>
    </AppContextProvider>
  </StrictMode>,
)
