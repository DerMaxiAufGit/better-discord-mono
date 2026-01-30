import { useState } from 'react'
import { ReactionSummary } from '@/stores/reactionStore'
import { cn } from '@/lib/utils'

interface ReactionListProps {
  reactions: ReactionSummary[]
  onToggle: (emoji: string) => Promise<void>
  compact?: boolean
  className?: string
}

export function ReactionList({
  reactions,
  onToggle,
  compact = false,
  className
}: ReactionListProps) {
  const [hoveredEmoji, setHoveredEmoji] = useState<string | null>(null)
  const [isToggling, setIsToggling] = useState(false)

  if (reactions.length === 0) return null

  const handleToggle = async (emoji: string) => {
    if (isToggling) return
    setIsToggling(true)
    try {
      await onToggle(emoji)
    } finally {
      setIsToggling(false)
    }
  }

  return (
    <div className={cn('flex flex-wrap gap-1', className)}>
      {reactions.map((reaction) => (
        <div key={reaction.emoji} className="relative">
          <button
            onClick={() => handleToggle(reaction.emoji)}
            onMouseEnter={() => setHoveredEmoji(reaction.emoji)}
            onMouseLeave={() => setHoveredEmoji(null)}
            disabled={isToggling}
            className={cn(
              'inline-flex items-center gap-1 rounded-full transition-colors',
              compact
                ? 'px-1.5 py-0.5 text-xs'
                : 'px-2 py-1 text-sm',
              reaction.userReacted
                ? 'bg-blue-600/30 hover:bg-blue-600/40 text-blue-400'
                : 'bg-gray-800 hover:bg-gray-700 text-gray-300'
            )}
          >
            <span>{reaction.emoji}</span>
            <span className={cn(
              'font-medium',
              reaction.userReacted ? 'text-blue-400' : 'text-gray-500'
            )}>
              {reaction.count}
            </span>
          </button>

          {/* User list tooltip */}
          {hoveredEmoji === reaction.emoji && reaction.users.length > 0 && (
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 z-50">
              <div className="bg-gray-900 border border-gray-700 rounded-lg shadow-xl px-3 py-2 whitespace-nowrap">
                <div className="text-xs text-gray-400 mb-1">
                  {reaction.emoji} {reaction.count}
                </div>
                <div className="space-y-0.5">
                  {reaction.users.slice(0, 10).map((user) => (
                    <div key={user.userId} className="text-sm">
                      {user.username || user.email.split('@')[0]}
                    </div>
                  ))}
                  {reaction.users.length > 10 && (
                    <div className="text-xs text-gray-500">
                      and {reaction.users.length - 10} more
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// Compact inline reaction display for message list
export function InlineReactions({
  reactions,
  onToggle
}: {
  reactions: ReactionSummary[]
  onToggle: (emoji: string) => Promise<void>
}) {
  return (
    <ReactionList
      reactions={reactions}
      onToggle={onToggle}
      compact
      className="mt-1"
    />
  )
}
