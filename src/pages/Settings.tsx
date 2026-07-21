import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Palette,
  Bell,
  User,
  Gauge,
  Settings,
  Info,
  Moon,
  Sun,
  Monitor,
  RefreshCw,
  Trash2,
  LogOut,
  Lock,
  Mail,
  Download,
  Database,
  ChevronDown,
  AlertTriangle,
  X,
  Sparkles,
  Code,
  Shield,
  Globe,
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useAuth } from '@/hooks/useAuth'
import { getDocuments, getStats } from '@/lib/api'

// ─────────────────────────────────────────────
// Animation config
// ─────────────────────────────────────────────

const easeOutExpo = [0.16, 1, 0.3, 1] as [number, number, number, number]

const tabContentVariants = {
  initial: { opacity: 0, x: 10 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.2, ease: easeOutExpo } },
  exit: { opacity: 0, x: -10, transition: { duration: 0.15 } },
}

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

type SettingsTab = 'appearance' | 'notifications' | 'account' | 'limits' | 'advanced' | 'about'

interface TabConfig {
  id: SettingsTab
  label: string
  icon: typeof Palette
}

const tabs: TabConfig[] = [
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'account', label: 'Account', icon: User },
  { id: 'limits', label: 'Limits', icon: Gauge },
  { id: 'advanced', label: 'Advanced', icon: Settings },
  { id: 'about', label: 'About', icon: Info },
]

// ─────────────────────────────────────────────
// Store / state helpers
// ─────────────────────────────────────────────

function useLocalStorageState<T>(key: string, defaultValue: T): [T, (value: T | ((prev: T) => T)) => void] {
  const [state, setState] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(key)
      return stored ? (JSON.parse(stored) as T) : defaultValue
    } catch {
      return defaultValue
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(state))
    } catch {
      // ignore
    }
  }, [key, state])

  return [state, setState]
}

// ─────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('appearance')
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // Apply theme immediately
  const [theme, setTheme] = useLocalStorageState<'dark' | 'light' | 'system'>('jobpilot-theme', 'dark')

  useEffect(() => {
    const root = document.documentElement
    if (theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      root.setAttribute('data-theme', prefersDark ? 'dark' : 'light')
    } else {
      root.setAttribute('data-theme', theme)
    }
  }, [theme])

  return (
    <div className="max-w-5xl">
      {/* Page Title */}
      <div className="mb-6">
        <h1 className="font-heading text-display-md font-semibold text-text-primary tracking-tight">Settings</h1>
        <p className="text-body-md text-text-secondary mt-1">Customize your JobPilot AI experience.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* ── Tab Navigation ── */}
        {isMobile ? (
          /* Mobile: Dropdown */
          <div className="relative">
            <select
              value={activeTab}
              onChange={(e) => setActiveTab(e.target.value as SettingsTab)}
              className="w-full h-11 px-4 pr-10 rounded-card bg-bg-secondary border border-border-subtle text-text-primary text-body-sm appearance-none cursor-pointer focus:border-accent-indigo focus:outline-none"
            >
              {tabs.map((tab) => (
                <option key={tab.id} value={tab.id}>
                  {tab.label}
                </option>
              ))}
            </select>
            <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
          </div>
        ) : (
          /* Desktop: Side tabs */
          <nav className="w-[200px] flex-shrink-0 space-y-1">
            {tabs.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 h-[44px] px-4 rounded-xl text-left transition-all duration-150 ${
                    isActive
                      ? 'bg-accent-indigo-muted text-accent-indigo border-l-[3px] border-accent-indigo'
                      : 'text-text-secondary hover:bg-bg-tertiary hover:text-text-primary border-l-[3px] border-transparent'
                  }`}
                >
                  <Icon size={18} className="flex-shrink-0" />
                  <span className="text-sm font-medium">{tab.label}</span>
                </button>
              )
            })}
          </nav>
        )}

        {/* ── Tab Content ── */}
        <div className="flex-1 min-w-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              variants={tabContentVariants}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              {activeTab === 'appearance' && <AppearanceTab theme={theme} setTheme={setTheme} />}
              {activeTab === 'notifications' && <NotificationsTab />}
              {activeTab === 'account' && <AccountTab />}
              {activeTab === 'limits' && <LimitsTab />}
              {activeTab === 'advanced' && <AdvancedTab />}
              {activeTab === 'about' && <AboutTab />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════
// Tab 1: Appearance
// ════════════════════════════════════════════

function AppearanceTab({
  theme,
  setTheme,
}: {
  theme: 'dark' | 'light' | 'system'
  setTheme: (t: 'dark' | 'light' | 'system') => void
}) {
  const [fontSize, setFontSize] = useLocalStorageState<'small' | 'default' | 'large'>('jobpilot-font-size', 'default')
  const [compactMode, setCompactMode] = useLocalStorageState('jobpilot-compact', false)
  const [animations, setAnimations] = useLocalStorageState('jobpilot-animations', true)
  const [scoreRingStyle, setScoreRingStyle] = useLocalStorageState<'gradient' | 'solid' | 'minimal'>('jobpilot-score-ring', 'gradient')

  // Apply font size
  useEffect(() => {
    const root = document.documentElement
    root.style.fontSize = fontSize === 'small' ? '14px' : fontSize === 'large' ? '18px' : '16px'
  }, [fontSize])

  return (
    <div className="space-y-6">
      <h2 className="font-heading text-heading-lg font-semibold text-text-primary flex items-center gap-2">
        <Palette size={20} className="text-accent-indigo" />
        Appearance
      </h2>

      {/* Theme */}
      <SettingsCard title="Theme">
        <div className="grid grid-cols-3 gap-3">
          {[
            { key: 'dark' as const, label: 'Dark', icon: Moon, preview: 'bg-[#0B0F19]' },
            { key: 'light' as const, label: 'Light', icon: Sun, preview: 'bg-[#F8FAFC]' },
            { key: 'system' as const, label: 'System', icon: Monitor, preview: 'bg-gradient-to-br from-[#0B0F19] to-[#F8FAFC]' },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setTheme(t.key)}
              className={`flex flex-col items-center gap-2 p-4 rounded-card border-2 transition-all ${
                theme === t.key
                  ? 'border-accent-indigo bg-accent-indigo-muted/30'
                  : 'border-border-subtle bg-bg-tertiary hover:border-border-default'
              }`}
            >
              <div className={`w-full h-12 rounded-lg ${t.preview} border border-border-subtle`} />
              <div className="flex items-center gap-1.5">
                <t.icon size={14} className={theme === t.key ? 'text-accent-indigo' : 'text-text-muted'} />
                <span className={`text-body-sm font-medium ${theme === t.key ? 'text-accent-indigo' : 'text-text-secondary'}`}>
                  {t.label}
                </span>
              </div>
            </button>
          ))}
        </div>
      </SettingsCard>

      {/* Font Size */}
      <SettingsCard title="Font Size">
        <div className="flex gap-2">
          {([
            { key: 'small' as const, label: 'Small' },
            { key: 'default' as const, label: 'Default' },
            { key: 'large' as const, label: 'Large' },
          ]).map((opt) => (
            <button
              key={opt.key}
              onClick={() => setFontSize(opt.key)}
              className={`flex-1 px-4 py-2.5 rounded-button text-sm font-medium transition-all ${
                fontSize === opt.key
                  ? 'bg-accent-indigo text-white'
                  : 'bg-bg-tertiary text-text-secondary border border-border-default hover:border-border-focus'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </SettingsCard>

      {/* Compact Mode */}
      <SettingsCard title="Compact Mode">
        <ToggleRow
          label="Compact UI"
          description="Reduce whitespace to fit more content on screen."
          value={compactMode}
          onChange={setCompactMode}
        />
      </SettingsCard>

      {/* Animations */}
      <SettingsCard title="Animations">
        <ToggleRow
          label="Enable Animations"
          description="Smooth transitions and micro-animations throughout the app."
          value={animations}
          onChange={setAnimations}
        />
      </SettingsCard>

      {/* Score Ring Style */}
      <SettingsCard title="Score Ring Style">
        <div className="grid grid-cols-3 gap-3">
          {([
            { key: 'gradient' as const, label: 'Gradient', desc: 'Color gradient based on score' },
            { key: 'solid' as const, label: 'Solid', desc: 'Single color per score band' },
            { key: 'minimal' as const, label: 'Minimal', desc: 'Simple thin ring' },
          ]).map((opt) => (
            <button
              key={opt.key}
              onClick={() => setScoreRingStyle(opt.key)}
              className={`p-3 rounded-card border-2 text-left transition-all ${
                scoreRingStyle === opt.key
                  ? 'border-accent-indigo bg-accent-indigo-muted/30'
                  : 'border-border-subtle bg-bg-tertiary hover:border-border-default'
              }`}
            >
              <span className={`text-body-sm font-medium block ${scoreRingStyle === opt.key ? 'text-accent-indigo' : 'text-text-primary'}`}>
                {opt.label}
              </span>
              <span className="text-body-xs text-text-muted">{opt.desc}</span>
            </button>
          ))}
        </div>
      </SettingsCard>
    </div>
  )
}

// ════════════════════════════════════════════
// Tab 2: Notifications
// ════════════════════════════════════════════

function NotificationsTab() {
  const [inAppEnabled, setInAppEnabled] = useLocalStorageState('jobpilot-inapp-notifs', true)
  const [soundEnabled, setSoundEnabled] = useLocalStorageState('jobpilot-notif-sound', false)
  const [digestFreq, setDigestFreq] = useLocalStorageState<'none' | 'daily' | 'weekly'>('jobpilot-digest', 'weekly')

  const [notifTypes, setNotifTypes] = useState({
    strong_match: true,
    closing_soon: true,
    unapplied_match: true,
    cv_ready: true,
    cl_ready: true,
    interview: true,
    search_failed: true,
    api_limit: false,
    weekly_report: true,
    follow_up: true,
  })

  const toggleNotifType = (key: string) => {
    setNotifTypes((prev) => ({ ...prev, [key]: !prev[key as keyof typeof prev] }))
  }

  const notifTypeList = [
    { key: 'strong_match', label: 'Strong job match found', desc: 'When a job scores 80+ against your profile' },
    { key: 'closing_soon', label: 'Job closing soon', desc: 'Application deadlines within 48 hours' },
    { key: 'unapplied_match', label: 'Not applied to strong match', desc: 'Reminders for saved high-match jobs' },
    { key: 'cv_ready', label: 'CV draft ready', desc: 'When tailored CV generation completes' },
    { key: 'cl_ready', label: 'Cover letter ready', desc: 'When cover letter generation completes' },
    { key: 'follow_up', label: 'Follow-up due', desc: 'When it is time to follow up on an application' },
    { key: 'interview', label: 'Interview coming up', desc: '24-hour reminders for scheduled interviews' },
    { key: 'search_failed', label: 'Search failed', desc: 'When an automated search encounters errors' },
    { key: 'api_limit', label: 'API limit warning', desc: 'When approaching daily API usage limits' },
    { key: 'weekly_report', label: 'Weekly report ready', desc: 'Monday morning summary of the week' },
  ]

  return (
    <div className="space-y-6">
      <h2 className="font-heading text-heading-lg font-semibold text-text-primary flex items-center gap-2">
        <Bell size={20} className="text-accent-indigo" />
        Notifications
      </h2>

      <SettingsCard title="In-App Notifications">
        <ToggleRow label="Enable In-App Notifications" description="Show notification banners in the app." value={inAppEnabled} onChange={setInAppEnabled} />
        <div className="mt-4 pt-4 border-t border-border-subtle">
          <ToggleRow label="Notification Sound" description="Play a sound when new notifications arrive." value={soundEnabled} onChange={setSoundEnabled} />
        </div>
      </SettingsCard>

      <SettingsCard title="Notification Types">
        <div className="space-y-3">
          {notifTypeList.map((nt) => (
            <div key={nt.key} className="flex items-start justify-between gap-4">
              <div>
                <p className="text-body-sm font-medium text-text-primary">{nt.label}</p>
                <p className="text-body-xs text-text-muted">{nt.desc}</p>
              </div>
              <Switch
                value={notifTypes[nt.key as keyof typeof notifTypes]}
                onChange={() => toggleNotifType(nt.key)}
              />
            </div>
          ))}
        </div>
      </SettingsCard>

      <SettingsCard title="Digest Frequency">
        <div className="flex gap-2">
          {([
            { key: 'none' as const, label: 'None' },
            { key: 'daily' as const, label: 'Daily' },
            { key: 'weekly' as const, label: 'Weekly' },
          ]).map((opt) => (
            <button
              key={opt.key}
              onClick={() => setDigestFreq(opt.key)}
              className={`flex-1 px-4 py-2.5 rounded-button text-sm font-medium transition-all ${
                digestFreq === opt.key
                  ? 'bg-accent-indigo text-white'
                  : 'bg-bg-tertiary text-text-secondary border border-border-default hover:border-border-focus'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <p className="text-body-xs text-text-muted mt-2">
          Receive a digest email summarizing your job search activity.
        </p>
      </SettingsCard>
    </div>
  )
}

// ════════════════════════════════════════════
// Tab 3: Account
// ════════════════════════════════════════════

function AccountTab() {
  const user = useAuthStore((s) => s.user)
  const { logout } = useAuth()
  const navigate = useNavigate()
  const createdAt = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : 'Not available'

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div className="space-y-6">
      <h2 className="font-heading text-heading-lg font-semibold text-text-primary flex items-center gap-2">
        <User size={20} className="text-accent-indigo" />
        Account
      </h2>

      <SettingsCard title="Email Address">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Mail size={16} className="text-text-muted" />
            <span className="text-body-sm text-text-primary">{user?.email || 'Signed-in account'}</span>
          </div>
          <span className="px-2.5 py-1 rounded-pill bg-accent-emerald-muted text-accent-emerald text-body-xs font-medium">
            Authenticated
          </span>
        </div>
      </SettingsCard>

      <SettingsCard title="Password">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Lock size={16} className="text-text-muted" />
            <span className="text-body-sm text-text-primary">••••••••••••</span>
          </div>
        </div>
        <p className="text-body-xs text-text-muted mt-2">Password changes are handled securely through “Forgot password” on the sign-in page.</p>
      </SettingsCard>

      <SettingsCard title="Two-Factor Authentication">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Shield size={16} className="text-text-muted" />
            <div>
              <span className="text-body-sm text-text-primary">Two-factor authentication</span>
              <p className="text-body-xs text-text-muted">Add an extra layer of security to your account.</p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-pill bg-accent-amber-muted text-accent-amber text-body-xs font-medium">
            Coming soon
          </span>
        </div>
      </SettingsCard>

      <SettingsCard title="Account Created">
        <p className="text-body-sm text-text-secondary">{createdAt}</p>
      </SettingsCard>

      {/* Danger Zone */}
      <div className="rounded-card-lg border border-accent-rose/20 bg-accent-rose-muted/10 p-5 space-y-4">
        <h3 className="font-heading text-heading-md font-semibold text-accent-rose flex items-center gap-2">
          <AlertTriangle size={18} />
          Danger Zone
        </h3>

        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-body-sm font-medium text-text-primary">Log Out</p>
            <p className="text-body-xs text-text-muted">Sign out of your account on this device.</p>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 rounded-button border border-border-default text-body-sm text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-all">
            <LogOut size={14} />
            Log Out
          </button>
        </div>

        <div className="border-t border-accent-rose/10 pt-4 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-body-sm font-medium text-accent-rose">Delete Account</p>
            <p className="text-body-xs text-text-muted">Permanently delete your account and all associated data.</p>
          </div>
          <a href="#/privacy" className="flex items-center gap-2 px-4 py-2 rounded-button bg-accent-rose text-white text-body-sm font-medium hover:bg-accent-rose/90 hover:scale-[1.02] active:scale-[0.98] transition-all">
            <Trash2 size={14} />
            Manage My Data
          </a>
        </div>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════
// Tab 4: Limits
// ════════════════════════════════════════════

function LimitsTab() {
  const [dailySearchLimit, setDailySearchLimit] = useLocalStorageState('jobpilot-daily-search-limit', 30)
  const [maxJobsStored, setMaxJobsStored] = useLocalStorageState('jobpilot-max-jobs', 1000)
  const [autoDeleteDays, setAutoDeleteDays] = useLocalStorageState('jobpilot-auto-delete-days', 90)
  const [maxTailoredCVs, setMaxTailoredCVs] = useLocalStorageState('jobpilot-max-cvs', 20)
  const [pauseAllSearches, setPauseAllSearches] = useState(false)
  const [storedCounts, setStoredCounts] = useState({ jobs: 0, documents: 0 })

  useEffect(() => {
    let alive = true
    Promise.all([getStats(), getDocuments()]).then(([stats, documents]) => {
      if (alive) setStoredCounts({ jobs: stats?.totalJobs || 0, documents: documents?.length || 0 })
    })
    return () => { alive = false }
  }, [])

  return (
    <div className="space-y-6">
      <h2 className="font-heading text-heading-lg font-semibold text-text-primary flex items-center gap-2">
        <Gauge size={20} className="text-accent-indigo" />
        Usage Limits
      </h2>

      <SettingsCard title="Daily Search Limit">
        <div className="flex items-center justify-between mb-2">
          <span className="text-body-sm text-text-secondary">Max searches per day</span>
          <span className="text-mono-sm text-accent-indigo font-medium">{dailySearchLimit} / 100</span>
        </div>
        <div className="w-full h-2 rounded-full bg-bg-elevated overflow-hidden mb-3">
          <div
            className="h-full rounded-full bg-accent-indigo transition-all duration-300"
            style={{ width: `${dailySearchLimit}%` }}
          />
        </div>
        <input
          type="range"
          min={10}
          max={100}
          value={dailySearchLimit}
          onChange={(e) => setDailySearchLimit(parseInt(e.target.value))}
          className="w-full h-2 rounded-full appearance-none cursor-pointer bg-bg-elevated accent-accent-indigo"
        />
        <p className="text-body-xs text-text-muted mt-2">
          Maximum number of search queries per day. Lower = safer for free API tiers.
        </p>
      </SettingsCard>

      <SettingsCard title="Job Storage">
        <div className="flex items-center justify-between mb-2">
          <span className="text-body-sm text-text-secondary">Jobs stored</span>
          <span className="text-mono-sm text-accent-indigo font-medium">{storedCounts.jobs} / {maxJobsStored}</span>
        </div>
        <div className="w-full h-2 rounded-full bg-bg-elevated overflow-hidden mb-3">
          <div
            className="h-full rounded-full bg-accent-cyan transition-all duration-300"
            style={{ width: `${Math.min((storedCounts.jobs / maxJobsStored) * 100, 100)}%` }}
          />
        </div>
        <div className="flex items-center gap-4 mt-4">
          <label className="text-body-sm text-text-secondary whitespace-nowrap">Max stored:</label>
          <input
            type="number"
            value={maxJobsStored}
            onChange={(e) => setMaxJobsStored(parseInt(e.target.value) || 100)}
            className="w-24 h-9 px-3 rounded-input bg-bg-tertiary border border-border-default text-sm text-text-primary focus:border-accent-indigo focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-4 mt-3">
          <label className="text-body-sm text-text-secondary whitespace-nowrap">Auto-delete after:</label>
          <input
            type="number"
            value={autoDeleteDays}
            onChange={(e) => setAutoDeleteDays(parseInt(e.target.value) || 30)}
            className="w-24 h-9 px-3 rounded-input bg-bg-tertiary border border-border-default text-sm text-text-primary focus:border-accent-indigo focus:outline-none"
          />
          <span className="text-body-sm text-text-muted">days</span>
        </div>
        <p className="text-body-xs text-text-muted mt-2">
          Old jobs are automatically removed to keep storage lean.
        </p>
      </SettingsCard>

      <SettingsCard title="CV Versions">
        <div className="flex items-center justify-between mb-2">
          <span className="text-body-sm text-text-secondary">Tailored CVs stored</span>
          <span className="text-mono-sm text-accent-violet font-medium">{storedCounts.documents} / {maxTailoredCVs}</span>
        </div>
        <div className="flex items-center gap-4 mt-3">
          <label className="text-body-sm text-text-secondary whitespace-nowrap">Maximum stored:</label>
          <input
            type="number"
            value={maxTailoredCVs}
            onChange={(e) => setMaxTailoredCVs(parseInt(e.target.value) || 10)}
            className="w-24 h-9 px-3 rounded-input bg-bg-tertiary border border-border-default text-sm text-text-primary focus:border-accent-indigo focus:outline-none"
          />
        </div>
        <p className="text-body-xs text-text-muted mt-2">
          Old tailored CVs can be auto-cleaned when you reach the limit.
        </p>
      </SettingsCard>

      <SettingsCard title="Pause All Searches">
        <ToggleRow
          label="Pause All Automated Searches"
          description="Temporarily stop all automated search agents. Manual searches still work."
          value={pauseAllSearches}
          onChange={setPauseAllSearches}
        />
      </SettingsCard>

      {/* Subscription */}
      <SettingsCard title="Subscription">
        <div className="flex items-center gap-3 mb-3">
          <span className="px-3 py-1 rounded-pill bg-accent-emerald-muted text-accent-emerald text-body-xs font-medium">
            Free / Private Beta
          </span>
        </div>
        <p className="text-body-sm text-text-secondary">
          You are on the free private beta plan. All features are available.
        </p>
        <button
          disabled
          className="mt-3 px-4 py-2 rounded-button bg-bg-tertiary border border-border-subtle text-body-sm text-text-muted cursor-not-allowed opacity-50"
        >
          Upgrade to Pro — Coming soon
        </button>
        <div className="mt-4 space-y-2">
          <p className="text-body-xs text-text-muted font-medium">Pro features (coming soon):</p>
          {['Unlimited searches', 'Email notifications', 'Advanced AI tailoring', 'Browser extension', 'Multi-device sync'].map(
            (feature) => (
              <div key={feature} className="flex items-center gap-2 text-body-xs text-text-muted">
                <Sparkles size={12} className="text-text-muted/50" />
                {feature}
              </div>
            )
          )}
        </div>
      </SettingsCard>
    </div>
  )
}

// ════════════════════════════════════════════
// Tab 5: Advanced
// ════════════════════════════════════════════

function AdvancedTab() {
  const [debugMode, setDebugMode] = useLocalStorageState('jobpilot-debug', false)
  const [devInfoOpen, setDevInfoOpen] = useState(false)
  const [clearCacheOpen, setClearCacheOpen] = useState(false)
  const [resetOnboardingOpen, setResetOnboardingOpen] = useState(false)

  const handleClearCache = () => {
    setClearCacheOpen(false)
    // Clear everything except auth
    const keysToRemove = Object.keys(localStorage).filter((k) => !k.includes('auth'))
    keysToRemove.forEach((k) => localStorage.removeItem(k))
    setTimeout(() => {
      window.location.reload()
    }, 300)
  }

  const handleExportLogs = () => {
    const logs = {
      app_version: '1.0.0',
      build_date: '2025-01-08',
      user_agent: navigator.userAgent,
      screen: { width: window.screen.width, height: window.screen.height },
      timestamp: new Date().toISOString(),
      localStorage_keys: Object.keys(localStorage),
    }
    const blob = new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `jobpilot-logs-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <h2 className="font-heading text-heading-lg font-semibold text-text-primary flex items-center gap-2">
        <Settings size={20} className="text-accent-indigo" />
        Advanced Settings
      </h2>

      <SettingsCard title="Reset Settings">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-body-sm font-medium text-text-primary">Reset All Settings</p>
            <p className="text-body-xs text-text-muted">Reset all settings to default values. Your data is not affected.</p>
          </div>
          <button
            onClick={() => setResetOnboardingOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-button border border-border-default text-body-sm text-text-secondary hover:text-text-primary hover:bg-bg-tertiary hover:border-border-focus transition-all"
          >
            <RefreshCw size={14} />
            Reset
          </button>
        </div>
      </SettingsCard>

      <SettingsCard title="Cache">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-body-sm font-medium text-text-primary">Clear Cache</p>
            <p className="text-body-xs text-text-muted">Clear local browser cache and reload the app.</p>
          </div>
          <button
            onClick={() => setClearCacheOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-button border border-border-default text-body-sm text-text-secondary hover:text-text-primary hover:bg-bg-tertiary hover:border-border-focus transition-all"
          >
            <Database size={14} />
            Clear Cache
          </button>
        </div>
      </SettingsCard>

      <SettingsCard title="Debug">
        <ToggleRow label="Debug Mode" description="Show additional debug information and logs." value={debugMode} onChange={setDebugMode} />
      </SettingsCard>

      <SettingsCard title="Export">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-body-sm font-medium text-text-primary">Export Logs</p>
            <p className="text-body-xs text-text-muted">Download debug logs for troubleshooting.</p>
          </div>
          <button
            onClick={handleExportLogs}
            className="flex items-center gap-2 px-4 py-2 rounded-button border border-border-default text-body-sm text-text-secondary hover:text-text-primary hover:bg-bg-tertiary hover:border-border-focus transition-all"
          >
            <Download size={14} />
            Export Logs
          </button>
        </div>
      </SettingsCard>

      {/* Developer Info */}
      <SettingsCard title="Developer Info">
        <button
          onClick={() => setDevInfoOpen(!devInfoOpen)}
          className="flex items-center gap-2 text-body-sm text-text-secondary hover:text-text-primary transition-colors"
        >
          <Code size={14} />
          {devInfoOpen ? 'Hide' : 'Show'} developer information
          <motion.span animate={{ rotate: devInfoOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronDown size={14} />
          </motion.span>
        </button>
        <AnimatePresence>
          {devInfoOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: easeOutExpo }}
              className="overflow-hidden"
            >
              <div className="mt-3 p-4 rounded-card bg-bg-tertiary border border-border-subtle space-y-2 font-mono text-body-xs text-text-muted">
                <div className="flex justify-between">
                  <span>App Version</span>
                  <span className="text-text-secondary">v1.0.0</span>
                </div>
                <div className="flex justify-between">
                  <span>Build Date</span>
                  <span className="text-text-secondary">2025-01-08</span>
                </div>
                <div className="flex justify-between">
                  <span>React</span>
                  <span className="text-text-secondary">^19.2.0</span>
                </div>
                <div className="flex justify-between">
                  <span>Tailwind CSS</span>
                  <span className="text-text-secondary">^3.4.19</span>
                </div>
                <div className="flex justify-between">
                  <span>Vite</span>
                  <span className="text-text-secondary">^7.2.4</span>
                </div>
                <div className="flex justify-between">
                  <span>Framer Motion</span>
                  <span className="text-text-secondary">^12.40.0</span>
                </div>
                <div className="flex justify-between">
                  <span>Zustand</span>
                  <span className="text-text-secondary">^5.0.14</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </SettingsCard>

      {/* Clear Cache Confirmation */}
      <AnimatePresence>
        {clearCacheOpen && (
          <Modal onClose={() => setClearCacheOpen(false)} title="Clear Cache">
            <p className="text-body-sm text-text-secondary mb-4">
              This will clear all cached data and reload the app. You will not lose any saved jobs or profile data.
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setClearCacheOpen(false)} className="px-4 py-2 rounded-button border border-border-default text-body-sm text-text-secondary hover:bg-bg-tertiary transition-colors">
                Cancel
              </button>
              <button onClick={handleClearCache} className="px-4 py-2 rounded-button bg-accent-amber text-bg-primary text-body-sm font-medium hover:bg-accent-amber/90 transition-colors">
                Clear &amp; Reload
              </button>
            </div>
          </Modal>
        )}
      </AnimatePresence>

      {/* Reset Onboarding Confirmation */}
      <AnimatePresence>
        {resetOnboardingOpen && (
          <Modal onClose={() => setResetOnboardingOpen(false)} title="Reset Onboarding">
            <p className="text-body-sm text-text-secondary mb-4">
              This will reset the onboarding flow so you see it again on next visit. Your data is not affected.
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setResetOnboardingOpen(false)} className="px-4 py-2 rounded-button border border-border-default text-body-sm text-text-secondary hover:bg-bg-tertiary transition-colors">
                Cancel
              </button>
              <button
                onClick={() => { setResetOnboardingOpen(false) }}
                className="px-4 py-2 rounded-button bg-accent-indigo text-white text-body-sm font-medium hover:bg-accent-indigo-hover transition-colors"
              >
                Reset Onboarding
              </button>
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  )
}

// ════════════════════════════════════════════
// Tab 6: About
// ════════════════════════════════════════════

function AboutTab() {
  return (
    <div className="space-y-6">
      <h2 className="font-heading text-heading-lg font-semibold text-text-primary flex items-center gap-2">
        <Info size={20} className="text-accent-indigo" />
        About JobPilot AI
      </h2>

      <SettingsCard>
        <div className="flex items-center gap-4">
          <img src="/logo-icon.svg" alt="JobPilot" className="w-12 h-12" />
          <div>
            <h3 className="font-heading text-xl font-bold text-text-primary">JobPilot AI</h3>
            <p className="text-body-sm text-text-muted">v1.0.0 (Private Beta)</p>
          </div>
        </div>
        <p className="text-body-md text-text-secondary mt-4 leading-relaxed">
          JobPilot AI is your private, AI-powered job search companion. It automates discovery, scores
          opportunities against your real skills, and helps you apply smarter — without ever fabricating
          experience.
        </p>
      </SettingsCard>

      <SettingsCard title="Built For">
        <p className="text-body-sm text-text-secondary">
          <span className="font-medium text-text-primary">Demo User</span> — Private beta, single user mode
        </p>
      </SettingsCard>

      <SettingsCard title="Links">
        <div className="space-y-2">
          {[
            { label: 'Privacy Policy', href: '#' },
            { label: 'Terms of Service', href: '#' },
            { label: 'Contact Support', href: 'mailto:support@jobpilot.ai' },
          ].map((link) => (
            <a
              key={link.label}
              href={link.href}
              onClick={(e) => { if (link.href === '#') e.preventDefault() }}
              className="flex items-center gap-2 text-body-sm text-accent-indigo hover:text-accent-indigo-hover transition-colors"
            >
              <Globe size={14} />
              {link.label}
            </a>
          ))}
        </div>
      </SettingsCard>

      <SettingsCard title="Feedback">
        <p className="text-body-sm text-text-secondary mb-3">
          Have suggestions or found a bug? We would love to hear from you.
        </p>
        <a
          href="mailto:feedback@jobpilot.ai"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-button border border-border-default text-body-sm text-text-secondary hover:text-text-primary hover:bg-bg-tertiary hover:border-border-focus transition-all"
        >
          <Mail size={14} />
          Send Feedback
        </a>
      </SettingsCard>

      <SettingsCard title="Open Source Credits">
        <p className="text-body-xs text-text-muted leading-relaxed">
          Built with React, Tailwind CSS, Vite, Framer Motion, Zustand, and open source technologies.
          Thanks to all the open source contributors who make this project possible.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {['React', 'Tailwind CSS', 'Vite', 'Framer Motion', 'Zustand', 'shadcn/ui', 'Lucide'].map((tech) => (
            <span key={tech} className="px-2.5 py-1 rounded-pill bg-bg-tertiary text-body-xs text-text-muted border border-border-subtle">
              {tech}
            </span>
          ))}
        </div>
      </SettingsCard>
    </div>
  )
}

// ════════════════════════════════════════════
// Shared Components
// ════════════════════════════════════════════

function SettingsCard({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-card-lg border border-border-subtle bg-bg-secondary p-5 space-y-4">
      {title && <h3 className="font-heading text-heading-sm font-semibold text-text-primary">{title}</h3>}
      {children}
    </div>
  )
}

function ToggleRow({
  label,
  description,
  value,
  onChange,
}: {
  label: string
  description: string
  value: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-body-sm font-medium text-text-primary">{label}</p>
        <p className="text-body-xs text-text-muted">{description}</p>
      </div>
      <Switch value={value} onChange={onChange} />
    </div>
  )
}

function Switch({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={`relative w-[44px] h-[24px] rounded-full transition-colors duration-200 flex-shrink-0 ${
        value ? 'bg-accent-indigo' : 'bg-bg-elevated border border-border-default'
      }`}
      aria-label="Toggle"
    >
      <motion.span
        className="absolute top-[2px] left-[2px] w-5 h-5 rounded-full bg-white shadow"
        animate={{ x: value ? 20 : 0 }}
        transition={{ duration: 0.2, ease: easeOutExpo }}
      />
    </button>
  )
}

function Modal({ children, onClose, title }: { children: React.ReactNode; onClose: () => void; title: string }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-modal flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ duration: 0.2, ease: easeOutExpo }}
        onClick={(e) => e.stopPropagation()}
        className="relative bg-bg-elevated rounded-card-lg border border-border-subtle shadow-2xl w-full max-w-md p-6"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-lg hover:bg-bg-tertiary text-text-muted hover:text-text-primary transition-colors"
        >
          <X size={18} />
        </button>
        <h3 className="font-heading text-heading-lg font-semibold text-text-primary mb-4">{title}</h3>
        {children}
      </motion.div>
    </motion.div>
  )
}
