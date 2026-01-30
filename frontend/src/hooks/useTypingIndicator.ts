import { useState, useEffect, useRef, useCallback } from 'react'

interface UseTypingIndicatorOptions {
  conversationId: string
  sendTypingEvent: (isTyping: boolean) => void
  timeoutMs?: number
}

interface TypingUser {
  userId: string
  username?: string
}

interface UseTypingIndicatorReturn {
  typingUsers: TypingUser[]
  onInputChange: () => void
  onMessageSend: () => void
}

export function useTypingIndicator({
  conversationId,
  sendTypingEvent,
  timeoutMs = 5000
}: UseTypingIndicatorOptions): UseTypingIndicatorReturn {
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([])
  const isTypingRef = useRef(false)
  const timeoutRef = useRef<number | null>(null)

  // Handle incoming typing events
  useEffect(() => {
    const handleTypingEvent = (event: CustomEvent<{ conversationId: string; userId: string; username?: string; isTyping: boolean }>) => {
      const { conversationId: eventConvId, userId, username, isTyping } = event.detail

      if (eventConvId !== conversationId) return

      setTypingUsers((current) => {
        if (isTyping) {
          // Add user if not already typing
          if (current.some(u => u.userId === userId)) return current
          return [...current, { userId, username }]
        } else {
          // Remove user
          return current.filter(u => u.userId !== userId)
        }
      })
    }

    window.addEventListener('typing-indicator', handleTypingEvent as EventListener)

    return () => {
      window.removeEventListener('typing-indicator', handleTypingEvent as EventListener)
    }
  }, [conversationId])

  // Auto-clear typing users after timeout (server should also do this)
  useEffect(() => {
    if (typingUsers.length === 0) return

    const interval = setInterval(() => {
      // Client-side cleanup (server has 10s timeout, we use 15s for buffer)
      setTypingUsers([])
    }, 15000)

    return () => clearInterval(interval)
  }, [typingUsers])

  const sendStartTyping = useCallback(() => {
    if (isTypingRef.current) return

    isTypingRef.current = true
    sendTypingEvent(true)

    // Auto-stop after timeout
    timeoutRef.current = window.setTimeout(() => {
      if (isTypingRef.current) {
        isTypingRef.current = false
        sendTypingEvent(false)
      }
    }, timeoutMs)
  }, [sendTypingEvent, timeoutMs])

  const sendStopTyping = useCallback(() => {
    if (!isTypingRef.current) return

    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }

    isTypingRef.current = false
    sendTypingEvent(false)
  }, [sendTypingEvent])

  const onInputChange = useCallback(() => {
    // Send typing immediately (no debounce on start)
    sendStartTyping()

    // Reset the timeout for stopping - stop typing after user stops for timeoutMs
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current)
    }

    timeoutRef.current = window.setTimeout(() => {
      sendStopTyping()
    }, timeoutMs)
  }, [sendStartTyping, sendStopTyping, timeoutMs])

  const onMessageSend = useCallback(() => {
    // Immediately stop typing when message is sent
    sendStopTyping()
  }, [sendStopTyping])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      if (isTypingRef.current) {
        sendTypingEvent(false)
      }
    }
  }, [sendTypingEvent])

  return {
    typingUsers,
    onInputChange,
    onMessageSend
  }
}

/**
 * Format typing indicator text.
 */
export function formatTypingIndicator(users: TypingUser[]): string {
  if (users.length === 0) return ''

  const names = users.map(u => u.username || 'Someone')

  if (names.length === 1) {
    return `${names[0]} is typing...`
  } else if (names.length === 2) {
    return `${names[0]} and ${names[1]} are typing...`
  } else {
    return `${names.length} people are typing...`
  }
}
