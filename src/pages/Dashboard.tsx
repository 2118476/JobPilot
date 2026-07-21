import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Briefcase,
  Award,
  AlertTriangle,
  FileText,
  Clock,
  CheckCircle,
  Calendar,
  Play,
  Pause,
  Settings,
  Wand2,
  ChevronRight,
  Plus,
  TrendingUp,
  Zap,
  Star,
  Eye,
  Activity,
  MapPin,
  Sparkles,
  Search,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  ResponsiveContainer,
} from 'recharts'
import { getStats, updateJob, type DashboardStats } from '@/lib/api'
import { useUIStore } from '@/store/uiStore'
import { formatDistanceToNow } from 'date-fns'
import type { Job } from '@/types'

// ─── Animation Variants ──────────────────────

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
  { min: 85, color: '#34D399' },
  { min: 70, color: '#FB923C' },
  { min: 55, color: '#FBBF24' },
  { min: 40, color: '#FB7185' },
  { min: 0, color: '#64748B' },
]

function getScoreColor(score: number) {
  return SCORE_COLORS.find((s) => score >= s.min)?.color || '#64748B'
}

const PIPELINE_STAGES: { stage: string; keys: string[]; color: string }[] = [
  { stage: 'Found', keys: ['new'], color: '#22D3EE' },
  { stage: 'Saved', keys: ['saved'], color: '#A78BFA' },
  { stage: 'CV Drafted', keys: ['cv_drafted'], color: '#6366F1' },
  { stage: 'CL Drafted', keys: ['cl_drafted', 'ready_to_apply'], color: '#A78BFA' },
  { stage: 'Applied', keys: ['applied'], color: '#34D399' },
  { stage: 'Interview', keys: ['interview', 'technical_test'], color: '#FB923C' },
  { stage: 'Rejected', keys: ['rejected'], color: '#FB7185' },
  { stage: 'Offer', keys: ['offer'], color: '#34D399' },
]

const ACTIVITY_ICONS: Record<string, { icon: typeof Briefcase; color: string; bg: string }> = {
  job_found: { icon: Briefcase, color: 'text-accent-cyan', bg: 'bg-accent-cyan' },
  cv_generated: { icon: FileText, color: 'text-accent-indigo', bg: 'bg-accent-indigo' },
  letter_generated: { icon: FileText, color: 'text-accent-violet', bg: 'bg-accent-violet' },
  applied: { icon: CheckCircle, color: 'text-accent-emerald', bg: 'bg-accent-emerald' },
  interview: { icon: Calendar, color: 'text-accent-orange', bg: 'bg-accent-orange' },
  job_saved: { icon: Star, color: 'text-accent-violet', bg: 'bg-accent-violet' },
  score_ready: { icon: Award, color: 'text-accent-cyan', bg: 'bg-accent-cyan' },
  search_completed: { icon: Search, color: 'text-accent-cyan', bg: 'bg-accent-cyan' },
}

// ─── Score Ring ──────────────────────────────

function ScoreRing({ score, size = 48 }: { score: number; size?: number }) {
  const color = getScoreColor(score)
  const strokeWidth = 4
  const radius = (size - strokeWidth * 2) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={`${color}15`}
          strokeWidth={strokeWidth}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeLinecap="round"
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
        />
      </svg>
      <span className="absolute font-mono font-bold text-text-primary" style={{ fontSize: size === 48 ? 14 : 12 }}>
        {score}
      </span>
    </div>
  )
}

// ─── Main Component ──────────────────────────

export default function Dashboard() {
  const navigate = useNavigate()
  const addToast = useUIStore((s) => s.addToast)
  const [searchActive, setSearchActive] = useState(false)
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())

  const handleSaveJob = (job: Job) => {
    updateJob(job.id, { saved: true, status: 'saved' })
    setSavedIds((prev) => new Set(prev).add(job.id))
    addToast({ type: 'success', title: 'Saved to pipeline', message: job.title })
  }

  useEffect(() => {
    getStats().then((s) => { if (s) setStats(s) }).catch(() => {})
  }, [])

  // Top matches from this account only.
  const topJobs = useMemo<Job[]>(() => {
    if (stats?.topMatches?.length) return stats.topMatches.slice(0, 3)
    return []
  }, [stats])

  // Pipeline derived from real status counts
  const pipeline = useMemo(() => {
    const bs = stats?.byStatus || {}
    return PIPELINE_STAGES.map((s) => ({
      stage: s.stage,
      count: s.keys.reduce((n, k) => n + (bs[k] || 0), 0),
      color: s.color,
    }))
  }, [stats])
  const totalPipeline = pipeline.reduce((sum, s) => sum + s.count, 0)

  // Deadlines with computed urgency
  const deadlines = useMemo(
    () =>
      (stats?.deadlines || []).map((d) => {
        const days = Math.ceil((new Date(d.deadline).getTime() - Date.now()) / 86400000)
        return { ...d, urgency: days <= 1 ? 'soon' : days <= 4 ? 'this_week' : 'later', days }
      }),
    [stats],
  )

  // Recent activity from the real pipeline
  const recentActivity = useMemo(
    () =>
      (stats?.activity || []).map((a) => ({
        id: a.id,
        type:
          a.status === 'applied' ? 'applied'
          : a.status === 'interview' || a.status === 'technical_test' ? 'interview'
          : a.status === 'saved' ? 'job_saved'
          : a.status === 'cv_drafted' ? 'cv_generated'
          : a.status === 'cl_drafted' ? 'letter_generated'
          : 'score_ready',
        description: `${a.title} — ${a.company}${a.score ? ` (${a.score}%)` : ''}`,
        timestamp: a.timestamp,
      })),
    [stats],
  )

  const num = (n: number | undefined) => String(n ?? 0)

  return (
    <div className="space-y-5">
      {/* ─── Section 1: Search Status Bar ───── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
        className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 rounded-card bg-bg-secondary border border-border-subtle"
      >
        <div className="flex items-center gap-6 flex-wrap">
          {/* Status indicator */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <span className={`w-2.5 h-2.5 rounded-full ${searchActive ? 'bg-accent-emerald' : 'bg-text-muted'} block`} />
              {searchActive && (
                <span className="absolute inset-0 w-2.5 h-2.5 rounded-full bg-accent-emerald animate-ping opacity-60" />
              )}
            </div>
            <div>
              <p className={`text-sm font-semibold ${searchActive ? 'text-accent-emerald' : 'text-text-muted'}`}>
                {searchActive ? 'Searching' : 'Paused'}
              </p>
              <p className="text-[11px] text-text-muted">Agent is {searchActive ? 'active' : 'paused'}</p>
            </div>
          </div>

          {/* Jobs tracked */}
          <div className="hidden sm:block">
            <p className="text-[11px] text-text-muted">Jobs tracked</p>
            <p className="text-sm text-text-primary">{num(stats?.totalJobs)} total</p>
            <p className="text-[11px] text-text-muted">{num(stats?.scoredJobs)} AI-scored</p>
          </div>

          {/* Search mode */}
          <div className="hidden sm:block">
            <p className="text-[11px] text-text-muted">Search</p>
            <p className="text-sm text-text-primary">On demand</p>
            <p className="text-[11px] text-text-muted">Run from Jobs → AI Search</p>
          </div>

          {/* Summary badges (live) */}
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-accent-indigo/[0.12] text-accent-indigo">
              {num(stats?.newThisWeek)} this week
            </span>
            <span className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-accent-emerald/[0.12] text-accent-emerald">
              {num(stats?.strongMatches)} strong matches
            </span>
            <span className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-accent-amber/[0.12] text-accent-amber">
              {deadlines.length} near deadline
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSearchActive(!searchActive)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-button bg-accent-indigo text-white text-sm font-semibold hover:bg-accent-indigo-hover hover:shadow-[0_4px_12px_rgba(99,102,241,0.3)] active:scale-[0.98] transition-all"
          >
            {searchActive ? <Pause size={14} /> : <Play size={14} />}
            {searchActive ? 'Pause' : 'Run Now'}
          </button>
          <a
            href="#/search-settings"
            className="p-2 rounded-lg hover:bg-bg-tertiary text-text-muted hover:text-text-primary transition-colors"
            title="Settings"
          >
            <Settings size={16} />
          </a>
        </div>
      </motion.div>

      {/* ─── Section 2: Stat Cards ──────────── */}
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4"
      >
        {[
          { label: 'Jobs Tracked', value: num(stats?.totalJobs), icon: Briefcase, accent: 'border-t-accent-cyan', iconColor: 'text-accent-cyan', trend: `${num(stats?.newThisWeek)} new this week`, trendUp: true },
          { label: 'Strong Matches', value: num(stats?.strongMatches), icon: Award, accent: 'border-t-accent-orange', iconColor: 'text-accent-orange', trend: `${num(stats?.needReview)} to review`, trendUp: null },
          { label: 'Avg Match Score', value: num(stats?.averageMatchScore), icon: AlertTriangle, accent: 'border-t-accent-amber', iconColor: 'text-accent-amber', trend: `${num(stats?.scoredJobs)} scored`, trendUp: null },
          { label: 'CV Drafts', value: num(stats?.byStatus?.cv_drafted), icon: FileText, accent: 'border-t-accent-indigo', iconColor: 'text-accent-indigo', trend: 'View all →', trendUp: null, isLink: true },
          { label: 'Cover Letters', value: num(stats?.byStatus?.cl_drafted), icon: FileText, accent: 'border-t-accent-violet', iconColor: 'text-accent-violet', trend: 'View all →', trendUp: null, isLink: true },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            custom={i}
            variants={cardVariants}
            className={`p-5 rounded-card bg-bg-secondary border border-border-subtle ${stat.accent} border-t-[3px] hover:border-border-default hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,0,0,0.15)] transition-all cursor-default`}
          >
            <div className="flex items-center gap-2 mb-3">
              <stat.icon size={18} className={stat.iconColor} />
            </div>
            <p className="font-mono text-[32px] font-bold text-text-primary leading-none">{stat.value}</p>
            <p className="text-xs text-text-secondary mt-2">{stat.label}</p>
            {stat.trend && (
              <p className={`text-[11px] mt-1.5 flex items-center gap-1 ${
                stat.isLink ? 'text-accent-indigo hover:underline cursor-pointer' :
                stat.trendUp === true ? 'text-accent-emerald' :
                stat.trendUp === false ? 'text-accent-rose' :
                'text-accent-amber'
              }`}>
                {stat.trendUp === true && <ArrowUpRight size={10} />}
                {stat.trendUp === false && <ArrowDownRight size={10} />}
                {stat.trend}
              </p>
            )}
          </motion.div>
        ))}
      </motion.div>

      {/* Second row of stats */}
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-2 sm:grid-cols-4 gap-4"
      >
        {[
          { label: 'Saved', value: num(stats?.savedJobs), icon: Star, accent: 'border-t-accent-violet', iconColor: 'text-accent-violet' },
          { label: 'Applied', value: num(stats?.applied), icon: CheckCircle, accent: 'border-t-accent-emerald', iconColor: 'text-accent-emerald' },
          { label: 'Interviews', value: num(stats?.interviewsScheduled), icon: Calendar, accent: 'border-t-accent-cyan', iconColor: 'text-accent-cyan' },
          { label: 'Deadlines', value: String(deadlines.length), icon: Clock, accent: 'border-t-accent-rose', iconColor: 'text-accent-rose' },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            custom={i}
            variants={cardVariants}
            className={`p-5 rounded-card bg-bg-secondary border border-border-subtle ${stat.accent} border-t-[3px] hover:border-border-default hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,0,0,0.15)] transition-all cursor-default`}
          >
            <div className="flex items-center gap-2 mb-3">
              <stat.icon size={18} className={stat.iconColor} />
            </div>
            <p className="font-mono text-[32px] font-bold text-text-primary leading-none">{stat.value}</p>
            <p className="text-xs text-text-secondary mt-2">{stat.label}</p>
          </motion.div>
        ))}
      </motion.div>

      {/* ─── Section 3: Quick Actions + Pipeline ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.3 }}
          className="p-5 rounded-card bg-bg-secondary border border-border-subtle"
        >
          <div className="flex items-center gap-2 mb-4">
            <Zap size={16} className="text-accent-indigo" />
            <h3 className="font-heading text-base font-semibold text-text-primary">Quick Actions</h3>
          </div>

          <div className="space-y-2.5">
            <a
              href={topJobs[0] ? `#/jobs/${topJobs[0].id}?action=cv` : '#/jobs'}
              className="flex items-center justify-between w-full px-4 py-3 rounded-button bg-accent-indigo text-white hover:bg-accent-indigo-hover hover:shadow-[0_4px_12px_rgba(99,102,241,0.3)] active:scale-[0.98] transition-all text-left"
            >
              <div className="flex items-center gap-3">
                <Wand2 size={16} />
                <div>
                  <p className="text-sm font-semibold">Generate CV for Best Match</p>
                  <p className="text-[11px] text-white/70">
                    {topJobs[0] ? `${topJobs[0].title} at ${topJobs[0].company} (${topJobs[0].match_score}%)` : 'Run a search to find your best match'}
                  </p>
                </div>
              </div>
              <ChevronRight size={16} />
            </a>

            {[
              { label: 'Show Top Jobs', desc: 'View highest-scoring matches', icon: Briefcase, href: '#/jobs' },
              { label: 'Run AI Search', desc: 'Check all sources now', icon: Play, href: '#/search-settings' },
              { label: 'Add a Job Manually', desc: 'Paste a job URL or description', icon: Plus, href: '#/manual-job' },
              { label: 'Review Skill Gaps', desc: 'Skills blocking matches', icon: TrendingUp, href: '#/skill-gaps' },
            ].map((action) => (
              <a
                key={action.label}
                href={action.href}
                className="flex items-center gap-3 w-full px-4 py-2.5 rounded-lg border border-border-default bg-transparent text-text-primary hover:bg-bg-tertiary hover:border-border-focus transition-all text-left"
              >
                <action.icon size={16} className="text-text-secondary flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium">{action.label}</p>
                </div>
                <ChevronRight size={14} className="text-text-muted flex-shrink-0" />
              </a>
            ))}
          </div>
        </motion.div>

        {/* Application Pipeline */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.38 }}
          className="p-5 rounded-card bg-bg-secondary border border-border-subtle"
        >
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 size={16} className="text-accent-indigo" />
            <h3 className="font-heading text-base font-semibold text-text-primary">Application Pipeline</h3>
          </div>

          {/* Pipeline bar */}
          <div className="flex items-center gap-0.5 h-3 rounded-full overflow-hidden mb-4">
            {pipeline.filter((s) => s.count > 0).map((stage, i) => {
              const pct = totalPipeline > 0 ? (stage.count / totalPipeline) * 100 : 0
              return (
                <motion.div
                  key={stage.stage}
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.6, delay: 0.38 + i * 0.1, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
                  className="h-full rounded-full"
                  style={{ backgroundColor: stage.color }}
                  title={`${stage.stage}: ${stage.count}`}
                />
              )
            })}
          </div>

          {/* Status breakdown */}
          <div className="space-y-1.5">
            {pipeline.map((stage) => (
              <div
                key={stage.stage}
                onClick={() => navigate('/applications')}
                className="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-bg-tertiary transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: stage.color }} />
                  <span className="text-xs text-text-secondary group-hover:text-text-primary transition-colors">{stage.stage}</span>
                </div>
                <span className="text-xs font-mono text-text-primary">{stage.count}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* ─── Section 4: Top Job Matches ─────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.46 }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-heading text-base font-semibold text-text-primary">Top Matches Today</h3>
          <a href="#/jobs" className="text-xs text-accent-indigo hover:text-accent-indigo-hover flex items-center gap-1 transition-colors">
            View All <ChevronRight size={12} />
          </a>
        </div>

        <div className="space-y-3">
          {topJobs.map((job, i) => (
            <motion.div
              key={job.id}
              custom={i}
              variants={cardVariants}
              initial="hidden"
              animate="visible"
              onClick={() => navigate(`/jobs/${job.id}`)}
              className="flex items-center gap-4 p-4 rounded-card bg-bg-secondary border border-border-subtle hover:border-border-default hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,0,0,0.15)] transition-all group cursor-pointer"
            >
              {/* Left score bar */}
              <div className="w-1 h-12 rounded-full flex-shrink-0" style={{ backgroundColor: getScoreColor(job.match_score) }} />

              {/* Score ring */}
              <ScoreRing score={job.match_score} size={48} />

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="text-sm font-semibold text-text-primary truncate">{job.title}</h4>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-bg-tertiary text-text-muted flex-shrink-0">
                    {job.source}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-text-muted">
                  <span className="flex items-center gap-1">
                    <Briefcase size={10} />
                    {job.company}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin size={10} />
                    {job.location}
                  </span>
                  {job.salary_min && (
                    <span className="flex items-center gap-1 text-accent-emerald">
                      {job.salary_currency === 'GBP' ? '£' : job.salary_currency === 'EUR' ? '€' : '$'}
                      {(job.salary_min / 1000).toFixed(0)}k+
                    </span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => { e.stopPropagation(); handleSaveJob(job) }}
                  className={`p-1.5 rounded hover:bg-bg-tertiary transition-colors ${savedIds.has(job.id) ? 'text-accent-amber' : 'text-text-muted hover:text-text-primary'}`}
                  title="Save"
                >
                  <Star size={14} className={savedIds.has(job.id) ? 'fill-accent-amber' : ''} />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); navigate(`/jobs/${job.id}`) }}
                  className="p-1.5 rounded hover:bg-bg-tertiary text-text-muted hover:text-text-primary transition-colors"
                  title="View"
                >
                  <Eye size={14} />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); navigate(`/jobs/${job.id}?action=cv`) }}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-accent-indigo text-white text-xs font-medium hover:bg-accent-indigo-hover transition-colors"
                >
                  <Wand2 size={12} />
                  CV
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* ─── Section 5: Activity + Deadlines ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.54 }}
          className="p-5 rounded-card bg-bg-secondary border border-border-subtle"
        >
          <div className="flex items-center gap-2 mb-4">
            <Activity size={16} className="text-accent-cyan" />
            <h3 className="font-heading text-base font-semibold text-text-primary">Recent Activity</h3>
          </div>

          <div className="space-y-0">
            {recentActivity.length === 0 && (
              <p className="text-sm text-text-muted py-4">No activity yet — run an AI search and start saving jobs.</p>
            )}
            {recentActivity.map((activity, i) => {
              const config = ACTIVITY_ICONS[activity.type] || ACTIVITY_ICONS.job_found
              const Icon = config.icon
              return (
                <motion.div
                  key={activity.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.25, delay: 0.54 + i * 0.04 }}
                  className="flex items-start gap-3 py-3 border-b border-border-subtle/50 last:border-b-0 hover:bg-bg-tertiary/30 transition-colors rounded-lg px-2 -mx-2"
                >
                  <div className={`w-8 h-8 rounded-lg ${config.bg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                    <Icon size={14} className="text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-text-primary">{activity.description}</p>
                    <p className="text-[11px] text-text-muted mt-0.5">
                      {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                    </p>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </motion.div>

        {/* Upcoming Deadlines */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.62 }}
          className="p-5 rounded-card bg-bg-secondary border border-border-subtle"
        >
          <div className="flex items-center gap-2 mb-4">
            <Clock size={16} className="text-accent-rose" />
            <h3 className="font-heading text-base font-semibold text-text-primary">Upcoming Deadlines</h3>
          </div>

          <div className="space-y-2.5">
            {deadlines.length === 0 && (
              <p className="text-sm text-text-muted py-4">No deadlines set. Add a follow-up date on any job to track it here.</p>
            )}
            {deadlines.map((item, i) => {
              const urgencyColor = item.urgency === 'soon' ? '#FB7185' : item.urgency === 'this_week' ? '#FBBF24' : '#22D3EE'
              return (
                <motion.a
                  key={item.jobId}
                  href={`#/jobs/${item.jobId}`}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.25, delay: 0.62 + i * 0.06 }}
                  className="flex items-center gap-3 p-3 rounded-lg bg-bg-tertiary/50 border border-border-subtle/50 hover:border-border-default transition-all group"
                >
                  <div className="w-[3px] self-stretch rounded-full flex-shrink-0" style={{ backgroundColor: urgencyColor }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-text-primary font-medium truncate">{item.title}</p>
                    <p className="text-[11px] text-text-secondary">{item.company} · {item.action}</p>
                    <p className="text-[11px] mt-0.5" style={{ color: urgencyColor }}>
                      {item.days <= 0 ? 'Due today' : item.days === 1 ? 'Due tomorrow' : `Due in ${item.days} days`}
                    </p>
                  </div>
                  <Eye size={14} className="text-text-muted group-hover:text-text-primary transition-colors flex-shrink-0" />
                </motion.a>
              )
            })}
          </div>
        </motion.div>
      </div>

      {/* ─── Section 6: Weekly Summary ──────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.7 }}
        className="p-5 rounded-card bg-bg-secondary border border-border-subtle"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-heading text-base font-semibold text-text-primary">This Week&apos;s Summary</h3>
          <a href="#/reports" className="text-xs text-accent-indigo hover:text-accent-indigo-hover flex items-center gap-1 transition-colors">
            Full Report <ChevronRight size={12} />
          </a>
        </div>

        <div className="flex flex-col lg:flex-row gap-5">
          {/* Pipeline mini chart (real) */}
          <div className="w-full lg:w-1/2 h-[120px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={pipeline} barGap={2}>
                <Bar dataKey="count" fill="#6366F1" radius={[4, 4, 0, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Key stats (live) */}
          <div className="flex flex-wrap items-center gap-x-8 gap-y-2 lg:flex-1">
            <div>
              <p className="font-mono text-lg font-bold text-text-primary">{num(stats?.totalJobs)}</p>
              <p className="text-[11px] text-text-muted">jobs tracked</p>
            </div>
            <div>
              <p className="font-mono text-lg font-bold text-text-primary">{num(stats?.strongMatches)}</p>
              <p className="text-[11px] text-text-muted">strong matches</p>
            </div>
            <div>
              <p className="font-mono text-lg font-bold text-text-primary">{num(stats?.applied)}</p>
              <p className="text-[11px] text-text-muted">applications</p>
            </div>
            <div>
              <p className="font-mono text-lg font-bold text-text-primary">{num(stats?.averageMatchScore)}%</p>
              <p className="text-[11px] text-text-muted">avg match</p>
            </div>
          </div>
        </div>

        {/* Recommended action */}
        <div className="mt-4 p-3 rounded-lg bg-accent-indigo/[0.08] flex items-center gap-3">
          <Sparkles size={16} className="text-accent-indigo flex-shrink-0" />
          <p className="text-sm text-text-secondary flex-1">
            {stats && stats.totalJobs === 0
              ? 'Run an AI search from the Jobs page to start building your pipeline.'
              : `${num(stats?.strongMatches)} strong matches and ${deadlines.length} deadline${deadlines.length === 1 ? '' : 's'} to act on.`}
          </p>
          <a
            href="#/jobs"
            className="px-3 py-1.5 rounded-lg bg-accent-indigo text-white text-xs font-medium hover:bg-accent-indigo-hover transition-colors flex-shrink-0"
          >
            See Jobs
          </a>
        </div>
      </motion.div>
    </div>
  )
}
