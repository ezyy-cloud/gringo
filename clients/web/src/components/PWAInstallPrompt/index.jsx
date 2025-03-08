import { useState, useEffect } from 'react'
import './styles.css'

const PWAInstallPrompt = () => {
  const [installPromptEvent, setInstallPromptEvent] = useState(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault()
      // Store the event for later use
      setInstallPromptEvent(e)
      // Show our custom install prompt
      setIsVisible(true)
    }

    // Check if the app is already installed
    const isAppInstalled = window.matchMedia('(display-mode: standalone)').matches
    if (!isAppInstalled) {
      window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  const handleInstallClick = async () => {
    if (!installPromptEvent) return

    // Show the native install prompt
    installPromptEvent.prompt()

    // Wait for the user to respond to the prompt
    const { outcome } = await installPromptEvent.userChoice
    console.log(`User response to the install prompt: ${outcome}`)

    // Clear the prompt event regardless of outcome
    setInstallPromptEvent(null)
    setIsVisible(false)
  }

  const handleDismiss = () => {
    setIsVisible(false)
  }

  if (!isVisible) return null

  return (
    <div className="pwa-install-prompt">
      <div>
        <strong>Install GringoX</strong>
        <p>Install this app on your device for the best experience</p>
      </div>
      <div>
        <button onClick={handleInstallClick}>Install</button>
        <button className="close-btn" onClick={handleDismiss}>✕</button>
      </div>
    </div>
  )
}

export default PWAInstallPrompt 