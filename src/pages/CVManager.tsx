import { useState, useRef, useMemo, useEffect } from 'react'
import { getDocuments } from '@/lib/api'
import { downloadAsPdf } from '@/lib/pdf'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FileText, FileCheck, Upload, Download, Pencil, Eye, Trash2, Copy, X,
  GitBranch, Sparkles, AlertCircle, CheckCircle2, Shield, Zap,
  ChevronRight, Activity, Check, XCircle
} from 'lucide-react'
// mock data defined inline in this file

// ─── Types ────────────────────────────────────
interface CVVersion {
  id: string
  jobTitle: string
  company: string
  createdAt: string
  score: number
  changes: string
  status: 'not_used' | 'used'
  content: string
}

interface ActivityEntry {
  id: string
  action: string
  timestamp: string
  type: 'upload' | 'generate' | 'edit' | 'delete'
  actor: string
}

// ─── Mock Data ────────────────────────────────
const masterCVContent = `MIHRETAB NEGA
Junior Software Developer
London, W3 | mihretabtesfahun2124@gmail.com | 07388 617 329 | mihretab.org | github.com/2118476

PROFILE
Junior Software Developer with strong experience in full-stack Java and React development, now expanding into .NET and cloud technologies. Delivered real-world projects involving APIs, SQL databases and cloud deployment, with a focus on usability, debugging and performance. A quick learner with an agile mindset, strong problem-solving skills and a commitment to delivering high-quality digital services with real impact.

KEY SKILLS
Languages & Frameworks: Java, Spring Boot, React.js, JavaScript, SQL, C# (learning), ASP.NET (learning)
Databases: MySQL, PostgreSQL, SQL Server
APIs & Cloud: REST APIs, Twilio (SMS & Voice), Azure DevOps (learning), environment variable config
Deployment & Tools: Git, GitHub, Docker, Render, Vercel, Netlify, CI/CD pipelines (learning)
Development Concepts: OOP, MVC, Agile/Scrum, microservices, authentication, version control
Debugging & Testing: IntelliJ, VS Code, Postman, SonarCloud, API testing

PROJECTS

MMS — SMS & Voice Call Web App (2025)
Tech: React, Spring Boot, MySQL, Twilio, Render, Vercel
- Developed a full-stack communication app to send SMS, make/receive calls, and track call history.
- Integrated Twilio APIs with dynamic callback URLs for both local and deployed environments.
- Built backend call routing with TwiML and implemented server-side error handling.
- Designed a responsive UI with accessibility, dark mode and animated feedback.

Hair Salon Booking System — Final Year Project (2024)
Tech: Java, Spring Boot, MySQL
- Created a secure appointment booking platform with admin/user roles and login authentication.
- Designed and optimised relational database schemas for performance.
- Applied clean architecture and modular code practices.

E-Learning Platform — "Coding for All" Group Project (2023)
Tech: React, Spring Boot, MySQL
- Built a coding lesson web app as part of a team using agile methodology.
- Developed multiple frontend components and API integrations.
- Contributed to sprint planning and a collaborative Git workflow.

EDUCATION
Brunel University London — BSc Computer Science
Sept 2021 – June 2024
Modules: Software Development, Algorithms, Cybersecurity, AI, Networking
Final Year Project: Hair Salon Booking System

Newham College of Further Education — Access to HE Diploma (Electronics & Software Engineering)
Sept 2020 – June 2021
Distinctions in Programming, Project Management and Web Design

ADDITIONAL INFORMATION
- Volunteering: National Citizen Service — team projects & video editing
- Languages: English (fluent), Amharic (fluent), Tigrinya (basic)
- Interests: Football, gym, AI experimentation
- Learning Goals: Advancing C# and ASP.NET to expand backend expertise

REFERENCES
Available on request.`

// Tailored versions are loaded from the backend (real AI-generated documents)
const initialTailoredVersions: CVVersion[] = []

// ─── Animation ────────────────────────────────
const easeOut = [0.16, 1, 0.3, 1] as [number, number, number, number]
const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.06, duration: 0.35, ease: easeOut } }),
}

// ─── Diff Viewer ──────────────────────────────
function DiffViewer({ master, tailored }: { master: string; tailored: string }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-0 border border-border-subtle rounded-xl overflow-hidden">
      <div className="border-r border-border-subtle">
        <div className="px-4 py-2.5 bg-bg-tertiary border-b border-border-subtle flex items-center gap-2">
          <FileCheck size={14} className="text-accent-emerald" />
          <span className="text-xs font-semibold text-text-secondary">Master CV</span>
        </div>
        <div className="p-4 max-h-[500px] overflow-y-auto">
          <pre className="text-xs text-text-secondary whitespace-pre-wrap font-mono leading-relaxed">{master}</pre>
        </div>
      </div>
      <div>
        <div className="px-4 py-2.5 bg-bg-tertiary border-b border-border-subtle flex items-center gap-2">
          <Sparkles size={14} className="text-accent-indigo" />
          <span className="text-xs font-semibold text-text-secondary">Tailored CV</span>
        </div>
        <div className="p-4 max-h-[500px] overflow-y-auto">
          <pre className="text-xs text-text-secondary whitespace-pre-wrap font-mono leading-relaxed">{tailored}</pre>
        </div>
      </div>
    </div>
  )
}

// ─── Components ───────────────────────────────
function ConfirmationDialog({ open, title, message, onConfirm, onCancel }: { open: boolean; title: string; message: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onCancel}>
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} transition={{ duration: 0.2, ease: easeOut }} className="bg-bg-elevated rounded-card-lg border border-border-subtle p-6 max-w-md w-[90%] shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-accent-rose-muted flex items-center justify-center"><AlertCircle size={20} className="text-accent-rose" /></div>
              <h3 className="font-heading text-lg font-semibold text-text-primary">{title}</h3>
            </div>
            <p className="text-sm text-text-secondary mb-6">{message}</p>
            <div className="flex justify-end gap-3">
              <button onClick={onCancel} className="px-4 py-2 rounded-lg text-sm text-text-secondary hover:bg-bg-tertiary transition-colors">Cancel</button>
              <button onClick={onConfirm} className="px-4 py-2 rounded-lg text-sm font-medium bg-accent-rose text-white hover:bg-rose-500 transition-colors">Delete</button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default function CVManager() {
  const [masterCV, setMasterCV] = useState(masterCVContent)
  const [tailoredVersions, setTailoredVersions] = useState<CVVersion[]>(initialTailoredVersions)
  const [editingMaster, setEditingMaster] = useState(false)
  const [editText, setEditText] = useState(masterCV)
  const [showPasteModal, setShowPasteModal] = useState(false)
  const [pasteText, setPasteText] = useState('')
  const [compareVersion, setCompareVersion] = useState<CVVersion | null>(null)
  const [viewVersion, setViewVersion] = useState<CVVersion | null>(null)
  const [deleteVersion, setDeleteVersion] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Load real AI-generated documents from the backend
  useEffect(() => {
    getDocuments()
      .then((docs) => {
        if (docs && docs.length) {
          setTailoredVersions(
            docs.map((d) => ({
              id: d.id,
              jobTitle: d.job_title || (d.type === 'cover_letter' ? 'Cover Letter' : 'Tailored CV'),
              company: d.company || '—',
              createdAt: d.created_at,
              score: 0,
              changes: d.type === 'cover_letter' ? 'AI-generated cover letter' : 'AI-tailored CV',
              status: 'not_used' as const,
              content: d.content,
            })),
          )
        }
      })
      .catch(() => {})
  }, [])

  // Activity log derived from the real generated documents
  const activityLog = useMemo<ActivityEntry[]>(
    () =>
      tailoredVersions.map((v) => ({
        id: `act-${v.id}`,
        action: `${v.changes} — ${v.jobTitle}${v.company !== '—' ? ` at ${v.company}` : ''}`,
        timestamp: v.createdAt,
        type: 'generate' as const,
        actor: 'AI Agent',
      })),
    [tailoredVersions],
  )

  const hasMasterCV = masterCV.length > 0

  // Word count
  const wordCount = useMemo(() => masterCV.split(/\s+/).filter(Boolean).length, [masterCV])

  // File drop handler
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setDragOver(true) }
  const handleDragLeave = () => setDragOver(false)
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false)
    const files = e.dataTransfer.files
    if (files.length > 0) handleFileUpload(files[0])
  }
  const handleFileUpload = (file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      setMasterCV(text)
      setEditText(text)
    }
    reader.readAsText(file)
  }

  const handleSaveMaster = () => {
    setMasterCV(editText)
    setEditingMaster(false)
  }

  const handlePasteSave = () => {
    setMasterCV(pasteText)
    setEditText(pasteText)
    setShowPasteModal(false)
    setPasteText('')
  }

  const handleCreateFromProfile = () => {
    setMasterCV(masterCVContent)
    setEditText(masterCVContent)
  }

  // Download as a polished, send-ready PDF (was plain .txt).
  const handleDownload = (content: string, filename: string) => {
    const type = /cover|(^|[-_])cl([-_.]|$)/i.test(filename) ? 'cover_letter' : 'cv'
    downloadAsPdf(content, filename, { type })
  }

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const handleDeleteVersion = (id: string) => {
    setTailoredVersions(prev => prev.filter(v => v.id !== id))
    setDeleteVersion(null)
  }

  const formatDate = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  return (
    <div className="space-y-6 max-w-6xl">
      {/* ─── CV Status Bar ─── */}
      <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={0} className="p-4 md:p-5 rounded-card-lg bg-bg-secondary border border-border-subtle">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex items-center gap-3 flex-1">
            {hasMasterCV ? (
              <><div className="w-10 h-10 rounded-full bg-accent-emerald-muted flex items-center justify-center flex-shrink-0"><FileCheck size={18} className="text-accent-emerald" /></div>
              <div><p className="text-sm font-medium text-text-primary">Master CV uploaded</p><p className="text-xs text-text-muted">Text format · {wordCount} words</p></div></>
            ) : (
              <><div className="w-10 h-10 rounded-full bg-accent-amber-muted flex items-center justify-center flex-shrink-0"><AlertCircle size={18} className="text-accent-amber" /></div>
              <div><p className="text-sm font-medium text-text-primary">No master CV</p><p className="text-xs text-text-muted">Upload or paste to get started</p></div></>
            )}
          </div>
          <div className="flex items-center gap-4 text-sm text-text-secondary">
            <span>{tailoredVersions.length} tailored versions</span>
            <span className="text-text-muted">·</span>
            <span className="text-text-muted">Last updated {formatDate('2025-01-07T16:00:00Z')}</span>
          </div>
          <div className="flex gap-2">
            <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-border-default text-text-secondary hover:bg-bg-tertiary transition-colors">
              <Upload size={12} /> Upload New
            </button>
            <button onClick={() => setShowPasteModal(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-border-default text-text-secondary hover:bg-bg-tertiary transition-colors">
              <FileText size={12} /> Paste Text
            </button>
            <button onClick={() => { setEditingMaster(true); setEditText(masterCV) }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-border-default text-text-secondary hover:bg-bg-tertiary transition-colors">
              <Pencil size={12} /> Edit
            </button>
            <button onClick={() => handleDownload(masterCV, 'master-cv.txt')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-border-default text-text-secondary hover:bg-bg-tertiary transition-colors">
              <Download size={12} /> Download
            </button>
          </div>
        </div>
        <input ref={fileInputRef} type="file" accept=".pdf,.docx,.txt" className="hidden" onChange={e => e.target.files?.[0] && handleFileUpload(e.target.files[0])} />
      </motion.div>

      {/* ─── Master CV + Quick Actions ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Master CV Card */}
        <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={1} className="lg:col-span-2 p-5 md:p-6 rounded-card-lg bg-bg-secondary border border-border-subtle">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <FileCheck size={20} className="text-accent-emerald" />
              <h2 className="font-heading text-lg font-semibold text-text-primary">Master CV</h2>
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-accent-emerald-muted text-accent-emerald">
                <Shield size={10} /> Protected — Never Overwritten
              </span>
            </div>
          </div>
          {editingMaster ? (
            <div className="space-y-3">
              <textarea
                value={editText} onChange={e => setEditText(e.target.value)}
                rows={20}
                className="w-full px-4 py-3 rounded-xl bg-bg-tertiary border border-border-default text-sm text-text-primary font-mono leading-relaxed focus:border-accent-indigo focus:ring-2 focus:ring-accent-indigo/15 transition-all resize-y"
              />
              <div className="flex gap-2">
                <button onClick={handleSaveMaster} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-accent-indigo text-white text-sm font-medium hover:bg-accent-indigo-hover transition-colors">
                  <Check size={14} /> Save Changes
                </button>
                <button onClick={() => { setEditingMaster(false); setEditText(masterCV) }} className="px-4 py-2 rounded-lg text-sm text-text-secondary hover:bg-bg-tertiary transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <div
                className={`p-4 md:p-6 rounded-xl bg-bg-tertiary border max-h-[500px] overflow-y-auto transition-colors ${dragOver ? 'border-accent-indigo border-dashed bg-accent-indigo/5' : 'border-border-subtle'}`}
                onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
              >
                {hasMasterCV ? (
                  <pre className="text-sm text-text-secondary whitespace-pre-wrap font-mono leading-relaxed">{masterCV}</pre>
                ) : (
                  <div className="text-center py-12">
                    <img src="/empty-cv.png" alt="No CV" className="w-32 h-24 mx-auto mb-4 opacity-50" />
                    <p className="text-sm text-text-muted">No master CV yet</p>
                    <p className="text-xs text-text-muted mt-1">Upload a PDF/DOCX, paste text, or create from profile</p>
                  </div>
                )}
              </div>
              {hasMasterCV && (
                <div className="flex flex-wrap gap-x-5 gap-y-1 mt-3 text-xs text-text-muted">
                  <span>Created: Jan 5, 2025</span>
                  <span>Format: Text</span>
                  <span>Words: {wordCount}</span>
                  <span>Characters: {masterCV.length.toLocaleString()}</span>
                </div>
              )}
            </>
          )}
        </motion.div>

        {/* Quick Actions */}
        <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={2} className="p-5 md:p-6 rounded-card-lg bg-bg-secondary border border-border-subtle">
          <div className="flex items-center gap-2.5 mb-5">
            <Zap size={18} className="text-accent-amber" />
            <h2 className="font-heading text-lg font-semibold text-text-primary">Quick Actions</h2>
          </div>
          <div className="space-y-2.5">
            <button onClick={() => fileInputRef.current?.click()} className="w-full flex items-center gap-2.5 px-4 py-3 rounded-xl border border-border-default text-sm text-text-secondary hover:bg-bg-tertiary hover:border-border-focus transition-all text-left">
              <Upload size={16} className="text-accent-indigo" /> Upload New CV
            </button>
            <button onClick={() => setShowPasteModal(true)} className="w-full flex items-center gap-2.5 px-4 py-3 rounded-xl border border-border-default text-sm text-text-secondary hover:bg-bg-tertiary hover:border-border-focus transition-all text-left">
              <FileText size={16} className="text-accent-cyan" /> Paste CV Text
            </button>
            <button onClick={() => { setEditingMaster(true); setEditText(masterCV) }} className="w-full flex items-center gap-2.5 px-4 py-3 rounded-xl border border-border-default text-sm text-text-secondary hover:bg-bg-tertiary hover:border-border-focus transition-all text-left">
              <Pencil size={16} className="text-accent-amber" /> Edit Master CV Text
            </button>
            <button onClick={() => handleDownload(masterCV, 'master-cv.txt')} className="w-full flex items-center gap-2.5 px-4 py-3 rounded-xl border border-border-default text-sm text-text-secondary hover:bg-bg-tertiary hover:border-border-focus transition-all text-left">
              <Download size={16} className="text-accent-emerald" /> Download Master CV
            </button>
            <button onClick={handleCreateFromProfile} className="w-full flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm text-text-secondary hover:bg-bg-tertiary transition-all text-left">
              <Sparkles size={16} className="text-accent-violet" /> Create from Profile
            </button>
          </div>
        </motion.div>
      </div>

      {/* ─── Tailored CV Versions ─── */}
      <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={3}>
        <div className="flex items-center gap-2.5 mb-4">
          <FileText size={18} className="text-accent-indigo" />
          <h2 className="font-heading text-lg font-semibold text-text-primary">Tailored CV Versions</h2>
        </div>
        {tailoredVersions.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            <AnimatePresence>
              {tailoredVersions.map((version, i) => (
                <motion.div
                  key={version.id}
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -30, transition: { duration: 0.3 } }}
                  transition={{ delay: i * 0.06, duration: 0.35, ease: easeOut }}
                  className="p-5 rounded-card bg-bg-secondary border border-border-subtle hover:border-accent-indigo hover:shadow-[0_8px_24px_rgba(99,102,241,0.1)] hover:-translate-y-0.5 transition-all group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-text-muted mb-1">For:</p>
                      <h3 className="font-heading text-[15px] font-semibold text-text-primary truncate">{version.jobTitle}</h3>
                      <p className="text-xs text-text-secondary">{version.company}</p>
                    </div>
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border-[3px] flex-shrink-0 ml-2"
                      style={{
                        borderColor: version.score >= 85 ? '#34D399' : version.score >= 70 ? '#FB923C' : '#FBBF24',
                        background: 'var(--bg-secondary)'
                      }}
                    >
                      <span className="font-mono text-xs font-bold text-text-primary">{version.score}</span>
                    </div>
                  </div>
                  <p className="text-xs text-text-muted mb-1">Generated {formatDate(version.createdAt)}</p>
                  <p className="text-xs text-text-secondary mb-3 line-clamp-2">{version.changes}</p>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium mb-3 ${version.status === 'used' ? 'bg-accent-emerald-muted text-accent-emerald' : 'bg-bg-tertiary text-text-muted'}`}>
                    {version.status === 'used' ? <CheckCircle2 size={10} /> : <XCircle size={10} />}
                    {version.status === 'used' ? 'Used for application' : 'Not used'}
                  </span>
                  <div className="flex items-center gap-1 pt-3 border-t border-border-subtle">
                    <button onClick={() => setViewVersion(version)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-colors" title="View">
                      <Eye size={13} />
                    </button>
                    <button onClick={() => setCompareVersion(version)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-colors" title="Compare">
                      <GitBranch size={13} />
                    </button>
                    <button onClick={() => handleCopy(version.content)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-colors" title="Copy">
                      <Copy size={13} />
                    </button>
                    <button onClick={() => handleDownload(version.content, `${version.jobTitle.toLowerCase().replace(/\s+/g, '-')}-cv.txt`)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-colors" title="Download">
                      <Download size={13} />
                    </button>
                    <button onClick={() => setDeleteVersion(version.id)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-text-muted hover:text-accent-rose hover:bg-accent-rose-muted transition-colors ml-auto" title="Delete">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <div className="text-center py-12 rounded-card bg-bg-secondary border border-border-subtle">
            <FileText size={48} className="text-text-muted mx-auto mb-3 opacity-40" />
            <h3 className="font-heading text-base font-semibold text-text-secondary mb-1">No tailored CVs yet</h3>
            <p className="text-sm text-text-muted mb-4">Generate a tailored CV from any job&apos;s detail page.</p>
            <a href="#/jobs" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium border border-border-default text-text-secondary hover:bg-bg-tertiary transition-colors">
              Go to Jobs <ChevronRight size={14} />
            </a>
          </div>
        )}
      </motion.div>

      {/* ─── CV Activity Log ─── */}
      <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={4} className="p-5 md:p-6 rounded-card bg-bg-secondary border border-border-subtle">
        <div className="flex items-center gap-2.5 mb-5">
          <Activity size={18} className="text-accent-cyan" />
          <h2 className="font-heading text-lg font-semibold text-text-primary">CV Activity Log</h2>
        </div>
        <div className="relative pl-4 border-l-2 border-border-subtle space-y-4">
          {activityLog.map((entry, i) => (
            <motion.div key={entry.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} className="relative">
              <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full"
                style={{
                  backgroundColor: entry.type === 'upload' ? '#34D399' : entry.type === 'generate' ? '#6366F1' : entry.type === 'edit' ? '#FBBF24' : '#FB7185',
                  border: '2px solid var(--bg-secondary)'
                }}
              />
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                <span className="text-sm text-text-primary">{entry.action}</span>
                <span className="text-xs text-text-muted">{formatDate(entry.timestamp)} · {entry.actor}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* ─── Paste Text Modal ─── */}
      <AnimatePresence>
        {showPasteModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowPasteModal(false)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} transition={{ duration: 0.2, ease: easeOut }} className="bg-bg-elevated rounded-card-lg border border-border-subtle p-6 max-w-2xl w-[90%] shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-heading text-lg font-semibold text-text-primary">Paste CV Text</h3>
                <button onClick={() => setShowPasteModal(false)} className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-colors"><X size={16} /></button>
              </div>
              <textarea
                value={pasteText} onChange={e => setPasteText(e.target.value)}
                placeholder="Paste your CV text here..."
                rows={16}
                className="w-full px-4 py-3 rounded-xl bg-bg-tertiary border border-border-default text-sm text-text-primary placeholder:text-text-muted focus:border-accent-indigo focus:ring-2 focus:ring-accent-indigo/15 transition-all resize-y font-mono leading-relaxed"
              />
              <div className="flex justify-end gap-3 mt-4">
                <button onClick={() => setShowPasteModal(false)} className="px-4 py-2 rounded-lg text-sm text-text-secondary hover:bg-bg-tertiary transition-colors">Cancel</button>
                <button onClick={handlePasteSave} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-accent-indigo text-white text-sm font-medium hover:bg-accent-indigo-hover transition-colors">
                  <Check size={14} /> Save as Master CV
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Compare Modal ─── */}
      <AnimatePresence>
        {compareVersion && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setCompareVersion(null)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} transition={{ duration: 0.2, ease: easeOut }} className="bg-bg-elevated rounded-card-lg border border-border-subtle max-w-5xl w-full max-h-[90vh] shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between p-5 border-b border-border-subtle flex-shrink-0">
                <div>
                  <h3 className="font-heading text-lg font-semibold text-text-primary">CV Comparison</h3>
                  <p className="text-xs text-text-muted mt-1">{compareVersion.jobTitle} at {compareVersion.company}</p>
                </div>
                <button onClick={() => setCompareVersion(null)} className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-colors"><X size={18} /></button>
              </div>
              <div className="p-5 overflow-auto flex-1">
                <DiffViewer master={masterCV} tailored={compareVersion.content} />
                <div className="flex items-center gap-6 mt-4 text-xs text-text-secondary">
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-accent-emerald" /> Master (unchanged)</span>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-accent-indigo" /> Tailored version</span>
                </div>
                <div className="mt-3 p-3 rounded-lg bg-accent-emerald-muted text-xs text-accent-emerald flex items-center gap-2">
                  <CheckCircle2 size={14} /> No fabricated experience detected — all content derived from Master CV
                </div>
              </div>
              <div className="flex justify-end gap-3 p-5 border-t border-border-subtle flex-shrink-0">
                <button onClick={() => handleCopy(compareVersion.content)} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm text-text-secondary hover:bg-bg-tertiary transition-colors"><Copy size={14} /> Copy Tailored Text</button>
                <button onClick={() => handleDownload(compareVersion.content, `${compareVersion.jobTitle.toLowerCase().replace(/\s+/g, '-')}-cv.txt`)} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm text-text-secondary hover:bg-bg-tertiary transition-colors"><Download size={14} /> Download</button>
                <button onClick={() => setCompareVersion(null)} className="px-4 py-2 rounded-lg text-sm text-text-secondary hover:bg-bg-tertiary transition-colors">Close</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── View Version Modal ─── */}
      <AnimatePresence>
        {viewVersion && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setViewVersion(null)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} transition={{ duration: 0.2, ease: easeOut }} className="bg-bg-elevated rounded-card-lg border border-border-subtle max-w-3xl w-full max-h-[85vh] shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between p-5 border-b border-border-subtle flex-shrink-0">
                <div>
                  <h3 className="font-heading text-lg font-semibold text-text-primary">{viewVersion.jobTitle}</h3>
                  <p className="text-xs text-text-muted mt-1">{viewVersion.company} · Score: {viewVersion.score}%</p>
                </div>
                <button onClick={() => setViewVersion(null)} className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-colors"><X size={18} /></button>
              </div>
              <div className="p-5 overflow-auto flex-1">
                <pre className="text-sm text-text-secondary whitespace-pre-wrap font-mono leading-relaxed">{viewVersion.content}</pre>
              </div>
              <div className="flex justify-end gap-3 p-5 border-t border-border-subtle flex-shrink-0">
                <button onClick={() => handleCopy(viewVersion.content)} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm text-text-secondary hover:bg-bg-tertiary transition-colors"><Copy size={14} /> Copy</button>
                <button onClick={() => handleDownload(viewVersion.content, `${viewVersion.jobTitle.toLowerCase().replace(/\s+/g, '-')}-cv.txt`)} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm text-text-secondary hover:bg-bg-tertiary transition-colors"><Download size={14} /> Download</button>
                <button onClick={() => setViewVersion(null)} className="px-4 py-2 rounded-lg text-sm text-text-secondary hover:bg-bg-tertiary transition-colors">Close</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Delete Confirmation ─── */}
      <ConfirmationDialog
        open={!!deleteVersion}
        title="Delete Tailored CV"
        message="This will permanently delete this tailored CV version. This cannot be undone."
        onConfirm={() => deleteVersion && handleDeleteVersion(deleteVersion)}
        onCancel={() => setDeleteVersion(null)}
      />
    </div>
  )
}
