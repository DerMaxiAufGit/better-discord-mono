import { useState, useEffect } from 'react'
import { useBreakpoint } from '@/hooks/useBreakpoint'
import { Phone, PhoneOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

interface IncomingCallBannerProps {
  callerUsername: string
  onAccept: () => void
  onReject: () => void
  ringTimeout: number // seconds, for countdown display
  className?: string
}

/**
 * Fixed banner at top of screen for incoming call notification.
 * Shows caller avatar, name, countdown timer, and accept/reject buttons.
 * Auto-rejects when countdown reaches 0.
 */
export function IncomingCallBanner({
  callerUsername,
  onAccept,
  onReject,
  ringTimeout,
  className = '',
}: IncomingCallBannerProps) {
  const [countdown, setCountdown] = useState(ringTimeout)
  const { isMobile } = useBreakpoint()

  // Countdown timer
  useEffect(() => {
    setCountdown(ringTimeout)

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval)
          // Auto-reject handled by useCall hook
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [ringTimeout])

  // Full-screen on mobile, banner on desktop
  if (isMobile) {
    return (
      <div className="fixed inset-0 z-50 bg-background flex flex-col items-center justify-center">
        <div className="text-center">
          <Avatar fallback={callerUsername} className="h-24 w-24 mx-auto" />
          <h2 className="text-2xl mt-4 font-semibold">{callerUsername}</h2>
          <p className="text-muted-foreground mt-2">Incoming call...</p>
          <p className="text-sm text-muted-foreground mt-1 font-mono">({countdown}s)</p>
        </div>
        <div className="flex gap-8 mt-12">
          <button
            onClick={onReject}
            className="rounded-full h-16 w-16 bg-red-500 hover:bg-red-600 flex items-center justify-center text-white"
          >
            <PhoneOff className="h-6 w-6" />
          </button>
          <button
            onClick={onAccept}
            className="rounded-full h-16 w-16 bg-green-500 hover:bg-green-600 flex items-center justify-center text-white"
          >
            <Phone className="h-6 w-6" />
          </button>
        </div>
      </div>
    );
  }

  // Desktop: banner at top
  return (
    <div
      className={cn(
        'fixed top-0 left-0 right-0 z-50',
        'bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80',
        'border-b shadow-lg',
        'animate-in slide-in-from-top duration-300',
        className
      )}
    >
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Caller info */}
          <div className="flex items-center gap-3">
            {/* Pulsing avatar ring */}
            <div className="relative">
              <div className="absolute inset-0 rounded-full animate-ping bg-green-500/30" />
              <Avatar
                fallback={callerUsername}
                className="h-12 w-12 relative"
              />
            </div>
            <div>
              <p className="font-semibold">{callerUsername}</p>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                </span>
                <span>Incoming call...</span>
                <span className="ml-2 font-mono text-xs">({countdown}s)</span>
              </p>
            </div>
          </div>

          {/* Accept/Reject buttons */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onReject}
              className="gap-2 border-red-500 text-red-500 hover:bg-red-500/10 hover:text-red-500"
            >
              <PhoneOff className="h-4 w-4" />
              <span className="hidden sm:inline">Decline</span>
            </Button>
            <Button
              size="sm"
              onClick={onAccept}
              className="gap-2 bg-green-600 hover:bg-green-700"
            >
              <Phone className="h-4 w-4" />
              <span className="hidden sm:inline">Accept</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
