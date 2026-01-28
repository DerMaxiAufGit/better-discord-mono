import { useState, useRef, useCallback, useEffect } from 'react'

interface UseAudioLevelReturn {
  level: number              // 0-100 normalized level
  isActive: boolean          // true if level > threshold
  start: (stream: MediaStream) => void
  stop: () => void
}

export function useAudioLevel(threshold: number = 15): UseAudioLevelReturn {
  const [level, setLevel] = useState(0)
  const [isActive, setIsActive] = useState(false)

  // Refs to persist across renders without causing re-renders
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const dataArrayRef = useRef<Uint8Array<ArrayBuffer> | null>(null)

  // Cleanup function
  const cleanup = useCallback(() => {
    // Cancel animation frame
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }

    // Disconnect source
    if (sourceRef.current) {
      sourceRef.current.disconnect()
      sourceRef.current = null
    }

    // Disconnect analyser
    if (analyserRef.current) {
      analyserRef.current.disconnect()
      analyserRef.current = null
    }

    // Close audio context
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {
        // Ignore close errors
      })
      audioContextRef.current = null
    }

    // Clear data array
    dataArrayRef.current = null

    // Reset state
    setLevel(0)
    setIsActive(false)
  }, [])

  // Start analyzing audio levels from stream
  const start = useCallback((stream: MediaStream) => {
    // Cleanup any existing setup
    cleanup()

    // Create audio context
    const audioContext = new AudioContext()
    audioContextRef.current = audioContext

    // Resume context if suspended (Chrome requires user gesture)
    if (audioContext.state === 'suspended') {
      audioContext.resume().catch(() => {
        // Ignore resume errors
      })
    }

    // Create analyser node
    const analyser = audioContext.createAnalyser()
    analyser.fftSize = 256 // Smaller FFT for faster analysis
    analyser.smoothingTimeConstant = 0.3 // Some smoothing
    analyserRef.current = analyser

    // Create source from stream
    const source = audioContext.createMediaStreamSource(stream)
    sourceRef.current = source

    // Connect source -> analyser (don't connect to destination to avoid feedback)
    source.connect(analyser)

    // Create data array for frequency data
    const bufferLength = analyser.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)
    dataArrayRef.current = dataArray

    // Last update timestamp for throttling
    let lastUpdate = 0
    const updateInterval = 33 // ~30fps

    // Animation loop for analyzing audio
    const analyze = (timestamp: number) => {
      // Throttle to ~30fps
      if (timestamp - lastUpdate < updateInterval) {
        animationFrameRef.current = requestAnimationFrame(analyze)
        return
      }
      lastUpdate = timestamp

      // Check if still active
      if (!analyserRef.current || !dataArrayRef.current) {
        return
      }

      // Get frequency data
      analyserRef.current.getByteFrequencyData(dataArrayRef.current)

      // Calculate average level
      let sum = 0
      for (let i = 0; i < dataArrayRef.current.length; i++) {
        sum += dataArrayRef.current[i]
      }
      const average = sum / dataArrayRef.current.length

      // Normalize to 0-100 range (byte data is 0-255)
      const normalizedLevel = Math.round((average / 255) * 100)

      // Update state
      setLevel(normalizedLevel)
      setIsActive(normalizedLevel > threshold)

      // Continue loop
      animationFrameRef.current = requestAnimationFrame(analyze)
    }

    // Start analyzing
    animationFrameRef.current = requestAnimationFrame(analyze)
  }, [cleanup, threshold])

  // Stop analyzing and cleanup
  const stop = useCallback(() => {
    cleanup()
  }, [cleanup])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup()
    }
  }, [cleanup])

  return {
    level,
    isActive,
    start,
    stop
  }
}
