import { useEffect } from 'react'
import { RouterProvider } from 'react-router'
import { ThemeProvider } from 'next-themes'
import { useAuthStore } from '@/stores/auth'
import { useCryptoStore } from '@/stores/cryptoStore'
import { useCallStore } from '@/stores/callStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { useCall } from '@/lib/webrtc/useCall'
import { useMessaging } from '@/lib/websocket/useMessaging'
import { IncomingCallBanner } from '@/components/call/IncomingCallBanner'
import { ActiveCallWindow } from '@/components/call/ActiveCallWindow'
import { router } from '@/routes'

function App() {
  const checkAuth = useAuthStore((state) => state.checkAuth)
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const isAuthInitialized = useAuthStore((state) => state.isInitialized)
  const isCryptoInitialized = useCryptoStore((state) => state.isInitialized)
  const initializeKeys = useCryptoStore((state) => state.initializeKeys)

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  // Recover crypto keys on page refresh using sessionStorage
  useEffect(() => {
    if (isAuthInitialized && isAuthenticated && !isCryptoInitialized) {
      const stored = sessionStorage.getItem('_ec')
      if (stored) {
        try {
          const { e, p } = JSON.parse(atob(stored))
          initializeKeys(e, p).catch((err) => {
            console.error('Failed to recover crypto keys:', err)
          })
        } catch {
          // Invalid stored data, user will need to re-login
          console.warn('Could not recover encryption keys - please re-login')
        }
      }
    }
  }, [isAuthInitialized, isAuthenticated, isCryptoInitialized, initializeKeys])

  // Debug: Log initialization state
  console.log('[App] Init state:', { isAuthInitialized, isAuthenticated, isCryptoInitialized, hasStoredKeys: !!sessionStorage.getItem('_ec') })

  // Global WebSocket connection for messaging and call signaling
  // This ensures the WebSocket is always connected when authenticated, not just on MessagesPage
  const { isConnected: wsConnected } = useMessaging()
  console.log('[App] WebSocket connected:', wsConnected)

  // Global call UI - needs to be inside component to use hooks
  const { status, remoteUsername } = useCallStore()
  const { ringTimeout } = useSettingsStore()
  const {
    isMuted,
    quality,
    latency,
    isMinimized,
    startTime,
    acceptCall,
    rejectCall,
    hangup,
    toggleMute,
    toggleMinimized,
  } = useCall()

  const showIncomingCall = isAuthenticated && status === 'incoming' && remoteUsername
  const showActiveCall = isAuthenticated && ['outgoing', 'connecting', 'connected', 'reconnecting'].includes(status) && remoteUsername

  console.log('[App] Call state:', { status, remoteUsername, showIncomingCall, showActiveCall })

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      {/* Global incoming call banner */}
      {showIncomingCall && (
        <IncomingCallBanner
          callerUsername={remoteUsername}
          onAccept={acceptCall}
          onReject={rejectCall}
          ringTimeout={ringTimeout}
        />
      )}

      {/* Global active call window */}
      {showActiveCall && (
        <ActiveCallWindow
          remoteUsername={remoteUsername}
          status={status}
          isMuted={isMuted}
          quality={quality}
          latency={latency}
          isMinimized={isMinimized}
          startTime={startTime}
          onToggleMute={toggleMute}
          onHangup={hangup}
          onToggleMinimized={toggleMinimized}
        />
      )}

      <RouterProvider router={router} />
    </ThemeProvider>
  )
}

export default App
