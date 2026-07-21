import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FileText,
  Link,
  Search,
  Wand2,
  FileText as FileTextIcon,
  Bookmark,
  ClipboardList,
  Sparkles,
  Info,
  AlertTriangle,
  Code,
  Award,
  Check,
} from 'lucide-react'
import { analyzeManualJob, createManualJob, type ManualJobInput } from '@/lib/api'
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

// ─── Animated Score Ring ───────────────────────────────────────────────

function ScoreRing({ score, size = 100, strokeWidth = 6 }: {
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
    <div className="score-ring relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
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
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className={`font-heading font-bold text-4xl ${getScoreColorClass(score)}`}
        >
          {score}
        </motion.span>
        <span className={`text-[10px] font-medium mt-0.5 ${getScoreColorClass(score)}`}>
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
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs text-text-secondary">{label}</span>
        <span className="font-mono text-[10px] font-medium" style={{ color }}>{score}</span>
      </div>
      <div className="h-1.5 bg-bg-tertiary rounded-full overflow-hidden">
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

// ─── Grounded analysis presentation ───────────────────────────────────

function analysisFromJob(job: Job) {
  const analysis = job.match_analysis
  const matchedSkills = analysis?.matched_skills || []
  const missingSkills = analysis?.missing_skills || []
  const score = job.match_score || analysis?.overall_score || 0
  const explanation = analysis?.explanation || 'JobPilot could not produce a detailed explanation for this listing.'

  return {
    score,
    matchedSkills,
    missingSkills,
    job,
    explanation,
    scoreBreakdown: [
      { label: 'Overall Match', score: analysis?.overall_score || score },
      { label: 'Skill Match', score: analysis?.skill_match_score || 0 },
      { label: 'Experience Match', score: analysis?.experience_match_score || 0 },
      { label: 'Location Match', score: analysis?.location_match_score || 0 },
      { label: 'Salary Match', score: analysis?.salary_match_score || 0 },
    ],
  }
}

// ─── Main Component ────────────────────────────────────────────────────

export default function ManualJob() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<'text' | 'url'>('text')
  const [jobText, setJobText] = useState('')
  const [jobUrl, setJobUrl] = useState('')
  const [optionalTitle, setOptionalTitle] = useState('')
  const [optionalCompany, setOptionalCompany] = useState('')
  const [optionalSource, setOptionalSource] = useState('Other')
  const [analysing, setAnalysing] = useState(false)
  const [analysisStep, setAnalysisStep] = useState(0)
  const [analysisResult, setAnalysisResult] = useState<ReturnType<typeof analysisFromJob> | null>(null)
  const [savedJob, setSavedJob] = useState<Job | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const MAX_CHARS = 10000
  const hasListing = activeTab === 'text' ? jobText.trim().length >= 100 : /^https?:\/\//i.test(jobUrl.trim())
  const canAnalyse = optionalTitle.trim().length >= 2 && hasListing

  const analysisSteps = activeTab === 'url'
    ? ['Extracting job details...', 'Analysing requirements...', 'Matching with your profile...', 'Calculating score...']
    : ['Analysing requirements...', 'Matching with your profile...', 'Calculating score...', 'Generating recommendations...']

  const buildPayload = (): ManualJobInput => ({
    title: optionalTitle.trim(),
    company: optionalCompany.trim(),
    description: activeTab === 'text' ? jobText.trim() : '',
    source: optionalSource,
    source_url: activeTab === 'url' ? jobUrl.trim() : '',
  })

  const handleAnalyse = async () => {
    if (!canAnalyse) return
    setError('')
    setAnalysing(true)
    setAnalysisStep(0)
    setAnalysisResult(null)

    let step = 0
    const interval = window.setInterval(() => {
      step = Math.min(step + 1, analysisSteps.length - 1)
      setAnalysisStep(step)
    }, 900)
    try {
      const job = await analyzeManualJob(buildPayload())
      setAnalysisResult(analysisFromJob(job))
      setSavedJob(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'JobPilot could not analyse this listing. Please try again.')
    } finally {
      window.clearInterval(interval)
      setAnalysing(false)
    }
  }

  const handleSaveToJobs = async (nextAction: 'stay' | 'cv' | 'cl' | 'open' = 'stay') => {
    if (!analysisResult || saving) return
    setSaving(true)
    setError('')
    try {
      const job = savedJob || await createManualJob(buildPayload())
      setSavedJob(job)
      if (nextAction === 'cv' || nextAction === 'cl') navigate(`/jobs/${job.id}?action=${nextAction}`)
      if (nextAction === 'open') navigate(`/jobs/${job.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'JobPilot could not save this job. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleFillSample = () => {
    setOptionalTitle('Junior Software Developer')
    setOptionalCompany('BrightApps Ltd')
    setOptionalSource('Sample listing')
    setJobText(`Junior Software Developer

BrightApps Ltd - London (Hybrid)
£30,000 - £38,000 per year

About the Role:
We are looking for a Junior Software Developer to join our friendly engineering team. This is a great first or second role for an early-career developer who wants to learn quickly and grow into a full-stack engineer.

Key Responsibilities:
• Build and maintain features across our web applications
• Write clean, well-tested code with guidance from senior engineers
• Take part in code reviews and agile ceremonies
• Help fix bugs and improve existing functionality

Requirements:
• Solid fundamentals in Java or JavaScript
• Familiarity with React and/or Spring Boot
• Understanding of REST APIs and SQL databases
• Comfortable using Git
• Degree in Computer Science or equivalent practical experience
• 0-2 years experience (recent graduates welcome)

Nice to have:
• Exposure to AWS or Docker
• TypeScript experience
• Personal projects or a portfolio on GitHub

Benefits:
• Supportive, mentorship-focused team
• Hybrid working (2 days in the London office)
• Annual learning and certification budget
• 25 days holiday plus bank holidays
• Private health insurance`)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
      className="max-w-[720px] mx-auto space-y-6"
    >
      {/* Header */}
      <div className="text-center">
        <h1 className="font-heading text-2xl font-semibold text-text-primary">Add a Job</h1>
        <p className="text-sm text-text-muted mt-1">Paste a job description or URL to analyse and score it against your profile</p>
      </div>

      {/* Tabs */}
      <div className="flex justify-center">
        <div className="inline-flex p-1 rounded-full bg-bg-tertiary border border-border-subtle">
          <button
            onClick={() => setActiveTab('text')}
            className={`relative px-6 py-2.5 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${
              activeTab === 'text' ? 'text-accent-indigo' : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            {activeTab === 'text' && (
              <motion.div
                layoutId="manualJobTab"
                className="absolute inset-0 bg-accent-indigo-muted rounded-full"
                transition={{ type: 'spring', duration: 0.4 }}
              />
            )}
            <span className="relative flex items-center gap-2">
              <FileText size={16} />
              Paste Description
            </span>
          </button>
          <button
            onClick={() => setActiveTab('url')}
            className={`relative px-6 py-2.5 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${
              activeTab === 'url' ? 'text-accent-indigo' : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            {activeTab === 'url' && (
              <motion.div
                layoutId="manualJobTab"
                className="absolute inset-0 bg-accent-indigo-muted rounded-full"
                transition={{ type: 'spring', duration: 0.4 }}
              />
            )}
            <span className="relative flex items-center gap-2">
              <Link size={16} />
              Paste URL
            </span>
          </button>
        </div>
      </div>

      {/* Input Area */}
      <div className="space-y-4">
        <AnimatePresence mode="wait">
          {activeTab === 'text' ? (
            <motion.div
              key="text-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <label className="block text-sm font-medium text-text-primary mb-2">
                Paste the full job description here
              </label>
              <div className="relative">
                <textarea
                  value={jobText}
                  onChange={(e) => setJobText(e.target.value.slice(0, MAX_CHARS))}
                  placeholder="Paste job title, company, requirements, description, salary, location... The more detail you provide, the better the analysis."
                  className="w-full min-h-[320px] max-h-[600px] p-4 rounded-input bg-bg-tertiary border border-border-default text-sm text-text-primary placeholder:text-text-muted focus:border-accent-indigo focus:outline-none focus:ring-2 focus:ring-accent-indigo/15 resize-y leading-relaxed transition-all"
                />
                <div className="absolute bottom-3 right-3 text-xs text-text-muted font-mono">
                  {jobText.length.toLocaleString()} / {MAX_CHARS.toLocaleString()}
                </div>
              </div>
              {jobText.length === 0 && (
                <button
                  onClick={handleFillSample}
                  className="mt-2 text-xs text-accent-indigo hover:text-accent-indigo-hover transition-colors"
                >
                  Try with a sample job description
                </button>
              )}

              {/* Tip Banner */}
              <div className="mt-4 p-3 rounded-lg bg-accent-indigo-muted/20 border border-accent-indigo/10 flex items-start gap-2.5">
                <Info size={16} className="text-accent-indigo mt-0.5 flex-shrink-0" />
                <p className="text-xs text-text-secondary leading-relaxed">
                  Include the full job description for the most accurate scoring. At minimum, include required skills and experience level.
                </p>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="url-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <label className="block text-sm font-medium text-text-primary mb-2">
                Paste the job posting URL
              </label>
              <div className="relative">
                <Link size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  type="url"
                  value={jobUrl}
                  onChange={(e) => setJobUrl(e.target.value)}
                  placeholder="https://www.linkedin.com/jobs/view/..."
                  className="w-full h-12 pl-11 pr-4 rounded-input bg-bg-tertiary border border-border-default text-sm text-text-primary placeholder:text-text-muted focus:border-accent-indigo focus:outline-none focus:ring-2 focus:ring-accent-indigo/15 transition-all"
                />
              </div>

              {/* Info Banner */}
              <div className="mt-4 p-3 rounded-lg bg-accent-amber-muted/20 border border-accent-amber/10 flex items-start gap-2.5">
                <AlertTriangle size={16} className="text-accent-amber mt-0.5 flex-shrink-0" />
                <p className="text-xs text-text-secondary leading-relaxed">
                  URL analysis extracts the job description from the page. Some sites may block this. If extraction fails, switch to &apos;Paste Text&apos; and copy the description manually.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Listing details */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">Job Title <span className="text-accent-rose">*</span></label>
            <input
              type="text"
              value={optionalTitle}
              onChange={(e) => setOptionalTitle(e.target.value)}
              placeholder="e.g., Junior Java Developer"
              className="w-full h-10 px-3 rounded-input bg-bg-tertiary border border-border-default text-sm text-text-primary placeholder:text-text-muted focus:border-accent-indigo focus:outline-none focus:ring-2 focus:ring-accent-indigo/15 transition-all"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">Company (optional)</label>
            <input
              type="text"
              value={optionalCompany}
              onChange={(e) => setOptionalCompany(e.target.value)}
              placeholder="e.g., TechCorp Ltd"
              className="w-full h-10 px-3 rounded-input bg-bg-tertiary border border-border-default text-sm text-text-primary placeholder:text-text-muted focus:border-accent-indigo focus:outline-none focus:ring-2 focus:ring-accent-indigo/15 transition-all"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">Source (optional)</label>
            <select
              value={optionalSource}
              onChange={(e) => setOptionalSource(e.target.value)}
              className="w-full h-10 px-3 rounded-input bg-bg-tertiary border border-border-default text-sm text-text-primary focus:border-accent-indigo focus:outline-none focus:ring-2 focus:ring-accent-indigo/15 transition-all appearance-none cursor-pointer"
            >
              <option>LinkedIn</option>
              <option>Indeed</option>
              <option>Reed</option>
              <option>Company Website</option>
              <option>Other</option>
            </select>
          </div>
        </div>
      </div>

      {/* Analyse Button */}
      <motion.button
        whileHover={canAnalyse ? { scale: 1.01 } : {}}
        whileTap={canAnalyse ? { scale: 0.99 } : {}}
        onClick={handleAnalyse}
        disabled={!canAnalyse || analysing}
        className={`w-full h-12 rounded-button text-sm font-medium flex items-center justify-center gap-2 transition-all ${
          canAnalyse && !analysing
            ? 'bg-accent-indigo text-white hover:bg-accent-indigo-hover shadow-lg shadow-accent-indigo/20'
            : 'bg-bg-tertiary text-text-muted cursor-not-allowed'
        }`}
      >
        {analysing ? (
          <>
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Analysing...
          </>
        ) : (
          <>
            <Search size={16} />
            Analyse with JobPilot AI
          </>
        )}
      </motion.button>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="text-sm text-accent-rose text-center"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>

      {/* Analysis Progress Steps */}
      <AnimatePresence>
        {analysing && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-3"
          >
            {analysisSteps.map((step, i) => (
              <motion.div
                key={step}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="flex items-center gap-3"
              >
                <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                  i < analysisStep ? 'bg-accent-emerald' : i === analysisStep ? 'bg-accent-indigo' : 'bg-bg-tertiary border border-border-default'
                }`}>
                  {i < analysisStep ? (
                    <Check size={12} className="text-white" />
                  ) : i === analysisStep ? (
                    <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                  ) : null}
                </div>
                <span className={`text-sm ${
                  i < analysisStep ? 'text-accent-emerald' : i === analysisStep ? 'text-text-primary' : 'text-text-muted'
                }`}>
                  {step}
                </span>
                {i === analysisStep && (
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: 40 }}
                    transition={{ duration: 0.8, repeat: Infinity }}
                    className="h-1 bg-accent-indigo rounded-full"
                  />
                )}
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Analysis Results */}
      <AnimatePresence>
        {analysisResult && !analysing && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
            className="space-y-5"
          >
            {/* Divider */}
            <div className="flex items-center gap-4">
              <div className="flex-1 h-px bg-border-subtle" />
              <span className="text-xs text-text-muted font-medium">Analysis Results</span>
              <div className="flex-1 h-px bg-border-subtle" />
            </div>

            {/* Score Hero */}
            <div className="flex flex-col items-center text-center py-4">
              <ScoreRing score={analysisResult.score} size={100} strokeWidth={6} />
              <motion.h2
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="font-heading text-xl font-semibold text-text-primary mt-4"
              >
                {analysisResult.job.title}
              </motion.h2>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-sm text-text-secondary mt-1"
              >
                {analysisResult.job.company}
              </motion.p>
            </div>

            {/* Score Breakdown */}
            <div className="rounded-card bg-bg-secondary border border-border-subtle p-5">
              <div className="flex items-center gap-2 mb-4">
                <Award size={16} className="text-accent-indigo" />
                <h3 className="font-heading text-sm font-semibold text-text-primary">Score Breakdown</h3>
              </div>
              <div className="space-y-3">
                {analysisResult.scoreBreakdown.map((item, i) => (
                  <ScoreBreakdownBar key={item.label} label={item.label} score={item.score} index={i} />
                ))}
              </div>
            </div>

            {/* Match Explanation */}
            <div className="rounded-card bg-bg-secondary border border-border-subtle p-5">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles size={16} className="text-accent-indigo" />
                <h3 className="font-heading text-sm font-semibold text-text-primary">Why This Job Matches You</h3>
              </div>
              <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-wrap">
                {analysisResult.explanation.replace(/\*\*/g, '')}
              </p>
            </div>

            {/* Skills Analysis */}
            <div className="rounded-card bg-bg-secondary border border-border-subtle p-5">
              <div className="flex items-center gap-2 mb-4">
                <Code size={16} className="text-accent-indigo" />
                <h3 className="font-heading text-sm font-semibold text-text-primary">Skills Analysis</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <h4 className="text-xs font-medium text-accent-emerald mb-2">Matching Skills</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {analysisResult.matchedSkills.map(skill => (
                      <span key={skill} className="px-2.5 py-1 rounded-full bg-accent-emerald-muted text-accent-emerald text-xs font-medium">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="text-xs font-medium text-accent-rose mb-2">Missing Skills</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {analysisResult.missingSkills.map(skill => (
                      <span key={skill} className="px-2.5 py-1 rounded-full bg-accent-rose-muted text-accent-rose text-xs font-medium">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex flex-wrap items-center justify-center gap-3 py-4"
            >
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleSaveToJobs('cv')}
                disabled={saving}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-button bg-accent-indigo text-white text-sm font-medium hover:bg-accent-indigo-hover transition-all shadow-lg shadow-accent-indigo/20"
              >
                <Wand2 size={15} />
                Generate Tailored CV
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleSaveToJobs('cl')}
                disabled={saving}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-button border border-border-default text-text-secondary hover:bg-bg-tertiary hover:text-text-primary text-sm font-medium transition-all"
              >
                <FileTextIcon size={15} />
                Generate Cover Letter
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleSaveToJobs('stay')}
                disabled={saving}
                className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-button text-sm font-medium transition-all ${
                  savedJob
                    ? 'bg-accent-emerald/20 text-accent-emerald border border-accent-emerald/30'
                    : 'border border-border-default text-text-secondary hover:bg-bg-tertiary hover:text-text-primary'
                }`}
              >
                <Bookmark size={15} />
                {saving ? 'Saving…' : savedJob ? 'Saved!' : 'Save to My Jobs'}
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleSaveToJobs('open')}
                disabled={saving}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-button border border-border-default text-text-secondary hover:bg-bg-tertiary hover:text-text-primary text-sm font-medium transition-all"
              >
                <ClipboardList size={15} />
                Open Job Workspace
              </motion.button>
            </motion.div>

            {/* Similar Jobs */}
            {savedJob && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center"
              >
                <p className="text-xs text-accent-emerald mb-4">Job saved to your list!</p>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
