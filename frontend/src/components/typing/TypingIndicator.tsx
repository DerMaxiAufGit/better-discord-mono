import { formatTypingIndicator } from '@/hooks/useTypingIndicator'
import { cn } from '@/lib/utils'

interface TypingUser {
  userId: string
  email?: string
}

interface TypingIndicatorProps {
  users: TypingUser[]
  className?: string
}

export function TypingIndicator({ users, className }: TypingIndicatorProps) {
  if (users.length === 0) return null

  const text = formatTypingIndicator(users)

  return (
    <div className={cn('flex items-center gap-2 text-sm text-gray-400', className)}>
      <TypingDots />
      <span>{text}</span>
    </div>
  )
}

// Animated dots component
function TypingDots() {
  return (
    <div className="flex items-center gap-0.5">
      <span
        className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"
        style={{ animationDelay: '0ms' }}
      />
      <span
        className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"
        style={{ animationDelay: '150ms' }}
      />
      <span
        className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"
        style={{ animationDelay: '300ms' }}
      />
    </div>
  )
}

// Inline typing indicator for conversation view
export function InlineTypingIndicator({
  users
}: {
  users: TypingUser[]
}) {
  if (users.length === 0) return null

  return (
    <div className="px-4 py-2">
      <TypingIndicator users={users} />
    </div>
  )
}

// Compact typing indicator for conversation list item
export function CompactTypingIndicator({
  isTyping
}: {
  isTyping: boolean
}) {
  if (!isTyping) return null

  return (
    <span className="text-blue-400 text-xs flex items-center gap-1">
      <TypingDots />
      <span>typing</span>
    </span>
  )
}
