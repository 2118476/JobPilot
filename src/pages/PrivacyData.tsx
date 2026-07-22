import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Shield,
  Database,
  Download,
  Upload,
  Trash2,
  Brain,
  FileText,
  Briefcase,
  FolderOpen,
  Settings,
  Lock,
  ChevronDown,
  AlertTriangle,
  X,
  RefreshCw,
  Eye,
  Clock,
} from 'lucide-react'
import { useUIStore } from '@/store/uiStore'
import { exportData, importData, deleteAllData, saveProfile } from '@/lib/api'
import { CvImportModal } from '@/components/CvImportModal'

// ─────────────────────────────────────────────
// Animation config
// ─────────────────────────────────────────────

const easeOutExpo = [0.16, 1, 0.3, 1] as [number, number, number, number]

const staggerContainer = {
  animate: { transition: { staggerChildren: 0.04 } },
}

const staggerItem = {
  initial: { opacity: 0, y: 15 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: easeOutExpo } },
}

// ─────────────────────────────────────────────
// Helper: download JSON
// ─────────────────────────────────────────────

function downloadJSON(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// ─────────────────────────────────────────────
// Data section definitions
// ─────────────────────────────────────────────

interface DataSection {
  id: string
  icon: typeof Brain
  title: string
  description: string
  count: string
  created: string
  usedIn: string
  fields: { label: string; value: string; sensitive?: boolean }[]
  exportData: () => void
}

type ArchiveRecord = Record<string, unknown>

interface WorkspaceArchive extends ArchiveRecord {
  profiles?: { tech?: ArchiveRecord; construction?: ArchiveRecord }
  jobs?: ArchiveRecord[]
  documents?: ArchiveRecord[]
  search_settings?: ArchiveRecord
}

const archiveRecord = (value: unknown): ArchiveRecord =>
  value && typeof value === 'object' ? value as ArchiveRecord : {}

function createDataSections(workspace: WorkspaceArchive | null): DataSection[] {
  const tech = workspace?.profiles?.tech || {}
  const construction = workspace?.profiles?.construction || {}
  const jobs = Array.isArray(workspace?.jobs) ? workspace.jobs : []
  const documents = Array.isArray(workspace?.documents) ? workspace.documents : []
  const projects = Array.isArray(tech.projects) ? tech.projects : []
  const applications = jobs.filter((job) => ['applied', 'interview', 'technical_test', 'offer', 'rejected'].includes(String(job.status)))
  const settings = workspace?.search_settings || {}
  const field = (label: string, value: unknown, sensitive = false) => ({ label, value: String(value || '—'), sensitive })

  return [
    {
      id: 'profile', icon: Brain, title: 'Career Profiles',
      description: 'Your tech and construction profiles, skills, experience, education and preferences.',
      count: [tech.full_name, construction.full_name].filter(Boolean).length ? `${[tech.full_name, construction.full_name].filter(Boolean).length} completed profile(s)` : 'No completed profiles',
      created: 'Stored in your account', usedIn: 'AI Coach, matching, CVs, search',
      fields: [field('Tech profile', tech.full_name), field('Construction profile', construction.full_name), field('Email', tech.email, true), field('Location', tech.location)],
      exportData: () => downloadJSON(workspace?.profiles || {}, 'jobpilot-profiles.json'),
    },
    {
      id: 'projects', icon: FolderOpen, title: 'Project Evidence',
      description: 'Projects Gemini can use as evidence when matching and coaching.',
      count: `${projects.length} project(s)`, created: 'From Career Profile', usedIn: 'AI Coach, job matching, CV tailoring',
      fields: projects.slice(0, 8).map((value) => {
        const project = archiveRecord(value)
        return field(String(project.name || 'Project'), Array.isArray(project.tech) ? project.tech.join(', ') : '')
      }),
      exportData: () => downloadJSON(projects, 'jobpilot-projects.json'),
    },
    {
      id: 'jobs', icon: Briefcase, title: 'Job Pipeline',
      description: 'Jobs discovered, scored, saved and progressed in your account.',
      count: `${jobs.length} job(s)`, created: 'Updated by JobPilot Search', usedIn: 'Dashboard, Applications, Reports, AI Coach',
      fields: [field('Total jobs', jobs.length), field('Strong matches', jobs.filter((job) => Number(job.match_score) >= 70).length), field('Applications', applications.length)],
      exportData: () => downloadJSON(jobs, 'jobpilot-jobs.json'),
    },
    {
      id: 'documents', icon: FileText, title: 'Saved Documents',
      description: 'Generated CVs and cover letters available to Gemini as workspace context.',
      count: `${documents.length} document(s)`, created: 'Generated in CV Manager', usedIn: 'CV Manager, AI Coach, job assistant',
      fields: documents.slice(0, 8).map((doc) => field(String(doc.job_title || (doc.type === 'cover_letter' ? 'Cover letter' : 'CV')), doc.company || doc.type)),
      exportData: () => downloadJSON(documents, 'jobpilot-documents.json'),
    },
    {
      id: 'applications', icon: Briefcase, title: 'Applications',
      description: 'Application and interview stages derived from your real job pipeline.',
      count: `${applications.length} application(s)`, created: 'Updated in Applications', usedIn: 'Applications, Dashboard, AI Coach',
      fields: applications.slice(0, 8).map((job) => field(String(job.title || 'Role'), `${job.company || 'Company'} · ${job.status}`)),
      exportData: () => downloadJSON(applications, 'jobpilot-applications.json'),
    },
    {
      id: 'settings', icon: Settings, title: 'Search Automation',
      description: 'Account-scoped automation, alert and search preferences.',
      count: settings.enabled ? 'Automation enabled' : 'Automation disabled', created: 'Stored in your account', usedIn: 'Search Settings, scheduled discovery',
      fields: [field('Query', settings.query), field('Location', settings.location), field('Frequency', settings.frequency), field('Minimum alert score', settings.min_score_alert)],
      exportData: () => downloadJSON(settings, 'jobpilot-search-settings.json'),
    },
  ]
}

export default function PrivacyData() {
  const addToast = useUIStore((s) => s.addToast)
  const [workspace, setWorkspace] = useState<WorkspaceArchive | null>(null)
  const dataSections = useMemo(() => createDataSections(workspace), [workspace])
  const [expandedSection, setExpandedSection] = useState<string | null>('profile')
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false)
  const [exportLoading, setExportLoading] = useState(false)
  const [importLoading, setImportLoading] = useState(false)
  const [cvImportOpen, setCvImportOpen] = useState(false)
  const [deleteAllOpen, setDeleteAllOpen] = useState(false)
  const [deleteAllText, setDeleteAllText] = useState('')

  useEffect(() => {
    exportData().then((data) => { if (data) setWorkspace(data) }).catch(() => {})
  }, [])

  const projectCount = Array.isArray(workspace?.profiles?.tech?.projects) ? workspace.profiles.tech.projects.length : 0
  const recordCount = (workspace?.jobs?.length || 0) + (workspace?.documents?.length || 0) + projectCount
  const dataSize = workspace ? `${Math.max(1, Math.round(JSON.stringify(workspace).length / 1024))} KB` : 'Loading…'

  const toggleSection = (id: string) => {
    setExpandedSection((prev) => (prev === id ? null : id))
  }

  // Export only the authenticated account's real backend data.
  const handleExportAll = async () => {
    setExportLoading(true)
    const real = await exportData()
    if (real) downloadJSON(real, 'jobpilot-data-export.json')
    setExportLoading(false)
    addToast({
      type: real ? 'success' : 'error',
      title: real ? 'Your data has been exported' : 'Export failed',
      message: real ? 'Everything stored for your account, as JSON.' : 'Your account data could not be loaded. Please try again.',
    })
  }

  const handleImportArchive = async (file: File | undefined) => {
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      addToast({ type: 'error', title: 'Archive is too large', message: 'JobPilot JSON archives must be under 2 MB.' })
      return
    }
    setImportLoading(true)
    try {
      const parsed = JSON.parse(await file.text()) as Record<string, unknown>
      const result = await importData(parsed, false)
      addToast({
        type: 'success',
        title: 'Workspace restored',
        message: `${result.profiles} profiles, ${result.jobs} jobs and ${result.documents} documents are now available.`,
      })
      window.setTimeout(() => window.location.reload(), 900)
    } catch (error) {
      addToast({ type: 'error', title: 'Could not restore archive', message: error instanceof Error ? error.message : 'Invalid JobPilot archive.' })
    } finally {
      setImportLoading(false)
    }
  }

  const handleCvProfileImport = async (mergedProfile: Record<string, unknown>) => {
    const saved = await saveProfile(mergedProfile, 'tech')
    if (!saved) throw new Error('JobPilot could not save the approved CV details. Please try again.')
    setWorkspace((current) => current ? {
      ...current,
      profiles: { ...(current.profiles || {}), tech: saved as ArchiveRecord },
    } : current)
    addToast({
      type: 'success',
      title: 'CV details added',
      message: 'The approved sections were merged into your Career Profile.',
    })
  }

  // Clear local app data (keeps the mock user registry so login still works).
  const clearLocalData = () => {
    try {
      const keep = ['jobpilot_mock_users']
      Object.keys(localStorage)
        .filter((k) => !keep.includes(k))
        .forEach((k) => localStorage.removeItem(k))
    } catch { /* localStorage unavailable */ }
  }

  const handleDeleteAll = async () => {
    if (deleteAllText === 'DELETE') {
      setDeleteAllOpen(false)
      setDeleteAllText('')
      // Delete the account's data on the backend too (profile, jobs, documents,
      // automation settings) — not just this browser's local storage.
      const backendOk = await deleteAllData()
      clearLocalData()
      addToast({
        type: backendOk ? 'success' : 'warning',
        title: 'Data deleted',
        message: backendOk
          ? 'All of your stored data has been erased. Signing out…'
          : 'Local data cleared; backend was unreachable, so run it and delete again to erase server data.',
      })
      setTimeout(() => {
        localStorage.removeItem('jobpilot_mock_session')
        window.location.hash = '#/'
        window.location.reload()
      }, 1400)
    }
  }

  const handleResetApp = () => {
    setResetConfirmOpen(false)
    try {
      ;['jobpilot_search_settings', 'jobpilot-track', 'jobpilot-ui', 'itil_progress_v1', 'jobpilot-debug'].forEach((k) =>
        localStorage.removeItem(k),
      )
    } catch { /* ignore */ }
    addToast({ type: 'success', title: 'App reset', message: 'Settings restored to defaults. Reloading…' })
    setTimeout(() => window.location.reload(), 1400)
  }

  return (
    <motion.div
      className="space-y-6 pb-8 max-w-4xl"
      variants={staggerContainer}
      initial="initial"
      animate="animate"
    >
      {/* ── Page Title ── */}
      <motion.div variants={staggerItem}>
        <h1 className="font-heading text-display-md font-semibold text-text-primary tracking-tight">
          Privacy &amp; Data Control
        </h1>
        <p className="text-body-md text-text-secondary mt-1">
          Your data is yours. View, export, or delete anything at any time.
        </p>
      </motion.div>

      {/* ── Global Actions ── */}
      <motion.div variants={staggerItem} className="rounded-card-lg border border-border-subtle bg-bg-secondary p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-accent-indigo-muted flex items-center justify-center">
            <Database size={20} className="text-accent-indigo" />
          </div>
          <div>
            <h2 className="font-heading text-heading-lg font-semibold text-text-primary">Global Data Actions</h2>
            <p className="text-body-xs text-accent-amber flex items-center gap-1.5 mt-0.5">
              <AlertTriangle size={12} />
              These actions affect all your data. Use with caution.
            </p>
          </div>
        </div>

        <div className="space-y-3 pt-2">
          {/* Export All */}
          <div className="flex items-center justify-between p-4 rounded-card bg-bg-tertiary border border-border-subtle flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <Download size={18} className="text-accent-emerald flex-shrink-0" />
              <div>
                <p className="text-body-sm font-medium text-text-primary">Export All My Data</p>
                <p className="text-body-xs text-text-muted">
                  Downloads a complete archive of all your data in JSON format.
                </p>
              </div>
            </div>
            <button
              onClick={handleExportAll}
              disabled={exportLoading}
              className="flex items-center gap-2 px-4 py-2 rounded-button border border-border-default text-body-sm text-text-secondary hover:text-text-primary hover:bg-bg-secondary hover:border-border-focus transition-all disabled:opacity-50"
            >
              {exportLoading ? (
                <RefreshCw size={14} className="animate-spin-slow" />
              ) : (
                <Download size={14} />
              )}
              {exportLoading ? 'Preparing...' : 'Export All'}
            </button>
          </div>

          {/* Import CV into Career Profile */}
          <div className="flex items-center justify-between p-4 rounded-card bg-bg-tertiary border border-border-subtle flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <FileText size={18} className="text-accent-indigo flex-shrink-0" />
              <div>
                <p className="text-body-sm font-medium text-text-primary">Import CV into Career Profile</p>
                <p className="text-body-xs text-text-muted">Upload a PDF or DOCX, review Gemini&apos;s extraction, then choose which profile sections to merge.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setCvImportOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-button border border-accent-indigo/30 bg-accent-indigo-muted text-body-sm text-accent-indigo hover:border-accent-indigo transition-all"
            >
              <Upload size={14} /> Choose CV
            </button>
          </div>

          {/* Restore Backup */}
          <div className="flex items-center justify-between p-4 rounded-card bg-bg-tertiary border border-border-subtle flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <Upload size={18} className="text-accent-indigo flex-shrink-0" />
              <div>
                <p className="text-body-sm font-medium text-text-primary">Restore JobPilot Backup</p>
                <p className="text-body-xs text-text-muted">Merges a JobPilot JSON archive into this signed-in account only.</p>
              </div>
            </div>
            <label className="flex items-center gap-2 px-4 py-2 rounded-button border border-border-default text-body-sm text-text-secondary hover:text-text-primary hover:bg-bg-secondary hover:border-border-focus transition-all cursor-pointer">
              {importLoading ? <RefreshCw size={14} className="animate-spin-slow" /> : <Upload size={14} />}
              {importLoading ? 'Restoring...' : 'Choose Backup'}
              <input
                type="file"
                accept="application/json,.json"
                disabled={importLoading}
                className="sr-only"
                aria-label="Choose JobPilot backup"
                onChange={(event) => handleImportArchive(event.target.files?.[0])}
              />
            </label>
          </div>

          {/* Delete All Data */}
          <div className="flex items-center justify-between p-4 rounded-card bg-accent-rose-muted/30 border border-accent-rose/20 flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <Trash2 size={18} className="text-accent-rose flex-shrink-0" />
              <div>
                <p className="text-body-sm font-medium text-accent-rose">Delete All My Data</p>
                <p className="text-body-xs text-accent-rose/70">
                  Permanently removes all your data. This cannot be undone.
                </p>
              </div>
            </div>
            <button
              onClick={() => setDeleteAllOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-button bg-accent-rose text-white text-body-sm font-medium hover:bg-accent-rose/90 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-accent-rose/20"
            >
              <Trash2 size={14} />
              Delete All Data
            </button>
          </div>

          {/* Reset App */}
          <div className="flex items-center justify-between p-4 rounded-card bg-bg-tertiary border border-border-subtle flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <RefreshCw size={18} className="text-text-muted flex-shrink-0" />
              <div>
                <p className="text-body-sm font-medium text-text-primary">Reset App to Defaults</p>
                <p className="text-body-xs text-text-muted">
                  Keeps your account but resets all settings to defaults.
                </p>
              </div>
            </div>
            <button
              onClick={() => setResetConfirmOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-button border border-border-default text-body-sm text-text-secondary hover:text-text-primary hover:bg-bg-secondary hover:border-border-focus transition-all"
            >
              <RefreshCw size={14} />
              Reset
            </button>
          </div>
        </div>
      </motion.div>

      {/* ── Privacy Promise Banner ── */}
      <motion.div
        variants={staggerItem}
        className="rounded-card-lg p-5 bg-accent-emerald-muted/20 border border-accent-emerald/20"
      >
        <div className="flex items-start gap-3">
          <Shield size={22} className="text-accent-emerald flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-body-md text-text-primary font-medium">
              Your data is yours. We never share, sell, or use your CV data for any purpose other than helping you find jobs.
            </p>
            <div className="flex items-center gap-1 mt-2">
              <Lock size={12} className="text-accent-emerald" />
              <p className="text-body-xs text-text-secondary">
                All data is encrypted in transit and at rest. API keys are never exposed to the frontend.
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Data Overview Stats ── */}
      <motion.div variants={staggerItem} className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Data', value: dataSize, icon: Database, color: 'text-accent-indigo' },
          { label: 'Records', value: `${recordCount} records`, icon: Briefcase, color: 'text-accent-cyan' },
          { label: 'Workspace', value: workspace ? 'Connected' : 'Loading', icon: Clock, color: 'text-accent-emerald' },
          { label: 'Last Export', value: 'Never', icon: Download, color: 'text-accent-violet' },
        ].map((stat) => (
          <div key={stat.label} className="p-4 rounded-card bg-bg-secondary border border-border-subtle">
            <stat.icon size={16} className={`${stat.color} mb-2`} />
            <p className="text-mono-md text-text-primary font-medium">{stat.value}</p>
            <p className="text-body-xs text-text-muted">{stat.label}</p>
          </div>
        ))}
      </motion.div>

      {/* ── Data Inventory ── */}
      <motion.div variants={staggerItem} className="space-y-3">
        <h2 className="font-heading text-heading-lg font-semibold text-text-primary">Data Inventory</h2>

        {dataSections.map((section) => {
          const isExpanded = expandedSection === section.id
          const SectionIcon = section.icon

          return (
            <motion.div
              key={section.id}
              layout
              className="rounded-card-lg border border-border-subtle bg-bg-secondary overflow-hidden"
            >
              {/* Header */}
              <div className="w-full flex items-center hover:bg-bg-tertiary/30 transition-colors">
                <button
                  type="button"
                  onClick={() => toggleSection(section.id)}
                  aria-expanded={isExpanded}
                  className="flex-1 min-w-0 flex items-center justify-between p-5 text-left"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <SectionIcon size={20} className="text-accent-indigo flex-shrink-0" />
                    <span className="font-heading text-heading-md font-semibold text-text-primary truncate">
                      {section.title}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-bg-tertiary text-text-muted text-mono-sm flex-shrink-0">
                      {section.count}
                    </span>
                  </div>
                  <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
                    <ChevronDown size={18} className="text-text-muted" />
                  </motion.div>
                </button>
                <button
                  type="button"
                  onClick={() => section.exportData()}
                  aria-label={`Export ${section.title}`}
                  className="mr-4 flex items-center gap-1.5 px-3 py-1.5 rounded-button-sm text-body-xs text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-colors"
                >
                  <Download size={12} />
                  Export
                </button>
              </div>

              {/* Expanded Content */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: easeOutExpo }}
                    className="overflow-hidden"
                  >
                    <div className="px-5 pb-5 space-y-4">
                      {/* Meta */}
                      <div className="flex flex-wrap gap-4 text-body-xs text-text-muted">
                        <span className="flex items-center gap-1">
                          <Clock size={12} />
                          Created: {section.created}
                        </span>
                        <span className="flex items-center gap-1">
                          <Eye size={12} />
                          Used in: {section.usedIn}
                        </span>
                      </div>

                      {/* Fields */}
                      <div className="border border-border-subtle rounded-card overflow-hidden">
                        {section.fields.map((field, idx) => (
                          <div
                            key={field.label + idx}
                            className={`flex items-center justify-between px-4 py-3 ${
                              idx < section.fields.length - 1 ? 'border-b border-border-subtle' : ''
                            } hover:bg-bg-tertiary/30 transition-colors`}
                          >
                            <span className="text-body-sm text-text-secondary font-medium">{field.label}</span>
                            <span className="text-body-sm text-text-primary text-right max-w-[60%] truncate">
                              {field.sensitive ? '••••••••' : field.value}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Section-level delete */}
                      <button
                        onClick={() => setDeleteConfirmOpen(true)}
                        className="flex items-center gap-2 text-body-xs text-accent-rose hover:text-accent-rose/80 transition-colors"
                      >
                        <Trash2 size={12} />
                        Delete this section&apos;s data
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )
        })}
      </motion.div>

      {/* ── Delete Confirmation Modal ── */}
      <AnimatePresence>
        {deleteConfirmOpen && (
          <ModalOverlay onClose={() => { setDeleteConfirmOpen(false); setDeleteConfirmText('') }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-accent-rose-muted flex items-center justify-center">
                <AlertTriangle size={20} className="text-accent-rose" />
              </div>
              <div>
                <h3 className="font-heading text-heading-lg font-semibold text-text-primary">Delete Data</h3>
                <p className="text-body-sm text-text-secondary">This action cannot be undone.</p>
              </div>
            </div>
            <p className="text-body-sm text-text-secondary mb-4">
              Type <span className="font-mono text-accent-rose font-medium">DELETE</span> to confirm.
            </p>
            <input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder='Type "DELETE" to confirm'
              className="w-full h-10 px-3 rounded-input bg-bg-tertiary border border-border-default text-sm text-text-primary placeholder:text-text-muted focus:border-accent-rose focus:outline-none mb-4"
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => { setDeleteConfirmOpen(false); setDeleteConfirmText('') }}
                className="px-4 py-2 rounded-button border border-border-default text-body-sm text-text-secondary hover:bg-bg-tertiary transition-colors"
              >
                Cancel
              </button>
              <button
                disabled={deleteConfirmText !== 'DELETE'}
                onClick={() => { setDeleteConfirmOpen(false); setDeleteConfirmText('') }}
                className="px-4 py-2 rounded-button bg-accent-rose text-white text-body-sm font-medium hover:bg-accent-rose/90 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                Delete Data
              </button>
            </div>
          </ModalOverlay>
        )}
      </AnimatePresence>

      {/* ── Delete ALL Confirmation Modal ── */}
      <AnimatePresence>
        {deleteAllOpen && (
          <ModalOverlay onClose={() => { setDeleteAllOpen(false); setDeleteAllText('') }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-accent-rose-muted flex items-center justify-center">
                <AlertTriangle size={20} className="text-accent-rose" />
              </div>
              <div>
                <h3 className="font-heading text-heading-lg font-semibold text-text-primary">Delete All Personal Data</h3>
                <p className="text-body-sm text-text-secondary">This is a destructive action.</p>
              </div>
            </div>
            <div className="p-3 rounded-lg bg-accent-rose-muted/20 border border-accent-rose/20 mb-4">
              <p className="text-body-sm text-accent-rose">
                All of your data will be permanently removed: profile, CVs, jobs, applications, projects, notifications, and settings.
                Your account will remain but will be empty.
              </p>
            </div>
            <p className="text-body-sm text-text-secondary mb-4">
              Type <span className="font-mono text-accent-rose font-medium">DELETE</span> to confirm.
            </p>
            <input
              type="text"
              value={deleteAllText}
              onChange={(e) => setDeleteAllText(e.target.value)}
              placeholder='Type "DELETE" to confirm'
              className="w-full h-10 px-3 rounded-input bg-bg-tertiary border border-border-default text-sm text-text-primary placeholder:text-text-muted focus:border-accent-rose focus:outline-none mb-4"
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => { setDeleteAllOpen(false); setDeleteAllText('') }}
                className="px-4 py-2 rounded-button border border-border-default text-body-sm text-text-secondary hover:bg-bg-tertiary transition-colors"
              >
                Cancel
              </button>
              <button
                disabled={deleteAllText !== 'DELETE'}
                onClick={handleDeleteAll}
                className="px-4 py-2 rounded-button bg-accent-rose text-white text-body-sm font-medium hover:bg-accent-rose/90 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                Permanently Delete All Data
              </button>
            </div>
          </ModalOverlay>
        )}
      </AnimatePresence>

      {/* ── Reset App Confirmation Modal ── */}
      <AnimatePresence>
        {resetConfirmOpen && (
          <ModalOverlay onClose={() => setResetConfirmOpen(false)}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-accent-amber-muted flex items-center justify-center">
                <RefreshCw size={20} className="text-accent-amber" />
              </div>
              <div>
                <h3 className="font-heading text-heading-lg font-semibold text-text-primary">Reset App to Defaults</h3>
                <p className="text-body-sm text-text-secondary">Your data will not be affected.</p>
              </div>
            </div>
            <p className="text-body-sm text-text-secondary mb-4">
              This will reset all settings (theme, notifications, search config) to their default values. Your profile data, jobs, CVs, and applications will remain intact.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setResetConfirmOpen(false)}
                className="px-4 py-2 rounded-button border border-border-default text-body-sm text-text-secondary hover:bg-bg-tertiary transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleResetApp}
                className="px-4 py-2 rounded-button bg-accent-amber text-bg-primary text-body-sm font-medium hover:bg-accent-amber/90 transition-colors"
              >
                Reset to Defaults
              </button>
            </div>
          </ModalOverlay>
        )}
      </AnimatePresence>

      <CvImportModal
        open={cvImportOpen}
        existingProfile={workspace?.profiles?.tech || {}}
        onClose={() => setCvImportOpen(false)}
        onApply={(mergedProfile) => handleCvProfileImport(mergedProfile)}
      />
    </motion.div>
  )
}

// ─────────────────────────────────────────────
// Modal Overlay Component
// ─────────────────────────────────────────────

function ModalOverlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
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
        className="relative bg-bg-elevated rounded-card-lg border border-border-subtle shadow-2xl w-full max-w-lg p-6"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-lg hover:bg-bg-tertiary text-text-muted hover:text-text-primary transition-colors"
        >
          <X size={18} />
        </button>
        {children}
      </motion.div>
    </motion.div>
  )
}
