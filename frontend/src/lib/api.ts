// API client with automatic token refresh
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

interface AuthResponse {
  accessToken: string
  user: {
    id: number
    email: string
    createdAt: string
  }
}

let isRefreshing = false
let refreshPromise: Promise<string | null> | null = null

// Thundering herd prevention: single refresh promise shared across concurrent requests
async function refreshAccessToken(): Promise<string | null> {
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
    }
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }))
    throw new Error(error.message || `HTTP ${response.status}`)
  }

  return response.json()
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
}

export const api = {
  auth: authApi,
}
