import { create } from 'zustand'
import { apiRequest } from '@/lib/api'

export interface ReactionSummary {
  emoji: string
  count: number
  users: { userId: string; email: string; username?: string | null }[]
  userReacted: boolean
}

interface ReactionState {
  // Map: messageId -> reactions
  reactions: Map<number, ReactionSummary[]>
  isLoading: Map<number, boolean>

  // Actions
  loadReactions: (messageId: number) => Promise<void>
  toggleReaction: (messageId: number, emoji: string) => Promise<void>
  setReactions: (messageId: number, reactions: ReactionSummary[]) => void
  addReactionOptimistic: (messageId: number, emoji: string, userId: string, email: string) => void
  removeReactionOptimistic: (messageId: number, emoji: string, userId: string) => void
  clearReactions: () => void
}

export const useReactionStore = create<ReactionState>((set, get) => ({
  reactions: new Map(),
  isLoading: new Map(),

  loadReactions: async (messageId) => {
    set((state) => ({
      isLoading: new Map(state.isLoading).set(messageId, true)
    }))

    try {
      const reactions = await apiRequest<ReactionSummary[]>(`/api/messages/${messageId}/reactions`)
      set((state) => ({
        reactions: new Map(state.reactions).set(messageId, reactions),
        isLoading: new Map(state.isLoading).set(messageId, false)
      }))
    } catch {
      set((state) => ({
        isLoading: new Map(state.isLoading).set(messageId, false)
      }))
    }
  },

  toggleReaction: async (messageId, emoji) => {
    try {
      await apiRequest<{ added: boolean }>(`/api/messages/${messageId}/reactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emoji })
      })

      // Refresh reactions after toggle
      await get().loadReactions(messageId)
    } catch (err) {
      console.error('Failed to toggle reaction:', err)
      throw err
    }
  },

  setReactions: (messageId, reactions) => {
    set((state) => ({
      reactions: new Map(state.reactions).set(messageId, reactions)
    }))
  },

  addReactionOptimistic: (messageId, emoji, userId, email) => {
    set((state) => {
      const current = state.reactions.get(messageId) || []
      const existing = current.find(r => r.emoji === emoji)

      let updated: ReactionSummary[]

      if (existing) {
        // Add user to existing reaction
        if (existing.users.some(u => u.userId === userId)) return state // Already reacted

        updated = current.map(r =>
          r.emoji === emoji
            ? {
                ...r,
                count: r.count + 1,
                users: [...r.users, { userId, email }],
                userReacted: true
              }
            : r
        )
      } else {
        // Add new reaction
        updated = [
          ...current,
          {
            emoji,
            count: 1,
            users: [{ userId, email }],
            userReacted: true
          }
        ]
      }

      return {
        reactions: new Map(state.reactions).set(messageId, updated)
      }
    })
  },

  removeReactionOptimistic: (messageId, emoji, userId) => {
    set((state) => {
      const current = state.reactions.get(messageId) || []
      const existing = current.find(r => r.emoji === emoji)

      if (!existing) return state

      let updated: ReactionSummary[]

      if (existing.count === 1) {
        // Remove reaction entirely
        updated = current.filter(r => r.emoji !== emoji)
      } else {
        // Remove user from reaction
        updated = current.map(r =>
          r.emoji === emoji
            ? {
                ...r,
                count: r.count - 1,
                users: r.users.filter(u => u.userId !== userId),
                userReacted: r.users.some(u => u.userId === userId) ? false : r.userReacted
              }
            : r
        )
      }

      return {
        reactions: new Map(state.reactions).set(messageId, updated)
      }
    })
  },

  clearReactions: () => {
    set({ reactions: new Map(), isLoading: new Map() })
  }
}))
