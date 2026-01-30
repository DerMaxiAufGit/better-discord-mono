import { showApiError } from '@/lib/toast'
import { useAuthStore } from '@/stores/auth'

// API client with automatic token refresh
const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

interface AuthResponse {
  accessToken: string
  user: {
    id: number
    email: string
    username: string | null
    createdAt?: string
  }
}

let isRefreshing = false
let refreshPromise: Promise<string | null> | null = null

/**
 * Refresh access token using httpOnly refresh token cookie.
 * Exported for use by WebSocket reconnection logic.
 * Thundering herd prevention: single refresh promise shared across concurrent requests.
 */
export async function refreshAccessToken(): Promise<string | null> {
  if (isRefreshing && refreshPromise) {
    return refreshPromise
  }

  isRefreshing = true
  refreshPromise = (async () => {
    try {
      const response = await fetch(`${API_URL}/api/auth/refresh`, {
        method: 'POST',
        credentials: 'include', // Include httpOnly refresh token cookie
      })

      if (!response.ok) {
        return null
      }

      const data: AuthResponse = await response.json()
      return data.accessToken
    } catch (error) {
      console.error('Token refresh failed:', error)
      return null
    } finally {
      isRefreshing = false
      refreshPromise = null
    }
  })()

  return refreshPromise
}

// Generic API client with automatic token refresh
export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const accessToken = localStorage.getItem('accessToken')

  const headers = new Headers(options.headers)
  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`)
  }

  let response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
    credentials: 'include', // Always include cookies
  })

  // If 401, attempt token refresh once
  if (response.status === 401 && accessToken) {
    const newToken = await refreshAccessToken()

    if (newToken) {
      localStorage.setItem('accessToken', newToken)
      headers.set('Authorization', `Bearer ${newToken}`)

      // Retry original request with new token
      response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers,
        credentials: 'include',
      })
    } else {
      // Refresh failed - show session expired modal
      useAuthStore.getState().setSessionExpired(true)
      throw new Error('Session expired')
    }
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }))
    const message = error.error || error.message || `HTTP ${response.status}`

    // Don't toast 401s (handled by auth flow)
    if (response.status !== 401) {
      showApiError(message)
    }

    throw new Error(message)
  }

  // Handle empty responses (204 No Content or empty body)
  if (response.status === 204 || response.headers.get('content-length') === '0') {
    return undefined as T
  }

  const text = await response.text()
  if (!text) {
    return undefined as T
  }

  return JSON.parse(text)
}

// Auth-specific API methods
export const authApi = {
  async signup(email: string, password: string): Promise<AuthResponse> {
    return apiRequest<AuthResponse>('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
  },

  async login(email: string, password: string): Promise<AuthResponse> {
    return apiRequest<AuthResponse>('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
  },

  async logout(): Promise<void> {
    await apiRequest<void>('/api/auth/logout', {
      method: 'POST',
    })
  },

  async me(): Promise<AuthResponse['user']> {
    const response = await apiRequest<{ user: AuthResponse['user'] }>('/api/auth/me', {
      method: 'POST',
    })
    return response.user
  },

  async setUsername(username: string): Promise<AuthResponse['user']> {
    const response = await apiRequest<{ user: AuthResponse['user'] }>('/api/auth/username', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username }),
    })
    return response.user
  },
}

export const keyApi = {
  // Upload current user's public key
  setPublicKey: async (publicKey: string): Promise<void> => {
    await apiRequest('/api/keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ publicKey }),
    })
  },

  // Get another user's public key
  getPublicKey: async (userId: string): Promise<string | null> => {
    try {
      const response = await apiRequest<{ publicKey: string }>(`/api/keys/${userId}`)
      return response.publicKey
    } catch (e) {
      if ((e as Error).message.includes('404')) return null
      throw e
    }
  },
}

export const messageApi = {
  // Get list of conversations (returns contactId only, fetch username separately)
  getConversations: async () => {
    return apiRequest<{ conversations: Array<{
      contactId: string
      lastMessageAt: string
    }> }>('/api/conversations')
  },

  // Get message history with a contact
  getHistory: async (contactId: string, limit?: number, beforeId?: number) => {
    const params = new URLSearchParams()
    if (limit) params.set('limit', limit.toString())
    if (beforeId) params.set('beforeId', beforeId.toString())
    const query = params.toString() ? `?${params.toString()}` : ''
    return apiRequest<{ messages: Array<{
      id: number
      senderId: string
      recipientId: string
      encryptedContent: string
      createdAt: string
      deliveredAt?: string
      readAt?: string
      replyToId?: number
      files?: Array<{
        id: string
        filename: string
        mimeType: string
        sizeBytes: number
        encryptionHeader: string
      }>
    }> }>(`/api/messages/${contactId}${query}`)
  },

  // Mark messages as read
  markRead: async (contactId: string): Promise<void> => {
    await apiRequest(`/api/messages/${contactId}/read`, { method: 'POST' })
  },

  // Get group message history
  getGroupHistory: async (groupId: string, limit?: number, beforeId?: number) => {
    const params = new URLSearchParams()
    if (limit) params.set('limit', limit.toString())
    if (beforeId) params.set('beforeId', beforeId.toString())
    const query = params.toString() ? `?${params.toString()}` : ''
    return apiRequest<{ messages: Array<{
      id: number
      senderId: string
      groupId: string
      encryptedContent: string
      senderEmail?: string
      createdAt: string
      files?: Array<{
        id: string
        filename: string
        mimeType: string
        sizeBytes: number
        encryptionHeader: string
      }>
    }>; hasMore: boolean }>(`/api/groups/${groupId}/messages${query}`)
  },
}

export const usersApi = {
  // Search users by username (requires search term)
  searchUsers: async (search: string): Promise<{ users: { id: string; username: string }[] }> => {
    if (!search || search.trim().length < 2) {
      return { users: [] };
    }
    const params = `?search=${encodeURIComponent(search)}`;
    return apiRequest(`/api/users${params}`);
  },

  // Get single user by ID
  getUser: async (userId: string): Promise<{ id: string; username: string }> => {
    return apiRequest(`/api/users/${userId}`);
  },
}

export const friendsApi = {
  // Get all friends
  getFriends: async () => {
    return apiRequest<{ friends: Array<{ id: number; oderId: string; username: string; status: string; createdAt: string }> }>('/api/friends')
  },

  // Get pending friend requests
  getPendingRequests: async () => {
    return apiRequest<{ requests: Array<{ id: number; oderId: string; username: string; status: string; createdAt: string }> }>('/api/friends/requests')
  },

  // Send friend request
  sendRequest: async (userId: string) => {
    return apiRequest<{ request: any }>('/api/friends/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    })
  },

  // Accept friend request
  acceptRequest: async (requestId: number) => {
    return apiRequest<{ request: any }>(`/api/friends/requests/${requestId}/accept`, {
      method: 'POST',
    })
  },

  // Reject friend request
  rejectRequest: async (requestId: number) => {
    return apiRequest<{ success: boolean }>(`/api/friends/requests/${requestId}/reject`, {
      method: 'POST',
    })
  },

  // Remove friend
  removeFriend: async (friendId: string) => {
    return apiRequest<{ success: boolean }>(`/api/friends/${friendId}`, {
      method: 'DELETE',
    })
  },

  // Get friendship status
  getStatus: async (userId: string) => {
    return apiRequest<{ status: { status: string; requestId?: number; isRequester?: boolean } | null }>(`/api/friends/status/${userId}`)
  },
}

export const turnApi = {
  async getCredentials(): Promise<{
    username: string;
    password: string;
    ttl: number;
    uris: string[];
  }> {
    return apiRequest('/api/turn/credentials');
  },
};

export const api = {
  auth: authApi,
  keys: keyApi,
  messages: messageApi,
  users: usersApi,
  friends: friendsApi,
  turn: turnApi,
}
