import { useState } from 'react'
import { cn } from '@/lib/utils'
import { isBlurSupported } from '@/lib/video/backgroundBlur'
import type { VideoQuality } from '@/lib/video/videoConstraints'

interface VideoControlsProps {
  isCameraOn: boolean
  isBlurOn: boolean
  quality: VideoQuality
  onToggleCamera: () => void
  onToggleBlur: () => void
  onQualityChange: (quality: VideoQuality) => void
  disabled?: boolean
  compact?: boolean
}

export function VideoControls({
  isCameraOn,
  isBlurOn,
  quality,
  onToggleCamera,
  onToggleBlur,
  onQualityChange,
  disabled = false,
  compact = false
}: VideoControlsProps) {
  const [showQualityMenu, setShowQualityMenu] = useState(false)
  const blurSupported = isBlurSupported()

  return (
    <div className={cn('flex items-center gap-2', compact ? 'gap-1' : 'gap-3')}>
      {/* Camera toggle */}
      <button
        onClick={onToggleCamera}
        disabled={disabled}
        className={cn(
          'p-3 rounded-full transition-colors',
          isCameraOn
            ? 'bg-gray-700 text-white hover:bg-gray-600'
            : 'bg-red-600 text-white hover:bg-red-500',
          disabled && 'opacity-50 cursor-not-allowed',
          compact && 'p-2'
        )}
        title={isCameraOn ? 'Turn off camera' : 'Turn on camera'}
      >
        {isCameraOn ? (
          <svg className={cn('w-6 h-6', compact && 'w-5 h-5')} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        ) : (
          <svg className={cn('w-6 h-6', compact && 'w-5 h-5')} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
          </svg>
        )}
      </button>

      {/* Blur toggle (only show if supported) */}
      {blurSupported && (
        <button
          onClick={onToggleBlur}
          disabled={disabled || !isCameraOn}
          className={cn(
            'p-3 rounded-full transition-colors',
            isBlurOn
              ? 'bg-blue-600 text-white hover:bg-blue-500'
              : 'bg-gray-700 text-white hover:bg-gray-600',
            (disabled || !isCameraOn) && 'opacity-50 cursor-not-allowed',
            compact && 'p-2'
          )}
          title={isBlurOn ? 'Disable blur' : 'Enable blur'}
        >
          <svg className={cn('w-6 h-6', compact && 'w-5 h-5')} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </button>
      )}

      {/* Quality selector */}
      {!compact && (
        <div className="relative">
          <button
            onClick={() => setShowQualityMenu(!showQualityMenu)}
            disabled={disabled}
            className={cn(
              'px-3 py-2 rounded-lg bg-gray-700 text-white text-sm hover:bg-gray-600 transition-colors',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            {quality.charAt(0).toUpperCase() + quality.slice(1)}
          </button>

          {showQualityMenu && (
            <div className="absolute bottom-full left-0 mb-2 bg-gray-800 rounded-lg shadow-lg py-1 min-w-[100px]">
              {(['low', 'medium', 'high'] as VideoQuality[]).map((q) => (
                <button
                  key={q}
                  onClick={() => {
                    onQualityChange(q)
                    setShowQualityMenu(false)
                  }}
                  className={cn(
                    'w-full px-4 py-2 text-left text-sm hover:bg-gray-700',
                    quality === q ? 'text-blue-400' : 'text-white'
                  )}
                >
                  {q.charAt(0).toUpperCase() + q.slice(1)}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function VideoControlBar({
  isCameraOn,
  isBlurOn,
  onToggleCamera,
  onToggleBlur,
  disabled = false
}: Omit<VideoControlsProps, 'quality' | 'onQualityChange' | 'compact'>) {
  const blurSupported = isBlurSupported()

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/50 rounded-full px-4 py-2">
      <button
        onClick={onToggleCamera}
        disabled={disabled}
        className={cn(
          'p-2 rounded-full transition-colors',
          isCameraOn ? 'text-white hover:bg-white/20' : 'text-red-500 hover:bg-red-500/20'
        )}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      </button>

      {blurSupported && isCameraOn && (
        <button
          onClick={onToggleBlur}
          disabled={disabled}
          className={cn(
            'p-2 rounded-full transition-colors',
            isBlurOn ? 'text-blue-400 hover:bg-blue-500/20' : 'text-white hover:bg-white/20'
          )}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </button>
      )}
    </div>
  )
}
