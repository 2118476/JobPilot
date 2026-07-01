import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Play,
  Check,
  RefreshCw,
  Clock,
  Search,
  MapPin,
  Globe,
  XCircle,
  Filter,
  X,
  Plus,
  ChevronDown,
  AlertTriangle,
  CheckCircle2,
  Wifi,
  WifiOff,
  Activity,
  Sparkles,
} from 'lucide-react'
import { mockSearchSettings } from '@/data/mockData'
import { searchJobs } from '@/lib/api'
import { useUIStore } from '@/store/uiStore'

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

interface JobSource {
  id: string
  name: string
  enabled: boolean
  status: 'healthy' | 'rate_limited' | 'error' | 'disabled'
  lastChecked: string
  jobsToday: number
  jobsThisWeek: number
}

interface SearchSettingsState {
  search_active: boolean
  keywords: string[]
  exclusions: string[]
  excludedCompanies: string[]
  excludedTitles: string[]
  preferred_locations: string[]
  remote_preference: 'remote' | 'onsite' | 'hybrid' | 'no_preference'
  salary_min: number
  salary_max: number
  currency: string
  frequency: string
  morningTime: string
  eveningTime: string
  dailySearchLimit: number
  sources: JobSource[]
  seniorityLevels: string[]
  roleTypes: string[]
  workArrangements: string[]
  dateFilter: string
  salaryMinimum: number
  datePostedFilter: string
  jobTitles: string[]
}

// ─────────────────────────────────────────────
// Default keywords from design spec
// ─────────────────────────────────────────────

const DEFAULT_KEYWORDS = [
  'junior software developer London',
  'graduate software developer London',
  'entry level software developer UK',
  'Java developer junior London',
  'Spring Boot developer junior',
  'React developer junior remote',
  'full stack developer junior London',
  'backend developer junior Java',
  'SQL developer junior London',
  'database assistant SQL London',
  'data assistant SQL London',
  'IT support entry level London',
  'technical support analyst junior',
  'Civil Service digital developer',
  'public sector junior developer',
  'junior web developer London',
  'graduate full stack developer UK',
]

const DEFAULT_JOB_TITLES = [
  'Junior Software Developer',
  'Graduate Software Developer',
  'Full Stack Developer',
  'Backend Developer',
  'Java Developer',
  'React Developer',
  'Database Assistant',
  'Data Assistant',
  'IT Support',
  'Technical Support Analyst',
]

const DEFAULT_EXCLUDED_TITLES = [
  'Senior',
  'Lead',
  'Principal',
  'Head of',
  'Manager',
  'Director',
  'VP',
  '5+ years',
  '10+ years',
]

const DEFAULT_EXCLUDED_KEYWORDS = [
  'Senior',
  'Principal',
  '10 years experience',
  'Extensive commercial',
]

const DEFAULT_EXCLUDED_COMPANIES: string[] = []

// ─────────────────────────────────────────────
// Default job sources (14 sources)
// ─────────────────────────────────────────────

const DEFAULT_SOURCES: JobSource[] = [
  { id: 'adzuna', name: 'Adzuna', enabled: true, status: 'healthy', lastChecked: '2 hours ago', jobsToday: 3, jobsThisWeek: 15 },
  { id: 'reed', name: 'Reed', enabled: true, status: 'healthy', lastChecked: '1 hour ago', jobsToday: 4, jobsThisWeek: 22 },
  { id: 'govuk', name: 'GOV.UK Find a Job', enabled: true, status: 'healthy', lastChecked: '3 hours ago', jobsToday: 2, jobsThisWeek: 8 },
  { id: 'civil-service', name: 'Civil Service Jobs', enabled: true, status: 'healthy', lastChecked: '4 hours ago', jobsToday: 1, jobsThisWeek: 6 },
  { id: 'nhs', name: 'NHS Jobs', enabled: true, status: 'healthy', lastChecked: '2 hours ago', jobsToday: 2, jobsThisWeek: 10 },
  { id: 'linkedin', name: 'LinkedIn', enabled: true, status: 'healthy', lastChecked: '30 mins ago', jobsToday: 8, jobsThisWeek: 45 },
  { id: 'indeed', name: 'Indeed', enabled: true, status: 'rate_limited', lastChecked: '5 hours ago', jobsToday: 0, jobsThisWeek: 18 },
  { id: 'totaljobs', name: 'Totaljobs', enabled: true, status: 'healthy', lastChecked: '1 hour ago', jobsToday: 3, jobsThisWeek: 14 },
  { id: 'cwjobs', name: 'CWJobs', enabled: true, status: 'healthy', lastChecked: '2 hours ago', jobsToday: 2, jobsThisWeek: 9 },
  { id: 'otta', name: 'Otta', enabled: false, status: 'disabled', lastChecked: 'Never', jobsToday: 0, jobsThisWeek: 0 },
  { id: 'company-careers', name: 'Company Career Pages', enabled: false, status: 'disabled', lastChecked: 'Never', jobsToday: 0, jobsThisWeek: 0 },
  { id: 'local-council', name: 'Local Council Jobs', enabled: false, status: 'disabled', lastChecked: 'Never', jobsToday: 0, jobsThisWeek: 0 },
  { id: 'public-sector-digital', name: 'Public Sector Digital', enabled: false, status: 'disabled', lastChecked: 'Never', jobsToday: 0, jobsThisWeek: 0 },
  { id: 'remote-boards', name: 'Remote Job Boards', enabled: false, status: 'disabled', lastChecked: 'Never', jobsToday: 0, jobsThisWeek: 0 },
]

// ─────────────────────────────────────────────
// Animation config
// ─────────────────────────────────────────────

const easeOutExpo = [0.16, 1, 0.3, 1] as [number, number, number, number]

const staggerContainer = {
  animate: { transition: { staggerChildren: 0.06 } },
}

const staggerItem = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: easeOutExpo } },
}

// ─────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────

export default function SearchSettings() {
  const navigate = useNavigate()
  const addToast = useUIStore((s) => s.addToast)
  const [settings, setSettings] = useState<SearchSettingsState>({
    search_active: mockSearchSettings.search_active,
    keywords: [...DEFAULT_KEYWORDS],
    exclusions: [...DEFAULT_EXCLUDED_KEYWORDS],
    excludedCompanies: [...DEFAULT_EXCLUDED_COMPANIES],
    excludedTitles: [...DEFAULT_EXCLUDED_TITLES],
    preferred_locations: [...mockSearchSettings.preferred_locations],
    remote_preference: mockSearchSettings.remote_preference,
    salary_min: mockSearchSettings.salary_min ?? 20000,
    salary_max: mockSearchSettings.salary_max ?? 40000,
    currency: mockSearchSettings.currency,
    frequency: 'twice_daily',
    morningTime: '08:00',
    eveningTime: '18:00',
    dailySearchLimit: 30,
    sources: DEFAULT_SOURCES.map((s) => ({ ...s })),
    seniorityLevels: ['entry-level', 'junior'],
    roleTypes: ['software_developer', 'tech_support', 'data_database', 'public_sector', 'graduate'],
    workArrangements: ['remote', 'hybrid'],
    dateFilter: '7',
    salaryMinimum: 20000,
    datePostedFilter: '7',
    jobTitles: [...DEFAULT_JOB_TITLES],
  })

  const [hasChanges, setHasChanges] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [searchResult, setSearchResult] = useState<string | null>(null)
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    schedule: true,
    keywords: true,
    locations: true,
    sources: true,
    exclusions: true,
    filters: true,
  })

  // Track changes
  useEffect(() => {
    setHasChanges(true)
  }, [settings])

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }))
  }

  const updateSetting = useCallback(<K extends keyof SearchSettingsState>(key: K, value: SearchSettingsState[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }))
    setHasChanges(true)
  }, [])

  const handleSave = () => {
    setHasChanges(false)
    try {
      localStorage.setItem('jobpilot_search_settings', JSON.stringify(settings))
    } catch { /* localStorage unavailable */ }
    addToast({ type: 'success', title: 'Settings saved', message: 'Your search preferences have been stored.' })
  }

  // Restore saved settings on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem('jobpilot_search_settings')
      if (raw) {
        setSettings((prev) => ({ ...prev, ...JSON.parse(raw) }))
        setHasChanges(false)
      }
    } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleReset = () => {
    setSettings({
      search_active: true,
      keywords: [...DEFAULT_KEYWORDS],
      exclusions: [...DEFAULT_EXCLUDED_KEYWORDS],
      excludedCompanies: [...DEFAULT_EXCLUDED_COMPANIES],
      excludedTitles: [...DEFAULT_EXCLUDED_TITLES],
      preferred_locations: ['London', 'Remote UK', 'Hybrid'],
      remote_preference: 'remote',
      salary_min: 20000,
      salary_max: 40000,
      currency: 'GBP',
      frequency: 'twice_daily',
      morningTime: '08:00',
      eveningTime: '18:00',
      dailySearchLimit: 30,
      sources: DEFAULT_SOURCES.map((s) => ({ ...s })),
      seniorityLevels: ['entry-level', 'junior'],
      roleTypes: ['software_developer', 'tech_support', 'data_database', 'public_sector', 'graduate'],
      workArrangements: ['remote', 'hybrid'],
      dateFilter: '7',
      salaryMinimum: 20000,
      datePostedFilter: '7',
      jobTitles: [...DEFAULT_JOB_TITLES],
    })
    setHasChanges(true)
  }

  const handleRunSearch = async () => {
    setIsSearching(true)
    setSearchResult(null)
    const location = settings.preferred_locations[0] || 'London, UK'
    const res = await searchJobs({ location })
    setIsSearching(false)
    if (res) {
      const strong = res.jobs.filter((j) => (j.match_score || 0) >= 85).length
      setSearchResult(
        `Found ${res.total} jobs (${res.added} new, ${res.scored} freshly scored) — ${strong} strong match${strong === 1 ? '' : 'es'}.`,
      )
      addToast({
        type: 'success',
        title: 'Search complete',
        message: `${res.added} new jobs added. Opening your Jobs list…`,
      })
      setTimeout(() => navigate('/jobs'), 1200)
    } else {
      setSearchResult('Could not reach the search backend. Make sure the server is running (npm run dev:all).')
      addToast({ type: 'error', title: 'Search failed', message: 'Backend unreachable — start it with npm run dev:all.' })
      setTimeout(() => setSearchResult(null), 6000)
    }
  }

  const toggleSource = (sourceId: string) => {
    setSettings((prev) => ({
      ...prev,
      sources: prev.sources.map((s) =>
        s.id === sourceId ? { ...s, enabled: !s.enabled, status: !s.enabled ? ('healthy' as const) : ('disabled' as const) } : s
      ),
    }))
  }

  const healthySources = settings.sources.filter((s) => s.status === 'healthy').length
  const totalEnabledSources = settings.sources.filter((s) => s.enabled).length

  // ── Tag Input helpers ──
  const addTag = (field: 'keywords' | 'exclusions' | 'excludedCompanies' | 'excludedTitles' | 'preferred_locations' | 'jobTitles', value: string) => {
    if (!value.trim()) return
    setSettings((prev) => ({
      ...prev,
      [field]: [...prev[field], value.trim()],
    }))
  }

  const removeTag = (field: 'keywords' | 'exclusions' | 'excludedCompanies' | 'excludedTitles' | 'preferred_locations' | 'jobTitles', value: string) => {
    setSettings((prev) => ({
      ...prev,
      [field]: prev[field].filter((item) => item !== value),
    }))
  }

  return (
    <motion.div
      className="space-y-6 pb-24"
      variants={staggerContainer}
      initial="initial"
      animate="animate"
    >
      {/* ── Page Title ── */}
      <motion.div variants={staggerItem}>
        <h1 className="font-heading text-display-md font-semibold text-text-primary tracking-tight">
          Search Settings
        </h1>
        <p className="text-body-md text-text-secondary mt-1">
          Configure your job search agent — when it runs, what it looks for, and where it searches.
        </p>
      </motion.div>

      {/* ── Section 1: Master Switch ── */}
      <motion.div
        variants={staggerItem}
        className={`rounded-card-lg border p-6 transition-colors duration-300 ${
          settings.search_active
            ? 'bg-accent-indigo-muted/30 border-accent-indigo/20'
            : 'bg-bg-secondary border-border-subtle'
        }`}
      >
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            {/* Large Toggle */}
            <button
              onClick={() => updateSetting('search_active', !settings.search_active)}
              className={`relative w-[52px] h-[28px] rounded-full transition-colors duration-200 flex-shrink-0 ${
                settings.search_active ? 'bg-accent-indigo' : 'bg-bg-tertiary border border-border-default'
              }`}
              aria-label="Toggle search agent"
            >
              <motion.span
                className="absolute top-[2px] left-[2px] w-6 h-6 rounded-full bg-white shadow-md"
                animate={{ x: settings.search_active ? 24 : 0 }}
                transition={{ duration: 0.2, ease: easeOutExpo }}
              />
            </button>
            <div>
              <h2 className="font-heading text-heading-lg font-semibold text-text-primary">
                Search Agent
              </h2>
              <div className="flex items-center gap-2 mt-1">
                {settings.search_active ? (
                  <>
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-emerald opacity-75" />
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-accent-emerald" />
                    </span>
                    <span className="text-body-sm text-accent-emerald font-medium">Agent is ACTIVE</span>
                  </>
                ) : (
                  <>
                    <span className="inline-flex rounded-full h-2.5 w-2.5 bg-accent-amber" />
                    <span className="text-body-sm text-accent-amber font-medium">Agent is PAUSED</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Run Search Now */}
          <button
            onClick={handleRunSearch}
            disabled={isSearching}
            className="flex items-center gap-2 px-6 py-3 rounded-button bg-accent-indigo text-white font-medium text-sm hover:bg-accent-indigo-hover hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-accent-indigo/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSearching ? (
              <>
                <RefreshCw size={16} className="animate-spin-slow" />
                Searching...
              </>
            ) : (
              <>
                <Play size={16} />
                Run Search Now
              </>
            )}
          </button>
        </div>

        {/* Status Details */}
        <div className="flex flex-wrap gap-x-8 gap-y-2 mt-4 pt-4 border-t border-border-subtle/50">
          <div>
            <span className="text-body-xs text-text-muted">Last run: </span>
            <span className="text-body-xs text-text-secondary">Today at 10:00 AM</span>
          </div>
          <div>
            <span className="text-body-xs text-text-muted">Next run: </span>
            <span className="text-body-xs text-text-secondary">
              {settings.search_active ? `Today at ${settings.eveningTime}` : '—'}
            </span>
          </div>
          <div>
            <span className="text-body-xs text-text-muted">Jobs found today: </span>
            <span className="text-body-xs text-accent-cyan font-medium">12</span>
          </div>
          <div>
            <span className="text-body-xs text-text-muted">Sources checked: </span>
            <span className="text-body-xs text-accent-emerald font-medium">
              {healthySources}/{totalEnabledSources} healthy
            </span>
          </div>
        </div>

        {/* Search Result Flash */}
        <AnimatePresence>
          {searchResult && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 p-3 rounded-lg bg-accent-emerald-muted border border-accent-emerald/20 flex items-center gap-2"
            >
              <CheckCircle2 size={16} className="text-accent-emerald flex-shrink-0" />
              <span className="text-body-sm text-accent-emerald font-medium">{searchResult}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* API Warning */}
        <div className="mt-4 p-3 rounded-lg bg-accent-amber-muted border border-accent-amber/20 flex items-center gap-2">
          <AlertTriangle size={16} className="text-accent-amber flex-shrink-0" />
          <span className="text-body-xs text-accent-amber">
            API limit at 80% — consider reducing frequency or daily search limit.
          </span>
        </div>
      </motion.div>

      {/* ── Section 2: Schedule ── */}
      <motion.div variants={staggerItem} className="rounded-card-lg border border-border-subtle bg-bg-secondary overflow-hidden">
        <button
          onClick={() => toggleSection('schedule')}
          className="w-full flex items-center justify-between p-5 hover:bg-bg-tertiary/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Clock size={20} className="text-accent-indigo" />
            <h3 className="font-heading text-heading-lg font-semibold text-text-primary">Search Schedule</h3>
          </div>
          <motion.div animate={{ rotate: expandedSections.schedule ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronDown size={18} className="text-text-muted" />
          </motion.div>
        </button>
        <AnimatePresence>
          {expandedSections.schedule && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: easeOutExpo }}
              className="overflow-hidden"
            >
              <div className="p-5 pt-0 space-y-5">
                {/* Frequency */}
                <div>
                  <label className="block text-body-sm font-medium text-text-secondary mb-2">Search Frequency</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { key: 'twice_daily', label: 'Twice daily' },
                      { key: 'daily', label: 'Once daily' },
                      { key: 'every_6h', label: 'Every 6 hours' },
                      { key: 'manual', label: 'Manual only' },
                    ].map((opt) => (
                      <button
                        key={opt.key}
                        onClick={() => updateSetting('frequency', opt.key)}
                        className={`px-4 py-2.5 rounded-button text-sm font-medium transition-all ${
                          settings.frequency === opt.key
                            ? 'bg-accent-indigo text-white shadow-md shadow-accent-indigo/20'
                            : 'bg-bg-tertiary text-text-secondary border border-border-default hover:border-border-focus'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Time Pickers */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-body-sm font-medium text-text-secondary mb-2">Morning Search</label>
                    <input
                      type="time"
                      value={settings.morningTime}
                      onChange={(e) => updateSetting('morningTime', e.target.value)}
                      className="w-full h-10 px-3 rounded-input bg-bg-tertiary border border-border-default text-sm text-text-primary focus:border-accent-indigo focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-body-sm font-medium text-text-secondary mb-2">Evening Search</label>
                    <input
                      type="time"
                      value={settings.eveningTime}
                      onChange={(e) => updateSetting('eveningTime', e.target.value)}
                      className="w-full h-10 px-3 rounded-input bg-bg-tertiary border border-border-default text-sm text-text-primary focus:border-accent-indigo focus:outline-none"
                    />
                  </div>
                </div>

                {/* Daily Search Limit Slider */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-body-sm font-medium text-text-secondary">Daily Search Limit</label>
                    <span className="text-mono-sm text-accent-indigo font-medium">{settings.dailySearchLimit}</span>
                  </div>
                  <input
                    type="range"
                    min={10}
                    max={100}
                    value={settings.dailySearchLimit}
                    onChange={(e) => updateSetting('dailySearchLimit', parseInt(e.target.value))}
                    className="w-full h-2 rounded-full appearance-none cursor-pointer bg-bg-elevated accent-accent-indigo"
                  />
                  <div className="flex justify-between mt-1">
                    <span className="text-body-xs text-text-muted">10</span>
                    <span className="text-body-xs text-text-muted">100</span>
                  </div>
                  <p className="text-body-xs text-text-muted mt-1">
                    Limit API calls to stay within free tiers. Current: ~{settings.dailySearchLimit}/day.
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ── Section 3: Keywords & Job Titles ── */}
      <motion.div variants={staggerItem} className="rounded-card-lg border border-border-subtle bg-bg-secondary overflow-hidden">
        <button
          onClick={() => toggleSection('keywords')}
          className="w-full flex items-center justify-between p-5 hover:bg-bg-tertiary/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Search size={20} className="text-accent-indigo" />
            <h3 className="font-heading text-heading-lg font-semibold text-text-primary">Keywords &amp; Job Titles</h3>
          </div>
          <motion.div animate={{ rotate: expandedSections.keywords ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronDown size={18} className="text-text-muted" />
          </motion.div>
        </button>
        <AnimatePresence>
          {expandedSections.keywords && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: easeOutExpo }}
              className="overflow-hidden"
            >
              <div className="p-5 pt-0 space-y-5">
                {/* Search Keywords */}
                <TagInput
                  label="Search Keywords"
                  description="These keywords are used to find jobs across all sources."
                  tags={settings.keywords}
                  onAdd={(val) => addTag('keywords', val)}
                  onRemove={(val) => removeTag('keywords', val)}
                  tagColor="indigo"
                  placeholder="Add keyword..."
                />

                {/* Preferred Job Titles */}
                <TagInput
                  label="Preferred Job Titles"
                  description="Jobs with these titles get a relevance boost."
                  tags={settings.jobTitles}
                  onAdd={(val) => addTag('jobTitles', val)}
                  onRemove={(val) => removeTag('jobTitles', val)}
                  tagColor="cyan"
                  placeholder="Add job title..."
                />

                {/* Query Preview */}
                <div className="p-4 rounded-lg bg-bg-tertiary border border-border-subtle">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles size={14} className="text-accent-violet" />
                    <span className="text-body-xs font-medium text-text-secondary">Generated Query Preview</span>
                  </div>
                  <p className="text-body-xs text-text-muted font-mono leading-relaxed">
                    &ldquo;junior software developer London&rdquo;, &ldquo;graduate software developer London&rdquo;, &ldquo;entry level Java developer UK&rdquo;
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ── Section 4: Locations & Preferences ── */}
      <motion.div variants={staggerItem} className="rounded-card-lg border border-border-subtle bg-bg-secondary overflow-hidden">
        <button
          onClick={() => toggleSection('locations')}
          className="w-full flex items-center justify-between p-5 hover:bg-bg-tertiary/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <MapPin size={20} className="text-accent-indigo" />
            <h3 className="font-heading text-heading-lg font-semibold text-text-primary">Locations &amp; Preferences</h3>
          </div>
          <motion.div animate={{ rotate: expandedSections.locations ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronDown size={18} className="text-text-muted" />
          </motion.div>
        </button>
        <AnimatePresence>
          {expandedSections.locations && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: easeOutExpo }}
              className="overflow-hidden"
            >
              <div className="p-5 pt-0 space-y-5">
                {/* Preferred Locations */}
                <TagInput
                  label="Preferred Locations"
                  tags={settings.preferred_locations}
                  onAdd={(val) => addTag('preferred_locations', val)}
                  onRemove={(val) => removeTag('preferred_locations', val)}
                  tagColor="indigo"
                  placeholder="Add location..."
                />

                {/* Work Arrangement */}
                <div>
                  <label className="block text-body-sm font-medium text-text-secondary mb-2">Work Arrangement</label>
                  <div className="flex flex-wrap gap-3">
                    {[
                      { key: 'remote', label: 'Remote' },
                      { key: 'hybrid', label: 'Hybrid' },
                      { key: 'onsite', label: 'On-site' },
                    ].map((opt) => (
                      <label key={opt.key} className="flex items-center gap-2 cursor-pointer group">
                        <div
                          className={`w-[18px] h-[18px] rounded flex items-center justify-center border transition-colors ${
                            settings.workArrangements.includes(opt.key)
                              ? 'bg-accent-indigo border-accent-indigo'
                              : 'border-border-default bg-bg-tertiary group-hover:border-border-focus'
                          }`}
                          onClick={() => {
                            setSettings((prev) => ({
                              ...prev,
                              workArrangements: prev.workArrangements.includes(opt.key)
                                ? prev.workArrangements.filter((a) => a !== opt.key)
                                : [...prev.workArrangements, opt.key],
                            }))
                          }}
                        >
                          {settings.workArrangements.includes(opt.key) && <Check size={12} className="text-white" />}
                        </div>
                        <span className="text-body-sm text-text-primary">{opt.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Salary Minimum */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-body-sm font-medium text-text-secondary mb-2">Salary Minimum ({settings.currency})</label>
                    <input
                      type="number"
                      value={settings.salary_min}
                      onChange={(e) => updateSetting('salary_min', parseInt(e.target.value) || 0)}
                      className="w-full h-10 px-3 rounded-input bg-bg-tertiary border border-border-default text-sm text-text-primary focus:border-accent-indigo focus:outline-none"
                    />
                    <input
                      type="range"
                      min={15000}
                      max={50000}
                      step={1000}
                      value={settings.salary_min}
                      onChange={(e) => updateSetting('salary_min', parseInt(e.target.value))}
                      className="w-full h-1.5 mt-2 rounded-full appearance-none cursor-pointer bg-bg-elevated accent-accent-indigo"
                    />
                  </div>
                  <div>
                    <label className="block text-body-sm font-medium text-text-secondary mb-2">Date Posted Filter</label>
                    <select
                      value={settings.datePostedFilter}
                      onChange={(e) => updateSetting('datePostedFilter', e.target.value)}
                      className="w-full h-10 px-3 rounded-input bg-bg-tertiary border border-border-default text-sm text-text-primary focus:border-accent-indigo focus:outline-none"
                    >
                      <option value="any">Any time</option>
                      <option value="1">Last 24 hours</option>
                      <option value="3">Last 3 days</option>
                      <option value="7">Last 7 days</option>
                      <option value="14">Last 14 days</option>
                    </select>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ── Section 5: Job Sources ── */}
      <motion.div variants={staggerItem} className="rounded-card-lg border border-border-subtle bg-bg-secondary overflow-hidden">
        <button
          onClick={() => toggleSection('sources')}
          className="w-full flex items-center justify-between p-5 hover:bg-bg-tertiary/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Globe size={20} className="text-accent-indigo" />
            <h3 className="font-heading text-heading-lg font-semibold text-text-primary">Job Sources</h3>
            <span className="px-2 py-0.5 rounded-full bg-bg-tertiary text-text-muted text-mono-sm">
              {settings.sources.filter((s) => s.enabled).length}/{settings.sources.length}
            </span>
          </div>
          <motion.div animate={{ rotate: expandedSections.sources ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronDown size={18} className="text-text-muted" />
          </motion.div>
        </button>
        <AnimatePresence>
          {expandedSections.sources && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: easeOutExpo }}
              className="overflow-hidden"
            >
              <div className="p-5 pt-0">
                {/* Bulk Actions */}
                <div className="flex flex-wrap gap-2 mb-4">
                  <button
                    onClick={() =>
                      setSettings((prev) => ({
                        ...prev,
                        sources: prev.sources.map((s) => ({ ...s, enabled: true, status: 'healthy' as const })),
                      }))
                    }
                    className="px-3 py-1.5 rounded-button-sm border border-border-default text-body-xs text-text-secondary hover:bg-bg-tertiary hover:border-border-focus transition-colors"
                  >
                    Enable All
                  </button>
                  <button
                    onClick={() =>
                      setSettings((prev) => ({
                        ...prev,
                        sources: prev.sources.map((s) => ({ ...s, enabled: false, status: 'disabled' as const })),
                      }))
                    }
                    className="px-3 py-1.5 rounded-button-sm border border-border-default text-body-xs text-text-secondary hover:bg-bg-tertiary hover:border-border-focus transition-colors"
                  >
                    Disable All
                  </button>
                  <button
                    onClick={() => setSettings((prev) => ({ ...prev, sources: DEFAULT_SOURCES.map((s) => ({ ...s })) }))}
                    className="px-3 py-1.5 rounded-button-sm border border-border-default text-body-xs text-text-secondary hover:bg-bg-tertiary hover:border-border-focus transition-colors"
                  >
                    Reset Defaults
                  </button>
                </div>

                {/* Sources Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {settings.sources.map((source) => (
                    <motion.div
                      key={source.id}
                      layout
                      className={`p-4 rounded-card border transition-all ${
                        source.enabled
                          ? 'bg-bg-tertiary border-border-default'
                          : 'bg-bg-secondary border-border-subtle opacity-60'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-heading text-heading-sm text-text-primary truncate">
                              {source.name}
                            </span>
                            {source.status === 'healthy' && <Wifi size={12} className="text-accent-emerald flex-shrink-0" />}
                            {source.status === 'rate_limited' && <Activity size={12} className="text-accent-amber flex-shrink-0" />}
                            {source.status === 'error' && <WifiOff size={12} className="text-accent-rose flex-shrink-0" />}
                            {source.status === 'disabled' && <WifiOff size={12} className="text-text-muted flex-shrink-0" />}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span
                              className={`inline-block w-1.5 h-1.5 rounded-full ${
                                source.status === 'healthy'
                                  ? 'bg-accent-emerald'
                                  : source.status === 'rate_limited'
                                  ? 'bg-accent-amber'
                                  : source.status === 'error'
                                  ? 'bg-accent-rose'
                                  : 'bg-text-muted'
                              }`}
                            />
                            <span className="text-body-xs text-text-muted capitalize">
                              {source.status.replace('_', ' ')}
                            </span>
                          </div>
                          <p className="text-body-xs text-text-muted mt-1">Last checked: {source.lastChecked}</p>
                          {source.enabled && (
                            <p className="text-body-xs text-text-muted">
                              {source.jobsToday} today &middot; {source.jobsThisWeek} this week
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => toggleSource(source.id)}
                          className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ml-2 ${
                            source.enabled ? 'bg-accent-indigo' : 'bg-bg-elevated border border-border-default'
                          }`}
                        >
                          <motion.span
                            className="absolute top-[2px] left-[2px] w-5 h-5 rounded-full bg-white shadow"
                            animate={{ x: source.enabled ? 20 : 0 }}
                            transition={{ duration: 0.2, ease: easeOutExpo }}
                          />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ── Section 6: Exclusions ── */}
      <motion.div variants={staggerItem} className="rounded-card-lg border border-border-subtle bg-bg-secondary overflow-hidden">
        <button
          onClick={() => toggleSection('exclusions')}
          className="w-full flex items-center justify-between p-5 hover:bg-bg-tertiary/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <XCircle size={20} className="text-accent-indigo" />
            <h3 className="font-heading text-heading-lg font-semibold text-text-primary">Exclusions</h3>
          </div>
          <motion.div animate={{ rotate: expandedSections.exclusions ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronDown size={18} className="text-text-muted" />
          </motion.div>
        </button>
        <AnimatePresence>
          {expandedSections.exclusions && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: easeOutExpo }}
              className="overflow-hidden"
            >
              <div className="p-5 pt-0 space-y-5">
                <TagInput
                  label="Excluded Companies"
                  description="Companies to never show in search results."
                  tags={settings.excludedCompanies}
                  onAdd={(val) => addTag('excludedCompanies', val)}
                  onRemove={(val) => removeTag('excludedCompanies', val)}
                  tagColor="rose"
                  placeholder="Add company to exclude..."
                />
                <TagInput
                  label="Excluded Job Titles"
                  description="Title patterns to exclude from results."
                  tags={settings.excludedTitles}
                  onAdd={(val) => addTag('excludedTitles', val)}
                  onRemove={(val) => removeTag('excludedTitles', val)}
                  tagColor="rose"
                  placeholder="Add title pattern to exclude..."
                />
                <TagInput
                  label="Excluded Keywords"
                  description="Keywords that disqualify a job from appearing."
                  tags={settings.exclusions}
                  onAdd={(val) => addTag('exclusions', val)}
                  onRemove={(val) => removeTag('exclusions', val)}
                  tagColor="rose"
                  placeholder="Add keyword to exclude..."
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ── Section 7: Role & Seniority Filters ── */}
      <motion.div variants={staggerItem} className="rounded-card-lg border border-border-subtle bg-bg-secondary overflow-hidden">
        <button
          onClick={() => toggleSection('filters')}
          className="w-full flex items-center justify-between p-5 hover:bg-bg-tertiary/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Filter size={20} className="text-accent-indigo" />
            <h3 className="font-heading text-heading-lg font-semibold text-text-primary">Role &amp; Seniority Filters</h3>
          </div>
          <motion.div animate={{ rotate: expandedSections.filters ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronDown size={18} className="text-text-muted" />
          </motion.div>
        </button>
        <AnimatePresence>
          {expandedSections.filters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: easeOutExpo }}
              className="overflow-hidden"
            >
              <div className="p-5 pt-0 space-y-5">
                {/* Seniority */}
                <div>
                  <label className="block text-body-sm font-medium text-text-secondary mb-2">Seniority Level</label>
                  <div className="flex flex-wrap gap-3">
                    {[
                      { key: 'entry-level', label: 'Entry-level' },
                      { key: 'graduate', label: 'Graduate' },
                      { key: 'junior', label: 'Junior' },
                      { key: 'mid', label: 'Mid-level' },
                      { key: 'senior', label: 'Senior' },
                      { key: 'lead', label: 'Lead' },
                    ].map((opt) => (
                      <label key={opt.key} className="flex items-center gap-2 cursor-pointer group">
                        <div
                          className={`w-[18px] h-[18px] rounded flex items-center justify-center border transition-colors ${
                            settings.seniorityLevels.includes(opt.key)
                              ? 'bg-accent-indigo border-accent-indigo'
                              : 'border-border-default bg-bg-tertiary group-hover:border-border-focus'
                          }`}
                          onClick={() => {
                            setSettings((prev) => ({
                              ...prev,
                              seniorityLevels: prev.seniorityLevels.includes(opt.key)
                                ? prev.seniorityLevels.filter((a) => a !== opt.key)
                                : [...prev.seniorityLevels, opt.key],
                            }))
                          }}
                        >
                          {settings.seniorityLevels.includes(opt.key) && <Check size={12} className="text-white" />}
                        </div>
                        <span className="text-body-sm text-text-primary">{opt.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Role Type */}
                <div>
                  <label className="block text-body-sm font-medium text-text-secondary mb-2">Role Type</label>
                  <div className="flex flex-wrap gap-3">
                    {[
                      { key: 'software_developer', label: 'Software Developer' },
                      { key: 'tech_support', label: 'Tech Support' },
                      { key: 'data_database', label: 'Data / Database' },
                      { key: 'public_sector', label: 'Public Sector' },
                      { key: 'graduate', label: 'Graduate' },
                      { key: 'internship', label: 'Internship' },
                      { key: 'apprenticeship', label: 'Apprenticeship' },
                    ].map((opt) => (
                      <label key={opt.key} className="flex items-center gap-2 cursor-pointer group">
                        <div
                          className={`w-[18px] h-[18px] rounded flex items-center justify-center border transition-colors ${
                            settings.roleTypes.includes(opt.key)
                              ? 'bg-accent-indigo border-accent-indigo'
                              : 'border-border-default bg-bg-tertiary group-hover:border-border-focus'
                          }`}
                          onClick={() => {
                            setSettings((prev) => ({
                              ...prev,
                              roleTypes: prev.roleTypes.includes(opt.key)
                                ? prev.roleTypes.filter((a) => a !== opt.key)
                                : [...prev.roleTypes, opt.key],
                            }))
                          }}
                        >
                          {settings.roleTypes.includes(opt.key) && <Check size={12} className="text-white" />}
                        </div>
                        <span className="text-body-sm text-text-primary">{opt.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ── Sticky Bottom Actions ── */}
      <AnimatePresence>
        {hasChanges && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ duration: 0.2, ease: easeOutExpo }}
            className="fixed bottom-0 left-0 right-0 lg:left-sidebar z-40 p-4 border-t border-border-subtle bg-bg-secondary/95 backdrop-blur-md"
          >
            <div className="max-w-3xl mx-auto flex items-center justify-between flex-wrap gap-3">
              <span className="text-body-xs text-accent-amber flex items-center gap-1.5">
                <AlertTriangle size={14} />
                You have unsaved changes
              </span>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleReset}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-button border border-border-default text-body-sm text-text-secondary hover:bg-bg-tertiary hover:border-border-focus transition-colors"
                >
                  <RefreshCw size={14} />
                  Reset to Defaults
                </button>
                <button
                  onClick={handleSave}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-button bg-accent-indigo text-white text-body-sm font-medium hover:bg-accent-indigo-hover hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-accent-indigo/20"
                >
                  <Check size={14} />
                  Save Settings
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ─────────────────────────────────────────────
// Tag Input Component
// ─────────────────────────────────────────────

interface TagInputProps {
  label: string
  description?: string
  tags: string[]
  onAdd: (value: string) => void
  onRemove: (value: string) => void
  tagColor: 'indigo' | 'cyan' | 'rose'
  placeholder: string
}

function TagInput({ label, description, tags, onAdd, onRemove, tagColor, placeholder }: TagInputProps) {
  const [input, setInput] = useState('')

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      if (input.trim()) {
        onAdd(input.trim())
        setInput('')
      }
    }
  }

  const handleAdd = () => {
    if (input.trim()) {
      onAdd(input.trim())
      setInput('')
    }
  }

  const colorClasses = {
    indigo: 'bg-accent-indigo-muted text-accent-indigo',
    cyan: 'bg-accent-cyan-muted text-accent-cyan',
    rose: 'bg-accent-rose-muted text-accent-rose',
  }

  return (
    <div>
      <label className="block text-body-sm font-medium text-text-secondary mb-2">{label}</label>
      {description && <p className="text-body-xs text-text-muted mb-2">{description}</p>}
      <div className="flex flex-wrap gap-2 mb-2">
        <AnimatePresence mode="popLayout">
          {tags.map((tag) => (
            <motion.span
              key={tag}
              layout
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0 }}
              transition={{ duration: 0.2, ease: easeOutExpo }}
              className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg ${colorClasses[tagColor]} text-sm`}
            >
              {tag}
              <button
                onClick={() => onRemove(tag)}
                className="hover:opacity-70 transition-opacity ml-0.5"
                aria-label={`Remove ${tag}`}
              >
                <X size={12} />
              </button>
            </motion.span>
          ))}
        </AnimatePresence>
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="flex-1 h-10 px-3 rounded-input bg-bg-tertiary border border-border-default text-sm text-text-primary placeholder:text-text-muted focus:border-accent-indigo focus:outline-none"
        />
        <button
          onClick={handleAdd}
          disabled={!input.trim()}
          className="h-10 px-3 rounded-button bg-accent-indigo text-white hover:bg-accent-indigo-hover transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <Plus size={16} />
        </button>
      </div>
    </div>
  )
}
