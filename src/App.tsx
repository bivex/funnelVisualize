import { useState, useEffect } from 'react'
import type { Funnel } from './types'
import FunnelVisualization from './components/FunnelVisualization'
import FunnelBuilder from './components/FunnelBuilder'
import AnalyticsDashboard from './components/AnalyticsDashboard'
import { AnalyticsProvider, useAnalytics } from './contexts/AnalyticsContext'
import './App.css'

function generateId(): string {
  return Math.random().toString(36).substring(2, 9)
}

const SAMPLE_FUNNEL: Funnel = {
  id: generateId(),
  name: 'E-Commerce Conversion',
  description: 'Customer journey from landing to purchase',
  stages: [
    { id: generateId(), name: 'Website Visits', value: 10000, color: '#6366F1' },
    { id: generateId(), name: 'Product Views', value: 6500, color: '#8B5CF6' },
    { id: generateId(), name: 'Add to Cart', value: 3200, color: '#A855F7' },
    { id: generateId(), name: 'Checkout Started', value: 2100, color: '#D946EF' },
    { id: generateId(), name: 'Purchase Complete', value: 1800, color: '#22C55E' },
  ],
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

// Marketing funnel data type
interface MarketingFunnel {
  id: string
  name: string
  description: string
  strategy: string
  types: string[]
  impact: string
  stages: Array<{
    name: string
    value: number
    conversionRate?: number
  }>
  totalValue: number
}

// Company data type
interface Company {
  id: string
  name: string
  description: string
  industry: string
  website?: string
  funnels: MarketingFunnel[]
  funnelsCount?: number
}

// Tactic data type
interface Tactic {
  id: string
  name: string
  description: string
  category: string
  stage: string
  difficulty: string
  impact: string
  template: Record<string, any>
}

// Convert marketing funnel to display funnel
function toDisplayFunnel(mf: MarketingFunnel): Funnel {
  const colors = ['#6366F1', '#8B5CF6', '#A855F7', '#D946EF', '#EC4899', '#F43F5E', '#EF4444', '#F97316']
  return {
    id: mf.id,
    name: mf.name,
    description: mf.description,
    stages: mf.stages.map((s, i) => ({
      id: generateId(),
      name: s.name,
      value: s.value,
      color: colors[i % colors.length],
    })),
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
}

export default function App() {
  const { identify, track, user, isReady, setSegment, setSelectedFunnel: setContextSelectedFunnel } = useAnalytics()
  const [funnel, setFunnel] = useState<Funnel>(SAMPLE_FUNNEL)
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('theme')
    return saved === 'dark' ? 'dark' : 'light'
  })

  // Companies
  const [companies, setCompanies] = useState<Company[]>([])
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null)
  const [showCreateCompany, setShowCreateCompany] = useState(false)

  // Marketing funnels (strategies)
  const [marketingFunnels, setMarketingFunnels] = useState<MarketingFunnel[]>([])
  const [selectedFunnel, setSelectedFunnel] = useState<MarketingFunnel | null>(null)

  // Tactics
  const [tactics, setTactics] = useState<Tactic[]>([])
  const [selectedTactic, setSelectedTactic] = useState<Tactic | null>(null)
  const [categoryFilter, setCategoryFilter] = useState('')
  const [difficultyFilter, setDifficultyFilter] = useState('')
  const [showCreateTactic, setShowCreateTactic] = useState(false)

  // View state
  const [viewMode, setViewMode] = useState<'companies' | 'strategies' | 'tactics' | 'detail' | 'builder' | 'analytics'>('companies')
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [page, setPage] = useState(1)

  // New tactic form
  const [newTactic, setNewTactic] = useState({
    name: '',
    description: '',
    category: '',
    stage: '',
    difficulty: 'Medium',
    impact: 'Medium',
  })

  // New company form
  const [newCompany, setNewCompany] = useState({ name: '', description: '', industry: '', website: '' })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  useEffect(() => {
    // Track view mode changes
    if (isReady) {
      track('page_view', {
        view: viewMode,
        path: window.location.pathname
      })
    }
  }, [viewMode, isReady])

  // Auto-identify demo user on first load
  useEffect(() => {
    const demoUserId = localStorage.getItem('demo_user_id')
    if (!demoUserId && isReady) {
      const newId = 'demo-' + Math.random().toString(36).substring(2, 9)
      localStorage.setItem('demo_user_id', newId)

      // Detect segment from demo data (simulate)
      identify(newId, {
        name: 'Demo User',
        email: `demo-${newId}@techflow.io`,
        segment: 'startup',
        teamSize: 5,
        company: 'TechFlow SaaS'
      })

      track('signup_completed', {
        method: 'demo',
        segment: 'startup',
        utm_source: 'demo'
      })

      setSegment('startup')
    }
  }, [isReady])

  // Track company interactions
  const handleCompanySelect = async (company: Company) => {
    track('company_viewed', {
      companyId: company.id,
      companyName: company.name,
      industry: company.industry,
      funnelCount: company.funnels?.length || 0
    })

    await selectCompany(company)
  }

  // Track funnel/tactic views
  const handleFunnelSelect = (mf: MarketingFunnel) => {
    track('funnel_viewed', {
      funnelId: mf.id,
      funnelName: mf.strategy,
      types: mf.types,
      stages: mf.stages.length
    })

    selectFunnel(mf)
  }

  // Track creation actions
  const handleCreateCompany = async () => {
    await createCompany()
    track('company_created', {
      industry: newCompany.industry,
      nameLength: newCompany.name.length
    })
  }

  const handleCreateTactic = async () => {
    await createTactic()
    track('tactic_created', {
      category: newTactic.category,
      difficulty: newTactic.difficulty,
      stage: newTactic.stage
    })
  }

  // Track onboarding step
  const trackOnboardingStep = (step: string) => {
    track('onboarding_step_completed', { step })
    // In real app: completeOnboardingStep(step)
  }

  useEffect(() => {
    loadCompanies()
    loadMarketingFunnels()
    loadTactics()
  }, [search, typeFilter, page, categoryFilter, difficultyFilter])

  async function loadCompanies() {
    try {
      const res = await fetch('/api/companies')
      if (res.ok) {
        const data = await res.json()
        setCompanies(data.companies)
      }
    } catch (e) {
      console.error('Failed to load companies:', e)
    }
  }

  async function loadMarketingFunnels() {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
      })
      if (search) params.set('search', search)
      if (typeFilter) params.set('type', typeFilter)

      const res = await fetch(`/api/funnels?${params}`)
      if (res.ok) {
        const data = await res.json()
        setMarketingFunnels(data.funnels)
      }
    } catch (e) {
      console.error('Failed to load funnels:', e)
    }
  }

  async function loadTactics() {
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (categoryFilter) params.set('category', categoryFilter)
      if (difficultyFilter) params.set('difficulty', difficultyFilter)

      const res = await fetch(`/api/tactics?${params}`)
      if (res.ok) {
        const data = await res.json()
        setTactics(data.tactics)
      }
    } catch (e) {
      console.error('Failed to load tactics:', e)
    }
  }

  async function createTactic() {
    try {
      const res = await fetch('/api/tactics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTactic),
      })
      if (res.ok) {
        setNewTactic({
          name: '',
          description: '',
          category: '',
          stage: '',
          difficulty: 'Medium',
          impact: 'Medium',
        })
        setShowCreateTactic(false)
        loadTactics()
      }
    } catch (e) {
      console.error('Failed to create tactic:', e)
    }
  }

  async function createCompany() {
    try {
      const res = await fetch('/api/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCompany),
      })
      if (res.ok) {
        setNewCompany({ name: '', description: '', industry: '', website: '' })
        setShowCreateCompany(false)
        loadCompanies()
      }
    } catch (e) {
      console.error('Failed to create company:', e)
    }
  }

  async function deleteCompany(id: string) {
    if (!confirm('Delete this company?')) return
    try {
      const res = await fetch(`/api/companies/${id}`, { method: 'DELETE' })
      if (res.ok) {
        loadCompanies()
        if (selectedCompany?.id === id) {
          setSelectedCompany(null)
          setViewMode('companies')
        }
      }
    } catch (e) {
      console.error('Failed to delete company:', e)
    }
  }

  const selectCompany = async (company: Company) => {
    try {
      const res = await fetch(`/api/companies/${company.id}`)
      if (res.ok) {
        const fullCompany = await res.json()
        setSelectedCompany(fullCompany)
        setViewMode('detail')
        if (fullCompany.funnels && fullCompany.funnels.length > 0) {
          const displayFunnel = toDisplayFunnel(fullCompany.funnels[0])
          setFunnel(displayFunnel)
          // Also set in analytics context for planning metrics
          setContextSelectedFunnel && setContextSelectedFunnel(displayFunnel)
        }
      }
    } catch (e) {
      console.error('Failed to load company details:', e)
    }
  }

  const selectFunnel = (mf: MarketingFunnel) => {
    setSelectedFunnel(mf)
    const displayFunnel = toDisplayFunnel(mf)
    setFunnel(displayFunnel)
    // Also set funnel in analytics context for planning metrics
    setContextSelectedFunnel && setContextSelectedFunnel(displayFunnel)
    setViewMode('detail')
  }

  const TYPES = ['Awareness', 'Acquisition', 'Activation', 'Retention', 'Referral', 'Revenue']
  const IMPACTS = ['Moderate', 'Moderate to High']
  const INDUSTRIES = ['Software', 'E-commerce', 'Finance', 'Healthcare', 'Education', 'Marketing', 'Other']
  const CATEGORIES = ['Acquisition', 'Revenue', 'Retention', 'Referral', 'Nurturing', 'Activation']
  const DIFFICULTIES = ['Easy', 'Medium', 'Hard']
  const STAGES = ['Interest', 'Consideration', 'Decision', 'Activation', 'Advocacy', 'General']

  return (
    <div className="app">
      <header className="app-header" role="banner">
        <div className="header-brand">
          <div className="brand-logo" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className="brand-text">
            <h1>Funnels Visualizer</h1>
            <p className="brand-tagline">Marketing strategies to conversion funnels</p>
          </div>
        </div>

        <nav className="header-nav" role="navigation" aria-label="Main navigation">
          <button
            className="nav-btn"
            onClick={() => setViewMode('companies')}
            data-active={viewMode === 'companies'}
            aria-current={viewMode === 'companies' ? 'page' : undefined}
          >
            <svg className="nav-icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z"/>
          </svg>
            <span>Companies</span>
          </button>
          <button
            className="nav-btn"
            onClick={() => setViewMode('strategies')}
            data-active={viewMode === 'strategies'}
            aria-current={viewMode === 'strategies' ? 'page' : undefined}
          >
            <svg className="nav-icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z"/>
          </svg>
            <span>Funnels</span>
          </button>
          <button
            className="nav-btn"
            onClick={() => setViewMode('tactics')}
            data-active={viewMode === 'tactics'}
            aria-current={viewMode === 'tactics' ? 'page' : undefined}
          >
            <svg className="nav-icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd"/>
            </svg>
            <span>Playbook</span>
          </button>
          <button
            className="nav-btn"
            onClick={() => setViewMode('builder')}
            data-active={viewMode === 'builder'}
            aria-current={viewMode === 'builder' ? 'page' : undefined}
          >
            <svg className="nav-icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd"/>
            </svg>
            <span>Builder</span>
          </button>
          <button
            className="nav-btn"
            onClick={() => setViewMode('analytics')}
            data-active={viewMode === 'analytics'}
            aria-current={viewMode === 'analytics' ? 'page' : undefined}
          >
            <svg className="nav-icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z"/>
            </svg>
            <span>Analytics</span>
          </button>
        </nav>

        <div className="header-actions">
          <button
            className="theme-toggle"
            onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')}
            title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
            aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
          >
            {theme === 'light' ? (
              <svg className="theme-icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"/>
              </svg>
            ) : (
              <svg className="theme-icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd"/>
              </svg>
            )}
          </button>
        </div>
      </header>

      {/* COMPANIES VIEW */}
      {viewMode === 'companies' && (
        <>
          <div className="filters">
            <button className="btn-primary" onClick={() => setShowCreateCompany(true)}>
              + New Company
            </button>
          </div>

          <main className="app-main funnel-list">
            {companies.map(company => (
              <div
                key={company.id}
                className="funnel-list-item company-card"
                onClick={() => handleCompanySelect(company)}
              >
                <div className="funnel-item-header">
                  <h3>{company.name}</h3>
                  <span className="badge">{company.industry}</span>
                </div>
                <p className="funnel-item-desc">{company.description}</p>
                <div className="funnel-item-meta">
                  <span>{company.funnelsCount || company.funnels?.length || 0} funnels</span>
                  <button
                    className="btn-icon btn-danger"
                    onClick={(e) => { e.stopPropagation(); deleteCompany(company.id) }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </main>

          {showCreateCompany && (
            <div className="modal-overlay" onClick={() => setShowCreateCompany(false)}>
              <div className="modal-content" onClick={e => e.stopPropagation()}>
                <button className="modal-close" onClick={() => setShowCreateCompany(false)}>&times;</button>
                <h2>Create Company</h2>
                <div className="form-group">
                  <label>Name</label>
                  <input
                    type="text"
                    value={newCompany.name}
                    onChange={e => setNewCompany({...newCompany, name: e.target.value})}
                    placeholder="Company name"
                  />
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <input
                    type="text"
                    value={newCompany.description}
                    onChange={e => setNewCompany({...newCompany, description: e.target.value})}
                    placeholder="What does the company do?"
                  />
                </div>
                <div className="form-group">
                  <label>Industry</label>
                  <select
                    value={newCompany.industry}
                    onChange={e => setNewCompany({...newCompany, industry: e.target.value})}
                  >
                    <option value="">Select industry...</option>
                    {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Website (optional)</label>
                  <input
                    type="text"
                    value={newCompany.website}
                    onChange={e => setNewCompany({...newCompany, website: e.target.value})}
                    placeholder="https://example.com"
                  />
                </div>
                <button className="btn-primary" onClick={handleCreateCompany}>
                  Create Company
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* STRATEGIES VIEW */}
      {viewMode === 'strategies' && (
        <>
          <div className="filters">
            <input
              type="text"
              placeholder="Search funnels..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              className="search-input"
            />
            <select
              value={typeFilter}
              onChange={e => { setTypeFilter(e.target.value); setPage(1) }}
              className="filter-select"
            >
              <option value="">All Types</option>
              {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <main className="app-main funnel-list">
            {marketingFunnels.map(mf => (
              <div
                key={mf.id}
                className="funnel-list-item"
                onClick={() => handleFunnelSelect(mf)}
              >
                <div className="funnel-item-header">
                  <h3>{mf.strategy}</h3>
                  <span className={`badge badge-${mf.impact.toLowerCase().replace(/\s/g, '-')}`}>
                    {mf.impact}
                  </span>
                </div>
                <p className="funnel-item-desc">{mf.description.substring(0, 100)}...</p>
                <div className="funnel-item-meta">
                  <span>{mf.types.join(', ')}</span>
                  <span>{mf.stages.length} stages</span>
                </div>
              </div>
            ))}
          </main>

          <div className="pagination">
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)}>
              ← Previous
            </button>
            <span>Page {page}</span>
            <button disabled={marketingFunnels.length < 20} onClick={() => setPage(p => p + 1)}>
              Next →
            </button>
          </div>
        </>
      )}

      {/* TACTICS VIEW */}
      {viewMode === 'tactics' && (
        <>
          <div className="filters">
            <input
              type="text"
              placeholder="Search playbook..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="search-input"
            />
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="filter-select"
            >
              <option value="">All Categories</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select
              value={difficultyFilter}
              onChange={e => setDifficultyFilter(e.target.value)}
              className="filter-select"
            >
              <option value="">All Difficulties</option>
              {DIFFICULTIES.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <button className="btn-primary" onClick={() => setShowCreateTactic(true)}>
              + New Play
            </button>
          </div>

          <main className="app-main funnel-list">
            {tactics.map(tactic => (
              <div
                key={tactic.id}
                className="funnel-list-item tactic-card"
                onClick={() => setSelectedTactic(tactic)}
              >
                <div className="funnel-item-header">
                  <h3>{tactic.name}</h3>
                  <div className="tactic-badges">
                    <span className="badge">{tactic.category}</span>
                    <span className={`badge difficulty-${tactic.difficulty.toLowerCase()}`}>
                      {tactic.difficulty}
                    </span>
                    <span className={`badge impact-${tactic.impact.toLowerCase()}`}>
                      {tactic.impact}
                    </span>
                  </div>
                </div>
                <p className="funnel-item-desc">{tactic.description}</p>
                <div className="funnel-item-meta">
                  <span>Stage: {tactic.stage}</span>
                  <button
                    className="btn-primary btn-small"
                    onClick={(e) => {
                      e.stopPropagation()
                      // Copy tactic template to clipboard
                      navigator.clipboard.writeText(JSON.stringify(tactic.template, null, 2))
                      alert('Template copied!')
                    }}
                  >
                    Copy Template
                  </button>
                </div>
              </div>
            ))}
          </main>

          {showCreateTactic && (
            <div className="modal-overlay" onClick={() => setShowCreateTactic(false)}>
              <div className="modal-content" onClick={e => e.stopPropagation()}>
                <button className="modal-close" onClick={() => setShowCreateTactic(false)}>&times;</button>
                <h2>Create Play</h2>
                <div className="form-group">
                  <label>Name</label>
                  <input
                    type="text"
                    value={newTactic.name}
                    onChange={e => setNewTactic({...newTactic, name: e.target.value})}
                    placeholder="Tactic name"
                  />
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <input
                    type="text"
                    value={newTactic.description}
                    onChange={e => setNewTactic({...newTactic, description: e.target.value})}
                    placeholder="What does this tactic do?"
                  />
                </div>
                <div className="form-group">
                  <label>Category</label>
                  <select
                    value={newTactic.category}
                    onChange={e => setNewTactic({...newTactic, category: e.target.value})}
                  >
                    <option value="">Select category...</option>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Stage</label>
                  <select
                    value={newTactic.stage}
                    onChange={e => setNewTactic({...newTactic, stage: e.target.value})}
                  >
                    <option value="">Select stage...</option>
                    {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Difficulty</label>
                  <select
                    value={newTactic.difficulty}
                    onChange={e => setNewTactic({...newTactic, difficulty: e.target.value})}
                  >
                    {DIFFICULTIES.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Impact</label>
                  <select
                    value={newTactic.impact}
                    onChange={e => setNewTactic({...newTactic, impact: e.target.value})}
                  >
                    {['Low', 'Medium', 'High'].map(i => <option key={i} value={i}>{i}</option>)}
                  </select>
                </div>
                <button className="btn-primary" onClick={handleCreateTactic}>
                  Create Play
                </button>
              </div>
            </div>
          )}

          {selectedTactic && (
            <div className="modal-overlay" onClick={() => setSelectedTactic(null)}>
              <div className="modal-content" onClick={e => e.stopPropagation()}>
                <button className="modal-close" onClick={() => setSelectedTactic(null)}>&times;</button>
                <h2>{selectedTactic.name}</h2>
                <p>{selectedTactic.description}</p>
                <div className="detail-meta">
                  <span className="badge">{selectedTactic.category}</span>
                  <span className="badge">{selectedTactic.stage}</span>
                  <span className="badge">{selectedTactic.difficulty}</span>
                  <span className="badge">{selectedTactic.impact}</span>
                </div>
                <div className="template-view">
                  <h4>Template</h4>
                  <pre>{JSON.stringify(selectedTactic.template, null, 2)}</pre>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* DETAIL VIEW */}
      {viewMode === 'detail' && (
        <main className="app-main">
          <button className="back-btn" onClick={() => setViewMode(selectedCompany ? 'companies' : 'strategies')}>
            ← Back
          </button>

          {selectedCompany && (
            <div className="detail-header">
              <h2>{selectedCompany.name}</h2>
              <p>{selectedCompany.description}</p>
              <div className="detail-meta">
                <span className="badge">{selectedCompany.industry}</span>
                <span className="badge">{selectedCompany.funnels.length} funnels</span>
              </div>

              {/* Company funnels tabs */}
              <div className="funnel-tabs">
                {selectedCompany.funnels.map((f, i) => (
                  <button
                    key={f.id}
                    className={`tab ${funnel.name === f.name ? 'active' : ''}`}
                    onClick={() => setFunnel(toDisplayFunnel(f))}
                  >
                    {f.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {selectedFunnel && !selectedCompany && (
            <div className="detail-header">
              <h2>{selectedFunnel.strategy}</h2>
              <p>{selectedFunnel.description}</p>
              <div className="detail-meta">
                <span className="badge">{selectedFunnel.types.join(', ')}</span>
                <span className="badge">{selectedFunnel.impact}</span>
              </div>
            </div>
          )}

          <FunnelVisualization funnel={funnel} />
        </main>
      )}

      {/* BUILDER VIEW */}
      {viewMode === 'builder' && (
        <main className="app-main">
          <div className="builder-layout">
            <div className="builder-panel">
              <FunnelBuilder funnel={funnel} onChange={setFunnel} />
            </div>
            <div className="preview-panel">
              <div className="preview-label">Live Preview</div>
              <FunnelVisualization funnel={funnel} />
            </div>
          </div>
        </main>
      )}

      {/* ANALYTICS VIEW */}
      {viewMode === 'analytics' && (
        <main className="app-main">
          <AnalyticsDashboard compact={false} showCohorts={true} />
        </main>
      )}
    </div>
  )
}
