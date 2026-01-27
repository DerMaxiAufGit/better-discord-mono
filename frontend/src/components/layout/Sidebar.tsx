import { useState } from 'react'
import { useNavigate } from 'react-router'
import { ChevronLeft, ChevronRight, User, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/ThemeToggle'
import { useAuthStore } from '@/stores/auth'
import { cn } from '@/lib/utils'

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div
      className={cn(
        "h-screen bg-card border-r border-border flex flex-col transition-all duration-200",
        collapsed ? "w-16" : "w-60"
      )}
    >
      {/* Header with collapse button */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-border">
        {!collapsed && (
          <h2 className="text-lg font-semibold text-foreground">ChatApp</h2>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className="ml-auto"
        >
          {collapsed ? (
            <ChevronRight className="w-5 h-5" />
          ) : (
            <ChevronLeft className="w-5 h-5" />
          )}
        </Button>
      </div>

      {/* Spacer to push controls to bottom */}
      <div className="flex-1" />

      {/* Bottom controls */}
      <div className="p-3 space-y-2 border-t border-border">
        {/* User avatar */}
        <div
          className={cn(
            "flex items-center gap-3 p-2 rounded-lg hover:bg-accent transition-colors cursor-pointer",
            collapsed && "justify-center"
          )}
        >
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
            <User className="w-5 h-5 text-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {user?.email || 'User'}
              </p>
            </div>
          )}
        </div>

        {/* Theme toggle */}
        <div
          className={cn(
            "flex items-center",
            collapsed ? "justify-center" : "justify-start px-2"
          )}
        >
          <ThemeToggle />
        </div>

        {/* Logout button */}
        <Button
          variant="ghost"
          className={cn(
            "w-full",
            collapsed ? "px-0" : "justify-start"
          )}
          onClick={handleLogout}
        >
          <LogOut className="w-5 h-5" />
          {!collapsed && <span className="ml-2">Logout</span>}
        </Button>
      </div>
    </div>
  )
}
