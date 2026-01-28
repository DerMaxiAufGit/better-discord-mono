import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'

interface VideoPreviewProps {
  stream: MediaStream | null
  isActive: boolean
  isMirrored?: boolean
  showPlaceholder?: boolean
  className?: string
  onClick?: () => void
}

export function VideoPreview({
  stream,
  isActive,
  isMirrored = true,
  showPlaceholder = true,
  className,
  onClick
}: VideoPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (videoRef.current) {
      if (stream && isActive) {
        videoRef.current.srcObject = stream
      } else {
        videoRef.current.srcObject = null
      }
    }
  }, [stream, isActive])

  return (
    <div
      className={cn(
        'relative bg-gray-900 rounded-lg overflow-hidden',
        onClick && 'cursor-pointer hover:ring-2 hover:ring-blue-500',
        className
      )}
      onClick={onClick}
    >
      {isActive && stream ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={cn(
            'w-full h-full object-cover',
            isMirrored && 'scale-x-[-1]'
          )}
        />
      ) : showPlaceholder ? (
        <div className="w-full h-full flex items-center justify-center">
          <div className="text-gray-500 text-center">
            <svg
              className="w-16 h-16 mx-auto mb-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
            <p className="text-sm">Camera off</p>
          </div>
        </div>
      ) : null}
    </div>
  )
}

interface SelfViewProps {
  stream: MediaStream | null
  isActive: boolean
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
  size?: 'small' | 'medium' | 'large'
  onHide?: () => void
}

export function SelfView({
  stream,
  isActive,
  position = 'bottom-right',
  size = 'small',
  onHide
}: SelfViewProps) {
  const positionClasses = {
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-right': 'bottom-4 right-4'
  }

  const sizeClasses = {
    small: 'w-32 h-24',
    medium: 'w-48 h-36',
    large: 'w-64 h-48'
  }

  if (!isActive) return null

  return (
    <div className={cn('absolute z-10', positionClasses[position])}>
      <VideoPreview
        stream={stream}
        isActive={isActive}
        className={cn(sizeClasses[size], 'shadow-lg border border-gray-700')}
        showPlaceholder={false}
      />
      {onHide && (
        <button
          onClick={onHide}
          className="absolute top-1 right-1 p-1 bg-black/50 rounded-full text-white hover:bg-black/70"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  )
}
