/**
 * Analytics Dashboard
 * Shows key funnel metrics, activation status, and expansion opportunities
 * Supports both actual performance and planned/projected metrics from funnel strategies
 */

import React, { useMemo } from 'react'
import {
  useAnalytics,
  useActivation,
  useExpansionOpportunities,
  useCohortRetention,
  useMetricsMode,
  usePlannedMetrics,
  useProjectionConfig,
  useDisplayMetrics
} from '../contexts/AnalyticsContext'
import type { FunnelMetrics, ActivationStatus, MetricsMode, DerivedFunnelMetrics, FunnelProjectionConfig } from '../types'
import './AnalyticsDashboard.css'

// Mode toggle component
const MetricsModeToggle: React.FC<{
  mode: MetricsMode
  onChange: (mode: MetricsMode) => void
  disabled?: boolean
}> = ({ mode, onChange, disabled = false }) => {
  const modes: { value: MetricsMode; label: string }[] = [
    { value: 'actual', label: 'Actual' },
    { value: 'planned', label: 'Planned' },
    { value: 'both', label: 'Both' }
  ]

  return (
    <div className="mode-toggle" role="tablist" aria-label="Metrics mode">
      {modes.map(m => (
        <button
          key={m.value}
          role="tab"
          aria-selected={mode === m.value}
          className={`mode-btn ${mode === m.value ? 'active' : ''}`}
          onClick={() => onChange(m.value)}
          disabled={disabled}
        >
          {m.label}
        </button>
      ))}
    </div>
  )
}

// Projection config panel
const ProjectionConfig: React.FC<{
  config: FunnelProjectionConfig
  onChange: (updates: Partial<FunnelProjectionConfig>) => void
}> = ({ config, onChange }) => {
  return (
    <div className="projection-config">
      <h4>Projection Assumptions</h4>
      <div className="config-grid">
        <label>
          Avg Order Value ($)
          <input
            type="number"
            value={config.averageOrderValue}
            onChange={e => onChange({ averageOrderValue: Number(e.target.value) })}
          />
        </label>
        <label>
          Customer Lifespan (mo)
          <input
            type="number"
            value={config.customerLifespanMonths}
            onChange={e => onChange({ customerLifespanMonths: Number(e.target.value) })}
          />
        </label>
        <label>
          Gross Margin (%)
          <input
            type="number"
            step="0.01"
            min="0"
            max="1"
            value={config.grossMargin}
            onChange={e => onChange({ grossMargin: Number(e.target.value) })}
          />
        </label>
        <label>
          Monthly Churn (%)
          <input
            type="number"
            step="0.001"
            min="0"
            max="1"
            value={config.monthlyChurnRate}
            onChange={e => onChange({ monthlyChurnRate: Number(e.target.value) })}
          />
        </label>
        <label>
          CAC per Lead ($)
          <input
            type="number"
            value={config.cacPerLead}
            onChange={e => onChange({ cacPerLead: Number(e.target.value) })}
          />
        </label>
      </div>
    </div>
  )
}

// Stage conversion breakdown
const StageConversionTable: React.FC<{ stages: DerivedFunnelMetrics['stageConversions'] }> = ({ stages }) => {
  return (
    <div className="stage-breakdown">
      <h4>Stage Conversion Analysis</h4>
      <table className="conversion-table">
        <thead>
          <tr>
            <th>Stage</th>
            <th>Value</th>
            <th>To Next (%)</th>
            <th>Cumulative (%)</th>
            <th>Bar</th>
          </tr>
        </thead>
        <tbody>
          {stages.map((sc, idx) => (
            <tr key={idx}>
              <td>{sc.stageName}</td>
              <td>{sc.stageValue.toLocaleString()}</td>
              <td>{sc.conversionRate.toFixed(1)}%</td>
              <td>{sc.cumulativeRate.toFixed(1)}%</td>
              <td>
                <div className="conversion-bar">
                  <div
                    className="fill"
                    style={{ width: `${sc.cumulativeRate}%` }}
                  />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export const AnalyticsDashboard: React.FC<{
  compact?: boolean
  showCohorts?: boolean
  timeRange?: '7d' | '30d' | '90d'
}> = ({ compact = false, showCohorts = true, timeRange = '30d' }) => {
  const { metrics, cohorts, isReady, selectedFunnel, setSelectedFunnel } = useAnalytics()
  const activation = useActivation()
  const opportunities = useExpansionOpportunities()
  const retentionCurve = useCohortRetention()

  // Funnel planning hooks
  const { mode, setMode } = useMetricsMode()
  const plannedMetrics = usePlannedMetrics()
  const { config: projectionConfig, update: updateProjectionConfig } = useProjectionConfig()
  const displayMetrics = useDisplayMetrics()

  if (!isReady || !metrics) {
    return <div className="dashboard-loading">Loading analytics...</div>
  }

  if (compact) {
    return (
      <div className="dashboard-compact">
        <div className="metric-row">
          <MetricCard label="Activation" value={metrics.activationRate} format="percent" color="accent" />
          <MetricCard label="Conversion" value={metrics.conversionRate} format="percent" color="success" />
          <MetricCard label="Day 7 Retention" value={metrics.day7Retention} format="percent" color="info" />
          <MetricCard label="LTV:CAC" value={metrics.ltv / metrics.cac} format="ratio" precision={1} />
        </div>
        {activation && !activation.isActivated && (
          <div className="activation-banner">
            <span>🚀 Complete onboarding to unlock full features!</span>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${activation.progress * 100}%` }} />
            </div>
            <span className="progress-text">{Math.round(activation.progress * 100)}% complete</span>
          </div>
        )}
      </div>
    )
  }

  if (!isReady || !metrics) {
    return <div className="dashboard-loading">Loading analytics...</div>
  }

  if (compact) {
    return (
      <div className="dashboard-compact">
        <div className="metric-row">
          <MetricCard label="Activation" value={metrics.activationRate} format="percent" color="accent" />
          <MetricCard label="Conversion" value={metrics.conversionRate} format="percent" color="success" />
          <MetricCard label="Day 7 Retention" value={metrics.day7Retention} format="percent" color="info" />
          <MetricCard label="LTV:CAC" value={metrics.ltv / metrics.cac} format="ratio" precision={1} />
        </div>
        {activation && !activation.isActivated && (
          <div className="activation-banner">
            <span>🚀 Complete onboarding to unlock full features!</span>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${activation.progress * 100}%` }} />
            </div>
            <span className="progress-text">{Math.round(activation.progress * 100)}% complete</span>
          </div>
        )}
      </div>
    )
  }

  // Build header with mode toggle
  const renderHeader = () => (
    <div className="dashboard-header">
      <h2>Funnel Analytics</h2>
      <MetricsModeToggle mode={mode} onChange={setMode} />
    </div>
  )

  // Render planned metrics section
  const renderPlannedMetrics = () => {
    if (!plannedMetrics) return null

    return (
      <section className="planned-metrics">
        <h3>Projected Metrics (Based on Funnel Strategy)</h3>
        <div className="metric-cards planned">
          <MetricCard
            label="Overall Funnel Conversion"
            value={plannedMetrics.overallConversionRate / 100}
            format="percent"
            precision={1}
            hint="First to last stage conversion"
          />
          <MetricCard
            label="Avg Stage Conversion"
            value={plannedMetrics.averageStageConversionRate / 100}
            format="percent"
            precision={1}
          />
          <MetricCard
            label="Projected Customers"
            value={plannedMetrics.projectedCustomersAcquired}
            format="number"
            precision={0}
          />
          <MetricCard
            label="Projected Monthly Revenue"
            value={plannedMetrics.projectedMonthlyRevenue}
            format="currency"
            isGood={plannedMetrics.projectedLTVCACRatio >= 3}
          />
          <MetricCard
            label="Projected LTV"
            value={plannedMetrics.projectedLTV}
            format="currency"
          />
          <MetricCard
            label="Projected CAC"
            value={plannedMetrics.projectedCAC}
            format="currency"
          />
          <MetricCard
            label="LTV:CAC Ratio"
            value={plannedMetrics.projectedLTVCACRatio}
            format="ratio"
            precision={1}
            isGood={plannedMetrics.projectedLTVCACRatio >= 3}
          />
        </div>

        {/* Stage conversion breakdown */}
        {plannedMetrics.stageConversions.length > 0 && (
          <StageConversionTable stages={plannedMetrics.stageConversions} />
        )}

        {/* Projection config */}
        <ProjectionConfig config={projectionConfig} onChange={updateProjectionConfig} />
      </section>
    )
  }

  // Render no funnel selected message for planned mode
  const renderNoFunnelMessage = () => (
    <div className="no-funnel-selected">
      <h3>Select a Marketing Strategy</h3>
      <p>Choose a funnel strategy from the Funnels section to see projected metrics</p>
      <button className="btn-primary" onClick={() => setSelectedFunnel(null)}>
        Browse Strategies
      </button>
    </div>
  )

  return (
    <div className="analytics-dashboard">
      {renderHeader()}

      {/* Show message if in planned mode but no funnel selected */}
      {(mode === 'planned' || mode === 'both') && !selectedFunnel && (
        renderNoFunnelMessage()
      )}

      {/* Actual metrics (show in 'actual' or 'both' mode when funnel not required) */}
      {(mode === 'actual' || mode === 'both') && (
        <>
          {/* Key Metrics Grid */}
          <section className="metrics-grid">
            <h3>Key Metrics {mode === 'both' && <span className="mode-badge">Actual</span>}</h3>
            <div className="metric-cards">
              <MetricCard
                label="Total Visitors"
                value={metrics.totalVisitors}
                format="number"
                change={+12.5}
                hint="Last 30 days"
              />
              <MetricCard
                label="Signups"
                value={metrics.totalLeads}
                format="number"
                change={+8.2}
                hint="New users"
              />
              <MetricCard
                label="Activation Rate"
                value={metrics.activationRate}
                format="percent"
                precision={1}
                change={+5.3}
                hint="Users who completed activation"
                target={0.65}
              />
              <MetricCard
                label="Trial → Paid"
                value={metrics.conversionRate}
                format="percent"
                precision={1}
                change={+2.1}
                hint="Conversion rate"
                target={0.18}
              />
              <MetricCard
                label="Day 7 Retention"
                value={metrics.day7Retention}
                format="percent"
                precision={1}
                change={+3.7}
                hint="Users still active after 7 days"
                target={0.5}
              />
              <MetricCard
                label="Day 30 Retention"
                value={metrics.day30Retention}
                format="percent"
                precision={1}
                change={+1.2}
                hint="Long-term retention"
                target={0.35}
              />
              <MetricCard
                label="Avg Time to Value"
                value={metrics.timeToFirstValue}
                format="minutes"
                precision={0}
                change={-15}
                hint="First value moment"
                target={180}
              />
              <MetricCard
                label="LTV:CAC"
                value={metrics.ltv / metrics.cac}
                format="ratio"
                precision={1}
                change={+0.5}
                hint="Unit economics"
                target={4}
                isGood={metrics.ltv / metrics.cac >= 4}
              />
            </div>
          </section>

          {/* Activation Status */}
          {mode !== 'both' && (
            <section className="activation-section">
              <h3>Activation Status</h3>
              <div className="activation-card">
                <div className="activation-header">
                  <h4>Current Activation Progress</h4>
                  <span className={`activation-badge ${activation?.isActivated ? 'activated' : 'in-progress'}`}>
                    {activation?.isActivated ? '✅ Activated' : '⏳ In Progress'}
                  </span>
                </div>

                {activation && (
                  <>
                    <div className="activation-progress">
                      <div className="progress-bar-large">
                        <div
                          className="progress-fill"
                          style={{ width: `${activation.progress * 100}%` }}
                        />
                      </div>
                      <span className="progress-percentage">{Math.round(activation.progress * 100)}%</span>
                    </div>

                    {activation.completedMilestones.length > 0 && (
                      <div className="milestones-completed">
                        <h5>Completed Milestones</h5>
                        <ul>
                          {activation.completedMilestones.map(m => (
                            <li key={m.id} className="milestone-item">
                              <span className="milestone-icon">✓</span>
                              <span className="milestone-name">{m.name}</span>
                              {m.reward && (
                                <span className="milestone-reward">+{m.reward.value} {m.reward.type}</span>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="activation-time">
                      {activation.isActivated ? (
                        <p className="text-success">User activated! 🎉</p>
                      ) : (
                        <p>
                          <strong>Time to activation:</strong>{' '}
                          {timeToActivation()}
                        </p>
                      )}
                    </div>
                  </>
                )}
              </div>
            </section>
          )}

          {/* Expansion Opportunities */}
          {opportunities.length > 0 && (
            <section className="opportunities-section">
              <h3>Expansion Opportunities</h3>
              <div className="opportunities-list">
                {opportunities.slice(0, 5).map(opp => (
                  <div key={opp.id} className={`opportunity-card priority-${opp.priority}`}>
                    <div className="opportunity-header">
                      <span className={`priority-badge ${opp.priority}`}>
                        {opp.priority.toUpperCase()}
                      </span>
                      <span className="opportunity-type">{opp.type.replace('_', ' ')}</span>
                    </div>
                    <h4>Upgrade to {opp.recommendedPlan}</h4>
                    <p className="opportunity-trigger">Trigger: {opp.trigger}</p>
                    <div className="opportunity-value">
                      Expected value: <strong>${opp.expectedValue}/mo</strong>
                    </div>
                    <p className="opportunity-timing">{opp.suggestedTiming}</p>
                    <button className="btn-action">Activate Campaign</button>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Cohort Retention Chart */}
          {showCohorts && cohorts.length > 0 && (
            <section className="cohorts-section">
              <h3>Cohort Retention</h3>
              <div className="cohort-chart">
                <RetentionChart data={retentionCurve} />
              </div>
              <div className="cohort-table">
                <table>
                  <thead>
                    <tr>
                      <th>Cohort</th>
                      <th>Size</th>
                      <th>Day 1</th>
                      <th>Day 7</th>
                      <th>Day 30</th>
                      <th>Activation</th>
                      <th>Conversion</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cohorts.slice(0, 5).map(cohort => (
                      <tr key={cohort.id}>
                        <td>{cohort.name}</td>
                        <td>{cohort.size}</td>
                        <td>{formatPercent(cohort.metrics.day1Retention)}</td>
                        <td>{formatPercent(cohort.metrics.day7Retention)}</td>
                        <td>{formatPercent(cohort.metrics.day30Retention)}</td>
                        <td>{formatPercent(cohort.metrics.activationRate)}</td>
                        <td>{formatPercent(cohort.metrics.conversionRate)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* Health Score */}
          <section className="health-section">
            <h3>Funnel Health Score</h3>
            <div className="health-score">
              <div className="score-ring">
                <svg viewBox="0 0 36 36" className="circular-chart">
                  <path
                    className="circle-bg"
                    d="M18 2.0845
                      a 15.9155 15.9155 0 0 1 0 31.831
                      a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className="circle"
                    strokeDasharray={`${calculateHealthScore(metrics) * 100}, 100`}
                    d="M18 2.0845
                      a 15.9155 15.9155 0 0 1 0 31.831
                      a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <text x="18" y="20.35" className="percentage">{Math.round(calculateHealthScore(metrics) * 100)}%</text>
                </svg>
              </div>
              <div className="health-breakdown">
                <div className="health-item">
                  <span className="label">Activation</span>
                  <div className="health-bar">
                    <div className="fill" style={{ width: `${metrics.activationRate * 100}%` }} />
                  </div>
                  <span className="value">{formatPercent(metrics.activationRate)}</span>
                </div>
                <div className="health-item">
                  <span className="label">Retention</span>
                  <div className="health-bar">
                    <div className="fill" style={{ width: `${metrics.day7Retention * 100}%` }} />
                  </div>
                  <span className="value">{formatPercent(metrics.day7Retention)}</span>
                </div>
                <div className="health-item">
                  <span className="label">Conversion</span>
                  <div className="health-bar">
                    <div className="fill" style={{ width: `${metrics.conversionRate * 100}%` }} />
                  </div>
                  <span className="value">{formatPercent(metrics.conversionRate)}</span>
                </div>
                <div className="health-item">
                  <span className="label">Unit Economics</span>
                  <div className="health-bar">
                    <div className="fill" style={{ width: `${Math.min(1, metrics.ltv / metrics.cac / 6) * 100}%` }} />
                  </div>
                  <span className="value">{formatRatio(metrics.ltv / metrics.cac)}</span>
                </div>
              </div>
            </div>
          </section>
        </>
      )}

      {/* Planned metrics section */}
      {(mode === 'planned' || mode === 'both') && selectedFunnel && (
        renderPlannedMetrics()
      )}
    </div>
  )
}

export default AnalyticsDashboard

// ============== SUB-COMPONENTS ==============

interface MetricCardProps {
  label: string
  value: number
  format: 'number' | 'percent' | 'minutes' | 'ratio' | 'currency'
  precision?: number
  change?: number
  hint?: string
  target?: number
  isGood?: boolean
}

const MetricCard: React.FC<MetricCardProps> = ({
  label, value, format, precision = 1, change, hint, target, isGood
}) => {
  const formatted = formatValue(value, format, precision)
  const changeClass = change > 0 ? 'positive' : change < 0 ? 'negative' : ''

  return (
    <div className="metric-card">
      <div className="metric-header">
        <span className="metric-label">{label}</span>
        {hint && <span className="metric-hint" title={hint}>?</span>}
      </div>
      <div className="metric-value">{formatted}</div>
      {change !== undefined && (
        <div className={`metric-change ${changeClass}`}>
          {change > 0 ? '↑' : '↓'} {Math.abs(change)}%
        </div>
      )}
      {target !== undefined && (
        <div className="metric-target">
          Target: {formatValue(target, format, precision)}
        </div>
      )}
      {isGood !== undefined && (
        <div className={`metric-status ${isGood ? 'good' : 'warning'}`}>
          {isGood ? '✓ On Track' : '⚠ Needs Work'}
        </div>
      )}
    </div>
  )
}

const formatValue = (value: number, format: string, precision: number): string => {
  switch (format) {
    case 'percent':
      return `${(value * 100).toFixed(precision)}%`
    case 'minutes':
      const hrs = Math.floor(value / 60)
      const mins = Math.round(value % 60)
      return hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`
    case 'ratio':
      return `${value.toFixed(precision)}x`
    case 'currency':
      return `$${value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
    default:
      return value.toLocaleString()
  }
}

const formatPercent = (value: number): string => `${(value * 100).toFixed(1)}%`
const formatRatio = (value: number): string => `${value.toFixed(1)}x`

const calculateHealthScore = (metrics: FunnelMetrics): number => {
  // Weighted health score
  const weights = {
    activationRate: 0.25,
    conversionRate: 0.20,
    day7Retention: 0.25,
    expansionMRR: 0.15,
    ltv: 0.15
  }

  const normalized = {
    activationRate: Math.min(metrics.activationRate / 0.65, 1),
    conversionRate: Math.min(metrics.conversionRate / 0.18, 1),
    day7Retention: Math.min(metrics.day7Retention / 0.5, 1),
    expansionMRR: Math.min(metrics.expansionMRR / 10000, 1),
    ltv: Math.min(metrics.ltv / 1000, 1)
  }

  let score = 0
  for (const [key, weight] of Object.entries(weights)) {
    score += (normalized[key as keyof typeof normalized] || 0) * (weight as number)
  }

  return score
}

const RetentionChart: React.FC<{ data: { day: number; retention: number }[] }> = ({ data }) => {
  const maxDay = 30
  const width = 600
  const height = 200
  const padding = { top: 20, right: 20, bottom: 40, left: 50 }

  const xScale = (day: number) => padding.left + (day / maxDay) * (width - padding.left - padding.right)
  const yScale = (ret: number) => padding.top + (1 - ret) * (height - padding.top - padding.bottom)

  // Generate smooth curve path
  const points = data
    .filter(d => d.day <= maxDay)
    .map(d => `${xScale(d.day)},${yScale(d.retention)}`)
    .join(' ')

  const areaPoints = `${padding.left},${height - padding.bottom} ${points} ${width - padding.right},${height - padding.bottom}`

  const ticks = [0, 0.25, 0.5, 0.75, 1]

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="retention-chart">
      {/* Grid lines */}
      {ticks.map(t => (
        <line
          key={t}
          x1={padding.left}
          y1={yScale(t)}
          x2={width - padding.right}
          y2={yScale(t)}
          stroke="var(--border-color)"
          strokeDasharray="3,3"
        />
      ))}

      {/* Y-axis labels */}
      {ticks.map(t => (
        <text
          key={t}
          x={padding.left - 10}
          y={yScale(t) + 4}
          textAnchor="end"
          fontSize="11"
          fill="var(--text-muted)"
        >
          {Math.round(t * 100)}%
        </text>
      ))}

      {/* X-axis labels */}
      {[0, 7, 14, 21, 30].map(day => (
        <text
          key={day}
          x={xScale(day)}
          y={height - padding.bottom + 20}
          textAnchor="middle"
          fontSize="11"
          fill="var(--text-muted)"
        >
          Day {day}
        </text>
      ))}

      {/* Area under curve */}
      <polygon points={areaPoints} fill="var(--accent)" fillOpacity="0.1" />

      {/* Line */}
      <polyline
        points={points}
        fill="none"
        stroke="var(--accent)"
        strokeWidth="2"
      />

      {/* Data points */}
      {data.filter(d => d.day <= maxDay && (d.day === 0 || d.day % 7 === 0)).map(d => (
        <circle
          key={d.day}
          cx={xScale(d.day)}
          cy={yScale(d.retention)}
          r="4"
          fill="var(--accent)"
          stroke="var(--bg-primary)"
          strokeWidth="2"
        />
      ))}
    </svg>
  )
}

const timeToActivation = () => {
  // Mock implementation - in production get from SDK
  return <span className="time-value">~4.2 hours</span>
}
