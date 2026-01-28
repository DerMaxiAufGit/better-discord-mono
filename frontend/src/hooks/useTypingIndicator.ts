import { useState, useEffect, useRef, useCallback } from 'react'

interface UseTypingIndicatorOptions {
  conversationId: string
  sendTypingEvent: (isTyping: boolean) => void
  debounceMs?: number
  timeoutMs?: number
}

interface TypingUser {
  userId: string
  email?: string
}

interface UseTypingIndicatorReturn {
  typingUsers: TypingUser[]
  onInputChange: () => void
  onMessageSend: () => void
}

export function useTypingIndicator({
  conversationId,
  sendTypingEvent,
  debounceMs = 300,
  timeoutMs = 5000
}: UseTypingIndicatorOptions): UseTypingIndicatorReturn {
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([])
  const isTypingRef = useRef(false)
  const timeoutRef = useRef<number | null>(null)
  const debounceRef = useRef<number | null>(null)

  // Handle incoming typing events
  useEffect(() => {
    const handleTypingEvent = (event: CustomEvent<{ conversationId: string; userId: string; email?: string; isTyping: boolean }>) => {
      const { conversationId: eventConvId, userId, email, isTyping } = event.detail

      if (eventConvId !== conversationId) return

      setTypingUsers((current) => {
        if (isTyping) {
          // Add user if not already typing
          if (current.some(u => u.userId === userId)) return current
          return [...current, { userId, email }]
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
    // Debounce the start typing event
    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current)
    }

    debounceRef.current = window.setTimeout(() => {
      sendStartTyping()
    }, debounceMs)

    // Reset the timeout for stopping
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current)
    }

    if (isTypingRef.current) {
      timeoutRef.current = setTimeout(() => {
        sendStopTyping()
      }, timeoutMs)
    }
  }, [sendStartTyping, sendStopTyping, debounceMs, timeoutMs])

  const onMessageSend = useCallback(() => {
    // Immediately stop typing when message is sent
    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current)
      debounceRef.current = null
    }

    sendStopTyping()
  }, [sendStopTyping])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      if (debounceRef.current) clearTimeout(debounceRef.current)
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

  const names = users.map(u => u.email?.split('@')[0] || 'Someone')

  if (names.length === 1) {
    return `${names[0]} is typing...`
  } else if (names.length === 2) {
    return `${names[0]} and ${names[1]} are typing...`
  } else {
    return `${names.length} people are typing...`
  }
}
