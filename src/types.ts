export type { FunnelStage, Funnel, FunnelSettings }

export interface FunnelStage {
  id: string
  name: string
  value: number
  color?: string
  metadata?: Record<string, unknown>
}

export interface FunnelSettings {
  theme?: 'light' | 'dark' | 'auto'
  showPercentages?: boolean
  showValues?: boolean
  animationEnabled?: boolean
  layout?: 'vertical' | 'horizontal' | 'centered'
  titleFontSize?: number
  stageFontSize?: number
}

export interface Funnel {
  id: string
  name: string
  description?: string
  stages: FunnelStage[]
  settings?: FunnelSettings
  createdAt?: string
  updatedAt?: string
}
