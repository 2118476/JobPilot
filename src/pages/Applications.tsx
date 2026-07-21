import { useState, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutGrid,
  List,
  Table2,
  Filter,
  SortDesc,
  ChevronDown,
  Eye,
  Pencil,
  MoreHorizontal,
  X,
  Calendar,
  Clock,
  Building,
  MapPin,
  CheckCircle,
  Briefcase,
  ClipboardList,
  ChevronRight,
  FileText,
  MessageSquare,
} from 'lucide-react'
import { getJobs, findCachedJob } from '@/lib/api'
import type { Application, Job } from '@/types'
import { format, formatDistanceToNow } from 'date-fns'

// ─── Types ───────────────────────────────────

type ViewMode = 'kanban' | 'list' | 'table'
type SortOption = 'newest' | 'oldest' | 'highest_score' | 'company_az'

interface StatusColumn {
  id: string
  label: string
  color: string
  bgColor: string
  borderColor: string
  dotColor: string
}

// ─── Constants ───────────────────────────────

const STATUS_COLUMNS: StatusColumn[] = [
  { id: 'new', label: 'Found', color: 'text-accent-cyan', bgColor: 'bg-accent-cyan/[0.03]', borderColor: 'border-t-accent-cyan', dotColor: 'bg-accent-cyan' },
  { id: 'saved', label: 'Saved', color: 'text-accent-violet', bgColor: 'bg-accent-violet/[0.03]', borderColor: 'border-t-accent-violet', dotColor: 'bg-accent-violet' },
  { id: 'cv_drafted', label: 'CV Drafted', color: 'text-accent-indigo', bgColor: 'bg-accent-indigo/[0.03]', borderColor: 'border-t-accent-indigo', dotColor: 'bg-accent-indigo' },
  { id: 'cl_drafted', label: 'Cover Letter Drafted', color: 'text-accent-violet', bgColor: 'bg-accent-violet/[0.03]', borderColor: 'border-t-accent-violet', dotColor: 'bg-accent-violet' },
  { id: 'ready_to_apply', label: 'Ready to Apply', color: 'text-accent-amber', bgColor: 'bg-accent-amber/[0.03]', borderColor: 'border-t-accent-amber', dotColor: 'bg-accent-amber' },
  { id: 'applied', label: 'Applied', color: 'text-accent-emerald', bgColor: 'bg-accent-emerald/[0.03]', borderColor: 'border-t-accent-emerald', dotColor: 'bg-accent-emerald' },
  { id: 'interview', label: 'Interview', color: 'text-accent-orange', bgColor: 'bg-accent-orange/[0.03]', borderColor: 'border-t-accent-orange', dotColor: 'bg-accent-orange' },
  { id: 'technical_test', label: 'Technical Test', color: 'text-accent-cyan', bgColor: 'bg-accent-cyan/[0.03]', borderColor: 'border-t-accent-cyan', dotColor: 'bg-accent-cyan' },
  { id: 'rejected', label: 'Rejected', color: 'text-accent-rose', bgColor: 'bg-accent-rose/[0.03]', borderColor: 'border-t-accent-rose', dotColor: 'bg-accent-rose' },
  { id: 'offer', label: 'Offer', color: 'text-accent-emerald', bgColor: 'bg-accent-emerald/[0.03]', borderColor: 'border-t-accent-emerald', dotColor: 'bg-accent-emerald' },
  { id: 'closed', label: 'Closed', color: 'text-text-muted', bgColor: 'bg-[rgba(100,116,139,0.03)]', borderColor: 'border-t-[#64748B]', dotColor: 'bg-text-muted' },
  { id: 'withdrawn', label: 'Withdrawn', color: 'text-text-muted', bgColor: 'bg-[rgba(100,116,139,0.03)]', borderColor: 'border-t-[#64748B]', dotColor: 'bg-text-muted' },
]

const STATUS_CHIP_CLASSES: Record<string, string> = {
  new: 'bg-[rgba(34,211,238,0.12)] text-accent-cyan',
  saved: 'bg-[rgba(167,139,250,0.12)] text-accent-violet',
  cv_drafted: 'bg-[rgba(99,102,241,0.12)] text-accent-indigo',
  cl_drafted: 'bg-[rgba(167,139,250,0.12)] text-accent-violet',
  ready_to_apply: 'bg-[rgba(251,191,36,0.12)] text-accent-amber',
  applied: 'bg-[rgba(52,211,153,0.12)] text-accent-emerald',
  interview: 'bg-[rgba(251,146,60,0.12)] text-accent-orange',
  technical_test: 'bg-[rgba(34,211,238,0.12)] text-accent-cyan',
  rejected: 'bg-[rgba(251,113,133,0.12)] text-accent-rose',
  offer: 'bg-[rgba(52,211,153,0.12)] text-accent-emerald',
  closed: 'bg-[rgba(100,116,139,0.08)] text-text-muted',
  withdrawn: 'bg-[rgba(100,116,139,0.08)] text-text-muted',
}

const SCORE_COLORS = [
  { min: 85, color: '#34D399', label: 'Excellent' },
  { min: 70, color: '#FB923C', label: 'Strong' },
  { min: 55, color: '#FBBF24', label: 'Possible' },
  { min: 40, color: '#FB7185', label: 'Weak' },
  { min: 0, color: '#64748B', label: 'Skip' },
]

function getScoreColor(score: number) {
  return SCORE_COLORS.find((s) => score >= s.min)?.color || '#64748B'
}

const sortOptions: { value: SortOption; label: string }[] = [
  { value: 'newest', label: 'Newest' },
  { value: 'oldest', label: 'Oldest' },
  { value: 'highest_score', label: 'Highest Score' },
  { value: 'company_az', label: 'Company A-Z' },
]

// ─── Helpers ─────────────────────────────────

function getJob(jobId: string) {
  return findCachedJob(jobId)
}

// Statuses that count as "applications" (past the unsaved 'new'/'skipped' stage)
const APP_STATUSES = new Set<Application['status']>([
  'saved', 'cv_drafted', 'cl_drafted', 'ready_to_apply', 'applied', 'interview', 'technical_test', 'rejected', 'offer', 'closed', 'withdrawn',
])

function jobsToApplications(jobs: Job[]): Application[] {
  return jobs
    .filter((j) => APP_STATUSES.has(j.status as Application['status']))
    .map((j) => ({
      id: `app-${j.id}`,
      user_id: 'user-001',
      job_id: j.id,
      status: j.status as Application['status'],
      applied_date: j.applied_date,
      notes: j.notes,
      next_action: j.next_action,
      next_action_date: j.next_action_date,
      interviews: [],
      communications: [],
      created_at: j.created_at,
      updated_at: j.updated_at,
    }))
}

function getStatusColumn(status: string): StatusColumn {
  return STATUS_COLUMNS.find((c) => c.id === status) || STATUS_COLUMNS[0]
}

// ─── Main Component ──────────────────────────

export default function Applications() {
  const [viewMode, setViewMode] = useState<ViewMode>('kanban')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<SortOption>('newest')
  const [selectedApp, setSelectedApp] = useState<string | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [collapsedColumns, setCollapsedColumns] = useState<Set<string>>(
    new Set(['cv_drafted', 'cl_drafted', 'ready_to_apply', 'technical_test', 'offer', 'closed', 'withdrawn'])
  )

  // Applications are derived from the live job pipeline (jobs you've engaged with).
  // Start empty (no fabricated seed) and load the real jobs from the backend.
  const [jobs, setJobs] = useState<Job[]>([])
  useEffect(() => {
    getJobs().then((r) => { if (r && r.length) setJobs(r) }).catch(() => {})
  }, [])
  const applications = useMemo(() => jobsToApplications(jobs), [jobs])

  const filteredAndSortedApps = useMemo(() => {
    let apps = [...applications]

    // Status filter
    if (statusFilter !== 'all') {
      apps = apps.filter((a) => a.status === statusFilter)
    }

    // Sort
    apps.sort((a, b) => {
      const jobA = getJob(a.job_id)
      const jobB = getJob(b.job_id)
      switch (sortBy) {
        case 'newest':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        case 'oldest':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        case 'highest_score':
          return (jobB?.match_score || 0) - (jobA?.match_score || 0)
        case 'company_az':
          return (jobA?.company || '').localeCompare(jobB?.company || '')
        default:
          return 0
      }
    })

    return apps
  }, [statusFilter, sortBy, applications])

  const selectedApplication = applications.find((a) => a.id === selectedApp)
  const selectedJob = selectedApplication ? getJob(selectedApplication.job_id) : null

  const toggleColumn = (colId: string) => {
    setCollapsedColumns((prev) => {
      const next = new Set(prev)
      if (next.has(colId)) next.delete(colId)
      else next.add(colId)
      return next
    })
  }

  const expandAllColumns = () => setCollapsedColumns(new Set())

  // Count apps per status
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    applications.forEach((a) => {
      counts[a.status] = (counts[a.status] || 0) + 1
    })
    return counts
  }, [applications])

  // ─── Render ──────────────────────────────────

  return (
    <div className="space-y-4">
      {/* View Toggle + Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-card bg-bg-secondary border border-border-subtle">
        <div className="flex items-center gap-2">
          {/* View toggle buttons */}
          <div className="flex items-center gap-1 p-1 rounded-lg bg-bg-tertiary">
            {([
              { mode: 'kanban' as ViewMode, icon: LayoutGrid, label: 'Kanban' },
              { mode: 'list' as ViewMode, icon: List, label: 'List' },
              { mode: 'table' as ViewMode, icon: Table2, label: 'Table' },
            ]).map(({ mode, icon: Icon, label }) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  viewMode === mode
                    ? 'bg-accent-indigo-muted text-accent-indigo'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
                title={label}
              >
                <Icon size={14} />
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Status Filter */}
          <div className="relative">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border-default bg-bg-tertiary text-text-secondary hover:text-text-primary text-sm transition-colors"
            >
              <Filter size={14} />
              <span>{statusFilter === 'all' ? 'All Statuses' : STATUS_COLUMNS.find((c) => c.id === statusFilter)?.label || statusFilter}</span>
              <ChevronDown size={12} />
            </button>
            <AnimatePresence>
              {showFilters && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowFilters(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-full mt-1 w-52 bg-bg-elevated border border-border-subtle rounded-lg shadow-lg z-50 py-1"
                  >
                    <button
                      onClick={() => { setStatusFilter('all'); setShowFilters(false) }}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-bg-tertiary transition-colors ${statusFilter === 'all' ? 'text-accent-indigo' : 'text-text-secondary'}`}
                    >
                      All Statuses
                    </button>
                    {STATUS_COLUMNS.map((col) => (
                      <button
                        key={col.id}
                        onClick={() => { setStatusFilter(col.id); setShowFilters(false) }}
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-bg-tertiary transition-colors flex items-center gap-2 ${statusFilter === col.id ? 'text-accent-indigo' : 'text-text-secondary'}`}
                      >
                        <span className={`w-2 h-2 rounded-full ${col.dotColor}`} />
                        {col.label}
                        <span className="ml-auto text-xs text-text-muted">{statusCounts[col.id] || 0}</span>
                      </button>
                    ))}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          {/* Sort */}
          <div className="relative group">
            <button className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border-default bg-bg-tertiary text-text-secondary hover:text-text-primary text-sm transition-colors">
              <SortDesc size={14} />
              <span className="hidden sm:inline">{sortOptions.find((s) => s.value === sortBy)?.label}</span>
            </button>
            <div className="absolute right-0 top-full mt-1 w-44 bg-bg-elevated border border-border-subtle rounded-lg shadow-lg z-50 py-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
              {sortOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setSortBy(opt.value)}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-bg-tertiary transition-colors ${sortBy === opt.value ? 'text-accent-indigo' : 'text-text-secondary'}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Application count */}
      <p className="text-sm text-text-muted px-1">
        {filteredAndSortedApps.length} application{filteredAndSortedApps.length !== 1 ? 's' : ''}
        {statusFilter !== 'all' ? ` in "${STATUS_COLUMNS.find((c) => c.id === statusFilter)?.label}"` : ''}
      </p>

      {/* ─── View Modes ─────────────────────── */}

      <AnimatePresence mode="wait">
        {viewMode === 'kanban' && (
          <motion.div
            key="kanban"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <KanbanView
              apps={filteredAndSortedApps}
              collapsedColumns={collapsedColumns}
              toggleColumn={toggleColumn}
              expandAllColumns={expandAllColumns}
              onSelectApp={setSelectedApp}
              statusCounts={statusCounts}
            />
          </motion.div>
        )}
        {viewMode === 'list' && (
          <motion.div
            key="list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <ListView apps={filteredAndSortedApps} onSelectApp={setSelectedApp} />
          </motion.div>
        )}
        {viewMode === 'table' && (
          <motion.div
            key="table"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <TableView apps={filteredAndSortedApps} onSelectApp={setSelectedApp} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty state */}
      {filteredAndSortedApps.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-20"
        >
          <img src="/empty-applications.png" alt="No applications" className="w-48 h-36 object-contain mb-6 opacity-60" />
          <h3 className="font-heading text-lg font-semibold text-text-secondary mb-2">No applications yet</h3>
          <p className="text-sm text-text-muted max-w-sm text-center mb-6">
            Save jobs from the Jobs page to start tracking your applications.
          </p>
          <a
            href="#/jobs"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-button bg-bg-tertiary border border-border-default text-text-primary text-sm font-medium hover:bg-bg-elevated transition-colors"
          >
            <Briefcase size={14} />
            Browse Jobs
          </a>
        </motion.div>
      )}

      {/* ─── Detail Drawer ──────────────────── */}
      <AnimatePresence>
        {selectedApp && selectedApplication && selectedJob && (
          <ApplicationDrawer
            app={selectedApplication}
            job={selectedJob}
            onClose={() => setSelectedApp(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Kanban View ─────────────────────────────

function KanbanView({
  apps,
  collapsedColumns,
  toggleColumn,
  expandAllColumns,
  onSelectApp,
  statusCounts,
}: {
  apps: Application[]
  collapsedColumns: Set<string>
  toggleColumn: (id: string) => void
  expandAllColumns: () => void
  onSelectApp: (id: string) => void
  statusCounts: Record<string, number>
}) {
  const visibleColumns = STATUS_COLUMNS.filter((col) => !collapsedColumns.has(col.id))
  const hasCollapsed = collapsedColumns.size > 0

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 overflow-x-auto pb-2" style={{ minHeight: 'calc(100vh - 280px)' }}>
        {visibleColumns.map((col, colIndex) => {
          const colApps = apps.filter((a) => a.status === col.id)

          return (
            <motion.div
              key={col.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: colIndex * 0.08, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
              className={`flex-shrink-0 w-[280px] ${col.bgColor} rounded-card border border-border-subtle border-t-[3px] ${col.borderColor} flex flex-col max-h-full`}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between px-3 py-2.5 border-b border-border-subtle/50">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${col.dotColor}`} />
                  <span className={`text-sm font-semibold ${col.color}`}>{col.label}</span>
                  <span className="text-xs text-text-muted font-mono">({statusCounts[col.id] || 0})</span>
                </div>
                <button
                  onClick={() => toggleColumn(col.id)}
                  className="p-1 rounded hover:bg-bg-tertiary text-text-muted hover:text-text-secondary transition-colors"
                  title="Collapse column"
                >
                  <X size={12} />
                </button>
              </div>

              {/* Cards */}
              <div className="flex-1 overflow-y-auto p-2 space-y-2" style={{ maxHeight: 'calc(100vh - 340px)' }}>
                <AnimatePresence>
                  {colApps.map((app, appIndex) => (
                    <KanbanCard
                      key={app.id}
                      app={app}
                      index={appIndex}
                      onClick={() => onSelectApp(app.id)}
                    />
                  ))}
                </AnimatePresence>

                {colApps.length === 0 && (
                  <div className="text-center py-6 text-xs text-text-muted">
                    No {col.label.toLowerCase()} applications
                  </div>
                )}
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Show all columns button */}
      {hasCollapsed && (
        <button
          onClick={expandAllColumns}
          className="text-sm text-accent-indigo hover:text-accent-indigo-hover transition-colors font-medium"
        >
          Show all columns ({collapsedColumns.size} hidden)
        </button>
      )}
    </div>
  )
}

// ─── Kanban Card ─────────────────────────────

function KanbanCard({
  app,
  index,
  onClick,
}: {
  app: Application
  index: number
  onClick: () => void
}) {
  const job = getJob(app.job_id)
  if (!job) return null

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.25, delay: index * 0.04, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
      onClick={onClick}
      className="p-3 rounded-[10px] bg-bg-secondary border border-border-subtle hover:border-border-default hover:shadow-[0_2px_8px_rgba(0,0,0,0.1)] transition-all cursor-pointer group relative"
    >
      {/* Score badge */}
      <div className="absolute top-2 right-2">
        <ScoreBadge score={job.match_score} size="sm" />
      </div>

      {/* Title */}
      <h4 className="text-[13px] font-semibold text-text-primary leading-tight pr-10 line-clamp-2 mb-1">
        {job.title}
      </h4>

      {/* Company */}
      <p className="text-xs text-text-secondary mb-2">{job.company}</p>

      {/* Meta row */}
      <div className="flex items-center gap-3 mb-2">
        {job.location && (
          <span className="flex items-center gap-1 text-[11px] text-text-muted">
            <MapPin size={10} />
            {job.location}
          </span>
        )}
        {job.salary_min && (
          <span className="flex items-center gap-1 text-[11px] text-accent-emerald">
            {job.salary_currency === 'GBP' ? '£' : job.salary_currency === 'EUR' ? '€' : '$'}
            {(job.salary_min / 1000).toFixed(0)}k+
          </span>
        )}
      </div>

      {/* Bottom row */}
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-text-muted">
          {app.applied_date
            ? formatDistanceToNow(new Date(app.applied_date), { addSuffix: true })
            : formatDistanceToNow(new Date(app.created_at), { addSuffix: true })}
        </span>
        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-bg-tertiary text-text-muted">
          {job.source}
        </span>
      </div>

      {/* Next action indicator */}
      {app.next_action && (
        <div className="mt-2 flex items-center gap-1.5 px-2 py-1 rounded bg-accent-amber/[0.08]">
          <Calendar size={10} className="text-accent-amber flex-shrink-0" />
          <span className="text-[10px] text-accent-amber truncate">{app.next_action}</span>
        </div>
      )}

      {/* Hover actions */}
      <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 p-1 opacity-0 group-hover:opacity-100 transition-opacity bg-bg-secondary/95 rounded-b-[10px]">
        <button className="p-1 rounded hover:bg-bg-tertiary text-text-muted hover:text-text-primary" title="View">
          <Eye size={12} />
        </button>
        <button className="p-1 rounded hover:bg-bg-tertiary text-text-muted hover:text-text-primary" title="Edit">
          <Pencil size={12} />
        </button>
        <button className="p-1 rounded hover:bg-bg-tertiary text-text-muted hover:text-text-primary" title="More">
          <MoreHorizontal size={12} />
        </button>
      </div>
    </motion.div>
  )
}

// ─── Score Badge ─────────────────────────────

function ScoreBadge({ score, size = 'md' }: { score: number; size?: 'sm' | 'md' | 'lg' }) {
  const color = getScoreColor(score)
  const dimensions = size === 'sm' ? 28 : size === 'md' ? 40 : 48
  const fontSize = size === 'sm' ? 10 : size === 'md' ? 14 : 16
  const strokeWidth = size === 'sm' ? 2 : 3

  const radius = (dimensions - strokeWidth * 2) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: dimensions, height: dimensions }}>
      <svg width={dimensions} height={dimensions} className="-rotate-90">
        <circle cx={dimensions / 2} cy={dimensions / 2} r={radius} fill="none" stroke={`${color}20`} strokeWidth={strokeWidth} />
        <circle
          cx={dimensions / 2}
          cy={dimensions / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-700"
        />
      </svg>
      <span className="absolute font-mono font-bold" style={{ fontSize, color }}>
        {score}
      </span>
    </div>
  )
}

// ─── List View ───────────────────────────────

function ListView({
  apps,
  onSelectApp,
}: {
  apps: Application[]
  onSelectApp: (id: string) => void
}) {
  return (
    <div className="space-y-3">
      {apps.map((app, index) => {
        const job = getJob(app.job_id)
        if (!job) return null

        return (
          <motion.div
            key={app.id}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.04, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
            onClick={() => onSelectApp(app.id)}
            className="flex items-center gap-4 p-4 rounded-card bg-bg-secondary border border-border-subtle hover:border-border-default hover:-translate-y-0.5 hover:shadow-lg transition-all cursor-pointer"
          >
            {/* Score badge */}
            <ScoreBadge score={job.match_score} size="md" />

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="text-sm font-semibold text-text-primary truncate">{job.title}</h4>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap ${STATUS_CHIP_CLASSES[app.status] || ''}`}>
                  {app.status.replace(/_/g, ' ')}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-text-muted">
                <span className="flex items-center gap-1">
                  <Building size={10} />
                  {job.company}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin size={10} />
                  {job.location}
                </span>
                <span>{job.source}</span>
              </div>
            </div>

            {/* Date */}
            <div className="hidden sm:block text-right flex-shrink-0">
              <p className="text-xs text-text-muted">
                {app.applied_date
                  ? format(new Date(app.applied_date), 'MMM d, yyyy')
                  : format(new Date(app.created_at), 'MMM d, yyyy')}
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 flex-shrink-0">
              <button className="p-1.5 rounded hover:bg-bg-tertiary text-text-muted hover:text-text-primary transition-colors" title="View">
                <Eye size={14} />
              </button>
              <button className="p-1.5 rounded hover:bg-bg-tertiary text-text-muted hover:text-text-primary transition-colors" title="Edit">
                <Pencil size={14} />
              </button>
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}

// ─── Table View ──────────────────────────────

function TableView({
  apps,
  onSelectApp,
}: {
  apps: Application[]
  onSelectApp: (id: string) => void
}) {
  return (
    <div className="overflow-x-auto rounded-card bg-bg-secondary border border-border-subtle">
      <table className="w-full">
        <thead>
          <tr className="text-left text-xs text-text-muted border-b border-border-subtle bg-bg-tertiary">
            <th className="px-4 py-3 font-medium">Score</th>
            <th className="px-4 py-3 font-medium">Job Title</th>
            <th className="px-4 py-3 font-medium">Company</th>
            <th className="px-4 py-3 font-medium hidden md:table-cell">Location</th>
            <th className="px-4 py-3 font-medium hidden lg:table-cell">Status</th>
            <th className="px-4 py-3 font-medium hidden sm:table-cell">Date</th>
            <th className="px-4 py-3 font-medium hidden lg:table-cell">Source</th>
            <th className="px-4 py-3 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {apps.map((app, index) => {
            const job = getJob(app.job_id)
            if (!job) return null

            return (
              <motion.tr
                key={app.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2, delay: index * 0.03 }}
                onClick={() => onSelectApp(app.id)}
                className="border-b border-border-subtle/50 hover:bg-bg-tertiary/50 transition-colors cursor-pointer"
              >
                <td className="px-4 py-3">
                  <ScoreBadge score={job.match_score} size="sm" />
                </td>
                <td className="px-4 py-3 text-sm font-medium text-text-primary">{job.title}</td>
                <td className="px-4 py-3 text-sm text-text-secondary">{job.company}</td>
                <td className="px-4 py-3 text-xs text-text-muted hidden md:table-cell">{job.location}</td>
                <td className="px-4 py-3 hidden lg:table-cell">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${STATUS_CHIP_CLASSES[app.status] || ''}`}>
                    {app.status.replace(/_/g, ' ')}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-text-muted hidden sm:table-cell">
                  {app.applied_date
                    ? format(new Date(app.applied_date), 'MMM d')
                    : format(new Date(app.created_at), 'MMM d')}
                </td>
                <td className="px-4 py-3 text-xs text-text-muted hidden lg:table-cell">{job.source}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <button className="p-1 rounded hover:bg-bg-tertiary text-text-muted hover:text-text-primary" title="View">
                      <Eye size={12} />
                    </button>
                    <button className="p-1 rounded hover:bg-bg-tertiary text-text-muted hover:text-text-primary" title="Edit">
                      <Pencil size={12} />
                    </button>
                  </div>
                </td>
              </motion.tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ─── Application Detail Drawer ───────────────

function ApplicationDrawer({
  app,
  job,
  onClose,
}: {
  app: Application
  job: Job
  onClose: () => void
}) {
  const statusCol = getStatusColumn(app.status)

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 bg-black/60 z-45"
        onClick={onClose}
      />

      {/* Drawer */}
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
        className="fixed right-0 top-0 bottom-0 w-full sm:w-[520px] bg-bg-elevated border-l border-border-subtle z-50 overflow-y-auto"
      >
        {/* Header */}
        <div className="sticky top-0 bg-bg-elevated border-b border-border-subtle p-4 flex items-start justify-between z-10">
          <div>
            <h2 className="font-heading text-lg font-semibold text-text-primary pr-8">{job.title}</h2>
            <p className="text-sm text-text-secondary flex items-center gap-1 mt-1">
              <Building size={12} />
              {job.company}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-bg-tertiary text-text-muted hover:text-text-primary transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-6">
          {/* Score + Status */}
          <div className="flex items-center gap-4">
            <ScoreBadge score={job.match_score} size="lg" />
            <div>
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${STATUS_CHIP_CLASSES[app.status] || ''}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${statusCol.dotColor}`} />
                {app.status.replace(/_/g, ' ')}
              </span>
              <p className="text-xs text-text-muted mt-1.5">Match score: {job.match_score}/100</p>
            </div>
          </div>

          {/* Status Timeline */}
          <div>
            <h3 className="font-heading text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
              <Clock size={14} className="text-accent-indigo" />
              Status Timeline
            </h3>
            <div className="space-y-0">
              {[
                { status: 'Found', date: app.created_at, color: 'bg-accent-cyan', active: true },
                { status: app.status === 'saved' ? 'Saved' : app.status.replace(/_/g, ' '), date: app.updated_at, color: statusCol.dotColor, active: true },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3 relative">
                  {i < 1 && <div className="absolute left-[5px] top-6 bottom-0 w-px bg-border-subtle" />}
                  <div className={`w-3 h-3 rounded-full ${item.color} mt-1 flex-shrink-0`} />
                  <div className="pb-4">
                    <p className="text-sm text-text-primary font-medium">{item.status}</p>
                    <p className="text-xs text-text-muted">{format(new Date(item.date), 'MMM d, yyyy h:mm a')}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Application Details */}
          <div>
            <h3 className="font-heading text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
              <FileText size={14} className="text-accent-indigo" />
              Application Details
            </h3>
            <div className="space-y-3 bg-bg-secondary rounded-lg p-4 border border-border-subtle">
              {app.applied_date && (
                <div className="flex justify-between">
                  <span className="text-xs text-text-muted">Applied on</span>
                  <span className="text-sm text-text-primary">{format(new Date(app.applied_date), 'MMM d, yyyy')}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-xs text-text-muted">CV used</span>
                <span className="text-sm text-text-primary">{app.cv_version_id ? 'Tailored CV' : 'Master CV'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-text-muted">Cover letter</span>
                <span className="text-sm text-text-primary">{app.cover_letter_id ? 'Generated' : 'Not generated'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-text-muted">Job source</span>
                <a href={job.source_url} target="_blank" rel="noopener noreferrer" className="text-sm text-accent-indigo hover:text-accent-indigo-hover flex items-center gap-1">
                  {job.source}
                  <ChevronRight size={12} />
                </a>
              </div>
            </div>
          </div>

          {/* Follow-up */}
          {app.next_action && (
            <div>
              <h3 className="font-heading text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
                <Calendar size={14} className="text-accent-amber" />
                Follow-up
              </h3>
              <div className="p-4 rounded-lg bg-accent-amber/[0.05] border border-accent-amber/20">
                <p className="text-sm font-medium text-accent-amber">{app.next_action}</p>
                {app.next_action_date && (
                  <p className="text-xs text-text-muted mt-1">
                    Due: {format(new Date(app.next_action_date), 'MMM d, yyyy h:mm a')}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Interviews */}
          {app.interviews.length > 0 && (
            <div>
              <h3 className="font-heading text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
                <CheckCircle size={14} className="text-accent-emerald" />
                Interviews ({app.interviews.length})
              </h3>
              <div className="space-y-3">
                {app.interviews.map((interview) => (
                  <div
                    key={interview.id}
                    className="p-4 rounded-lg bg-bg-secondary border border-border-subtle"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-text-primary capitalize">
                        {interview.type.replace(/_/g, ' ')}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                        interview.status === 'completed'
                          ? 'bg-accent-emerald/[0.12] text-accent-emerald'
                          : interview.status === 'scheduled'
                          ? 'bg-accent-amber/[0.12] text-accent-amber'
                          : 'bg-accent-rose/[0.12] text-accent-rose'
                      }`}>
                        {interview.status}
                      </span>
                    </div>
                    <p className="text-xs text-text-muted">
                      {format(new Date(interview.scheduled_date), 'MMM d, yyyy h:mm a')}
                      {interview.duration_minutes && ` · ${interview.duration_minutes} min`}
                    </p>
                    {interview.interviewer_name && (
                      <p className="text-xs text-text-secondary mt-1">With: {interview.interviewer_name}</p>
                    )}
                    {interview.feedback && (
                      <p className="text-xs text-text-secondary mt-2 italic">"{interview.feedback}"</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {app.notes && (
            <div>
              <h3 className="font-heading text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
                <MessageSquare size={14} className="text-accent-violet" />
                Notes
              </h3>
              <div className="p-4 rounded-lg bg-bg-secondary border border-border-subtle">
                <p className="text-sm text-text-secondary whitespace-pre-line">{app.notes}</p>
              </div>
            </div>
          )}

          {/* Communications */}
          {app.communications.length > 0 && (
            <div>
              <h3 className="font-heading text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
                <ClipboardList size={14} className="text-accent-cyan" />
                Communications ({app.communications.length})
              </h3>
              <div className="space-y-2">
                {app.communications.map((comm) => (
                  <div key={comm.id} className="p-3 rounded-lg bg-bg-secondary border border-border-subtle">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-text-primary">{comm.subject || 'No subject'}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                        comm.direction === 'outbound'
                          ? 'bg-accent-indigo/[0.12] text-accent-indigo'
                          : 'bg-accent-emerald/[0.12] text-accent-emerald'
                      }`}>
                        {comm.direction}
                      </span>
                    </div>
                    <p className="text-xs text-text-muted mt-1">
                      {format(new Date(comm.sent_at), 'MMM d, yyyy h:mm a')}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </>
  )
}
