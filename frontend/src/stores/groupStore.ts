import { create } from 'zustand'
import { apiRequest } from '@/lib/api'

export type GroupRole = 'owner' | 'admin' | 'moderator' | 'member'

export interface Group {
  id: string
  name: string
  description: string | null
  avatar_url: string | null
  owner_id: string
  role: GroupRole
  member_count: number
  created_at: string
  updated_at: string
}

export interface GroupMember {
  id: number
  group_id: string
  user_id: string
  role: GroupRole
  joined_at: string
  email: string
  username: string | null
  public_key?: string
}

export interface GroupInvite {
  id: string
  code: string
  expires_at: string | null
  max_uses: number | null
  uses: number
  created_at: string
}

interface GroupState {
  groups: Group[]
  selectedGroupId: string | null
  members: Map<string, GroupMember[]> // groupId -> members
  isLoading: boolean
  error: string | null

  // Actions
  loadGroups: () => Promise<void>
  selectGroup: (groupId: string | null) => void
  loadMembers: (groupId: string) => Promise<GroupMember[]>
  createGroup: (name: string, description?: string) => Promise<Group>
  updateGroup: (groupId: string, updates: Partial<Pick<Group, 'name' | 'description' | 'avatar_url'>>) => Promise<void>
  deleteGroup: (groupId: string) => Promise<void>
  addMember: (groupId: string, userId: string, role?: GroupRole) => Promise<void>
  removeMember: (groupId: string, userId: string) => Promise<void>
  changeRole: (groupId: string, userId: string, role: GroupRole) => Promise<void>
  createInvite: (groupId: string, expiresIn?: number, maxUses?: number) => Promise<GroupInvite>
  joinGroup: (code: string) => Promise<string> // returns groupId
  leaveGroup: (groupId: string) => Promise<void>
  clearGroups: () => void
}

export const useGroupStore = create<GroupState>((set, get) => ({
  groups: [],
  selectedGroupId: null,
  members: new Map(),
  isLoading: false,
  error: null,

  loadGroups: async () => {
    set({ isLoading: true, error: null })
    try {
      const groups = await apiRequest<Group[]>('/api/groups')
      set({ groups, isLoading: false })
    } catch (err) {
      set({ error: 'Failed to load groups', isLoading: false })
    }
  },

  selectGroup: (groupId) => {
    set({ selectedGroupId: groupId })
    if (groupId) {
      get().loadMembers(groupId)
    }
  },

  loadMembers: async (groupId) => {
    try {
      const response = await apiRequest<GroupMember[] | { members: GroupMember[] }>(`/api/groups/${groupId}/members`)
      // Handle both array and object response formats
      const members = Array.isArray(response) ? response : (response.members || [])
      set((state) => ({
        members: new Map(state.members).set(groupId, members)
      }))
      return members
    } catch {
      return []
    }
  },

  createGroup: async (name, description) => {
    const group = await apiRequest<Group>('/api/groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description })
    })
    set((state) => ({ groups: [...state.groups, group] }))
    return group
  },

  updateGroup: async (groupId, updates) => {
    const updated = await apiRequest<Group>(`/api/groups/${groupId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    })
    set((state) => ({
      groups: state.groups.map(g => g.id === groupId ? { ...g, ...updated } : g)
    }))
  },

  deleteGroup: async (groupId) => {
    await apiRequest(`/api/groups/${groupId}`, {
      method: 'DELETE'
    })
    set((state) => ({
      groups: state.groups.filter(g => g.id !== groupId),
      selectedGroupId: state.selectedGroupId === groupId ? null : state.selectedGroupId
    }))
  },

  addMember: async (groupId, userId, role = 'member') => {
    await apiRequest(`/api/groups/${groupId}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, role })
    })
    await get().loadMembers(groupId)
  },

  removeMember: async (groupId, userId) => {
    await apiRequest(`/api/groups/${groupId}/members/${userId}`, {
      method: 'DELETE'
    })
    await get().loadMembers(groupId)
  },

  changeRole: async (groupId, userId, role) => {
    await apiRequest(`/api/groups/${groupId}/members/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role })
    })
    await get().loadMembers(groupId)
  },

  createInvite: async (groupId, expiresIn, maxUses) => {
    return apiRequest<GroupInvite>(`/api/groups/${groupId}/invites`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ expiresIn, maxUses })
    })
  },

  joinGroup: async (code) => {
    const result = await apiRequest<{ groupId: string }>('/api/groups/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code })
    })
    await get().loadGroups()
    return result.groupId
  },

  leaveGroup: async (groupId) => {
    const userId = (await import('@/stores/auth')).useAuthStore.getState().user?.id
    if (userId) {
      await get().removeMember(groupId, userId.toString())
    }
    set((state) => ({
      groups: state.groups.filter(g => g.id !== groupId),
      selectedGroupId: state.selectedGroupId === groupId ? null : state.selectedGroupId
    }))
  },

  clearGroups: () => {
    set({ groups: [], selectedGroupId: null, members: new Map() })
  }
}))
