/**
 * Analytics Context
 * React context for funnel analytics SDK and funnel planning projections
 */

import React, { createContext, useContext, useEffect, useState, useMemo, ReactNode, useCallback } from 'react'
import { FunnelSDK, initFunnelSDK, getFunnelSDK, FunnelSDKConfig } from '../sdk/AnalyticsSDK'
import { FunnelMetricsCalculator } from '../services/FunnelMetricsCalculator'
import type {
  User,
  ActivationStatus,
  BehavioralTrigger,
  OnboardingFlow,
  ExpansionOpportunity,
  Cohort,
  FunnelMetrics,
  EventType,
  UserSegment,
  Funnel,
  FunnelProjectionConfig,
  DerivedFunnelMetrics,
  MetricsMode,
  MarketingFunnel
} from '../types'

interface AnalyticsContextValue {
  sdk: FunnelSDK | null
  user: User | null
  activation: ActivationStatus | null
  metrics: FunnelMetrics | null
  cohorts: Cohort[]
  opportunities: ExpansionOpportunity[]
  isReady: boolean
  identify: (userId: string, traits: Record<string, any>) => void
  track: (event: EventType, properties?: Record<string, any>) => void
  setSegment: (segment: UserSegment) => void
  completeOnboardingStep: (stepId: string) => void

  // Funnel planning
  mode: MetricsMode
  setMode: (mode: MetricsMode) => void
  selectedFunnel: Funnel | null
  setSelectedFunnel: (funnel: Funnel | null) => void
  plannedMetrics: DerivedFunnelMetrics | null
  projectionConfig: FunnelProjectionConfig
  updateProjectionConfig: (config: Partial<FunnelProjectionConfig>) => void
  getDisplayMetrics: () => (FunnelMetrics & Partial<DerivedFunnelMetrics>) | null
}

const AnalyticsContext = createContext<AnalyticsContextValue | null>(null)

export const useAnalytics = (): AnalyticsContextValue => {
  const context = useContext(AnalyticsContext)
  if (!context) {
    throw new Error('useAnalytics must be used within AnalyticsProvider')
  }
  return context
}

interface AnalyticsProviderProps {
  children: ReactNode
  config: FunnelSDKConfig
  userId?: string
  initialTraits?: Record<string, any>
}

export const AnalyticsProvider: React.FC<AnalyticsProviderProps> = ({
  children,
  config,
  userId,
  initialTraits = {}
}) => {
  const [sdk, setSdk] = useState<FunnelSDK | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [activation, setActivation] = useState<ActivationStatus | null>(null)
  const [metrics, setMetrics] = useState<FunnelMetrics | null>(null)
  const [cohorts, setCohorts] = useState<Cohort[]>([])
  const [opportunities, setOpportunities] = useState<ExpansionOpportunity[]>([])
  const [isReady, setIsReady] = useState(false)

  // Funnel planning state
  const [mode, setMode] = useState<MetricsMode>('actual')
  const [selectedFunnel, setSelectedFunnel] = useState<Funnel | null>(null)
  const [plannedMetrics, setPlannedMetrics] = useState<DerivedFunnelMetrics | null>(null)
  const [projectionConfig, setProjectionConfig] = useState<FunnelProjectionConfig>({
    averageOrderValue: 49,
    customerLifespanMonths: 24,
    grossMargin: 0.70,
    monthlyChurnRate: 0.05,
    expansionRate: 0.02,
    cacPerLead: 150
  })

  // Initialize calculator with config
  const calculator = useMemo(() =>
    new FunnelMetricsCalculator(projectionConfig),
    [projectionConfig]
  )

  // Calculate planned metrics when funnel or config changes
  useEffect(() => {
    if (selectedFunnel) {
      const derived = calculator.calculateFromFunnel(selectedFunnel)
      setPlannedMetrics(derived)
    } else {
      setPlannedMetrics(null)
    }
  }, [selectedFunnel, calculator])

  // Update projection config
  const updateProjectionConfig = useCallback((updates: Partial<FunnelProjectionConfig>) => {
    setProjectionConfig(prev => ({ ...prev, ...updates }))
  }, [])

  // Initialize SDK
  useEffect(() => {
    const sdkInstance = initFunnelSDK(config) as FunnelSDKImpl
    setSdk(sdkInstance)

    // Auto-identify if userId provided
    if (userId) {
      sdkInstance.identify(userId, initialTraits)
    }

    setIsReady(true)
  }, [config])

  // Load user data when SDK ready
  useEffect(() => {
    if (!sdk) return

    const sdkInstance = sdk as FunnelSDKImpl
    const loadUserData = async () => {
      const currentUserId = sdkInstance.getUserId()
      if (currentUserId) {
        // In production, fetch from API
        const mockUser: User = {
          id: currentUserId,
          email: initialTraits.email || `user-${currentUserId}@example.com`,
          name: initialTraits.name || 'Demo User',
          segment: initialTraits.segment || 'startup',
          activationStatus: 'none',
          activationMilestones: [],
          plan: 'free',
          teamSize: 1,
          joinedAt: new Date().toISOString(),
          lastActiveAt: new Date().toISOString(),
          behavior: {
            sessionsCount: 0,
            totalUsageTime: 0,
            featuresUsed: [],
            projectsCreated: 0,
            teamInvitesSent: 0,
            exportsCount: 0
          }
        }
        setUser(mockUser)

        // Load activation status
        setActivation(sdkInstance.getActivationStatus())

        // Load metrics
        setMetrics({
          totalVisitors: sdkInstance.getMetric('totalVisitors'),
          totalLeads: sdkInstance.getMetric('totalLeads'),
          activationRate: sdkInstance.getMetric('activationRate'),
          conversionRate: sdkInstance.getMetric('conversionRate'),
          averageTrialLength: sdkInstance.getMetric('averageTrialLength'),
          timeToFirstValue: sdkInstance.getMetric('timeToFirstValue'),
          day1Retention: sdkInstance.getMetric('day1Retention'),
          day7Retention: sdkInstance.getMetric('day7Retention'),
          day30Retention: sdkInstance.getMetric('day30Retention'),
          churnRate: sdkInstance.getMetric('churnRate'),
          expansionMRR: sdkInstance.getMetric('expansionMRR'),
          ltv: sdkInstance.getMetric('ltv'),
          cac: sdkInstance.getMetric('cac')
        } as FunnelMetrics)

        // Load cohorts
        setCohorts(sdkInstance.getCohorts())

        // Load expansion opportunities
        setOpportunities(sdkInstance.getExpansionOpportunities())
      }
    }

    loadUserData()
  }, [sdk])

  // Refresh data periodically
  useEffect(() => {
    if (!sdk || !user) return

    const interval = setInterval(() => {
      setActivation(sdk.getActivationStatus())
      setOpportunities(sdk.getExpansionOpportunities())

      // Refresh metrics if needed
      if (metrics) {
        setMetrics(prev => prev ? {
          ...prev,
          activationRate: sdk.getMetric('activationRate'),
          conversionRate: sdk.getMetric('conversionRate'),
          day1Retention: sdk.getMetric('day1Retention'),
          day7Retention: sdk.getMetric('day7Retention')
        } : null)
      }
    }, 30000) // Every 30 seconds

    return () => clearInterval(interval)
  }, [sdk, user])

  // Compute display metrics based on mode
  const getDisplayMetrics = useCallback((): (FunnelMetrics & Partial<DerivedFunnelMetrics>) | null => {
    if (!metrics && !plannedMetrics) return null

    if (mode === 'actual' && metrics) {
      return metrics
    } else if (mode === 'planned' && plannedMetrics) {
      // Convert DerivedFunnelMetrics to FunnelMetrics shape
      return {
        ...plannedMetrics,
        totalVisitors: plannedMetrics.projectedCustomersAcquired,
        totalLeads: plannedMetrics.projectedCustomersAcquired * (plannedMetrics.overallConversionRate / 100) || 0,
        activationRate: 0, // not applicable for planned
        conversionRate: plannedMetrics.overallConversionRate / 100,
        averageTrialLength: 0,
        timeToFirstValue: 0,
        day1Retention: 0,
        day7Retention: 0,
        day30Retention: 0,
        churnRate: projectionConfig.monthlyChurnRate,
        expansionMRR: 0
      } as (FunnelMetrics & Partial<DerivedFunnelMetrics>)
    } else if (mode === 'both' && metrics && plannedMetrics) {
      // Return actual, but enhance with projections
      return {
        ...metrics,
        ...plannedMetrics,
        ltv: plannedMetrics.projectedLTV,
        cac: plannedMetrics.projectedCAC
      } as (FunnelMetrics & Partial<DerivedFunnelMetrics>)
    }
    return null
  }, [mode, metrics, plannedMetrics, projectionConfig])

  const value: AnalyticsContextValue = {
    sdk,
    user,
    activation,
    metrics,
    cohorts,
    opportunities,
    isReady,
    identify: (userId, traits) => sdk?.identify(userId, traits),
    track: (event, props) => sdk?.track(event, props),
    setSegment: (segment) => sdk?.setSegment(segment),
    completeOnboardingStep: (stepId) => sdk?.completeOnboardingStep(stepId),
    // Funnel planning
    mode,
    setMode,
    selectedFunnel,
    setSelectedFunnel,
    plannedMetrics,
    projectionConfig,
    updateProjectionConfig,
    getDisplayMetrics
  }

  return (
    <AnalyticsContext.Provider value={value}>
      {children}
    </AnalyticsContext.Provider>
  )
}

// ============== SPECIFIC HOOKS ==============

export const useActivation = (): ActivationStatus | null => {
  const { activation } = useAnalytics()
  return activation
}

export const useMetrics = (): FunnelMetrics | null => {
  const { metrics } = useAnalytics()
  return metrics
}

export const useExpansionOpportunities = (): ExpansionOpportunity[] => {
  const { opportunities } = useAnalytics()
  return opportunities
}

export const useOnboardingFlow = (): OnboardingFlow | null => {
  const { user, sdk } = useAnalytics()
  if (!user || !sdk) return null

  return (sdk as FunnelSDKImpl).getOnboardingFlow(user.segment)
}

export const useCohortRetention = (cohortId?: string): { day: number; retention: number }[] => {
  const { cohorts } = useAnalytics()
  if (cohorts.length === 0) return []

  const cohort = cohortId
    ? cohorts.find(c => c.id === cohortId)
    : cohorts[0]

  if (!cohort) return []

  // Generate retention curve data
  const curve = []
  for (let day = 0; day <= 30; day++) {
    let retention = 0
    if (day === 0) retention = 1
    else if (day === 1) retention = cohort.metrics.day1Retention
    else if (day === 7) retention = cohort.metrics.day7Retention
    else if (day === 30) retention = cohort.metrics.day30Retention
    else if (day < 7) {
      retention = cohort.metrics.day1Retention - (cohort.metrics.day1Retention - cohort.metrics.day7Retention) * (day - 1) / 6
    } else {
      retention = cohort.metrics.day7Retention - (cohort.metrics.day7Retention - cohort.metrics.day30Retention) * (day - 7) / 23
    }

    curve.push({ day, retention: Math.max(0, retention) })
  }

  return curve
}

// ============== FUNNEL PLANNING HOOKS ==============

export const useMetricsMode = (): { mode: MetricsMode; setMode: (mode: MetricsMode) => void } => {
  const { mode, setMode } = useAnalytics()
  return { mode, setMode }
}

export const useSelectedFunnel = (): { funnel: Funnel | null; setFunnel: (funnel: Funnel | null) => void } => {
  const { selectedFunnel, setSelectedFunnel } = useAnalytics()
  return { funnel: selectedFunnel, setFunnel: setSelectedFunnel }
}

export const usePlannedMetrics = (): DerivedFunnelMetrics | null => {
  const { plannedMetrics } = useAnalytics()
  return plannedMetrics
}

export const useProjectionConfig = (): {
  config: FunnelProjectionConfig
  update: (updates: Partial<FunnelProjectionConfig>) => void
} => {
  const { projectionConfig, updateProjectionConfig } = useAnalytics()
  return { config: projectionConfig, update: updateProjectionConfig }
}

export const useDisplayMetrics = (): (FunnelMetrics & Partial<DerivedFunnelMetrics>) | null => {
  const { getDisplayMetrics } = useAnalytics()
  return getDisplayMetrics()
}
