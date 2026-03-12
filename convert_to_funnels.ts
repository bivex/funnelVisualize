import { readFileSync, writeFileSync } from "node:fs";

interface Strategy {
  name: string;
  description: string;
  types: string[];
  impact: string | null;
}

interface FunnelStage {
  name: string;
  value: number;
  conversionRate?: number;
}

interface Funnel {
  id: string;
  name: string;
  description: string;
  strategy: string;
  types: string[];
  impact: string;
  stages: FunnelStage[];
  totalValue: number;
}

// Read strategies
const strategies: Strategy[] = JSON.parse(
  readFileSync("data/marketing_strategies.json", "utf-8")
);

// Funnel stage definitions based on strategy types
const typeToStages: Record<string, FunnelStage[]> = {
  Awareness: [
    { name: "Impressions", value: 100000 },
    { name: "Website Visitors", value: 25000, conversionRate: 25 },
    { name: "Page Views", value: 60000, conversionRate: 240 },
  ],
  Acquisition: [
    { name: "Leads", value: 5000 },
    { name: "Qualified Leads", value: 2500, conversionRate: 50 },
    { name: "Opportunities", value: 1000, conversionRate: 40 },
  ],
  Activation: [
    { name: "Signups", value: 2000 },
    { name: "Activated Users", value: 1200, conversionRate: 60 },
    { name: "First Action", value: 800, conversionRate: 67 },
  ],
  Retention: [
    { name: "Active Users", value: 5000 },
    { name: "Returning Users", value: 3000, conversionRate: 60 },
    { name: "Engaged Users", value: 1500, conversionRate: 50 },
  ],
  Referral: [
    { name: "Total Users", value: 10000 },
    { name: "Referrals Sent", value: 2000, conversionRate: 20 },
    { name: "Referrals Converted", value: 400, conversionRate: 20 },
  ],
  Revenue: [
    { name: "Opportunities", value: 500 },
    { name: "Proposals", value: 300, conversionRate: 60 },
    { name: "Closed Deals", value: 150, conversionRate: 50 },
    { name: "Revenue ($)", value: 75000, conversionRate: 500 },
  ],
};

// Impact multipliers for realistic variations
const impactMultiplier: Record<string, number> = {
  null: 1.0,
  "Moderate": 0.8,
  "Moderate to High": 1.2,
};

// Create slug from name
function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 50);
}

// Generate funnel stages for a strategy
function generateStages(types: string[], impact: string | null): FunnelStage[] {
  const multiplier = impactMultiplier[impact ?? "null"];
  const stages: FunnelStage[] = [];

  // Build stages based on types in typical funnel order
  const stageOrder = ["Awareness", "Acquisition", "Activation", "Retention", "Referral", "Revenue"];

  for (const type of stageOrder) {
    if (types.includes(type) && typeToStages[type]) {
      for (const stage of typeToStages[type]) {
        const existingStage = stages.find(s => s.name === stage.name);
        if (!existingStage) {
          stages.push({
            ...stage,
            value: Math.round(stage.value * multiplier),
          });
        }
      }
    }
  }

  // If no types matched, use default funnel
  if (stages.length === 0) {
    stages.push(
      { name: "Awareness", value: Math.round(100000 * multiplier) },
      { name: "Interest", value: Math.round(30000 * multiplier), conversionRate: 30 },
      { name: "Consideration", value: Math.round(10000 * multiplier), conversionRate: 33 },
      { name: "Decision", value: Math.round(3000 * multiplier), conversionRate: 30 },
      { name: "Purchase", value: Math.round(1000 * multiplier), conversionRate: 33 }
    );
  }

  return stages;
}

// Convert all strategies to funnels
const funnels: Funnel[] = strategies.map((strategy, index) => {
  const stages = generateStages(strategy.types, strategy.impact);
  const totalValue = stages.reduce((sum, stage) => sum + stage.value, 0);

  return {
    id: `funnel-${index + 1}`,
    name: `${strategy.name} - Funnel`,
    description: strategy.description,
    strategy: strategy.name,
    types: strategy.types,
    impact: strategy.impact || "Moderate",
    stages,
    totalValue,
  };
});

// Write output
writeFileSync(
  "data/marketing_funnels.json",
  JSON.stringify(funnels, null, 2)
);

console.log(`Converted ${funnels.length} strategies to funnels`);
console.log(`Output: data/marketing_funnels.json`);
