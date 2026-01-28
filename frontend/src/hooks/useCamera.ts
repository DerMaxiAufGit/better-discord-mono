import { useState, useEffect, useCallback, useRef } from 'react'
import { getVideoConstraints, getCameraDevices, VideoQuality } from '@/lib/video/videoConstraints'

interface UseCameraOptions {
  autoStart?: boolean
  quality?: VideoQuality
  deviceId?: string
}

interface UseCameraReturn {
  stream: MediaStream | null
  isActive: boolean
  error: string | null
  devices: MediaDeviceInfo[]
  selectedDeviceId: string | null
  start: () => Promise<void>
  stop: () => void
  switchDevice: (deviceId: string) => Promise<void>
  setQuality: (quality: VideoQuality) => Promise<void>
}

export function useCamera(options: UseCameraOptions = {}): UseCameraReturn {
  const { autoStart = false, quality: initialQuality = 'medium', deviceId: initialDeviceId } = options

  const [stream, setStream] = useState<MediaStream | null>(null)
  const [isActive, setIsActive] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([])
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(initialDeviceId ?? null)
  const [quality, setQualityState] = useState<VideoQuality>(initialQuality)

  const streamRef = useRef<MediaStream | null>(null)

  // Load available cameras
  useEffect(() => {
    getCameraDevices().then(setDevices).catch(console.error)
  }, [])

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    setStream(null)
    setIsActive(false)
  }, [])

  const startStream = useCallback(async (deviceId?: string, videoQuality?: VideoQuality) => {
    try {
      setError(null)
      stopStream()

      const constraints = getVideoConstraints({
        quality: videoQuality ?? quality,
        deviceId: deviceId ?? selectedDeviceId ?? undefined
      })

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints)
      streamRef.current = mediaStream
      setStream(mediaStream)
      setIsActive(true)

      if (deviceId) {
        setSelectedDeviceId(deviceId)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to access camera'
      setError(message)
      console.error('Camera error:', err)
    }
  }, [quality, selectedDeviceId, stopStream])

  const switchDevice = useCallback(async (deviceId: string) => {
    await startStream(deviceId, quality)
  }, [startStream, quality])

  const setQuality = useCallback(async (newQuality: VideoQuality) => {
    setQualityState(newQuality)
    if (isActive) {
      await startStream(selectedDeviceId ?? undefined, newQuality)
    }
  }, [isActive, selectedDeviceId, startStream])

  // Auto-start if requested
  useEffect(() => {
    if (autoStart) {
      startStream()
    }
  }, [autoStart, startStream])

  // Cleanup on unmount
  useEffect(() => {
    return () => stopStream()
  }, [stopStream])

  return {
    stream,
    isActive,
    error,
    devices,
    selectedDeviceId,
    start: () => startStream(),
    stop: stopStream,
    switchDevice,
    setQuality
  }
}
