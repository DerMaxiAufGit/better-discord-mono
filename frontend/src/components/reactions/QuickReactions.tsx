import { useState } from 'react'
import { useReactionStore } from '@/stores/reactionStore'
import { ReactionPicker } from './ReactionPicker'
import { cn } from '@/lib/utils'

// Default quick reaction emoji (user customizable in future)
const DEFAULT_QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏']

interface QuickReactionsProps {
  messageId: number
  onReact: (emoji: string) => Promise<void>
  className?: string
  /** Align picker to left (for received messages) or right (for sent messages) */
  pickerAlign?: 'left' | 'right'
  /** Called when emoji picker opens */
  onPickerOpen?: () => void
  /** Called when emoji picker closes */
  onPickerClose?: () => void
}

export function QuickReactions({
  messageId,
  onReact,
  className,
  pickerAlign = 'right',
  onPickerOpen,
  onPickerClose
}: QuickReactionsProps) {
  const [showPicker, setShowPicker] = useState(false)
  const [isReacting, setIsReacting] = useState(false)
  const reactions = useReactionStore((s) => s.reactions.get(messageId) || [])

  const openPicker = () => {
    setShowPicker(true)
    onPickerOpen?.()
  }

  const closePicker = () => {
    setShowPicker(false)
    onPickerClose?.()
  }

  // Load quick reactions from localStorage or use defaults
  const quickReactions = (() => {
    try {
      const saved = localStorage.getItem('quick-reactions')
      return saved ? JSON.parse(saved) : DEFAULT_QUICK_REACTIONS
    } catch {
      return DEFAULT_QUICK_REACTIONS
    }
  })()

  const handleReact = async (emoji: string) => {
    if (isReacting) return
    setIsReacting(true)
    try {
      await onReact(emoji)
    } finally {
      setIsReacting(false)
    }
  }

  const hasReacted = (emoji: string) =>
    reactions.some(r => r.emoji === emoji && r.userReacted)

  return (
    <div className={cn('relative inline-flex items-center gap-1 bg-gray-800 rounded-full px-2 py-1', className)}>
      {quickReactions.map((emoji: string) => (
        <button
          key={emoji}
          onClick={() => handleReact(emoji)}
          disabled={isReacting}
          className={cn(
            'text-lg p-1 rounded-full hover:bg-gray-700 transition-colors',
            hasReacted(emoji) && 'bg-blue-600/30'
          )}
          title={emoji}
        >
          {emoji}
        </button>
      ))}

      {/* More emoji button */}
      <button
        onClick={openPicker}
        className="p-1 text-gray-400 hover:text-white hover:bg-gray-700 rounded-full transition-colors"
        title="More reactions"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
      </button>

      {showPicker && (
        <ReactionPicker
          onSelect={handleReact}
          onClose={closePicker}
          position="bottom"
          align={pickerAlign}
        />
      )}
    </div>
  )
}

// Hover overlay for messages
export function MessageReactionOverlay({
  messageId,
  onReact,
  show
}: {
  messageId: number
  onReact: (emoji: string) => Promise<void>
  show: boolean
}) {
  if (!show) return null

  return (
    <div className="absolute -top-2 right-0 translate-y-[-100%]">
      <QuickReactions messageId={messageId} onReact={onReact} />
    </div>
  )
}
