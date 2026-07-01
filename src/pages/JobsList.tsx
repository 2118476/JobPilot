import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { formatDistanceToNow, parseISO } from 'date-fns'
import {
  Search,
  Filter,
  SortDesc,
  LayoutGrid,
  List,
  Table as TableIcon,
  Star,
  Eye,
  Wand2,
  FileText,
  X,
  ExternalLink,
  Building,
  MapPin,
  PoundSterling,
  Clock,
  ChevronDown,
  CheckSquare,
  Square,
  Bookmark,
  Calendar,
  MessageSquare,
  Briefcase,
  Award,
  Sparkles,
  RefreshCw,
} from 'lucide-react'
import { mockJobs } from '@/data/mockData'
import { getJobs as apiGetJobs, searchJobs, updateJob } from '@/lib/api'
import type { Job } from '@/types'

// ─── Utility: Score Color Helpers ──────────────────────────────────────

function getScoreColor(score: number): string {
  if (score >= 85) return '#34D399'
  if (score >= 70) return '#FB923C'
  if (score >= 55) return '#FBBF24'
  if (score >= 40) return '#FB7185'
  return '#64748B'
}

function getScoreColorClass(score: number): string {
  if (score >= 85) return 'text-accent-emerald'
  if (score >= 70) return 'text-accent-orange'
  if (score >= 55) return 'text-accent-amber'
  if (score >= 40) return 'text-accent-rose'
  return 'text-text-muted'
}

function getStatusConfig(status: Job['status']) {
  const configs: Record<string, { label: string; color: string; bg: string; dot: string }> = {
    new: { label: 'New', color: 'text-accent-cyan', bg: 'bg-accent-cyan-muted', dot: 'bg-accent-cyan' },
    saved: { label: 'Saved', color: 'text-accent-violet', bg: 'bg-accent-violet-muted', dot: 'bg-accent-violet' },
    cv_drafted: { label: 'CV Drafted', color: 'text-accent-indigo', bg: 'bg-accent-indigo-muted', dot: 'bg-accent-indigo' },
    cl_drafted: { label: 'CL Drafted', color: 'text-accent-violet', bg: 'bg-accent-violet-muted', dot: 'bg-accent-violet' },
    ready_to_apply: { label: 'Ready', color: 'text-accent-amber', bg: 'bg-accent-amber-muted', dot: 'bg-accent-amber' },
    applied: { label: 'Applied', color: 'text-accent-emerald', bg: 'bg-accent-emerald-muted', dot: 'bg-accent-emerald' },
    interview: { label: 'Interview', color: 'text-accent-orange', bg: 'bg-accent-orange-muted', dot: 'bg-accent-orange' },
    technical_test: { label: 'Tech Test', color: 'text-accent-cyan', bg: 'bg-accent-cyan-muted', dot: 'bg-accent-cyan' },
    rejected: { label: 'Rejected', color: 'text-accent-rose', bg: 'bg-accent-rose-muted', dot: 'bg-accent-rose' },
    offer: { label: 'Offer', color: 'text-accent-emerald', bg: 'bg-accent-emerald-muted', dot: 'bg-accent-emerald' },
    closed: { label: 'Closed', color: 'text-text-muted', bg: 'bg-text-muted/10', dot: 'bg-text-muted' },
    withdrawn: { label: 'Withdrawn', color: 'text-text-muted', bg: 'bg-text-muted/10', dot: 'bg-text-muted' },
    skipped: { label: 'Skipped', color: 'text-text-muted', bg: 'bg-text-muted/10', dot: 'bg-text-muted' },
  }
  return configs[status] || configs.new
}

// ─── Animated Score Ring ───────────────────────────────────────────────

function ScoreRing({ score, size = 56, strokeWidth = 4, className = '' }: {
  score: number
  size?: number
  strokeWidth?: number
  className?: string
}) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const color = getScoreColor(score)
  const [animated, setAnimated] = useState(false)
  const ref = useRef<SVGCircleElement>(null)

  useEffect(() => {
    const timer = setTimeout(() => setAnimated(true), 100)
    return () => clearTimeout(timer)
  }, [score])

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-bg-tertiary"
        />
        <circle
          ref={ref}
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={animated ? circumference - (score / 100) * circumference : circumference}
          style={{ transition: 'stroke-dashoffset 800ms cubic-bezier(0.16, 1, 0.3, 1)' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`font-mono font-bold leading-none ${size >= 120 ? 'text-5xl' : size >= 80 ? 'text-3xl' : size >= 64 ? 'text-2xl' : 'text-lg'} ${getScoreColorClass(score)}`}>
          {score}
        </span>
        {size >= 64 && (
          <span className="text-[10px] text-text-muted mt-0.5">Match</span>
        )}
      </div>
    </div>
  )
}

// ─── Status Chip ───────────────────────────────────────────────────────

function StatusChip({ status }: { status: Job['status'] }) {
  const config = getStatusConfig(status)
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${config.bg} ${config.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  )
}

// ─── Filter State Type ─────────────────────────────────────────────────

interface FilterState {
  [key: string]: string | string[] | number | boolean
  search: string
  scoreMin: number
  scoreMax: number
  sources: string[]
  statuses: string[]
  remoteType: string
  locations: string[]
  salaryMin: number
  salaryMax: number
  jobType: string[]
  datePosted: string
  savedOnly: boolean
  strongMatchesOnly: boolean
  publicSectorOnly: boolean
  juniorOnly: boolean
  notApplied: boolean
  applied: boolean
  rejected: boolean
  interview: boolean
}

const defaultFilters: FilterState = {
  search: '',
  scoreMin: 0,
  scoreMax: 100,
  sources: [],
  statuses: ['new', 'saved', 'cv_drafted', 'cl_drafted', 'ready_to_apply', 'applied', 'interview', 'technical_test'],
  remoteType: 'all',
  locations: [],
  salaryMin: 0,
  salaryMax: 500000,
  jobType: [],
  datePosted: 'any',
  savedOnly: false,
  strongMatchesOnly: false,
  publicSectorOnly: false,
  juniorOnly: false,
  notApplied: false,
  applied: false,
  rejected: false,
  interview: false,
}

// ─── Main Component ────────────────────────────────────────────────────

export default function JobsList() {
  const navigate = useNavigate()
  const [jobs, setJobs] = useState<Job[]>(mockJobs)
  const [liveMode, setLiveMode] = useState(false)
  const [searching, setSearching] = useState(false)

  // Load live (AI-scored) jobs from the backend; fall back to seed data.
  useEffect(() => {
    apiGetJobs()
      .then((r) => {
        if (r && r.length) {
          setJobs(r)
          setLiveMode(true)
        }
      })
      .catch(() => {})
  }, [])

  // Trigger a fresh job-board search + AI scoring.
  const runSearch = useCallback(async () => {
    setSearching(true)
    try {
      const r = await searchJobs({ scoreLimit: 10 })
      if (r && r.jobs?.length) {
        setJobs(r.jobs)
        setLiveMode(true)
      }
    } finally {
      setSearching(false)
    }
  }, [])

  const [filters, setFilters] = useState<FilterState>(defaultFilters)
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false)
  const [sortBy, setSortBy] = useState<string>('best_match')
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false)
  const [viewMode, setViewMode] = useState<'card' | 'compact' | 'table'>('card')
  const [selectedJobs, setSelectedJobs] = useState<Set<string>>(new Set())
  const [showBatchBar, setShowBatchBar] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(1)
  const [savedJobIds, setSavedJobIds] = useState<Set<string>>(new Set(mockJobs.filter(j => j.status === 'saved').map(j => j.id)))
  const [skippedJobIds, setSkippedJobIds] = useState<Set<string>>(new Set(mockJobs.filter(j => j.status === 'skipped').map(j => j.id)))
  const PAGE_SIZE = 20

  // Keep saved/skipped sets in sync with persisted job state on (re)load
  useEffect(() => {
    setSavedJobIds(new Set(jobs.filter(j => j.saved || j.status === 'saved').map(j => j.id)))
    setSkippedJobIds(new Set(jobs.filter(j => j.skipped || j.status === 'skipped').map(j => j.id)))
  }, [jobs])

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters(prev => ({ ...prev, search: searchQuery }))
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Get unique sources and locations
  const sources = useMemo(() => [...new Set(jobs.map(j => j.source))], [jobs])
  // Apply filters
  const filteredJobs = useMemo(() => {
    let result = [...jobs]

    // Search
    if (filters.search) {
      const q = filters.search.toLowerCase()
      result = result.filter(j =>
        j.title.toLowerCase().includes(q) ||
        j.company.toLowerCase().includes(q) ||
        j.location.toLowerCase().includes(q) ||
        j.description.toLowerCase().includes(q) ||
        j.source.toLowerCase().includes(q) ||
        j.match_analysis?.matched_skills.some(s => s.toLowerCase().includes(q)) ||
        j.match_analysis?.missing_skills.some(s => s.toLowerCase().includes(q))
      )
    }

    // Score range
    result = result.filter(j => j.match_score >= filters.scoreMin && j.match_score <= filters.scoreMax)

    // Sources
    if (filters.sources.length > 0) {
      result = result.filter(j => filters.sources.includes(j.source))
    }

    // Statuses
    if (filters.statuses.length > 0) {
      result = result.filter(j => filters.statuses.includes(j.status))
    }

    // Remote type
    if (filters.remoteType !== 'all') {
      result = result.filter(j => j.remote_type === filters.remoteType)
    }

    // Locations
    if (filters.locations.length > 0) {
      result = result.filter(j => filters.locations.some(loc => j.location.toLowerCase().includes(loc.toLowerCase())))
    }

    // Salary
    if (filters.salaryMin > 0) {
      result = result.filter(j => (j.salary_max || 0) >= filters.salaryMin)
    }
    if (filters.salaryMax < 500000) {
      result = result.filter(j => (j.salary_min || 0) <= filters.salaryMax)
    }

    // Saved only
    if (filters.savedOnly) {
      result = result.filter(j => savedJobIds.has(j.id))
    }

    // Strong matches
    if (filters.strongMatchesOnly) {
      result = result.filter(j => j.match_score >= 70)
    }

    // Quick filters
    if (filters.notApplied) {
      result = result.filter(j => j.status !== 'applied' && j.status !== 'rejected' && j.status !== 'interview')
    }
    if (filters.applied) {
      result = result.filter(j => j.status === 'applied')
    }
    if (filters.rejected) {
      result = result.filter(j => j.status === 'rejected')
    }
    if (filters.interview) {
      result = result.filter(j => j.status === 'interview' || j.status === 'technical_test')
    }

    // Sort
    switch (sortBy) {
      case 'best_match':
        result.sort((a, b) => b.match_score - a.match_score)
        break
      case 'highest_score':
        result.sort((a, b) => b.match_score - a.match_score)
        break
      case 'lowest_score':
        result.sort((a, b) => a.match_score - b.match_score)
        break
      case 'newest':
        result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        break
      case 'oldest':
        result.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
        break
      case 'salary_high':
        result.sort((a, b) => (b.salary_max || 0) - (a.salary_max || 0))
        break
      case 'salary_low':
        result.sort((a, b) => (a.salary_min || Infinity) - (b.salary_min || Infinity))
        break
      case 'title':
        result.sort((a, b) => a.title.localeCompare(b.title))
        break
      case 'company':
        result.sort((a, b) => a.company.localeCompare(b.company))
        break
    }

    return result
  }, [jobs, filters, sortBy, savedJobIds])

  // Pagination
  const paginatedJobs = useMemo(() => {
    return filteredJobs.slice(0, page * PAGE_SIZE)
  }, [filteredJobs, page])

  const hasMore = paginatedJobs.length < filteredJobs.length

  // Batch selection
  useEffect(() => {
    setShowBatchBar(selectedJobs.size > 0)
  }, [selectedJobs])

  const toggleSelection = useCallback((jobId: string) => {
    setSelectedJobs(prev => {
      const next = new Set(prev)
      if (next.has(jobId)) next.delete(jobId)
      else next.add(jobId)
      return next
    })
  }, [])

  const selectAll = useCallback(() => {
    setSelectedJobs(new Set(filteredJobs.map(j => j.id)))
  }, [filteredJobs])

  const clearSelection = useCallback(() => {
    setSelectedJobs(new Set())
  }, [])

  // Actions — persist to the backend so they survive reloads
  const handleSave = useCallback((jobId: string) => {
    setSavedJobIds(prev => {
      const next = new Set(prev)
      const willSave = !next.has(jobId)
      if (willSave) next.add(jobId)
      else next.delete(jobId)
      updateJob(jobId, { saved: willSave, status: willSave ? 'saved' : 'new' })
      return next
    })
  }, [])

  const handleSkip = useCallback((jobId: string) => {
    setSkippedJobIds(prev => {
      const next = new Set(prev)
      const willSkip = !next.has(jobId)
      if (willSkip) next.add(jobId)
      else next.delete(jobId)
      updateJob(jobId, { skipped: willSkip, status: willSkip ? 'skipped' : 'new' })
      return next
    })
  }, [])

  const activeFilterCount = useMemo(() => {
    let count = 0
    if (filters.scoreMin > 0 || filters.scoreMax < 100) count++
    if (filters.sources.length > 0) count++
    if (filters.remoteType !== 'all') count++
    if (filters.locations.length > 0) count++
    if (filters.salaryMin > 0 || filters.salaryMax < 500000) count++
    if (filters.savedOnly) count++
    if (filters.strongMatchesOnly) count++
    if (filters.notApplied) count++
    if (filters.applied) count++
    if (filters.rejected) count++
    if (filters.interview) count++
    return count
  }, [filters])

  const todayCount = useMemo(() => jobs.filter(j => {
    const d = parseISO(j.created_at)
    const now = new Date()
    return d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  }).length, [jobs])

  const strongCount = useMemo(() => jobs.filter(j => j.match_score >= 70).length, [jobs])

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
      className="space-y-4"
    >
      {/* Search + Filter Bar */}
      <div className="sticky top-0 z-30 -mx-6 px-6 py-4 bg-bg-primary/80 backdrop-blur-xl border-b border-border-subtle">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-grow max-w-[480px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              placeholder="Search job titles, companies, skills..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-10 pr-14 rounded-input bg-bg-tertiary border border-border-default text-sm text-text-primary placeholder:text-text-muted focus:border-accent-indigo focus:outline-none focus:ring-2 focus:ring-accent-indigo/15 transition-all"
            />
            <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono text-text-muted bg-bg-elevated px-1.5 py-0.5 rounded hidden sm:block">
              ⌘K
            </kbd>
          </div>

          {/* Filter Button */}
          <button
            onClick={() => setFilterDrawerOpen(true)}
            className="relative h-10 px-4 rounded-button border border-border-default text-text-secondary hover:bg-bg-tertiary hover:border-border-focus flex items-center gap-2 text-sm font-medium transition-all"
          >
            <Filter size={16} />
            Filters
            {activeFilterCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-accent-indigo text-white text-[10px] font-bold flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>

          {/* Run AI Search */}
          <button
            onClick={runSearch}
            disabled={searching}
            title="Fetch fresh jobs from the web and score them with AI"
            className="h-10 px-4 rounded-button bg-accent-indigo text-white hover:bg-accent-indigo-hover flex items-center gap-2 text-sm font-medium transition-all disabled:opacity-50"
          >
            {searching ? <RefreshCw size={16} className="animate-spin" /> : <Sparkles size={16} />}
            {searching ? 'Searching…' : 'AI Search'}
          </button>

          {liveMode && (
            <span className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-pill text-[11px] font-medium bg-accent-emerald-muted text-accent-emerald">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-emerald" />
              Live · AI-scored
            </span>
          )}

          {/* Sort Dropdown */}
          <div className="relative">
            <button
              onClick={() => setSortDropdownOpen(!sortDropdownOpen)}
              className="h-10 px-4 rounded-button border border-border-default text-text-secondary hover:bg-bg-tertiary flex items-center gap-2 text-sm font-medium transition-all"
            >
              <SortDesc size={16} />
              <span className="hidden sm:inline">{sortOptions.find(s => s.key === sortBy)?.label || 'Sort'}</span>
              <ChevronDown size={14} />
            </button>
            <AnimatePresence>
              {sortDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setSortDropdownOpen(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: -4, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -4, scale: 0.98 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-full right-0 mt-2 w-52 bg-bg-elevated border border-border-subtle rounded-card-lg shadow-xl z-50 overflow-hidden"
                  >
                    {sortOptions.map(opt => (
                      <button
                        key={opt.key}
                        onClick={() => { setSortBy(opt.key); setSortDropdownOpen(false) }}
                        className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                          sortBy === opt.key ? 'bg-accent-indigo-muted text-accent-indigo font-medium' : 'text-text-secondary hover:bg-bg-tertiary hover:text-text-primary'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          {/* View Toggle */}
          <div className="flex items-center rounded-button border border-border-default overflow-hidden">
            <button
              onClick={() => setViewMode('card')}
              className={`h-10 px-3 flex items-center transition-colors ${viewMode === 'card' ? 'bg-accent-indigo-muted text-accent-indigo' : 'text-text-muted hover:text-text-primary hover:bg-bg-tertiary'}`}
            >
              <LayoutGrid size={16} />
            </button>
            <button
              onClick={() => setViewMode('compact')}
              className={`h-10 px-3 flex items-center transition-colors ${viewMode === 'compact' ? 'bg-accent-indigo-muted text-accent-indigo' : 'text-text-muted hover:text-text-primary hover:bg-bg-tertiary'}`}
            >
              <List size={16} />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`h-10 px-3 flex items-center transition-colors hidden md:flex ${viewMode === 'table' ? 'bg-accent-indigo-muted text-accent-indigo' : 'text-text-muted hover:text-text-primary hover:bg-bg-tertiary'}`}
            >
              <TableIcon size={16} />
            </button>
          </div>

          {/* Results Count */}
          <div className="ml-auto text-right">
            <span className="text-sm text-text-muted">{filteredJobs.length} jobs</span>
            {todayCount > 0 && <span className="text-xs text-accent-cyan ml-2">{todayCount} new today</span>}
          </div>
        </div>

        {/* Active Filters */}
        {activeFilterCount > 0 && (
          <div className="flex flex-wrap items-center gap-2 mt-3">
            <span className="text-xs text-text-muted">Filters:</span>
            {filters.scoreMin > 0 && (
              <FilterPill label={`Score ${filters.scoreMin}+`} onRemove={() => setFilters(p => ({ ...p, scoreMin: 0 }))} />
            )}
            {filters.scoreMax < 100 && (
              <FilterPill label={`Score ≤${filters.scoreMax}`} onRemove={() => setFilters(p => ({ ...p, scoreMax: 100 }))} />
            )}
            {filters.remoteType !== 'all' && (
              <FilterPill label={filters.remoteType} onRemove={() => setFilters(p => ({ ...p, remoteType: 'all' }))} />
            )}
            {filters.savedOnly && (
              <FilterPill label="Saved only" onRemove={() => setFilters(p => ({ ...p, savedOnly: false }))} />
            )}
            {filters.strongMatchesOnly && (
              <FilterPill label="Strong matches" onRemove={() => setFilters(p => ({ ...p, strongMatchesOnly: false }))} />
            )}
            {filters.notApplied && (
              <FilterPill label="Not applied" onRemove={() => setFilters(p => ({ ...p, notApplied: false }))} />
            )}
            {filters.applied && (
              <FilterPill label="Applied" onRemove={() => setFilters(p => ({ ...p, applied: false }))} />
            )}
            {filters.rejected && (
              <FilterPill label="Rejected" onRemove={() => setFilters(p => ({ ...p, rejected: false }))} />
            )}
            {filters.interview && (
              <FilterPill label="Interview" onRemove={() => setFilters(p => ({ ...p, interview: false }))} />
            )}
            <button
              onClick={() => setFilters(defaultFilters)}
              className="text-xs text-accent-rose hover:text-accent-rose/80 ml-1"
            >
              Clear All
            </button>
          </div>
        )}
      </div>

      {/* Summary Bar */}
      <div className="flex items-center gap-6 text-xs text-text-muted px-1">
        <span className="flex items-center gap-1.5">
          <Briefcase size={13} />
          {filteredJobs.length} total
        </span>
        <span className="flex items-center gap-1.5 text-accent-emerald">
          <Award size={13} />
          {strongCount} strong
        </span>
        <span className="flex items-center gap-1.5 text-accent-violet">
          <Bookmark size={13} />
          {savedJobIds.size} saved
        </span>
      </div>

      {/* Job List */}
      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {paginatedJobs.map((job, index) => (
            <motion.div
              key={job.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.35, delay: Math.min(index * 0.04, 0.5), ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
              layout
            >
              {viewMode === 'card' && (
                <JobCard
                  job={job}
                  isSelected={selectedJobs.has(job.id)}
                  onToggleSelect={() => toggleSelection(job.id)}
                  onSave={() => handleSave(job.id)}
                  onSkip={() => handleSkip(job.id)}
                  isSaved={savedJobIds.has(job.id)}
                  isSkipped={skippedJobIds.has(job.id)}
                />
              )}
              {viewMode === 'compact' && (
                <CompactRow
                  job={job}
                  isSelected={selectedJobs.has(job.id)}
                  onToggleSelect={() => toggleSelection(job.id)}
                  onSave={() => handleSave(job.id)}
                  onSkip={() => handleSkip(job.id)}
                  isSaved={savedJobIds.has(job.id)}
                  isSkipped={skippedJobIds.has(job.id)}
                />
              )}
              {viewMode === 'table' && (
                <TableRow
                  job={job}
                  isSelected={selectedJobs.has(job.id)}
                  onToggleSelect={() => toggleSelection(job.id)}
                  onSave={() => handleSave(job.id)}
                  onSkip={() => handleSkip(job.id)}
                  isSaved={savedJobIds.has(job.id)}
                  isSkipped={skippedJobIds.has(job.id)}
                />
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Empty States */}
      {filteredJobs.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-16 text-center"
        >
          <img src="/empty-jobs.png" alt="" className="w-48 h-36 object-contain opacity-60 mb-6" />
          <h3 className="font-heading text-lg font-semibold text-text-secondary mb-2">
            {activeFilterCount > 0 ? 'No jobs match your filters' : 'No jobs found yet'}
          </h3>
          <p className="text-sm text-text-muted max-w-sm mb-6">
            {activeFilterCount > 0
              ? 'Try adjusting your filter criteria to see more results.'
              : 'Run your first search to discover jobs matching your profile.'}
          </p>
          {activeFilterCount > 0 ? (
            <button
              onClick={() => setFilters(defaultFilters)}
              className="px-5 py-2.5 rounded-button border border-border-default text-text-secondary hover:bg-bg-tertiary text-sm font-medium transition-all"
            >
              Clear All Filters
            </button>
          ) : (
            <div className="flex gap-3">
              <button className="px-5 py-2.5 rounded-button bg-accent-indigo text-white hover:bg-accent-indigo-hover text-sm font-medium transition-all shadow-lg shadow-accent-indigo/20">
                Run Search Now
              </button>
              <button
                onClick={() => navigate('/manual-job')}
                className="px-5 py-2.5 rounded-button border border-border-default text-text-secondary hover:bg-bg-tertiary text-sm font-medium transition-all"
              >
                Add Job Manually
              </button>
            </div>
          )}
        </motion.div>
      )}

      {/* Load More */}
      {hasMore && (
        <div className="flex justify-center py-6">
          <button
            onClick={() => setPage(p => p + 1)}
            className="px-6 py-2.5 rounded-button border border-border-default text-text-secondary hover:bg-bg-tertiary hover:text-text-primary text-sm font-medium transition-all"
          >
            Load More ({filteredJobs.length - paginatedJobs.length} remaining)
          </button>
        </div>
      )}

      {filteredJobs.length > 0 && !hasMore && (
        <p className="text-center text-xs text-text-muted py-4">
          All {filteredJobs.length} jobs loaded
        </p>
      )}

      {/* Filter Drawer */}
      <AnimatePresence>
        {filterDrawerOpen && (
          <FilterDrawer
            filters={filters}
            onChange={setFilters}
            onClose={() => setFilterDrawerOpen(false)}
            sources={sources}
          />
        )}
      </AnimatePresence>

      {/* Batch Action Bar */}
      <AnimatePresence>
        {showBatchBar && (
          <BatchActionBar
            count={selectedJobs.size}
            onClear={clearSelection}
            onSelectAll={selectAll}
            onSave={() => {
              selectedJobs.forEach(id => handleSave(id))
              clearSelection()
            }}
            onSkip={() => {
              selectedJobs.forEach(id => handleSkip(id))
              clearSelection()
            }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ─── Sub-Components ────────────────────────────────────────────────────

const sortOptions = [
  { key: 'best_match', label: 'Best Match' },
  { key: 'highest_score', label: 'Highest Score' },
  { key: 'lowest_score', label: 'Lowest Score' },
  { key: 'newest', label: 'Newest First' },
  { key: 'oldest', label: 'Oldest First' },
  { key: 'salary_high', label: 'Salary High-Low' },
  { key: 'salary_low', label: 'Salary Low-High' },
  { key: 'title', label: 'Title A-Z' },
  { key: 'company', label: 'Company A-Z' },
]

function FilterPill({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-bg-tertiary border border-border-default text-xs text-text-primary">
      {label}
      <button onClick={onRemove} className="ml-0.5 text-text-muted hover:text-accent-rose transition-colors">
        <X size={12} />
      </button>
    </span>
  )
}

// ─── Job Card (Card View) ──────────────────────────────────────────────

function JobCard({ job, isSelected, onToggleSelect, onSave, onSkip, isSaved, isSkipped }: {
  job: Job
  isSelected: boolean
  onToggleSelect: () => void
  onSave: () => void
  onSkip: () => void
  isSaved: boolean
  isSkipped: boolean
}) {
  const navigate = useNavigate()
  const [showActions, setShowActions] = useState(false)
  const scoreColor = getScoreColor(job.match_score)

  const formatSalary = () => {
    if (!job.salary_min && !job.salary_max) return 'Not disclosed'
    const min = job.salary_min ? `${(job.salary_min / 1000).toFixed(0)}k` : ''
    const max = job.salary_max ? `${(job.salary_max / 1000).toFixed(0)}k` : ''
    return min && max ? `${min} - ${max} ${job.salary_currency || ''}` : `${min || max} ${job.salary_currency || ''}`
  }

  const timeAgo = job.posted_date
    ? formatDistanceToNow(parseISO(job.posted_date), { addSuffix: true })
    : 'Recently'

  return (
    <div
      className={`relative rounded-card bg-bg-secondary border transition-all duration-200 overflow-hidden ${
        isSkipped ? 'opacity-60' : ''
      } ${showActions ? 'border-border-focus shadow-lg shadow-accent-indigo/5' : 'border-border-subtle hover:border-border-default hover:-translate-y-0.5 hover:shadow-lg'}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Left accent bar */}
      <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: scoreColor }} />

      <div className="p-5 pl-6">
        <div className="flex items-start gap-4">
          {/* Checkbox (visible on hover or selected) */}
          <button
            onClick={(e) => { e.stopPropagation(); onToggleSelect() }}
            className={`mt-2 flex-shrink-0 transition-opacity ${isSelected || showActions ? 'opacity-100' : 'opacity-0'}`}
          >
            {isSelected ? <CheckSquare size={18} className="text-accent-indigo" /> : <Square size={18} className="text-text-muted" />}
          </button>

          {/* Score Ring */}
          <div className="flex-shrink-0 pt-1">
            <ScoreRing score={job.match_score} size={56} />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Row 1: Title + Source */}
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3
                  className="font-heading text-[15px] font-semibold text-text-primary truncate cursor-pointer hover:text-accent-indigo transition-colors"
                  onClick={() => navigate(`/jobs/${job.id}`)}
                >
                  {job.title}
                </h3>
              </div>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-accent-cyan-muted text-accent-cyan flex-shrink-0">
                {job.source}
              </span>
            </div>

            {/* Row 2: Company, Salary, Location */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-sm text-text-secondary">
              <span className="flex items-center gap-1">
                <Building size={13} className="text-text-muted" />
                {job.company}
              </span>
              <span className="flex items-center gap-1 text-accent-emerald">
                <PoundSterling size={13} />
                {formatSalary()}
              </span>
              <span className="flex items-center gap-1">
                <MapPin size={13} className="text-text-muted" />
                {job.location}
              </span>
            </div>

            {/* Row 3: Source link, Posted, Tags */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs text-text-muted">
              <span className="flex items-center gap-1">
                <ExternalLink size={11} />
                {job.source}
              </span>
              <span className="flex items-center gap-1">
                <Clock size={11} />
                {timeAgo}
              </span>
              {job.remote_type && (
                <span className="px-2 py-0.5 rounded-full bg-bg-tertiary text-text-secondary text-[11px]">
                  {job.remote_type}
                </span>
              )}
              <span className="px-2 py-0.5 rounded-full bg-bg-tertiary text-text-secondary text-[11px]">
                {job.job_type.replace('_', '-')}
              </span>
              <StatusChip status={job.status} />
            </div>

            {/* Row 4: Match explanation */}
            {job.match_analysis?.explanation && (
              <p className="mt-2 text-sm text-text-secondary line-clamp-2 leading-relaxed">
                {job.match_analysis.explanation}
              </p>
            )}

            {/* Row 5: Skill pills */}
            {job.match_analysis && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {job.match_analysis.matched_skills.slice(0, 5).map(skill => (
                  <span key={skill} className="px-2 py-0.5 rounded-full bg-accent-emerald-muted text-accent-emerald text-[11px] font-medium">
                    {skill}
                  </span>
                ))}
                {job.match_analysis.missing_skills.slice(0, 3).map(skill => (
                  <span key={skill} className="px-2 py-0.5 rounded-full bg-accent-rose-muted text-accent-rose text-[11px] font-medium">
                    {skill}
                  </span>
                ))}
              </div>
            )}

            {/* Action Buttons */}
            <div className={`flex flex-wrap items-center gap-2 mt-3 transition-all ${showActions || isSelected ? 'opacity-100' : 'opacity-0'}`}>
              <ActionButton icon={Eye} label="View" onClick={() => navigate(`/jobs/${job.id}`)} />
              <ActionButton
                icon={Star}
                label={isSaved ? 'Saved' : 'Save'}
                onClick={(e) => { e?.stopPropagation(); onSave() }}
                active={isSaved}
                activeColor="text-accent-amber"
              />
              <ActionButton icon={Wand2} label="Gen CV" onClick={(e) => { e?.stopPropagation(); navigate(`/jobs/${job.id}?action=cv`) }} primary />
              <ActionButton icon={FileText} label="Gen CL" onClick={(e) => { e?.stopPropagation(); navigate(`/jobs/${job.id}?action=cl`) }} />
              <ActionButton icon={MessageSquare} label="Notes" onClick={(e) => { e?.stopPropagation(); navigate(`/jobs/${job.id}?action=notes`) }} />
              <ActionButton icon={Calendar} label="Reminder" onClick={(e) => { e?.stopPropagation(); navigate(`/jobs/${job.id}?action=reminder`) }} />
              <ActionButton
                icon={X}
                label={isSkipped ? 'Skipped' : 'Skip'}
                onClick={(e) => { e?.stopPropagation(); onSkip() }}
                danger
              />
              <ActionButton icon={ExternalLink} label="Open" onClick={() => window.open(job.source_url, '_blank')} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function ActionButton({ icon: Icon, label, onClick, primary, danger, active, activeColor }: {
  icon: React.ComponentType<{ size?: number; className?: string }>
  label: string
  onClick: (e?: React.MouseEvent) => void
  primary?: boolean
  danger?: boolean
  active?: boolean
  activeColor?: string
}) {
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
        primary
          ? 'bg-accent-indigo text-white hover:bg-accent-indigo-hover shadow-sm'
          : danger
          ? 'text-accent-rose hover:bg-accent-rose-muted'
          : active && activeColor
          ? `${activeColor} hover:bg-bg-tertiary`
          : 'text-text-secondary hover:bg-bg-tertiary hover:text-text-primary'
      }`}
    >
      <Icon size={13} />
      <span className="hidden sm:inline">{label}</span>
    </motion.button>
  )
}

// ─── Compact Row ───────────────────────────────────────────────────────

function CompactRow({ job, isSelected, onToggleSelect, onSave, onSkip, isSaved, isSkipped }: {
  job: Job
  isSelected: boolean
  onToggleSelect: () => void
  onSave: () => void
  onSkip: () => void
  isSaved: boolean
  isSkipped: boolean
}) {
  const navigate = useNavigate()
  const timeAgo = job.posted_date
    ? formatDistanceToNow(parseISO(job.posted_date), { addSuffix: true })
    : 'Recently'

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 bg-bg-secondary border-b border-border-subtle hover:bg-bg-tertiary/50 transition-colors cursor-pointer ${isSkipped ? 'opacity-50' : ''}`}
      onClick={() => navigate(`/jobs/${job.id}`)}
    >
      <button
        onClick={(e) => { e.stopPropagation(); onToggleSelect() }}
        className="flex-shrink-0"
      >
        {isSelected ? <CheckSquare size={16} className="text-accent-indigo" /> : <Square size={16} className="text-text-muted" />}
      </button>

      <div className="flex-shrink-0" onClick={(e) => e.stopPropagation()}>
        <ScoreRing score={job.match_score} size={40} strokeWidth={3} />
      </div>

      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-medium text-text-primary truncate">{job.title}</h4>
        <p className="text-xs text-text-secondary truncate">{job.company}</p>
      </div>

      <span className="hidden md:block text-xs text-text-secondary w-28 truncate">{job.location}</span>
      <span className="hidden lg:block text-xs text-accent-emerald w-24">{job.salary_min ? `${(job.salary_min / 1000).toFixed(0)}k+` : '-'}</span>
      <span className="hidden md:block">
        <StatusChip status={job.status} />
      </span>
      <span className="hidden sm:block text-xs text-text-muted w-20">{timeAgo}</span>

      <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
        <IconButton icon={Eye} onClick={() => navigate(`/jobs/${job.id}`)} />
        <IconButton icon={Star} onClick={onSave} active={isSaved} activeClass="text-accent-amber" />
        <IconButton icon={Wand2} onClick={() => navigate(`/jobs/${job.id}?action=cv`)} />
        <IconButton icon={FileText} onClick={() => navigate(`/jobs/${job.id}?action=cl`)} />
        <IconButton icon={X} onClick={onSkip} danger />
      </div>
    </div>
  )
}

function IconButton({ icon: Icon, onClick, active, activeClass, danger }: {
  icon: React.ComponentType<{ size?: number; className?: string }>
  onClick: () => void
  active?: boolean
  activeClass?: string
  danger?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={`p-1.5 rounded-lg transition-colors ${
        active && activeClass ? activeClass :
        danger ? 'text-text-muted hover:text-accent-rose hover:bg-accent-rose-muted' :
        'text-text-muted hover:text-text-primary hover:bg-bg-tertiary'
      }`}
    >
      <Icon size={14} />
    </button>
  )
}

// ─── Table View ────────────────────────────────────────────────────────

function TableRow({ job, isSelected, onToggleSelect, onSave, onSkip, isSaved }: {
  job: Job
  isSelected: boolean
  onToggleSelect: () => void
  onSave: () => void
  onSkip: () => void
  isSaved: boolean
  isSkipped: boolean
}) {
  const navigate = useNavigate()
  const timeAgo = job.posted_date
    ? formatDistanceToNow(parseISO(job.posted_date), { addSuffix: true })
    : 'Recently'

  return (
    <tr
      className="border-b border-border-subtle hover:bg-bg-tertiary/50 transition-colors cursor-pointer"
      onClick={() => navigate(`/jobs/${job.id}`)}
    >
      <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
        <button onClick={onToggleSelect}>
          {isSelected ? <CheckSquare size={16} className="text-accent-indigo" /> : <Square size={16} className="text-text-muted" />}
        </button>
      </td>
      <td className="py-3 px-2">
        <ScoreRing score={job.match_score} size={36} strokeWidth={3} />
      </td>
      <td className="py-3 px-4">
        <span className="text-sm font-medium text-text-primary">{job.title}</span>
      </td>
      <td className="py-3 px-4 text-sm text-text-secondary">{job.company}</td>
      <td className="py-3 px-4 text-sm text-text-secondary hidden lg:table-cell">{job.location}</td>
      <td className="py-3 px-4 text-sm text-accent-emerald hidden md:table-cell">
        {job.salary_min ? `${(job.salary_min / 1000).toFixed(0)}k - ${(job.salary_max! / 1000).toFixed(0)}k` : '-'}
      </td>
      <td className="py-3 px-4 hidden md:table-cell">
        <span className="px-2 py-0.5 rounded-full text-xs bg-accent-cyan-muted text-accent-cyan">{job.source}</span>
      </td>
      <td className="py-3 px-4 text-xs text-text-muted hidden sm:table-cell">{timeAgo}</td>
      <td className="py-3 px-4">
        <StatusChip status={job.status} />
      </td>
      <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-1">
          <IconButton icon={Eye} onClick={() => navigate(`/jobs/${job.id}`)} />
          <IconButton icon={Star} onClick={onSave} active={isSaved} activeClass="text-accent-amber" />
          <IconButton icon={X} onClick={onSkip} danger />
        </div>
      </td>
    </tr>
  )
}

// ─── Filter Drawer ─────────────────────────────────────────────────────

function FilterDrawer({ filters, onChange, onClose, sources }: {
  filters: FilterState
  onChange: (f: FilterState) => void
  onClose: () => void
  sources: string[]
}) {
  const update = (partial: Partial<FilterState>) => onChange({ ...filters, ...partial } as FilterState)

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
        onClick={onClose}
      />
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
        className="fixed right-0 top-0 bottom-0 w-full max-w-[420px] bg-bg-secondary border-l border-border-subtle z-50 flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border-subtle">
          <h2 className="font-heading text-lg font-semibold text-text-primary">Filters</h2>
          <div className="flex items-center gap-2">
            <button onClick={() => onChange(defaultFilters)} className="text-xs text-accent-rose hover:text-accent-rose/80">
              Clear All
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-bg-tertiary text-text-muted hover:text-text-primary transition-colors">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Score Range */}
          <FilterSection title="Match Score">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={filters.scoreMin}
                  onChange={(e) => update({ scoreMin: Number(e.target.value) })}
                  className="flex-1 accent-accent-indigo"
                />
                <span className="text-sm font-mono text-text-primary w-10 text-right">{filters.scoreMin}</span>
              </div>
              <div className="flex gap-2 flex-wrap">
                {[
                  { label: 'All', min: 0 },
                  { label: 'Possible (55+)', min: 55 },
                  { label: 'Strong (70+)', min: 70 },
                  { label: 'Excellent (85+)', min: 85 },
                ].map(preset => (
                  <button
                    key={preset.label}
                    onClick={() => update({ scoreMin: preset.min })}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                      filters.scoreMin === preset.min
                        ? 'bg-accent-indigo text-white'
                        : 'bg-bg-tertiary text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          </FilterSection>

          {/* Quick Toggles */}
          <FilterSection title="Quick Filters">
            <div className="space-y-2">
              {[
                { key: 'savedOnly', label: 'Saved only' },
                { key: 'strongMatchesOnly', label: 'Strong matches only (70+)' },
                { key: 'notApplied', label: 'Not applied' },
                { key: 'applied', label: 'Applied' },
                { key: 'rejected', label: 'Rejected' },
                { key: 'interview', label: 'Interview / Tech test' },
              ].map(toggle => (
                <label key={toggle.key} className="flex items-center gap-3 cursor-pointer py-1.5">
                  <div className={`w-11 h-6 rounded-full relative transition-colors ${
                    (filters as Record<string, boolean>)[toggle.key] ? 'bg-accent-indigo' : 'bg-bg-tertiary border border-border-default'
                  }`}>
                    <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                      (filters as Record<string, boolean>)[toggle.key] ? 'translate-x-5' : 'translate-x-0.5'
                    }`} />
                  </div>
                  <span className="text-sm text-text-secondary">{toggle.label}</span>
                  <input
                    type="checkbox"
                    checked={(filters as Record<string, boolean>)[toggle.key]}
                    onChange={(e) => update({ [toggle.key]: e.target.checked } as Partial<FilterState>)}
                    className="sr-only"
                  />
                </label>
              ))}
            </div>
          </FilterSection>

          {/* Remote/Hybrid/On-site */}
          <FilterSection title="Work Type">
            <div className="flex rounded-lg border border-border-default overflow-hidden">
              {['all', 'remote', 'hybrid', 'onsite'].map(type => (
                <button
                  key={type}
                  onClick={() => update({ remoteType: type })}
                  className={`flex-1 py-2 text-xs font-medium capitalize transition-colors ${
                    filters.remoteType === type
                      ? 'bg-accent-indigo text-white'
                      : 'bg-bg-tertiary text-text-secondary hover:text-text-primary'
                  }`}
                >
                  {type === 'onsite' ? 'On-site' : type}
                </button>
              ))}
            </div>
          </FilterSection>

          {/* Source */}
          <FilterSection title="Source">
            <div className="space-y-2">
              {sources.map(source => (
                <label key={source} className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.sources.includes(source)}
                    onChange={(e) => {
                      const next = e.target.checked
                        ? [...filters.sources, source]
                        : filters.sources.filter(s => s !== source)
                      update({ sources: next })
                    }}
                    className="w-4 h-4 rounded border-border-default bg-bg-tertiary text-accent-indigo focus:ring-accent-indigo/20"
                  />
                  <span className="text-sm text-text-secondary">{source}</span>
                </label>
              ))}
            </div>
          </FilterSection>

          {/* Status */}
          <FilterSection title="Status">
            <div className="space-y-2">
              {[
                { key: 'new', label: 'New' },
                { key: 'saved', label: 'Saved' },
                { key: 'cv_drafted', label: 'CV Drafted' },
                { key: 'cl_drafted', label: 'CL Drafted' },
                { key: 'ready_to_apply', label: 'Ready to Apply' },
                { key: 'applied', label: 'Applied' },
                { key: 'interview', label: 'Interview' },
                { key: 'technical_test', label: 'Technical Test' },
                { key: 'rejected', label: 'Rejected' },
                { key: 'skipped', label: 'Skipped' },
              ].map(st => (
                <label key={st.key} className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.statuses.includes(st.key)}
                    onChange={(e) => {
                      const next = e.target.checked
                        ? [...filters.statuses, st.key]
                        : filters.statuses.filter(s => s !== st.key)
                      update({ statuses: next })
                    }}
                    className="w-4 h-4 rounded border-border-default bg-bg-tertiary text-accent-indigo focus:ring-accent-indigo/20"
                  />
                  <span className="text-sm text-text-secondary">{st.label}</span>
                </label>
              ))}
            </div>
          </FilterSection>

          {/* Salary */}
          <FilterSection title="Salary Minimum">
            <div className="flex gap-2 flex-wrap">
              {[
                { label: 'Any', val: 0 },
                { label: '£80k+', val: 80000 },
                { label: '£120k+', val: 120000 },
                { label: '£150k+', val: 150000 },
                { label: '£200k+', val: 200000 },
              ].map(preset => (
                <button
                  key={preset.label}
                  onClick={() => update({ salaryMin: preset.val })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    filters.salaryMin === preset.val
                      ? 'bg-accent-indigo text-white'
                      : 'bg-bg-tertiary text-text-secondary hover:text-text-primary'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </FilterSection>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-border-subtle flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-button bg-accent-indigo text-white hover:bg-accent-indigo-hover text-sm font-medium transition-all"
          >
            Apply Filters
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-button border border-border-default text-text-secondary hover:bg-bg-tertiary text-sm font-medium transition-all"
          >
            Cancel
          </button>
        </div>
      </motion.div>
    </>
  )
}

function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h3 className="font-heading text-sm font-semibold text-text-primary">{title}</h3>
      {children}
    </div>
  )
}

// ─── Batch Action Bar ──────────────────────────────────────────────────

function BatchActionBar({ count, onClear, onSelectAll, onSave, onSkip }: {
  count: number
  onClear: () => void
  onSelectAll: () => void
  onSave: () => void
  onSkip: () => void
}) {
  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
      className="fixed bottom-0 left-0 right-0 z-40 bg-bg-elevated/95 backdrop-blur-lg border-t border-border-subtle"
    >
      <div className="max-w-[1440px] mx-auto h-14 px-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-text-primary">
            {count} job{count !== 1 ? 's' : ''} selected
          </span>
          <button onClick={onSelectAll} className="text-xs text-accent-indigo hover:text-accent-indigo-hover">
            Select All
          </button>
          <button onClick={onClear} className="text-xs text-text-muted hover:text-text-primary">
            Clear
          </button>
        </div>
        <div className="flex items-center gap-2">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onSave}
            className="px-4 py-2 rounded-button border border-border-default text-text-secondary hover:bg-bg-tertiary text-sm font-medium flex items-center gap-2 transition-all"
          >
            <Bookmark size={14} />
            Save
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onSkip}
            className="px-4 py-2 rounded-button border border-border-default text-text-secondary hover:bg-accent-rose-muted hover:text-accent-rose text-sm font-medium flex items-center gap-2 transition-all"
          >
            <X size={14} />
            Skip
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="px-4 py-2 rounded-button bg-accent-indigo text-white hover:bg-accent-indigo-hover text-sm font-medium flex items-center gap-2 transition-all shadow-lg shadow-accent-indigo/20"
          >
            <Wand2 size={14} />
            Gen CVs
          </motion.button>
        </div>
      </div>
    </motion.div>
  )
}
