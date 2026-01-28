import { useEffect, useRef, useCallback, useState } from 'react'
import { useAuthStore } from '@/stores/auth'
import { useCryptoStore } from '@/stores/cryptoStore'
import { useMessageStore } from '@/stores/messageStore'
import { useContactStore } from '@/stores/contactStore'
import { encryptMessage, decryptMessage } from '@/lib/crypto/messageEncryption'
import { usersApi } from '@/lib/api'
import { dispatchCallSignaling } from '@/lib/webrtc/useCall'
import { setSharedWebSocket } from './sharedWebSocket'
import { toast } from '@/lib/toast'

interface UseMessagingOptions {
  onError?: (error: Error) => void
}

export function useMessaging(options: UseMessagingOptions = {}) {
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<number | null>(null)
  const isCleaningUpRef = useRef(false) // Track intentional cleanup vs unexpected close
  const [isConnected, setIsConnected] = useState(false)

  const { accessToken, user } = useAuthStore()
  const { getOrDeriveSessionKeys, isInitialized: cryptoReady } = useCryptoStore()
  const { addMessage, updateMessageStatus, updatePendingMessage, markAllAsRead } = useMessageStore()
  const { fetchContactPublicKey, addContact, getContact } = useContactStore()

  // Use refs for callbacks and user to avoid stale closures
  const storeRefs = useRef({ getOrDeriveSessionKeys, addMessage, updateMessageStatus, updatePendingMessage, markAllAsRead, fetchContactPublicKey, addContact, getContact, options, user })
  storeRefs.current = { getOrDeriveSessionKeys, addMessage, updateMessageStatus, updatePendingMessage, markAllAsRead, fetchContactPublicKey, addContact, getContact, options, user }

  // Reconnect trigger state
  const [reconnectTrigger, setReconnectTrigger] = useState(0)

  // Helper to send a single message via WebSocket
  const sendMessageViaWs = useCallback(async (ws: WebSocket, recipientId: string, plaintext: string) => {
    const { getOrDeriveSessionKeys, fetchContactPublicKey } = storeRefs.current
    const currentUser = storeRefs.current.user
    if (!currentUser) return

    const publicKey = await fetchContactPublicKey(recipientId)
    if (!publicKey) {
      console.error('Cannot send queued message: no public key for', recipientId)
      return
    }

    const sessionKeys = await getOrDeriveSessionKeys(String(currentUser.id), recipientId, publicKey)
    const encryptedContent = await encryptMessage(plaintext, sessionKeys.tx)

    ws.send(JSON.stringify({
      type: 'message',
      recipientId,
      encryptedContent,
    }))
  }, [])

  // Connect on mount and when auth state changes
  useEffect(() => {
    if (!accessToken || !cryptoReady || !user) return

    // Clear any pending reconnect from previous connection
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
    isCleaningUpRef.current = false

    // Determine WebSocket URL (same host, /api/ws path)
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const wsUrl = `${protocol}//${window.location.host}/api/ws?token=${accessToken}`

    console.log('[WS] Creating new WebSocket connection...')
    const ws = new WebSocket(wsUrl)
    wsRef.current = ws

    // Connection timeout - if not connected within 10s, treat as failed
    const connectionTimeout = window.setTimeout(() => {
      if (ws.readyState !== WebSocket.OPEN) {
        console.log('[WS] Connection timeout, closing...')
        ws.close()
      }
    }, 10000)

    ws.onopen = async () => {
      clearTimeout(connectionTimeout)
      console.log('[WS] Connected successfully')
      setIsConnected(true)
      setSharedWebSocket(ws)  // Share for call signaling

      // Update connection status in messageStore
      const store = useMessageStore.getState()
      const wasShowingBanner = store.showConnectionBanner
      store.setConnected(true)

      // Toast only if we were showing the banner (user was aware of disconnect)
      if (wasShowingBanner) {
        toast.success('Connected')
      }

      // Send any queued messages
      const queuedMessages = store.dequeueMessages()
      if (queuedMessages.length > 0) {
        console.log(`[WS] Sending ${queuedMessages.length} queued messages`)
        for (const msg of queuedMessages) {
          try {
            await sendMessageViaWs(ws, msg.recipientId, msg.plaintext)
          } catch (e) {
            console.error('[WS] Failed to send queued message:', e)
          }
        }
      }
    }

    ws.onmessage = async (event) => {
      try {
        const data = JSON.parse(event.data)
        // Always get fresh refs to avoid stale closures
        const { getOrDeriveSessionKeys, addMessage, fetchContactPublicKey, options, user: currentUser } = storeRefs.current

        console.log('[WS] Message received:', data.type)

        if (data.type === 'message') {
          // Incoming message from another user
          const { id, senderId, encryptedContent, timestamp } = data
          const { addContact, getContact } = storeRefs.current
          console.log('Processing incoming message from:', senderId)

          if (!currentUser) {
            console.error('No user in storeRefs')
            return
          }

          // Ensure sender is in contacts (so UI shows the conversation)
          if (!getContact(senderId)) {
            try {
              const senderInfo = await usersApi.getUser(senderId)
              addContact({
                id: senderId,
                username: senderInfo.username || 'Unknown',
                publicKey: null,
              })
              console.log('Added sender to contacts:', senderId)
            } catch (e) {
              console.error('Failed to fetch sender info:', e)
              // Continue anyway - message will be stored but contact name may be missing
            }
          }

          // Get sender's public key and derive session keys
          const publicKey = await fetchContactPublicKey(senderId)
          if (!publicKey) {
            console.error('No public key for sender:', senderId)
            return
          }

          const sessionKeys = await getOrDeriveSessionKeys(String(currentUser.id), senderId, publicKey)
          console.log('Receiver using rx key:', Array.from(sessionKeys.rx.slice(0, 8)), 'tx key:', Array.from(sessionKeys.tx.slice(0, 8)))

          // Decrypt message
          const content = await decryptMessage(encryptedContent, sessionKeys.rx)
          console.log('Decrypted content:', content ? 'success' : 'failed')
          if (content) {
            addMessage(senderId, {
              id,
              senderId,
              recipientId: String(currentUser.id),
              content,
              timestamp: new Date(timestamp),
              status: 'delivered',
            })
            console.log('Message added to store')
          }
        } else if (data.type === 'message_ack') {
          // Acknowledgment for sent message - update pending message with real ID and mark as sent
          const { updatePendingMessage } = storeRefs.current
          const { id, recipientId } = data
          console.log('Message acknowledged:', id, 'for recipient:', recipientId)
          if (recipientId) {
            updatePendingMessage(recipientId, id, 'sent')
          }
        } else if (data.type === 'delivered') {
          // Message was delivered to recipient
          const { updateMessageStatus } = storeRefs.current
          const { messageId, recipientId } = data
          console.log('Message delivered:', messageId, 'to', recipientId)
          updateMessageStatus(recipientId, messageId, 'delivered')
        } else if (data.type === 'read_receipt') {
          // Recipient read our messages
          const { markAllAsRead, user: currentUser } = storeRefs.current
          const { readerId } = data
          console.log('Messages read by:', readerId)
          if (currentUser) {
            markAllAsRead(readerId, String(currentUser.id))
          }
        } else if (data.type === 'error') {
          console.error('WebSocket error:', data.message)
          options.onError?.(new Error(data.message))
        } else if (data.type === 'typing') {
          // Typing indicator event - dispatch custom event for useTypingIndicator hook
          window.dispatchEvent(new CustomEvent('typing-indicator', {
            detail: {
              conversationId: data.conversationId,
              userId: data.userId,
              email: data.email,
              isTyping: data.isTyping
            }
          }))
        } else if (data.type?.startsWith('call-')) {
          // Call signaling messages - dispatch to useCall hook
          console.log('Call signaling message received:', data.type)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          dispatchCallSignaling(data as any)
        }
      } catch (e) {
        console.error('Failed to process WebSocket message:', e)
      }
    }

    ws.onclose = (event) => {
      console.log('[WS] Disconnected, code:', event.code, 'reason:', event.reason, 'wasCleanup:', isCleaningUpRef.current)
      setIsConnected(false)
      wsRef.current = null
      setSharedWebSocket(null)  // Clear shared reference

      // Don't reconnect if this was an intentional cleanup
      if (isCleaningUpRef.current) {
        console.log('[WS] Intentional close, not reconnecting')
        return
      }

      useMessageStore.getState().setConnected(false)

      // Reconnect after delay
      reconnectTimeoutRef.current = window.setTimeout(() => {
        console.log('[WS] Attempting reconnect...')
        // Increment retry count - banner only shows after first retry
        useMessageStore.getState().incrementRetry()
        setReconnectTrigger(t => t + 1)
      }, 3000)
    }

    ws.onerror = (error) => {
      console.error('[WS] Error:', error)
      clearTimeout(connectionTimeout)
      // The onclose handler will trigger reconnect and update status
    }

    return () => {
      console.log('[WS] Cleanup - closing WebSocket')
      isCleaningUpRef.current = true
      clearTimeout(connectionTimeout)
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
        reconnectTimeoutRef.current = null
      }
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close()
      }
      wsRef.current = null
    }
  }, [accessToken, cryptoReady, user?.id, reconnectTrigger]) // reconnectTrigger forces reconnect

  // Send encrypted message (queues if disconnected)
  const sendMessage = useCallback(async (recipientId: string, plaintext: string) => {
    if (!user) throw new Error('Not authenticated')

    const { getOrDeriveSessionKeys, addMessage, fetchContactPublicKey } = storeRefs.current

    // Add optimistic message to store immediately
    const tempId = -Date.now() // Temporary negative ID
    addMessage(recipientId, {
      id: tempId,
      senderId: String(user.id),
      recipientId,
      content: plaintext,
      timestamp: new Date(),
      status: 'sending',
    })

    // If not connected, queue the message for later
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.log('WebSocket not connected, queueing message')
      useMessageStore.getState().queueMessage({ recipientId, plaintext, tempId })
      return
    }

    // Get recipient's public key
    const publicKey = await fetchContactPublicKey(recipientId)
    if (!publicKey) {
      throw new Error('Recipient has no public key')
    }

    // Derive session keys
    const sessionKeys = await getOrDeriveSessionKeys(String(user.id), recipientId, publicKey)
    console.log('Sender using tx key:', Array.from(sessionKeys.tx.slice(0, 8)), 'rx key:', Array.from(sessionKeys.rx.slice(0, 8)))

    // Encrypt message
    const encryptedContent = await encryptMessage(plaintext, sessionKeys.tx)

    // Send via WebSocket
    wsRef.current.send(JSON.stringify({
      type: 'message',
      recipientId,
      encryptedContent,
    }))
  }, [user])

  // Mark messages from a contact as read
  const markAsRead = useCallback((contactId: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      return
    }
    wsRef.current.send(JSON.stringify({
      type: 'read',
      recipientId: contactId,
    }))
  }, [])

  // Send call signaling message
  const sendCallSignal = useCallback((type: string, recipientId: string, data: Record<string, unknown> = {}) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.warn('WebSocket not connected, cannot send call signal:', type)
      return
    }
    wsRef.current.send(JSON.stringify({
      type,
      recipientId,
      ...data,
    }))
  }, [])

  // Get WebSocket reference for call signaling
  const getWebSocket = useCallback(() => wsRef.current, [])

  // Send typing indicator event
  const sendTyping = useCallback((conversationId: string, recipientId: string, isTyping: boolean) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      return
    }
    wsRef.current.send(JSON.stringify({
      type: 'typing',
      conversationId,
      recipientId,
      isTyping
    }))
  }, [])

  return {
    isConnected,
    sendMessage,
    markAsRead,
    sendCallSignal,
    getWebSocket,
    sendTyping,
  }
}
