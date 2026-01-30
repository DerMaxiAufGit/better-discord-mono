import { useRef, useEffect, useState, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'
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
  const { resolvedTheme } = useTheme()
  const containerRef = useRef<HTMLDivElement>(null)
  const anchorRef = useRef<HTMLSpanElement>(null)
  const [style, setStyle] = useState<React.CSSProperties>({ visibility: 'hidden' })

  // Calculate position based on available viewport space using fixed positioning
  useLayoutEffect(() => {
    if (!anchorRef.current) return

    // Use the parent element (QuickReactions bar) for positioning
    const parent = anchorRef.current.parentElement
    if (!parent) return

    const anchorRect = parent.getBoundingClientRect()
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight

    // Determine vertical position (fixed coordinates)
    const spaceAbove = anchorRect.top
    const spaceBelow = viewportHeight - anchorRect.bottom

    let top: number | undefined

    if (preferredPosition === 'top' && spaceAbove >= PICKER_HEIGHT + MARGIN) {
      // Position above the anchor
      top = anchorRect.top - PICKER_HEIGHT - MARGIN
    } else if (spaceBelow >= PICKER_HEIGHT + MARGIN) {
      // Position below the anchor
      top = anchorRect.bottom + MARGIN
    } else if (spaceAbove > spaceBelow) {
      // More space above - constrain to viewport top
      top = Math.max(MARGIN, anchorRect.top - PICKER_HEIGHT - MARGIN)
    } else {
      // More space below - position below, may overflow
      top = anchorRect.bottom + MARGIN
    }

    // Determine horizontal position (fixed coordinates)
    let left: number | undefined

    if (preferredAlign === 'left') {
      left = anchorRect.left
      // Prevent overflow right
      if (left + PICKER_WIDTH > viewportWidth - MARGIN) {
        left = viewportWidth - PICKER_WIDTH - MARGIN
      }
    } else if (preferredAlign === 'right') {
      left = anchorRect.right - PICKER_WIDTH
      // Prevent overflow left
      if (left < MARGIN) {
        left = MARGIN
      }
    } else {
      // Center alignment
      left = anchorRect.left + (anchorRect.width - PICKER_WIDTH) / 2
      // Clamp to viewport
      if (left < MARGIN) left = MARGIN
      if (left + PICKER_WIDTH > viewportWidth - MARGIN) {
        left = viewportWidth - PICKER_WIDTH - MARGIN
      }
    }

    setStyle({
      position: 'fixed',
      zIndex: 9999,
      top,
      left,
      visibility: 'visible',
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
    <>
      {/* Inline anchor to measure position from parent context */}
      <span ref={anchorRef} style={{ display: 'inline-block', width: 0, height: 0, verticalAlign: 'top' }} />
      {/* Portal to render picker at document body */}
      {createPortal(
        <div ref={containerRef} style={style}>
          <EmojiPicker
            onEmojiClick={handleEmojiClick}
            theme={resolvedTheme === 'dark' ? Theme.DARK : Theme.LIGHT}
            emojiStyle={EmojiStyle.TWITTER}
            width={`${PICKER_WIDTH}px`}
            height={`${PICKER_HEIGHT}px`}
            searchPlaceHolder="Search emoji..."
            previewConfig={{ showPreview: false }}
            skinTonesDisabled
          />
        </div>,
        document.body
      )}
    </>
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
