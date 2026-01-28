import { useState, useEffect, useCallback } from 'react'
import { useSettingsStore } from '@/stores/settingsStore'

interface AudioDevices {
  inputs: MediaDeviceInfo[]    // Microphones
  outputs: MediaDeviceInfo[]   // Speakers
}

interface UseAudioDevicesReturn {
  devices: AudioDevices
  isLoading: boolean
  error: string | null
  permissionState: 'prompt' | 'granted' | 'denied' | 'unknown'
  refresh: () => Promise<void>
  getAudioStream: (deviceId?: string) => Promise<MediaStream>
  setSpeaker: (audioElement: HTMLAudioElement, deviceId: string) => Promise<void>
}

export function useAudioDevices(): UseAudioDevicesReturn {
  const [devices, setDevices] = useState<AudioDevices>({ inputs: [], outputs: [] })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [permissionState, setPermissionState] = useState<'prompt' | 'granted' | 'denied' | 'unknown'>('unknown')

  // Get audio processing settings from store
  const { echoCancellation, noiseSuppression, autoGainControl } = useSettingsStore()

  // Enumerate available audio devices
  const enumerateDevices = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const allDevices = await navigator.mediaDevices.enumerateDevices()

      // Filter to audio devices only
      const inputs = allDevices.filter(d => d.kind === 'audioinput')
      const outputs = allDevices.filter(d => d.kind === 'audiooutput')

      setDevices({ inputs, outputs })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to enumerate devices'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Check microphone permission state
  const checkPermission = useCallback(async () => {
    try {
      // Check if permissions API is available
      if ('permissions' in navigator) {
        const result = await navigator.permissions.query({ name: 'microphone' as PermissionName })
        setPermissionState(result.state as 'prompt' | 'granted' | 'denied')

        // Listen for permission changes
        result.addEventListener('change', () => {
          setPermissionState(result.state as 'prompt' | 'granted' | 'denied')
          // Re-enumerate devices when permission changes (labels become available)
          enumerateDevices()
        })
      } else {
        // Permissions API not available, fall back to unknown
        setPermissionState('unknown')
      }
    } catch {
      // Permission query failed (some browsers don't support microphone query)
      setPermissionState('unknown')
    }
  }, [enumerateDevices])

  // Get audio stream from microphone
  const getAudioStream = useCallback(async (deviceId?: string): Promise<MediaStream> => {
    const constraints: MediaStreamConstraints = {
      audio: {
        echoCancellation,
        noiseSuppression,
        autoGainControl,
        ...(deviceId ? { deviceId: { exact: deviceId } } : {})
      },
      video: false
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints)

      // After getting stream, permission is granted - update state
      setPermissionState('granted')

      // Re-enumerate to get device labels (now available with permission)
      await enumerateDevices()

      return stream
    } catch (err) {
      if (err instanceof DOMException) {
        if (err.name === 'NotAllowedError') {
          setPermissionState('denied')
          throw new Error('Microphone permission denied')
        }
        if (err.name === 'NotFoundError') {
          throw new Error('No microphone found')
        }
        if (err.name === 'OverconstrainedError') {
          throw new Error('Selected microphone not available')
        }
      }
      throw err
    }
  }, [echoCancellation, noiseSuppression, autoGainControl, enumerateDevices])

  // Set speaker output on an audio element
  const setSpeaker = useCallback(async (audioElement: HTMLAudioElement, deviceId: string): Promise<void> => {
    // Check if setSinkId is available (not all browsers support it)
    if ('setSinkId' in audioElement) {
      try {
        await (audioElement as HTMLAudioElement & { setSinkId: (id: string) => Promise<void> }).setSinkId(deviceId)
      } catch (err) {
        if (err instanceof DOMException && err.name === 'NotAllowedError') {
          throw new Error('Speaker selection not allowed')
        }
        throw err
      }
    } else {
      throw new Error('Speaker selection not supported in this browser')
    }
  }, [])

  // Refresh device list
  const refresh = useCallback(async () => {
    await enumerateDevices()
  }, [enumerateDevices])

  // Initial setup
  useEffect(() => {
    checkPermission()
    enumerateDevices()

    // Listen for device changes (plug/unplug)
    const handleDeviceChange = () => {
      enumerateDevices()
    }

    navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange)

    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange)
    }
  }, [checkPermission, enumerateDevices])

  return {
    devices,
    isLoading,
    error,
    permissionState,
    refresh,
    getAudioStream,
    setSpeaker
  }
}
