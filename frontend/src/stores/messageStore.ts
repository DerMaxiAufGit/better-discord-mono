import { create } from 'zustand'
import { messageApi } from '@/lib/api'
import { useSearchStore } from '@/stores/searchStore'
import { useContactStore } from '@/stores/contactStore'

interface FileAttachment {
  id: string
  filename: string
  mimeType: string
  sizeBytes: number
  encryptionHeader: string
}

interface Message {
  id: number
  senderId: string
  recipientId: string
  content: string // Decrypted plaintext
  timestamp: Date
  status: 'sending' | 'sent' | 'delivered' | 'read'
  files?: FileAttachment[]
  replyToId?: number
}

interface QueuedMessage {
  recipientId: string
  plaintext: string
  tempId: number
}

type ConnectionState = 'connected' | 'disconnected' | 'reconnecting'

interface MessageState {
  // Messages keyed by contact ID
  conversations: Map<string, Message[]>
  isLoadingHistory: boolean
  // Internal connection state (true state of WebSocket)
  isConnected: boolean
  // Connection state for UI display
  connectionState: ConnectionState
  // Whether to show the connected banner briefly
  showConnectedBanner: boolean
  // Retry count for current disconnect
  retryCount: number
  // Whether to show connection banner (only after first retry fails)
  showConnectionBanner: boolean
  // Queued messages to send when reconnected
  messageQueue: QueuedMessage[]

  // Actions
  addMessage: (contactId: string, message: Message) => void
  updateMessageStatus: (contactId: string, messageId: number, status: Message['status']) => void
  updatePendingMessage: (contactId: string, realId: number, status: Message['status']) => void
  markAllAsRead: (contactId: string, currentUserId: string) => void
  loadHistory: (contactId: string, decrypt: (encrypted: string, senderId: string) => Promise<string | null>) => Promise<void>
  clearMessages: () => void
  setConnected: (connected: boolean) => void
  setConnectionState: (state: ConnectionState) => void
  setReconnecting: () => void
  incrementRetry: () => void
  resetRetry: () => void
  queueMessage: (msg: QueuedMessage) => void
  dequeueMessages: () => QueuedMessage[]

  // Legacy compatibility
  connectionStatus: 'connected' | 'connecting' | 'disconnected'
  setConnectionStatus: (status: 'connected' | 'connecting' | 'disconnected') => void
}

export const useMessageStore = create<MessageState>((set, get) => ({
  conversations: new Map(),
  isLoadingHistory: false,
  isConnected: false,
  connectionState: 'disconnected',
  showConnectedBanner: false,
  retryCount: 0,
  showConnectionBanner: false,
  messageQueue: [],
  connectionStatus: 'connecting',

  addMessage: (contactId: string, message: Message) => {
    set((state) => {
      const messages = state.conversations.get(contactId) || []
      // Avoid duplicates by ID
      if (messages.some((m) => m.id === message.id)) {
        return state
      }
      return {
        conversations: new Map(state.conversations).set(contactId, [...messages, message]),
      }
    })
  },

  updateMessageStatus: (contactId: string, messageId: number, status: Message['status']) => {
    set((state) => {
      const messages = state.conversations.get(contactId)
      if (!messages) return state

      const updated = messages.map((m) =>
        m.id === messageId ? { ...m, status } : m
      )
      return {
        conversations: new Map(state.conversations).set(contactId, updated),
      }
    })
  },

  // Update a pending message (negative ID) with real ID and status
  updatePendingMessage: (contactId: string, realId: number, status: Message['status']) => {
    set((state) => {
      const messages = state.conversations.get(contactId)
      if (!messages) return state

      // Find the first pending message (negative ID) for this contact
      const pendingIndex = messages.findIndex((m) => m.id < 0)
      if (pendingIndex === -1) return state

      const updated = [...messages]
      updated[pendingIndex] = { ...updated[pendingIndex], id: realId, status }
      return {
        conversations: new Map(state.conversations).set(contactId, updated),
      }
    })
  },

  markAllAsRead: (contactId: string, currentUserId: string) => {
    set((state) => {
      const messages = state.conversations.get(contactId)
      if (!messages) return state

      // Mark all messages sent by current user to this contact as read
      const updated = messages.map((m) =>
        m.senderId === currentUserId && m.status !== 'read' ? { ...m, status: 'read' as const } : m
      )
      return {
        conversations: new Map(state.conversations).set(contactId, updated),
      }
    })
  },

  loadHistory: async (contactId: string, decrypt: (encrypted: string, senderId: string) => Promise<string | null>) => {
    set({ isLoadingHistory: true })

    try {
      const { messages: encryptedMessages } = await messageApi.getHistory(contactId, 50)

      const decryptedMessages: Message[] = []
      const messagesToIndex: Array<{
        id: number
        conversationId: string
        conversationType: 'dm' | 'group'
        senderId: string
        senderName: string
        plaintext: string
        timestamp: Date
      }> = []

      // Get contact info for sender name
      const contactStore = useContactStore.getState()
      const contact = contactStore.getContact(contactId)

      for (const msg of encryptedMessages) {
        const content = await decrypt(msg.encryptedContent, msg.senderId)
        if (content !== null) {
          const timestamp = new Date(msg.createdAt)
          decryptedMessages.push({
            id: msg.id,
            senderId: msg.senderId,
            recipientId: msg.recipientId,
            content,
            timestamp,
            status: msg.readAt ? 'read' : msg.deliveredAt ? 'delivered' : 'sent',
            files: msg.files,
            replyToId: msg.replyToId,
          })

          // Prepare message for search indexing
          messagesToIndex.push({
            id: msg.id,
            conversationId: contactId,
            conversationType: 'dm',
            senderId: msg.senderId,
            senderName: contact?.username || msg.senderId,
            plaintext: content,
            timestamp,
          })
        }
      }

      set((state) => ({
        conversations: new Map(state.conversations).set(contactId, decryptedMessages),
        isLoadingHistory: false,
      }))

      // Index all messages for search
      if (messagesToIndex.length > 0) {
        const searchStore = useSearchStore.getState()
        await searchStore.indexMessages(messagesToIndex)
      }
    } catch (e) {
      console.error('Failed to load message history:', e)
      set({ isLoadingHistory: false })
    }
  },

  clearMessages: () => {
    set({ conversations: new Map() })
  },

  setConnected: (connected: boolean) => {
    if (connected) {
      const wasDisconnected = !get().isConnected && get().retryCount > 0
      set({
        isConnected: true,
        connectionState: 'connected',
        retryCount: 0,
        showConnectionBanner: false,
        showConnectedBanner: wasDisconnected, // Show connected banner if we were reconnecting
        connectionStatus: 'connected'
      })
      // Auto-hide connected banner after 2 seconds
      if (wasDisconnected) {
        setTimeout(() => {
          set({ showConnectedBanner: false })
        }, 2000)
      }
    } else {
      set({
        isConnected: false,
        connectionState: 'disconnected',
        showConnectionBanner: true, // Show disconnected banner immediately
      })
    }
  },

  setConnectionState: (state: ConnectionState) => {
    set({ connectionState: state })
  },

  setReconnecting: () => {
    set({
      connectionState: 'reconnecting',
      showConnectionBanner: true,
    })
  },

  incrementRetry: () => {
    const { retryCount } = get()
    const newCount = retryCount + 1
    // Show banner when retrying
    set({
      retryCount: newCount,
      connectionState: 'reconnecting',
      showConnectionBanner: true,
      connectionStatus: 'disconnected'
    })
  },

  resetRetry: () => {
    set({ retryCount: 0, showConnectionBanner: false })
  },

  queueMessage: (msg: QueuedMessage) => {
    set((state) => ({
      messageQueue: [...state.messageQueue, msg]
    }))
  },

  dequeueMessages: () => {
    const queue = get().messageQueue
    set({ messageQueue: [] })
    return queue
  },

  // Legacy - still used by some components
  setConnectionStatus: (status) => {
    set({ connectionStatus: status })
  },
}))
