import { useEffect } from 'react'
import { RouterProvider } from 'react-router'
import { ThemeProvider } from 'next-themes'
import { useAuthStore } from '@/stores/auth'
import { useCryptoStore } from '@/stores/cryptoStore'
import { router } from '@/routes'

function App() {
  const checkAuth = useAuthStore((state) => state.checkAuth)
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const user = useAuthStore((state) => state.user)
  const initializeKeys = useCryptoStore((state) => state.initializeKeys)

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  // Initialize encryption keys after successful authentication
  useEffect(() => {
    if (isAuthenticated && user) {
      initializeKeys(String(user.id)).catch((e) => {
        console.error('Failed to initialize encryption keys:', e)
      })
    }
  }, [isAuthenticated, user, initializeKeys])

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <RouterProvider router={router} />
    </ThemeProvider>
  )
}

export default App
