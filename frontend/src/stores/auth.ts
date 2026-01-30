import { create } from 'zustand'
import { authApi } from '@/lib/api'
import { useCryptoStore } from './cryptoStore'

interface User {
  id: string
  email: string
  username: string | null
  createdAt?: string
}

interface AuthState {
  user: User | null
  accessToken: string | null
  isAuthenticated: boolean
  isInitialized: boolean
  error: string | null
  sessionExpired: boolean

  // Actions
  signup: (email: string, password: string) => Promise<void>
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  checkAuth: () => Promise<void>
  setUsername: (username: string) => Promise<void>
  clearError: () => void
  setSessionExpired: (expired: boolean) => void
  relogin: (email: string, password: string) => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isInitialized: false,
  error: null,
  sessionExpired: false,

  signup: async (email: string, password: string) => {
    try {
      set({ error: null })
      const response = await authApi.signup(email, password)

      // Store access token and set authenticated state
      localStorage.setItem('accessToken', response.accessToken)
      set({
        user: response.user,
        accessToken: response.accessToken,
        isAuthenticated: true,
        error: null,
      })

      // Initialize crypto keys derived from email+password
      await useCryptoStore.getState().initializeKeys(email, password)

      // Store credentials in sessionStorage for page refresh recovery
      // (cleared when browser closes)
      sessionStorage.setItem('_ec', btoa(JSON.stringify({ e: email, p: password })))
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Signup failed'
      set({ error: message, isAuthenticated: false, user: null })
      throw error
    }
  },

  login: async (email: string, password: string) => {
    try {
      set({ error: null })
      const response = await authApi.login(email, password)

      // Store access token and set authenticated state
      localStorage.setItem('accessToken', response.accessToken)
      set({
        user: response.user,
        accessToken: response.accessToken,
        isAuthenticated: true,
        error: null,
      })

      // Initialize crypto keys derived from email+password
      await useCryptoStore.getState().initializeKeys(email, password)

      // Store credentials in sessionStorage for page refresh recovery
      // (cleared when browser closes)
      sessionStorage.setItem('_ec', btoa(JSON.stringify({ e: email, p: password })))
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Login failed'
      set({ error: message, isAuthenticated: false, user: null })
      throw error
    }
  },

  logout: async () => {
    try {
      await authApi.logout()
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      // Clear state regardless of API call result
      localStorage.removeItem('accessToken')
      sessionStorage.removeItem('_ec')
      useCryptoStore.getState().clearKeys()
      set({
        user: null,
        accessToken: null,
        isAuthenticated: false,
        error: null,
      })
    }
  },

  checkAuth: async () => {
    const token = localStorage.getItem('accessToken')

    if (!token) {
      set({ isInitialized: true, isAuthenticated: false })
      return
    }

    try {
      // Verify token is still valid by calling /me endpoint
      const user = await authApi.me()
      set({
        user,
        accessToken: token,
        isAuthenticated: true,
        isInitialized: true,
      })
    } catch (error) {
      // Token invalid or expired, clear it
      localStorage.removeItem('accessToken')
      set({
        user: null,
        accessToken: null,
        isAuthenticated: false,
        isInitialized: true,
      })
    }
  },

  setUsername: async (username: string) => {
    try {
      set({ error: null })
      const user = await authApi.setUsername(username)
      set({ user })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to set username'
      set({ error: message })
      throw error
    }
  },

  clearError: () => set({ error: null }),

  setSessionExpired: (expired: boolean) => set({ sessionExpired: expired }),

  relogin: async (email: string, password: string) => {
    try {
      set({ error: null })
      const response = await authApi.login(email, password)

      // Store access token and set authenticated state
      localStorage.setItem('accessToken', response.accessToken)
      set({
        user: response.user,
        accessToken: response.accessToken,
        isAuthenticated: true,
        sessionExpired: false, // This closes the modal
        error: null,
      })

      // Reinitialize crypto keys with provided credentials
      await useCryptoStore.getState().initializeKeys(email, password)

      // Update stored credentials in sessionStorage
      sessionStorage.setItem('_ec', btoa(JSON.stringify({ e: email, p: password })))
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Login failed'
      set({ error: message })
      throw error
    }
  },
}))
