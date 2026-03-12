/**
 * Funnel Analytics SDK
 * Comprehensive analytics for SaaS funnel optimization
 *
 * Features:
 * - Event tracking with session management
 * - Activation milestone tracking
 * - Behavioral triggers engine
 * - Cohort analysis
 * - Real-time metrics
 * - Expansion opportunity detection
 */

import type {
  User,
  Event,
  EventType,
  ActivationMilestone,
  BehavioralTrigger,
  FunnelMetrics,
  Cohort,
  OnboardingFlow,
  OnboardingStep,
  ExpansionOpportunity,
  FunnelSDK,
  FunnelSDKConfig,
  ActivationEvent,
  Trial,
  UserSegment
} from './types'

// ============== UTILITIES ==============

const generateId = (): string => {
  return Math.random().toString(36).substring(2, 9) + Date.now().toString(36)
}

const now = (): string => new Date().toISOString()

const hoursDiff = (date1: string, date2: string): number => {
  return (new Date(date1).getTime() - new Date(date2).getTime()) / (1000 * 60 * 60)
}

// ============== SESSION MANAGER ==============

class SessionManager {
  private sessions: Map<string, SessionData> = new Map()
  private currentSessionId: string | null = null

  getCurrentSession(): SessionData {
    if (!this.currentSessionId) {
      this.createSession()
    }
    return this.sessions.get(this.currentSessionId!)!
  }

  createSession(): string {
    const sessionId = generateId()
    this.sessions.set(sessionId, {
      id: sessionId,
      startedAt: now(),
      events: [],
      pageViews: 0,
      utmParams: this.extractUtmParams()
    })
    this.currentSessionId = sessionId
    return sessionId
  }

  trackEvent(event: Event): void {
    const session = this.sessions.get(event.sessionId) || this.getCurrentSession()
    session.events.push(event)
  }

  getSessionDuration(sessionId: string): number {
    const session = this.sessions.get(sessionId)
    if (!session) return 0
    return hoursDiff(now(), session.startedAt)
  }

  private extractUtmParams(): Record<string, string> {
    try {
      const params = new URLSearchParams(window.location.search)
      const utm: Record<string, string> = {}
      const keys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content']
      for (const key of keys) {
        const value = params.get(key)
        if (value) utm[key] = value
      }
      return utm
    } catch (e) {
      console.warn('[FunnelSDK] Failed to extract UTM params:', e)
      return {}
    }
  }
}

interface SessionData {
  id: string
  startedAt: string
  events: Event[]
  pageViews: number
  utmParams: Record<string, string>
}

// ============== USER STATE MANAGER ==============

class UserManager {
  private users: Map<string, User> = new Map()
  private currentUser: User | null = null

  async loadUser(userId: string): Promise<User | null> {
    // In production, fetch from API
    if (this.users.has(userId)) {
      return this.users.get(userId)!
    }

    // Mock user for demo
    const mockUser: User = {
      id: userId,
      email: `user-${userId}@example.com`,
      name: 'Demo User',
      segment: 'startup',
      activationStatus: 'none',
      activationMilestones: [],
      plan: 'free',
      teamSize: 1,
      joinedAt: now(),
      lastActiveAt: now(),
      behavior: {
        sessionsCount: 0,
        totalUsageTime: 0,
        featuresUsed: [],
        projectsCreated: 0,
        teamInvitesSent: 0,
        exportsCount: 0
      }
    }

    this.users.set(userId, mockUser)
    return mockUser
  }

  updateUser(updates: Partial<User>): void {
    if (!this.currentUser) return
    this.currentUser = { ...this.currentUser, ...updates }
    this.users.set(this.currentUser.id, this.currentUser)
  }

  getCurrentUser(): User | null {
    return this.currentUser
  }

  setCurrentUser(user: User): void {
    this.currentUser = user
    this.users.set(user.id, user)
  }

  trackBehavior(eventType: EventType): void {
    if (!this.currentUser) return

    const behavior = { ...this.currentUser.behavior }

    switch (eventType) {
      case 'first_project_created':
        behavior.projectsCreated += 1
        break
      case 'first_invite_sent':
        behavior.teamInvitesSent += 1
        break
      case 'export_performed':
        behavior.exportsCount += 1
        break
      case 'feature_discovered':
        // Track unique features
        break
    }

    this.currentUser.behavior = behavior
    this.users.set(this.currentUser.id, this.currentUser)
  }
}

// ============== ACTIVATION ENGINE ==============

class ActivationEngine {
  private milestones: ActivationMilestone[] = []
  private activationDefinition: ActivationEvent | null = null

  configure(definition: ActivationEvent, milestones: ActivationMilestone[]): void {
    this.activationDefinition = definition
    this.milestones = milestones
  }

  evaluate(user: User, sessionEvents: Event[]): ActivationStatus {
    if (!this.activationDefinition) return { isActivated: false, progress: 0, completedMilestones: [] }

    const completed: ActivationMilestone[] = []
    const eventTypes = sessionEvents.map(e => e.type)

    for (const milestone of this.milestones) {
      if (eventTypes.includes(milestone.eventType)) {
        completed.push(milestone)
      }
    }

    const requiredCompleted = completed.filter(m => m.isRequired)
    const allRequiredCompleted = this.activationDefinition.requiredEvents.every(req =>
      completed.some(m => m.eventType === req)
    )

    const progress = completed.length / this.milestones.length

    return {
      isActivated: allRequiredCompleted,
      progress,
      completedMilestones: completed
    }
  }

  getTimeToActivation(user: User, sessionEvents: Event[]): number | null {
    const signupEvent = sessionEvents.find(e => e.type === 'signup_completed')
    if (!signupEvent) return null

    const activationEvent = sessionEvents.find(e =>
      this.activationDefinition?.requiredEvents.includes(e.type)
    )

    if (!activationEvent) return null

    return hoursDiff(activationEvent.timestamp, signupEvent.timestamp)
  }
}

interface ActivationStatus {
  isActivated: boolean
  progress: number
  completedMilestones: ActivationMilestone[]
}

// ============== BEHAVIORAL TRIGGERS ENGINE ==============

class TriggersEngine {
  private triggers: BehavioralTrigger[] = []
  private firedTriggers: Map<string, string[]> = new Map() // triggerId → userId[]

  configure(triggers: BehavioralTrigger[]): void {
    this.triggers = triggers
  }

  evaluate(user: User, sessionEvents: Event[], cohortEvents: Event[]): BehavioralTrigger[] {
    const readyToFire: BehavioralTrigger[] = []

    for (const trigger of this.triggers) {
      if (!trigger.isActive) continue

      if (this.isCooldownActive(trigger, user.id)) continue

      if (this.evaluateCondition(trigger.condition, user, sessionEvents, cohortEvents)) {
        readyToFire.push(trigger)
      }
    }

    return readyToFire
  }

  markFired(triggerId: string, userId: string): void {
    let users = this.firedTriggers.get(triggerId) || []
    users.push(userId)
    this.firedTriggers.set(triggerId, users)
  }

  private isCooldownActive(trigger: BehavioralTrigger, userId: string): boolean {
    const users = this.firedTriggers.get(trigger.id) || []
    if (!users.includes(userId)) return false

    if (!trigger.lastFiredAt) return false

    const hoursSince = hoursDiff(now(), trigger.lastFiredAt)
    return hoursSince < trigger.cooldownHours
  }

  private evaluateCondition(
    condition: BehavioralTrigger['condition'],
    user: User,
    sessionEvents: Event[],
    cohortEvents: Event[]
  ): boolean {
    switch (condition.type) {
      case 'inactive_days':
        const lastActive = new Date(user.lastActiveAt)
        const hoursInactive = hoursDiff(now(), lastActive.toISOString())
        return hoursInactive >= condition.days * 24

      case 'usage_threshold':
        // Check if user usage exceeded threshold
        const totalUsage = this.calculateUsageMetric(user, condition.metric)
        return totalUsage >= condition.threshold

      case 'trial_ending':
        if (!user.trialEndsAt) return false
        const hoursToEnd = hoursDiff(user.trialEndsAt, now())
        return hoursToEnd <= condition.daysBefore * 24 && hoursToEnd > 0

      case 'no_expansion':
        // User has been on paid plan but no expansion in X days
        const daysSinceUpgrade = hoursDiff(now(), user.joinedAt) / 24
        return user.plan !== 'free' && daysSinceUpgrade >= condition.daysSince

      default:
        return false
    }
  }

  private calculateUsageMetric(user: User, metric: string): number {
    // In production, aggregate real usage data
    switch (metric) {
      case 'projects':
        return user.behavior.projectsCreated
      case 'sessions':
        return user.behavior.sessionsCount
      case 'exports':
        return user.behavior.exportsCount
      default:
        return 0
    }
  }
}

// ============== COHORT ANALYTICS ==============

class CohortAnalyzer {
  private events: Event[] = []
  private users: Map<string, User> = new Map()

  addEvent(event: Event): void {
    this.events.push(event)
  }

  addUser(user: User): void {
    this.users.set(user.id, user)
  }

  generateCohorts(groupBy: 'week' | 'month' | 'channel'): Cohort[] {
    const cohorts: Cohort[] = []
    const userGroups = new Map<string, Set<string>>()

    // Group users by cohort key
    for (const [userId, user] of this.users) {
      const key = this.getCohortKey(user, groupBy)
      if (!userGroups.has(key)) userGroups.set(key, new Set())
      userGroups.get(key)!.add(userId)
    }

    // Calculate metrics for each cohort
    for (const [key, userIds] of userGroups) {
      const [startDate, segment, channel] = key.split('|')
      const cohort: Cohort = {
        id: generateId(),
        name: `${startDate} - ${channel}`,
        startDate,
        segment: segment as UserSegment,
        acquisitionChannel: channel,
        size: userIds.size,
        metrics: this.calculateCohortMetrics(userIds)
      }
      cohorts.push(cohort)
    }

    return cohorts.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())
  }

  getRetentionCurve(cohortId: string): { day: number; retention: number }[] {
    const cohort = this.getCohortById(cohortId)
    if (!cohort) return []

    const curve: { day: number; retention: number }[] = []

    for (let day = 0; day <= 30; day++) {
      const retention = this.calculateDayRetention(cohort, day)
      curve.push({ day, retention })
    }

    return curve
  }

  private getCohortKey(user: User, groupBy: 'week' | 'month' | 'channel'): string {
    const date = new Date(user.joinedAt)
    let periodKey: string

    if (groupBy === 'week') {
      const weekStart = new Date(date)
      weekStart.setDate(date.getDate() - date.getDay())
      periodKey = weekStart.toISOString().split('T')[0]
    } else if (groupBy === 'month') {
      periodKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    } else {
      periodKey = 'unknown'
    }

    // Get acquisition channel from first event
    const firstEvent = this.events.find(e => e.userId === user.id)
    const channel = firstEvent?.properties.channel || 'direct'

    return `${periodKey}|${user.segment}|${channel}`
  }

  private calculateCohortMetrics(userIds: Set<string>): Cohort['metrics'] {
    // Calculate retention and conversion metrics
    const day1Users = this.countActiveUsers(userIds, 1)
    const day7Users = this.countActiveUsers(userIds, 7)
    const day30Users = this.countActiveUsers(userIds, 30)

    const activatedUsers = this.countUsersWithStatus(userIds, 'activated')
    const convertedUsers = this.countPaidUsers(userIds)
    const expandedUsers = this.countExpandedUsers(userIds)

    const size = userIds.size

    return {
      day1Retention: size > 0 ? day1Users / size : 0,
      day7Retention: size > 0 ? day7Users / size : 0,
      day30Retention: size > 0 ? day30Users / size : 0,
      activationRate: size > 0 ? activatedUsers / size : 0,
      conversionRate: size > 0 ? convertedUsers / size : 0,
      expansionRate: size > 0 ? expandedUsers / size : 0,
      ltv: this.estimateLTV(userIds)
    }
  }

  private countActiveUsers(userIds: Set<string>, days: number): number {
    let count = 0
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - days)

    for (const userId of userIds) {
      const user = this.users.get(userId)
      if (!user) continue

      const lastActive = new Date(user.lastActiveAt)
      if (lastActive >= cutoffDate) {
        count++
      }
    }

    return count
  }

  private countUsersWithStatus(userIds: Set<string>, status: User['activationStatus']): number {
    let count = 0
    for (const userId of userIds) {
      const user = this.users.get(userId)
      if (user?.activationStatus === status) count++
    }
    return count
  }

  private countPaidUsers(userIds: Set<string>): number {
    let count = 0
    for (const userId of userIds) {
      const user = this.users.get(userId)
      if (user?.plan !== 'free') count++
    }
    return count
  }

  private countExpandedUsers(userIds: Set<string>): number {
    // In production, track expansion events
    return 0
  }

  private estimateLTV(userIds: Set<string>): number {
    // Simple LTV estimate
    const paidCount = this.countPaidUsers(userIds)
    if (paidCount === 0) return 0

    const avgRevenuePerUser = 50 // Mock ARPU
    const avgLifespan = 24 // months

    return avgRevenuePerUser * avgLifespan
  }

  private getCohortById(id: string): Cohort | null {
    const cohorts = this.generateCohorts('month')
    return cohorts.find(c => c.id === id) || null
  }

  private calculateDayRetention(cohort: Cohort, day: number): number {
    // Simplified: linear decay model
    if (day === 0) return 1
    if (day === 1) return cohort.metrics.day1Retention
    if (day === 7) return cohort.metrics.day7Retention
    if (day === 30) return cohort.metrics.day30Retention

    // Interpolate
    if (day < 7) {
      return cohort.metrics.day1Retention - (cohort.metrics.day1Retention - cohort.metrics.day7Retention) * (day - 1) / 6
    } else {
      return cohort.metrics.day7Retention - (cohort.metrics.day7Retention - cohort.metrics.day30Retention) * (day - 7) / 23
    }
  }
}

// ============== METRICS CALCULATOR ==============

class MetricsCalculator {
  calculateFunnelMetrics(events: Event[], users: Map<string, User>): FunnelMetrics {
    const uniqueVisitors = new Set(events.map(e => e.sessionId)).size
    const uniqueUsers = new Set(events.map(e => e.userId)).size

    const signupEvents = events.filter(e => e.type === 'signup_completed')
    const activationEvents = events.filter(e => e.type === 'first_project_created' || e.type === 'onboarding_step_completed')
    const upgradeEvents = events.filter(e => e.type === 'subscription_started')

    const activatedUsers = new Set(activationEvents.map(e => e.userId)).size
    const convertedUsers = new Set(upgradeEvents.map(e => e.userId)).size

    // Time to first value
    const activationTimes: number[] = []
    for (const userId of new Set(activationEvents.map(e => e.userId))) {
      const userEvents = events.filter(e => e.userId === userId).sort((a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      )
      const signup = userEvents.find(e => e.type === 'signup_completed')
      const activation = userEvents.find(e => ['first_project_created', 'onboarding_step_completed'].includes(e.type))
      if (signup && activation) {
        const hours = hoursDiff(activation.timestamp, signup.timestamp)
        if (hours >= 0) activationTimes.push(hours * 60) // Convert to minutes
      }
    }
    const avgTimeToValue = activationTimes.length > 0
      ? activationTimes.reduce((a, b) => a + b) / activationTimes.length
      : 0

    // Retention
    const retention = this.calculateRetention(users, events)

    // Simple expansion MRR calculation
    const expansionMRR = this.calculateExpansionMRR(users)

    return {
      totalVisitors: uniqueVisitors,
      totalLeads: signupEvents.length,
      activationRate: signupEvents.length > 0 ? activatedUsers / signupEvents.length : 0,
      conversionRate: activatedUsers > 0 ? convertedUsers / activatedUsers : 0,
      averageTrialLength: 14, // mock
      timeToFirstValue: avgTimeToValue,
      day1Retention: retention.day1,
      day7Retention: retention.day7,
      day30Retention: retention.day30,
      churnRate: 0.05, // mock
      expansionMRR,
      ltv: 500, // mock
      cac: 150 // mock
    }
  }

  private calculateRetention(users: Map<string, User>, events: Event[]): { day1: number; day7: number; day30: number } {
    const nowDate = new Date()
    const usersArray = Array.from(users.values())
    const totalUsers = usersArray.length

    if (totalUsers === 0) return { day1: 0, day7: 0, day30: 0 }

    const day1Cutoff = new Date(nowDate.getTime() - 24 * 60 * 60 * 1000)
    const day7Cutoff = new Date(nowDate.getTime() - 7 * 24 * 60 * 60 * 1000)
    const day30Cutoff = new Date(nowDate.getTime() - 30 * 24 * 60 * 60 * 1000)

    let day1 = 0, day7 = 0, day30 = 0

    for (const user of usersArray) {
      const lastActive = new Date(user.lastActiveAt)

      if (lastActive >= day1Cutoff) day1++
      if (lastActive >= day7Cutoff) day7++
      if (lastActive >= day30Cutoff) day30++
    }

    return {
      day1: day1 / totalUsers,
      day7: day7 / totalUsers,
      day30: day30 / totalUsers
    }
  }

  private calculateExpansionMRR(users: Map<string, User>): number {
    // In production, calculate from billing data
    let expansion = 0
    for (const user of users.values()) {
      if (user.plan === 'enterprise') expansion += 200
      if (user.teamSize > 10) expansion += 100
    }
    return expansion
  }
}

// ============== MAIN SDK CLASS ==============

export class FunnelSDKImpl implements FunnelSDK {
  private config: FunnelSDKConfig
  private sessionManager: SessionManager
  private userManager: UserManager
  private activationEngine: ActivationEngine
  private triggersEngine: TriggersEngine
  private cohortAnalyzer: CohortAnalyzer
  private metricsCalculator: MetricsCalculator

  private userId: string | null = null
  private companyId: string | null = null
  private segment: UserSegment = 'startup'

  private eventQueue: Event[] = []
  private batchSize: number = 10
  private autoFlush: boolean = true

  constructor(config: FunnelSDKConfig) {
    this.config = config
    this.sessionManager = new SessionManager()
    this.userManager = new UserManager()
    this.activationEngine = new ActivationEngine()
    this.triggersEngine = new TriggersEngine()
    this.cohortAnalyzer = new CohortAnalyzer()
    this.metricsCalculator = new MetricsCalculator()

    this.batchSize = config.batchSize || 10

    // Auto-track page views if enabled
    if (config.autoTrack) {
      this.setupAutoTracking()
    }

    // Load user if already identified
    const storedUserId = localStorage.getItem('funnel_user_id')
    if (storedUserId) {
      this.identify(storedUserId, {})
    }
  }

  // ============== IDENTITY ==============

  identify(userId: string, traits: Record<string, any>): void {
    this.userId = userId
    localStorage.setItem('funnel_user_id', userId)

    // Create or update user
    this.loadUserData(userId, traits)

    if (this.config.debug) {
      console.log('[FunnelSDK] Identified user:', userId, traits)
    }
  }

  setSegment(segment: UserSegment): void {
    this.segment = segment
    this.track('segment_updated', { segment })
  }

  // ============== EVENT TRACKING ==============

  track(eventType: EventType, properties: Record<string, any> = {}): void {
    if (!this.userId) {
      console.warn('[FunnelSDK] Cannot track event: user not identified')
      return
    }

    const sessionId = this.sessionManager.getCurrentSession().id
    const event: Event = {
      id: generateId(),
      userId: this.userId,
      type: eventType,
      properties: {
        ...properties,
        user_agent: navigator.userAgent,
        url: window.location.href,
        referrer: document.referrer
      },
      timestamp: now(),
      sessionId
    }

    this.eventQueue.push(event)
    this.sessionManager.trackEvent(event)

    // Update user behavior for relevant events
    this.userManager.trackBehavior(eventType)

    // Evaluate triggers after tracking
    this.evaluateTriggers()

    if (this.config.debug) {
      console.log('[FunnelSDK] Tracked:', eventType, properties)
    }

    // Flush if batch size reached
    if (this.eventQueue.length >= this.batchSize && this.autoFlush) {
      this.flush()
    }
  }

  trackActivation(milestoneId: string): void {
    this.track('onboarding_step_completed', { milestoneId })
  }

  trackConversion(plan: PlanType, value: number): void {
    this.track('subscription_started', { plan, value })
    this.userManager.updateUser({ plan })
  }

  // ============== ACTIVATION ==============

  getActivationStatus(): ActivationStatus {
    const user = this.userManager.getCurrentUser()
    if (!user) return { isActivated: false, progress: 0, completedMilestones: [] }

    const session = this.sessionManager.getCurrentSession()
    return this.activationEngine.evaluate(user, session.events)
  }

  getTimeToActivation(): number | null {
    const user = this.userManager.getCurrentUser()
    if (!user) return null

    const session = this.sessionManager.getCurrentSession()
    return this.activationEngine.getTimeToActivation(user, session.events)
  }

  // ============== BEHAVIORAL TRIGGERS ==============

  evaluateTriggers(): BehavioralTrigger[] {
    const user = this.userManager.getCurrentUser()
    if (!user) return []

    const session = this.sessionManager.getCurrentSession()
    const cohortEvents = this.cohortAnalyzer[Symbol.for('events')] || []

    const readyTriggers = this.triggersEngine.evaluate(user, session.events, cohortEvents)

    // Mark as fired
    for (const trigger of readyTriggers) {
      this.triggersEngine.markFired(trigger.id, user.id)
      this.executeTriggerAction(trigger.action)
    }

    return readyTriggers
  }

  subscribeTrigger(triggerId: string, callback: () => void): void {
    // In production, implement observable pattern
    console.log('[FunnelSDK] Subscribed to trigger:', triggerId)
  }

  private executeTriggerAction(action: BehavioralTrigger['action']): void {
    switch (action.type) {
      case 'in_app_notification':
        this.showNotification(action.message, action.cta)
        break
      case 'pricing_nudge':
        this.track('upgrade_nudge_shown', { plan: action.plan, discount: action.discount })
        break
      case 'feature_tooltip':
        this.track('tooltip_shown', { feature: action.feature })
        break
    }
  }

  private showNotification(message: string, cta?: string): void {
    // In production, integrate with notification system
    console.log('[FunnelSDK] Notification:', message, cta)
  }

  // ============== ONBOARDING ==============

  getOnboardingFlow(segment: UserSegment): OnboardingFlow {
    const flows: Record<UserSegment, OnboardingFlow> = {
      solopreneur: {
        id: 'onboarding-solo',
        name: 'Quick Start',
        targetSegments: ['solopreneur'],
        estimatedDuration: 5,
        activationRate: 0.72,
        steps: [
          {
            id: 'create-project',
            title: 'Create your first project',
            description: 'Start organizing your work',
            action: 'create_project',
            order: 1,
            isRequired: true,
            reward: { type: 'credits', value: 100 }
          },
          {
            id: 'add-task',
            title: 'Add your first task',
            description: 'Break down your project',
            action: 'add_task',
            order: 2,
            isRequired: true
          },
          {
            id: 'invite-teammate',
            title: 'Invite a teammate',
            description: 'Collaborate from the start',
            action: 'invite_team',
            order: 3,
            isRequired: false,
            reward: { type: 'days', value: 7 }
          }
        ]
      },
      startup: {
        id: 'onboarding-startup',
        name: 'Team Setup',
        targetSegments: ['startup', 'midmarket'],
        estimatedDuration: 10,
        activationRate: 0.65,
        steps: [
          {
            id: 'setup-workspace',
            title: 'Set up your workspace',
            description: 'Configure your team space',
            action: 'setup_workspace',
            order: 1,
            isRequired: true
          },
          {
            id: 'create-project',
            title: 'Create a project',
            description: 'Start tracking work',
            action: 'create_project',
            order: 2,
            isRequired: true
          },
          {
            id: 'add-team',
            title: 'Add team members',
            description: 'Invite your team',
            action: 'add_team',
            order: 3,
            isRequired: true,
            reward: { type: 'feature_unlock', value: 'advanced_analytics' }
          },
          {
            id: 'integrate',
            title: 'Connect integrations',
            description: 'Set up your tools',
            action: 'setup_integration',
            order: 4,
            isRequired: false
          }
        ]
      },
      midmarket: {
        id: 'onboarding-midmarket',
        name: 'Enterprise Onboarding',
        targetSegments: ['midmarket', 'enterprise'],
        estimatedDuration: 20,
        activationRate: 0.48,
        steps: [
          {
            id: 'account-setup',
            title: 'Complete account setup',
            description: 'Configure SSO and security',
            action: 'setup_sso',
            order: 1,
            isRequired: true
          },
          {
            id: 'import-data',
            title: 'Import your data',
            description: 'Bring in existing projects',
            action: 'import_data',
            order: 2,
            isRequired: true
          },
          {
            id: 'configure-workflow',
            title: 'Configure workflows',
            description: 'Set up your processes',
            action: 'configure_workflow',
            order: 3,
            isRequired: true
          },
          {
            id: 'team-training',
            title: 'Train your team',
            description: 'Schedule onboarding session',
            action: 'schedule_training',
            order: 4,
            isRequired: false,
            reward: { type: 'feature_unlock', value: 'priority_support' }
          }
        ]
      },
      enterprise: {
        id: 'onboarding-enterprise',
        name: 'Enterprise Deployment',
        targetSegments: ['enterprise'],
        estimatedDuration: 30,
        activationRate: 0.38,
        steps: [
          {
            id: 'kicksoff-meeting',
            title: 'Kickoff meeting',
            description: 'Meet your success manager',
            action: 'schedule_kickoff',
            order: 1,
            isRequired: true
          },
          {
            id: 'technical-setup',
            title: 'Technical configuration',
            description: 'API setup, SSO, SCIM',
            action: 'technical_setup',
            order: 2,
            isRequired: true
          },
          {
            id: 'pilot-program',
            title: 'Launch pilot program',
            description: 'Test with small team',
            action: 'launch_pilot',
            order: 3,
            isRequired: true
          },
          {
            id: 'full-deployment',
            title: 'Full deployment',
            description: 'Roll out to entire org',
            action: 'deploy_full',
            order: 4,
            isRequired: true
          }
        ]
      }
    }

    return flows[segment] || flows.startup
  }

  completeOnboardingStep(stepId: string): void {
    this.track('onboarding_step_completed', { stepId })

    const flow = this.getOnboardingFlow(this.segment)
    const step = flow.steps.find(s => s.id === stepId)
    if (step?.reward) {
      this.applyReward(step.reward)
    }
  }

  private applyReward(reward: OnboardingStep['reward']): void {
    switch (reward.type) {
      case 'credits':
        this.track('credits_awarded', { amount: reward.value })
        break
      case 'days':
        this.track('trial_extension', { days: reward.value })
        break
      case 'feature':
        this.track('feature_unlocked', { feature: reward.value })
        break
    }
  }

  // ============== EXPANSION ==============

  getExpansionOpportunities(): ExpansionOpportunity[] {
    const user = this.userManager.getCurrentUser()
    if (!user) return []

    const opportunities: ExpansionOpportunity[] = []

    // Team expansion trigger
    if (user.teamSize >= 3 && user.plan === 'starter') {
      opportunities.push({
        id: generateId(),
        userId: user.id,
        type: 'team_expansion',
        currentPlan: 'starter',
        recommendedPlan: 'pro',
        trigger: 'team_size_near_limit',
        expectedValue: 49,
        priority: 'medium',
        suggestedTiming: 'When adding 4th team member'
      })
    }

    // Usage-based upgrade
    if (user.behavior.exportsCount > 10 && user.plan !== 'pro') {
      opportunities.push({
        id: generateId(),
        userId: user.id,
        type: 'upsell',
        currentPlan: user.plan,
        recommendedPlan: 'team',
        trigger: 'high_export_usage',
        expectedValue: 199,
        priority: 'high',
        suggestedTiming: 'Within 7 days'
      })
    }

    // Trial → paid conversion
    if (user.plan === 'free' && user.trialEndsAt) {
      const hoursToEnd = hoursDiff(user.trialEndsAt, now())
      if (hoursToEnd > 0 && hoursToEnd < 72) {
        opportunities.push({
          id: generateId(),
          userId: user.id,
          type: 'upsell',
          currentPlan: 'free',
          recommendedPlan: 'starter',
          trigger: 'trial_ending_soon',
          expectedValue: 29,
          priority: 'critical',
          suggestedTiming: 'Immediate - trial ends in 3 days'
        })
      }
    }

    return opportunities.sort((a, b) => {
      const priorityMap = { critical: 0, high: 1, medium: 2, low: 3 }
      return priorityMap[a.priority] - priorityMap[b.priority]
    })
  }

  trackExpansion(opportunityId: string): void {
    this.track('expansion_converted', { opportunityId })
  }

  // ============== METRICS ==============

  getMetric(metricName: keyof FunnelMetrics): number {
    const session = this.sessionManager.getCurrentSession()
    const users = this.userManager['users'] as Map<string, User>

    const allEvents = session.events
    const uniqueUserIds = new Set(allEvents.map(e => e.userId))
    const uniqueUsers: User[] = []
    for (const uid of uniqueUserIds) {
      const user = users.get(uid)
      if (user) uniqueUsers.push(user)
    }

    const metrics = this.metricsCalculator.calculateFunnelMetrics(allEvents, users)
    return metrics[metricName] || 0
  }

  getCohorts(): Cohort[] {
    // In production, fetch from API
    const users = this.userManager['users'] as Map<string, User>
    const session = this.sessionManager.getCurrentSession()
    const allEvents = session.events

    // Build full event list
    const analyzer = new CohortAnalyzer()
    for (const user of users.values()) {
      analyzer.addUser(user)
    }
    for (const event of allEvents) {
      analyzer.addEvent(event)
    }

    return analyzer.generateCohorts('week')
  }

  // ============== DATA FLUSH ==============

  flush(): Promise<void> {
    if (this.eventQueue.length === 0) return Promise.resolve()

    const events = [...this.eventQueue]
    this.eventQueue = []

    if (this.config.debug) {
      console.log('[FunnelSDK] Flushing', events.length, 'events')
    }

    // In production, send to analytics endpoint
    if (this.config.endpoint) {
      return fetch(this.config.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events, apiKey: this.config.apiKey })
      }).then(() => {
        if (this.config.debug) console.log('[FunnelSDK] Events sent')
      }).catch(err => {
        console.error('[FunnelSDK] Failed to send events:', err)
        // Re-queue on failure
        this.eventQueue.unshift(...events)
      })
    }

    return Promise.resolve()
  }

  // ============== ONBOARDING FLOW COMPONENT ==============

  private userDataPromise: Promise<User> | null = null

  private async loadUserData(userId: string, traits: Record<string, any>): Promise<User> {
    if (this.userDataPromise) {
      return this.userDataPromise
    }

    this.userDataPromise = this.userManager.loadUser(userId).then(user => {
      if (traits) {
        this.userManager.updateUser(traits)
      }
      return user
    })

    return this.userDataPromise
  }

  private setupAutoTracking(): void {
    // Track page views automatically
    const trackPageView = () => {
      this.track('page_view', {
        path: window.location.pathname,
        title: document.title
      })
    }

    window.addEventListener('popstate', trackPageView)
    trackPageView() // Track initial page
  }

  // Getters for internal state
  getSessionId(): string {
    return this.sessionManager.getCurrentSession().id
  }

  getUserId(): string | null {
    return this.userId
  }

  getSegment(): UserSegment {
    return this.segment
  }
}

// ============== SDK FACTORY ==============

let sdkInstance: FunnelSDKImpl | null = null

export function initFunnelSDK(config: FunnelSDKConfig): FunnelSDK {
  if (sdkInstance) {
    console.warn('[FunnelSDK] Already initialized')
    return sdkInstance
  }

  sdkInstance = new FunnelSDKImpl(config)
  return sdkInstance
}

export function getFunnelSDK(): FunnelSDK | null {
  return sdkInstance
}

export function resetFunnelSDK(): void {
  sdkInstance = null
  localStorage.removeItem('funnel_user_id')
}
