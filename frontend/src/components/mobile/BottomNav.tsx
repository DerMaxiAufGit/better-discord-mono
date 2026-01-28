import { Link, useLocation } from 'react-router'
import { MessageCircle, Users, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/messages', icon: MessageCircle, label: 'Messages' },
  { href: '/contacts', icon: Users, label: 'Contacts' },
  { href: '/settings', icon: Settings, label: 'Settings' },
]

export function BottomNav() {
  const location = useLocation()

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border md:hidden z-50">
      <div className="flex justify-around py-2 pb-4">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = location.pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                'flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-colors',
                'hover:bg-accent',
                isActive && 'text-primary'
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-xs">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
