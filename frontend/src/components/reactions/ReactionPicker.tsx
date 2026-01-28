import { useRef, useEffect } from 'react'
import EmojiPicker, { EmojiClickData, Theme, EmojiStyle } from 'emoji-picker-react'
import { useTheme } from 'next-themes'
import { cn } from '@/lib/utils'

interface ReactionPickerProps {
  onSelect: (emoji: string) => void
  onClose: () => void
  position?: 'top' | 'bottom'
  align?: 'left' | 'right' | 'center'
}

export function ReactionPicker({
  onSelect,
  onClose,
  position = 'top',
  align = 'left'
}: ReactionPickerProps) {
  const { theme } = useTheme()
  const containerRef = useRef<HTMLDivElement>(null)

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onClose])

  // Close on escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [onClose])

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    onSelect(emojiData.emoji)
    onClose()
  }

  const positionClasses = {
    top: 'bottom-full mb-2',
    bottom: 'top-full mt-2'
  }

  const alignClasses = {
    left: 'left-0',
    right: 'right-0',
    center: 'left-1/2 -translate-x-1/2'
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        'absolute z-50',
        positionClasses[position],
        alignClasses[align]
      )}
    >
      <EmojiPicker
        onEmojiClick={handleEmojiClick}
        theme={theme === 'dark' ? Theme.DARK : Theme.LIGHT}
        emojiStyle={EmojiStyle.TWITTER}
        width="350px"
        height="400px"
        searchPlaceHolder="Search emoji..."
        previewConfig={{ showPreview: false }}
        skinTonesDisabled
      />
    </div>
  )
}

// Trigger button that opens picker
export function ReactionPickerTrigger({
  onOpenPicker,
  className
}: {
  onOpenPicker: () => void
  className?: string
}) {
  return (
    <button
      onClick={onOpenPicker}
      className={cn(
        'p-1 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors',
        className
      )}
      title="Add reaction"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    </button>
  )
}
