import { create } from 'zustand'
import { messageApi } from '@/lib/api'

interface Message {
  id: number
  senderId: string
  recipientId: string
  content: string // Decrypted plaintext
  timestamp: Date
  status: 'sending' | 'sent' | 'delivered' | 'read'
}

interface MessageState {
  // Messages keyed by contact ID
  conversations: Map<string, Message[]>
  isLoadingHistory: boolean

  // Actions
  addMessage: (contactId: string, message: Message) => void
  updateMessageStatus: (contactId: string, messageId: number, status: Message['status']) => void
  loadHistory: (contactId: string, decrypt: (encrypted: string) => Promise<string | null>) => Promise<void>
  clearMessages: () => void
}

export const useMessageStore = create<MessageState>((set) => ({
  conversations: new Map(),
  isLoadingHistory: false,

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

  loadHistory: async (contactId: string, decrypt: (encrypted: string) => Promise<string | null>) => {
    set({ isLoadingHistory: true })

    try {
      const { messages: encryptedMessages } = await messageApi.getHistory(contactId, 50)

      const decryptedMessages: Message[] = []
      for (const msg of encryptedMessages) {
        const content = await decrypt(msg.encryptedContent)
        if (content) {
          decryptedMessages.push({
            id: msg.id,
            senderId: msg.senderId,
            recipientId: msg.recipientId,
            content,
            timestamp: new Date(msg.createdAt),
            status: msg.readAt ? 'read' : msg.deliveredAt ? 'delivered' : 'sent',
          })
        }
      }

      set((state) => ({
        conversations: new Map(state.conversations).set(contactId, decryptedMessages),
        isLoadingHistory: false,
      }))
    } catch (e) {
      console.error('Failed to load message history:', e)
      set({ isLoadingHistory: false })
    }
  },

  clearMessages: () => {
    set({ conversations: new Map() })
  },
}))
