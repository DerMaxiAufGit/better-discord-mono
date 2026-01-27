import { useEffect, useRef, useCallback, useState } from 'react'
import { useAuthStore } from '@/stores/auth'
import { useCryptoStore } from '@/stores/cryptoStore'
import { useMessageStore } from '@/stores/messageStore'
import { useContactStore } from '@/stores/contactStore'
import { encryptMessage, decryptMessage } from '@/lib/crypto/messageEncryption'

interface UseMessagingOptions {
  onError?: (error: Error) => void
}

export function useMessaging(options: UseMessagingOptions = {}) {
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<number | null>(null)
  const [isConnected, setIsConnected] = useState(false)

  const { accessToken, user } = useAuthStore()
  const { getOrDeriveSessionKeys, isInitialized: cryptoReady } = useCryptoStore()
  const { addMessage } = useMessageStore()
  const { fetchContactPublicKey } = useContactStore()

  // Connect to WebSocket
  const connect = useCallback(() => {
    if (!accessToken || !cryptoReady || !user) return

    // Determine WebSocket URL (same host, /api/ws path)
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const wsUrl = `${protocol}//${window.location.host}/api/ws?token=${accessToken}`

    const ws = new WebSocket(wsUrl)
    wsRef.current = ws

    ws.onopen = () => {
      console.log('WebSocket connected')
      setIsConnected(true)
    }

    ws.onmessage = async (event) => {
      try {
        const data = JSON.parse(event.data)

        if (data.type === 'message') {
          // Incoming message from another user
          const { id, senderId, encryptedContent, timestamp } = data

          // Get sender's public key and derive session keys
          const publicKey = await fetchContactPublicKey(senderId)
          if (!publicKey) {
            console.error('No public key for sender:', senderId)
            return
          }

          const sessionKeys = await getOrDeriveSessionKeys(String(user.id), senderId, publicKey)

          // Decrypt message
          const content = await decryptMessage(encryptedContent, sessionKeys.rx)
          if (content) {
            addMessage(senderId, {
              id,
              senderId,
              recipientId: String(user.id),
              content,
              timestamp: new Date(timestamp),
              status: 'delivered',
            })
          }
        } else if (data.type === 'message_ack') {
          // Acknowledgment for sent message
          // Message ID is assigned, update status
          // Note: We'd need to track pending messages to update them
          console.log('Message acknowledged:', data.id)
        } else if (data.type === 'error') {
          console.error('WebSocket error:', data.message)
          options.onError?.(new Error(data.message))
        }
      } catch (e) {
        console.error('Failed to process WebSocket message:', e)
      }
    }

    ws.onclose = () => {
      console.log('WebSocket disconnected, reconnecting in 3s...')
      setIsConnected(false)
      wsRef.current = null

      // Reconnect after delay
      reconnectTimeoutRef.current = window.setTimeout(() => {
        connect()
      }, 3000)
    }

    ws.onerror = (error) => {
      console.error('WebSocket error:', error)
    }
  }, [accessToken, cryptoReady, user, fetchContactPublicKey, getOrDeriveSessionKeys, addMessage, options])

  // Send encrypted message
  const sendMessage = useCallback(async (recipientId: string, plaintext: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket not connected')
    }
    if (!user) throw new Error('Not authenticated')

    // Get recipient's public key
    const publicKey = await fetchContactPublicKey(recipientId)
    if (!publicKey) {
      throw new Error('Recipient has no public key')
    }

    // Derive session keys
    const sessionKeys = await getOrDeriveSessionKeys(String(user.id), recipientId, publicKey)

    // Encrypt message
    const encryptedContent = await encryptMessage(plaintext, sessionKeys.tx)

    // Add optimistic message to store
    const tempId = -Date.now() // Temporary negative ID
    addMessage(recipientId, {
      id: tempId,
      senderId: String(user.id),
      recipientId,
      content: plaintext,
      timestamp: new Date(),
      status: 'sending',
    })

    // Send via WebSocket
    wsRef.current.send(JSON.stringify({
      type: 'message',
      recipientId,
      encryptedContent,
    }))
  }, [user, fetchContactPublicKey, getOrDeriveSessionKeys, addMessage])

  // Connect on mount, disconnect on unmount
  useEffect(() => {
    connect()

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      wsRef.current?.close()
    }
  }, [connect])

  return {
    isConnected,
    sendMessage,
  }
}
