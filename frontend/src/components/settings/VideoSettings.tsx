import { useState, useEffect } from 'react'
import { useCamera } from '@/hooks/useCamera'
import { VideoPreview } from '@/components/video/VideoPreview'
import { VideoControls } from '@/components/video/VideoControls'
import { isBlurSupported } from '@/lib/video/backgroundBlur'
import type { VideoQuality } from '@/lib/video/videoConstraints'

interface VideoSettingsProps {
  onClose?: () => void
}

export function VideoSettings({ onClose }: VideoSettingsProps) {
  const {
    stream,
    isActive,
    error,
    devices,
    selectedDeviceId,
    start,
    stop,
    switchDevice,
    setQuality
  } = useCamera({ autoStart: true, quality: 'medium' })

  const [quality, setQualityState] = useState<VideoQuality>('medium')
  const [isBlurOn, setIsBlurOn] = useState(false)
  const blurSupported = isBlurSupported()

  // Handle quality change
  const handleQualityChange = async (newQuality: VideoQuality) => {
    setQualityState(newQuality)
    await setQuality(newQuality)
    // Save to localStorage
    localStorage.setItem('video-quality', newQuality)
  }

  // Handle device change
  const handleDeviceChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const deviceId = e.target.value
    await switchDevice(deviceId)
    // Save to localStorage
    localStorage.setItem('video-device', deviceId)
  }

  // Load saved settings
  useEffect(() => {
    const savedQuality = localStorage.getItem('video-quality') as VideoQuality | null
    const savedDevice = localStorage.getItem('video-device')
    const savedBlur = localStorage.getItem('video-blur')

    if (savedQuality) {
      setQualityState(savedQuality)
      setQuality(savedQuality)
    }

    if (savedDevice && devices.some(d => d.deviceId === savedDevice)) {
      switchDevice(savedDevice)
    }

    if (savedBlur === 'true') {
      setIsBlurOn(true)
    }
  }, [devices])

  // Save blur preference
  const handleBlurToggle = () => {
    const newValue = !isBlurOn
    setIsBlurOn(newValue)
    localStorage.setItem('video-blur', String(newValue))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Video Settings</h3>
        {onClose && (
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Preview */}
      <div className="aspect-video max-w-md mx-auto">
        <VideoPreview
          stream={stream}
          isActive={isActive}
          className="w-full h-full"
        />
      </div>

      {/* Error */}
      {error && (
        <p className="text-red-500 text-sm">{error}</p>
      )}

      {/* Controls */}
      <div className="flex justify-center">
        <VideoControls
          isCameraOn={isActive}
          isBlurOn={isBlurOn}
          quality={quality}
          onToggleCamera={isActive ? stop : start}
          onToggleBlur={handleBlurToggle}
          onQualityChange={handleQualityChange}
        />
      </div>

      {/* Camera Selection */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-300">Camera</label>
        <select
          value={selectedDeviceId || ''}
          onChange={handleDeviceChange}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
        >
          {devices.length === 0 ? (
            <option value="">No cameras found</option>
          ) : (
            devices.map((device) => (
              <option key={device.deviceId} value={device.deviceId}>
                {device.label || `Camera ${device.deviceId.slice(0, 8)}`}
              </option>
            ))
          )}
        </select>
      </div>

      {/* Quality Selection */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-300">Video Quality</label>
        <select
          value={quality}
          onChange={(e) => handleQualityChange(e.target.value as VideoQuality)}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
        >
          <option value="low">Low (360p, 15fps)</option>
          <option value="medium">Medium (720p, 24fps)</option>
          <option value="high">High (1080p, 30fps)</option>
        </select>
        <p className="text-xs text-gray-500">
          Lower quality uses less bandwidth and works better on slower connections.
        </p>
      </div>

      {/* Blur Toggle */}
      {blurSupported && (
        <div className="flex items-center justify-between">
          <div>
            <label className="block text-sm font-medium text-gray-300">Background Blur</label>
            <p className="text-xs text-gray-500">Blur your background during video calls</p>
          </div>
          <button
            onClick={handleBlurToggle}
            className={`relative w-11 h-6 rounded-full transition-colors ${
              isBlurOn ? 'bg-blue-600' : 'bg-gray-600'
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                isBlurOn ? 'translate-x-5' : ''
              }`}
            />
          </button>
        </div>
      )}

      {!blurSupported && (
        <p className="text-sm text-yellow-600">
          Background blur is only available in Chrome, Edge, and Opera browsers.
        </p>
      )}
    </div>
  )
}
