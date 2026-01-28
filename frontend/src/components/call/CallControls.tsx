import { useEffect, useCallback } from 'react'
import { Mic, MicOff, PhoneOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface CallControlsProps {
  isMuted: boolean
  onToggleMute: () => void
  onHangup: () => void
  micLevel?: number // 0-100 for activity indicator
  className?: string
}

/**
 * Call control buttons: Mute and End Call.
 * Supports keyboard shortcuts: Space = mute, Escape = hangup.
 * Shows mic activity pulse when not muted and micLevel > threshold.
 */
export function CallControls({
  isMuted,
  onToggleMute,
  onHangup,
  micLevel = 0,
  className = '',
}: CallControlsProps) {
  // Activity threshold for pulse animation
  const isActive = !isMuted && micLevel > 15

  // Keyboard shortcuts
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement
      ) {
        return
      }

      if (event.code === 'Space') {
        event.preventDefault()
        onToggleMute()
      } else if (event.code === 'Escape') {
        event.preventDefault()
        onHangup()
      }
    },
    [onToggleMute, onHangup]
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  return (
    <div className={cn('flex items-center gap-4', className)}>
      {/* Mute button */}
      <div className="relative">
        {/* Activity pulse ring */}
        {isActive && (
          <div className="absolute inset-0 rounded-full animate-ping bg-green-500/30" />
        )}
        <Button
          variant={isMuted ? 'destructive' : 'secondary'}
          size="icon"
          onClick={onToggleMute}
          className={cn(
            'relative h-12 w-12 rounded-full transition-all',
            isActive && 'ring-2 ring-green-500/50'
          )}
          aria-label={isMuted ? 'Unmute microphone' : 'Mute microphone'}
        >
          {isMuted ? (
            <MicOff className="h-5 w-5" />
          ) : (
            <Mic className="h-5 w-5" />
          )}
        </Button>
      </div>

      {/* End call button */}
      <Button
        variant="destructive"
        size="icon"
        onClick={onHangup}
        className="h-12 w-12 rounded-full bg-red-600 hover:bg-red-700"
        aria-label="End call"
      >
        <PhoneOff className="h-5 w-5" />
      </Button>
    </div>
  )
}
