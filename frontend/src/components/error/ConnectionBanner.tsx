import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useMessageStore } from '@/stores/messageStore'

interface ConnectionBannerProps {
  className?: string
}

export function ConnectionBanner({ className }: ConnectionBannerProps) {
  const showBanner = useMessageStore((s) => s.showConnectionBanner)
  const isConnected = useMessageStore((s) => s.isConnected)

  // Don't show if connected or if we haven't failed first retry yet
  if (isConnected || !showBanner) return null

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
