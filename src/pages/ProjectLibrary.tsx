import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  FolderOpen, Plus, GitBranch, Globe, Eye, Pencil, Trash2, X, Check,
  Database, Cloud, Wand2, Sparkles, AlertTriangle, Briefcase, CheckCircle2,
  ExternalLink, Server, Palette
} from 'lucide-react'
// ─── Types ────────────────────────────────────
interface ProjectDetail {
  id: string
  name: string
  shortDescription: string
  description: string
  backendTech: string[]
  frontendTech: string[]
  database: string[]
  deployment: string[]
  apis: string[]
  features: string[]
  problemsSolved: string
  whatILearned: string
  githubUrl: string
  liveUrl: string
  jobTypes: string[]
  relevanceScore: number
  category: 'personal' | 'professional' | 'open_source' | 'academic'
  startDate: string
  endDate: string
  current: boolean
}

// ─── Tech Banner Gradients ────────────────────
const techGradients: Record<string, string> = {
  Java: 'from-orange-600/30 to-orange-800/20',
  'Spring Boot': 'from-emerald-600/30 to-emerald-800/20',
  React: 'from-cyan-600/30 to-blue-700/20',
  'Next.js': 'from-slate-600/30 to-slate-800/20',
  'Node.js': 'from-green-600/30 to-green-800/20',
  PostgreSQL: 'from-blue-600/30 to-indigo-800/20',
  MySQL: 'from-orange-500/30 to-yellow-700/20',
  MongoDB: 'from-green-500/30 to-emerald-700/20',
  Render: 'from-indigo-600/30 to-purple-800/20',
  Netlify: 'from-cyan-500/30 to-teal-700/20',
  Vercel: 'from-gray-600/30 to-gray-800/20',
  Twilio: 'from-red-600/30 to-pink-800/20',
  Docker: 'from-blue-500/30 to-cyan-700/20',
  Firebase: 'from-yellow-600/30 to-orange-700/20',
  default: 'from-indigo-600/20 to-purple-800/15',
}

function getTechGradient(techs: string[]): string {
  for (const t of techs) {
    if (techGradients[t]) return techGradients[t]
  }
  return techGradients.default
}

// ─── Mock Projects with Full Detail ───────────
const initialProjects: ProjectDetail[] = [
  {
    id: 'proj-001',
    name: 'MMS — SMS & Voice Call Web App',
    shortDescription: 'Full-stack communication app to send SMS, make/receive calls and track call history, built with Twilio.',
    description: 'A full-stack communication app that sends SMS, makes and receives voice calls, and tracks call history. Integrated Twilio APIs with dynamic callback URLs for both local and deployed environments, with backend call routing via TwiML and server-side error handling.',
    backendTech: ['Java', 'Spring Boot'],
    frontendTech: ['React'],
    database: ['MySQL'],
    deployment: ['Render', 'Vercel'],
    apis: ['Twilio (SMS & Voice)', 'REST APIs', 'TwiML'],
    features: [
      'Send SMS and make/receive calls with full call-history tracking',
      'Twilio APIs integrated with dynamic callback URLs (local + deployed)',
      'Backend call routing with TwiML and server-side error handling',
      'Responsive UI with accessibility, dark mode and animated feedback',
    ],
    problemsSolved: 'Provides an integrated SMS and voice communication tool, handling both outbound and inbound telephony with reliable call tracking.',
    whatILearned: 'Gained hands-on experience integrating the Twilio API, handling telephony webhooks and callback URLs across environments, and building an accessible, responsive React frontend on a Spring Boot backend.',
    githubUrl: 'https://github.com/example',
    liveUrl: '',
    jobTypes: ['Full-Stack Developer', 'Java Developer', 'API Integration Roles', 'React Developer'],
    relevanceScore: 92,
    category: 'personal',
    startDate: '2025-01',
    endDate: '',
    current: false,
  },
  {
    id: 'proj-002',
    name: 'Hair Salon Booking System (Final Year Project)',
    shortDescription: 'Secure appointment booking platform with admin/user roles and login authentication — BSc final-year project.',
    description: 'A secure full-stack appointment booking platform with admin and user roles and login authentication, built as my BSc final-year individual project. Focused on optimised relational database design and clean, modular architecture.',
    backendTech: ['Java', 'Spring Boot'],
    frontendTech: ['React'],
    database: ['MySQL'],
    deployment: ['Render'],
    apis: ['REST APIs'],
    features: [
      'Secure appointment booking with admin/user roles',
      'Login authentication and access control',
      'Relational database schemas designed and optimised for performance',
      'Clean architecture and modular code practices',
    ],
    problemsSolved: 'Digitises salon appointment scheduling with secure role-based access, giving owners control over bookings and customers an easy way to book.',
    whatILearned: 'Learned to design and optimise relational schemas, implement authentication, and structure a maintainable full-stack Java/Spring Boot application.',
    githubUrl: 'https://github.com/example',
    liveUrl: '',
    jobTypes: ['Java Developer', 'Backend Developer', 'Full-Stack Developer', 'Spring Boot Developer'],
    relevanceScore: 90,
    category: 'personal',
    startDate: '2023-10',
    endDate: '2024-05',
    current: false,
  },
  {
    id: 'proj-003',
    name: 'E-Learning Platform — "Coding for All" (Group Project)',
    shortDescription: 'Team-built coding-lessons web app using agile methodology, with React and Spring Boot.',
    description: 'A coding-lesson web app built as part of a team using agile methodology, as a second-year group project. Developed multiple frontend components and API integrations and contributed to sprint planning and a collaborative Git workflow.',
    backendTech: ['Java', 'Spring Boot'],
    frontendTech: ['React'],
    database: ['MySQL'],
    deployment: [],
    apis: ['REST APIs'],
    features: [
      'Coding-lesson web app built collaboratively in a team',
      'Multiple frontend components and API integrations',
      'Agile methodology with sprint planning',
      'Collaborative Git workflow',
    ],
    problemsSolved: 'Provides an accessible platform for learning to code, built to be scalable with a focus on user experience.',
    whatILearned: 'Developed teamwork and agile skills, learned collaborative Git workflows, and practised building frontend components against a shared Spring Boot API.',
    githubUrl: 'https://github.com/example',
    liveUrl: '',
    jobTypes: ['Full-Stack Developer', 'React Developer', 'Graduate Developer', 'Java Developer'],
    relevanceScore: 82,
    category: 'personal',
    startDate: '2022-10',
    endDate: '2023-05',
    current: false,
  },
]

// ─── Filter Options ───────────────────────────
const filterOptions = [
  { label: 'All', value: 'all' },
  { label: 'Java', value: 'Java' },
  { label: 'Spring Boot', value: 'Spring Boot' },
  { label: 'React', value: 'React' },
  { label: 'SQL', value: 'SQL' },
  { label: 'Full-Stack', value: 'Full-Stack' },
  { label: 'Backend', value: 'Backend' },
  { label: 'API Integration', value: 'API' },
]

// ─── Zod Schema ───────────────────────────────
const projectSchema = z.object({
  name: z.string().min(1, 'Project name is required').max(100),
  shortDescription: z.string().min(1, 'Short description is required').max(200),
  description: z.string().min(1, 'Description is required'),
  backendTech: z.string().optional(),
  frontendTech: z.string().optional(),
  database: z.string().optional(),
  deployment: z.string().optional(),
  apis: z.string().optional(),
  githubUrl: z.string().optional(),
  liveUrl: z.string().optional(),
  features: z.string().min(1, 'At least one feature is required'),
  problemsSolved: z.string().optional(),
  whatILearned: z.string().optional(),
})

// ─── Animation ────────────────────────────────
const easeOut = [0.16, 1, 0.3, 1] as [number, number, number, number]
const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.35, ease: easeOut } }),
}

// ─── Components ───────────────────────────────
function TechPill({ name, small = false }: { name: string; small?: boolean }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-bg-secondary/80 text-text-secondary backdrop-blur-sm ${small ? 'px-2 py-[2px] text-[10px]' : ''}`}>
      {name}
    </span>
  )
}

function BestForPill({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-accent-indigo-muted text-accent-indigo">
      <Briefcase size={9} /> {label}
    </span>
  )
}

function ConfirmationDialog({ open, title, message, onConfirm, onCancel }: { open: boolean; title: string; message: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onCancel}>
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} transition={{ duration: 0.2, ease: easeOut }} className="bg-bg-elevated rounded-card-lg border border-border-subtle p-6 max-w-md w-[90%] shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-accent-rose-muted flex items-center justify-center"><AlertTriangle size={20} className="text-accent-rose" /></div>
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

export default function ProjectLibrary() {
  const [projects, setProjects] = useState<ProjectDetail[]>(initialProjects)
  const [activeFilter, setActiveFilter] = useState('all')
  const [selectedProject, setSelectedProject] = useState<ProjectDetail | null>(null)
  const [editingProject, setEditingProject] = useState<ProjectDetail | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [deleteProjectId, setDeleteProjectId] = useState<string | null>(null)

  // Filter projects
  const filteredProjects = useMemo(() => {
    if (activeFilter === 'all') return projects
    return projects.filter(p => {
      const allTech = [...p.backendTech, ...p.frontendTech, ...p.database, ...p.apis, ...p.deployment]
      const allText = `${p.name} ${p.shortDescription} ${p.description} ${allTech.join(' ')} ${p.jobTypes.join(' ')}`.toLowerCase()
      return allText.includes(activeFilter.toLowerCase()) ||
        allTech.some(t => t.toLowerCase().includes(activeFilter.toLowerCase())) ||
        p.jobTypes.some(j => j.toLowerCase().includes(activeFilter.toLowerCase()))
    })
  }, [projects, activeFilter])

  // Form
  const addForm = useForm({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: '', shortDescription: '', description: '',
      backendTech: '', frontendTech: '', database: '', deployment: '', apis: '',
      githubUrl: '', liveUrl: '', features: '', problemsSolved: '', whatILearned: '',
    },
  })

  const editForm = useForm({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: '', shortDescription: '', description: '',
      backendTech: '', frontendTech: '', database: '', deployment: '', apis: '',
      githubUrl: '', liveUrl: '', features: '', problemsSolved: '', whatILearned: '',
    },
  })

  const openEditModal = (project: ProjectDetail) => {
    setEditingProject(project)
    editForm.reset({
      name: project.name,
      shortDescription: project.shortDescription,
      description: project.description,
      backendTech: project.backendTech.join(', '),
      frontendTech: project.frontendTech.join(', '),
      database: project.database.join(', '),
      deployment: project.deployment.join(', '),
      apis: project.apis.join(', '),
      githubUrl: project.githubUrl,
      liveUrl: project.liveUrl,
      features: project.features.join('\n'),
      problemsSolved: project.problemsSolved,
      whatILearned: project.whatILearned,
    })
  }

  const onAddSubmit = addForm.handleSubmit((data) => {
    const newProject: ProjectDetail = {
      id: `proj-${Date.now()}`,
      name: data.name,
      shortDescription: data.shortDescription,
      description: data.description,
      backendTech: data.backendTech ? data.backendTech.split(',').map(t => t.trim()).filter(Boolean) : [],
      frontendTech: data.frontendTech ? data.frontendTech.split(',').map(t => t.trim()).filter(Boolean) : [],
      database: data.database ? data.database.split(',').map(t => t.trim()).filter(Boolean) : [],
      deployment: data.deployment ? data.deployment.split(',').map(t => t.trim()).filter(Boolean) : [],
      apis: data.apis ? data.apis.split(',').map(t => t.trim()).filter(Boolean) : [],
      features: data.features.split('\n').map(f => f.trim()).filter(f => f.startsWith('-') ? f : `-${f}`).map(f => f.replace(/^- /, '').replace(/^-/, '')),
      problemsSolved: data.problemsSolved || '',
      whatILearned: data.whatILearned || '',
      githubUrl: data.githubUrl || '',
      liveUrl: data.liveUrl || '',
      jobTypes: ['Full-Stack Developer'],
      relevanceScore: 70,
      category: 'personal',
      startDate: '',
      endDate: '',
      current: false,
    }
    setProjects(prev => [...prev, newProject])
    setShowAddModal(false)
    addForm.reset()
  })

  const onEditSubmit = editForm.handleSubmit((data) => {
    if (!editingProject) return
    setProjects(prev => prev.map(p => p.id === editingProject.id ? {
      ...p,
      name: data.name,
      shortDescription: data.shortDescription,
      description: data.description,
      backendTech: data.backendTech ? data.backendTech.split(',').map(t => t.trim()).filter(Boolean) : [],
      frontendTech: data.frontendTech ? data.frontendTech.split(',').map(t => t.trim()).filter(Boolean) : [],
      database: data.database ? data.database.split(',').map(t => t.trim()).filter(Boolean) : [],
      deployment: data.deployment ? data.deployment.split(',').map(t => t.trim()).filter(Boolean) : [],
      apis: data.apis ? data.apis.split(',').map(t => t.trim()).filter(Boolean) : [],
      features: data.features.split('\n').map(f => f.trim()).filter(Boolean).map(f => f.replace(/^- /, '').replace(/^-/, '')),
      problemsSolved: data.problemsSolved || '',
      whatILearned: data.whatILearned || '',
      githubUrl: data.githubUrl || '',
      liveUrl: data.liveUrl || '',
    } : p))
    setEditingProject(null)
  })

  const handleDelete = (id: string) => {
    setProjects(prev => prev.filter(p => p.id !== id))
    setDeleteProjectId(null)
    if (selectedProject?.id === id) setSelectedProject(null)
  }

  const getAllTech = (p: ProjectDetail) => [...p.backendTech, ...p.frontendTech, ...p.database, ...p.deployment]

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={0} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-[28px] font-semibold text-text-primary">Project Library</h1>
          <p className="text-sm text-text-secondary mt-1">{projects.length} projects · AI picks the best ones for each job</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowAddModal(true)} className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-accent-indigo text-white text-sm font-medium hover:bg-accent-indigo-hover transition-colors shadow-lg shadow-accent-indigo/20">
            <Plus size={15} /> Add Project
          </button>
          <button className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-medium border border-border-default text-text-secondary hover:bg-bg-tertiary transition-colors">
            <GitBranch size={15} /> Import from GitHub
          </button>
        </div>
      </motion.div>

      {/* Filter Tabs */}
      <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={1} className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {filterOptions.map(opt => {
          const count = opt.value === 'all' ? projects.length : projects.filter(p => {
            const allTech = [...p.backendTech, ...p.frontendTech, ...p.database, ...p.apis, ...p.deployment]
            const allText = `${p.name} ${p.shortDescription} ${allTech.join(' ')} ${p.jobTypes.join(' ')}`.toLowerCase()
            return allText.includes(opt.value.toLowerCase())
          }).length
          return (
            <button
              key={opt.value}
              onClick={() => setActiveFilter(opt.value)}
              className={`relative flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-all flex-shrink-0 ${
                activeFilter === opt.value ? 'bg-accent-indigo-muted text-accent-indigo' : 'bg-bg-tertiary text-text-secondary hover:text-text-primary'
              }`}
            >
              {opt.label}
              <span className={`font-mono text-[10px] ${activeFilter === opt.value ? 'text-accent-indigo/70' : 'text-text-muted'}`}>{count}</span>
            </button>
          )
        })}
      </motion.div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        <AnimatePresence mode="popLayout">
          {filteredProjects.map((project, i) => (
            <motion.div
              key={project.id}
              layout
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
              custom={i}
              className="rounded-card bg-bg-secondary border border-border-subtle hover:border-accent-indigo hover:shadow-[0_8px_24px_rgba(99,102,241,0.1)] hover:-translate-y-1 transition-all group cursor-pointer overflow-hidden"
              onClick={() => setSelectedProject(project)}
            >
              {/* Tech Stack Banner */}
              <div className={`h-12 bg-gradient-to-r ${getTechGradient(getAllTech(project))} flex items-center gap-2 px-4 overflow-x-auto scrollbar-hide`}>
                {getAllTech(project).slice(0, 4).map(t => <TechPill key={t} name={t} small />)}
                {getAllTech(project).length > 4 && <TechPill name={`+${getAllTech(project).length - 4}`} small />}
              </div>

              {/* Content */}
              <div className="p-5">
                <h3 className="font-heading text-[18px] font-semibold text-text-primary group-hover:text-accent-indigo transition-colors">{project.name}</h3>
                <p className="text-sm text-text-secondary mt-1.5 line-clamp-2 leading-relaxed">{project.shortDescription}</p>

                {/* Relevance Tags */}
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {getAllTech(project).slice(0, 5).map(t => (
                    <span key={t} className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-bg-tertiary text-text-secondary">{t}</span>
                  ))}
                </div>

                {/* Best For */}
                <div className="mt-3">
                  <span className="text-[10px] text-text-muted font-medium">Best for:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {project.jobTypes.slice(0, 3).map(jt => <BestForPill key={jt} label={jt} />)}
                    {project.jobTypes.length > 3 && <span className="text-[10px] text-text-muted px-1">+{project.jobTypes.length - 3}</span>}
                  </div>
                </div>

                {/* Links */}
                <div className="flex items-center gap-3 mt-3">
                  {project.githubUrl && (
                    <a href={project.githubUrl} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="flex items-center gap-1 text-[11px] text-text-muted hover:text-accent-indigo transition-colors">
                      <GitBranch size={11} /> Source
                    </a>
                  )}
                  {project.liveUrl && (
                    <a href={project.liveUrl} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="flex items-center gap-1 text-[11px] text-text-muted hover:text-accent-emerald transition-colors">
                      <Globe size={11} /> Live
                    </a>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 mt-3 pt-3 border-t border-border-subtle">
                  <button onClick={(e) => { e.stopPropagation(); setSelectedProject(project) }} className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-colors">
                    <Eye size={11} /> View
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); openEditModal(project) }} className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-colors">
                    <Pencil size={11} /> Edit
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); setDeleteProjectId(project.id) }} className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] text-text-muted hover:text-accent-rose hover:bg-accent-rose-muted transition-colors ml-auto">
                    <Trash2 size={11} /> Delete
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Empty State */}
      {filteredProjects.length === 0 && (
        <motion.div variants={fadeUp} initial="hidden" animate="visible" className="text-center py-16 rounded-card bg-bg-secondary border border-border-subtle">
          <FolderOpen size={56} className="text-text-muted mx-auto mb-4 opacity-40" />
          <h3 className="font-heading text-lg font-semibold text-text-secondary mb-2">No projects found</h3>
          <p className="text-sm text-text-muted mb-6 max-w-sm mx-auto">No projects match the selected filter. Try a different filter or add a new project.</p>
          <div className="flex gap-3 justify-center">
            <button onClick={() => setActiveFilter('all')} className="px-4 py-2 rounded-lg text-sm font-medium border border-border-default text-text-secondary hover:bg-bg-tertiary transition-colors">Show All</button>
            <button onClick={() => setShowAddModal(true)} className="px-4 py-2 rounded-lg text-sm font-medium bg-accent-indigo text-white hover:bg-accent-indigo-hover transition-colors">Add Project</button>
          </div>
        </motion.div>
      )}

      {/* ─── Project Detail Modal ─── */}
      <AnimatePresence>
        {selectedProject && !editingProject && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setSelectedProject(null)}>
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} transition={{ duration: 0.25, ease: easeOut }} className="bg-bg-elevated rounded-card-lg border border-border-subtle max-w-3xl w-full max-h-[90vh] shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
              {/* Modal Header */}
              <div className="flex items-start justify-between p-6 border-b border-border-subtle flex-shrink-0">
                <div>
                  <h2 className="font-heading text-2xl font-semibold text-text-primary">{selectedProject.name}</h2>
                  <p className="text-sm text-text-secondary mt-1">{selectedProject.shortDescription}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button onClick={() => openEditModal(selectedProject)} className="p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-colors">
                    <Pencil size={16} />
                  </button>
                  <button onClick={() => setSelectedProject(null)} className="p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-colors">
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Modal Content */}
              <div className="p-6 overflow-y-auto space-y-6">
                {/* Tech Stack */}
                <div>
                  <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">Technology Stack</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {selectedProject.backendTech.length > 0 && (
                      <div className="flex items-start gap-2.5 p-3 rounded-lg bg-bg-tertiary/50 border border-border-subtle">
                        <Server size={14} className="text-accent-indigo mt-0.5 flex-shrink-0" />
                        <div><span className="text-[10px] text-text-muted uppercase">Backend</span><div className="flex flex-wrap gap-1 mt-1">{selectedProject.backendTech.map(t => <TechPill key={t} name={t} />)}</div></div>
                      </div>
                    )}
                    {selectedProject.frontendTech.length > 0 && (
                      <div className="flex items-start gap-2.5 p-3 rounded-lg bg-bg-tertiary/50 border border-border-subtle">
                        <Palette size={14} className="text-accent-cyan mt-0.5 flex-shrink-0" />
                        <div><span className="text-[10px] text-text-muted uppercase">Frontend</span><div className="flex flex-wrap gap-1 mt-1">{selectedProject.frontendTech.map(t => <TechPill key={t} name={t} />)}</div></div>
                      </div>
                    )}
                    {selectedProject.database.length > 0 && (
                      <div className="flex items-start gap-2.5 p-3 rounded-lg bg-bg-tertiary/50 border border-border-subtle">
                        <Database size={14} className="text-accent-emerald mt-0.5 flex-shrink-0" />
                        <div><span className="text-[10px] text-text-muted uppercase">Database</span><div className="flex flex-wrap gap-1 mt-1">{selectedProject.database.map(t => <TechPill key={t} name={t} />)}</div></div>
                      </div>
                    )}
                    {selectedProject.deployment.length > 0 && (
                      <div className="flex items-start gap-2.5 p-3 rounded-lg bg-bg-tertiary/50 border border-border-subtle">
                        <Cloud size={14} className="text-accent-violet mt-0.5 flex-shrink-0" />
                        <div><span className="text-[10px] text-text-muted uppercase">Deployment</span><div className="flex flex-wrap gap-1 mt-1">{selectedProject.deployment.map(t => <TechPill key={t} name={t} />)}</div></div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Description */}
                <div>
                  <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Description</h4>
                  <p className="text-sm text-text-secondary leading-relaxed">{selectedProject.description}</p>
                </div>

                {/* Features */}
                <div>
                  <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Key Features</h4>
                  <ul className="space-y-1.5">
                    {selectedProject.features.map((f, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-text-secondary">
                        <CheckCircle2 size={14} className="text-accent-emerald mt-0.5 flex-shrink-0" /> {f}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Problems Solved */}
                <div className="p-4 rounded-xl bg-accent-indigo-muted/50 border border-accent-indigo/20">
                  <h4 className="flex items-center gap-1.5 text-xs font-semibold text-accent-indigo uppercase tracking-wider mb-2">
                    <Sparkles size={12} /> Problems Solved
                  </h4>
                  <p className="text-sm text-text-secondary leading-relaxed">{selectedProject.problemsSolved}</p>
                </div>

                {/* What I Learned */}
                <div className="p-4 rounded-xl bg-accent-cyan-muted/50 border border-accent-cyan/20">
                  <h4 className="flex items-center gap-1.5 text-xs font-semibold text-accent-cyan uppercase tracking-wider mb-2">
                    <Wand2 size={12} /> What I Learned
                  </h4>
                  <p className="text-sm text-text-secondary leading-relaxed">{selectedProject.whatILearned}</p>
                </div>

                {/* Links */}
                <div className="flex items-center gap-4">
                  {selectedProject.githubUrl && (
                    <a href={selectedProject.githubUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-sm text-accent-indigo hover:underline">
                      <GitBranch size={14} /> View Source <ExternalLink size={10} />
                    </a>
                  )}
                  {selectedProject.liveUrl && (
                    <a href={selectedProject.liveUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-sm text-accent-emerald hover:underline">
                      <Globe size={14} /> Live Demo <ExternalLink size={10} />
                    </a>
                  )}
                </div>

                {/* Job Type Relevance */}
                <div>
                  <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Best For These Roles</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedProject.jobTypes.map(jt => <BestForPill key={jt} label={jt} />)}
                  </div>
                </div>

                {/* AI Relevance Note */}
                <div className="p-3 rounded-lg bg-bg-tertiary border border-border-subtle">
                  <p className="text-xs text-text-secondary">
                    <span className="font-medium text-accent-indigo">AI Relevance:</span> This project is most relevant for {selectedProject.jobTypes.slice(0, 3).join(', ')} roles based on its tech stack.
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Add Project Modal ─── */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setShowAddModal(false)}>
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} transition={{ duration: 0.25, ease: easeOut }} className="bg-bg-elevated rounded-card-lg border border-border-subtle max-w-2xl w-full max-h-[90vh] shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between p-5 border-b border-border-subtle flex-shrink-0">
                <h3 className="font-heading text-lg font-semibold text-text-primary">Add New Project</h3>
                <button onClick={() => setShowAddModal(false)} className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-colors"><X size={18} /></button>
              </div>
              <form onSubmit={onAddSubmit} className="p-5 overflow-y-auto space-y-4 flex-1">
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">Project Name *</label>
                  <input {...addForm.register('name')} className="w-full px-3 py-2 rounded-lg bg-bg-tertiary border border-border-default text-sm text-text-primary placeholder:text-text-muted focus:border-accent-indigo focus:ring-2 focus:ring-accent-indigo/15 transition-all" placeholder="e.g., E-Commerce API" />
                  {addForm.formState.errors.name && <p className="text-xs text-accent-rose mt-1">{addForm.formState.errors.name.message}</p>}
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">Short Description *</label>
                  <input {...addForm.register('shortDescription')} className="w-full px-3 py-2 rounded-lg bg-bg-tertiary border border-border-default text-sm text-text-primary placeholder:text-text-muted focus:border-accent-indigo focus:ring-2 focus:ring-accent-indigo/15 transition-all" placeholder="One-line summary (max 200 chars)" />
                  {addForm.formState.errors.shortDescription && <p className="text-xs text-accent-rose mt-1">{addForm.formState.errors.shortDescription.message}</p>}
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">Full Description *</label>
                  <textarea {...addForm.register('description')} rows={3} className="w-full px-3 py-2 rounded-lg bg-bg-tertiary border border-border-default text-sm text-text-primary placeholder:text-text-muted focus:border-accent-indigo focus:ring-2 focus:ring-accent-indigo/15 transition-all resize-y" placeholder="Detailed project description" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><label className="block text-xs font-medium text-text-secondary mb-1">Backend Technologies</label><input {...addForm.register('backendTech')} placeholder="e.g., Java, Spring Boot" className="w-full px-3 py-2 rounded-lg bg-bg-tertiary border border-border-default text-sm text-text-primary placeholder:text-text-muted focus:border-accent-indigo transition-all" /></div>
                  <div><label className="block text-xs font-medium text-text-secondary mb-1">Frontend Technologies</label><input {...addForm.register('frontendTech')} placeholder="e.g., React, Tailwind CSS" className="w-full px-3 py-2 rounded-lg bg-bg-tertiary border border-border-default text-sm text-text-primary placeholder:text-text-muted focus:border-accent-indigo transition-all" /></div>
                  <div><label className="block text-xs font-medium text-text-secondary mb-1">Database</label><input {...addForm.register('database')} placeholder="e.g., MySQL, PostgreSQL" className="w-full px-3 py-2 rounded-lg bg-bg-tertiary border border-border-default text-sm text-text-primary placeholder:text-text-muted focus:border-accent-indigo transition-all" /></div>
                  <div><label className="block text-xs font-medium text-text-secondary mb-1">Deployment</label><input {...addForm.register('deployment')} placeholder="e.g., Render, AWS" className="w-full px-3 py-2 rounded-lg bg-bg-tertiary border border-border-default text-sm text-text-primary placeholder:text-text-muted focus:border-accent-indigo transition-all" /></div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">APIs & Integrations</label>
                  <input {...addForm.register('apis')} placeholder="e.g., REST APIs, Twilio, JWT" className="w-full px-3 py-2 rounded-lg bg-bg-tertiary border border-border-default text-sm text-text-primary placeholder:text-text-muted focus:border-accent-indigo transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">Key Features * (one per line, starting with -)</label>
                  <textarea {...addForm.register('features')} rows={4} className="w-full px-3 py-2 rounded-lg bg-bg-tertiary border border-border-default text-sm text-text-primary placeholder:text-text-muted focus:border-accent-indigo focus:ring-2 focus:ring-accent-indigo/15 transition-all resize-y font-mono" placeholder="- Feature one&#10;- Feature two&#10;- Feature three" />
                  {addForm.formState.errors.features && <p className="text-xs text-accent-rose mt-1">{addForm.formState.errors.features.message}</p>}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><label className="block text-xs font-medium text-text-secondary mb-1">GitHub URL</label><input {...addForm.register('githubUrl')} placeholder="github.com/..." className="w-full px-3 py-2 rounded-lg bg-bg-tertiary border border-border-default text-sm text-text-primary placeholder:text-text-muted focus:border-accent-indigo transition-all" /></div>
                  <div><label className="block text-xs font-medium text-text-secondary mb-1">Live Demo URL</label><input {...addForm.register('liveUrl')} placeholder="https://..." className="w-full px-3 py-2 rounded-lg bg-bg-tertiary border border-border-default text-sm text-text-primary placeholder:text-text-muted focus:border-accent-indigo transition-all" /></div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">Problems Solved</label>
                  <textarea {...addForm.register('problemsSolved')} rows={2} className="w-full px-3 py-2 rounded-lg bg-bg-tertiary border border-border-default text-sm text-text-primary placeholder:text-text-muted focus:border-accent-indigo focus:ring-2 focus:ring-accent-indigo/15 transition-all resize-y" placeholder="What real-world problem does this solve?" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">What I Learned</label>
                  <textarea {...addForm.register('whatILearned')} rows={2} className="w-full px-3 py-2 rounded-lg bg-bg-tertiary border border-border-default text-sm text-text-primary placeholder:text-text-muted focus:border-accent-indigo focus:ring-2 focus:ring-accent-indigo/15 transition-all resize-y" placeholder="Key learnings from building this project" />
                </div>
              </form>
              <div className="flex justify-end gap-3 p-5 border-t border-border-subtle flex-shrink-0">
                <button onClick={() => setShowAddModal(false)} className="px-4 py-2 rounded-lg text-sm text-text-secondary hover:bg-bg-tertiary transition-colors">Cancel</button>
                <button onClick={onAddSubmit} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-accent-indigo text-white text-sm font-medium hover:bg-accent-indigo-hover transition-colors">
                  <Check size={14} /> Save Project
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Edit Project Modal ─── */}
      <AnimatePresence>
        {editingProject && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setEditingProject(null)}>
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} transition={{ duration: 0.25, ease: easeOut }} className="bg-bg-elevated rounded-card-lg border border-border-subtle max-w-2xl w-full max-h-[90vh] shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between p-5 border-b border-border-subtle flex-shrink-0">
                <h3 className="font-heading text-lg font-semibold text-text-primary">Edit Project</h3>
                <button onClick={() => setEditingProject(null)} className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-colors"><X size={18} /></button>
              </div>
              <form onSubmit={onEditSubmit} className="p-5 overflow-y-auto space-y-4 flex-1">
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">Project Name *</label>
                  <input {...editForm.register('name')} className="w-full px-3 py-2 rounded-lg bg-bg-tertiary border border-border-default text-sm text-text-primary focus:border-accent-indigo transition-all" />
                  {editForm.formState.errors.name && <p className="text-xs text-accent-rose mt-1">{editForm.formState.errors.name.message}</p>}
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">Short Description *</label>
                  <input {...editForm.register('shortDescription')} className="w-full px-3 py-2 rounded-lg bg-bg-tertiary border border-border-default text-sm text-text-primary focus:border-accent-indigo transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">Full Description *</label>
                  <textarea {...editForm.register('description')} rows={3} className="w-full px-3 py-2 rounded-lg bg-bg-tertiary border border-border-default text-sm text-text-primary focus:border-accent-indigo transition-all resize-y" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><label className="block text-xs font-medium text-text-secondary mb-1">Backend Technologies (comma-separated)</label><input {...editForm.register('backendTech')} className="w-full px-3 py-2 rounded-lg bg-bg-tertiary border border-border-default text-sm text-text-primary focus:border-accent-indigo transition-all" /></div>
                  <div><label className="block text-xs font-medium text-text-secondary mb-1">Frontend Technologies (comma-separated)</label><input {...editForm.register('frontendTech')} className="w-full px-3 py-2 rounded-lg bg-bg-tertiary border border-border-default text-sm text-text-primary focus:border-accent-indigo transition-all" /></div>
                  <div><label className="block text-xs font-medium text-text-secondary mb-1">Database (comma-separated)</label><input {...editForm.register('database')} className="w-full px-3 py-2 rounded-lg bg-bg-tertiary border border-border-default text-sm text-text-primary focus:border-accent-indigo transition-all" /></div>
                  <div><label className="block text-xs font-medium text-text-secondary mb-1">Deployment (comma-separated)</label><input {...editForm.register('deployment')} className="w-full px-3 py-2 rounded-lg bg-bg-tertiary border border-border-default text-sm text-text-primary focus:border-accent-indigo transition-all" /></div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">APIs & Integrations</label>
                  <input {...editForm.register('apis')} className="w-full px-3 py-2 rounded-lg bg-bg-tertiary border border-border-default text-sm text-text-primary focus:border-accent-indigo transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">Key Features (one per line)</label>
                  <textarea {...editForm.register('features')} rows={4} className="w-full px-3 py-2 rounded-lg bg-bg-tertiary border border-border-default text-sm text-text-primary focus:border-accent-indigo transition-all resize-y font-mono" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><label className="block text-xs font-medium text-text-secondary mb-1">GitHub URL</label><input {...editForm.register('githubUrl')} className="w-full px-3 py-2 rounded-lg bg-bg-tertiary border border-border-default text-sm text-text-primary focus:border-accent-indigo transition-all" /></div>
                  <div><label className="block text-xs font-medium text-text-secondary mb-1">Live Demo URL</label><input {...editForm.register('liveUrl')} className="w-full px-3 py-2 rounded-lg bg-bg-tertiary border border-border-default text-sm text-text-primary focus:border-accent-indigo transition-all" /></div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">Problems Solved</label>
                  <textarea {...editForm.register('problemsSolved')} rows={2} className="w-full px-3 py-2 rounded-lg bg-bg-tertiary border border-border-default text-sm text-text-primary focus:border-accent-indigo transition-all resize-y" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">What I Learned</label>
                  <textarea {...editForm.register('whatILearned')} rows={2} className="w-full px-3 py-2 rounded-lg bg-bg-tertiary border border-border-default text-sm text-text-primary focus:border-accent-indigo transition-all resize-y" />
                </div>
              </form>
              <div className="flex justify-between p-5 border-t border-border-subtle flex-shrink-0">
                <button onClick={() => { setDeleteProjectId(editingProject.id); setEditingProject(null) }} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm text-accent-rose hover:bg-accent-rose-muted transition-colors">
                  <Trash2 size={14} /> Delete
                </button>
                <div className="flex gap-3">
                  <button onClick={() => setEditingProject(null)} className="px-4 py-2 rounded-lg text-sm text-text-secondary hover:bg-bg-tertiary transition-colors">Cancel</button>
                  <button onClick={onEditSubmit} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-accent-indigo text-white text-sm font-medium hover:bg-accent-indigo-hover transition-colors">
                    <Check size={14} /> Save Changes
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Delete Confirmation ─── */}
      <ConfirmationDialog
        open={!!deleteProjectId}
        title="Delete Project"
        message="This will permanently delete this project from your library. This action cannot be undone."
        onConfirm={() => deleteProjectId && handleDelete(deleteProjectId)}
        onCancel={() => setDeleteProjectId(null)}
      />
    </div>
  )
}
