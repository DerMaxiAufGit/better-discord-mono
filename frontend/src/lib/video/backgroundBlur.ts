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

    // Draw blurred background
    this.outputCtx.filter = `blur(${this.blurAmount}px)`
    this.outputCtx.drawImage(results.image, 0, 0, width, height)

    // Draw person without blur using segmentation mask
    this.outputCtx.filter = 'none'
    this.outputCtx.globalCompositeOperation = 'destination-atop'
    this.outputCtx.drawImage(results.segmentationMask, 0, 0, width, height)

    // Reset composite operation
    this.outputCtx.globalCompositeOperation = 'source-over'
  }

  start(videoElement: HTMLVideoElement): void {
    if (this.isProcessing || !this.segmenter) return
    this.isProcessing = true

    // Match canvas to video dimensions
    this.outputCanvas.width = videoElement.videoWidth
    this.outputCanvas.height = videoElement.videoHeight

    const processFrame = async () => {
      if (!this.isProcessing) return

      await this.segmenter!.send({ image: videoElement })

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
