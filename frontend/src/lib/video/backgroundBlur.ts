import { SelfieSegmentation, Results } from '@mediapipe/selfie_segmentation'

export class BackgroundBlurProcessor {
  private segmenter: SelfieSegmentation | null = null
  private outputCanvas: HTMLCanvasElement
  private outputCtx: CanvasRenderingContext2D
  private isProcessing = false
  private animationFrameId: number | null = null
  private blurAmount = 8

  constructor(outputCanvas: HTMLCanvasElement) {
    this.outputCanvas = outputCanvas
    this.outputCtx = outputCanvas.getContext('2d')!
  }

  async initialize(): Promise<void> {
    this.segmenter = new SelfieSegmentation({
      locateFile: (file) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`
    })

    this.segmenter.setOptions({
      modelSelection: 1, // landscape model (faster)
      selfieMode: false
    })

    this.segmenter.onResults(this.onResults.bind(this))
  }

  private onResults(results: Results): void {
    const { width, height } = this.outputCanvas
    if (width === 0 || height === 0) return

    // Clear canvas
    this.outputCtx.clearRect(0, 0, width, height)

    // Step 1: Draw the blurred background (entire frame with blur)
    this.outputCtx.globalCompositeOperation = 'source-over'
    this.outputCtx.filter = `blur(${this.blurAmount}px)`
    this.outputCtx.drawImage(results.image, 0, 0, width, height)
    this.outputCtx.filter = 'none'

    // Step 2: Cut out a person-shaped hole using the segmentation mask
    // destination-out: removes pixels where the mask is opaque (person area)
    this.outputCtx.globalCompositeOperation = 'destination-out'
    this.outputCtx.drawImage(results.segmentationMask, 0, 0, width, height)

    // Step 3: Draw the sharp original frame behind (shows through the hole)
    // destination-over: draws new content behind existing content
    this.outputCtx.globalCompositeOperation = 'destination-over'
    this.outputCtx.drawImage(results.image, 0, 0, width, height)

    // Reset composite operation
    this.outputCtx.globalCompositeOperation = 'source-over'
  }

  start(videoElement: HTMLVideoElement): void {
    if (this.isProcessing || !this.segmenter) {
      console.log('[BackgroundBlur] Cannot start: isProcessing=', this.isProcessing, 'segmenter=', !!this.segmenter)
      return
    }

    // Match canvas to video dimensions
    const width = videoElement.videoWidth
    const height = videoElement.videoHeight

    if (width === 0 || height === 0) {
      console.error('[BackgroundBlur] Video has no dimensions:', width, height)
      return
    }

    this.outputCanvas.width = width
    this.outputCanvas.height = height
    this.isProcessing = true

    console.log('[BackgroundBlur] Starting processing at', width, 'x', height)

    const processFrame = async () => {
      if (!this.isProcessing) return

      try {
        await this.segmenter!.send({ image: videoElement })
      } catch (e) {
        console.error('[BackgroundBlur] Error processing frame:', e)
      }

      // Throttle to ~20fps for performance
      this.animationFrameId = requestAnimationFrame(() => {
        setTimeout(processFrame, 50) // 50ms = 20fps
      })
    }

    processFrame()
  }

  stop(): void {
    this.isProcessing = false
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId)
      this.animationFrameId = null
    }
  }

  setBlurAmount(amount: number): void {
    this.blurAmount = amount
  }

  getOutputStream(): MediaStream {
    return this.outputCanvas.captureStream(30)
  }

  dispose(): void {
    this.stop()
    this.segmenter?.close()
    this.segmenter = null
  }
}

export function isBlurSupported(): boolean {
  // MediaPipe only works reliably in Chromium browsers
  const isChromium = /Chrome|Chromium|Edg|Opera/.test(navigator.userAgent)
  return isChromium && 'OffscreenCanvas' in window
}
