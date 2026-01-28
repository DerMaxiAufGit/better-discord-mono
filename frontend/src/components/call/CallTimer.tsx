import { useState, useEffect } from 'react'

interface CallTimerProps {
  startTime: Date | null
  className?: string
}

/**
 * Display elapsed call time.
 * Format: MM:SS or HH:MM:SS if over an hour.
 * Updates every second.
 */
export function CallTimer({ startTime, className = '' }: CallTimerProps) {
  const [elapsed, setElapsed] = useState('')

  useEffect(() => {
    if (!startTime) {
      setElapsed('00:00')
      return
    }

    // Update immediately
    const updateElapsed = () => {
      const now = new Date()
      const diffMs = now.getTime() - startTime.getTime()
      const diffSeconds = Math.floor(diffMs / 1000)

      const hours = Math.floor(diffSeconds / 3600)
      const minutes = Math.floor((diffSeconds % 3600) / 60)
      const seconds = diffSeconds % 60

      if (hours > 0) {
        setElapsed(
          `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
        )
      } else {
        setElapsed(`${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`)
      }
    }

    updateElapsed()
    const interval = setInterval(updateElapsed, 1000)

    return () => clearInterval(interval)
  }, [startTime])

  return (
    <span className={`font-mono text-sm text-muted-foreground ${className}`}>
      {elapsed}
    </span>
  )
}
