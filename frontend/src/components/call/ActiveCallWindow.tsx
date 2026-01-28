import { useState, useRef, useEffect, useCallback } from 'react'
import { Minimize2, Maximize2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar } from '@/components/ui/avatar'
import { CallControls } from './CallControls'
import { CallQualityIndicator } from './CallQualityIndicator'
import { CallTimer } from './CallTimer'
import { cn } from '@/lib/utils'
import type { CallStatus } from '@/stores/callStore'

interface ActiveCallWindowProps {
  remoteUsername: string
  status: CallStatus
  isMuted: boolean
  quality: 1 | 2 | 3 | 4
  latency: number | null
  isMinimized: boolean
  startTime: Date | null
  onToggleMute: () => void
  onHangup: () => void
  onToggleMinimized: () => void
  micLevel?: number
}

/**
 * Active call window with two modes:
 * - Full page (default): Centered avatar, name, status, controls at bottom
 * - Floating (minimized): Small draggable window in corner
 */
export function ActiveCallWindow({
  remoteUsername,
  status,
  isMuted,
  quality,
  latency,
  isMinimized,
  startTime,
  onToggleMute,
  onHangup,
  onToggleMinimized,
  micLevel = 0,
}: ActiveCallWindowProps) {
  // Draggable state for minimized view
  const [position, setPosition] = useState({ x: 16, y: 16 })
  const isDraggingRef = useRef(false)
  const dragStartRef = useRef({ x: 0, y: 0 })
  const floatingRef = useRef<HTMLDivElement>(null)

  // Get status display text
  const getStatusText = (): string => {
    switch (status) {
      case 'outgoing':
        return 'Calling...'
      case 'connecting':
        return 'Connecting...'
      case 'connected':
        return 'Connected'
      case 'reconnecting':
        return 'Reconnecting...'
      case 'incoming':
        return 'Incoming call'
      default:
        return ''
    }
  }

  // Is showing spinner
  const isConnecting = status === 'outgoing' || status === 'connecting' || status === 'reconnecting'

  // Draggable handlers for minimized view
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!isMinimized) return
    isDraggingRef.current = true
    dragStartRef.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    }
    e.preventDefault()
  }, [isMinimized, position])

  useEffect(() => {
    if (!isMinimized) return

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return

      const newX = e.clientX - dragStartRef.current.x
      const newY = e.clientY - dragStartRef.current.y

      // Keep within viewport bounds
      const maxX = window.innerWidth - (floatingRef.current?.offsetWidth || 200)
      const maxY = window.innerHeight - (floatingRef.current?.offsetHeight || 100)

      setPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY)),
      })
    }

    const handleMouseUp = () => {
      isDraggingRef.current = false
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isMinimized])

  // Minimized floating window
  if (isMinimized) {
    return (
      <div
        ref={floatingRef}
        className={cn(
          'fixed z-50',
          'bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80',
          'border rounded-lg shadow-lg',
          'select-none',
          isDraggingRef.current ? 'cursor-grabbing' : 'cursor-grab'
        )}
        style={{
          right: position.x,
          bottom: position.y,
          left: 'auto',
          top: 'auto',
        }}
        onMouseDown={handleMouseDown}
      >
        <div className="p-3 flex items-center gap-3 min-w-[220px]">
          {/* Avatar */}
          <Avatar
            fallback={remoteUsername}
            className="h-10 w-10"
          />

          {/* Info */}
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">{remoteUsername}</p>
            <div className="flex items-center gap-2">
              {isConnecting ? (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span>{getStatusText()}</span>
                </div>
              ) : (
                <>
                  <CallTimer startTime={startTime} />
                  <CallQualityIndicator quality={quality} latency={latency} showLatency={false} />
                </>
              )}
            </div>
          </div>

          {/* Mini controls */}
          <div className="flex items-center gap-1">
            <CallControls
              isMuted={isMuted}
              onToggleMute={onToggleMute}
              onHangup={onHangup}
              micLevel={micLevel}
              className="scale-75 origin-right"
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation()
                onToggleMinimized()
              }}
              className="h-8 w-8"
              aria-label="Maximize"
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Full page view
  return (
    <div className="fixed inset-0 z-50 bg-background">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CallQualityIndicator quality={quality} latency={latency} />
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleMinimized}
          aria-label="Minimize"
        >
          <Minimize2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Center content */}
      <div className="h-full flex flex-col items-center justify-center gap-6">
        {/* Avatar */}
        <div className="relative">
          {/* Speaking indicator ring */}
          {status === 'connected' && !isMuted && micLevel > 15 && (
            <div className="absolute -inset-2 rounded-full animate-pulse bg-green-500/20" />
          )}
          <Avatar
            fallback={remoteUsername}
            className="h-32 w-32 text-4xl"
          />
        </div>

        {/* Name */}
        <h1 className="text-2xl font-semibold">{remoteUsername}</h1>

        {/* Status / Timer */}
        <div className="flex items-center gap-2 text-muted-foreground">
          {isConnecting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>{getStatusText()}</span>
            </>
          ) : (
            <CallTimer startTime={startTime} className="text-lg" />
          )}
        </div>
      </div>

      {/* Bottom controls */}
      <div className="absolute bottom-0 left-0 right-0 p-8 flex justify-center">
        <CallControls
          isMuted={isMuted}
          onToggleMute={onToggleMute}
          onHangup={onHangup}
          micLevel={micLevel}
        />
      </div>
    </div>
  )
}
