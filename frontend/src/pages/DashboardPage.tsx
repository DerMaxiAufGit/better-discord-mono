import { useAuthStore } from "@/stores/auth"
import { AppShell } from "@/components/layout/AppShell"

export function DashboardPage() {
  const user = useAuthStore((state) => state.user)

  return (
    <AppShell>
      <div className="flex flex-col items-center justify-center h-full">
        <h1 className="text-4xl font-bold text-foreground mb-2">
          Welcome to ChatApp
        </h1>
        <p className="text-muted-foreground">
          {user ? `Welcome, ${user.username || user.email}` : 'Select a conversation to get started'}
        </p>
      </div>
    </AppShell>
  )
}
