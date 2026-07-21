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
  WifiOff,
  Sparkles,
} from 'lucide-react'
import { ApiError, searchJobsStrict, getAutomationSettings, saveAutomationSettings, type AutomationSettings } from '@/lib/api'
import { useUIStore } from '@/store/uiStore'

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

interface JobSource {
  id: string
  name: string
  enabled: boolean
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

const DEFAULT_EXCLUDED_COMPANIES: string[] = []

// ─────────────────────────────────────────────
// Default job sources (14 sources)
// ─────────────────────────────────────────────

const DEFAULT_SOURCES: JobSource[] = [
  { id: 'adzuna', name: 'Adzuna', enabled: true },
  { id: 'reed', name: 'Reed', enabled: true },
  { id: 'govuk', name: 'GOV.UK Find a Job', enabled: true },
  { id: 'civil-service', name: 'Civil Service Jobs', enabled: true },
  { id: 'arbeitnow', name: 'Arbeitnow', enabled: true },
  { id: 'themuse', name: 'The Muse', enabled: true },
  { id: 'jobicy', name: 'Jobicy', enabled: true },
  { id: 'remotive', name: 'Remotive', enabled: true },
]

const createDefaultSettings = (): SearchSettingsState => ({
  search_active: false,
  keywords: [],
  exclusions: [],
  excludedCompanies: [...DEFAULT_EXCLUDED_COMPANIES],
  excludedTitles: [],
  preferred_locations: [],
  remote_preference: 'no_preference',
  salary_min: 0,
  salary_max: 0,
  currency: 'GBP',
  frequency: 'twice_daily',
  morningTime: '08:00',
  eveningTime: '18:00',
  dailySearchLimit: 30,
  sources: DEFAULT_SOURCES.map((source) => ({ ...source })),
  seniorityLevels: [],
  roleTypes: [],
  workArrangements: [],
  dateFilter: '7',
  salaryMinimum: 0,
  datePostedFilter: '7',
  jobTitles: [],
})

function settingsFromAccount(saved: AutomationSettings): SearchSettingsState {
  const defaults = createDefaultSettings()
  const enabledSources = new Set(saved.sources || DEFAULT_SOURCES.map((source) => source.id))
  return {
    ...defaults,
    search_active: saved.enabled,
    keywords: saved.keywords || [],
    exclusions: saved.exclusions || [],
    excludedCompanies: saved.excluded_companies || [],
    excludedTitles: saved.excluded_titles || [],
    preferred_locations: saved.preferred_locations || (saved.location ? [saved.location] : []),
    remote_preference: saved.remote_preference || 'no_preference',
    salary_min: saved.salary_min || 0,
    salary_max: saved.salary_max || 0,
    currency: saved.currency || 'GBP',
    frequency: saved.frequency,
    morningTime: saved.morning_time || '08:00',
    eveningTime: saved.evening_time || '18:00',
    dailySearchLimit: saved.daily_search_limit || 30,
    sources: DEFAULT_SOURCES.map((source) => ({ ...source, enabled: enabledSources.has(source.id) })),
    seniorityLevels: saved.seniority_levels || [],
    roleTypes: saved.role_types || [],
    workArrangements: saved.work_arrangements || [],
    dateFilter: String(saved.date_posted_days || 7),
    salaryMinimum: saved.salary_min || 0,
    datePostedFilter: String(saved.date_posted_days || 7),
    jobTitles: saved.job_titles || [],
  }
}

function accountPayload(settings: SearchSettingsState): Partial<AutomationSettings> {
  return {
    enabled: settings.search_active,
    keywords: settings.keywords,
    exclusions: settings.exclusions,
    excluded_companies: settings.excludedCompanies,
    excluded_titles: settings.excludedTitles,
    preferred_locations: settings.preferred_locations,
    remote_preference: settings.remote_preference,
    salary_min: settings.salary_min || settings.salaryMinimum,
    salary_max: settings.salary_max,
    currency: settings.currency,
    frequency: settings.frequency as AutomationSettings['frequency'],
    morning_time: settings.morningTime,
    evening_time: settings.eveningTime,
    daily_search_limit: settings.dailySearchLimit,
    sources: settings.sources.filter((source) => source.enabled).map((source) => source.id),
    seniority_levels: settings.seniorityLevels,
    role_types: settings.roleTypes,
    work_arrangements: settings.workArrangements,
    date_posted_days: Number(settings.datePostedFilter || settings.dateFilter) || 7,
    job_titles: settings.jobTitles,
  }
}

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

  // ── LIVE automation settings (persisted to the backend, drives the scheduler) ──
  const [automation, setAutomation] = useState<AutomationSettings>({
    enabled: false, query: '', location: '', min_score_alert: 85,
    email_alerts: false, alert_email: '', frequency: 'twice_daily',
  })
  const [automationSaving, setAutomationSaving] = useState(false)
  const saveAutomation = async (patch: Partial<AutomationSettings>) => {
    const next = { ...automation, ...patch }
    setAutomation(next)
    setAutomationSaving(true)
    const saved = await saveAutomationSettings(next)
    setAutomationSaving(false)
    if (saved) {
      setAutomation(saved)
      setSettingsState((current) => ({
        ...current,
        ...('enabled' in patch ? { search_active: saved.enabled } : {}),
        ...('frequency' in patch ? { frequency: saved.frequency } : {}),
      }))
    }
    else addToast({ type: 'error', title: 'Could not save automation settings', message: 'Please check your connection and try again.' })
  }

  const [settings, setSettingsState] = useState<SearchSettingsState>(createDefaultSettings)
  const [hasChanges, setHasChanges] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [searchResult, setSearchResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    schedule: true,
    keywords: true,
    locations: true,
    sources: true,
    exclusions: true,
    filters: true,
  })

  const setSettings = useCallback((update: React.SetStateAction<SearchSettingsState>) => {
    setSettingsState(update)
    setHasChanges(true)
  }, [])

  useEffect(() => {
    let alive = true
    getAutomationSettings().then((saved) => {
      if (!alive || !saved) return
      setAutomation(saved)
      setSettingsState(settingsFromAccount(saved))
      setHasChanges(false)
    })
    return () => { alive = false }
  }, [])

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }))
  }

  const updateSetting = useCallback(<K extends keyof SearchSettingsState>(key: K, value: SearchSettingsState[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }))
  }, [setSettings])

  const handleSave = async () => {
    const saved = await saveAutomationSettings({ ...automation, ...accountPayload(settings) })
    if (!saved) {
      addToast({ type: 'error', title: 'Could not save settings', message: 'Please check your connection and try again.' })
      return
    }
    setAutomation(saved)
    setSettingsState(settingsFromAccount(saved))
    setHasChanges(false)
    addToast({ type: 'success', title: 'Settings saved', message: 'Your account search preferences are synced.' })
  }

  const handleReset = () => {
    setSettings(createDefaultSettings())
  }

  const handleRunSearch = async () => {
    if (totalEnabledSources === 0) {
      addToast({ type: 'error', title: 'Choose at least one source', message: 'Enable a job source before running the search.' })
      return
    }
    setIsSearching(true)
    setSearchResult(null)
    const saved = await saveAutomationSettings({ ...automation, ...accountPayload(settings) })
    if (!saved) {
      setIsSearching(false)
      addToast({ type: 'error', title: 'Could not save settings', message: 'Your search was not started because the current filters could not be synced.' })
      return
    }
    setAutomation(saved)
    setSettingsState(settingsFromAccount(saved))
    setHasChanges(false)
    const location = settings.preferred_locations[0]
    try {
      const res = await searchJobsStrict({ location })
      const strong = res.jobs.filter((j) => (j.match_score || 0) >= 85).length
      setSearchResult({
        type: 'success',
        message: `Found ${res.total} jobs (${res.added} new, ${res.scored} freshly scored) — ${strong} strong match${strong === 1 ? '' : 'es'}.`,
      })
      addToast({
        type: 'success',
        title: 'Search complete',
        message: `${res.added} new jobs added. Opening your Jobs list…`,
      })
      setTimeout(() => navigate('/jobs'), 1200)
    } catch (error) {
      const incomplete = error instanceof ApiError && error.code === 'PROFILE_INCOMPLETE'
      const message = incomplete
        ? 'Complete your Career Profile or enter a custom search query first.'
        : error instanceof ApiError ? error.message : 'JobPilot Search is temporarily unavailable.'
      setSearchResult({ type: 'error', message })
      addToast({ type: 'error', title: incomplete ? 'Profile details needed' : 'Search failed', message })
      setTimeout(() => setSearchResult(null), 6000)
    } finally {
      setIsSearching(false)
    }
  }

  const toggleSource = (sourceId: string) => {
    setSettings((prev) => ({
      ...prev,
      sources: prev.sources.map((s) =>
        s.id === sourceId ? { ...s, enabled: !s.enabled } : s
      ),
    }))
  }

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

      {/* ── LIVE: Auto-search & email alerts (persisted per account) ── */}
      <motion.div variants={staggerItem} className="rounded-card-lg border border-accent-indigo/25 bg-accent-indigo-muted/10 p-6">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-1">
          <div className="flex items-center gap-3">
            <button
              onClick={() => saveAutomation({ enabled: !automation.enabled })}
              className={`relative w-[52px] h-[28px] rounded-full transition-colors duration-200 flex-shrink-0 ${
                automation.enabled ? 'bg-accent-indigo' : 'bg-bg-tertiary border border-border-default'
              }`}
              aria-label="Toggle auto-search"
            >
              <motion.span
                className="absolute top-[2px] left-[2px] w-6 h-6 rounded-full bg-white shadow-md"
                animate={{ x: automation.enabled ? 24 : 0 }}
                transition={{ duration: 0.2, ease: easeOutExpo }}
              />
            </button>
            <div>
              <h2 className="font-heading text-heading-lg font-semibold text-text-primary">Auto-Search & Alerts</h2>
              <p className="text-body-xs text-text-muted">
                Saved to your account — the scheduler runs searches for you and emails your matches.
                {automationSaving && <span className="text-accent-indigo"> Saving…</span>}
              </p>
            </div>
          </div>
          <span className={`px-2.5 py-1 rounded-full text-[11px] font-medium ${automation.enabled ? 'bg-accent-emerald/[0.12] text-accent-emerald' : 'bg-bg-tertiary text-text-muted'}`}>
            {automation.enabled ? 'Automation ON' : 'Automation OFF'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          <div>
            <label className="block text-body-sm font-medium text-text-secondary mb-1.5">Custom search query (optional)</label>
            <input
              value={automation.query}
              onChange={(e) => setAutomation((p) => ({ ...p, query: e.target.value }))}
              onBlur={() => saveAutomation({})}
              placeholder="Leave empty to use your profile's target roles"
              className="w-full h-10 px-3 rounded-input bg-bg-tertiary border border-border-default text-sm text-text-primary placeholder:text-text-muted focus:border-accent-indigo focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-body-sm font-medium text-text-secondary mb-1.5">Search location (optional)</label>
            <input
              value={automation.location}
              onChange={(e) => setAutomation((p) => ({ ...p, location: e.target.value }))}
              onBlur={() => saveAutomation({})}
              placeholder="Leave empty to use your profile's preferred locations"
              className="w-full h-10 px-3 rounded-input bg-bg-tertiary border border-border-default text-sm text-text-primary placeholder:text-text-muted focus:border-accent-indigo focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-body-sm font-medium text-text-secondary mb-1.5">Frequency</label>
            <select
              value={automation.frequency}
              onChange={(e) => saveAutomation({ frequency: e.target.value as AutomationSettings['frequency'] })}
              className="w-full h-10 px-3 rounded-input bg-bg-tertiary border border-border-default text-sm text-text-primary focus:border-accent-indigo focus:outline-none"
            >
              <option value="twice_daily">Twice daily</option>
              <option value="daily">Once daily</option>
              <option value="manual">Manual only</option>
            </select>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-body-sm font-medium text-text-secondary">Alert threshold</label>
              <span className="text-mono-sm text-accent-indigo font-medium">{automation.min_score_alert}%+</span>
            </div>
            <input
              type="range" min={50} max={100} step={5}
              value={automation.min_score_alert}
              onChange={(e) => setAutomation((p) => ({ ...p, min_score_alert: parseInt(e.target.value) }))}
              onMouseUp={() => saveAutomation({})}
              onTouchEnd={() => saveAutomation({})}
              className="w-full h-2 mt-3 rounded-full appearance-none cursor-pointer bg-bg-elevated accent-accent-indigo"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 mt-4 pt-4 border-t border-border-subtle/50">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={automation.email_alerts}
              onChange={(e) => saveAutomation({ email_alerts: e.target.checked })}
              className="w-4 h-4 rounded border-border-default bg-bg-tertiary text-accent-indigo"
            />
            <span className="text-body-sm text-text-primary">Email me strong matches & deadline digests</span>
          </label>
          {automation.email_alerts && (
            <input
              type="email"
              value={automation.alert_email}
              onChange={(e) => setAutomation((p) => ({ ...p, alert_email: e.target.value }))}
              onBlur={() => saveAutomation({})}
              placeholder="Alert email (empty = account email)"
              className="flex-1 min-w-[220px] h-9 px-3 rounded-input bg-bg-tertiary border border-border-default text-sm text-text-primary placeholder:text-text-muted focus:border-accent-indigo focus:outline-none"
            />
          )}
        </div>
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
            <div className="w-11 h-11 rounded-xl bg-accent-indigo-muted flex items-center justify-center">
              <Search size={20} className="text-accent-indigo" />
            </div>
            <div>
              <h2 className="font-heading text-heading-lg font-semibold text-text-primary">
                Search Your Sources
              </h2>
              <p className="text-body-sm text-text-muted mt-1">Run a manual search using the account preferences below.</p>
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
            <span className="text-body-xs text-text-muted">Automation: </span>
            <span className="text-body-xs text-text-secondary">
              {automation.enabled ? 'enabled' : 'off'}
            </span>
          </div>
          <div>
            <span className="text-body-xs text-text-muted">Sources checked: </span>
            <span className="text-body-xs text-accent-emerald font-medium">
              {totalEnabledSources} enabled
            </span>
          </div>
          {hasChanges && <span className="text-body-xs text-accent-amber">Unsaved preferences will be saved before this search runs.</span>}
        </div>

        {/* Search Result Flash */}
        <AnimatePresence>
          {searchResult && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className={`mt-4 p-3 rounded-lg border flex items-center gap-2 ${
                searchResult.type === 'success'
                  ? 'bg-accent-emerald-muted border-accent-emerald/20'
                  : 'bg-accent-rose-muted border-accent-rose/20'
              }`}
            >
              {searchResult.type === 'success' ? (
                <CheckCircle2 size={16} className="text-accent-emerald flex-shrink-0" />
              ) : (
                <AlertTriangle size={16} className="text-accent-rose flex-shrink-0" />
              )}
              <span className={`text-body-sm font-medium ${
                searchResult.type === 'success' ? 'text-accent-emerald' : 'text-accent-rose'
              }`}>
                {searchResult.message}
              </span>
            </motion.div>
          )}
        </AnimatePresence>

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
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {[
                      { key: 'twice_daily', label: 'Twice daily' },
                      { key: 'daily', label: 'Once daily' },
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
                    {(settings.jobTitles.length ? settings.jobTitles : settings.keywords.length ? settings.keywords : ['Your profile target roles'])
                      .slice(0, 3)
                      .map((value) => `“${value}${settings.preferred_locations[0] ? ` ${settings.preferred_locations[0]}` : ''}”`)
                      .join(', ')}
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
                        sources: prev.sources.map((s) => ({ ...s, enabled: true })),
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
                        sources: prev.sources.map((s) => ({ ...s, enabled: false })),
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
                            {!source.enabled && <WifiOff size={12} className="text-text-muted flex-shrink-0" />}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span
                              className={`inline-block w-1.5 h-1.5 rounded-full ${
                                source.enabled ? 'bg-accent-emerald' : 'bg-text-muted'
                              }`}
                            />
                            <span className="text-body-xs text-text-muted capitalize">
                              {source.enabled ? 'enabled' : 'disabled'}
                            </span>
                          </div>
                          <p className="text-body-xs text-text-muted mt-1">
                            Used when this provider is available to JobPilot Search.
                          </p>
                        </div>
                        <button
                          onClick={() => toggleSource(source.id)}
                          aria-label={`${source.enabled ? 'Disable' : 'Enable'} ${source.name}`}
                          aria-pressed={source.enabled}
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
