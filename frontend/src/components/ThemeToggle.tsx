import { useTheme } from 'next-themes'
import { Sun, Moon } from 'lucide-react'
import { useEffect, useState } from 'react'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <button
        className="relative w-10 h-10 rounded-lg border border-border bg-background hover:bg-accent transition-colors flex items-center justify-center"
        aria-label="Toggle theme"
      >
        <div className="w-5 h-5" />
      </button>
    )
  }

  return (
    <button
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className="relative w-10 h-10 rounded-lg border border-border bg-background hover:bg-accent transition-colors flex items-center justify-center group"
      aria-label="Toggle theme"
    >
      {theme === 'dark' ? (
        <Sun className="w-5 h-5 text-foreground transition-transform group-hover:rotate-45" />
      ) : (
        <Moon className="w-5 h-5 text-foreground transition-transform group-hover:-rotate-12" />
      )}
    </button>
  )
}
