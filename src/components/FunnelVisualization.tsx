import type { Funnel, FunnelStage } from '../types'
import './FunnelVisualization.css'

interface FunnelVisualizationProps {
  funnel: Funnel
}

const DEFAULT_COLORS = [
  '#6366F1',
  '#8B5CF6',
  '#A855F7',
  '#D946EF',
  '#EC4899',
  '#F43F5E',
  '#F97316',
  '#EAB308',
  '#22C55E',
  '#14B8A6',
]

function calculatePercentages(stages: FunnelStage[]): number[] {
  if (stages.length === 0) return []
  const maxValue = stages[0].value
  return stages.map(stage => (maxValue > 0 ? (stage.value / maxValue) * 100 : 0))
}

function formatValue(value: number): string {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`
  return value.toLocaleString()
}

export default function FunnelVisualization({ funnel }: FunnelVisualizationProps) {
  const { stages, settings = {} } = funnel
  const {
    showPercentages = true,
    showValues = true,
    animationEnabled = true,
    layout = 'vertical',
    titleFontSize = 24,
    stageFontSize = 14,
  } = settings

  const percentages = calculatePercentages(stages)
  const maxPercentage = Math.max(...percentages, 100)

  const renderStage = (stage: FunnelStage, index: number) => {
    const percentage = percentages[index]
    const dropOff = index > 0 
      ? (((stages[index - 1].value - stage.value) / stages[index - 1].value) * 100).toFixed(1)
      : null
    const color = stage.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length]
    
    return (
      <div
        key={stage.id}
        className={`funnel-stage ${animationEnabled ? 'animated' : ''}`}
        style={{
          '--stage-width': `${(percentage / maxPercentage) * 100}%`,
          '--stage-color': color,
          '--stage-index': index,
        } as React.CSSProperties}
      >
        <div className="stage-bar-container">
          <div 
            className="stage-bar"
            style={{ 
              width: layout === 'horizontal' ? `${percentage}%` : '100%',
              height: layout === 'horizontal' ? '100%' : `${percentage}%`,
              minHeight: layout === 'horizontal' ? '100px' : undefined,
            }}
          >
            <div className={`stage-content ${layout === 'horizontal' ? 'horizontal' : ''}`}>
              <span className="stage-name" style={{ fontSize: `${stageFontSize}px` }}>
                {stage.name}
              </span>
              <div className="stage-stats">
                {showValues && (
                  <span className="stage-value">{formatValue(stage.value)}</span>
                )}
                {showPercentages && (
                  <span className="stage-percentage">{percentage.toFixed(1)}%</span>
                )}
              </div>
            </div>
          </div>
        </div>
        
        {dropOff && parseFloat(dropOff) > 0 && (
          <div className="drop-off-indicator">
            ↓ {dropOff}%
          </div>
        )}
      </div>
    )
  }

  if (layout === 'horizontal') {
    return (
      <div className={`funnel-container funnel-${layout}`}>
        <h1 
          className="funnel-title"
          style={{ fontSize: `${titleFontSize}px` }}
        >
          {funnel.name}
        </h1>
        
        {funnel.description && (
          <p className="funnel-description">{funnel.description}</p>
        )}
        
        <div className="funnel-stages horizontal">
          {stages.map((stage, index) => (
            <div key={stage.id} className="horizontal-stage-wrapper">
              {renderStage(stage, index)}
              {index < stages.length - 1 && (
                <div className="stage-connector">→</div>
              )}
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className={`funnel-container funnel-${layout}`}>
      <h1 
        className="funnel-title"
        style={{ fontSize: `${titleFontSize}px` }}
      >
        {funnel.name}
      </h1>
      
      {funnel.description && (
        <p className="funnel-description">{funnel.description}</p>
      )}
      
      <div className="funnel-stages">
        {stages.map((stage, index) => renderStage(stage, index))}
      </div>
    </div>
  )
}
