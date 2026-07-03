import { useState, useRef, useMemo, useEffect } from 'react'
import { getDocuments, deleteDocument as apiDeleteDocument, getProfile } from '@/lib/api'
import { downloadAsPdf } from '@/lib/pdf'
import { diffLines, diffStats } from '@/lib/diff'
import { useUIStore } from '@/store/uiStore'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FileText, FileCheck, Upload, Download, Pencil, Eye, Trash2, Copy, X,
  GitBranch, Sparkles, AlertCircle, CheckCircle2, Shield, Zap,
  ChevronRight, Activity, Check, XCircle, Mail, History
} from 'lucide-react'
// mock data defined inline in this file

// ─── Types ────────────────────────────────────
interface CVVersion {
  id: string
  type: 'cv' | 'cover_letter'
  jobTitle: string
  company: string
  createdAt: string
  score: number
  changes: string
  status: 'not_used' | 'used'
  content: string
  /** Documents for the same job+type form a version group. */
  groupKey: string
  /** 1-based version number within the group (oldest = v1). */
  version: number
}

// ─── Master CV persistence (survives reloads) ──
const MASTER_KEY = 'jobpilot_master_cv'
const MASTER_TS_KEY = 'jobpilot_master_cv_updated'

function persistMaster(text: string): string {
  const ts = new Date().toISOString()
  try {
    localStorage.setItem(MASTER_KEY, text)
    localStorage.setItem(MASTER_TS_KEY, ts)
  } catch { /* localStorage unavailable */ }
  return ts
}

// Build a plain-text master CV from the LOGGED-IN user's profile (so every
// account sees their own CV here, never someone else's).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildMasterFromProfile(p: any): string {
  if (!p || !p.full_name) return ''
  const out: string[] = []
  out.push(String(p.full_name).toUpperCase())
  if (p.headline) out.push(p.headline)
  const contact = [p.location, p.phone, p.email, p.website, p.github].filter(Boolean).join(' | ')
  if (contact) out.push(contact)
  if (p.summary) out.push('', 'PROFILE', p.summary)
  const skillEntries = Object.entries(p.skills || {})
  if (skillEntries.length) {
    out.push('', 'KEY SKILLS')
    for (const [cat, list] of skillEntries) out.push(`${cat}: ${(list as string[]).join(', ')}`)
  }
  if (Array.isArray(p.cards_certifications) && p.cards_certifications.length) {
    out.push('', 'CARDS & CERTIFICATIONS')
    for (const c of p.cards_certifications) out.push(`- ${c}`)
  }
  if (Array.isArray(p.experience) && p.experience.length) {
    out.push('', 'EXPERIENCE')
    for (const e of p.experience) {
      out.push(`${e.role || ''}${e.company ? ` | ${e.company}` : ''}${e.dates ? ` | ${e.dates}` : ''}`)
      if (e.detail) out.push(`- ${e.detail}`)
    }
  }
  if (Array.isArray(p.projects) && p.projects.length) {
    out.push('', 'PROJECTS')
    for (const pr of p.projects) {
      out.push(`${pr.name}${pr.year ? ` (${pr.year})` : ''}${pr.tech?.length ? ` — ${pr.tech.join(', ')}` : ''}`)
      if (pr.detail) out.push(`- ${pr.detail}`)
    }
  }
  if (Array.isArray(p.education) && p.education.length) {
    out.push('', 'EDUCATION')
    for (const e of p.education) {
      out.push(`${e.degree || ''}${e.institution ? `, ${e.institution}` : ''}${e.dates ? ` (${e.dates})` : ''}`)
      if (e.note) out.push(`  ${e.note}`)
    }
  }
  return out.join('\n')
}

interface ActivityEntry {
  id: string
  action: string
  timestamp: string
  type: 'upload' | 'generate' | 'edit' | 'delete'
  actor: string
}

// Tailored versions are loaded from the backend (real AI-generated documents);
// the master CV is generated from the logged-in user's own profile.
const initialTailoredVersions: CVVersion[] = []

// ─── Animation ────────────────────────────────
const easeOut = [0.16, 1, 0.3, 1] as [number, number, number, number]
const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.06, duration: 0.35, ease: easeOut } }),
}

// ─── Diff Viewer (real line-level diff, side by side) ─────────
function DiffViewer({ baseLabel, base, targetLabel, target }: { baseLabel: string; base: string; targetLabel: string; target: string }) {
  const rows = useMemo(() => diffLines(base, target), [base, target])
  const stats = useMemo(() => diffStats(rows), [rows])
  return (
    <div>
      {/* Change summary */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-3 text-xs font-medium">
        <span className="flex items-center gap-1 text-accent-emerald">
          <span className="w-2.5 h-2.5 rounded-sm bg-accent-emerald/30 border border-accent-emerald/50" />
          +{stats.added} added
        </span>
        <span className="flex items-center gap-1 text-accent-rose">
          <span className="w-2.5 h-2.5 rounded-sm bg-accent-rose/30 border border-accent-rose/50" />
          −{stats.removed} removed
        </span>
        <span className="text-text-muted">{stats.same} unchanged · {stats.changedPct}% of lines differ</span>
      </div>

      <div className="border border-border-subtle rounded-xl overflow-hidden">
        {/* Column headers */}
        <div className="grid grid-cols-2 bg-bg-tertiary border-b border-border-subtle">
          <div className="px-4 py-2.5 flex items-center gap-2 border-r border-border-subtle min-w-0">
            <FileCheck size={14} className="text-accent-emerald flex-shrink-0" />
            <span className="text-xs font-semibold text-text-secondary truncate">{baseLabel}</span>
          </div>
          <div className="px-4 py-2.5 flex items-center gap-2 min-w-0">
            <Sparkles size={14} className="text-accent-indigo flex-shrink-0" />
            <span className="text-xs font-semibold text-text-secondary truncate">{targetLabel}</span>
          </div>
        </div>
        {/* Aligned diff rows */}
        <div className="max-h-[480px] overflow-y-auto font-mono text-[11px] leading-relaxed">
          {rows.map((r, i) => (
            <div key={i} className="grid grid-cols-2">
              <div
                className={`px-4 py-[1px] border-r border-border-subtle whitespace-pre-wrap break-words min-w-0 ${
                  r.type === 'removed' ? 'bg-accent-rose/10 text-accent-rose' : 'text-text-secondary'
                }`}
              >
                {r.left === null ? ' ' : r.left || ' '}
              </div>
              <div
                className={`px-4 py-[1px] whitespace-pre-wrap break-words min-w-0 ${
                  r.type === 'added' ? 'bg-accent-emerald/10 text-accent-emerald' : 'text-text-secondary'
                }`}
              >
                {r.right === null ? ' ' : r.right || ' '}
              </div>
            </div>
          ))}
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
  const addToast = useUIStore((s) => s.addToast)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [profileData, setProfileData] = useState<any | null>(null)
  // Master CV persists in localStorage (with a real "last updated" timestamp).
  // Default comes from the LOGGED-IN user's profile (fetched below), never a
  // hardcoded CV — new accounts see their own data or an empty state.
  const [masterCV, setMasterCV] = useState(() => {
    try { return localStorage.getItem(MASTER_KEY) || '' } catch { return '' }
  })
  const [masterUpdated, setMasterUpdated] = useState<string | null>(() => {
    try { return localStorage.getItem(MASTER_TS_KEY) } catch { return null }
  })
  const [tailoredVersions, setTailoredVersions] = useState<CVVersion[]>(initialTailoredVersions)
  const [filterType, setFilterType] = useState<'all' | 'cv' | 'cover_letter'>('all')
  const [editingMaster, setEditingMaster] = useState(false)
  const [editText, setEditText] = useState(masterCV)
  const [showPasteModal, setShowPasteModal] = useState(false)
  const [pasteText, setPasteText] = useState('')
  const [compareVersion, setCompareVersion] = useState<CVVersion | null>(null)
  const [compareBaseId, setCompareBaseId] = useState<string>('master') // 'master' | version id
  const [viewVersion, setViewVersion] = useState<CVVersion | null>(null)
  const [deleteVersion, setDeleteVersion] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Load the logged-in user's profile; if there's no saved master CV yet,
  // generate one from THEIR profile (blank profile → empty state + prompts).
  useEffect(() => {
    getProfile()
      .then((p) => {
        if (!p) return
        setProfileData(p)
        try {
          if (!localStorage.getItem(MASTER_KEY)) {
            const generated = buildMasterFromProfile(p)
            if (generated) {
              setMasterCV(generated)
              setEditText(generated)
            }
          }
        } catch { /* localStorage unavailable */ }
      })
      .catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Load real AI-generated documents from the backend, grouped into version
  // histories: documents for the same job+type get version numbers (oldest = v1).
  useEffect(() => {
    getDocuments()
      .then((docs) => {
        if (docs && docs.length) {
          const keyOf = (d: { type: string; job_title: string; company: string }) =>
            `${d.type}|${(d.job_title || '').toLowerCase().trim()}|${(d.company || '').toLowerCase().trim()}`
          const sorted = [...docs].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
          const counters = new Map<string, number>()
          const versionOf = new Map<string, number>()
          for (const d of sorted) {
            const k = keyOf(d)
            const v = (counters.get(k) || 0) + 1
            counters.set(k, v)
            versionOf.set(d.id, v)
          }
          setTailoredVersions(
            docs.map((d) => ({
              id: d.id,
              type: d.type === 'cover_letter' ? ('cover_letter' as const) : ('cv' as const),
              jobTitle: d.job_title || (d.type === 'cover_letter' ? 'Cover Letter' : 'Tailored CV'),
              company: d.company || '—',
              createdAt: d.created_at,
              score: 0,
              changes: d.type === 'cover_letter' ? 'AI-generated cover letter' : 'AI-tailored CV',
              status: 'not_used' as const,
              content: d.content,
              groupKey: keyOf(d),
              version: versionOf.get(d.id) || 1,
            })),
          )
        }
      })
      .catch(() => {})
  }, [])

  // Versions visible under the current filter
  const visibleVersions = useMemo(
    () => (filterType === 'all' ? tailoredVersions : tailoredVersions.filter((v) => v.type === filterType)),
    [tailoredVersions, filterType],
  )

  // Sibling versions of the doc being compared (for the baseline picker)
  const compareSiblings = useMemo(
    () =>
      compareVersion
        ? tailoredVersions
            .filter((v) => v.groupKey === compareVersion.groupKey && v.id !== compareVersion.id)
            .sort((a, b) => a.version - b.version)
        : [],
    [compareVersion, tailoredVersions],
  )
  const compareBase =
    compareBaseId === 'master' ? null : tailoredVersions.find((v) => v.id === compareBaseId) || null

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
      setMasterUpdated(persistMaster(text))
      addToast({ type: 'success', title: 'Master CV updated', message: file.name })
    }
    reader.readAsText(file)
  }

  const handleSaveMaster = () => {
    setMasterCV(editText)
    setEditingMaster(false)
    setMasterUpdated(persistMaster(editText))
    addToast({ type: 'success', title: 'Master CV saved' })
  }

  const handlePasteSave = () => {
    setMasterCV(pasteText)
    setEditText(pasteText)
    setShowPasteModal(false)
    setPasteText('')
    setMasterUpdated(persistMaster(pasteText))
    addToast({ type: 'success', title: 'Master CV saved' })
  }

  const handleCreateFromProfile = () => {
    const generated = buildMasterFromProfile(profileData)
    if (!generated) {
      addToast({ type: 'warning', title: 'Profile is empty', message: 'Fill in your Career Profile first, then create your master CV from it.' })
      return
    }
    setMasterCV(generated)
    setEditText(generated)
    setMasterUpdated(persistMaster(generated))
    addToast({ type: 'success', title: 'Master CV created from your profile' })
  }

  // Download as a polished, send-ready PDF (was plain .txt).
  const handleDownload = (content: string, filename: string) => {
    const type = /cover|(^|[-_])cl([-_.]|$)/i.test(filename) ? 'cover_letter' : 'cv'
    downloadAsPdf(content, filename, { type })
  }

  // Type-aware download for a tailored version (correct name + PDF layout).
  const downloadVersion = (v: CVVersion) => {
    const slug = v.jobTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    downloadAsPdf(v.content, `${slug}-${v.type === 'cover_letter' ? 'cover-letter' : 'cv'}-v${v.version}`, { type: v.type })
  }

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
    addToast({ type: 'success', title: 'Copied to clipboard' })
  }

  // Really delete — from the backend, not just the local list.
  const handleDeleteVersion = async (id: string) => {
    setDeleteVersion(null)
    const ok = await apiDeleteDocument(id)
    setTailoredVersions(prev => prev.filter(v => v.id !== id))
    if (ok) addToast({ type: 'success', title: 'Version deleted' })
    else addToast({ type: 'warning', title: 'Deleted locally', message: 'Backend unreachable — it may reappear on reload.' })
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
            <span>{tailoredVersions.length} tailored version{tailoredVersions.length === 1 ? '' : 's'}</span>
            <span className="text-text-muted">·</span>
            <span className="text-text-muted">
              {masterUpdated ? `Master updated ${formatDate(masterUpdated)}` : 'Master from profile'}
            </span>
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
        <input ref={fileInputRef} type="file" accept=".txt,.md,.text" className="hidden" onChange={e => e.target.files?.[0] && handleFileUpload(e.target.files[0])} />
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
                  <span>{masterUpdated ? `Updated: ${formatDate(masterUpdated)}` : 'Source: profile default'}</span>
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

      {/* ─── Tailored Versions (CVs + cover letters, with history) ─── */}
      <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={3}>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5">
            <History size={18} className="text-accent-indigo" />
            <h2 className="font-heading text-lg font-semibold text-text-primary">Version History</h2>
            <span className="px-2 py-0.5 rounded-full bg-bg-tertiary text-text-muted text-xs font-mono">
              {visibleVersions.length}
            </span>
          </div>
          {/* Type filter */}
          <div className="inline-flex items-center gap-0.5 p-1 rounded-xl bg-bg-tertiary border border-border-subtle">
            {([
              { key: 'all', label: 'All' },
              { key: 'cv', label: 'CVs' },
              { key: 'cover_letter', label: 'Cover Letters' },
            ] as const).map((opt) => (
              <button
                key={opt.key}
                onClick={() => setFilterType(opt.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  filterType === opt.key ? 'bg-accent-indigo text-white' : 'text-text-muted hover:text-text-secondary'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        {visibleVersions.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            <AnimatePresence>
              {visibleVersions.map((version, i) => (
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
                    <div className="w-10 h-10 rounded-full bg-accent-indigo-muted flex items-center justify-center flex-shrink-0 ml-2">
                      {version.type === 'cover_letter'
                        ? <Mail size={16} className="text-accent-violet" />
                        : <FileText size={16} className="text-accent-indigo" />}
                    </div>
                  </div>
                  <p className="text-xs text-text-muted mb-1">Generated {formatDate(version.createdAt)}</p>
                  <p className="text-xs text-text-secondary mb-3 line-clamp-2">{version.changes}</p>
                  <div className="flex items-center gap-1.5 mb-3">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-accent-indigo-muted text-accent-indigo font-mono">
                      v{version.version}
                    </span>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${version.type === 'cover_letter' ? 'bg-accent-violet-muted text-accent-violet' : 'bg-bg-tertiary text-text-muted'}`}>
                      {version.type === 'cover_letter' ? 'Cover letter' : 'CV'}
                    </span>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${version.status === 'used' ? 'bg-accent-emerald-muted text-accent-emerald' : 'bg-bg-tertiary text-text-muted'}`}>
                      {version.status === 'used' ? <CheckCircle2 size={10} /> : <XCircle size={10} />}
                      {version.status === 'used' ? 'Used' : 'Not used'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 pt-3 border-t border-border-subtle">
                    <button onClick={() => setViewVersion(version)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-colors" title="View">
                      <Eye size={13} />
                    </button>
                    <button onClick={() => { setCompareBaseId('master'); setCompareVersion(version) }} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-colors" title="Compare">
                      <GitBranch size={13} />
                    </button>
                    <button onClick={() => handleCopy(version.content)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-colors" title="Copy">
                      <Copy size={13} />
                    </button>
                    <button onClick={() => downloadVersion(version)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-colors" title="Download PDF">
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
              <div className="flex flex-wrap items-center justify-between gap-3 p-5 border-b border-border-subtle flex-shrink-0">
                <div>
                  <h3 className="font-heading text-lg font-semibold text-text-primary">Side-by-Side Compare</h3>
                  <p className="text-xs text-text-muted mt-1">
                    {compareVersion.jobTitle} at {compareVersion.company} · v{compareVersion.version}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {/* Baseline picker: Master CV or any other version of this document */}
                  <label className="text-xs text-text-muted">Compare against:</label>
                  <select
                    value={compareBaseId}
                    onChange={(e) => setCompareBaseId(e.target.value)}
                    className="h-8 px-2 rounded-lg bg-bg-tertiary border border-border-default text-xs text-text-primary focus:border-accent-indigo focus:outline-none"
                  >
                    <option value="master">Master CV</option>
                    {compareSiblings.map((s) => (
                      <option key={s.id} value={s.id}>
                        v{s.version} · {formatDate(s.createdAt)}
                      </option>
                    ))}
                  </select>
                  <button onClick={() => setCompareVersion(null)} className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-colors"><X size={18} /></button>
                </div>
              </div>
              <div className="p-5 overflow-auto flex-1">
                <DiffViewer
                  baseLabel={compareBase ? `v${compareBase.version} · ${formatDate(compareBase.createdAt)}` : 'Master CV'}
                  base={compareBase ? compareBase.content : masterCV}
                  targetLabel={`v${compareVersion.version} · ${compareVersion.type === 'cover_letter' ? 'Cover letter' : 'Tailored CV'}`}
                  target={compareVersion.content}
                />
              </div>
              <div className="flex justify-end gap-3 p-5 border-t border-border-subtle flex-shrink-0">
                <button onClick={() => handleCopy(compareVersion.content)} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm text-text-secondary hover:bg-bg-tertiary transition-colors"><Copy size={14} /> Copy Tailored Text</button>
                <button onClick={() => downloadVersion(compareVersion)} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm text-text-secondary hover:bg-bg-tertiary transition-colors"><Download size={14} /> Download PDF</button>
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
                  <p className="text-xs text-text-muted mt-1">
                    {viewVersion.company} · v{viewVersion.version} · {viewVersion.type === 'cover_letter' ? 'Cover letter' : 'CV'} · {formatDate(viewVersion.createdAt)}
                  </p>
                </div>
                <button onClick={() => setViewVersion(null)} className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-colors"><X size={18} /></button>
              </div>
              <div className="p-5 overflow-auto flex-1">
                <pre className="text-sm text-text-secondary whitespace-pre-wrap font-mono leading-relaxed">{viewVersion.content}</pre>
              </div>
              <div className="flex justify-end gap-3 p-5 border-t border-border-subtle flex-shrink-0">
                <button onClick={() => handleCopy(viewVersion.content)} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm text-text-secondary hover:bg-bg-tertiary transition-colors"><Copy size={14} /> Copy</button>
                <button onClick={() => downloadVersion(viewVersion)} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm text-text-secondary hover:bg-bg-tertiary transition-colors"><Download size={14} /> Download PDF</button>
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
