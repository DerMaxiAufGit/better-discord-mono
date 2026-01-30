import { useState, useRef, useEffect, useCallback } from 'react'
import { BackgroundBlurProcessor, isBlurSupported } from './backgroundBlur'

interface UseBackgroundBlurReturn {
  processedStream: MediaStream | null
  isProcessing: boolean
  error: string | null
}

/**
 * Hook to manage background blur processing for video streams.
 *
 * Creates a blur processor that takes raw camera video, segments the person,
 * and outputs a stream with blurred background.
 *
 * @param rawStream - The raw camera MediaStream to process
 * @param blurEnabled - Whether blur should be active
 * @param blurIntensity - Blur amount (1-20), default 8
 * @returns processedStream (blurred or raw), isProcessing state, and error
 */
export function useBackgroundBlur(
  rawStream: MediaStream | null,
  blurEnabled: boolean,
  blurIntensity: number = 8
): UseBackgroundBlurReturn {
  const [processedStream, setProcessedStream] = useState<MediaStream | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Refs for cleanup
  const processorRef = useRef<BackgroundBlurProcessor | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const initializingRef = useRef(false)

  /**
   * Create hidden video element for processor input
   */
  const createHiddenVideo = useCallback((stream: MediaStream): Promise<HTMLVideoElement> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video')
      video.playsInline = true
      video.muted = true
      video.autoplay = true
      video.style.position = 'absolute'
      video.style.left = '-9999px'
      video.style.visibility = 'hidden'
      document.body.appendChild(video)

      video.srcObject = stream

      const handleCanPlay = () => {
        video.removeEventListener('canplay', handleCanPlay)
        video.removeEventListener('error', handleError)

        // Ensure we have valid dimensions
        if (video.videoWidth > 0 && video.videoHeight > 0) {
          console.log('[useBackgroundBlur] Video ready:', video.videoWidth, 'x', video.videoHeight)
          resolve(video)
        } else {
          // Wait a bit more for dimensions
          setTimeout(() => {
            if (video.videoWidth > 0 && video.videoHeight > 0) {
              resolve(video)
            } else {
              document.body.removeChild(video)
              reject(new Error('Video has no dimensions'))
            }
          }, 100)
        }
      }

      const handleError = () => {
        video.removeEventListener('canplay', handleCanPlay)
        video.removeEventListener('error', handleError)
        document.body.removeChild(video)
        reject(new Error('Failed to load video'))
      }

      video.addEventListener('canplay', handleCanPlay)
      video.addEventListener('error', handleError)

      // Start playing
      video.play().catch(reject)
    })
  }, [])

  /**
   * Cleanup processor and elements
   */
  const cleanup = useCallback(() => {
    if (processorRef.current) {
      processorRef.current.dispose()
      processorRef.current = null
    }

    if (videoRef.current) {
      videoRef.current.pause()
      videoRef.current.srcObject = null
      if (videoRef.current.parentNode) {
        videoRef.current.parentNode.removeChild(videoRef.current)
      }
      videoRef.current = null
    }

    if (canvasRef.current) {
      canvasRef.current = null
    }

    setProcessedStream(null)
    setIsProcessing(false)
  }, [])

  // Effect to manage blur state
  useEffect(() => {
    let cancelled = false

    console.log('[useBackgroundBlur] Effect running:', {
      hasRawStream: !!rawStream,
      blurEnabled,
      videoTracks: rawStream?.getVideoTracks().length ?? 0
    })

    // No stream means nothing to do
    if (!rawStream) {
      cleanup()
      return
    }

    // Check if blur is supported
    if (!isBlurSupported()) {
      console.log('[useBackgroundBlur] Blur not supported, passing through raw stream')
      setProcessedStream(rawStream)
      return
    }

    // Check if there's a video track
    const videoTrack = rawStream.getVideoTracks()[0]
    if (!videoTrack) {
      console.log('[useBackgroundBlur] No video track, passing through raw stream')
      setProcessedStream(rawStream)
      return
    }

    if (blurEnabled) {
      // Initialize blur processing with cancellation check
      const initWithCancellation = async () => {
        if (initializingRef.current) {
          console.log('[useBackgroundBlur] Already initializing, skipping')
          return
        }
        initializingRef.current = true

        try {
          setIsProcessing(true)
          setError(null)

          console.log('[useBackgroundBlur] Initializing blur processor...')

          // Create canvas for processor output
          const canvas = document.createElement('canvas')

          // Create processor
          const processor = new BackgroundBlurProcessor(canvas)
          processor.setBlurAmount(blurIntensity)
          console.log('[useBackgroundBlur] Loading MediaPipe model...')
          await processor.initialize()

          if (cancelled) {
            console.log('[useBackgroundBlur] Cancelled during initialization')
            processor.dispose()
            return
          }

          console.log('[useBackgroundBlur] MediaPipe model loaded')
          canvasRef.current = canvas
          processorRef.current = processor

          // Create hidden video element
          console.log('[useBackgroundBlur] Creating video element...')
          const video = await createHiddenVideo(rawStream)

          if (cancelled) {
            console.log('[useBackgroundBlur] Cancelled after video creation')
            processor.dispose()
            video.pause()
            video.srcObject = null
            if (video.parentNode) video.parentNode.removeChild(video)
            return
          }

          videoRef.current = video

          // Start processing
          console.log('[useBackgroundBlur] Starting processor...')
          processor.start(video)

          // Get output stream from canvas
          const outputStream = processor.getOutputStream()

          if (!cancelled) {
            setProcessedStream(outputStream)
            console.log('[useBackgroundBlur] Blur processing started successfully')
          }
        } catch (e) {
          if (!cancelled) {
            console.error('[useBackgroundBlur] Failed to initialize blur:', e)
            setError(e instanceof Error ? e.message : 'Failed to initialize blur')
            cleanup()
          }
        } finally {
          setIsProcessing(false)
          initializingRef.current = false
        }
      }

      initWithCancellation()
    } else {
      // Stop blur processing, return raw stream
      cleanup()
      setProcessedStream(rawStream)
    }

    return () => {
      cancelled = true
      cleanup()
    }
  }, [rawStream, blurEnabled, createHiddenVideo, cleanup])

  // Effect to update blur intensity without reinitializing
  useEffect(() => {
    if (processorRef.current) {
      processorRef.current.setBlurAmount(blurIntensity)
    }
  }, [blurIntensity])

  return {
    processedStream,
    isProcessing,
    error,
  }
}
