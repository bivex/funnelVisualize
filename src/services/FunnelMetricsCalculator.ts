import type {
  Funnel,
  FunnelStage,
  DerivedFunnelMetrics,
  FunnelProjectionConfig,
  FunnelMetrics
} from './types'

/**
 * Calculator for deriving business metrics from marketing funnel data
 * Transforms strategic funnel stages into projected performance metrics
 */
export class FunnelMetricsCalculator {
  private config: FunnelProjectionConfig

  constructor(config: Partial<FunnelProjectionConfig> = {}) {
    this.config = {
      averageOrderValue: 49,
      customerLifespanMonths: 24,
      grossMargin: 0.70,
      monthlyChurnRate: 0.05,
      expansionRate: 0.02,
      cacPerLead: 150,
      ...config
    }
  }

  /**
   * Derive all metrics from a marketing funnel
   */
  calculateFromFunnel(funnel: Funnel): DerivedFunnelMetrics {
    const stages = funnel.stages
    if (stages.length === 0) {
      return this.getEmptyMetrics()
    }

    // Ensure all conversion rates are calculated
    const stagesWithRates = this.ensureConversionRates(stages)

    // Calculate overall conversion
    const overallRate = this.calculateOverallConversion(stagesWithRates)

    // Calculate stage-by-stage analysis
    const stageConversions = this.calculateStageConversions(stagesWithRates)

    // Revenue and customer projections
    const lastStageValue = stages[stages.length - 1].value
    const firstStageValue = stages[0].value

    // Estimate if last stage is revenue (contains $ or terms like revenue, mrr)
    const lastStageName = stages[stages.length - 1].name.toLowerCase()
    const isRevenueStage = lastStageName.includes('revenue') ||
                          lastStageName.includes('$') ||
                          lastStageName.includes('mrr') ||
                          lastStageName.includes('income')

    // Project customers acquired (if first stage is leads, last is customers)
    const projectedCustomers = this.estimateCustomersAcquired(
      firstStageValue,
      overallRate
    )

    // Project monthly revenue
    const projectedRevenue = isRevenueStage
      ? lastStageValue  // Already revenue, use as-is (assumed monthly)
      : projectedCustomers * this.config.averageOrderValue

    // LTV calculation: ARPA × Gross Margin × (1 / Monthly Churn Rate)
    const monthlyRevenuePerCustomer = this.config.averageOrderValue
    const ltv = monthlyRevenuePerCustomer
      * this.config.grossMargin
      * (1 / this.config.monthlyChurnRate)

    // CAC: proportional to leads acquired
    const projectedCAC = this.config.cacPerLead * (1 / (overallRate || 1))

    return {
      overallConversionRate: overallRate,
      averageStageConversionRate: this.calculateAverageStageRate(stagesWithRates),
      projectedMonthlyRevenue: projectedRevenue,
      projectedLTV: ltv,
      projectedCAC: projectedCAC,
      projectedLTVCACRatio: ltv / projectedCAC,
      projectedCustomersAcquired: projectedCustomers,
      stageConversions
    }
  }

  /**
   * Merge planned and actual metrics, with actual taking precedence where available
   */
  mergeMetrics(
    planned: DerivedFunnelMetrics,
    actual: FunnelMetrics | null
  ): DerivedFunnelMetrics & FunnelMetrics {
    if (!actual) return planned

    return {
      ...planned,
      // Blend or replace with actual data where available
      overallConversionRate: actual.conversionRate || planned.overallConversionRate,
      projectedLTV: actual.ltv || planned.projectedLTV,
      projectedCAC: actual.cac || planned.projectedCAC,
      // Keep actuals for other metrics
      totalVisitors: actual.totalVisitors,
      totalLeads: actual.totalLeads,
      activationRate: actual.activationRate,
      day1Retention: actual.day1Retention,
      day7Retention: actual.day7Retention,
      day30Retention: actual.day30Retention,
      churnRate: actual.churnRate,
      expansionMRR: actual.expansionMRR
    }
  }

  /**
   * Update projection configuration
   */
  updateConfig(updates: Partial<FunnelProjectionConfig>): void {
    this.config = { ...this.config, ...updates }
  }

  /**
   * Get current configuration
   */
  getConfig(): FunnelProjectionConfig {
    return { ...this.config }
  }

  private ensureConversionRates(stages: FunnelStage[]): (FunnelStage & { effectiveConversionRate: number })[] {
    return stages.map((stage, index) => {
      let rate = stage.conversionRate

      // If not provided, calculate from adjacent stage values
      if (rate === undefined && index < stages.length - 1) {
        const nextStageValue = stages[index + 1].value
        if (stage.value > 0) {
          rate = (nextStageValue / stage.value) * 100  // as percentage
        } else {
          rate = 0
        }
      } else if (rate === undefined) {
        rate = 0
      }

      return {
        ...stage,
        effectiveConversionRate: rate
      }
    })
  }

  private calculateOverallConversion(stages: (FunnelStage & { effectiveConversionRate: number })[]): number {
    if (stages.length < 2) return 0

    const firstValue = stages[0].value
    const lastValue = stages[stages.length - 1].value

    if (firstValue === 0) return 0
    return (lastValue / firstValue) * 100  // percentage
  }

  private calculateStageConversions(
    stages: (FunnelStage & { effectiveConversionRate: number })[]
  ): DerivedFunnelMetrics['stageConversions'] {
    const result: DerivedFunnelMetrics['stageConversions'] = []
    let cumulativeRate = 100  // start at 100% for first stage

    for (let i = 0; i < stages.length; i++) {
      const stage = stages[i]
      const conversionToNext = i < stages.length - 1
        ? stage.effectiveConversionRate
        : 0

      // Cumulative rate from first stage to this one
      if (i > 0) {
        cumulativeRate = (stage.value / stages[0].value) * 100
      }

      result.push({
        stageName: stage.name,
        stageValue: stage.value,
        conversionRate: conversionToNext,
        cumulativeRate: cumulativeRate
      })
    }

    return result
  }

  private calculateAverageStageRate(stages: (FunnelStage & { effectiveConversionRate: number })[]): number {
    const rates = stages
      .slice(0, -1)  // exclude last stage (no next stage)
      .map(s => s.effectiveConversionRate / 100)  // convert to decimal

    if (rates.length === 0) return 0
    const sum = rates.reduce((a, b) => a + b, 0)
    return (sum / rates.length) * 100
  }

  private estimateCustomersAcquired(initialValue: number, conversionRate: number): number {
    // If conversion rate is decimal (0-1), use directly; if percentage (0-100), divide by 100
    const rate = conversionRate > 1 ? conversionRate / 100 : conversionRate
    return initialValue * rate
  }

  private getEmptyMetrics(): DerivedFunnelMetrics {
    return {
      overallConversionRate: 0,
      averageStageConversionRate: 0,
      projectedMonthlyRevenue: 0,
      projectedLTV: 0,
      projectedCAC: 0,
      projectedLTVCACRatio: 0,
      projectedCustomersAcquired: 0,
      stageConversions: []
    }
  }
}
