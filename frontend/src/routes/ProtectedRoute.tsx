import { Navigate, useLocation } from "react-router"
import { useAuthStore } from "@/stores/auth"

interface ProtectedRouteProps {
  children: React.ReactNode
  requireUsername?: boolean
}

export function ProtectedRoute({ children, requireUsername = true }: ProtectedRouteProps) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const isInitialized = useAuthStore((state) => state.isInitialized)
  const user = useAuthStore((state) => state.user)
  const location = useLocation()

  // Wait for auth check to complete before making decision
  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  // Redirect to username setup if no username and not already there
  if (requireUsername && user && !user.username && location.pathname !== '/setup-username') {
    return <Navigate to="/setup-username" replace />
  }

  return <>{children}</>
}
