import { useEffect, useState } from 'react'
import './App.css'

type HealthStatus = {
  status: 'loading' | 'healthy' | 'error'
  message?: string
}

function App() {
  const [health, setHealth] = useState<HealthStatus>({ status: 'loading' })

  useEffect(() => {
    fetch('/api/health')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then(() => setHealth({ status: 'healthy' }))
      .catch((err) => setHealth({ status: 'error', message: err.message }))
  }, [])

  return (
    <div className="app">
      <h1>Benchwarmer Analytics</h1>
      <div className="health-check">
        <h2>API Status</h2>
        {health.status === 'loading' && <p>Checking API connection...</p>}
        {health.status === 'healthy' && (
          <p className="status-healthy">✓ API is healthy</p>
        )}
        {health.status === 'error' && (
          <p className="status-error">✗ API error: {health.message}</p>
        )}
      </div>
    </div>
  )
}

export default App
