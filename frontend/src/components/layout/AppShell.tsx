import { ReactNode } from 'react'
import { Sidebar } from './Sidebar'
import { useCallStore } from '@/stores/callStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { useMessageStore } from '@/stores/messageStore'
import { IncomingCallBanner } from '@/components/call/IncomingCallBanner'
import { ActiveCallWindow } from '@/components/call/ActiveCallWindow'
import { ConnectionBanner } from '@/components/error/ConnectionBanner'
import { useCall } from '@/lib/webrtc/useCall'
import { useBreakpoint } from '@/hooks/useBreakpoint'
import { BottomNav } from '@/components/mobile/BottomNav'
import { cn } from '@/lib/utils'

interface AppShellProps {
  children: ReactNode
}

export function AppShell({ children }: AppShellProps) {
  const { isMobile } = useBreakpoint()
  const { status, remoteUsername } = useCallStore()
  const { ringTimeout } = useSettingsStore()
  const connectionStatus = useMessageStore((s) => s.connectionStatus)
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

  // Debug logging - log on every render
  console.log('[AppShell] Render - Call state:', { status, remoteUsername, callStoreState: useCallStore.getState() })

  const showIncomingCall = status === 'incoming' && remoteUsername
  const showActiveCall = ['outgoing', 'connecting', 'connected', 'reconnecting'].includes(status) && remoteUsername

  console.log('[AppShell] Show conditions:', { showIncomingCall, showActiveCall, statusIsIncoming: status === 'incoming', hasRemoteUsername: !!remoteUsername })

  return (
    <>
      {/* Connection banner at very top */}
      <ConnectionBanner status={connectionStatus} />

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

      <div className="flex h-screen overflow-hidden">
        {/* Sidebar only on desktop/tablet */}
        {!isMobile && <Sidebar />}

        {/* Main content with bottom padding on mobile for nav */}
        <main className={cn(
          "flex-1 overflow-auto bg-background",
          isMobile && "pb-16"
        )}>
          {children}
        </main>
      </div>

      {/* Bottom nav only on mobile */}
      {isMobile && <BottomNav />}
    </>
  )
}
