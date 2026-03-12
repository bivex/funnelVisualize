/**
 * Debug Panel - For development and testing
 * Shows current analytics state and allows manual event triggering
 */

import React, { useState } from 'react'
import { useAnalytics } from '../contexts/AnalyticsContext'
import './DebugPanel.css'

export const DebugPanel: React.FC = () => {
  const { user, activation, metrics, track, sdk } = useAnalytics()
  const [isOpen, setIsOpen] = useState(false)
  const [testEvent, setTestEvent] = useState<keyof import('../types').EventType>('page_view')
  const [eventProps, setEventProps] = useState('{}')

  if (!isOpen) {
    return (
      <button
        className="debug-toggle"
        onClick={() => setIsOpen(true)}
        title="Debug Analytics"
      >
        🐛
      </button>
    )
  }

  const handleTrackEvent = () => {
    try {
      const props = JSON.parse(eventProps || '{}')
      track(testEvent, props)
      alert(`Tracked: ${testEvent}`)
    } catch (e) {
      alert('Invalid JSON in event props')
    }
  }

  const simulateActivation = () => {
    track('first_project_created', { project_name: 'Demo Project' })
    track('first_task_completed', { task_name: 'Setup Tasks' })
    track('onboarding_step_completed', { step: 'complete_onboarding' })
    alert('Simulated activation events')
  }

  const simulateConversion = () => {
    track('subscription_started', {
      plan: 'pro',
      value: 49,
      billing_cycle: 'monthly'
    })
    alert('Simulated conversion event')
  }

  const simulateRetention = () => {
    track('feature_used', { feature: 'analytics_dashboard' })
    track('team_invite_accepted', { invited_by: 'demo-user' })
    track('login', { method: 'email' })
    alert('Simulated retention events')
  }

  return (
    <div className="debug-panel">
      <div className="debug-header">
        <h4>🐛 Analytics Debug</h4>
        <button className="debug-close" onClick={() => setIsOpen(false)}>×</button>
      </div>

      <div className="debug-section">
        <h5>User State</h5>
        <pre className="debug-code">
          {JSON.stringify({
            id: user?.id,
            name: user?.name,
            segment: user?.segment,
            plan: user?.plan,
            activationStatus: user?.activationStatus,
            teamSize: user?.teamSize,
            lastActiveAt: user?.lastActiveAt
          }, null, 2)}
        </pre>
      </div>

      <div className="debug-section">
        <h5>Activation</h5>
        <pre className="debug-code">
          {JSON.stringify({
            isActivated: activation?.isActivated,
            progress: activation?.progress?.toFixed(2),
            completedMilestones: activation?.completedMilestones.map(m => m.name)
          }, null, 2)}
        </pre>
      </div>

      <div className="debug-section">
        <h5>Key Metrics</h5>
        <div className="metrics-grid-small">
          <div className="metric-small">
            <span className="label">Activation Rate</span>
            <span className="value">{(metrics?.activationRate || 0).toPercent()}</span>
          </div>
          <div className="metric-small">
            <span className="label">Conversion</span>
            <span className="value">{(metrics?.conversionRate || 0).toPercent()}</span>
          </div>
          <div className="metric-small">
            <span className="label">Day 7 Retention</span>
            <span className="value">{(metrics?.day7Retention || 0).toPercent()}</span>
          </div>
          <div className="metric-small">
            <span className="label">LTV:CAC</span>
            <span className="value">{(metrics?.ltv / metrics?.cac || 0).toFixed(1)}x</span>
          </div>
        </div>
      </div>

      <div className="debug-section">
        <h5>Simulate Funnel Events</h5>
        <div className="button-group">
          <button className="btn-simulate" onClick={simulateActivation}>
            Simulate Activation
          </button>
          <button className="btn-simulate" onClick={simulateConversion}>
            Simulate Conversion
          </button>
          <button className="btn-simulate" onClick={simulateRetention}>
            Simulate Retention
          </button>
        </div>
      </div>

      <div className="debug-section">
        <h5>Custom Event</h5>
        <div className="form-row">
          <select
            value={testEvent}
            onChange={e => setTestEvent(e.target.value as any)}
            className="debug-select"
          >
            <option value="page_view">page_view</option>
            <option value="signup_completed">signup_completed</option>
            <option value="first_project_created">first_project_created</option>
            <option value="first_task_completed">first_task_completed</option>
            <option value="feature_discovered">feature_discovered</option>
            <option value="pricing_page_view">pricing_page_view</option>
            <option value="upgrade_clicked">upgrade_clicked</option>
            <option value="export_performed">export_performed</option>
            <option value="team_invite_sent">team_invite_sent</option>
          </select>
        </div>
        <div className="form-row">
          <textarea
            value={eventProps}
            onChange={e => setEventProps(e.target.value)}
            placeholder='{"key": "value"}'
            className="debug-textarea"
            rows={3}
          />
        </div>
        <button className="btn-primary" onClick={handleTrackEvent}>
          Track Event
        </button>
      </div>

      <div className="debug-section">
        <h5>Event Queue</h5>
        <p className="debug-note">
          Events will be batched and sent to analytics endpoint.
          Check browser console for detailed logs.
        </p>
        <button
          className="btn-secondary"
          onClick={() => sdk?.flush()}
        >
          Flush Events Now
        </button>
      </div>
    </div>
  )
}

// Extension for Number prototype (for convenience in debug)
declare global {
  interface Number {
    toPercent(): string
  }
}
Number.prototype.toPercent = function() {
  return `${(this * 100).toFixed(1)}%`
}
