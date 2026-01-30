import { ReactNode } from 'react'
import { Sidebar } from './Sidebar'
import { ConnectionBanner } from '@/components/error/ConnectionBanner'
import { useBreakpoint } from '@/hooks/useBreakpoint'
import { BottomNav } from '@/components/mobile/BottomNav'
import { cn } from '@/lib/utils'

interface AppShellProps {
  children: ReactNode
}

/**
 * App shell layout component.
 * Provides sidebar, content area, and mobile navigation.
 * Call UI is handled by App.tsx via CallProvider context.
 */
export function AppShell({ children }: AppShellProps) {
  const { isMobile } = useBreakpoint()

  return (
    <>
      <div className="flex flex-col h-screen overflow-hidden">
        {/* Connection banner - pushes content down when visible */}
        <ConnectionBanner />

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar only on desktop/tablet */}
          {!isMobile && <Sidebar />}

          {/* Main content with bottom padding on mobile for nav */}
          <main className={cn(
            "flex-1 overflow-hidden bg-background",
            isMobile && "pb-16"
          )}>
            {children}
          </main>
        </div>
      </div>

      {/* Bottom nav only on mobile */}
      {isMobile && <BottomNav />}
    </>
  )
}
