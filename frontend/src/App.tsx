import { useEffect } from 'react'
import { RouterProvider } from 'react-router'
import { ThemeProvider } from 'next-themes'
import { useAuthStore } from '@/stores/auth'
import { router } from '@/routes'

function App() {
  const checkAuth = useAuthStore((state) => state.checkAuth)

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <RouterProvider router={router} />
    </ThemeProvider>
  )
}

export default App
