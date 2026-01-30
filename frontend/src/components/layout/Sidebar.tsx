import { useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router'
import { ChevronLeft, ChevronRight, LogOut, MessageCircle, Users, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/stores/auth'
import { useCryptoStore } from '@/stores/cryptoStore'
import { usePresenceStore } from '@/stores/presenceStore'
import { AvatarDisplay } from '@/components/avatar/AvatarDisplay'
import { ProfileMenu } from '@/components/profile/ProfileMenu'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/messages', icon: MessageCircle, label: 'Messages' },
  { href: '/contacts', icon: Users, label: 'Contacts' },
]

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const user = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)
  const clearKeys = useCryptoStore((state) => state.clearKeys)
  const myStatus = usePresenceStore((state) => state.myStatus)

  const handleLogout = async () => {
    clearKeys() // Clear crypto keys on logout
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

      {/* Navigation */}
      <nav className="flex-1 p-2 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = location.pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg transition-colors',
                'hover:bg-accent',
                isActive && 'bg-accent',
                collapsed && 'justify-center'
              )}
            >
              <Icon className="h-5 w-5" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          )
        })}
      </nav>

      {/* Bottom controls */}
      <div className="p-3 space-y-1 border-t border-border relative">
        {/* User info - clickable to open profile menu */}
        <button
          onClick={() => setShowProfileMenu(true)}
          className={cn(
            "flex items-center gap-3 p-2 rounded-lg w-full hover:bg-accent transition-colors",
            collapsed && "justify-center"
          )}
          title="Open profile settings"
        >
          <AvatarDisplay
            userId={user?.id ? String(user.id) : ''}
            size="tiny"
            showStatus
            status={myStatus}
          />
          {!collapsed && (
            <div className="flex-1 min-w-0 text-left">
              <p className="text-sm font-medium text-foreground truncate">
                {user?.username || 'User'}
              </p>
            </div>
          )}
        </button>

        {/* Profile menu */}
        <ProfileMenu
          open={showProfileMenu}
          onClose={() => setShowProfileMenu(false)}
          className="bottom-full left-3 mb-2"
        />

        {/* Settings button */}
        <Link
          to="/settings"
          className={cn(
            'flex items-center gap-3 px-3 py-2 rounded-lg transition-colors',
            'hover:bg-accent',
            location.pathname === '/settings' && 'bg-accent',
            collapsed && 'justify-center'
          )}
        >
          <Settings className="h-5 w-5" />
          {!collapsed && <span>Settings</span>}
        </Link>

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
