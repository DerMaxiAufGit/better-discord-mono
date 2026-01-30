import { Loader2, WifiOff, Wifi } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useMessageStore } from '@/stores/messageStore'

interface ConnectionBannerProps {
  className?: string
}

export function ConnectionBanner({ className }: ConnectionBannerProps) {
  const showBanner = useMessageStore((s) => s.showConnectionBanner)
  const showConnectedBanner = useMessageStore((s) => s.showConnectedBanner)
  const connectionState = useMessageStore((s) => s.connectionState)

  // Show connected banner briefly after reconnection
  if (showConnectedBanner && connectionState === 'connected') {
    return (
      <div
        className={cn(
          'flex items-center justify-center gap-2 py-2 px-4 text-sm flex-shrink-0 bg-green-500 text-white',
          className
        )}
      >
        <Wifi className="h-4 w-4" />
        <span>Connected</span>
      </div>
    )
  }

  // Don't show disconnected/reconnecting banner if not needed
  if (!showBanner || connectionState === 'connected') return null

  // Show reconnecting banner (yellow with spinner)
  if (connectionState === 'reconnecting') {
    return (
      <div
        className={cn(
          'flex items-center justify-center gap-2 py-2 px-4 text-sm flex-shrink-0 bg-yellow-500 text-white',
          className
        )}
      >
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Reconnecting...</span>
      </div>
    )
  }

  // Show disconnected banner (red)
  return (
    <div
      className={cn(
        'flex items-center justify-center gap-2 py-2 px-4 text-sm flex-shrink-0 bg-red-500 text-white',
        className
      )}
    >
      <WifiOff className="h-4 w-4" />
      <span>Disconnected</span>
    </div>
  )
}
