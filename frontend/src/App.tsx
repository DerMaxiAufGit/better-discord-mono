import { useEffect, useRef } from 'react'
import { RouterProvider } from 'react-router'
import { ThemeProvider } from 'next-themes'
import { Toaster } from 'sonner'
import { useAuthStore } from '@/stores/auth'
import { useCryptoStore } from '@/stores/cryptoStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { useBlockStore } from '@/stores/blockStore'
import { CallProvider, useCall } from '@/contexts/CallContext'
import { useMessaging } from '@/lib/websocket/useMessaging'
import { IncomingCallBanner } from '@/components/call/IncomingCallBanner'
import { ActiveCallWindow } from '@/components/call/ActiveCallWindow'
import { SessionExpiredModal } from '@/components/auth/SessionExpiredModal'
import { router } from '@/routes'

/**
 * Inner app component that uses the CallContext
 */
function AppContent() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const sessionExpired = useAuthStore((state) => state.sessionExpired)
  const { ringTimeout } = useSettingsStore()

  // Global WebSocket connection for messaging and call signaling
  const { isConnected: wsConnected } = useMessaging()
  console.log('[App] WebSocket connected:', wsConnected)

  // Get call state from context (single shared instance)
  const {
    status,
    remoteUsername,
    isMuted,
    quality,
    latency,
    isMinimized,
    startTime,
    isVideoEnabled,
    remoteVideoStream,
    displayStream,
    acceptCall,
    rejectCall,
    hangup,
    toggleMute,
    toggleMinimized,
    toggleVideo,
  } = useCall()

  const showIncomingCall = isAuthenticated && status === 'incoming' && remoteUsername
  const showActiveCall = isAuthenticated && ['outgoing', 'connecting', 'connected', 'reconnecting'].includes(status) && remoteUsername

  console.log('[App] Call state:', { status, remoteUsername, showIncomingCall, showActiveCall })

  return (
    <>
      <Toaster
        position="top-center"
        visibleToasts={3}
        closeButton
        toastOptions={{ duration: 4000 }}
      />

      {/* Session expired modal - renders above everything */}
      {sessionExpired && <SessionExpiredModal />}

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
          isVideoEnabled={isVideoEnabled}
          localVideoStream={displayStream}
          remoteVideoStream={remoteVideoStream}
          onToggleVideo={toggleVideo}
        />
      )}

      <RouterProvider router={router} />
    </>
  )
}

/**
 * Main App component - handles auth initialization
 */
function App() {
  const checkAuth = useAuthStore((state) => state.checkAuth)
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const isAuthInitialized = useAuthStore((state) => state.isInitialized)
  const isCryptoInitialized = useCryptoStore((state) => state.isInitialized)
  const initializeKeys = useCryptoStore((state) => state.initializeKeys)
  const logout = useAuthStore((state) => state.logout)
  const logoutTimeoutRef = useRef<number | null>(null)

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  // Load blocked users after authentication
  useEffect(() => {
    if (isAuthenticated) {
      useBlockStore.getState().loadBlockedUsers().catch((err) => {
        console.error('Failed to load blocked users:', err)
      })
    }
  }, [isAuthenticated])

  // Recover crypto keys on page refresh using sessionStorage
  useEffect(() => {
    // Clear any pending logout timeout
    if (logoutTimeoutRef.current) {
      clearTimeout(logoutTimeoutRef.current)
      logoutTimeoutRef.current = null
    }

    if (isAuthInitialized && isAuthenticated && !isCryptoInitialized) {
      const stored = sessionStorage.getItem('_ec')
      if (stored) {
        try {
          const { e, p } = JSON.parse(atob(stored))
          initializeKeys(e, p).catch((err) => {
            console.error('Failed to recover crypto keys:', err)
            sessionStorage.removeItem('_ec')
            logout()
          })
        } catch {
          console.warn('Could not recover encryption keys - forcing re-login')
          sessionStorage.removeItem('_ec')
          logout()
        }
      } else {
        // Wait a moment in case login is still in progress
        logoutTimeoutRef.current = window.setTimeout(() => {
          const cryptoStore = useCryptoStore.getState()
          const stillNoKeys = !cryptoStore.isInitialized && !sessionStorage.getItem('_ec')
          if (stillNoKeys) {
            console.warn('No stored encryption credentials - forcing re-login')
            logout()
          }
        }, 2000)
      }
    }

    return () => {
      if (logoutTimeoutRef.current) {
        clearTimeout(logoutTimeoutRef.current)
      }
    }
  }, [isAuthInitialized, isAuthenticated, isCryptoInitialized, initializeKeys, logout])

  // Debug logging
  console.log('[App] Init state:', { isAuthInitialized, isAuthenticated, isCryptoInitialized, hasStoredKeys: !!sessionStorage.getItem('_ec') })

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <CallProvider>
        <AppContent />
      </CallProvider>
    </ThemeProvider>
  )
}

export default App
