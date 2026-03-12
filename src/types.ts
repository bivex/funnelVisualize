export type {
  FunnelStage,
  Funnel,
  FunnelSettings,
  User,
  Company,
  Event,
  ActivationMilestone,
  BehavioralTrigger,
  FunnelMetric,
  Cohort,
  OnboardingStep,
  Trial,
  ExpansionOpportunity
}

// ============== CORE ENTITIES ==============

export interface FunnelStage {
  id: string
  name: string
  value: number
  color?: string
  conversionRate?: number  // auto-calculated or manual
  metadata?: Record<string, unknown>
}

export interface FunnelSettings {
  theme?: 'light' | 'dark' | 'auto'
  showPercentages?: boolean
  showValues?: boolean
  showConversionRates?: boolean
  animationEnabled?: boolean
  layout?: 'vertical' | 'horizontal' | 'centered'
  titleFontSize?: number
  stageFontSize?: number
  highlightDropOff?: boolean
}

export interface Funnel {
  id: string
  name: string
  description?: string
  type: FunnelType
  stages: FunnelStage[]
  settings?: FunnelSettings
  activationEvent?: ActivationEvent
  createdAt?: string
  updatedAt?: string
  metrics?: FunnelMetrics
}

export type FunnelType =
  | 'plg'              // Product-Led Growth
  | 'enterprise'       // Sales-led enterprise
  | 'content'          // Content marketing
  | 'referral'         // Referral/viral
  | 'retention'        // Customer retention
  | 'expansion'        // Upsell/cross-sell
  | 'hybrid'           // Mixed approach

// ============== USER & COMPANY ==============

export interface User {
  id: string
  email: string
  name: string
  companyId?: string
  segment: UserSegment
  activationStatus: 'none' | 'partial' | 'activated' | 'power_user'
  activationMilestones: ActivationMilestone[]
  trialEndsAt?: string
  plan: PlanType
  teamSize: number
  joinedAt: string
  lastActiveAt: string
  behavior: UserBehavior
}

export type UserSegment = 'solopreneur' | 'startup' | 'midmarket' | 'enterprise'
export type PlanType = 'free' | 'starter' | 'pro' | 'team' | 'enterprise'

export interface Company {
  id: string
  name: string
  industry: string
  website?: string
  size: '1-10' | '11-50' | '51-200' | '201-1000' | '1000+'
  segment: UserSegment
  funnels: Funnel[]
  funnelsCount?: number
  createdAt: string
}

// ============== ANALYTICS & EVENTS ==============

export interface Event {
  id: string
  userId: string
  type: EventType
  properties: Record<string, any>
  timestamp: string
  sessionId: string
}

export type EventType =
  // Acquisition
  | 'page_view'
  | 'landing_page_view'
  | 'signup_started'
  | 'signup_completed'

  // Activation
  | 'first_project_created'
  | 'first_task_completed'
  | 'first_invite_sent'
  | 'feature_discovered'
  | 'onboarding_step_completed'

  // Conversion
  | 'trial_started'
  | 'pricing_page_view'
  | 'upgrade_clicked'
  | 'payment_added'
  | 'subscription_started'

  // Retention
  | 'login'
  | 'feature_used'
  | 'team_invite_accepted'
  | 'comment_added'
  | 'export_performed'

  // Expansion
  | 'seat_added'
  | 'upgrade_initiated'
  | 'renewal_scheduled'
  | 'referral_sent'
  | 'referral_converted'

export interface ActivationMilestone {
  id: string
  name: string
  description: string
  eventType: EventType
  reward?: {
    type: 'trial_extension' | 'credits' | 'feature_unlock' | 'discount'
    value: number | string
  }
  completedAt?: string
  isRequired: boolean
}

export interface ActivationEvent {
  name: string
  description: string
  requiredEvents: EventType[]
  timeWindowHours: number  // Must complete within X hours of signup
  targetRate: number  // Target activation rate (0-1)
}

// ============== BEHAVIORAL TRIGGERS ==============

export interface BehavioralTrigger {
  id: string
  name: string
  condition: TriggerCondition
  action: TriggerAction
  isActive: boolean
  cooldownHours: number
  lastFiredAt?: string
}

export type TriggerCondition =
  | { type: 'inactive_days'; days: number }
  | { type: 'usage_threshold'; metric: string; threshold: number }
  | { type: 'feature_missing'; feature: string }
  | { type: 'trial_ending'; daysBefore: number }
  | { type: 'no_expansion'; daysSince: number }
  | { type: 'high_engagement'; sessions: number; days: number }

export type TriggerAction =
  | { type: 'email'; template: string; delayHours?: number }
  | { type: 'in_app_notification'; message: string; cta?: string }
  | { type: 'pricing_nudge'; plan: PlanType; discount?: number }
  | { type: 'feature_tooltip'; feature: string }
  | { type: 'cohort_invite'; campaign: string }

// ============== METRICS & ANALYTICS ==============

export interface FunnelMetrics {
  totalVisitors: number
  totalLeads: number
  activationRate: number  // Lead → Activation
  conversionRate: number  // Trial → Paid
  averageTrialLength: number
  timeToFirstValue: number  // minutes
  day1Retention: number
  day7Retention: number
  day30Retention: number
  churnRate: number
  expansionMRR: number
  ltv: number
  cac: number
}

export interface Cohort {
  id: string
  name: string  // e.g., "Jan 2025 - Organic"
  startDate: string
  segment: UserSegment
  acquisitionChannel: string
  size: number
  metrics: {
    day1Retention: number
    day7Retention: number
    day30Retention: number
    activationRate: number
    conversionRate: number
    expansionRate: number
    ltv: number
  }
}

// ============== ONBOARDING ==============

export interface OnboardingStep {
  id: string
  title: string
  description: string
  action: string
  targetElement?: string
  order: number
  isRequired: boolean
  reward?: {
    type: 'credits' | 'days' | 'feature'
    value: number | string
  }
  completedCount: number
  abandonedCount: number
}

export interface OnboardingFlow {
  id: string
  name: string
  steps: OnboardingStep[]
  targetSegments: UserSegment[]
  estimatedDuration: number  // minutes
  activationRate: number
}

// ============== EXPANSION & REVENUE ==============

export interface Trial {
  id: string
  userId: string
  startedAt: string
  endsAt: string
  plan: PlanType
  isReverseTrial: boolean  // full features trial
  usage: {
    projects: number
    teamSize: number
    exports: number
  }
  conversionPath: ('activated' | 'at_risk' | 'converted' | 'churned')
}

export interface ExpansionOpportunity {
  id: string
  userId: string
  type: 'upsell' | 'cross_sell' | 'team_expansion' | 'renewal'
  currentPlan: PlanType
  recommendedPlan: PlanType
  trigger: string
  expectedValue: number
  priority: 'low' | 'medium' | 'high' | 'critical'
  suggestedTiming: string
}

// ============== API & CONFIG ==============

export interface AnalyticsConfig {
  apiKey: string
  endpoint: string
  sampleRate?: number
  batchSize?: number
  autoTrack?: boolean
}

export interface FunnelSDKConfig {
  debug: boolean
  userId?: string
  companyId?: string
  segment?: UserSegment
  analytics?: AnalyticsConfig
  enableCohorts: boolean
  trackEvents: boolean
}

// SDK instance interface
export interface FunnelSDK {
  // Identity
  identify(userId: string, traits: Record<string, any>): void
  setSegment(segment: UserSegment): void

  // Event tracking
  track(eventType: EventType, properties?: Record<string, any>): void
  trackActivation(milestoneId: string): void
  trackConversion(plan: PlanType, value: number): void

  // Behavioral triggers
  evaluateTriggers(): void
  subscribeTrigger(triggerId: string, callback: () => void): void

  // Onboarding
  getOnboardingFlow(segment: UserSegment): OnboardingFlow
  completeOnboardingStep(stepId: string): void

  // Metrics
  getMetric(metricName: keyof FunnelMetrics): number
  getCohorts(): Cohort[]

  // A/B Testing
  getExperiment(experimentId: string): string
  setExperiment(experimentId: string, variant: string): void

  // Expansion
  getExpansionOpportunities(): ExpansionOpportunity[]
  trackExpansion(opportunityId: string): void
}

// ============== COMPONENT PROPS ==============

export interface FunnelVisualizationProps {
  funnel: Funnel
  onStageClick?: (stage: FunnelStage) => void
  highlightDropOff?: boolean
  showMetrics?: boolean
  animate?: boolean
  compact?: boolean
}

export interface FunnelBuilderProps {
  funnel: Funnel
  onChange: (funnel: Funnel) => void
  editable?: boolean
  showMetrics?: boolean
  onActivationSet?: (activation: ActivationEvent) => void
  onTriggersConfigure?: (triggers: BehavioralTrigger[]) => void
}

export interface DashboardProps {
  company: Company
  users: User[]
  onActivationRateChange?: (rate: number) => void
  onRetentionChange?: (day: number, rate: number) => void
  showCohorts?: boolean
  timeRange?: '7d' | '30d' | '90d'
}
