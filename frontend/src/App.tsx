import { useEffect } from 'react'
import { RouterProvider } from 'react-router'
import { ThemeProvider } from 'next-themes'
import { useAuthStore } from '@/stores/auth'
import { useCryptoStore } from '@/stores/cryptoStore'
import { router } from '@/routes'

function App() {
  const checkAuth = useAuthStore((state) => state.checkAuth)
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const isAuthInitialized = useAuthStore((state) => state.isInitialized)
  const isCryptoInitialized = useCryptoStore((state) => state.isInitialized)
  const initializeKeys = useCryptoStore((state) => state.initializeKeys)

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  // Recover crypto keys on page refresh using sessionStorage
  useEffect(() => {
    if (isAuthInitialized && isAuthenticated && !isCryptoInitialized) {
      const stored = sessionStorage.getItem('_ec')
      if (stored) {
        try {
          const { e, p } = JSON.parse(atob(stored))
          initializeKeys(e, p).catch((err) => {
            console.error('Failed to recover crypto keys:', err)
          })
        } catch {
          // Invalid stored data, user will need to re-login
          console.warn('Could not recover encryption keys - please re-login')
        }
      }
    }
  }, [isAuthInitialized, isAuthenticated, isCryptoInitialized, initializeKeys])

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <RouterProvider router={router} />
    </ThemeProvider>
  )
}

export default App
