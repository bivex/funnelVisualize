import { useState, useMemo } from 'react'
import type { Funnel, FunnelStage, FunnelSettings } from '../types'
import './FunnelBuilder.css'

// Built-in samples (manually defined to avoid import.meta.glob issues)
const BUILT_IN_SAMPLES: Record<string, Funnel> = {}

interface FunnelBuilderProps {
  funnel: Funnel
  onChange: (funnel: Funnel) => void
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 9)
}

function createEmptyStage(index: number): FunnelStage {
  return {
    id: generateId(),
    name: `Stage ${index + 1}`,
    value: 0,
  }
}

const DEFAULT_FUNNEL: Funnel = {
  id: generateId(),
  name: 'New Funnel',
  description: '',
  stages: [createEmptyStage(0)],
  settings: {
    theme: 'light',
    showPercentages: true,
    showValues: true,
    animationEnabled: true,
    layout: 'vertical',
    titleFontSize: 24,
    stageFontSize: 14,
  },
}

const COLOR_PRESETS = [
  '#6366F1', '#8B5CF6', '#A855F7', '#D946EF', '#EC4899',
  '#F43F5E', '#F97316', '#EAB308', '#22C55E', '#14B8A6',
  '#06B6D4', '#3B82F6', '#0EA5E9', '#10B981', '#84CC16',
]

export default function FunnelBuilder({ funnel, onChange }: FunnelBuilderProps) {
  const [activeTab, setActiveTab] = useState<'stages' | 'settings' | 'json'>('stages')
  const [jsonError, setJsonError] = useState<string | null>(null)

  const updateField = <K extends keyof Funnel>(field: K, value: Funnel[K]) => {
    onChange({ ...funnel, [field]: value })
  }

  const updateStage = (index: number, field: keyof FunnelStage, value: string | number) => {
    const newStages = [...funnel.stages]
    newStages[index] = { ...newStages[index], [field]: value }
    updateField('stages', newStages)
  }

  const addStage = () => {
    const newStage = createEmptyStage(funnel.stages.length)
    updateField('stages', [...funnel.stages, newStage])
  }

  const removeStage = (index: number) => {
    if (funnel.stages.length <= 1) return
    const newStages = funnel.stages.filter((_, i) => i !== index)
    updateField('stages', newStages)
  }

  const moveStage = (index: number, direction: 'up' | 'down') => {
    const newStages = [...funnel.stages]
    const newIndex = direction === 'up' ? index - 1 : index + 1
    if (newIndex < 0 || newIndex >= newStages.length) return
    ;[newStages[index], newStages[newIndex]] = [newStages[newIndex], newStages[index]]
    updateField('stages', newStages)
  }

  const updateSettings = <K extends keyof FunnelSettings>(field: K, value: FunnelSettings[K]) => {
    updateField('settings', { ...funnel.settings, [field]: value })
  }

  const handleJsonChange = (json: string) => {
    try {
      const parsed = JSON.parse(json)
      setJsonError(null)
      onChange({ ...DEFAULT_FUNNEL, ...parsed, id: funnel.id })
    } catch (e) {
      setJsonError((e as Error).message)
    }
  }

  return (
    <div className="funnel-builder">
      <div className="builder-header">
        <h2>Funnel Builder</h2>
      </div>

      <div className="builder-tabs">
        <button
          className={`tab ${activeTab === 'stages' ? 'active' : ''}`}
          onClick={() => setActiveTab('stages')}
        >
          Stages
        </button>
        <button
          className={`tab ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          Settings
        </button>
        <button
          className={`tab ${activeTab === 'json' ? 'active' : ''}`}
          onClick={() => setActiveTab('json')}
        >
          JSON
        </button>
      </div>

      <div className="builder-content">
        {activeTab === 'stages' && (
          <div className="stages-editor">
            <div className="form-group">
              <label>Funnel Name</label>
              <input
                type="text"
                value={funnel.name}
                onChange={(e) => updateField('name', e.target.value)}
                placeholder="Enter funnel name"
              />
            </div>
            
            <div className="form-group">
              <label>Description</label>
              <input
                type="text"
                value={funnel.description || ''}
                onChange={(e) => updateField('description', e.target.value)}
                placeholder="Optional description"
              />
            </div>

            <div className="stages-list">
              <label>Stages ({funnel.stages.length})</label>
              {funnel.stages.map((stage, index) => (
                <div key={stage.id} className="stage-item">
                  <div className="stage-number">{index + 1}</div>
                  <div className="stage-fields">
                    <input
                      type="text"
                      value={stage.name}
                      onChange={(e) => updateStage(index, 'name', e.target.value)}
                      placeholder="Stage name"
                    />
                    <input
                      type="number"
                      value={stage.value}
                      onChange={(e) => updateStage(index, 'value', parseInt(e.target.value) || 0)}
                      placeholder="Value"
                      min="0"
                    />
                    <div className="color-picker">
                      {COLOR_PRESETS.map((color) => (
                        <button
                          key={color}
                          className={`color-swatch ${stage.color === color ? 'selected' : ''}`}
                          style={{ backgroundColor: color }}
                          onClick={() => updateStage(index, 'color', color)}
                          title={color}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="stage-actions">
                    <button
                      className="btn-icon"
                      onClick={() => moveStage(index, 'up')}
                      disabled={index === 0}
                      title="Move up"
                    >
                      ↑
                    </button>
                    <button
                      className="btn-icon"
                      onClick={() => moveStage(index, 'down')}
                      disabled={index === funnel.stages.length - 1}
                      title="Move down"
                    >
                      ↓
                    </button>
                    <button
                      className="btn-icon btn-danger"
                      onClick={() => removeStage(index)}
                      disabled={funnel.stages.length <= 1}
                      title="Remove"
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <button className="btn-primary" onClick={addStage}>
              + Add Stage
            </button>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="settings-editor">
            <div className="form-group">
              <label>Layout</label>
              <select
                value={funnel.settings?.layout || 'vertical'}
                onChange={(e) => updateSettings('layout', e.target.value as FunnelSettings['layout'])}
              >
                <option value="vertical">Vertical</option>
                <option value="horizontal">Horizontal</option>
                <option value="centered">Centered</option>
              </select>
            </div>

            <div className="form-group">
              <label>Theme</label>
              <select
                value={funnel.settings?.theme || 'light'}
                onChange={(e) => updateSettings('theme', e.target.value as FunnelSettings['theme'])}
              >
                <option value="light">Light</option>
                <option value="dark">Dark</option>
                <option value="auto">Auto</option>
              </select>
            </div>

            <div className="form-group">
              <label>Title Font Size</label>
              <input
                type="number"
                value={funnel.settings?.titleFontSize || 24}
                onChange={(e) => updateSettings('titleFontSize', parseInt(e.target.value) || 24)}
                min="12"
                max="48"
              />
            </div>

            <div className="form-group">
              <label>Stage Font Size</label>
              <input
                type="number"
                value={funnel.settings?.stageFontSize || 14}
                onChange={(e) => updateSettings('stageFontSize', parseInt(e.target.value) || 14)}
                min="10"
                max="24"
              />
            </div>

            <div className="toggle-group">
              <label className="toggle">
                <input
                  type="checkbox"
                  checked={funnel.settings?.showPercentages !== false}
                  onChange={(e) => updateSettings('showPercentages', e.target.checked)}
                />
                <span>Show Percentages</span>
              </label>
              
              <label className="toggle">
                <input
                  type="checkbox"
                  checked={funnel.settings?.showValues !== false}
                  onChange={(e) => updateSettings('showValues', e.target.checked)}
                />
                <span>Show Values</span>
              </label>
              
              <label className="toggle">
                <input
                  type="checkbox"
                  checked={funnel.settings?.animationEnabled !== false}
                  onChange={(e) => updateSettings('animationEnabled', e.target.checked)}
                />
                <span>Enable Animation</span>
              </label>
            </div>
          </div>
        )}

        {activeTab === 'json' && (
          <div className="json-editor">
            <div className="form-group">
              <label>JSON Input</label>
              <textarea
                value={JSON.stringify(funnel, null, 2)}
                onChange={(e) => handleJsonChange(e.target.value)}
                placeholder="Paste JSON here..."
                rows={20}
              />
              {jsonError && <div className="json-error">{jsonError}</div>}
            </div>
            <button
              className="btn-secondary"
              onClick={() => {
                navigator.clipboard.writeText(JSON.stringify(funnel, null, 2))
              }}
            >
              Copy JSON
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
