import { useState, useMemo, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  ChevronLeft,
  ChevronRight,
  BarChart3,
  Briefcase,
  Award,
  ClipboardList,
  TrendingUp,
  Globe,
  PieChart,
  Activity,
  Sparkles,
  Copy,
  Download,
  Target,
  ArrowUpRight,
  Zap,
} from 'lucide-react'
import { mockJobs } from '@/data/mockData'
import { getJobs } from '@/lib/api'
import type { Job } from '@/types'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RePieChart,
  Pie,
  Cell,
} from 'recharts'
import { format, subWeeks, addWeeks, startOfWeek, endOfWeek } from 'date-fns'

// ─── Animation ───────────────────────────────

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.06,
      duration: 0.35,
      ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
    },
  }),
}

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
}

// ─── Constants ───────────────────────────────

const SCORE_COLORS = [
  { range: 'Excellent (85-100)', min: 85, max: 100, color: '#34D399', count: 0 },
  { range: 'Strong (70-84)', min: 70, max: 84, color: '#FB923C', count: 0 },
  { range: 'Possible (55-69)', min: 55, max: 69, color: '#FBBF24', count: 0 },
  { range: 'Weak (40-54)', min: 40, max: 54, color: '#FB7185', count: 0 },
  { range: 'Skip (<40)', min: 0, max: 39, color: '#64748B', count: 0 },
]

const WEEKLY_DATA = [
  { day: 'Mon', jobs: 8, strong: 3 },
  { day: 'Tue', jobs: 5, strong: 1 },
  { day: 'Wed', jobs: 12, strong: 4 },
  { day: 'Thu', jobs: 6, strong: 2 },
  { day: 'Fri', jobs: 7, strong: 2 },
  { day: 'Sat', jobs: 3, strong: 1 },
  { day: 'Sun', jobs: 2, strong: 0 },
]

const SOURCE_DATA = [
  { source: 'LinkedIn', total: 15, strong: 4 },
  { source: 'Reed', total: 12, strong: 2 },
  { source: 'Adzuna', total: 8, strong: 1 },
  { source: 'Civil Service', total: 5, strong: 1 },
  { source: 'Indeed', total: 3, strong: 0 },
]

const FUNNEL_DATA = [
  { stage: 'Found', count: 43, color: '#22D3EE' },
  { stage: 'Saved', count: 12, color: '#A78BFA', pct: '28%' },
  { stage: 'Applied', count: 5, color: '#34D399', pct: '42%' },
  { stage: 'Interview', count: 2, color: '#FB923C', pct: '40%' },
  { stage: 'Offer', count: 0, color: '#34D399', pct: '0%' },
]

const MISSING_SKILLS = [
  { skill: 'AWS', mentions: 18, strongMatchJobs: 5 },
  { skill: 'Docker', mentions: 12, strongMatchJobs: 3 },
  { skill: 'TypeScript', mentions: 10, strongMatchJobs: 2 },
  { skill: 'Azure', mentions: 10, strongMatchJobs: 2 },
  { skill: 'C#', mentions: 8, strongMatchJobs: 1 },
  { skill: 'Kubernetes', mentions: 8, strongMatchJobs: 1 },
]

const RECOMMENDED_ACTIONS = [
  {
    priority: 'High' as const,
    title: 'Apply to 2 more strong matches',
    description: 'You have 5 strong matches you haven\'t applied to yet. 2 close this week.',
    action: 'View Strong Matches',
  },
  {
    priority: 'High' as const,
    title: 'Learn AWS basics',
    description: 'AWS blocked 5 strong matches this week. Free tier available.',
    action: 'View Skill Gap',
  },
  {
    priority: 'Medium' as const,
    title: 'Update your Career Profile',
    description: 'Add any new skills or experience from this week.',
    action: 'Go to Profile',
  },
  {
    priority: 'Medium' as const,
    title: 'Tailor your CV for PublicSector role',
    description: 'Closing date is approaching. CV ready but not reviewed.',
    action: 'View Job',
  },
]

const priorityBadgeColors: Record<string, string> = {
  High: 'bg-accent-rose/[0.12] text-accent-rose',
  Medium: 'bg-accent-indigo/[0.12] text-accent-indigo',
  Low: 'bg-[rgba(100,116,139,0.12)] text-text-muted',
}

type DateRange = 'this_week' | 'last_week' | 'last_30_days'

// ─── Main Component ──────────────────────────

export default function Reports() {
  const [currentWeek, setCurrentWeek] = useState(new Date())
  const [dateRange, setDateRange] = useState<DateRange>('this_week')

  // Live jobs (fall back to seed data)
  const [jobs, setJobs] = useState<Job[]>(mockJobs)
  useEffect(() => {
    getJobs().then((r) => { if (r && r.length) setJobs(r) }).catch(() => {})
  }, [])

  // Calculate score distribution from real scored jobs
  const scoreDistribution = useMemo(() => {
    const dist = SCORE_COLORS.map((s) => ({ ...s, count: 0 }))
    jobs.filter((j) => j.match_analysis).forEach((job) => {
      const bucket = dist.find((s) => job.match_score >= s.min && job.match_score <= s.max)
      if (bucket) bucket.count++
    })
    return dist.filter((s) => s.count > 0)
  }, [jobs])

  const totalJobs = scoreDistribution.reduce((sum, s) => sum + s.count, 0)

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 })

  const canGoNext = dateRange === 'this_week' ? false : true

  const handlePrevWeek = () => setCurrentWeek((w) => subWeeks(w, 1))
  const handleNextWeek = () => setCurrentWeek((w) => addWeeks(w, 1))
  const handleThisWeek = () => {
    setCurrentWeek(new Date('2025-01-08'))
    setDateRange('this_week')
  }

  // Summary numbers
  const summaryStats = [
    { label: 'Jobs Found', value: 43, sub: '+12 vs last week', trend: 'up' as const, icon: Briefcase, color: 'text-accent-cyan' },
    { label: 'Strong Matches', value: 8, sub: 'score 70+', trend: 'up' as const, icon: Award, color: 'text-accent-orange' },
    { label: 'Applications Sent', value: 3, sub: 'submitted', trend: 'neutral' as const, icon: ClipboardList, color: 'text-accent-emerald' },
    { label: 'Interviews', value: 1, sub: 'scheduled', trend: 'up' as const, icon: TrendingUp, color: 'text-accent-indigo' },
  ]

  // Additional stats
  const moreStats = [
    { label: 'CVs Generated', value: 2, icon: Briefcase },
    { label: 'Cover Letters', value: 2, icon: ClipboardList },
    { label: 'Rejections', value: 1, icon: XIcon },
    { label: 'Avg Match Score', value: '79%', icon: Target },
  ]

  return (
    <div className="space-y-6">
      {/* ─── Section 1: Period Selector ─────── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
        className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-card bg-bg-secondary border border-border-subtle"
      >
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrevWeek}
            className="p-2 rounded-lg hover:bg-bg-tertiary text-text-secondary hover:text-text-primary transition-colors"
          >
            <ChevronLeft size={18} />
          </button>
          <h2 className="font-heading text-base sm:text-lg font-semibold text-text-primary">
            Week of {format(weekStart, 'MMM d')} – {format(weekEnd, 'MMM d, yyyy')}
          </h2>
          <button
            onClick={handleNextWeek}
            disabled={!canGoNext}
            className="p-2 rounded-lg hover:bg-bg-tertiary text-text-secondary hover:text-text-primary transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        <div className="flex items-center gap-2">
          {([
            { key: 'this_week' as DateRange, label: 'This Week' },
            { key: 'last_week' as DateRange, label: 'Last Week' },
            { key: 'last_30_days' as DateRange, label: '30 Days' },
          ]).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => {
                setDateRange(key)
                if (key === 'this_week') handleThisWeek()
              }}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                dateRange === key
                  ? key === 'this_week'
                    ? 'bg-accent-indigo text-white'
                    : 'bg-accent-indigo text-white'
                  : 'bg-bg-tertiary text-text-secondary hover:text-text-primary'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </motion.div>

      {/* ─── Section 2: Jobs Chart + Key Stats ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Jobs Found Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.1 }}
          className="lg:col-span-3 p-5 rounded-card bg-bg-secondary border border-border-subtle"
        >
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 size={18} className="text-accent-indigo" />
            <h3 className="font-heading text-base font-semibold text-text-primary">Jobs Found This Week</h3>
          </div>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={WEEKLY_DATA} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                <XAxis dataKey="day" stroke="#64748B" fontSize={12} axisLine={false} tickLine={false} />
                <YAxis stroke="#64748B" fontSize={12} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1E293B',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    color: '#F1F5F9',
                    fontSize: '12px',
                  }}
                  formatter={(value: number, name: string) => {
                    if (name === 'jobs') return [`${value} jobs found`, 'Total']
                    return [`${value} strong matches`, 'Strong']
                  }}
                />
                <Bar dataKey="jobs" fill="#6366F1" radius={[4, 4, 0, 0]} barSize={24} />
                <Bar dataKey="strong" fill="#34D399" radius={[4, 4, 0, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center gap-4 mt-2 text-xs">
            <span className="flex items-center gap-1.5 text-text-muted">
              <span className="w-3 h-3 rounded-sm bg-[#6366F1]" /> All jobs
            </span>
            <span className="flex items-center gap-1.5 text-text-muted">
              <span className="w-3 h-3 rounded-sm bg-[#34D399]" /> Strong matches
            </span>
          </div>
        </motion.div>

        {/* Key Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.18 }}
          className="lg:col-span-2 p-5 rounded-card bg-bg-secondary border border-border-subtle"
        >
          <h3 className="font-heading text-base font-semibold text-text-primary mb-4">This Week at a Glance</h3>
          <div className="grid grid-cols-2 gap-3">
            {summaryStats.map((stat, i) => (
              <motion.div
                key={stat.label}
                custom={i}
                variants={cardVariants}
                initial="hidden"
                animate="visible"
                className="p-3 rounded-lg bg-bg-tertiary/50 border border-border-subtle/50"
              >
                <div className="flex items-center gap-1.5 mb-2">
                  <stat.icon size={14} className={stat.color} />
                  <span className="text-[11px] text-text-muted">{stat.label}</span>
                </div>
                <p className="font-mono text-2xl font-bold text-text-primary">{stat.value}</p>
                <div className="flex items-center gap-1 mt-1">
                  {stat.trend === 'up' ? (
                    <ArrowUpRight size={10} className="text-accent-emerald" />
                  ) : (
                    <ArrowUpRight size={10} className="text-text-muted opacity-0" />
                  )}
                  <span className="text-[10px] text-text-muted">{stat.sub}</span>
                </div>
              </motion.div>
            ))}
          </div>

          {/* More stats row */}
          <div className="grid grid-cols-4 gap-2 mt-3 pt-3 border-t border-border-subtle/50">
            {moreStats.map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="font-mono text-base font-bold text-text-primary">{stat.value}</p>
                <p className="text-[9px] text-text-muted mt-0.5 leading-tight">{stat.label}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* ─── Section 3: Match Distribution + Sources ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Score Distribution Donut */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.26 }}
          className="p-5 rounded-card bg-bg-secondary border border-border-subtle"
        >
          <div className="flex items-center gap-2 mb-4">
            <PieChart size={18} className="text-accent-violet" />
            <h3 className="font-heading text-base font-semibold text-text-primary">Match Score Distribution</h3>
          </div>
          <div className="flex items-center gap-6">
            <div className="w-[180px] h-[180px] flex-shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <RePieChart>
                  <Pie
                    data={scoreDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="count"
                    animationBegin={0}
                    animationDuration={800}
                  >
                    {scoreDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1E293B',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      color: '#F1F5F9',
                      fontSize: '12px',
                    }}
                    formatter={(value: number, _name: string, props: { payload?: Record<string, unknown> }) => {
                      return [`${value} jobs`, String(props?.payload?.range ?? '')]
                    }}
                  />
                </RePieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-2.5">
              {scoreDistribution.map((item) => (
                <div key={item.range} className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                  <span className="text-xs text-text-secondary flex-1">{item.range}</span>
                  <span className="text-xs font-mono font-medium text-text-primary">{item.count}</span>
                </div>
              ))}
              <div className="pt-2 border-t border-border-subtle">
                <span className="text-xs text-text-muted">Total: <span className="font-mono font-medium text-text-primary">{totalJobs}</span></span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Top Sources */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.34 }}
          className="p-5 rounded-card bg-bg-secondary border border-border-subtle"
        >
          <div className="flex items-center gap-2 mb-4">
            <Globe size={18} className="text-accent-cyan" />
            <h3 className="font-heading text-base font-semibold text-text-primary">Best Performing Sources</h3>
          </div>
          <div className="space-y-3">
            {SOURCE_DATA.map((source, i) => (
              <div key={source.source}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm text-text-primary font-medium">{source.source}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-text-muted">{source.total} jobs</span>
                    <span className="text-xs text-accent-emerald font-medium">{source.strong} strong</span>
                  </div>
                </div>
                <div className="h-2 rounded-full bg-bg-tertiary overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(source.total / 15) * 100}%` }}
                    transition={{ duration: 0.6, delay: 0.34 + i * 0.08, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
                    className="h-full rounded-full bg-accent-cyan relative"
                  >
                    <div
                      className="absolute inset-y-0 left-0 rounded-full bg-accent-emerald"
                      style={{ width: `${(source.strong / source.total) * 100}%` }}
                    />
                  </motion.div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* ─── Section 4: Missing Skills ──────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.42 }}
        className="p-5 rounded-card bg-bg-secondary border border-border-subtle"
      >
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={18} className="text-accent-rose" />
          <h3 className="font-heading text-base font-semibold text-text-primary">Most Common Missing Skills</h3>
        </div>
        <div className="h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={MISSING_SKILLS} layout="vertical" margin={{ left: 5, right: 30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" horizontal={false} />
              <XAxis type="number" stroke="#64748B" fontSize={12} />
              <YAxis dataKey="skill" type="category" stroke="#94A3B8" fontSize={12} width={80} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1E293B',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  color: '#F1F5F9',
                  fontSize: '12px',
                }}
                formatter={(value: number, name: string) => {
                  if (name === 'mentions') return [`${value} jobs`, 'All jobs']
                  return [`${value} strong match jobs`, 'Strong matches']
                }}
              />
              <Bar dataKey="mentions" fill="#FB7185" radius={[0, 4, 4, 0]} barSize={14} opacity={0.6} />
              <Bar dataKey="strongMatchJobs" fill="#FB923C" radius={[0, 4, 4, 0]} barSize={14} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center gap-4 mt-2 text-xs">
          <span className="flex items-center gap-1.5 text-text-muted">
            <span className="w-3 h-3 rounded-sm bg-[#FB7185] opacity-60" /> All jobs
          </span>
          <span className="flex items-center gap-1.5 text-text-muted">
            <span className="w-3 h-3 rounded-sm bg-[#FB923C]" /> Strong match jobs
          </span>
        </div>
        <p className="text-xs text-text-secondary mt-3">
          These skills appeared most often in jobs that matched you well. Learning them could unlock more opportunities.
        </p>
      </motion.div>

      {/* ─── Section 5: Funnel + Recommendations ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Application Funnel */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.5 }}
          className="p-5 rounded-card bg-bg-secondary border border-border-subtle"
        >
          <div className="flex items-center gap-2 mb-5">
            <Activity size={18} className="text-accent-indigo" />
            <h3 className="font-heading text-base font-semibold text-text-primary">Application Pipeline Flow</h3>
          </div>

          <div className="space-y-2">
            {FUNNEL_DATA.map((stage, i) => {
              const maxCount = FUNNEL_DATA[0].count
              const widthPercent = maxCount > 0 ? (stage.count / maxCount) * 100 : 0
              return (
                <motion.div
                  key={stage.stage}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.5 + i * 0.1 }}
                  className="relative"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-20 text-right flex-shrink-0">
                      <span className="text-xs text-text-secondary font-medium">{stage.stage}</span>
                    </div>
                    <div className="flex-1 h-8 rounded-md bg-bg-tertiary overflow-hidden relative">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${widthPercent}%` }}
                        transition={{ duration: 0.6, delay: 0.5 + i * 0.1, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
                        className="h-full rounded-md flex items-center px-2"
                        style={{ backgroundColor: stage.color }}
                      >
                        {widthPercent > 20 && (
                          <span className="text-xs font-mono font-bold text-[#0B0F19]">{stage.count}</span>
                        )}
                      </motion.div>
                      {widthPercent <= 20 && stage.count > 0 && (
                        <span className="absolute inset-y-0 left-2 flex items-center text-xs font-mono text-text-primary">{stage.count}</span>
                      )}
                    </div>
                    {stage.pct && (
                      <span className="w-10 text-xs text-text-muted flex-shrink-0">{stage.pct}</span>
                    )}
                  </div>
                  {i < FUNNEL_DATA.length - 1 && (
                    <div className="flex items-center gap-3 py-0.5">
                      <div className="w-20 flex-shrink-0" />
                      <div className="flex-1 flex justify-center">
                        <ChevronRight size={10} className="text-text-muted rotate-90" />
                      </div>
                    </div>
                  )}
                </motion.div>
              )
            })}
          </div>
        </motion.div>

        {/* Recommended Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.58 }}
          className="p-5 rounded-card bg-bg-secondary border border-border-subtle"
        >
          <div className="flex items-center gap-2 mb-4">
            <Sparkles size={18} className="text-accent-indigo" />
            <h3 className="font-heading text-base font-semibold text-text-primary">Recommended for Next Week</h3>
          </div>

          <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-2.5">
            {RECOMMENDED_ACTIONS.map((action, i) => (
              <motion.div
                key={action.title}
                custom={i}
                variants={cardVariants}
                className="p-4 rounded-[10px] bg-bg-tertiary/50 border border-border-subtle/50 hover:border-border-default hover:-translate-y-0.5 transition-all"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <h4 className="text-sm font-semibold text-text-primary">{action.title}</h4>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${priorityBadgeColors[action.priority]}`}>
                    {action.priority}
                  </span>
                </div>
                <p className="text-xs text-text-secondary mb-2">{action.description}</p>
                <button className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border-default text-xs text-text-secondary hover:bg-bg-secondary hover:text-text-primary transition-colors">
                  {action.action}
                  <Zap size={10} />
                </button>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </div>

      {/* ─── Section 6: AI Summary ──────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.66 }}
        className="p-6 rounded-card bg-[rgba(99,102,241,0.08)] border border-[rgba(99,102,241,0.2)]"
      >
        <div className="flex items-center gap-2 mb-4">
          <Sparkles size={16} className="text-accent-indigo" />
          <h3 className="font-heading text-base font-semibold text-text-primary">Weekly AI Summary</h3>
        </div>

        <div className="space-y-3 text-[15px] text-text-secondary leading-relaxed">
          <p>
            This week was productive — <strong className="text-text-primary">43 jobs</strong> were discovered across{' '}
            <strong className="text-text-primary">12 sources</strong>, with{' '}
            <strong className="text-text-primary">8 scoring as strong matches</strong> (70+). You applied to{' '}
            <strong className="text-text-primary">3 roles</strong> and have{' '}
            <strong className="text-text-primary">1 interview</strong> scheduled for Thursday.
          </p>
          <p>
            Your biggest opportunity gap remains <strong className="text-accent-rose">AWS</strong>, which appeared in{' '}
            <strong className="text-text-primary">18 job descriptions</strong> and blocked{' '}
            <strong className="text-text-primary">5 roles</strong> that would otherwise have been strong matches.{' '}
            <strong className="text-accent-rose">Docker</strong> was the second most common missing skill (12 mentions).
          </p>
          <p>
            Your <em className="text-text-primary">Hair Salon Booking System</em> continues to be the most referenced project across matched roles. The{' '}
            <em className="text-text-primary">MMS — SMS &amp; Voice Call Web App</em> is gaining relevance for full-stack positions.
          </p>
          <div className="flex items-center gap-2 pt-2">
            <Zap size={14} className="text-accent-indigo flex-shrink-0" />
            <p className="font-medium text-text-primary">
              Focus for next week: Apply to the 2 strong matches with approaching deadlines, and consider deploying one project to AWS free tier to close your biggest skill gap.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 mt-5 pt-4 border-t border-[rgba(99,102,241,0.15)]">
          <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-text-secondary hover:bg-[rgba(99,102,241,0.08)] transition-colors">
            <Copy size={12} />
            Copy Summary
          </button>
          <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[rgba(99,102,241,0.2)] text-xs text-text-secondary hover:bg-[rgba(99,102,241,0.08)] transition-colors">
            <Download size={12} />
            Export Report
          </button>
        </div>
      </motion.div>
    </div>
  )
}

// ─── Helper Icon ─────────────────────────────

function XIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  )
}
