import { WifiOff, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ConnectionBannerProps {
  status: 'connected' | 'connecting' | 'disconnected'
  className?: string
}

export function ConnectionBanner({ status, className }: ConnectionBannerProps) {
  if (status === 'connected') return null

  return (
    <div
      className={cn(
        'flex items-center justify-center gap-2 py-2 px-4 text-sm',
        status === 'connecting' && 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400',
        status === 'disconnected' && 'bg-red-500/10 text-red-600 dark:text-red-400',
        className
      )}
    >
      {status === 'connecting' ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Reconnecting...</span>
        </>
      ) : (
        <>
          <WifiOff className="h-4 w-4" />
          <span>Connection lost. Trying to reconnect...</span>
        </>
      )}
    </div>
  )
}
