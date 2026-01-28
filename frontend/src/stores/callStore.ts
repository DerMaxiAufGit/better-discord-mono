import { create } from 'zustand'

export type CallStatus = 'idle' | 'outgoing' | 'incoming' | 'connecting' | 'connected' | 'reconnecting' | 'ended'

interface CallState {
  // Current call
  status: CallStatus
  callId: string | null
  remoteUserId: string | null
  remoteUsername: string | null
  isPolite: boolean           // Perfect Negotiation role
  isMuted: boolean

  // Quality metrics
  quality: 1 | 2 | 3 | 4      // Signal bars
  latency: number | null       // RTT in ms

  // Timing
  startTime: Date | null

  // UI state
  isMinimized: boolean         // Floating window vs full page

  // Actions
  startOutgoingCall: (callId: string, remoteUserId: string, remoteUsername: string, isPolite: boolean) => void
  receiveIncomingCall: (callId: string, remoteUserId: string, remoteUsername: string, isPolite: boolean) => void
  acceptCall: () => void
  rejectCall: () => void
  setConnecting: () => void
  setConnected: () => void
  setReconnecting: () => void
  endCall: () => void
  toggleMute: () => boolean    // Returns new mute state
  toggleMinimized: () => void
  updateQuality: (quality: 1 | 2 | 3 | 4, latency: number | null) => void
  reset: () => void
}

const initialState = {
  status: 'idle' as CallStatus,
  callId: null,
  remoteUserId: null,
  remoteUsername: null,
  isPolite: false,
  isMuted: false,
  quality: 4 as const,
  latency: null,
  startTime: null,
  isMinimized: false,
}

export const useCallStore = create<CallState>((set, get) => ({
  ...initialState,

  startOutgoingCall: (callId: string, remoteUserId: string, remoteUsername: string, isPolite: boolean) => {
    set({
      status: 'outgoing',
      callId,
      remoteUserId,
      remoteUsername,
      isPolite,
      isMuted: false,
      quality: 4,
      latency: null,
      startTime: null,
      isMinimized: false,
    })
  },

  receiveIncomingCall: (callId: string, remoteUserId: string, remoteUsername: string, isPolite: boolean) => {
    set({
      status: 'incoming',
      callId,
      remoteUserId,
      remoteUsername,
      isPolite,
      isMuted: false,
      quality: 4,
      latency: null,
      startTime: null,
      isMinimized: false,
    })
  },

  acceptCall: () => {
    const { status } = get()
    if (status === 'incoming') {
      set({ status: 'connecting' })
    }
  },

  rejectCall: () => {
    const { status } = get()
    if (status === 'incoming') {
      set({ ...initialState, status: 'ended' })
    }
  },

  setConnecting: () => {
    set({ status: 'connecting' })
  },

  setConnected: () => {
    set({
      status: 'connected',
      startTime: new Date(),
    })
  },

  setReconnecting: () => {
    const { status } = get()
    if (status === 'connected') {
      set({ status: 'reconnecting' })
    }
  },

  endCall: () => {
    set({ ...initialState })
  },

  toggleMute: () => {
    const newMuted = !get().isMuted
    set({ isMuted: newMuted })
    return newMuted
  },

  toggleMinimized: () => {
    set({ isMinimized: !get().isMinimized })
  },

  updateQuality: (quality: 1 | 2 | 3 | 4, latency: number | null) => {
    set({ quality, latency })
  },

  reset: () => {
    set({ ...initialState })
  },
}))
