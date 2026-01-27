import { ThemeProvider } from 'next-themes'
import { AppShell } from './components/layout/AppShell'

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <AppShell>
        <div className="flex flex-col items-center justify-center h-full">
          <h1 className="text-4xl font-bold text-foreground mb-2">
            Welcome to ChatApp
          </h1>
          <p className="text-muted-foreground">
            Select a conversation to get started
          </p>
        </div>
      </AppShell>
    </ThemeProvider>
  )
}

export default App
