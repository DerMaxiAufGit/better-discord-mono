import { cn } from '@/lib/utils'

interface CallQualityIndicatorProps {
  quality: 1 | 2 | 3 | 4
  latency?: number | null
  showLatency?: boolean
  className?: string
}

/**
 * Signal bars indicator for call quality.
 * Quality levels:
 * - 4: Excellent (green)
 * - 3: Good (green)
 * - 2: Fair (yellow)
 * - 1: Poor (red)
 */
export function CallQualityIndicator({
  quality,
  latency,
  showLatency = true,
  className = '',
}: CallQualityIndicatorProps) {
  // Determine color based on quality
  const getBarColor = (barIndex: number): string => {
    if (barIndex > quality) {
      return 'bg-muted' // Inactive bar
    }

    switch (quality) {
      case 4:
      case 3:
        return 'bg-green-500'
      case 2:
        return 'bg-yellow-500'
      case 1:
        return 'bg-red-500'
      default:
        return 'bg-muted'
    }
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {/* Signal bars */}
      <div className="flex items-end gap-0.5 h-4">
        {[1, 2, 3, 4].map((barIndex) => (
          <div
            key={barIndex}
            className={cn(
              'w-1 rounded-sm transition-colors',
              getBarColor(barIndex)
            )}
            style={{
              height: `${barIndex * 25}%`, // 25%, 50%, 75%, 100%
            }}
          />
        ))}
      </div>

      {/* Latency display */}
      {showLatency && latency !== null && latency !== undefined && (
        <span className="text-xs text-muted-foreground font-mono">
          {latency}ms
        </span>
      )}
    </div>
  )
}
