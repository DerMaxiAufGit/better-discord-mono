export type VideoQuality = 'low' | 'medium' | 'high'

interface VideoConstraintOptions {
  quality: VideoQuality
  deviceId?: string
  facingMode?: 'user' | 'environment'
}

const QUALITY_PRESETS = {
  low: { width: 640, height: 360, frameRate: 15 },
  medium: { width: 1280, height: 720, frameRate: 24 },
  high: { width: 1920, height: 1080, frameRate: 30 }
} as const

export function getVideoConstraints(options: VideoConstraintOptions): MediaStreamConstraints {
  const preset = QUALITY_PRESETS[options.quality]

  return {
    audio: false,
    video: {
      deviceId: options.deviceId ? { exact: options.deviceId } : undefined,
      facingMode: options.facingMode,
      width: { ideal: preset.width, max: preset.width },
      height: { ideal: preset.height, max: preset.height },
      frameRate: { ideal: preset.frameRate, max: preset.frameRate }
    }
  }
}

export async function getCameraDevices(): Promise<MediaDeviceInfo[]> {
  const devices = await navigator.mediaDevices.enumerateDevices()
  return devices.filter(device => device.kind === 'videoinput')
}

export async function requestCameraPermission(): Promise<boolean> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true })
    stream.getTracks().forEach(track => track.stop())
    return true
  } catch {
    return false
  }
}
