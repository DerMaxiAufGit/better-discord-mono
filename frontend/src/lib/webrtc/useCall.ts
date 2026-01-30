import { useRef, useCallback, useEffect, useState } from 'react'
import { useCallStore, CallStatus } from '@/stores/callStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { useAuthStore } from '@/stores/auth'
import { useMessageStore } from '@/stores/messageStore'
import { PeerConnectionManager, createPeerConnection, SignalingChannel } from './PeerConnection'
import { sendViaSharedWebSocket } from '@/lib/websocket/sharedWebSocket'
import { playRingtone, playRingback, resumeAudioContext, stopCurrentTone } from './ringtone'
import { toast } from '@/lib/toast'
import { useBackgroundBlur } from '@/lib/video/useBackgroundBlur'

/**
 * Return type for useCall hook
 */
interface UseCallReturn {
  // State (from callStore)
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

/**
 * Call signaling message types
 */
interface CallOfferMessage {
  type: 'call-offer'
  callId: string
  senderId: string
  senderUsername: string
  sdp?: string
}

interface CallAcceptMessage {
  type: 'call-accept'
  callId: string
  senderId: string
}

interface CallAnswerMessage {
  type: 'call-answer'
  callId: string
  senderId: string
  sdp: string
}

interface CallIceCandidateMessage {
  type: 'call-ice-candidate'
  callId: string
  senderId: string
  candidate: RTCIceCandidateInit
}

interface CallRejectMessage {
  type: 'call-reject'
  callId: string
  senderId: string
}

interface CallHangupMessage {
  type: 'call-hangup'
  callId: string
  senderId: string
}

type CallSignalingMessage =
  | CallOfferMessage
  | CallAcceptMessage
  | CallAnswerMessage
  | CallIceCandidateMessage
  | CallRejectMessage
  | CallHangupMessage

// Custom event name for call signaling messages
export const CALL_SIGNALING_EVENT = 'call-signaling'

/**
 * Dispatch a call signaling event to be handled by useCall
 */
export function dispatchCallSignaling(message: CallSignalingMessage): void {
  window.dispatchEvent(new CustomEvent(CALL_SIGNALING_EVENT, { detail: message }))
}

/**
 * Main call orchestration hook.
 * Coordinates WebRTC, signaling, and call store state.
 *
 * Usage:
 * 1. Call startCall(userId, username) to initiate outgoing call
 * 2. Listen for incoming calls via CALL_SIGNALING_EVENT
 * 3. Accept with acceptCall() or decline with rejectCall()
 * 4. During call: toggleMute(), toggleMinimized(), hangup()
 *
 * The hook handles:
 * - PeerConnection lifecycle
 * - Quality monitoring
 * - Mute/unmute via track enable
 * - Cleanup on hangup
 */
export function useCall(): UseCallReturn {
  // Access stores
  const {
    status,
    callId,
    remoteUserId,
    remoteUsername,
    isPolite,
    isMuted,
    quality,
    latency,
    isMinimized,
    startTime,
    startOutgoingCall,
    receiveIncomingCall,
    acceptCall: storeAcceptCall,
    rejectCall: storeRejectCall,
    setConnecting,
    setConnected,
    setReconnecting,
    endCall,
    toggleMute: storeToggleMute,
    toggleMinimized,
    updateQuality,
    reset,
  } = useCallStore()

  const { selectedMicId, ringTimeout, ringtoneEnabled, videoQuality, preferredCameraId, blurEnabled, blurIntensity } = useSettingsStore()
  const { user, accessToken } = useAuthStore()

  // Video state
  const [isVideoEnabled, setIsVideoEnabled] = useState(false)
  const [localVideoStream, setLocalVideoStream] = useState<MediaStream | null>(null)
  const [remoteVideoStream, setRemoteVideoStream] = useState<MediaStream | null>(null)

  // Background blur processing
  console.log('[useCall] Blur state:', { blurEnabled, blurIntensity, hasLocalVideoStream: !!localVideoStream })
  const { processedStream, isProcessing: isBlurProcessing } = useBackgroundBlur(
    localVideoStream,
    blurEnabled,
    blurIntensity
  )
  // Display stream is the processed stream (with blur) or raw stream
  const displayStream = processedStream || localVideoStream
  console.log('[useCall] Display stream:', { hasProcessedStream: !!processedStream, hasDisplayStream: !!displayStream })

  // Refs for WebRTC resources
  const peerConnectionRef = useRef<PeerConnectionManager | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const localVideoStreamRef = useRef<MediaStream | null>(null)
  const remoteStreamRef = useRef<MediaStream | null>(null)
  const qualityIntervalRef = useRef<number | null>(null)
  const ringTimeoutRef = useRef<number | null>(null)
  const audioElementRef = useRef<HTMLAudioElement | null>(null)
  const pendingSdpRef = useRef<string | null>(null)

  // Use ref to access current state in callbacks without stale closures
  const stateRef = useRef({
    callId,
    remoteUserId,
    isPolite,
    status,
    user,
    accessToken,
    selectedMicId,
    ringTimeout,
    ringtoneEnabled,
  })
  stateRef.current = { callId, remoteUserId, isPolite, status, user, accessToken, selectedMicId, ringTimeout, ringtoneEnabled }

  /**
   * Get signaling channel using shared WebSocket from useMessaging
   */
  const getSignalingChannel = useCallback((): SignalingChannel => {
    return {
      send: (msg) => {
        sendViaSharedWebSocket(msg)
      },
    }
  }, [])

  /**
   * Get local audio stream
   */
  const getLocalAudioStream = useCallback(async (): Promise<MediaStream> => {
    const { selectedMicId } = stateRef.current
    const constraints: MediaStreamConstraints = {
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        ...(selectedMicId ? { deviceId: { exact: selectedMicId } } : {}),
      },
      video: false,
    }

    const stream = await navigator.mediaDevices.getUserMedia(constraints)
    localStreamRef.current = stream
    return stream
  }, [])

  /**
   * Start quality monitoring via getStats()
   */
  const startQualityMonitoring = useCallback(() => {
    if (qualityIntervalRef.current) {
      clearInterval(qualityIntervalRef.current)
    }

    qualityIntervalRef.current = window.setInterval(async () => {
      const pc = peerConnectionRef.current
      if (!pc || !pc.isConnected()) return

      try {
        const stats = await pc.getStats()
        if (!stats) return

        let packetLossPercent = 0
        let rtt: number | null = null

        stats.forEach((report) => {
          if (report.type === 'inbound-rtp' && report.kind === 'audio') {
            const packetsLost = report.packetsLost || 0
            const packetsReceived = report.packetsReceived || 0
            const totalPackets = packetsLost + packetsReceived
            if (totalPackets > 0) {
              packetLossPercent = (packetsLost / totalPackets) * 100
            }
          }
          if (report.type === 'candidate-pair' && report.state === 'succeeded') {
            rtt = report.currentRoundTripTime ? Math.round(report.currentRoundTripTime * 1000) : null
          }
        })

        // Calculate quality level (1-4 bars)
        let calculatedQuality: 1 | 2 | 3 | 4 = 4
        if (packetLossPercent > 10 || (rtt && rtt > 500)) {
          calculatedQuality = 1
        } else if (packetLossPercent > 5 || (rtt && rtt > 300)) {
          calculatedQuality = 2
        } else if (packetLossPercent > 2 || (rtt && rtt > 150)) {
          calculatedQuality = 3
        }

        updateQuality(calculatedQuality, rtt)
      } catch (e) {
        console.error('[useCall] Quality monitoring error:', e)
      }
    }, 1000)
  }, [updateQuality])

  /**
   * Stop quality monitoring
   */
  const stopQualityMonitoring = useCallback(() => {
    if (qualityIntervalRef.current) {
      clearInterval(qualityIntervalRef.current)
      qualityIntervalRef.current = null
    }
  }, [])

  /**
   * Stop any playing ringtone
   */
  const stopTone = useCallback(() => {
    console.log('[useCall] stopTone called')
    stopCurrentTone()
  }, [])

  /**
   * Cleanup all call resources
   */
  const cleanup = useCallback(() => {
    console.log('[useCall] cleanup called')
    // Stop quality monitoring
    stopQualityMonitoring()

    // Stop ringtone
    stopTone()

    // Clear ring timeout
    if (ringTimeoutRef.current) {
      clearTimeout(ringTimeoutRef.current)
      ringTimeoutRef.current = null
    }

    // Stop local audio tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop())
      localStreamRef.current = null
    }

    // Stop local video tracks
    if (localVideoStreamRef.current) {
      localVideoStreamRef.current.getTracks().forEach((track) => track.stop())
      localVideoStreamRef.current = null
    }
    setIsVideoEnabled(false)
    setLocalVideoStream(null)
    setRemoteVideoStream(null)

    // Stop remote audio
    if (audioElementRef.current) {
      audioElementRef.current.pause()
      audioElementRef.current.srcObject = null
    }
    remoteStreamRef.current = null

    // Close peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close()
      peerConnectionRef.current = null
    }

    // Clear pending SDP
    pendingSdpRef.current = null
  }, [stopQualityMonitoring, stopTone])

  /**
   * Handle ICE connection state changes
   */
  const handleIceConnectionStateChange = useCallback(
    (state: RTCIceConnectionState) => {
      console.log('[useCall] ICE connection state:', state)

      switch (state) {
        case 'connected':
        case 'completed':
          setConnected()
          startQualityMonitoring()
          break
        case 'disconnected':
          setReconnecting()
          break
        case 'failed':
          // Try ICE restart
          peerConnectionRef.current?.restartIce()
          break
        case 'closed':
          cleanup()
          endCall()
          break
      }
    },
    [setConnected, setReconnecting, startQualityMonitoring, cleanup, endCall]
  )

  /**
   * Handle remote track received
   */
  const handleRemoteTrack = useCallback((stream: MediaStream) => {
    console.log('[useCall] Remote track received, tracks:', stream.getTracks().map(t => t.kind))
    remoteStreamRef.current = stream

    // Check for video tracks
    const videoTracks = stream.getVideoTracks()
    if (videoTracks.length > 0) {
      console.log('[useCall] Remote video track received')
      setRemoteVideoStream(stream)
    }

    // Check for audio tracks
    const audioTracks = stream.getAudioTracks()
    if (audioTracks.length > 0) {
      // Create audio element if needed
      if (!audioElementRef.current) {
        audioElementRef.current = new Audio()
        audioElementRef.current.autoplay = true
      }

      audioElementRef.current.srcObject = stream
      audioElementRef.current.play().catch((e) => console.error('[useCall] Audio play error:', e))
    }
  }, [])

  /**
   * Create and setup PeerConnection
   */
  const setupPeerConnection = useCallback(
    async (callIdToUse: string, remoteUserIdToUse: string, isPoliteToUse: boolean): Promise<PeerConnectionManager> => {
      const signaling = getSignalingChannel()

      const pc = await createPeerConnection({
        isPolite: isPoliteToUse,
        callId: callIdToUse,
        remoteUserId: remoteUserIdToUse,
        signaling,
        onTrack: handleRemoteTrack,
        onIceConnectionStateChange: handleIceConnectionStateChange,
      })

      peerConnectionRef.current = pc
      return pc
    },
    [getSignalingChannel, handleRemoteTrack, handleIceConnectionStateChange]
  )

  /**
   * Start an outgoing call
   */
  const startCall = useCallback(
    async (userId: string, username: string): Promise<void> => {
      const { user } = stateRef.current
      if (!user) throw new Error('Not authenticated')

      // Check if connected - calls require active connection
      if (!useMessageStore.getState().isConnected) {
        toast.error('Cannot start call: Not connected to server')
        return
      }

      // Generate call ID
      const newCallId = `call-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`

      // Determine polite role via lexicographic comparison
      // Lower user ID is polite (consistent with key exchange)
      const isPoliteRole = String(user.id) < userId

      console.log('[useCall] Starting call:', { callId: newCallId, userId, isPolite: isPoliteRole })

      // Update store state
      startOutgoingCall(newCallId, userId, username, isPoliteRole)

      // Play ringback tone (what caller hears while waiting)
      const { ringtoneEnabled } = stateRef.current
      console.log('[useCall] ringtoneEnabled:', ringtoneEnabled)
      if (ringtoneEnabled) {
        await resumeAudioContext()
        playRingback()
        console.log('[useCall] Started ringback tone')
      }

      try {
        // Get local audio stream
        const stream = await getLocalAudioStream()

        // Setup peer connection
        const pc = await setupPeerConnection(newCallId, userId, isPoliteRole)

        // Add local stream (triggers negotiation)
        await pc.addLocalStream(stream)

        // Send call-offer signaling message
        const signaling = getSignalingChannel()
        signaling.send({
          type: 'call-offer',
          recipientId: userId,
          callId: newCallId,
          senderUsername: user.username || 'Unknown',
        })

        // Set ring timeout
        const { ringTimeout } = stateRef.current
        ringTimeoutRef.current = window.setTimeout(() => {
          console.log('[useCall] Ring timeout reached')
          const currentState = useCallStore.getState()
          if (currentState.status === 'outgoing') {
            // Auto-hangup if still ringing
            signaling.send({
              type: 'call-hangup',
              recipientId: userId,
              callId: newCallId,
            })
            cleanup()
            endCall()
          }
        }, ringTimeout * 1000)
      } catch (error) {
        console.error('[useCall] Start call error:', error)
        cleanup()
        endCall()
        throw error
      }
    },
    [
      startOutgoingCall,
      getLocalAudioStream,
      setupPeerConnection,
      getSignalingChannel,
      cleanup,
      endCall,
    ]
  )

  /**
   * Accept an incoming call
   */
  const acceptCall = useCallback(async (): Promise<void> => {
    const { callId: currentCallId, remoteUserId: currentRemoteUserId, isPolite: currentIsPolite } = stateRef.current
    if (!currentCallId || !currentRemoteUserId) {
      throw new Error('No incoming call to accept')
    }

    console.log('[useCall] Accepting call:', currentCallId)

    // Stop ringtone using singleton
    console.log('[useCall] Calling stopCurrentTone from acceptCall')
    stopCurrentTone()

    // Update store
    storeAcceptCall()
    setConnecting()

    // Send call-accept FIRST so caller knows we're accepting
    // Do this before WebRTC setup which may fail (e.g., mic permissions)
    const signaling = getSignalingChannel()
    signaling.send({
      type: 'call-accept',
      recipientId: currentRemoteUserId,
      callId: currentCallId,
    })
    console.log('[useCall] Sent call-accept')

    try {
      // Get local audio stream
      console.log('[useCall] Getting local audio stream...')
      const stream = await getLocalAudioStream()
      console.log('[useCall] Got local audio stream')

      // Setup peer connection
      console.log('[useCall] Setting up peer connection...')
      const pc = await setupPeerConnection(currentCallId, currentRemoteUserId, currentIsPolite)
      console.log('[useCall] Peer connection setup complete')

      // Add local stream
      await pc.addLocalStream(stream)
      console.log('[useCall] Added local stream to peer connection')

      // Handle pending SDP offer if received
      if (pendingSdpRef.current) {
        console.log('[useCall] Handling pending SDP offer...')
        await pc.handleRemoteDescription({ type: 'offer', sdp: pendingSdpRef.current })
        pendingSdpRef.current = null
        console.log('[useCall] Handled pending SDP offer')
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error('[useCall] Accept call error:', errorMessage, error)
      // Send hangup with error info since we already sent accept but setup failed
      signaling.send({
        type: 'call-hangup',
        recipientId: currentRemoteUserId,
        callId: currentCallId,
        error: errorMessage, // Include error for debugging
      })
      cleanup()
      endCall()
      throw error
    }
  }, [
    storeAcceptCall,
    setConnecting,
    getLocalAudioStream,
    setupPeerConnection,
    getSignalingChannel,
    cleanup,
    endCall,
  ])

  /**
   * Reject an incoming call
   */
  const rejectCall = useCallback((): void => {
    const { callId: currentCallId, remoteUserId: currentRemoteUserId } = stateRef.current
    if (!currentCallId || !currentRemoteUserId) return

    console.log('[useCall] Rejecting call:', currentCallId)

    // Stop ringtone immediately using singleton
    stopCurrentTone()

    // Send call-reject
    const signaling = getSignalingChannel()
    signaling.send({
      type: 'call-reject',
      recipientId: currentRemoteUserId,
      callId: currentCallId,
    })

    // Update store
    storeRejectCall()
    cleanup()
  }, [storeRejectCall, getSignalingChannel, cleanup])

  /**
   * Hangup current call
   */
  const hangup = useCallback((): void => {
    const { callId: currentCallId, remoteUserId: currentRemoteUserId, status: currentStatus } = stateRef.current
    if (currentStatus === 'idle' || !currentCallId) return

    console.log('[useCall] Hanging up:', currentCallId)

    // Stop ringtone immediately using singleton
    stopCurrentTone()

    // Send call-hangup if we have a remote user
    if (currentRemoteUserId) {
      const signaling = getSignalingChannel()
      signaling.send({
        type: 'call-hangup',
        recipientId: currentRemoteUserId,
        callId: currentCallId,
      })
    }

    cleanup()
    endCall()
  }, [getSignalingChannel, cleanup, endCall])

  /**
   * Toggle mute state
   */
  const toggleMute = useCallback((): void => {
    const newMuted = storeToggleMute()

    // Update audio track enabled state
    if (peerConnectionRef.current) {
      peerConnectionRef.current.setAudioEnabled(!newMuted)
    }

    // Also update local stream tracks
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = !newMuted
      })
    }
  }, [storeToggleMute])

  /**
   * Toggle video on/off
   */
  const toggleVideo = useCallback(async (): Promise<void> => {
    const pc = peerConnectionRef.current

    if (isVideoEnabled) {
      // Stop video
      console.log('[useCall] Stopping video')
      try {
        if (localVideoStreamRef.current) {
          localVideoStreamRef.current.getTracks().forEach(track => track.stop())
          localVideoStreamRef.current = null
        }
        setIsVideoEnabled(false)
        setLocalVideoStream(null)

        // Remove video track from peer connection
        if (pc) {
          try {
            const senders = pc.getSenders()
            const videoSender = senders.find((s: RTCRtpSender) => s.track?.kind === 'video')
            if (videoSender) {
              pc.removeTrack(videoSender)
            }
          } catch (e) {
            console.error('[useCall] Error removing video track:', e)
          }
        }
      } catch (error) {
        console.error('[useCall] Error stopping video:', error)
      }
    } else {
      // Start video
      console.log('[useCall] Starting video')
      try {
        // Check if mediaDevices is available
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          toast.error('Camera not supported on this device')
          return
        }

        // Get video constraints based on quality setting
        const qualityConstraints: Record<string, { width: number; height: number }> = {
          low: { width: 640, height: 360 },
          medium: { width: 1280, height: 720 },
          high: { width: 1920, height: 1080 },
        }
        const quality = qualityConstraints[videoQuality] || qualityConstraints.medium

        const constraints: MediaStreamConstraints = {
          video: {
            width: { ideal: quality.width },
            height: { ideal: quality.height },
            ...(preferredCameraId ? { deviceId: { exact: preferredCameraId } } : {}),
          },
          audio: false,
        }

        const stream = await navigator.mediaDevices.getUserMedia(constraints)
        localVideoStreamRef.current = stream
        setLocalVideoStream(stream)
        setIsVideoEnabled(true)

        // Add video track to peer connection
        const videoTrack = stream.getVideoTracks()[0]
        if (videoTrack && pc) {
          try {
            pc.addTrack(videoTrack, stream)
            console.log('[useCall] Video track added to peer connection')
          } catch (e) {
            console.error('[useCall] Error adding video track to peer connection:', e)
            // Video is still available locally even if peer connection fails
          }
        } else if (!pc) {
          console.warn('[useCall] No peer connection, video only available locally')
        }
      } catch (error) {
        console.error('[useCall] Failed to start video:', error)
        // Provide more specific error messages
        if (error instanceof Error) {
          if (error.name === 'NotAllowedError') {
            toast.error('Camera permission denied')
          } else if (error.name === 'NotFoundError') {
            toast.error('No camera found')
          } else if (error.name === 'NotReadableError') {
            toast.error('Camera is in use by another app')
          } else {
            toast.error('Failed to start camera: ' + error.message)
          }
        } else {
          toast.error('Failed to start camera')
        }
      }
    }
  }, [isVideoEnabled, videoQuality, preferredCameraId])

  /**
   * Effect to replace video track when blur is toggled mid-call.
   * Uses replaceTrack() for seamless switching without renegotiation.
   */
  useEffect(() => {
    const pc = peerConnectionRef.current
    if (!pc || !isVideoEnabled) return

    // Get the track we should be sending (from processed or raw stream)
    const streamToSend = processedStream || localVideoStream
    if (!streamToSend) return

    const newVideoTrack = streamToSend.getVideoTracks()[0]
    if (!newVideoTrack) return

    // Find the video sender and replace its track
    const senders = pc.getSenders()
    const videoSender = senders.find((s: RTCRtpSender) => s.track?.kind === 'video')

    if (videoSender && videoSender.track !== newVideoTrack) {
      console.log('[useCall] Replacing video track for blur toggle')
      videoSender.replaceTrack(newVideoTrack).catch((e) => {
        console.error('[useCall] Failed to replace video track:', e)
      })
    }
  }, [processedStream, localVideoStream, isVideoEnabled])

  /**
   * Handle incoming signaling messages
   */
  useEffect(() => {
    const handleSignaling = async (event: Event) => {
      const message = (event as CustomEvent<CallSignalingMessage>).detail
      const { callId: currentCallId, user, status: currentStatus } = stateRef.current

      console.log('[useCall] Signaling message:', message.type, message)

      switch (message.type) {
        case 'call-offer': {
          // Incoming call or renegotiation
          console.log('[useCall] call-offer received, currentStatus:', currentStatus, 'currentCallId:', currentCallId, 'messageCallId:', message.callId)

          // If this is for our current active call, it's a renegotiation (e.g., adding video)
          if (currentCallId === message.callId && ['connecting', 'connected', 'reconnecting'].includes(currentStatus)) {
            console.log('[useCall] Renegotiation offer for current call')
            if (message.sdp && peerConnectionRef.current) {
              try {
                await peerConnectionRef.current.handleRemoteDescription({
                  type: 'offer',
                  sdp: message.sdp,
                })
                console.log('[useCall] Handled renegotiation offer')
              } catch (e) {
                console.error('[useCall] Error handling renegotiation offer:', e)
              }
            }
            return
          }

          // If we're already handling this exact call (same callId), just store the SDP
          // This happens because caller sends initial notification, then Perfect Negotiation sends offer with SDP
          if (currentStatus === 'incoming' && currentCallId === message.callId) {
            console.log('[useCall] Same callId for existing incoming call, storing SDP')
            if (message.sdp) {
              pendingSdpRef.current = message.sdp
            }
            return
          }

          if (currentStatus !== 'idle') {
            // Already in a different call, reject this one
            console.log('[useCall] Rejecting because status is not idle:', currentStatus)
            const signaling = getSignalingChannel()
            signaling.send({
              type: 'call-reject',
              recipientId: message.senderId,
              callId: message.callId,
            })
            return
          }

          // Determine polite role (caller's lower ID is polite)
          const isPoliteRole = String(user?.id) < message.senderId

          // Store SDP for later if provided
          if (message.sdp) {
            pendingSdpRef.current = message.sdp
          }

          // Update store with incoming call
          console.log('[useCall] Calling receiveIncomingCall:', message.callId, message.senderId, message.senderUsername, isPoliteRole)
          receiveIncomingCall(message.callId, message.senderId, message.senderUsername, isPoliteRole)
          console.log('[useCall] After receiveIncomingCall, store state:', useCallStore.getState())

          // Play ringtone for incoming call
          const { ringtoneEnabled } = stateRef.current
          if (ringtoneEnabled) {
            resumeAudioContext().then(() => {
              // Check we're still in incoming state
              if (useCallStore.getState().status === 'incoming') {
                playRingtone()
                console.log('[useCall] Started incoming ringtone')
              }
            })
          }

          // Set auto-reject timeout
          const { ringTimeout } = stateRef.current
          ringTimeoutRef.current = window.setTimeout(() => {
            console.log('[useCall] Auto-rejecting (ring timeout)')
            const currentState = useCallStore.getState()
            if (currentState.status === 'incoming') {
              const signaling = getSignalingChannel()
              signaling.send({
                type: 'call-reject',
                recipientId: message.senderId,
                callId: message.callId,
              })
              reset()
            }
          }, ringTimeout * 1000)
          break
        }

        case 'call-accept': {
          // Remote accepted our call
          if (message.callId !== currentCallId) return
          console.log('[useCall] Call accepted by remote')
          // Stop ringback tone using singleton
          stopCurrentTone()
          setConnecting()
          break
        }

        case 'call-answer': {
          // Remote sent SDP answer
          if (message.callId !== currentCallId) return
          if (peerConnectionRef.current) {
            await peerConnectionRef.current.handleRemoteDescription({
              type: 'answer',
              sdp: message.sdp,
            })
          }
          break
        }

        case 'call-ice-candidate': {
          // Remote sent ICE candidate
          if (message.callId !== currentCallId) return
          if (peerConnectionRef.current) {
            await peerConnectionRef.current.handleIceCandidate(message.candidate)
          }
          break
        }

        case 'call-reject': {
          // Remote rejected our call
          if (message.callId !== currentCallId) return
          console.log('[useCall] Call rejected by remote')
          cleanup()
          endCall()
          break
        }

        case 'call-hangup': {
          // Remote hung up
          if (message.callId !== currentCallId) return
          console.log('[useCall] Remote hung up')
          cleanup()
          endCall()
          break
        }
      }
    }

    window.addEventListener(CALL_SIGNALING_EVENT, handleSignaling)
    return () => {
      window.removeEventListener(CALL_SIGNALING_EVENT, handleSignaling)
    }
  }, [
    getSignalingChannel,
    receiveIncomingCall,
    setConnecting,
    cleanup,
    endCall,
    reset,
  ])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup()
    }
  }, [cleanup])

  return {
    // State
    status,
    remoteUsername,
    isMuted,
    quality,
    latency,
    isMinimized,
    startTime,

    // Video state
    isVideoEnabled,
    localVideoStream,
    remoteVideoStream,
    displayStream,
    isBlurProcessing,

    // Actions
    startCall,
    acceptCall,
    rejectCall,
    hangup,
    toggleMute,
    toggleMinimized,
    toggleVideo,
  }
}
