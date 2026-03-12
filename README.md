# Funnels Visualizer

Web-based funnel visualization tool built with Bun, React, and TypeScript.

## Features

- **Companies** — Manage companies with their marketing funnels
- **Funnels** — Browse 451 pre-built marketing strategy funnels
- **Playbook** — Library of 8 tactical plays with implementation templates
- **Builder** — Create and customize custom funnels
- **Dark/Light Theme** — Premium dark theme with classic light mode

## Quick Start

```bash
# Install dependencies
bun install

# Run dev server
bun run dev

# Convert marketing strategies to funnels
bun run convert
```

Open http://localhost:3000

## Project Structure

```
├── data/
│   ├── marketing_strategies.json  # 451 source strategies
│   ├── marketing_funnels.json     # Converted funnels
│   ├── companies.json             # Company data
│   └── tactics.json               # Playbook tactics
├── src/
│   ├── App.tsx                    # Main app component
│   ├── components/
│   │   ├── FunnelVisualization.tsx
│   │   ├── FunnelBuilder.tsx
│   │   └── ...
│   └── index.css                  # Theme variables
├── index.ts                       # Bun server with API
└── convert_to_funnels.ts          # Data conversion script
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/companies` | List all companies |
| POST | `/api/companies` | Create company |
| GET | `/api/companies/:id` | Get company details |
| DELETE | `/api/companies/:id` | Delete company |
| POST | `/api/companies/:id/funnels` | Add funnel to company |
| GET | `/api/funnels` | List marketing funnels |
| GET | `/api/tactics` | List playbook tactics |
| POST | `/api/tactics` | Create tactic |
| GET | `/api/stats` | Statistics |

## Data Schemas

### Company
```json
{
  "id": "company-1",
  "name": "TechFlow SaaS",
  "description": "B2B SaaS platform",
  "industry": "Software",
  "website": "https://example.com",
  "funnels": [...]
}
```

### Funnel
```json
{
  "id": "funnel-1",
  "name": "Free Trial to Paid",
  "description": "Convert trial users",
  "types": ["Acquisition", "Revenue"],
  "impact": "Moderate to High",
  "stages": [
    {"name": "Visitors", "value": 10000},
    {"name": "Signups", "value": 500, "conversionRate": 5}
  ]
}
```

### Tactic
```json
{
  "id": "tactic-1",
  "name": "Exit-Intent Popup",
  "description": "Show popup on exit",
  "category": "Acquisition",
  "stage": "Consideration",
  "difficulty": "Easy",
  "impact": "Medium",
  "template": {"headline": "...", "cta": "..."}
}
```

## Tech Stack

- **Runtime**: Bun
- **Frontend**: React 19, TypeScript
- **Styling**: CSS with CSS variables
- **Server**: Bun.serve() with HMR

## License

MIT
