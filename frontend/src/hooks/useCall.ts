import { useState, useCallback, useRef, useEffect } from 'react'
import { useCamera } from '@/hooks/useCamera'
import { useSettingsStore } from '@/stores/settingsStore'
import { useCallStore } from '@/stores/callStore'

interface UseCallReturn {
  // From call store
  status: ReturnType<typeof useCallStore.getState>['status']
  callId: string | null
  remoteUserId: string | null
  remoteUsername: string | null
  isMuted: boolean
  quality: 1 | 2 | 3 | 4
  latency: number | null
  startTime: Date | null
  isMinimized: boolean

  // Video state
  isVideoEnabled: boolean
  localVideoStream: MediaStream | null
  remoteVideoStream: MediaStream | null

  // Audio actions (from store)
  toggleMute: () => boolean
  toggleMinimized: () => void

  // Video actions
  toggleVideo: () => Promise<void>

  // Peer connection ref for external use
  peerConnectionRef: React.MutableRefObject<RTCPeerConnection | null>

  // Set remote video stream (called by WebRTC handlers)
  setRemoteVideoStream: (stream: MediaStream | null) => void
}

/**
 * Hook for managing call state including video tracks.
 * Wraps callStore and adds video management functionality.
 */
export function useCall(): UseCallReturn {
  // Call store state
  const status = useCallStore((s) => s.status)
  const callId = useCallStore((s) => s.callId)
  const remoteUserId = useCallStore((s) => s.remoteUserId)
  const remoteUsername = useCallStore((s) => s.remoteUsername)
  const isMuted = useCallStore((s) => s.isMuted)
  const quality = useCallStore((s) => s.quality)
  const latency = useCallStore((s) => s.latency)
  const startTime = useCallStore((s) => s.startTime)
  const isMinimized = useCallStore((s) => s.isMinimized)
  const toggleMute = useCallStore((s) => s.toggleMute)
  const toggleMinimized = useCallStore((s) => s.toggleMinimized)

  // Video settings from settings store
  const videoQuality = useSettingsStore((s) => s.videoQuality)
  const preferredCameraId = useSettingsStore((s) => s.preferredCameraId)

  // Video state
  const [isVideoEnabled, setIsVideoEnabled] = useState(false)
  const [localVideoStream, setLocalVideoStream] = useState<MediaStream | null>(null)
  const [remoteVideoStream, setRemoteVideoStream] = useState<MediaStream | null>(null)

  // Peer connection ref - shared with WebRTC logic
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null)

  // Camera hook for local video
  const camera = useCamera({
    quality: videoQuality,
    deviceId: preferredCameraId || undefined
  })

  // Toggle video on/off
  const toggleVideo = useCallback(async () => {
    if (isVideoEnabled) {
      // Stop video
      camera.stop()
      setIsVideoEnabled(false)
      setLocalVideoStream(null)

      // Remove video track from peer connection
      const senders = peerConnectionRef.current?.getSenders()
      const videoSender = senders?.find(s => s.track?.kind === 'video')
      if (videoSender) {
        peerConnectionRef.current?.removeTrack(videoSender)
      }
    } else {
      // Start video
      await camera.start()
      if (camera.stream) {
        setLocalVideoStream(camera.stream)
        setIsVideoEnabled(true)

        // Add video track to peer connection
        const videoTrack = camera.stream.getVideoTracks()[0]
        if (videoTrack && peerConnectionRef.current) {
          peerConnectionRef.current.addTrack(videoTrack, camera.stream)
        }
      }
    }
  }, [isVideoEnabled, camera])

  // Update local video stream when camera stream changes
  useEffect(() => {
    if (camera.isActive && camera.stream) {
      setLocalVideoStream(camera.stream)
    }
  }, [camera.isActive, camera.stream])

  // Cleanup video on call end
  useEffect(() => {
    if (status === 'idle' || status === 'ended') {
      camera.stop()
      setIsVideoEnabled(false)
      setLocalVideoStream(null)
      setRemoteVideoStream(null)
    }
  }, [status, camera])

  return {
    // From call store
    status,
    callId,
    remoteUserId,
    remoteUsername,
    isMuted,
    quality,
    latency,
    startTime,
    isMinimized,

    // Video state
    isVideoEnabled,
    localVideoStream,
    remoteVideoStream,

    // Audio actions
    toggleMute,
    toggleMinimized,

    // Video actions
    toggleVideo,

    // Peer connection ref
    peerConnectionRef,

    // Set remote video stream
    setRemoteVideoStream,
  }
}
