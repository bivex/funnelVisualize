import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { AnalyticsProvider } from './contexts/AnalyticsContext'
import type { FunnelSDKConfig } from './types'
import './index.css'

// Analytics SDK configuration
const analyticsConfig: FunnelSDKConfig = {
  debug: true,
  autoTrack: true,
  trackEvents: true,
  enableCohorts: true,
  analytics: {
    apiKey: 'demo-key',
    endpoint: '/api/analytics',
    sampleRate: 1.0,
    batchSize: 10
  }
}

const root = ReactDOM.createRoot(document.getElementById('root')!)
root.render(
  <React.StrictMode>
    <AnalyticsProvider config={analyticsConfig}>
      <App />
    </AnalyticsProvider>
  </React.StrictMode>,
)

export default null
