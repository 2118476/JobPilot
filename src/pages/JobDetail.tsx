import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { format, formatDistanceToNow, parseISO } from 'date-fns'
import {
  Star,
  X,
  ExternalLink,
  Building,
  MapPin,
  PoundSterling,
  Clock,
  Wand2,
  FileText,
  Check,
  ChevronDown,
  ChevronUp,
  Award,
  Code,
  FolderOpen,
  Mail,
  MessageSquare,
  ClipboardList,
  Sparkles,
  CheckCircle,
  ArrowLeft,
  Copy,
  Download,
  Bell,
} from 'lucide-react'
import { mockJobs, mockProjects } from '@/data/mockData'
import { tailorDocument, findCachedJob, interviewPrep, updateJob, saveDocument, getJobs, type InterviewQuestion } from '@/lib/api'
import { downloadAsPdf } from '@/lib/pdf'
import { useUIStore } from '@/store/uiStore'
import type { Job } from '@/types'

// ─── Utility ───────────────────────────────────────────────────────────

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

function getScoreLabel(score: number): string {
  if (score >= 85) return 'Excellent Match'
  if (score >= 70) return 'Strong Match'
  if (score >= 55) return 'Possible Match'
  if (score >= 40) return 'Weak Match'
  return 'Skip'
}

function getStatusConfig(status: Job['status']) {
  const configs: Record<string, { label: string; color: string; bg: string; dot: string }> = {
    new: { label: 'New', color: 'text-accent-cyan', bg: 'bg-accent-cyan-muted', dot: 'bg-accent-cyan' },
    saved: { label: 'Saved', color: 'text-accent-violet', bg: 'bg-accent-violet-muted', dot: 'bg-accent-violet' },
    cv_drafted: { label: 'CV Drafted', color: 'text-accent-indigo', bg: 'bg-accent-indigo-muted', dot: 'bg-accent-indigo' },
    cl_drafted: { label: 'CL Drafted', color: 'text-accent-violet', bg: 'bg-accent-violet-muted', dot: 'bg-accent-violet' },
    ready_to_apply: { label: 'Ready to Apply', color: 'text-accent-amber', bg: 'bg-accent-amber-muted', dot: 'bg-accent-amber' },
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

function StatusChip({ status }: { status: Job['status'] }) {
  const config = getStatusConfig(status)
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${config.bg} ${config.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  )
}

// ─── Animated Score Ring ───────────────────────────────────────────────

function ScoreRing({ score, size = 120, strokeWidth = 6 }: {
  score: number
  size?: number
  strokeWidth?: number
}) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const color = getScoreColor(score)
  const [animated, setAnimated] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setAnimated(true), 200)
    return () => clearTimeout(timer)
  }, [score])

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" style={{ filter: `drop-shadow(0 0 20px ${color}30)` }}>
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="currentColor" strokeWidth={strokeWidth}
          className="text-bg-tertiary"
        />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke={color} strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={animated ? circumference - (score / 100) * circumference : circumference}
          style={{ transition: 'stroke-dashoffset 800ms cubic-bezier(0.16, 1, 0.3, 1)' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.3, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
          className={`font-heading font-bold text-5xl ${getScoreColorClass(score)}`}
        >
          {score}
        </motion.span>
        <span className={`text-xs font-medium mt-1 ${getScoreColorClass(score)}`}>
          {getScoreLabel(score)}
        </span>
      </div>
    </div>
  )
}

// ─── Score Breakdown Bar ───────────────────────────────────────────────

function ScoreBreakdownBar({ label, score, index }: { label: string; score: number; index: number }) {
  const color = getScoreColor(score)
  const [animated, setAnimated] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setAnimated(true), 400 + index * 60)
    return () => clearTimeout(timer)
  }, [index])

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-sm text-text-secondary">{label}</span>
        <span className="font-mono text-xs font-medium" style={{ color }}>{score}</span>
      </div>
      <div className="h-2 bg-bg-tertiary rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          animate={{ width: animated ? `${score}%` : 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
        />
      </div>
    </div>
  )
}

// ─── Mock Analysis Data Generators ─────────────────────────────────────

function generateScoreBreakdown(job: Job) {
  const base = job.match_score
  return [
    { label: 'Job Title Match', score: Math.min(100, Math.round(base + (Math.random() * 10 - 3))) },
    { label: 'Skill Match', score: Math.min(100, Math.round(base * 0.95 + Math.random() * 8)) },
    { label: 'Experience Level', score: Math.min(100, Math.round(base + (Math.random() * 12 - 4))) },
    { label: 'Location Match', score: Math.min(100, job.remote_type === 'remote' ? 95 : Math.round(base * 0.9)) },
    { label: 'Salary Match', score: Math.min(100, Math.round(75 + Math.random() * 15)) },
    { label: 'Industry Match', score: Math.min(100, Math.round(base * 0.92)) },
    { label: 'Project Relevance', score: Math.min(100, Math.round(base + (Math.random() * 8 - 2))) },
    { label: 'Education Match', score: Math.min(100, Math.round(80 + Math.random() * 12)) },
    { label: 'Remote/Hybrid Fit', score: Math.min(100, job.remote_type === 'remote' ? 90 : Math.round(70 + Math.random() * 15)) },
    { label: 'Company Culture', score: Math.min(100, Math.round(base * 0.88 + Math.random() * 10)) },
  ]
}

function generateCVSuggestions(job: Job) {
  return [
    { type: 'REORDER', desc: `Move ${job.match_analysis?.matched_skills.slice(0, 2).join(' and ')} to the top of your skills list.`, reason: 'These are the top requirements for this role.' },
    { type: 'HIGHLIGHT', desc: `Lead with your most relevant project in your projects section.`, reason: 'Directly demonstrates required technical skills.' },
    { type: 'KEYWORD', desc: `Add ${job.match_analysis?.matched_skills[0] || 'relevant skills'} to your summary if not already present.`, reason: 'Top ATS keyword for this position.' },
    { type: 'REWRITE', desc: `Personal summary should mention "${job.title.split(' ').slice(0, 3).join(' ')}" targeting.`, reason: 'Aligns your stated goal with this specific role.' },
    { type: 'ADD', desc: `Include specific metrics from your relevant projects (user count, performance gains).`, reason: 'Quantified achievements improve response rates.' },
  ]
}

function generateCoverLetterAngles(job: Job) {
  return [
    `Open by referencing the specific ${job.title} role and why it excites you at ${job.company}.`,
    `Highlight your ${job.match_analysis?.matched_skills.slice(0, 2).join(' and ')} experience as directly relevant.`,
    `Mention your most relevant project — demonstrates ${job.match_analysis?.matched_skills.slice(0, 3).join(', ') || 'key skills'}.`,
    `Acknowledge the ${job.match_analysis?.missing_skills[0] || 'skill'} gap but express willingness to learn rapidly.`,
    `Close with enthusiasm for ${job.company}'s mission and your desire to contribute.`,
  ]
}

function generateInterviewQuestions(job: Job) {
  return [
    { category: 'Technical', q: `Explain how you've used ${job.match_analysis?.matched_skills[0] || 'React'} in a production environment.`, tip: `Reference your project with specific technical details.` },
    { category: 'Technical', q: `What's the difference between REST and GraphQL APIs?`, tip: `Mention your API design experience from relevant projects.` },
    { category: 'Project', q: `Tell us about a full-stack project you've built from scratch.`, tip: `Choose your most relevant project. Walk through the architecture.` },
    { category: 'Behavioral', q: `Why do you want to work at ${job.company}?`, tip: `Research their mission and products. Be specific.` },
    { category: 'Situational', q: `How do you handle tight deadlines with multiple stakeholders?`, tip: `Describe your prioritization and communication approach.` },
    { category: 'Technical', q: `Describe your approach to debugging a complex production issue.`, tip: `Show systematic thinking and tools you use.` },
  ]
}

// ─── Main Component ────────────────────────────────────────────────────

export default function JobDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const addToast = useUIStore((s) => s.addToast)
  const [searchParams] = useSearchParams()
  const [job, setJob] = useState<Job | undefined>(() => mockJobs.find(j => j.id === id) || findCachedJob(id || ''))
  const [resolving, setResolving] = useState(false)

  // Resolve the job: mock/cache first, otherwise fetch from the backend so
  // direct links, Dashboard clicks and page refreshes all work.
  useEffect(() => {
    const local = mockJobs.find(j => j.id === id) || findCachedJob(id || '')
    if (local) { setJob(local); return }
    setResolving(true)
    let alive = true
    getJobs()
      .then((jobs) => { if (alive) setJob(jobs?.find((j) => j.id === id)) })
      .catch(() => {})
      .finally(() => { if (alive) setResolving(false) })
    return () => { alive = false }
  }, [id])

  const [saved, setSaved] = useState(false)
  const [skipped, setSkipped] = useState(false)
  const [applied, setApplied] = useState(false)
  const [notes, setNotes] = useState(job?.notes || '')
  const [notesSaved, setNotesSaved] = useState(false)
  const [checklist, setChecklist] = useState<Record<string, boolean>>({
    'Read full job description': false,
    'Review company website': false,
    'Check salary and benefits': false,
    'Verify location/commute feasibility': false,
    'Tailor CV for this role': false,
    'Write cover letter': false,
    'Prepare for interview questions': false,
    'Submit application before deadline': false,
  })
  const [descExpanded, setDescExpanded] = useState(true)
  const [cvDrawerOpen, setCvDrawerOpen] = useState(false)
  const [clDrawerOpen, setClDrawerOpen] = useState(false)
  const [cvGenerated, setCvGenerated] = useState(false)
  const [clGenerated, setClGenerated] = useState(false)
  const [reminderDate, setReminderDate] = useState('')
  const [reminderSet, setReminderSet] = useState(false)
  const [aiQuestions, setAiQuestions] = useState<InterviewQuestion[] | null>(null)
  const [prepLoading, setPrepLoading] = useState(false)

  useEffect(() => {
    if (job) {
      setSaved(job.status === 'saved' || !!job.saved)
      setSkipped(job.status === 'skipped' || !!job.skipped)
      setApplied(['applied', 'interview', 'technical_test', 'offer'].includes(job.status))
      if (job.notes) setNotes(job.notes)
    }
  }, [job])

  // Deep-link actions from the Jobs list (?action=cv|cl|notes|reminder)
  useEffect(() => {
    if (!job) return
    const action = searchParams.get('action')
    if (action === 'cv') setCvDrawerOpen(true)
    else if (action === 'cl') setClDrawerOpen(true)
    else if (action === 'notes' || action === 'reminder') {
      const t = setTimeout(
        () => document.getElementById('notes-reminder')?.scrollIntoView({ behavior: 'smooth', block: 'center' }),
        350,
      )
      return () => clearTimeout(t)
    }
  }, [job, searchParams])

  // Auto-save notes to the backend (debounced)
  useEffect(() => {
    if (job && notes.length > 0) {
      const timer = setTimeout(() => {
        updateJob(job.id, { notes })
        setNotesSaved(true)
        setTimeout(() => setNotesSaved(false), 2000)
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [notes])

  // Hooks must run every render — guard for an unresolved job rather than
  // early-returning before them.
  const scoreBreakdown = useMemo(() => (job ? generateScoreBreakdown(job) : []), [job?.id])
  const cvSuggestions = useMemo(() => (job ? generateCVSuggestions(job) : []), [job?.id])
  const coverLetterAngles = useMemo(() => (job ? generateCoverLetterAngles(job) : []), [job?.id])
  const interviewQuestions = useMemo(() => (job ? generateInterviewQuestions(job) : []), [job?.id])

  const matchedProjects = useMemo(() => {
    return mockProjects
      .filter(p => p.relevance_score && p.relevance_score > 60)
      .sort((a, b) => (b.relevance_score || 0) - (a.relevance_score || 0))
      .slice(0, 3)
  }, [job?.id])

  if (!job) {
    if (resolving) {
      return (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-10 h-10 border-2 border-accent-indigo/30 border-t-accent-indigo rounded-full animate-spin mb-4" />
          <p className="text-sm text-text-muted">Loading job…</p>
        </div>
      )
    }
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <img src="/empty-jobs.png" alt="" className="w-48 h-36 object-contain opacity-40 mb-6" />
        <h2 className="font-heading text-xl font-semibold text-text-secondary">Job not found</h2>
        <p className="text-text-muted mt-2">This job listing doesn&apos;t exist or has been removed.</p>
        <button
          onClick={() => navigate('/jobs')}
          className="mt-6 px-5 py-2.5 rounded-button bg-accent-indigo text-white text-sm font-medium hover:bg-accent-indigo-hover transition-all"
        >
          Back to Jobs
        </button>
      </div>
    )
  }

  const checklistProgress = Object.values(checklist).filter(Boolean).length
  const checklistTotal = Object.keys(checklist).length

  const handleGenerateCV = () => setCvDrawerOpen(true)
  const handleGenerateCL = () => setClDrawerOpen(true)

  // ── Persist pipeline state to the backend (fire-and-forget) ──
  const toggleSaved = () => {
    const v = !saved
    setSaved(v)
    if (v) setSkipped(false)
    updateJob(job.id, { saved: v, status: v ? 'saved' : 'new' })
  }
  const toggleSkipped = () => {
    const v = !skipped
    setSkipped(v)
    if (v) setSaved(false)
    updateJob(job.id, { skipped: v, status: v ? 'skipped' : 'new' })
  }
  // Marking applied also auto-sets a 7-day follow-up reminder.
  const toggleApplied = () => {
    const v = !applied
    setApplied(v)
    if (v) {
      const followUp = new Date()
      followUp.setDate(followUp.getDate() + 7)
      const iso = followUp.toISOString()
      updateJob(job.id, {
        status: 'applied',
        applied_date: new Date().toISOString(),
        next_action: 'Follow up on application',
        next_action_date: iso,
        reminder_date: iso,
        reminder_set: true,
      })
      setReminderDate(iso.slice(0, 10))
      setReminderSet(true)
    } else {
      updateJob(job.id, { status: 'saved', applied_date: undefined })
    }
  }

  // One-click: open the original posting, mark applied, set the follow-up reminder.
  const handleApplyNow = () => {
    window.open(job.source_url, '_blank', 'noopener,noreferrer')
    if (!applied) {
      toggleApplied()
      addToast({
        type: 'success',
        title: 'Marked applied — reminder set',
        message: 'Opened the posting and added a 7-day follow-up reminder.',
      })
    }
  }

  const handleInterviewPrep = async () => {
    setPrepLoading(true)
    try {
      const r = await interviewPrep(job)
      if (r?.questions?.length) setAiQuestions(r.questions)
    } catch {
      // keep the default questions if the backend is unavailable
    } finally {
      setPrepLoading(false)
    }
  }

  const formatSalary = () => {
    if (!job.salary_min && !job.salary_max) return 'Not disclosed'
    const min = job.salary_min ? `${(job.salary_min / 1000).toFixed(0)}k` : ''
    const max = job.salary_max ? `${(job.salary_max / 1000).toFixed(0)}k` : ''
    return min && max ? `${min} - ${max} ${job.salary_currency || ''}` : `${min || max} ${job.salary_currency || ''}`
  }

  const timeAgo = job.posted_date
    ? formatDistanceToNow(parseISO(job.posted_date), { addSuffix: true })
    : 'Recently'

  const scoreColor = getScoreColor(job.match_score)

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
      className="space-y-6 pb-24"
    >
      {/* Back Link */}
      <button
        onClick={() => navigate('/jobs')}
        className="inline-flex items-center gap-2 text-sm text-text-muted hover:text-text-primary transition-colors"
      >
        <ArrowLeft size={16} />
        Back to Jobs
      </button>

      {/* Section 1: Job Header + Score Hero */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="rounded-card-lg bg-bg-secondary border border-border-subtle overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${scoreColor}08 0%, transparent 50%)` }}
      >
        <div className="p-8">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Score Ring */}
            <div className="flex-shrink-0 flex flex-col items-center">
              <ScoreRing score={job.match_score} size={120} strokeWidth={6} />
            </div>

            {/* Job Info */}
            <div className="flex-1">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.2 }}
              >
                <h1 className="font-heading text-3xl font-semibold text-text-primary tracking-tight">
                  {job.title}
                </h1>
                <p className="flex items-center gap-2 text-lg text-text-secondary mt-2">
                  <Building size={18} className="text-text-muted" />
                  {job.company}
                </p>

                {/* Meta Row */}
                <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-4 text-sm">
                  <span className="flex items-center gap-1.5 text-text-secondary">
                    <MapPin size={14} className="text-text-muted" />
                    {job.location} ({job.remote_type})
                  </span>
                  <span className="flex items-center gap-1.5 text-accent-emerald">
                    <PoundSterling size={14} />
                    {formatSalary()}
                  </span>
                  <span className="flex items-center gap-1.5 text-text-muted">
                    <Clock size={14} />
                    Posted {timeAgo}
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-accent-cyan-muted text-accent-cyan">
                    {job.source}
                  </span>
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-2 mt-3">
                  <span className="px-3 py-1 rounded-full text-xs bg-bg-tertiary text-text-secondary">
                    {job.job_type.replace('_', '-')}
                  </span>
                  <span className="px-3 py-1 rounded-full text-xs bg-bg-tertiary text-text-secondary">
                    {job.remote_type}
                  </span>
                  <StatusChip status={job.status} />
                </div>

                {/* Application Link */}
                <a
                  href={job.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 mt-4 text-sm text-accent-indigo hover:text-accent-indigo-hover transition-colors"
                >
                  <ExternalLink size={14} />
                  Apply on {job.source}
                </a>

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center gap-3 mt-6">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={toggleSaved}
                    className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-button text-sm font-medium transition-all ${
                      saved
                        ? 'bg-accent-violet-muted text-accent-violet border border-accent-violet/30'
                        : 'border border-border-default text-text-secondary hover:bg-bg-tertiary'
                    }`}
                  >
                    <Star size={15} className={saved ? 'fill-accent-violet' : ''} />
                    {saved ? 'Saved' : 'Save'}
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={toggleSkipped}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-button border border-border-default text-text-secondary hover:bg-accent-rose-muted hover:text-accent-rose text-sm font-medium transition-all"
                  >
                    <X size={15} />
                    {skipped ? 'Skipped' : 'Skip'}
                  </motion.button>

                  <motion.a
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    href={job.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-button border border-border-default text-text-secondary hover:bg-bg-tertiary text-sm font-medium transition-all"
                  >
                    <ExternalLink size={15} />
                    Open Original
                  </motion.a>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={toggleApplied}
                    className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-button text-sm font-medium transition-all ${
                      applied
                        ? 'bg-accent-emerald/20 text-accent-emerald border border-accent-emerald/30'
                        : 'bg-accent-emerald text-[#0B0F19] hover:bg-accent-emerald/90'
                    }`}
                  >
                    <Check size={15} />
                    {applied ? 'Applied' : 'Mark Applied'}
                  </motion.button>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Section 2: Score Breakdown + Skills Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Score Breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="rounded-card bg-bg-secondary border border-border-subtle p-6"
        >
          <div className="flex items-center gap-2 mb-5">
            <Award size={18} className="text-accent-indigo" />
            <h2 className="font-heading text-lg font-semibold text-text-primary">Score Breakdown</h2>
          </div>
          <div className="space-y-4">
            {scoreBreakdown.map((item, i) => (
              <ScoreBreakdownBar key={item.label} label={item.label} score={item.score} index={i} />
            ))}
          </div>
        </motion.div>

        {/* Skills Analysis */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.35 }}
          className="rounded-card bg-bg-secondary border border-border-subtle p-6"
        >
          <div className="flex items-center gap-2 mb-5">
            <Code size={18} className="text-accent-indigo" />
            <h2 className="font-heading text-lg font-semibold text-text-primary">Skills Analysis</h2>
          </div>

          <div className="space-y-5">
            {/* Matching Skills */}
            <div>
              <h3 className="text-sm font-medium text-accent-emerald mb-2">
                Your Matching Skills ({job.match_analysis?.matched_skills.length || 0})
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {job.match_analysis?.matched_skills.map((skill, i) => (
                  <motion.span
                    key={skill}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, delay: i * 0.03 }}
                    className="px-3 py-1 rounded-full bg-accent-emerald-muted text-accent-emerald text-xs font-medium"
                  >
                    {skill}
                  </motion.span>
                ))}
              </div>
            </div>

            {/* Missing Skills */}
            <div>
              <h3 className="text-sm font-medium text-accent-rose mb-2">
                Skills to Develop ({job.match_analysis?.missing_skills.length || 0})
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {job.match_analysis?.missing_skills.map((skill, i) => (
                  <motion.span
                    key={skill}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, delay: 0.2 + i * 0.03 }}
                    className="px-3 py-1 rounded-full bg-accent-rose-muted text-accent-rose text-xs font-medium"
                  >
                    {skill}
                  </motion.span>
                ))}
              </div>
            </div>

            {/* Coverage Bar */}
            <div className="pt-2">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-text-muted">Skill Coverage</span>
                <span className="text-text-secondary">
                  {job.match_analysis?.matched_skills.length || 0} of{' '}
                  {(job.match_analysis?.matched_skills.length || 0) + (job.match_analysis?.missing_skills.length || 0)} skills
                </span>
              </div>
              <div className="h-2.5 bg-bg-tertiary rounded-full overflow-hidden flex">
                <div
                  className="h-full bg-accent-emerald rounded-l-full"
                  style={{
                    width: `${((job.match_analysis?.matched_skills.length || 0) /
                      ((job.match_analysis?.matched_skills.length || 0) + (job.match_analysis?.missing_skills.length || 1))) * 100}%`
                  }}
                />
                <div
                  className="h-full bg-accent-rose rounded-r-full"
                  style={{
                    width: `${((job.match_analysis?.missing_skills.length || 0) /
                      ((job.match_analysis?.matched_skills.length || 0) + (job.match_analysis?.missing_skills.length || 1))) * 100}%`
                  }}
                />
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Section 3: Match Explanation */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.4 }}
        className="rounded-card bg-bg-secondary border border-border-subtle p-6"
      >
        <div className="flex items-center gap-2 mb-4">
          <Sparkles size={18} className="text-accent-indigo" />
          <h2 className="font-heading text-lg font-semibold text-text-primary">Why This Job Matches You</h2>
        </div>
        <div className="prose prose-invert max-w-none">
          <p className="text-base text-text-secondary leading-relaxed">
            <strong className="text-text-primary">This is a {getScoreLabel(job.match_score).toLowerCase()} for your profile.</strong>
          </p>

          <div className="mt-4">
            <h3 className="text-sm font-semibold text-accent-emerald mb-2">Why it matches:</h3>
            <p className="text-sm text-text-secondary leading-relaxed">
              This role specifically asks for {job.match_analysis?.matched_skills.slice(0, 4).join(', ')} — all skills you have from your experience and projects.
              The job title &quot;{job.title}&quot; aligns well with your career target.
              {job.salary_min && ` The salary range (${formatSalary()}) matches your expectations for a ${job.remote_type} role.`}
            </p>
          </div>

          <div className="mt-4">
            <h3 className="text-sm font-semibold text-accent-indigo mb-2">Your relevant projects:</h3>
            <ol className="list-decimal list-inside space-y-1.5">
              {matchedProjects.map((proj) => (
                <li key={proj.id} className="text-sm text-text-secondary">
                  <button
                    onClick={() => navigate('/projects')}
                    className="font-medium text-accent-indigo cursor-pointer hover:underline"
                  >
                    {proj.name}
                  </button>
                  {' — '}
                  {proj.short_description}
                </li>
              ))}
            </ol>
          </div>

          {job.match_analysis?.missing_skills && job.match_analysis.missing_skills.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-semibold text-accent-rose mb-2">Skills gap:</h3>
              <ul className="space-y-1.5">
                {job.match_analysis.missing_skills.slice(0, 3).map(skill => (
                  <li key={skill} className="text-sm text-text-secondary flex items-start gap-2">
                    <span className="w-1 h-1 rounded-full bg-accent-rose mt-2 flex-shrink-0" />
                    <strong className="text-accent-rose">{skill}</strong> — Listed in the job description.
                    Consider adding this to your learning plan.
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-4 flex items-center gap-4 text-sm">
            <span className="text-accent-emerald font-medium">Risk level: Low</span>
            <span className="text-accent-amber font-medium">Priority: {job.match_score >= 85 ? 'High' : job.match_score >= 70 ? 'Medium' : 'Low'}</span>
          </div>
        </div>
      </motion.div>

      {/* Section 4: Best Projects + CV Suggestions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Best Projects */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.45 }}
          className="rounded-card bg-bg-secondary border border-border-subtle p-6"
        >
          <div className="flex items-center gap-2 mb-5">
            <FolderOpen size={18} className="text-accent-indigo" />
            <h2 className="font-heading text-lg font-semibold text-text-primary">Recommended Projects</h2>
          </div>
          <div className="space-y-4">
            {matchedProjects.map((proj) => (
              <motion.div
                key={proj.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => navigate('/projects')}
                className="relative p-4 rounded-lg bg-bg-tertiary/50 border border-border-subtle hover:border-border-default transition-all cursor-pointer"
              >
                <span className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-accent-indigo-muted text-accent-indigo text-[10px] font-medium">
                  Relevant
                </span>
                <h3 className="font-heading text-sm font-semibold text-text-primary pr-20">{proj.name}</h3>
                <p className="text-xs text-text-secondary mt-1.5 leading-relaxed">{proj.short_description}</p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {proj.technologies.slice(0, 5).map(tech => (
                    <span key={tech} className="px-2 py-0.5 rounded bg-bg-tertiary text-text-muted text-[10px]">{tech}</span>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* CV Suggestions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.5 }}
          className="rounded-card bg-bg-secondary border border-border-subtle p-6"
        >
          <div className="flex items-center gap-2 mb-5">
            <FileText size={18} className="text-accent-indigo" />
            <h2 className="font-heading text-lg font-semibold text-text-primary">Suggested CV Changes</h2>
          </div>
          <div className="space-y-3">
            {cvSuggestions.map((sugg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.55 + i * 0.05 }}
                className="p-3 rounded-lg bg-bg-tertiary/50 border border-border-subtle"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 rounded bg-accent-indigo-muted text-accent-indigo text-[10px] font-semibold">
                    {sugg.type}
                  </span>
                </div>
                <p className="text-sm text-text-primary">{sugg.desc}</p>
                <p className="text-xs text-text-muted mt-1">{sugg.reason}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Section 5: Job Description */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.55 }}
        className="rounded-card bg-bg-secondary border border-border-subtle p-6"
      >
        <button
          onClick={() => setDescExpanded(!descExpanded)}
          className="flex items-center justify-between w-full"
        >
          <div className="flex items-center gap-2">
            <FileText size={18} className="text-accent-indigo" />
            <h2 className="font-heading text-lg font-semibold text-text-primary">Full Job Description</h2>
          </div>
          {descExpanded ? <ChevronUp size={18} className="text-text-muted" /> : <ChevronDown size={18} className="text-text-muted" />}
        </button>
        <AnimatePresence>
          {descExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <div className="mt-4 space-y-4">
                <p className="text-sm text-text-secondary leading-relaxed">{job.description}</p>

                <div>
                  <h3 className="font-heading text-sm font-semibold text-accent-indigo mb-2">Requirements</h3>
                  <ul className="space-y-2">
                    {job.requirements.map((req, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-text-secondary">
                        <span className="w-1.5 h-1.5 rounded-full bg-accent-indigo mt-1.5 flex-shrink-0" />
                        {req}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h3 className="font-heading text-sm font-semibold text-accent-indigo mb-2">Responsibilities</h3>
                  <ul className="space-y-2">
                    {job.responsibilities.map((resp, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-text-secondary">
                        <span className="w-1.5 h-1.5 rounded-full bg-accent-emerald mt-1.5 flex-shrink-0" />
                        {resp}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Highlighted Skills */}
                <div className="pt-2">
                  <h3 className="font-heading text-sm font-semibold text-text-primary mb-2">Skills Mentioned</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {job.match_analysis?.matched_skills.map(skill => (
                      <span key={skill} className="px-2.5 py-1 rounded-full bg-accent-emerald-muted text-accent-emerald text-xs font-medium">
                        {skill}
                      </span>
                    ))}
                    {job.match_analysis?.missing_skills.map(skill => (
                      <span key={skill} className="px-2.5 py-1 rounded-full bg-accent-rose-muted text-accent-rose text-xs font-medium">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Section 6: Cover Letter Suggestions + Interview Prep */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Cover Letter Suggestions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.6 }}
          className="rounded-card bg-bg-secondary border border-border-subtle p-6"
        >
          <div className="flex items-center gap-2 mb-5">
            <Mail size={18} className="text-accent-indigo" />
            <h2 className="font-heading text-lg font-semibold text-text-primary">Cover Letter Angle</h2>
          </div>
          <div className="space-y-3">
            {coverLetterAngles.map((angle, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.65 + i * 0.05 }}
                className="flex items-start gap-3"
              >
                <CheckCircle size={16} className="text-accent-emerald mt-0.5 flex-shrink-0" />
                <p className="text-sm text-text-secondary leading-relaxed">{angle}</p>
              </motion.div>
            ))}
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleGenerateCL}
            className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-button bg-accent-indigo text-white text-sm font-medium hover:bg-accent-indigo-hover transition-all shadow-lg shadow-accent-indigo/20"
          >
            <Wand2 size={15} />
            Generate Full Cover Letter
          </motion.button>
        </motion.div>

        {/* Interview Prep */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.65 }}
          className="rounded-card bg-bg-secondary border border-border-subtle p-6"
        >
          <div className="flex items-center justify-between gap-2 mb-5">
            <div className="flex items-center gap-2">
              <MessageSquare size={18} className="text-accent-indigo" />
              <h2 className="font-heading text-lg font-semibold text-text-primary">Likely Interview Questions</h2>
              {aiQuestions && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-accent-emerald-muted text-accent-emerald">
                  <Sparkles size={10} /> AI-tailored
                </span>
              )}
            </div>
            <button
              onClick={handleInterviewPrep}
              disabled={prepLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-button bg-accent-indigo text-white text-xs font-medium hover:bg-accent-indigo-hover transition-all disabled:opacity-50 flex-shrink-0"
            >
              {prepLoading ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Preparing…
                </>
              ) : (
                <>
                  <Sparkles size={14} />
                  {aiQuestions ? 'Regenerate' : 'Prep with AI'}
                </>
              )}
            </button>
          </div>
          <div className="space-y-4">
            {(aiQuestions || interviewQuestions).map((q, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.7 + i * 0.05 }}
                className="p-3 rounded-lg bg-bg-tertiary/50 border border-border-subtle"
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                    q.category === 'Technical' ? 'bg-accent-cyan-muted text-accent-cyan' :
                    q.category === 'Behavioral' ? 'bg-accent-violet-muted text-accent-violet' :
                    q.category === 'Project' ? 'bg-accent-emerald-muted text-accent-emerald' :
                    'bg-accent-amber-muted text-accent-amber'
                  }`}>
                    {q.category}
                  </span>
                </div>
                <p className="text-sm text-text-primary font-medium">{q.q}</p>
                <p className="text-xs text-text-muted mt-1">{q.tip}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Section 7: Application Checklist + Notes */}
      <motion.div
        id="notes-reminder"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.7 }}
        className="rounded-card bg-bg-secondary border border-border-subtle p-6 scroll-mt-24"
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Checklist */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <ClipboardList size={18} className="text-accent-indigo" />
              <h2 className="font-heading text-lg font-semibold text-text-primary">Application Checklist</h2>
            </div>

            {/* Progress Bar */}
            <div className="mb-4">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-text-muted">{checklistProgress} of {checklistTotal} complete</span>
                <span className="text-text-secondary">{Math.round((checklistProgress / checklistTotal) * 100)}%</span>
              </div>
              <div className="h-2 bg-bg-tertiary rounded-full overflow-hidden">
                <div
                  className="h-full bg-accent-emerald rounded-full transition-all duration-500"
                  style={{ width: `${(checklistProgress / checklistTotal) * 100}%` }}
                />
              </div>
            </div>

            <div className="space-y-2">
              {Object.entries(checklist).map(([item, checked]) => (
                <label key={item} className="flex items-center gap-3 cursor-pointer py-1.5 group">
                  <div
                    onClick={() => setChecklist(prev => ({ ...prev, [item]: !prev[item] }))}
                    className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 transition-all ${
                      checked ? 'bg-accent-indigo' : 'border border-border-default bg-bg-tertiary group-hover:border-accent-indigo'
                    }`}
                  >
                    {checked && <Check size={12} className="text-white" />}
                  </div>
                  <span className={`text-sm transition-all ${checked ? 'text-text-muted line-through' : 'text-text-secondary'}`}>
                    {item}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Notes + Reminder */}
          <div className="space-y-6">
            {/* Notes */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-heading text-sm font-semibold text-text-primary">My Notes</h3>
                <AnimatePresence>
                  {notesSaved && (
                    <motion.span
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0 }}
                      className="text-xs text-accent-emerald"
                    >
                      Saved
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add your thoughts about this job..."
                className="w-full min-h-[100px] p-3 rounded-input bg-bg-tertiary border border-border-default text-sm text-text-primary placeholder:text-text-muted focus:border-accent-indigo focus:outline-none focus:ring-2 focus:ring-accent-indigo/15 resize-y transition-all"
              />
            </div>

            {/* Reminder */}
            <div>
              <h3 className="font-heading text-sm font-semibold text-text-primary mb-3">Set Reminder</h3>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="date"
                  value={reminderDate}
                  onChange={(e) => setReminderDate(e.target.value)}
                  className="h-10 px-3 rounded-input bg-bg-tertiary border border-border-default text-sm text-text-primary focus:border-accent-indigo focus:outline-none"
                />
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    if (reminderDate) {
                      setReminderSet(true)
                      setTimeout(() => setReminderSet(false), 2000)
                    }
                  }}
                  className="h-10 px-4 rounded-button border border-border-default text-text-secondary hover:bg-bg-tertiary text-sm font-medium transition-all flex items-center gap-2"
                >
                  <Bell size={14} />
                  Set Reminder
                </motion.button>
              </div>
              <div className="flex gap-2 mt-2">
                {['Tomorrow', 'In 3 days', 'In 1 week'].map(preset => (
                  <button
                    key={preset}
                    onClick={() => {
                      const d = new Date()
                      if (preset === 'Tomorrow') d.setDate(d.getDate() + 1)
                      if (preset === 'In 3 days') d.setDate(d.getDate() + 3)
                      if (preset === 'In 1 week') d.setDate(d.getDate() + 7)
                      setReminderDate(format(d, 'yyyy-MM-dd'))
                    }}
                    className="px-2.5 py-1 rounded-full bg-bg-tertiary text-text-muted text-[11px] hover:text-text-primary transition-colors"
                  >
                    {preset}
                  </button>
                ))}
              </div>
              <AnimatePresence>
                {reminderSet && (
                  <motion.p
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="text-xs text-accent-emerald mt-2"
                  >
                    Reminder set for {reminderDate}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Sticky Bottom Action Bar */}
      <motion.div
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.3, delay: 0.5, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
        className="fixed bottom-0 left-0 right-0 z-40 bg-bg-secondary/95 backdrop-blur-lg border-t border-border-subtle"
      >
        <div className="max-w-[1440px] mx-auto h-16 px-6 flex items-center justify-center gap-3">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleGenerateCV}
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-button text-sm font-medium transition-all shadow-lg ${
              cvGenerated
                ? 'bg-accent-emerald/20 text-accent-emerald border border-accent-emerald/30'
                : 'bg-accent-indigo text-white hover:bg-accent-indigo-hover shadow-accent-indigo/20'
            }`}
          >
            <Wand2 size={15} />
            {cvGenerated ? 'CV Ready' : 'Generate Tailored CV'}
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleGenerateCL}
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-button text-sm font-medium transition-all ${
              clGenerated
                ? 'bg-accent-emerald/20 text-accent-emerald border border-accent-emerald/30'
                : 'border border-border-default text-text-secondary hover:bg-bg-tertiary hover:text-text-primary'
            }`}
          >
            <FileText size={15} />
            {clGenerated ? 'CL Ready' : 'Generate Cover Letter'}
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={applied ? toggleApplied : handleApplyNow}
            title={applied ? 'Mark as not applied' : 'Open the posting, mark applied, and set a 7-day follow-up reminder'}
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-button text-sm font-medium transition-all ${
              applied
                ? 'bg-accent-emerald/20 text-accent-emerald border border-accent-emerald/30'
                : 'bg-accent-emerald text-[#0B0F19] hover:bg-accent-emerald/90 shadow-lg shadow-accent-emerald/20'
            }`}
          >
            {applied ? <Check size={15} /> : <ExternalLink size={15} />}
            {applied ? 'Applied' : 'Apply Now'}
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={toggleSaved}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-button text-sm font-medium transition-all hidden sm:inline-flex ${
              saved ? 'text-accent-amber' : 'text-text-secondary hover:text-text-primary border border-border-default'
            }`}
          >
            <Star size={15} className={saved ? 'fill-accent-amber' : ''} />
            {saved ? 'Saved' : 'Save'}
          </motion.button>

          <motion.a
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            href={job.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-button border border-border-default text-text-secondary hover:bg-bg-tertiary text-sm font-medium transition-all hidden sm:inline-flex"
          >
            <ExternalLink size={15} />
            Open Job
          </motion.a>
        </div>
      </motion.div>

      {/* CV Generator Drawer */}
      <AnimatePresence>
        {cvDrawerOpen && (
          <GeneratorDrawer
            title="Generate Tailored CV"
            job={job}
            onClose={() => setCvDrawerOpen(false)}
            onGenerated={() => setCvGenerated(true)}
            type="cv"
          />
        )}
      </AnimatePresence>

      {/* Cover Letter Generator Drawer */}
      <AnimatePresence>
        {clDrawerOpen && (
          <GeneratorDrawer
            title="Generate Cover Letter"
            job={job}
            onClose={() => setClDrawerOpen(false)}
            onGenerated={() => setClGenerated(true)}
            type="cl"
          />
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ─── Generator Drawer ──────────────────────────────────────────────────

function GeneratorDrawer({ title, job, onClose, type, onGenerated }: {
  title: string
  job: Job
  onClose: () => void
  type: 'cv' | 'cl'
  onGenerated?: () => void
}) {
  const [cvOptions, setCvOptions] = useState({
    reorderSkills: true,
    reorderProjects: true,
    rewriteSummary: true,
    addKeywords: true,
    removeIrrelevant: false,
  })

  const [clTone, setClTone] = useState<'professional' | 'enthusiastic' | 'concise'>('professional')

  // ── Live AI generation state ──
  const [phase, setPhase] = useState<'form' | 'loading' | 'result'>('form')
  const [output, setOutput] = useState('')
  const [usedFallback, setUsedFallback] = useState(false)

  const tailoredCV = `Mihretab Nega
Junior Software Developer | Full-Stack Java & React
London, W3 | mihretabtesfahun2124@gmail.com | 07388 617 329 | mihretab.org | github.com/2118476

PROFILE
${type === 'cv' ? `Computer Science graduate from Brunel University London (2024) with strong full-stack experience in ${job.match_analysis?.matched_skills.slice(0, 4).join(', ')}, now expanding into .NET and cloud. Delivered real-world projects involving APIs, SQL databases and cloud deployment, with a focus on usability and performance.` : ''}

KEY SKILLS
${job.match_analysis?.matched_skills.join(', ')}

PROJECTS
MMS — SMS & Voice Call Web App (2025) | React, Spring Boot, MySQL, Twilio
- Full-stack app to send SMS, make/receive calls and track call history, integrating Twilio APIs with TwiML call routing.

Hair Salon Booking System — Final Year Project (2024) | Java, Spring Boot, MySQL
- Secure appointment booking platform with admin/user roles, login authentication and optimised database schemas.

E-Learning Platform — Group Project (2023) | React, Spring Boot, MySQL
- Coding-lesson web app built with a team using agile, contributing frontend components and API integrations.

EDUCATION
BSc Computer Science | Brunel University London | Sept 2021 - June 2024
Access to HE Diploma (Electronics & Software Engineering) | Newham College | 2020 - 2021`

  const coverLetter = `Dear ${job.company} Hiring Team,

I am writing to apply for the ${job.title} position at ${job.company}. As a Computer Science graduate from Brunel University London with hands-on experience in ${job.match_analysis?.matched_skills.slice(0, 3).join(', ')}, I am keen to contribute as a junior software developer on your team.

Through my projects I have built and deployed real applications — including a Java and Spring Boot hair salon booking system and a React and Spring Boot SMS & voice app integrating the Twilio API — which gave me practical experience with ${job.match_analysis?.matched_skills.slice(0, 2).join(' and ')}, REST APIs and SQL databases.

${job.match_analysis?.missing_skills[0] ? `I am also actively learning ${job.match_analysis.missing_skills[0]}, and I pick up new tools quickly.` : ''}

I would welcome the opportunity to discuss how I can contribute to ${job.company} and continue growing as a developer.

Kind regards,
Mihretab Nega`

  const handleGenerate = async () => {
    setPhase('loading')
    try {
      const res = await tailorDocument({
        job,
        type: type === 'cv' ? 'cv' : 'cover_letter',
        tone: clTone,
        options: type === 'cv' ? cvOptions : undefined,
      })
      setOutput(res.text)
      setUsedFallback(!!res.fallback)
      // Persist the generated document so it shows in the CV Manager
      saveDocument({
        job_id: job.id,
        type: type === 'cv' ? 'cv' : 'cover_letter',
        job_title: job.title,
        company: job.company,
        content: res.text,
      })
      // Reflect drafting status on the job
      updateJob(job.id, { status: type === 'cv' ? 'cv_drafted' : 'cl_drafted' })
    } catch {
      // Backend unreachable — fall back to the local template
      setOutput(type === 'cv' ? tailoredCV : coverLetter)
      setUsedFallback(true)
    } finally {
      setPhase('result')
      onGenerated?.()
    }
  }

  const handleCopy = () => navigator.clipboard?.writeText(output)
  const baseName = `${type === 'cv' ? 'CV' : 'CoverLetter'}-${job.company.replace(/\s+/g, '_')}`
  const handleDownloadPdf = () =>
    downloadAsPdf(output, baseName, { type: type === 'cv' ? 'cv' : 'cover_letter' })
  const handleDownloadTxt = () => {
    const blob = new Blob([output], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${baseName}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

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
        className="fixed right-0 top-0 bottom-0 w-full max-w-[640px] bg-bg-secondary border-l border-border-subtle z-50 flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border-subtle">
          <h2 className="font-heading text-lg font-semibold text-text-primary">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-bg-tertiary text-text-muted hover:text-text-primary transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* Job Context */}
          <div className="p-3 rounded-lg bg-bg-tertiary/50 border border-border-subtle mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-accent-indigo-muted flex items-center justify-center">
                <span className="font-mono text-sm font-bold text-accent-indigo">{job.match_score}</span>
              </div>
              <div>
                <p className="text-sm font-medium text-text-primary">{job.title}</p>
                <p className="text-xs text-text-secondary">{job.company}</p>
              </div>
            </div>
          </div>

          {phase === 'form' && (
            <>
              {type === 'cv' ? (
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-text-primary mb-3">Tailoring Options</h3>
                  {[
                    { key: 'reorderSkills', label: 'Reorder skills by job relevance' },
                    { key: 'reorderProjects', label: 'Reorder projects by relevance' },
                    { key: 'rewriteSummary', label: 'Rewrite personal summary for this role' },
                    { key: 'addKeywords', label: 'Add matching keywords' },
                    { key: 'removeIrrelevant', label: 'Remove irrelevant details' },
                  ].map(opt => (
                    <label key={opt.key} className="flex items-center gap-3 cursor-pointer py-1">
                      <input
                        type="checkbox"
                        checked={(cvOptions as Record<string, boolean>)[opt.key]}
                        onChange={(e) => setCvOptions(prev => ({ ...prev, [opt.key]: e.target.checked }))}
                        className="w-4 h-4 rounded border-border-default bg-bg-tertiary text-accent-indigo"
                      />
                      <span className="text-sm text-text-secondary">{opt.label}</span>
                    </label>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-text-primary mb-3">Tone</h3>
                    <div className="flex rounded-lg border border-border-default overflow-hidden">
                      {(['professional', 'enthusiastic', 'concise'] as const).map(tone => (
                        <button
                          key={tone}
                          onClick={() => setClTone(tone)}
                          className={`flex-1 py-2 text-xs font-medium capitalize transition-colors ${
                            clTone === tone ? 'bg-accent-indigo text-white' : 'bg-bg-tertiary text-text-secondary hover:text-text-primary'
                          }`}
                        >
                          {tone}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleGenerate}
                className="w-full mt-6 px-5 py-3 rounded-button bg-accent-indigo text-white text-sm font-medium hover:bg-accent-indigo-hover transition-all shadow-lg shadow-accent-indigo/20 flex items-center justify-center gap-2"
              >
                <Sparkles size={16} />
                Generate {type === 'cv' ? 'Tailored CV' : 'Cover Letter'} with AI
              </motion.button>
            </>
          )}

          {/* Loading State */}
          {phase === 'loading' && (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-10 h-10 border-2 border-accent-indigo/30 border-t-accent-indigo rounded-full animate-spin mb-4" />
              <p className="text-sm text-text-secondary animate-pulse">
                {type === 'cv' ? 'Analyzing job description...' : 'Crafting your cover letter...'}
              </p>
              <div className="mt-6 space-y-2 w-full max-w-xs">
                {['Parsing requirements', 'Matching your skills', 'Rewriting content', 'Finalizing'].map((step, i) => (
                  <motion.div
                    key={step}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.5 }}
                    className="flex items-center gap-2 text-xs text-text-muted"
                  >
                    <CheckCircle size={14} className={i < 2 ? 'text-accent-emerald' : 'text-text-muted'} />
                    {step}
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Generated Result */}
          {phase === 'result' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              {usedFallback ? (
                <div className="mb-4 p-3 rounded-lg bg-accent-amber-muted border border-accent-amber/20">
                  <p className="text-xs text-accent-amber flex items-center gap-1.5">
                    <CheckCircle size={14} />
                    AI unavailable — showing an editable template draft
                  </p>
                </div>
              ) : (
                <div className="mb-4 p-3 rounded-lg bg-accent-emerald-muted border border-accent-emerald/20">
                  <p className="text-xs text-accent-emerald flex items-center gap-1.5">
                    <CheckCircle size={14} />
                    Generated by AI from your real profile — truthful, no invented experience
                  </p>
                </div>
              )}

              <div className="p-4 rounded-lg bg-bg-tertiary/50 border border-border-subtle">
                <pre className="text-sm text-text-secondary whitespace-pre-wrap font-mono leading-relaxed">
                  {output}
                </pre>
              </div>

              <div className="flex flex-wrap gap-2 mt-4">
                <button onClick={handleCopy} className="inline-flex items-center gap-2 px-4 py-2 rounded-button border border-border-default text-text-secondary hover:bg-bg-tertiary text-sm transition-all">
                  <Copy size={14} />
                  Copy
                </button>
                <button onClick={handleDownloadPdf} className="inline-flex items-center gap-2 px-4 py-2 rounded-button bg-accent-emerald/15 border border-accent-emerald/30 text-accent-emerald hover:bg-accent-emerald/25 text-sm font-medium transition-all">
                  <Download size={14} />
                  Download PDF
                </button>
                <button onClick={handleDownloadTxt} className="inline-flex items-center gap-2 px-3 py-2 rounded-button border border-border-default text-text-muted hover:bg-bg-tertiary text-sm transition-all" title="Download as plain text">
                  .txt
                </button>
                <button onClick={() => setPhase('form')} className="inline-flex items-center gap-2 px-4 py-2 rounded-button bg-accent-indigo text-white hover:bg-accent-indigo-hover text-sm transition-all">
                  <Sparkles size={14} />
                  Regenerate
                </button>
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>
    </>
  )
}
