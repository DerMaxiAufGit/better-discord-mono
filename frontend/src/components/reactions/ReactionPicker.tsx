import { useRef, useEffect, useState, useLayoutEffect } from 'react'
import EmojiPicker, { EmojiClickData, Theme, EmojiStyle } from 'emoji-picker-react'
import { useTheme } from 'next-themes'
import { cn } from '@/lib/utils'

const PICKER_WIDTH = 350
const PICKER_HEIGHT = 400
const MARGIN = 8

interface ReactionPickerProps {
  onSelect: (emoji: string) => void
  onClose: () => void
  position?: 'top' | 'bottom'
  align?: 'left' | 'right' | 'center'
}

export function ReactionPicker({
  onSelect,
  onClose,
  position: preferredPosition = 'top',
  align: preferredAlign = 'left'
}: ReactionPickerProps) {
  const { theme } = useTheme()
  const containerRef = useRef<HTMLDivElement>(null)
  const [style, setStyle] = useState<React.CSSProperties>({ visibility: 'hidden' })

  // Calculate position based on available viewport space
  useLayoutEffect(() => {
    if (!containerRef.current) return

    const parent = containerRef.current.parentElement
    if (!parent) return

    const parentRect = parent.getBoundingClientRect()
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight

    // Determine vertical position
    const spaceAbove = parentRect.top
    const spaceBelow = viewportHeight - parentRect.bottom

    let top: number | undefined
    let bottom: number | undefined

    if (preferredPosition === 'top' && spaceAbove >= PICKER_HEIGHT + MARGIN) {
      // Enough space above - position above
      bottom = parent.offsetHeight + MARGIN
    } else if (spaceBelow >= PICKER_HEIGHT + MARGIN) {
      // Position below
      top = parent.offsetHeight + MARGIN
    } else if (spaceAbove > spaceBelow) {
      // More space above, but not enough - position at top of viewport
      bottom = parentRect.top - MARGIN
    } else {
      // Position below, constrained
      top = parent.offsetHeight + MARGIN
    }

    // Determine horizontal position
    let left: number | undefined
    let right: number | undefined

    if (preferredAlign === 'left') {
      // Try to align left edge with parent
      const leftEdge = parentRect.left
      if (leftEdge + PICKER_WIDTH <= viewportWidth - MARGIN) {
        left = 0
      } else {
        // Would overflow right - align to right edge instead
        right = 0
      }
    } else if (preferredAlign === 'right') {
      // Try to align right edge with parent
      const rightEdge = viewportWidth - parentRect.right
      if (rightEdge + PICKER_WIDTH <= viewportWidth - MARGIN) {
        right = 0
      } else {
        // Would overflow left - align to left edge instead
        left = 0
      }
    } else {
      // Center alignment
      const centerOffset = (parentRect.width - PICKER_WIDTH) / 2
      const leftEdge = parentRect.left + centerOffset
      if (leftEdge >= MARGIN && leftEdge + PICKER_WIDTH <= viewportWidth - MARGIN) {
        left = centerOffset
      } else if (leftEdge < MARGIN) {
        left = -parentRect.left + MARGIN
      } else {
        right = -(viewportWidth - parentRect.right) + MARGIN
      }
    }

    setStyle({
      position: 'absolute',
      zIndex: 50,
      ...(top !== undefined ? { top } : {}),
      ...(bottom !== undefined ? { bottom } : {}),
      ...(left !== undefined ? { left } : {}),
      ...(right !== undefined ? { right } : {}),
    })
  }, [preferredPosition, preferredAlign])

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

  return (
    <div ref={containerRef} style={style}>
      <EmojiPicker
        onEmojiClick={handleEmojiClick}
        theme={theme === 'dark' ? Theme.DARK : Theme.LIGHT}
        emojiStyle={EmojiStyle.TWITTER}
        width={`${PICKER_WIDTH}px`}
        height={`${PICKER_HEIGHT}px`}
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
