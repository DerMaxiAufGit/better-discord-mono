import { ThemeProvider } from 'next-themes'
import { ThemeToggle } from './components/ThemeToggle'

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <div className="min-h-screen flex flex-col items-center justify-center gap-6">
        <h1 className="text-4xl font-bold">Hello World</h1>
        <ThemeToggle />
        <p className="text-sm text-muted-foreground">
          Click the icon to toggle theme
        </p>
      </div>
    </ThemeProvider>
  )
}

export default App
