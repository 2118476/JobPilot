import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BookOpen,
  CheckCircle2,
  Circle,
  Clock,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Award,
  Sparkles,
  Target,
  PlayCircle,
  GraduationCap,
  Star,
  Lock,
} from 'lucide-react'

// ─── ITIL 4 Learning Path data ────────────────────────────────

interface LearningLink {
  label: string
  url: string
  free: boolean
  type: 'video' | 'article' | 'course' | 'practice' | 'official'
}

interface ITILLevel {
  level: number
  title: string
  subtitle: string
  description: string
  duration: string
  type: 'study' | 'certification' | 'advanced' | 'master'
  keyTopics: string[]
  links: LearningLink[]
  examInfo?: string
  jobRelevance: string
}

const ITIL_LEVELS: ITILLevel[] = [
  {
    level: 1,
    title: 'ITSM Foundations',
    subtitle: 'Introduction to IT Service Management',
    description:
      'Understand what IT Service Management is, why it matters, and how organisations use it. Covers the history of ITIL, key service management principles, and the difference between IT operations and service thinking.',
    duration: '4–6 hours',
    type: 'study',
    keyTopics: ['What is ITSM?', 'History of ITIL', 'Service thinking vs product thinking', 'ITIL vs COBIT vs ISO 20000', 'Why organisations adopt ITIL'],
    links: [
      { label: 'Simplilearn: What is ITIL? (Free)', url: 'https://www.simplilearn.com/tutorials/itil-tutorial/what-is-itil', free: true, type: 'article' },
      { label: 'AXELOS: Official ITIL 4 Overview', url: 'https://www.axelos.com/certifications/itil-service-management', free: true, type: 'official' },
      { label: 'YouTube: ITIL 4 Introduction (Free)', url: 'https://www.youtube.com/results?search_query=ITIL+4+introduction+free', free: true, type: 'video' },
    ],
    jobRelevance: 'Demonstrates awareness of ITSM — relevant for IT support and service desk roles.',
  },
  {
    level: 2,
    title: 'ITIL 4 Core Vocabulary',
    subtitle: 'Key terminology and concepts',
    description:
      'Master the essential ITIL 4 vocabulary: services, value, outcomes, outputs, risks, utility and warranty. Without this language fluency, the rest of ITIL is hard to absorb — this level is the foundation of the Foundation.',
    duration: '6–8 hours',
    type: 'study',
    keyTopics: ['Value and value co-creation', 'Service consumers (users, customers, sponsors)', 'Utility & Warranty', 'Outputs vs Outcomes vs Value', 'Risk and cost in service management'],
    links: [
      { label: 'FreeCodeCamp: ITIL 4 Study Guide (Free)', url: 'https://www.freecodecamp.org/news/itil-4-foundation-exam-study-guide/', free: true, type: 'article' },
      { label: 'Quizlet: ITIL 4 Foundation Flashcards (Free)', url: 'https://quizlet.com/subject/itil-4-foundation/', free: true, type: 'practice' },
      { label: 'Coursera: IT Service Mgmt (Audit Free)', url: 'https://www.coursera.org/learn/it-service-management', free: true, type: 'course' },
    ],
    jobRelevance: 'Foundation vocabulary is tested in job interviews for IT support, analyst and service desk positions.',
  },
  {
    level: 3,
    title: 'Service Value System',
    subtitle: 'SVS, Guiding Principles & Continual Improvement',
    description:
      'Understand ITIL 4\'s central model: the Service Value System. Learn the five components — opportunity/demand, guiding principles, governance, service value chain and continual improvement — and how they work together.',
    duration: '8–10 hours',
    type: 'study',
    keyTopics: ['Service Value System (SVS) overview', '7 Guiding Principles', 'Service Value Chain (6 activities)', 'Governance in ITIL 4', 'Continual Improvement model', '4 Dimensions Model'],
    links: [
      { label: 'YouTube: ITIL 4 SVS Full Walkthrough (Free)', url: 'https://www.youtube.com/results?search_query=ITIL+4+service+value+system+explained', free: true, type: 'video' },
      { label: 'Simplilearn: ITIL 4 SVS Deep Dive (Free)', url: 'https://www.simplilearn.com/tutorials/itil-tutorial/itil-service-value-chain', free: true, type: 'article' },
      { label: 'AXELOS: Free SVS Resources', url: 'https://www.axelos.com/store/free', free: true, type: 'official' },
    ],
    jobRelevance: 'SVS understanding demonstrates you can think systematically about IT delivery — key for analyst and support roles.',
  },
  {
    level: 4,
    title: '34 ITIL Practices',
    subtitle: 'All management practices overview',
    description:
      'ITIL 4 defines 34 practices grouped into General Management, Service Management and Technical Management. Focus on the 15 most commonly tested and used in real organisations: Incident, Problem, Change, Service Desk, Service Level Management and more.',
    duration: '10–14 hours',
    type: 'study',
    keyTopics: ['Incident Management', 'Problem Management', 'Change Enablement', 'Service Desk practice', 'Service Level Management', 'Service Request Management', 'Monitoring & Event Management', 'Knowledge Management'],
    links: [
      { label: 'Simplilearn: ITIL 4 Practices Guide (Free)', url: 'https://www.simplilearn.com/tutorials/itil-tutorial/itil-service-management-practices', free: true, type: 'article' },
      { label: 'YouTube: ITIL 4 Practices Explained (Free)', url: 'https://www.youtube.com/results?search_query=ITIL+4+34+practices+explained', free: true, type: 'video' },
      { label: 'Quizlet: ITIL Practices Flashcards (Free)', url: 'https://quizlet.com/subject/itil-practices/', free: true, type: 'practice' },
    ],
    jobRelevance: 'Knowing incident, change and problem management is directly applicable in IT support, NOC and service desk jobs.',
  },
  {
    level: 5,
    title: 'ITIL 4 Foundation Certification',
    subtitle: 'Official PeopleCert exam — your next milestone',
    description:
      'The ITIL 4 Foundation exam certifies your understanding of the ITIL framework. It is the world\'s most widely recognised IT service management certification. 40 multiple-choice questions, 60 minutes, 65% pass mark (26/40). Accredited by AXELOS, delivered by PeopleCert.',
    duration: '2–3 days focused revision + exam',
    type: 'certification',
    examInfo: '40 questions | 60 minutes | 65% pass mark | Online proctored | ~£255 official price',
    keyTopics: ['Full syllabus revision', 'Mock exam practice', 'Exam technique', 'Booking via PeopleCert', 'Digital certificate (lifetime valid)'],
    links: [
      { label: 'ITILFoundation.com: Free Practice Tests', url: 'https://www.itilf.com/', free: true, type: 'practice' },
      { label: 'PeopleCert: Official Exam Booking', url: 'https://www.peoplecert.org/en/itil', free: false, type: 'official' },
      { label: 'YouTube: ITIL 4 Foundation Full Course (Free)', url: 'https://www.youtube.com/results?search_query=ITIL+4+foundation+full+course+free+2024', free: true, type: 'video' },
      { label: 'Udemy: ITIL 4 Foundation Course (often £12)', url: 'https://www.udemy.com/course/itil-4-foundation/', free: false, type: 'course' },
    ],
    jobRelevance: 'Having "ITIL 4 Foundation" on your CV opens doors in IT support, service management, cloud operations and public sector IT.',
  },
  {
    level: 6,
    title: 'ITIL 4 Specialist: CDS',
    subtitle: 'Create, Deliver and Support',
    description:
      'The CDS module covers how to plan and build a service value stream to create, deliver and support IT-enabled services. Includes service design, workforce topics, tooling, and team management in a DevOps context.',
    duration: '20–30 hours study + exam',
    type: 'advanced',
    keyTopics: ['Service value stream design', 'Build vs buy decisions', 'Team topologies and DevOps', 'Performance measurement', 'Service integration and management (SIAM)'],
    links: [
      { label: 'AXELOS: CDS Certification Details', url: 'https://www.axelos.com/certifications/itil-service-management/itil-4-specialist-create-deliver-support', free: true, type: 'official' },
      { label: 'YouTube: CDS Overview (Free)', url: 'https://www.youtube.com/results?search_query=ITIL+4+CDS+create+deliver+support', free: true, type: 'video' },
    ],
    jobRelevance: 'CDS is valued in DevOps engineer, cloud engineer and IT operations lead roles.',
  },
  {
    level: 7,
    title: 'ITIL 4 Specialist: DSV',
    subtitle: 'Drive Stakeholder Value',
    description:
      'DSV focuses on designing digital service journeys, building customer relationships, and managing supplier and partner value. It covers SLAs, experience management and the full customer journey in IT service delivery.',
    duration: '20–30 hours study + exam',
    type: 'advanced',
    keyTopics: ['Service relationship management', 'Customer experience (CX)', 'SLAs & SLOs', 'Supplier management', 'Digital service journey design', 'Onboarding & offboarding'],
    links: [
      { label: 'AXELOS: DSV Certification Details', url: 'https://www.axelos.com/certifications/itil-service-management/itil-4-specialist-drive-stakeholder-value', free: true, type: 'official' },
      { label: 'YouTube: DSV Overview (Free)', url: 'https://www.youtube.com/results?search_query=ITIL+4+DSV+drive+stakeholder+value', free: true, type: 'video' },
    ],
    jobRelevance: 'DSV is relevant for service managers, customer success engineers and public sector delivery roles.',
  },
  {
    level: 8,
    title: 'ITIL 4 Specialist: HVIT',
    subtitle: 'High Velocity IT',
    description:
      'HVIT links ITIL to modern practices like DevOps, Lean, Agile and Site Reliability Engineering. It focuses on digital transformation and how IT can deliver value at speed and scale — essential for tech-forward organisations.',
    duration: '20–30 hours study + exam',
    type: 'advanced',
    keyTopics: ['Digital transformation principles', 'Agile & DevOps in ITSM', 'Site Reliability Engineering concepts', 'Safety culture and psychological safety', 'Technical debt management'],
    links: [
      { label: 'AXELOS: HVIT Certification Details', url: 'https://www.axelos.com/certifications/itil-service-management/itil-4-specialist-high-velocity-it', free: true, type: 'official' },
      { label: 'YouTube: HVIT Overview (Free)', url: 'https://www.youtube.com/results?search_query=ITIL+4+HVIT+high+velocity+IT', free: true, type: 'video' },
    ],
    jobRelevance: 'HVIT is attractive for DevOps, SRE and cloud engineering roles at fast-moving organisations.',
  },
  {
    level: 9,
    title: 'ITIL 4 Strategist: DPI',
    subtitle: 'Direct, Plan and Improve',
    description:
      'DPI is the strategic module, covering governance, measurement, portfolio management and continual improvement at enterprise scale. Required for both the Managing Professional and Strategic Leader streams.',
    duration: '25–35 hours study + exam',
    type: 'advanced',
    keyTopics: ['Strategic direction and governance', 'Portfolio management', 'Measurement and reporting', 'Continual improvement governance', 'Organisational change management'],
    links: [
      { label: 'AXELOS: DPI Certification Details', url: 'https://www.axelos.com/certifications/itil-service-management/itil-4-strategist-direct-plan-improve', free: true, type: 'official' },
      { label: 'YouTube: DPI Overview (Free)', url: 'https://www.youtube.com/results?search_query=ITIL+4+DPI+direct+plan+improve', free: true, type: 'video' },
    ],
    jobRelevance: 'DPI demonstrates strategic IT leadership capability — relevant for senior analyst, IT manager and public sector technology roles.',
  },
  {
    level: 10,
    title: 'ITIL Managing Professional / Strategic Leader',
    subtitle: 'ITIL Master track — elite designation',
    description:
      'The pinnacle of ITIL certification. Managing Professional (MP) requires CDS + DSV + HVIT + DPI. Strategic Leader (SL) requires DPI + DITS (Digital & IT Strategy). Both are prestigious credentials recognised globally, especially in large enterprises and government IT.',
    duration: 'Months of sustained study (all prior modules required)',
    type: 'master',
    keyTopics: ['ITIL Managing Professional designation', 'ITIL Strategic Leader designation', 'ITIL Master (highest tier)', 'Enterprise IT strategy', 'C-suite IT advisory'],
    links: [
      { label: 'AXELOS: Managing Professional', url: 'https://www.axelos.com/certifications/itil-service-management/itil-4-managing-professional', free: true, type: 'official' },
      { label: 'AXELOS: Strategic Leader', url: 'https://www.axelos.com/certifications/itil-service-management/itil-4-strategic-leader', free: true, type: 'official' },
      { label: 'AXELOS: ITIL Master', url: 'https://www.axelos.com/certifications/itil-service-management/itil-master', free: true, type: 'official' },
    ],
    jobRelevance: 'MP or SL designation targets IT Director, Head of IT Operations, and enterprise service management leadership roles.',
  },
]

// ─── Progress storage (localStorage) ─────────────────────────

const STORAGE_KEY = 'itil_progress_v1'

interface ITILProgress {
  completedLevels: number[]
  inProgressLevel: number | null
}

function loadProgress(): ITILProgress {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  // Default: levels 1-2 complete, level 3 in progress (studying Foundation)
  return { completedLevels: [1, 2], inProgressLevel: 3 }
}

function saveProgress(p: ITILProgress) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(p))
}

// ─── Helpers ─────────────────────────────────────────────────

const typeColor: Record<ITILLevel['type'], string> = {
  study: 'text-accent-cyan bg-accent-cyan-muted',
  certification: 'text-accent-emerald bg-accent-emerald-muted',
  advanced: 'text-accent-violet bg-accent-violet-muted',
  master: 'text-accent-amber bg-accent-amber-muted',
}

const typeLabel: Record<ITILLevel['type'], string> = {
  study: 'Study',
  certification: 'Certification',
  advanced: 'Advanced',
  master: 'Master',
}

const linkIcon: Record<LearningLink['type'], string> = {
  video: '▶',
  article: '📄',
  course: '🎓',
  practice: '✏️',
  official: '🏛',
}

const easeOut = [0.16, 1, 0.3, 1] as [number, number, number, number]

// ─── Main Component ───────────────────────────────────────────

export default function ITILLearning() {
  const [progress, setProgress] = useState<ITILProgress>(loadProgress)
  const [expandedLevels, setExpandedLevels] = useState<Set<number>>(new Set([3, 4, 5]))

  useEffect(() => {
    saveProgress(progress)
  }, [progress])

  const totalLevels = ITIL_LEVELS.length
  const completedCount = progress.completedLevels.length
  const progressPct = Math.round((completedCount / totalLevels) * 100)

  const levelStatus = (level: number): 'complete' | 'in_progress' | 'locked' => {
    if (progress.completedLevels.includes(level)) return 'complete'
    if (progress.inProgressLevel === level) return 'in_progress'
    return 'locked'
  }

  const toggleExpand = (level: number) => {
    setExpandedLevels((prev) => {
      const next = new Set(prev)
      next.has(level) ? next.delete(level) : next.add(level)
      return next
    })
  }

  const markComplete = (level: number) => {
    setProgress((prev) => ({
      completedLevels: [...new Set([...prev.completedLevels, level])],
      inProgressLevel: prev.inProgressLevel === level ? level + 1 : prev.inProgressLevel,
    }))
  }

  const markInProgress = (level: number) => {
    setProgress((prev) => ({
      ...prev,
      inProgressLevel: level,
    }))
  }

  const markIncomplete = (level: number) => {
    setProgress((prev) => ({
      completedLevels: prev.completedLevels.filter((l) => l !== level),
      inProgressLevel: prev.inProgressLevel === level ? level : prev.inProgressLevel,
    }))
  }

  return (
    <motion.div
      className="space-y-6 pb-24"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: easeOut }}
    >
      {/* ── Header ── */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-accent-violet-muted flex items-center justify-center flex-shrink-0">
            <BookOpen size={20} className="text-accent-violet" />
          </div>
          <div>
            <h1 className="font-heading text-display-md font-semibold text-text-primary tracking-tight">
              ITIL 4 Learning Path
            </h1>
            <p className="text-body-sm text-text-secondary">
              IT Infrastructure Library — your 10-level roadmap from beginner to Managing Professional
            </p>
          </div>
        </div>
      </div>

      {/* ── Status Banner ── */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1, duration: 0.3, ease: easeOut }}
        className="rounded-card-lg border border-accent-violet/20 bg-accent-violet-muted/30 p-5"
      >
        <div className="flex flex-wrap items-start gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles size={16} className="text-accent-violet" />
              <span className="text-body-sm font-semibold text-accent-violet">Your ITIL Status</span>
            </div>
            <p className="text-body-md text-text-primary font-medium">
              ITIL 4 Foundation — actively studying
            </p>
            <p className="text-body-sm text-text-secondary mt-0.5">
              Certificate not yet awarded. Exam pending. Currently on Level {progress.inProgressLevel ?? 3}.
            </p>
            <p className="text-body-xs text-text-muted mt-1">
              On your CV: <span className="text-text-secondary font-medium">"ITIL 4 Foundation (studying, exam pending — 2026)"</span>
            </p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-display-sm font-bold text-accent-violet">{progressPct}%</p>
            <p className="text-body-xs text-text-muted">{completedCount}/{totalLevels} levels</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-body-xs text-text-muted">Progress</span>
            <span className="text-body-xs text-accent-violet font-medium">{completedCount} of {totalLevels} complete</span>
          </div>
          <div className="h-2 bg-bg-tertiary rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-accent-violet to-accent-indigo rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 0.8, ease: easeOut, delay: 0.2 }}
            />
          </div>
          <div className="flex mt-1.5 gap-0.5">
            {ITIL_LEVELS.map((lvl) => {
              const s = levelStatus(lvl.level)
              return (
                <div
                  key={lvl.level}
                  className={`flex-1 h-1 rounded-full transition-colors ${
                    s === 'complete' ? 'bg-accent-emerald' : s === 'in_progress' ? 'bg-accent-violet' : 'bg-bg-tertiary'
                  }`}
                />
              )
            })}
          </div>
        </div>
      </motion.div>

      {/* ── Quick Stats ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Levels complete', value: completedCount, color: 'text-accent-emerald' },
          { label: 'In progress', value: progress.inProgressLevel ? 1 : 0, color: 'text-accent-violet' },
          { label: 'Remaining', value: totalLevels - completedCount - (progress.inProgressLevel ? 1 : 0), color: 'text-text-secondary' },
          { label: 'Target cert', value: 'L5', color: 'text-accent-amber' },
        ].map((stat) => (
          <div key={stat.label} className="rounded-card border border-border-subtle bg-bg-secondary p-4 text-center">
            <p className={`text-display-sm font-bold ${stat.color}`}>{stat.value}</p>
            <p className="text-body-xs text-text-muted mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* ── Level Cards ── */}
      <div className="space-y-3">
        {ITIL_LEVELS.map((lvl, idx) => {
          const status = levelStatus(lvl.level)
          const isExpanded = expandedLevels.has(lvl.level)
          const isLocked = status === 'locked'

          return (
            <motion.div
              key={lvl.level}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.04, duration: 0.3, ease: easeOut }}
              className={`rounded-card-lg border transition-all ${
                status === 'complete'
                  ? 'border-accent-emerald/30 bg-accent-emerald-muted/10'
                  : status === 'in_progress'
                  ? 'border-accent-violet/30 bg-accent-violet-muted/20'
                  : 'border-border-subtle bg-bg-secondary'
              }`}
            >
              {/* Card Header */}
              <button
                className="w-full flex items-center gap-4 p-5 text-left hover:bg-white/5 transition-colors rounded-card-lg"
                onClick={() => toggleExpand(lvl.level)}
              >
                {/* Level badge */}
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0 ${
                    status === 'complete'
                      ? 'bg-accent-emerald text-white'
                      : status === 'in_progress'
                      ? 'bg-accent-violet text-white'
                      : 'bg-bg-tertiary text-text-muted border border-border-default'
                  }`}
                >
                  {status === 'complete' ? <CheckCircle2 size={18} /> : isLocked ? <Lock size={14} /> : lvl.level}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-heading text-heading-md font-semibold text-text-primary">
                      Level {lvl.level}: {lvl.title}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-mono-xs font-medium ${typeColor[lvl.type]}`}>
                      {typeLabel[lvl.type]}
                    </span>
                    {status === 'in_progress' && (
                      <span className="px-2 py-0.5 rounded-full text-mono-xs font-medium bg-accent-violet text-white animate-pulse">
                        In progress
                      </span>
                    )}
                  </div>
                  <p className="text-body-sm text-text-secondary mt-0.5 truncate">{lvl.subtitle}</p>
                </div>

                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="hidden sm:flex items-center gap-1 text-body-xs text-text-muted">
                    <Clock size={12} />
                    {lvl.duration}
                  </span>
                  {isExpanded ? <ChevronUp size={16} className="text-text-muted" /> : <ChevronDown size={16} className="text-text-muted" />}
                </div>
              </button>

              {/* Expanded Content */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: easeOut }}
                    className="overflow-hidden"
                  >
                    <div className="px-5 pb-5 space-y-5 border-t border-border-subtle/50 pt-4">
                      {/* Description */}
                      <p className="text-body-sm text-text-secondary leading-relaxed">{lvl.description}</p>

                      {/* Exam info (certification levels) */}
                      {lvl.examInfo && (
                        <div className="flex items-start gap-3 p-3 rounded-lg bg-accent-amber-muted border border-accent-amber/20">
                          <Award size={16} className="text-accent-amber mt-0.5 flex-shrink-0" />
                          <p className="text-body-sm text-accent-amber font-medium">{lvl.examInfo}</p>
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {/* Key Topics */}
                        <div>
                          <h4 className="text-body-sm font-semibold text-text-primary mb-2 flex items-center gap-2">
                            <Target size={14} className="text-accent-indigo" />
                            Key Topics
                          </h4>
                          <ul className="space-y-1.5">
                            {lvl.keyTopics.map((topic) => (
                              <li key={topic} className="flex items-start gap-2 text-body-sm text-text-secondary">
                                <span className="w-1.5 h-1.5 rounded-full bg-accent-indigo mt-1.5 flex-shrink-0" />
                                {topic}
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Learning Links */}
                        <div>
                          <h4 className="text-body-sm font-semibold text-text-primary mb-2 flex items-center gap-2">
                            <PlayCircle size={14} className="text-accent-cyan" />
                            Learning Resources
                          </h4>
                          <div className="space-y-2">
                            {lvl.links.map((link) => (
                              <a
                                key={link.url}
                                href={link.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 p-2.5 rounded-lg bg-bg-tertiary hover:bg-bg-elevated border border-border-subtle hover:border-border-focus transition-all group"
                              >
                                <span className="text-sm flex-shrink-0">{linkIcon[link.type]}</span>
                                <span className="text-body-sm text-text-secondary group-hover:text-text-primary flex-1 truncate">
                                  {link.label}
                                </span>
                                <div className="flex items-center gap-1.5 flex-shrink-0">
                                  {link.free && (
                                    <span className="px-1.5 py-0.5 rounded text-mono-xs bg-accent-emerald-muted text-accent-emerald font-medium">
                                      FREE
                                    </span>
                                  )}
                                  <ExternalLink size={12} className="text-text-muted group-hover:text-accent-indigo transition-colors" />
                                </div>
                              </a>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Job Relevance */}
                      <div className="flex items-start gap-2 p-3 rounded-lg bg-bg-tertiary border border-border-subtle">
                        <Star size={14} className="text-accent-amber mt-0.5 flex-shrink-0" />
                        <p className="text-body-sm text-text-secondary">
                          <span className="font-medium text-text-primary">Job relevance: </span>
                          {lvl.jobRelevance}
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        {status !== 'complete' && (
                          <button
                            onClick={() => markComplete(lvl.level)}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-button bg-accent-emerald text-white text-body-sm font-medium hover:bg-accent-emerald/90 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-sm"
                          >
                            <CheckCircle2 size={14} />
                            Mark Complete
                          </button>
                        )}
                        {status !== 'in_progress' && status !== 'complete' && (
                          <button
                            onClick={() => markInProgress(lvl.level)}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-button border border-accent-violet text-accent-violet text-body-sm font-medium hover:bg-accent-violet-muted transition-all"
                          >
                            <PlayCircle size={14} />
                            Start This Level
                          </button>
                        )}
                        {status === 'complete' && (
                          <button
                            onClick={() => markIncomplete(lvl.level)}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-button border border-border-default text-text-muted text-body-sm hover:bg-bg-tertiary transition-all"
                          >
                            <Circle size={14} />
                            Mark Incomplete
                          </button>
                        )}
                        {status === 'in_progress' && (
                          <span className="flex items-center gap-1.5 px-3 py-2 text-body-sm text-accent-violet font-medium">
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-violet opacity-75" />
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-accent-violet" />
                            </span>
                            Currently studying
                          </span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )
        })}
      </div>

      {/* ── CV Note ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="rounded-card-lg border border-accent-indigo/20 bg-accent-indigo-muted/20 p-5"
      >
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-accent-indigo-muted flex items-center justify-center flex-shrink-0">
            <GraduationCap size={16} className="text-accent-indigo" />
          </div>
          <div>
            <h3 className="font-heading text-heading-md font-semibold text-text-primary mb-1">
              How to show this on your CV
            </h3>
            <p className="text-body-sm text-text-secondary leading-relaxed">
              Since you are actively studying but have not yet sat the exam, use one of these phrasings in your CV's skills or education section:
            </p>
            <div className="mt-3 space-y-2">
              {[
                'ITIL 4 Foundation — currently studying (exam pending, 2026)',
                'ITIL 4 Foundation (in progress — PeopleCert, 2026)',
                'IT Service Management: studying ITIL 4 Foundation syllabus',
              ].map((phrase) => (
                <div key={phrase} className="flex items-center gap-2 p-2.5 rounded-lg bg-bg-secondary border border-border-subtle">
                  <span className="text-accent-emerald text-sm flex-shrink-0">✓</span>
                  <code className="text-body-sm text-text-primary">{phrase}</code>
                </div>
              ))}
            </div>
            <p className="text-body-xs text-text-muted mt-3">
              Do not write "ITIL 4 Foundation certified" until you have passed the exam and received your PeopleCert certificate.
            </p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
