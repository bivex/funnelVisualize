// Load marketing funnels data
const funnelsData = await Bun.file("data/marketing_funnels.json").json();
const funnels = funnelsData as Array<{
  id: string;
  name: string;
  description: string;
  strategy: string;
  types: string[];
  impact: string;
  stages: Array<{
    name: string;
    value: number;
    conversionRate?: number;
  }>;
  totalValue: number;
}>;

// Load companies data
const companiesData = await Bun.file("data/companies.json").json();
let companies = companiesData as Array<{
  id: string;
  name: string;
  description: string;
  industry: string;
  website?: string;
  funnels: Array<{
    id: string;
    name: string;
    description: string;
    types: string[];
    impact: string;
    stages: Array<{
      name: string;
      value: number;
      conversionRate?: number;
    }>;
    totalValue: number;
  }>;
}>;

// Load tactics data
const tacticsData = await Bun.file("data/tactics.json").json();
const tactics = tacticsData as Array<{
  id: string;
  name: string;
  description: string;
  category: string;
  stage: string;
  difficulty: string;
  impact: string;
  template: Record<string, any>;
}>;

import index from "./index.html";

Bun.serve({
  port: 3000,
  routes: {
    // ===== COMPANIES API =====
    "/api/companies": {
      // GET all companies
      GET: () => {
        return Response.json({
          companies: companies.map(c => ({
            id: c.id,
            name: c.name,
            description: c.description,
            industry: c.industry,
            website: c.website,
            funnelsCount: c.funnels.length,
          })),
          total: companies.length,
        });
      },
      // POST create new company
      POST: async (req) => {
        const body = await req.json();
        const newCompany = {
          id: `company-${Date.now()}`,
          name: body.name,
          description: body.description || "",
          industry: body.industry || "Other",
          website: body.website,
          funnels: body.funnels || [],
        };
        companies.push(newCompany);

        // Save to file
        await Bun.write("data/companies.json", JSON.stringify(companies, null, 2));

        return Response.json(newCompany, { status: 201 });
      },
    },
    "/api/companies/:id": {
      // GET single company with funnels
      GET: (req) => {
        const id = req.params.id;
        const company = companies.find(c => c.id === id);
        if (!company) {
          return Response.json({ error: "Company not found" }, { status: 404 });
        }
        return Response.json(company);
      },
      // DELETE company
      DELETE: (req) => {
        const id = req.params.id;
        const index = companies.findIndex(c => c.id === id);
        if (index === -1) {
          return Response.json({ error: "Company not found" }, { status: 404 });
        }
        companies.splice(index, 1);

        // Save to file
        Bun.write("data/companies.json", JSON.stringify(companies, null, 2));

        return Response.json({ success: true });
      },
    },
    "/api/companies/:id/funnels": {
      // POST add funnel to company
      POST: async (req) => {
        const id = req.params.id;
        const company = companies.find(c => c.id === id);
        if (!company) {
          return Response.json({ error: "Company not found" }, { status: 404 });
        }

        const body = await req.json();
        const newFunnel = {
          id: `funnel-${Date.now()}`,
          name: body.name,
          description: body.description || "",
          types: body.types || [],
          impact: body.impact || "Moderate",
          stages: body.stages || [],
          totalValue: body.stages?.reduce((sum: number, s: any) => sum + (s.value || 0), 0) || 0,
        };

        company.funnels.push(newFunnel);

        // Save to file
        await Bun.write("data/companies.json", JSON.stringify(companies, null, 2));

        return Response.json(newFunnel, { status: 201 });
      },
    },

    // ===== TACTICS API =====
    "/api/tactics": {
      GET: (req) => {
        const url = new URL(req.url);
        const category = url.searchParams.get("category") || "";
        const difficulty = url.searchParams.get("difficulty") || "";
        const search = url.searchParams.get("search")?.toLowerCase() || "";

        let filtered = tactics;

        if (category) {
          filtered = filtered.filter((t) => t.category === category);
        }
        if (difficulty) {
          filtered = filtered.filter((t) => t.difficulty === difficulty);
        }
        if (search) {
          filtered = filtered.filter(
            (t) =>
              t.name.toLowerCase().includes(search) ||
              t.description.toLowerCase().includes(search)
          );
        }

        return Response.json({
          tactics: filtered,
          total: filtered.length,
        });
      },
      POST: async (req) => {
        const body = await req.json();
        const newTactic = {
          id: `tactic-${Date.now()}`,
          name: body.name,
          description: body.description || "",
          category: body.category || "Other",
          stage: body.stage || "General",
          difficulty: body.difficulty || "Medium",
          impact: body.impact || "Medium",
          template: body.template || {},
        };
        tactics.push(newTactic);

        // Save to file
        await Bun.write("data/tactics.json", JSON.stringify(tactics, null, 2));

        return Response.json(newTactic, { status: 201 });
      },
    },
    "/api/tactics/categories": {
      GET: () => {
        const categories = [...new Set(tactics.map((t) => t.category))];
        return Response.json({ categories });
      },
    },

    // ===== MARKETING STRATEGIES API =====
    "/api/funnels": {
      GET: (req) => {
        const url = new URL(req.url);
        const search = url.searchParams.get("search")?.toLowerCase() || "";
        const type = url.searchParams.get("type") || "";
        const impact = url.searchParams.get("impact") || "";
        const page = parseInt(url.searchParams.get("page") || "1");
        const limit = parseInt(url.searchParams.get("limit") || "20");

        let filtered = funnels;

        if (search) {
          filtered = filtered.filter(
            (f) =>
              f.name.toLowerCase().includes(search) ||
              f.strategy.toLowerCase().includes(search) ||
              f.description.toLowerCase().includes(search)
          );
        }

        if (type) {
          filtered = filtered.filter((f) => f.types.includes(type));
        }

        if (impact) {
          filtered = filtered.filter((f) => f.impact === impact);
        }

        const total = filtered.length;
        const start = (page - 1) * limit;
        const paginated = filtered.slice(start, start + limit);

        return Response.json({
          funnels: paginated,
          pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
          },
        });
      },
    },
    "/api/stats": {
      GET: () => {
        const typeCounts = funnels.reduce((acc, f) => {
          for (const type of f.types) {
            acc[type] = (acc[type] || 0) + 1;
          }
          return acc;
        }, {} as Record<string, number>);

        const impactCounts = funnels.reduce((acc, f) => {
          acc[f.impact] = (acc[f.impact] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        return Response.json({
          total: funnels.length,
          byType: typeCounts,
          byImpact: impactCounts,
          companiesCount: companies.length,
          tacticsCount: tactics.length,
        });
      },
    },
    "/": index,
  },
  development: {
    hmr: true,
    console: true,
  },
});

console.log(`🚀 Server running at http://localhost:3000`);
console.log(`📊 Loaded ${funnels.length} marketing funnels`);
console.log(`🏢 Loaded ${companies.length} companies`);
console.log(`⚡ Loaded ${tactics.length} tactics`);
