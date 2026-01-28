import { useEffect, useState } from 'react'

export type Breakpoint = 'mobile' | 'tablet' | 'desktop'

export function useBreakpoint() {
  const [breakpoint, setBreakpoint] = useState<Breakpoint>('mobile')

  useEffect(() => {
    const updateBreakpoint = () => {
      if (window.matchMedia('(min-width: 1024px)').matches) {
        setBreakpoint('desktop')
      } else if (window.matchMedia('(min-width: 768px)').matches) {
        setBreakpoint('tablet')
      } else {
        setBreakpoint('mobile')
      }
    }

    updateBreakpoint()
    window.addEventListener('resize', updateBreakpoint)
    return () => window.removeEventListener('resize', updateBreakpoint)
  }, [])

  return { breakpoint, isMobile: breakpoint === 'mobile' }
}
