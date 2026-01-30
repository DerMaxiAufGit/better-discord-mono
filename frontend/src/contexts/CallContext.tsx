import { createContext, useContext, ReactNode } from 'react'
import { useCall as useCallHook } from '@/lib/webrtc/useCall'
import type { CallStatus } from '@/stores/callStore'

interface CallContextValue {
  // State
  status: CallStatus
  remoteUsername: string | null
  isMuted: boolean
  quality: 1 | 2 | 3 | 4
  latency: number | null
  isMinimized: boolean
  startTime: Date | null

  // Video state
  isVideoEnabled: boolean
  localVideoStream: MediaStream | null
  remoteVideoStream: MediaStream | null
  displayStream: MediaStream | null // Stream to display (processed when blur on)
  isBlurProcessing: boolean

  // Actions
  startCall: (userId: string, username: string) => Promise<void>
  acceptCall: () => Promise<void>
  rejectCall: () => void
  hangup: () => void
  toggleMute: () => void
  toggleMinimized: () => void
  toggleVideo: () => Promise<void>
}

const CallContext = createContext<CallContextValue | null>(null)

export function CallProvider({ children }: { children: ReactNode }) {
  const callState = useCallHook()

  return (
    <CallContext.Provider value={callState}>
      {children}
    </CallContext.Provider>
  )
}

export function useCall(): CallContextValue {
  const context = useContext(CallContext)
  if (!context) {
    throw new Error('useCall must be used within a CallProvider')
  }
  return context
}
