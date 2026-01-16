function App() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-8">
      <div className="text-center space-y-6 max-w-md">
        <img src="/logo.svg" alt="Benchwarmer Analytics" className="w-24 h-24 mx-auto" />
        <h1 className="text-4xl font-bold tracking-tight">
          Benchwarmer Analytics
        </h1>
        <p className="text-muted-foreground text-lg">
          A personal research project exploring NHL data and analytics.
        </p>
        <p className="text-muted-foreground text-sm">
          Coming soon.
        </p>
        <div className="pt-8 border-t border-border">
          <p className="text-sm text-muted-foreground">
            Data provided by{' '}
            <a
              href="https://moneypuck.com"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-foreground transition-colors"
            >
              MoneyPuck
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}

export default App
