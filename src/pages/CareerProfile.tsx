import { useState, useRef, useCallback, useMemo, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion, AnimatePresence } from 'framer-motion'
import {
  User, GraduationCap, Code, Briefcase, FolderOpen, Target, Sparkles,
  Pencil, Trash2, Download, Upload, Plus, MoreHorizontal, Eraser, X,
  MapPin, Mail, Phone, Globe, Link2, ChevronDown, AlertTriangle, Eye,
  FileText, BookOpenCheck,
  CheckCircle2, XCircle, Save
} from 'lucide-react'
import { mockUserProfile, mockProjects } from '@/data/mockData'

// ─── Types ────────────────────────────────────
type SectionId = 'personal' | 'education' | 'skills' | 'experience' | 'projects' | 'preferences' | 'goals' | 'answers'

interface EducationEntry {
  id: string
  institution: string
  degree: string
  field: string
  startDate: string
  endDate: string
  current: boolean
  grade: string
  modules: string[]
}

interface ExperienceEntry {
  id: string
  company: string
  role: string
  startDate: string
  endDate: string
  current: boolean
  description: string
  technologies: string[]
  isTech: boolean
}

interface SkillGroup {
  category: string
  skills: { name: string; level: string }[]
}

interface ProjectLink {
  id: string
  name: string
  description: string
  url: string
  technologies: string[]
}

interface ProfileData {
  personal: {
    fullName: string
    email: string
    phone: string
    location: string
    rightToWork: string
    linkedin: string
    github: string
    portfolio: string
    summary: string
  }
  education: EducationEntry[]
  skills: SkillGroup[]
  experience: ExperienceEntry[]
  projects: ProjectLink[]
  preferences: {
    titles: string[]
    industries: string[]
    locations: string[]
    salaryMin: string
    salaryMax: string
    workArrangement: string[]
    seniority: string[]
    jobTypes: string[]
    rolesToAvoid: string[]
  }
  goals: {
    careerGoal: string
    skillsToLearn: string[]
  }
  answers: { question: string; answer: string }[]
}

// ─── Zod Schemas ──────────────────────────────
const personalSchema = z.object({
  fullName: z.string().min(1, 'Full name is required'),
  email: z.string().email('Invalid email'),
  phone: z.string().optional(),
  location: z.string().min(1, 'Location is required'),
  rightToWork: z.string().min(1, 'Required'),
  linkedin: z.string().optional(),
  github: z.string().optional(),
  portfolio: z.string().optional(),
  summary: z.string().max(1000, 'Max 1000 characters').optional(),
})

const educationSchema = z.object({
  institution: z.string().min(1, 'Institution is required'),
  degree: z.string().min(1, 'Degree is required'),
  field: z.string().min(1, 'Field is required'),
  startDate: z.string().min(1, 'Start date required'),
  endDate: z.string().optional(),
  current: z.boolean(),
  grade: z.string().optional(),
  modules: z.string().optional(),
})

const experienceSchema = z.object({
  company: z.string().min(1, 'Company is required'),
  role: z.string().min(1, 'Role is required'),
  startDate: z.string().min(1, 'Start date required'),
  endDate: z.string().optional(),
  current: z.boolean(),
  description: z.string().min(1, 'Description is required'),
  technologies: z.string().optional(),
  isTech: z.boolean(),
})

const skillSchema = z.object({
  skillInput: z.string().min(1, 'Skill name required'),
  category: z.string().min(1, 'Category required'),
  level: z.string().min(1, 'Level required'),
})

// ─── Initial Data ─────────────────────────────
const initialData: ProfileData = {
  personal: {
    fullName: mockUserProfile.full_name,
    email: mockUserProfile.email,
    phone: mockUserProfile.phone || '',
    location: mockUserProfile.location || '',
    rightToWork: 'UK Graduate Visa',
    linkedin: mockUserProfile.linkedin_url || '',
    github: mockUserProfile.github_url || '',
    portfolio: mockUserProfile.website || '',
    summary: mockUserProfile.summary || '',
  },
  education: [
    {
      id: 'edu-001',
      institution: 'Example University',
      degree: 'BSc',
      field: 'Computer Science',
      startDate: '2021-09',
      endDate: '2024-06',
      current: false,
      grade: '',
      modules: ['Software Development', 'Algorithms', 'Cybersecurity', 'AI', 'Networking'],
    },
    {
      id: 'edu-002',
      institution: 'Example College',
      degree: 'Access to HE Diploma',
      field: 'Electronics & Software Engineering',
      startDate: '2020-09',
      endDate: '2021-06',
      current: false,
      grade: 'Distinctions',
      modules: ['Programming', 'Project Management', 'Web Design'],
    },
  ],
  skills: [
    {
      category: 'Languages & Frameworks',
      skills: [
        { name: 'Java', level: 'Advanced' },
        { name: 'Spring Boot', level: 'Advanced' },
        { name: 'React.js', level: 'Advanced' },
        { name: 'JavaScript', level: 'Advanced' },
        { name: 'SQL', level: 'Intermediate' },
        { name: 'C#', level: 'Beginner' },
        { name: 'ASP.NET', level: 'Beginner' },
      ],
    },
    {
      category: 'Databases',
      skills: [
        { name: 'MySQL', level: 'Intermediate' },
        { name: 'PostgreSQL', level: 'Intermediate' },
        { name: 'SQL Server', level: 'Intermediate' },
      ],
    },
    {
      category: 'APIs & Cloud',
      skills: [
        { name: 'REST APIs', level: 'Advanced' },
        { name: 'Twilio (SMS & Voice)', level: 'Intermediate' },
        { name: 'Azure DevOps', level: 'Beginner' },
      ],
    },
    {
      category: 'Deployment & Tools',
      skills: [
        { name: 'Git', level: 'Advanced' },
        { name: 'GitHub', level: 'Advanced' },
        { name: 'Docker', level: 'Intermediate' },
        { name: 'Render', level: 'Intermediate' },
        { name: 'Vercel', level: 'Intermediate' },
        { name: 'Netlify', level: 'Intermediate' },
        { name: 'CI/CD', level: 'Beginner' },
      ],
    },
    {
      category: 'Development Concepts',
      skills: [
        { name: 'OOP', level: 'Advanced' },
        { name: 'MVC', level: 'Intermediate' },
        { name: 'Agile/Scrum', level: 'Intermediate' },
        { name: 'Microservices', level: 'Intermediate' },
        { name: 'Authentication', level: 'Intermediate' },
        { name: 'Version control', level: 'Advanced' },
      ],
    },
    {
      category: 'Debugging & Testing',
      skills: [
        { name: 'IntelliJ', level: 'Advanced' },
        { name: 'VS Code', level: 'Advanced' },
        { name: 'Postman', level: 'Intermediate' },
        { name: 'SonarCloud', level: 'Beginner' },
        { name: 'API testing', level: 'Intermediate' },
      ],
    },
  ],
  experience: [],
  projects: mockProjects.map(p => ({
    id: p.id,
    name: p.name,
    description: p.short_description || p.description,
    url: p.live_url || p.github_url || '',
    technologies: p.technologies,
  })),
  preferences: {
    titles: ['Junior Software Developer', 'Graduate Developer', 'Full Stack Developer', 'Backend Developer', 'Java Developer', 'React Developer'],
    industries: ['Technology', 'Public Sector', 'Finance'],
    locations: ['London', 'Remote', 'Hybrid'],
    salaryMin: '22000',
    salaryMax: '35000',
    workArrangement: ['Hybrid', 'Remote'],
    seniority: ['Entry-level', 'Graduate', 'Junior'],
    jobTypes: ['Full-time', 'Graduate Scheme'],
    rolesToAvoid: ['Senior', 'Lead', 'Principal', 'Manager', '5+ years experience'],
  },
  goals: {
    careerGoal: 'I aim to secure a junior software developer role where I can apply my full-stack Java and React skills, while advancing into C# and ASP.NET to broaden my backend expertise and grow into a well-rounded full-stack developer.',
    skillsToLearn: ['C#', 'ASP.NET', 'Azure DevOps', 'CI/CD', 'Cloud'],
  },
  answers: [
    { question: 'Why are you applying for this role?', answer: 'I am excited about the opportunity to contribute my Java and Spring Boot skills while continuing to grow as a developer. Your company\'s focus on innovation aligns with my passion for building impactful software.' },
    { question: 'What are your strengths?', answer: 'My key strengths include strong problem-solving abilities, a solid foundation in Java and Spring Boot, and the ability to quickly learn new technologies. I work well in collaborative team environments.' },
    { question: 'Where do you see yourself in 5 years?', answer: 'In 5 years, I see myself as a senior full-stack developer leading projects and mentoring junior developers. I want to deepen my expertise in cloud technologies and system design.' },
    { question: 'Why should we hire you?', answer: 'I bring a strong academic foundation, hands-on project experience with modern tech stacks, and genuine enthusiasm for software development. I am eager to learn and committed to delivering quality work.' },
  ],
}

// ─── Animation Constants ──────────────────────
const easeOut = [0.16, 1, 0.3, 1] as [number, number, number, number]
const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.06, duration: 0.35, ease: easeOut },
  }),
}

// ─── Sections Config ──────────────────────────
const sections: { id: SectionId; label: string; icon: React.ComponentType<{ size?: number; className?: string }> }[] = [
  { id: 'personal', label: 'Personal Info', icon: User },
  { id: 'education', label: 'Education', icon: GraduationCap },
  { id: 'skills', label: 'Skills & Tech', icon: Code },
  { id: 'experience', label: 'Experience', icon: Briefcase },
  { id: 'projects', label: 'Projects & Links', icon: FolderOpen },
  { id: 'preferences', label: 'Preferences', icon: Target },
  { id: 'goals', label: 'Career Goals', icon: Sparkles },
  { id: 'answers', label: 'Application Answers', icon: BookOpenCheck },
]

// ─── Helper Components ────────────────────────

function CircularProgress({ percentage, size = 60, strokeWidth = 4 }: { percentage: number; size?: number; strokeWidth?: number }) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (percentage / 100) * circumference

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(99,102,241,0.15)" strokeWidth={strokeWidth} />
        <motion.circle
          cx={size / 2} cy={size / 2} r={radius} fill="none"
          stroke="#6366F1" strokeWidth={strokeWidth} strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.8, ease: easeOut }}
        />
      </svg>
      <span className="absolute font-mono text-sm font-bold text-text-primary">{percentage}%</span>
    </div>
  )
}

function DataControlDropdown({
  onAdd,
  onEdit,
  onDelete,
  onExport,
  onClear,
}: {
  onAdd: () => void
  onEdit: () => void
  onDelete: () => void
  onExport: () => void
  onClear: () => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-border-default text-text-secondary hover:bg-bg-tertiary hover:text-text-primary transition-colors"
      >
        <MoreHorizontal size={14} /> Data Control <ChevronDown size={12} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-1 z-40 min-w-[200px] rounded-xl bg-bg-elevated border border-border-subtle shadow-xl py-1.5"
          >
            <button onClick={() => { onAdd(); setOpen(false) }} className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-text-secondary hover:bg-bg-tertiary hover:text-text-primary transition-colors text-left">
              <Plus size={14} className="text-accent-indigo" /> Add Information
            </button>
            <button onClick={() => { onEdit(); setOpen(false) }} className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-text-secondary hover:bg-bg-tertiary hover:text-text-primary transition-colors text-left">
              <Pencil size={14} className="text-accent-amber" /> Edit Information
            </button>
            <button onClick={() => { onDelete(); setOpen(false) }} className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-text-secondary hover:bg-bg-tertiary hover:text-text-primary transition-colors text-left">
              <Trash2 size={14} className="text-accent-rose" /> Delete Information
            </button>
            <button onClick={() => { onExport(); setOpen(false) }} className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-text-secondary hover:bg-bg-tertiary hover:text-text-primary transition-colors text-left">
              <Download size={14} className="text-accent-emerald" /> Export Section
            </button>
            <div className="border-t border-border-subtle my-1" />
            <button onClick={() => { onClear(); setOpen(false) }} className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-accent-rose hover:bg-accent-rose-muted transition-colors text-left">
              <Eraser size={14} /> Clear All
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function ConfirmationDialog({ open, title, message, onConfirm, onCancel, destructive = true }: {
  open: boolean; title: string; message: string; onConfirm: () => void; onCancel: () => void; destructive?: boolean
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={onCancel}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.2, ease: easeOut }}
            className="bg-bg-elevated rounded-card-lg border border-border-subtle p-6 max-w-md w-[90%] shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${destructive ? 'bg-accent-rose-muted' : 'bg-accent-amber-muted'}`}>
                <AlertTriangle size={20} className={destructive ? 'text-accent-rose' : 'text-accent-amber'} />
              </div>
              <h3 className="font-heading text-lg font-semibold text-text-primary">{title}</h3>
            </div>
            <p className="text-sm text-text-secondary mb-6">{message}</p>
            <div className="flex justify-end gap-3">
              <button onClick={onCancel} className="px-4 py-2 rounded-lg text-sm text-text-secondary hover:bg-bg-tertiary transition-colors">Cancel</button>
              <button
                onClick={onConfirm}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${destructive ? 'bg-accent-rose text-white hover:bg-rose-500' : 'bg-accent-indigo text-white hover:bg-accent-indigo-hover'}`}
              >
                {destructive ? 'Delete' : 'Confirm'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function TagInput({ tags, onAdd, onRemove, placeholder, errorColor }: {
  tags: string[]; onAdd: (tag: string) => void; onRemove: (tag: string) => void; placeholder: string; errorColor?: boolean
}) {
  const [input, setInput] = useState('')

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.key === 'Enter' || e.key === ',') && input.trim()) {
      e.preventDefault()
      onAdd(input.trim())
      setInput('')
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        <AnimatePresence>
          {tags.map(tag => (
            <motion.span
              key={tag}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${errorColor ? 'bg-accent-rose-muted text-accent-rose' : 'bg-accent-indigo-muted text-accent-indigo'}`}
            >
              {tag}
              <button onClick={() => onRemove(tag)} className="hover:opacity-70"><X size={10} /></button>
            </motion.span>
          ))}
        </AnimatePresence>
      </div>
      <input
        type="text" value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="w-full px-3 py-2 rounded-lg bg-bg-tertiary border border-border-default text-sm text-text-primary placeholder:text-text-muted focus:border-accent-indigo focus:ring-2 focus:ring-accent-indigo/15 transition-all"
      />
    </div>
  )
}

function SectionHeader({ title, icon: Icon, onAdd, onEdit, onDelete, onExport, onClear }: {
  title: string; icon: React.ComponentType<{ size?: number; className?: string }>
  onAdd: () => void; onEdit: () => void; onDelete: () => void; onExport: () => void; onClear: () => void
}) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2.5">
        <Icon size={20} className="text-accent-indigo" />
        <h2 className="font-heading text-xl font-semibold text-text-primary">{title}</h2>
      </div>
      <DataControlDropdown onAdd={onAdd} onEdit={onEdit} onDelete={onDelete} onExport={onExport} onClear={onClear} />
    </div>
  )
}

// ─── Main Component ───────────────────────────
export default function CareerProfile() {
  const [profile, setProfile] = useState<ProfileData>(initialData)
  const [activeTab, setActiveTab] = useState<SectionId>('personal')
  const [editingSection, setEditingSection] = useState<SectionId | null>(null)
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; title: string; message: string; onConfirm: () => void; destructive?: boolean }>({ open: false, title: '', message: '', onConfirm: () => {} })
  const [showImportModal, setShowImportModal] = useState(false)
  const [importSection, setImportSection] = useState<SectionId | null>(null)
  const sectionRefs = useRef<Record<SectionId, HTMLElement | null>>({} as Record<SectionId, HTMLElement | null>)

  // Calculate profile completeness
  const completeness = useMemo(() => {
    let filled = 0, total = 0
    const fields = profile.personal
    const personalFields = ['fullName', 'email', 'location', 'summary'] as const
    personalFields.forEach(f => { total++; if (fields[f as keyof typeof fields]) filled++ })
    if (profile.education.length > 0) filled++
    total++
    profile.skills.forEach(g => { total++; if (g.skills.length > 0) filled++ })
    if (profile.experience.length > 0) filled++
    total++
    if (profile.projects.length > 0) filled++
    total++
    const prefFields = ['titles', 'industries', 'locations', 'workArrangement', 'seniority'] as const
    prefFields.forEach(f => { total++; if (profile.preferences[f].length > 0) filled++ })
    if (profile.goals.careerGoal) filled++
    total++
    if (profile.answers.some(a => a.answer)) filled++
    total++
    return Math.round((filled / total) * 100)
  }, [profile])

  // Scroll to section handler
  const scrollToSection = useCallback((id: SectionId) => {
    setActiveTab(id)
    sectionRefs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  // Intersection observer for active tab
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const id = entry.target.getAttribute('data-section') as SectionId
            if (id) setActiveTab(id)
          }
        })
      },
      { rootMargin: '-100px 0px -70% 0px', threshold: 0 }
    )
    sections.forEach(s => {
      const el = sectionRefs.current[s.id]
      if (el) observer.observe(el)
    })
    return () => observer.disconnect()
  }, [])

  // ─── Data Control Handlers ──────────────────
  const handleExport = (section: SectionId) => {
    const data = profile[section]
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `profile-${section}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleExportAll = () => {
    const blob = new Blob([JSON.stringify(profile, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'profile-complete.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = (section: SectionId, jsonStr: string) => {
    try {
      const data = JSON.parse(jsonStr)
      setProfile(prev => ({ ...prev, [section]: data }))
      setShowImportModal(false)
      setImportSection(null)
    } catch {
      alert('Invalid JSON format')
    }
  }

  const handleClear = (section: SectionId) => {
    setConfirmDialog({
      open: true,
      title: `Clear All From ${sections.find(s => s.id === section)?.label}`,
      message: `This will remove all data from this section. This action cannot be undone.`,
      onConfirm: () => {
        setProfile(prev => {
          const next = { ...prev }
          switch (section) {
            case 'education': next.education = []; break
            case 'experience': next.experience = []; break
            case 'skills': next.skills = initialData.skills.map(g => ({ ...g, skills: [] })); break
            case 'projects': next.projects = []; break
            case 'preferences': next.preferences = initialData.preferences; break
            case 'goals': next.goals = { careerGoal: '', skillsToLearn: [] }; break
            case 'answers': next.answers = prev.answers.map(a => ({ ...a, answer: '' })); break
            case 'personal':
              next.personal = { fullName: '', email: '', phone: '', location: '', rightToWork: '', linkedin: '', github: '', portfolio: '', summary: '' }
              break
          }
          return next
        })
        setConfirmDialog(prev => ({ ...prev, open: false }))
      },
      destructive: true,
    })
  }

  const openDeleteConfirm = (itemName: string, onDelete: () => void) => {
    setConfirmDialog({
      open: true, title: 'Delete Item',
      message: `This will permanently remove "${itemName}". This action cannot be undone.`,
      onConfirm: () => { onDelete(); setConfirmDialog(prev => ({ ...prev, open: false })) },
      destructive: true,
    })
  }

  const handleDeleteEducation = (id: string) => {
    const edu = profile.education.find(e => e.id === id)
    openDeleteConfirm(edu?.institution || 'Education', () => {
      setProfile(prev => ({ ...prev, education: prev.education.filter(e => e.id !== id) }))
    })
  }

  const handleDeleteExperience = (id: string) => {
    const exp = profile.experience.find(e => e.id === id)
    openDeleteConfirm(exp?.company || 'Experience', () => {
      setProfile(prev => ({ ...prev, experience: prev.experience.filter(e => e.id !== id) }))
    })
  }

  const handleDeleteProject = (id: string) => {
    const proj = profile.projects.find(p => p.id === id)
    openDeleteConfirm(proj?.name || 'Project', () => {
      setProfile(prev => ({ ...prev, projects: prev.projects.filter(p => p.id !== id) }))
    })
  }

  const handleDeleteSkill = (categoryIdx: number, skillName: string) => {
    setProfile(prev => {
      const next = { ...prev, skills: prev.skills.map((g, i) => i === categoryIdx ? { ...g, skills: g.skills.filter(s => s.name !== skillName) } : g) }
      return next
    })
  }

  // ─── Forms ──────────────────────────────────
  const personalForm = useForm({ resolver: zodResolver(personalSchema), defaultValues: profile.personal })
  const eduForm = useForm({ resolver: zodResolver(educationSchema), defaultValues: { institution: '', degree: '', field: '', startDate: '', endDate: '', current: false, grade: '', modules: '' } })
  const expForm = useForm({ resolver: zodResolver(experienceSchema), defaultValues: { company: '', role: '', startDate: '', endDate: '', current: false, description: '', technologies: '', isTech: true } })
  const skillForm = useForm({ resolver: zodResolver(skillSchema), defaultValues: { skillInput: '', category: 'Programming Languages', level: 'Intermediate' } })

  const onSavePersonal = personalForm.handleSubmit((data) => {
    setProfile(prev => ({ ...prev, personal: data as ProfileData['personal'] }))
    setEditingSection(null)
  })

  const onAddEducation = eduForm.handleSubmit((data) => {
    const entry: EducationEntry = {
      id: `edu-${Date.now()}`, institution: data.institution, degree: data.degree,
      field: data.field, startDate: data.startDate, endDate: data.endDate || '',
      current: data.current, grade: data.grade || '', modules: data.modules ? data.modules.split(',').map(m => m.trim()) : [],
    }
    setProfile(prev => ({ ...prev, education: [...prev.education, entry] }))
    eduForm.reset()
  })

  const onAddExperience = expForm.handleSubmit((data) => {
    const entry: ExperienceEntry = {
      id: `exp-${Date.now()}`, company: data.company, role: data.role,
      startDate: data.startDate, endDate: data.endDate || '', current: data.current,
      description: data.description, technologies: data.technologies ? data.technologies.split(',').map(t => t.trim()) : [],
      isTech: data.isTech,
    }
    setProfile(prev => ({ ...prev, experience: [...prev.experience, entry] }))
    expForm.reset()
  })

  const onAddSkill = skillForm.handleSubmit((data) => {
    setProfile(prev => {
      const next = { ...prev, skills: prev.skills.map(g => g.category === data.category ? { ...g, skills: [...g.skills, { name: data.skillInput, level: data.level }] } : g) }
      return next
    })
    skillForm.reset({ skillInput: '', category: data.category, level: 'Intermediate' })
  })

  // ─── Render ─────────────────────────────────
  return (
    <div className="space-y-6 max-w-6xl">
      {/* Profile Header */}
      <motion.div
        variants={fadeUp} initial="hidden" animate="visible" custom={0}
        className="p-6 md:p-8 rounded-card-lg bg-bg-secondary border border-border-subtle relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-accent-indigo/[0.03] to-transparent pointer-events-none" />
        <div className="relative flex flex-col md:flex-row gap-6 items-start">
          {/* Avatar */}
          <div className="relative group flex-shrink-0">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-accent-indigo to-accent-violet flex items-center justify-center text-white text-2xl font-bold border-[3px] border-accent-indigo">
              {profile.personal.fullName.split(' ').map(n => n[0]).join('')}
            </div>
          </div>
          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="font-heading text-2xl md:text-[28px] font-semibold text-text-primary">{profile.personal.fullName}</h1>
              <button onClick={() => setEditingSection('personal')} className="p-1.5 rounded-lg text-text-muted hover:text-accent-indigo hover:bg-accent-indigo-muted transition-colors">
                <Pencil size={15} />
              </button>
            </div>
            <div className="flex flex-wrap gap-x-5 gap-y-1 mt-2 text-sm text-text-secondary">
              <span className="flex items-center gap-1.5"><MapPin size={14} className="text-text-muted" />{profile.personal.location || 'Not set'}</span>
              <span className="flex items-center gap-1.5"><GraduationCap size={14} className="text-text-muted" />Computer Science, Example University</span>
              <span className="flex items-center gap-1.5"><Briefcase size={14} className="text-accent-indigo" />Seeking: Junior Software Developer</span>
            </div>
            {/* Quick Actions */}
            <div className="flex flex-wrap gap-2 mt-4">
              <button onClick={handleExportAll} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-border-default text-text-secondary hover:bg-bg-tertiary transition-colors">
                <Download size={13} /> Export Profile
              </button>
              <button onClick={() => { setImportSection(null); setShowImportModal(true) }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-border-default text-text-secondary hover:bg-bg-tertiary transition-colors">
                <Upload size={13} /> Import Data
              </button>
              <button onClick={() => setEditingSection(null)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-colors">
                <Eye size={13} /> Preview as Text
              </button>
            </div>
          </div>
          {/* Completion Ring */}
          <div className="flex flex-col items-center gap-1 flex-shrink-0">
            <CircularProgress percentage={completeness} />
            <span className="text-[11px] text-text-muted font-medium">Profile Complete</span>
            {completeness < 100 && (
              <span className="text-[11px] text-accent-amber text-center max-w-[120px]">
                Add {completeness < 50 ? 'more details' : 'work experience'} to reach 100%
              </span>
            )}
          </div>
        </div>
      </motion.div>

      {/* Sticky Section Tabs */}
      <div className="sticky top-[64px] z-30 -mx-4 px-4 bg-bg-primary/80 backdrop-blur-md border-b border-border-subtle">
        <div className="flex gap-1.5 overflow-x-auto py-3 scrollbar-hide">
          {sections.map(section => (
            <button
              key={section.id}
              onClick={() => scrollToSection(section.id)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-all flex-shrink-0 ${
                activeTab === section.id
                  ? 'bg-accent-indigo-muted text-accent-indigo'
                  : 'text-text-secondary hover:bg-bg-tertiary hover:text-text-primary'
              }`}
            >
              <section.icon size={14} /> {section.label}
            </button>
          ))}
        </div>
      </div>

      {/* ─── Section: Personal Info ─── */}
      <motion.section
        ref={el => { sectionRefs.current['personal'] = el }} data-section="personal"
        variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-50px' }} custom={0}
        className="p-5 md:p-6 rounded-card bg-bg-secondary border border-border-subtle"
      >
        <SectionHeader
          title="Personal Information" icon={User}
          onAdd={() => setEditingSection('personal')}
          onEdit={() => setEditingSection('personal')}
          onDelete={() => setConfirmDialog({ open: true, title: 'Delete Personal Info', message: 'Clear all personal information?', onConfirm: () => { setProfile(p => ({ ...p, personal: { ...p.personal, fullName: '', email: '', phone: '', location: '', summary: '' } })); setConfirmDialog(pr => ({ ...pr, open: false })) }, destructive: true })}
          onExport={() => handleExport('personal')}
          onClear={() => handleClear('personal')}
        />
        {editingSection === 'personal' ? (
          <form onSubmit={onSavePersonal} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className="block text-xs font-medium text-text-secondary mb-1">Full Name *</label><input {...personalForm.register('fullName')} className="w-full px-3 py-2 rounded-lg bg-bg-tertiary border border-border-default text-sm text-text-primary focus:border-accent-indigo focus:ring-2 focus:ring-accent-indigo/15 transition-all" /></div>
              <div><label className="block text-xs font-medium text-text-secondary mb-1">Email *</label><input {...personalForm.register('email')} type="email" className="w-full px-3 py-2 rounded-lg bg-bg-tertiary border border-border-default text-sm text-text-primary focus:border-accent-indigo focus:ring-2 focus:ring-accent-indigo/15 transition-all" /></div>
              <div><label className="block text-xs font-medium text-text-secondary mb-1">Phone</label><input {...personalForm.register('phone')} className="w-full px-3 py-2 rounded-lg bg-bg-tertiary border border-border-default text-sm text-text-primary focus:border-accent-indigo focus:ring-2 focus:ring-accent-indigo/15 transition-all" /></div>
              <div><label className="block text-xs font-medium text-text-secondary mb-1">Location *</label><input {...personalForm.register('location')} className="w-full px-3 py-2 rounded-lg bg-bg-tertiary border border-border-default text-sm text-text-primary focus:border-accent-indigo focus:ring-2 focus:ring-accent-indigo/15 transition-all" /></div>
              <div><label className="block text-xs font-medium text-text-secondary mb-1">Right to Work</label>
                <select {...personalForm.register('rightToWork')} className="w-full px-3 py-2 rounded-lg bg-bg-tertiary border border-border-default text-sm text-text-primary focus:border-accent-indigo focus:ring-2 focus:ring-accent-indigo/15 transition-all">
                  <option value="">Select...</option>
                  <option value="UK Citizen">UK Citizen</option>
                  <option value="UK Graduate Visa">UK Graduate Visa</option>
                  <option value="Settled Status">Settled Status</option>
                  <option value="Work Visa">Work Visa</option>
                  <option value="Pending">Pending</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div><label className="block text-xs font-medium text-text-secondary mb-1">LinkedIn URL</label><input {...personalForm.register('linkedin')} placeholder="linkedin.com/in/..." className="w-full px-3 py-2 rounded-lg bg-bg-tertiary border border-border-default text-sm text-text-primary placeholder:text-text-muted focus:border-accent-indigo focus:ring-2 focus:ring-accent-indigo/15 transition-all" /></div>
              <div><label className="block text-xs font-medium text-text-secondary mb-1">GitHub URL</label><input {...personalForm.register('github')} placeholder="github.com/..." className="w-full px-3 py-2 rounded-lg bg-bg-tertiary border border-border-default text-sm text-text-primary placeholder:text-text-muted focus:border-accent-indigo focus:ring-2 focus:ring-accent-indigo/15 transition-all" /></div>
              <div><label className="block text-xs font-medium text-text-secondary mb-1">Portfolio URL</label><input {...personalForm.register('portfolio')} placeholder="yourportfolio.com" className="w-full px-3 py-2 rounded-lg bg-bg-tertiary border border-border-default text-sm text-text-primary placeholder:text-text-muted focus:border-accent-indigo focus:ring-2 focus:ring-accent-indigo/15 transition-all" /></div>
            </div>
            <div><label className="block text-xs font-medium text-text-secondary mb-1">Personal Summary</label><textarea {...personalForm.register('summary')} rows={4} className="w-full px-3 py-2 rounded-lg bg-bg-tertiary border border-border-default text-sm text-text-primary placeholder:text-text-muted focus:border-accent-indigo focus:ring-2 focus:ring-accent-indigo/15 transition-all resize-y" /></div>
            {personalForm.formState.errors.fullName && <p className="text-xs text-accent-rose">{personalForm.formState.errors.fullName.message}</p>}
            {personalForm.formState.errors.email && <p className="text-xs text-accent-rose">{personalForm.formState.errors.email.message}</p>}
            <div className="flex gap-2">
              <button type="submit" className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-accent-indigo text-white text-sm font-medium hover:bg-accent-indigo-hover transition-colors"><Save size={14} /> Save</button>
              <button type="button" onClick={() => setEditingSection(null)} className="px-4 py-2 rounded-lg text-sm text-text-secondary hover:bg-bg-tertiary transition-colors">Cancel</button>
            </div>
          </form>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
            <div className="flex items-start gap-2"><User size={14} className="text-text-muted mt-0.5 flex-shrink-0" /><div><span className="text-xs text-text-muted block">Full Name</span><span className="text-sm text-text-primary">{profile.personal.fullName || '-'}</span></div></div>
            <div className="flex items-start gap-2"><Mail size={14} className="text-text-muted mt-0.5 flex-shrink-0" /><div><span className="text-xs text-text-muted block">Email</span><span className="text-sm text-text-primary">{profile.personal.email || '-'}</span></div></div>
            <div className="flex items-start gap-2"><Phone size={14} className="text-text-muted mt-0.5 flex-shrink-0" /><div><span className="text-xs text-text-muted block">Phone</span><span className="text-sm text-text-primary">{profile.personal.phone || '-'}</span></div></div>
            <div className="flex items-start gap-2"><MapPin size={14} className="text-text-muted mt-0.5 flex-shrink-0" /><div><span className="text-xs text-text-muted block">Location</span><span className="text-sm text-text-primary">{profile.personal.location || '-'}</span></div></div>
            <div className="flex items-start gap-2"><FileText size={14} className="text-text-muted mt-0.5 flex-shrink-0" /><div><span className="text-xs text-text-muted block">Right to Work</span><span className="text-sm text-text-primary">{profile.personal.rightToWork || '-'}</span></div></div>
            <div className="flex items-start gap-2"><Link2 size={14} className="text-text-muted mt-0.5 flex-shrink-0" /><div><span className="text-xs text-text-muted block">LinkedIn</span><span className="text-sm text-text-primary">{profile.personal.linkedin || '-'}</span></div></div>
            <div className="flex items-start gap-2"><Code size={14} className="text-text-muted mt-0.5 flex-shrink-0" /><div><span className="text-xs text-text-muted block">GitHub</span><span className="text-sm text-text-primary">{profile.personal.github || '-'}</span></div></div>
            <div className="flex items-start gap-2"><Globe size={14} className="text-text-muted mt-0.5 flex-shrink-0" /><div><span className="text-xs text-text-muted block">Portfolio</span><span className="text-sm text-text-primary">{profile.personal.portfolio || '-'}</span></div></div>
            <div className="col-span-1 md:col-span-2 flex items-start gap-2"><FileText size={14} className="text-text-muted mt-0.5 flex-shrink-0" /><div><span className="text-xs text-text-muted block">Personal Summary</span><p className="text-sm text-text-primary leading-relaxed">{profile.personal.summary || '-'}</p></div></div>
          </div>
        )}
      </motion.section>

      {/* ─── Section: Education ─── */}
      <motion.section
        ref={el => { sectionRefs.current['education'] = el }} data-section="education"
        variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-50px' }} custom={1}
        className="p-5 md:p-6 rounded-card bg-bg-secondary border border-border-subtle"
      >
        <SectionHeader
          title="Education" icon={GraduationCap}
          onAdd={() => setEditingSection('education')}
          onEdit={() => setEditingSection('education')}
          onDelete={() => setConfirmDialog({ open: true, title: 'Delete Education', message: 'Remove all education entries?', onConfirm: () => { setProfile(p => ({ ...p, education: [] })); setConfirmDialog(pr => ({ ...pr, open: false })) }, destructive: true })}
          onExport={() => handleExport('education')}
          onClear={() => handleClear('education')}
        />
        {/* Add Education Form */}
        {editingSection === 'education' && (
          <form onSubmit={onAddEducation} className="mb-5 p-4 rounded-xl bg-bg-tertiary/50 border border-border-subtle space-y-3">
            <h4 className="text-sm font-medium text-text-primary mb-2">Add Education</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input {...eduForm.register('institution')} placeholder="Institution *" className="w-full px-3 py-2 rounded-lg bg-bg-tertiary border border-border-default text-sm text-text-primary placeholder:text-text-muted focus:border-accent-indigo transition-all" />
              <input {...eduForm.register('degree')} placeholder="Degree (e.g., BSc) *" className="w-full px-3 py-2 rounded-lg bg-bg-tertiary border border-border-default text-sm text-text-primary placeholder:text-text-muted focus:border-accent-indigo transition-all" />
              <input {...eduForm.register('field')} placeholder="Field of Study *" className="w-full px-3 py-2 rounded-lg bg-bg-tertiary border border-border-default text-sm text-text-primary placeholder:text-text-muted focus:border-accent-indigo transition-all" />
              <input {...eduForm.register('grade')} placeholder="Grade/Result (optional)" className="w-full px-3 py-2 rounded-lg bg-bg-tertiary border border-border-default text-sm text-text-primary placeholder:text-text-muted focus:border-accent-indigo transition-all" />
              <input {...eduForm.register('startDate')} placeholder="Start Date (YYYY-MM) *" className="w-full px-3 py-2 rounded-lg bg-bg-tertiary border border-border-default text-sm text-text-primary placeholder:text-text-muted focus:border-accent-indigo transition-all" />
              <input {...eduForm.register('endDate')} placeholder="End Date (YYYY-MM)" className="w-full px-3 py-2 rounded-lg bg-bg-tertiary border border-border-default text-sm text-text-primary placeholder:text-text-muted focus:border-accent-indigo transition-all" />
            </div>
            <label className="flex items-center gap-2 text-sm text-text-secondary"><input type="checkbox" {...eduForm.register('current')} className="rounded border-border-default" /> Currently studying</label>
            <input {...eduForm.register('modules')} placeholder="Relevant modules (comma-separated)" className="w-full px-3 py-2 rounded-lg bg-bg-tertiary border border-border-default text-sm text-text-primary placeholder:text-text-muted focus:border-accent-indigo transition-all" />
            {eduForm.formState.errors.institution && <p className="text-xs text-accent-rose">{eduForm.formState.errors.institution.message}</p>}
            <div className="flex gap-2">
              <button type="submit" className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-accent-indigo text-white text-sm font-medium hover:bg-accent-indigo-hover transition-colors"><Plus size={14} /> Add</button>
              <button type="button" onClick={() => setEditingSection(null)} className="px-4 py-2 rounded-lg text-sm text-text-secondary hover:bg-bg-tertiary transition-colors">Cancel</button>
            </div>
          </form>
        )}
        {/* Education List */}
        <div className="space-y-3">
          <AnimatePresence>
            {profile.education.map(edu => (
              <motion.div
                key={edu.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }}
                className="p-4 rounded-xl bg-bg-tertiary/40 border border-border-subtle"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-heading text-[15px] font-semibold text-text-primary">{edu.institution}</h4>
                    <p className="text-sm text-text-secondary">{edu.degree} {edu.field && `· ${edu.field}`}</p>
                    <p className="text-xs text-text-muted mt-1">{edu.startDate} {edu.endDate && `— ${edu.current ? 'Present' : edu.endDate}`}</p>
                    {edu.grade && <p className="text-xs text-text-secondary mt-1">Grade: {edu.grade}</p>}
                    {edu.modules.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {edu.modules.map(m => <span key={m} className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-bg-tertiary text-text-secondary">{m}</span>)}
                      </div>
                    )}
                  </div>
                  <button onClick={() => handleDeleteEducation(edu.id)} className="p-1.5 rounded-lg text-text-muted hover:text-accent-rose hover:bg-accent-rose-muted transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {profile.education.length === 0 && <p className="text-sm text-text-muted text-center py-6">No education added yet. Use Data Control to add.</p>}
        </div>
      </motion.section>

      {/* ─── Section: Skills ─── */}
      <motion.section
        ref={el => { sectionRefs.current['skills'] = el }} data-section="skills"
        variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-50px' }} custom={2}
        className="p-5 md:p-6 rounded-card bg-bg-secondary border border-border-subtle"
      >
        <SectionHeader
          title="Skills & Technologies" icon={Code}
          onAdd={() => setEditingSection('skills')}
          onEdit={() => setEditingSection('skills')}
          onDelete={() => setConfirmDialog({ open: true, title: 'Delete Skills', message: 'Remove all skills?', onConfirm: () => { setProfile(p => ({ ...p, skills: p.skills.map(g => ({ ...g, skills: [] })) })); setConfirmDialog(pr => ({ ...pr, open: false })) }, destructive: true })}
          onExport={() => handleExport('skills')}
          onClear={() => handleClear('skills')}
        />
        {/* Add Skill Form */}
        {editingSection === 'skills' && (
          <form onSubmit={onAddSkill} className="mb-5 p-4 rounded-xl bg-bg-tertiary/50 border border-border-subtle space-y-3">
            <h4 className="text-sm font-medium text-text-primary mb-2">Add Skill</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input {...skillForm.register('skillInput')} placeholder="Skill name *" className="w-full px-3 py-2 rounded-lg bg-bg-tertiary border border-border-default text-sm text-text-primary placeholder:text-text-muted focus:border-accent-indigo transition-all" />
              <select {...skillForm.register('category')} className="w-full px-3 py-2 rounded-lg bg-bg-tertiary border border-border-default text-sm text-text-primary focus:border-accent-indigo transition-all">
                {profile.skills.map(g => <option key={g.category} value={g.category}>{g.category}</option>)}
              </select>
              <select {...skillForm.register('level')} className="w-full px-3 py-2 rounded-lg bg-bg-tertiary border border-border-default text-sm text-text-primary focus:border-accent-indigo transition-all">
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
                <option value="Expert">Expert</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button type="submit" className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-accent-indigo text-white text-sm font-medium hover:bg-accent-indigo-hover transition-colors"><Plus size={14} /> Add</button>
              <button type="button" onClick={() => setEditingSection(null)} className="px-4 py-2 rounded-lg text-sm text-text-secondary hover:bg-bg-tertiary transition-colors">Done</button>
            </div>
          </form>
        )}
        {/* Skills Display */}
        <div className="space-y-5">
          {profile.skills.map((group, gi) => (
            <div key={group.category}>
              <h4 className="text-sm font-medium text-text-secondary mb-2">{group.category}</h4>
              <div className="flex flex-wrap gap-2">
                <AnimatePresence>
                  {group.skills.map(skill => (
                    <motion.span
                      key={skill.name} initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-accent-indigo-muted text-accent-indigo group/skill relative"
                    >
                      {skill.name}
                      <span className="text-[10px] opacity-70">({skill.level})</span>
                      {editingSection === 'skills' && (
                        <button onClick={() => handleDeleteSkill(gi, skill.name)} className="ml-0.5 hover:opacity-70">
                          <X size={10} />
                        </button>
                      )}
                    </motion.span>
                  ))}
                </AnimatePresence>
                {group.skills.length === 0 && <span className="text-xs text-text-muted italic">No skills added</span>}
              </div>
            </div>
          ))}
        </div>
      </motion.section>

      {/* ─── Section: Experience ─── */}
      <motion.section
        ref={el => { sectionRefs.current['experience'] = el }} data-section="experience"
        variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-50px' }} custom={3}
        className="p-5 md:p-6 rounded-card bg-bg-secondary border border-border-subtle"
      >
        <SectionHeader
          title="Work Experience" icon={Briefcase}
          onAdd={() => setEditingSection('experience')}
          onEdit={() => setEditingSection('experience')}
          onDelete={() => setConfirmDialog({ open: true, title: 'Delete Experience', message: 'Remove all experience entries?', onConfirm: () => { setProfile(p => ({ ...p, experience: [] })); setConfirmDialog(pr => ({ ...pr, open: false })) }, destructive: true })}
          onExport={() => handleExport('experience')}
          onClear={() => handleClear('experience')}
        />
        {/* Add Experience Form */}
        {editingSection === 'experience' && (
          <form onSubmit={onAddExperience} className="mb-5 p-4 rounded-xl bg-bg-tertiary/50 border border-border-subtle space-y-3">
            <h4 className="text-sm font-medium text-text-primary mb-2">Add Experience</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input {...expForm.register('company')} placeholder="Company/Organization *" className="w-full px-3 py-2 rounded-lg bg-bg-tertiary border border-border-default text-sm text-text-primary placeholder:text-text-muted focus:border-accent-indigo transition-all" />
              <input {...expForm.register('role')} placeholder="Role Title *" className="w-full px-3 py-2 rounded-lg bg-bg-tertiary border border-border-default text-sm text-text-primary placeholder:text-text-muted focus:border-accent-indigo transition-all" />
              <input {...expForm.register('startDate')} placeholder="Start Date (YYYY-MM) *" className="w-full px-3 py-2 rounded-lg bg-bg-tertiary border border-border-default text-sm text-text-primary placeholder:text-text-muted focus:border-accent-indigo transition-all" />
              <input {...expForm.register('endDate')} placeholder="End Date (YYYY-MM)" className="w-full px-3 py-2 rounded-lg bg-bg-tertiary border border-border-default text-sm text-text-primary placeholder:text-text-muted focus:border-accent-indigo transition-all" />
            </div>
            <textarea {...expForm.register('description')} placeholder="Description *" rows={3} className="w-full px-3 py-2 rounded-lg bg-bg-tertiary border border-border-default text-sm text-text-primary placeholder:text-text-muted focus:border-accent-indigo transition-all resize-y" />
            <input {...expForm.register('technologies')} placeholder="Technologies (comma-separated)" className="w-full px-3 py-2 rounded-lg bg-bg-tertiary border border-border-default text-sm text-text-primary placeholder:text-text-muted focus:border-accent-indigo transition-all" />
            <label className="flex items-center gap-2 text-sm text-text-secondary"><input type="checkbox" {...expForm.register('current')} className="rounded border-border-default" /> Current position</label>
            <label className="flex items-center gap-2 text-sm text-text-secondary"><input type="checkbox" {...expForm.register('isTech')} defaultChecked className="rounded border-border-default" /> This is tech experience</label>
            {expForm.formState.errors.company && <p className="text-xs text-accent-rose">{expForm.formState.errors.company.message}</p>}
            <div className="flex gap-2">
              <button type="submit" className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-accent-indigo text-white text-sm font-medium hover:bg-accent-indigo-hover transition-colors"><Plus size={14} /> Add</button>
              <button type="button" onClick={() => setEditingSection(null)} className="px-4 py-2 rounded-lg text-sm text-text-secondary hover:bg-bg-tertiary transition-colors">Cancel</button>
            </div>
          </form>
        )}
        {/* Experience List */}
        <div className="space-y-3">
          <AnimatePresence>
            {profile.experience.map(exp => (
              <motion.div
                key={exp.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }}
                className="p-4 rounded-xl bg-bg-tertiary/40 border border-border-subtle"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-heading text-[15px] font-semibold text-text-primary">{exp.role}</h4>
                      {exp.isTech && <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-accent-emerald-muted text-accent-emerald">Tech</span>}
                    </div>
                    <p className="text-sm text-text-secondary">{exp.company}</p>
                    <p className="text-xs text-text-muted mt-1">{exp.startDate} — {exp.current ? 'Present' : exp.endDate}</p>
                    <p className="text-sm text-text-secondary mt-2 leading-relaxed">{exp.description}</p>
                    {exp.technologies.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {exp.technologies.map(t => <span key={t} className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-bg-tertiary text-text-secondary">{t}</span>)}
                      </div>
                    )}
                  </div>
                  <button onClick={() => handleDeleteExperience(exp.id)} className="p-1.5 rounded-lg text-text-muted hover:text-accent-rose hover:bg-accent-rose-muted transition-colors flex-shrink-0">
                    <Trash2 size={14} />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {profile.experience.length === 0 && <p className="text-sm text-text-muted text-center py-6">No work experience added yet. Add internships, part-time work, or volunteer roles.</p>}
        </div>
      </motion.section>

      {/* ─── Section: Projects & Links ─── */}
      <motion.section
        ref={el => { sectionRefs.current['projects'] = el }} data-section="projects"
        variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-50px' }} custom={4}
        className="p-5 md:p-6 rounded-card bg-bg-secondary border border-border-subtle"
      >
        <SectionHeader
          title="Projects & Links" icon={FolderOpen}
          onAdd={() => setEditingSection('projects')}
          onEdit={() => setEditingSection('projects')}
          onDelete={() => setConfirmDialog({ open: true, title: 'Delete Projects', message: 'Remove all projects?', onConfirm: () => { setProfile(p => ({ ...p, projects: [] })); setConfirmDialog(pr => ({ ...pr, open: false })) }, destructive: true })}
          onExport={() => handleExport('projects')}
          onClear={() => handleClear('projects')}
        />
        {/* Add Project Form */}
        {editingSection === 'projects' && (
          <div className="mb-5 p-4 rounded-xl bg-bg-tertiary/50 border border-border-subtle">
            <h4 className="text-sm font-medium text-text-primary mb-2">Link a Project</h4>
            <p className="text-xs text-text-muted mb-3">Full project management is on the <a href="#/projects" className="text-accent-indigo hover:underline">Project Library</a> page.</p>
            <button onClick={() => { window.location.hash = '/projects' }} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-accent-indigo text-white text-sm font-medium hover:bg-accent-indigo-hover transition-colors">
              <Plus size={14} /> Go to Project Library
            </button>
          </div>
        )}
        {/* Projects List */}
        <div className="space-y-3">
          <AnimatePresence>
            {profile.projects.map(proj => (
              <motion.div
                key={proj.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }}
                className="p-4 rounded-xl bg-bg-tertiary/40 border border-border-subtle"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-heading text-[15px] font-semibold text-text-primary">{proj.name}</h4>
                    <p className="text-sm text-text-secondary mt-1">{proj.description}</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {proj.technologies.map(t => <span key={t} className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-bg-tertiary text-text-secondary">{t}</span>)}
                    </div>
                    {proj.url && <a href={proj.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 mt-2 text-xs text-accent-indigo hover:underline"><Globe size={11} /> {proj.url}</a>}
                  </div>
                  <button onClick={() => handleDeleteProject(proj.id)} className="p-1.5 rounded-lg text-text-muted hover:text-accent-rose hover:bg-accent-rose-muted transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {profile.projects.length === 0 && <p className="text-sm text-text-muted text-center py-6">No projects linked. Go to Project Library to add projects.</p>}
        </div>
      </motion.section>

      {/* ─── Section: Preferences ─── */}
      <motion.section
        ref={el => { sectionRefs.current['preferences'] = el }} data-section="preferences"
        variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-50px' }} custom={5}
        className="p-5 md:p-6 rounded-card bg-bg-secondary border border-border-subtle"
      >
        <SectionHeader
          title="Job Preferences" icon={Target}
          onAdd={() => setEditingSection('preferences')}
          onEdit={() => setEditingSection('preferences')}
          onDelete={() => setConfirmDialog({ open: true, title: 'Delete Preferences', message: 'Reset all preferences?', onConfirm: () => { setProfile(p => ({ ...p, preferences: initialData.preferences })); setConfirmDialog(pr => ({ ...pr, open: false })) }, destructive: true })}
          onExport={() => handleExport('preferences')}
          onClear={() => handleClear('preferences')}
        />
        {editingSection === 'preferences' ? (
          <div className="space-y-5">
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-2">Preferred Job Titles</label>
              <TagInput tags={profile.preferences.titles} placeholder="Add title and press Enter"
                onAdd={t => setProfile(p => ({ ...p, preferences: { ...p.preferences, titles: [...p.preferences.titles, t] } }))}
                onRemove={t => setProfile(p => ({ ...p, preferences: { ...p.preferences, titles: p.preferences.titles.filter(x => x !== t) } }))}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-2">Preferred Industries</label>
              <div className="flex flex-wrap gap-2">
                {['Technology', 'Public Sector', 'Healthcare', 'Finance', 'Education', 'Charity', 'Startup'].map(ind => (
                  <label key={ind} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-bg-tertiary border border-border-subtle text-sm text-text-secondary cursor-pointer hover:border-border-default transition-colors">
                    <input type="checkbox" checked={profile.preferences.industries.includes(ind)}
                      onChange={e => setProfile(p => ({ ...p, preferences: { ...p.preferences, industries: e.target.checked ? [...p.preferences.industries, ind] : p.preferences.industries.filter(x => x !== ind) } }))}
                      className="rounded border-border-default"
                    /> {ind}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-2">Preferred Locations</label>
              <TagInput tags={profile.preferences.locations} placeholder="Add location and press Enter"
                onAdd={t => setProfile(p => ({ ...p, preferences: { ...p.preferences, locations: [...p.preferences.locations, t] } }))}
                onRemove={t => setProfile(p => ({ ...p, preferences: { ...p.preferences, locations: p.preferences.locations.filter(x => x !== t) } }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">Min Salary (£)</label>
                <input type="number" value={profile.preferences.salaryMin} onChange={e => setProfile(p => ({ ...p, preferences: { ...p.preferences, salaryMin: e.target.value } }))} className="w-full px-3 py-2 rounded-lg bg-bg-tertiary border border-border-default text-sm text-text-primary focus:border-accent-indigo transition-all" />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">Max Salary (£)</label>
                <input type="number" value={profile.preferences.salaryMax} onChange={e => setProfile(p => ({ ...p, preferences: { ...p.preferences, salaryMax: e.target.value } }))} className="w-full px-3 py-2 rounded-lg bg-bg-tertiary border border-border-default text-sm text-text-primary focus:border-accent-indigo transition-all" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-2">Work Arrangement</label>
              <div className="flex flex-wrap gap-2">
                {['Remote', 'Hybrid', 'On-site', 'Any'].map(arr => (
                  <label key={arr} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm cursor-pointer transition-colors ${profile.preferences.workArrangement.includes(arr) ? 'bg-accent-indigo-muted text-accent-indigo border border-accent-indigo/30' : 'bg-bg-tertiary border border-border-subtle text-text-secondary hover:border-border-default'}`}>
                    <input type="checkbox" checked={profile.preferences.workArrangement.includes(arr)}
                      onChange={e => setProfile(p => ({ ...p, preferences: { ...p.preferences, workArrangement: e.target.checked ? [...p.preferences.workArrangement, arr] : p.preferences.workArrangement.filter(x => x !== arr) } }))}
                      className="rounded border-border-default"
                    /> {arr}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-2">Seniority Level</label>
              <div className="flex flex-wrap gap-2">
                {['Entry-level', 'Graduate', 'Junior', 'Mid', 'Senior'].map(s => (
                  <label key={s} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-bg-tertiary border border-border-subtle text-sm text-text-secondary cursor-pointer hover:border-border-default transition-colors">
                    <input type="checkbox" checked={profile.preferences.seniority.includes(s)}
                      onChange={e => setProfile(p => ({ ...p, preferences: { ...p.preferences, seniority: e.target.checked ? [...p.preferences.seniority, s] : p.preferences.seniority.filter(x => x !== s) } }))}
                      className="rounded border-border-default"
                    /> {s}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-2">Job Types</label>
              <div className="flex flex-wrap gap-2">
                {['Full-time', 'Part-time', 'Contract', 'Internship', 'Graduate Scheme', 'Apprenticeship'].map(jt => (
                  <label key={jt} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-bg-tertiary border border-border-subtle text-sm text-text-secondary cursor-pointer hover:border-border-default transition-colors">
                    <input type="checkbox" checked={profile.preferences.jobTypes.includes(jt)}
                      onChange={e => setProfile(p => ({ ...p, preferences: { ...p.preferences, jobTypes: e.target.checked ? [...p.preferences.jobTypes, jt] : p.preferences.jobTypes.filter(x => x !== jt) } }))}
                      className="rounded border-border-default"
                    /> {jt}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-2">Roles to Avoid</label>
              <TagInput tags={profile.preferences.rolesToAvoid} placeholder="Add role to avoid" errorColor
                onAdd={t => setProfile(p => ({ ...p, preferences: { ...p.preferences, rolesToAvoid: [...p.preferences.rolesToAvoid, t] } }))}
                onRemove={t => setProfile(p => ({ ...p, preferences: { ...p.preferences, rolesToAvoid: p.preferences.rolesToAvoid.filter(x => x !== t) } }))}
              />
            </div>
            <button onClick={() => setEditingSection(null)} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-accent-indigo text-white text-sm font-medium hover:bg-accent-indigo-hover transition-colors">
              <Save size={14} /> Save Preferences
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
              <div><span className="text-xs text-text-muted block">Preferred Titles</span><div className="flex flex-wrap gap-1 mt-1">{profile.preferences.titles.map(t => <span key={t} className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-accent-indigo-muted text-accent-indigo">{t}</span>)}</div></div>
              <div><span className="text-xs text-text-muted block">Industries</span><div className="flex flex-wrap gap-1 mt-1">{profile.preferences.industries.map(i => <span key={i} className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-bg-tertiary text-text-secondary">{i}</span>)}</div></div>
              <div><span className="text-xs text-text-muted block">Locations</span><div className="flex flex-wrap gap-1 mt-1">{profile.preferences.locations.map(l => <span key={l} className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-bg-tertiary text-text-secondary">{l}</span>)}</div></div>
              <div><span className="text-xs text-text-muted block">Salary Range</span><span className="text-sm text-text-primary">£{Number(profile.preferences.salaryMin).toLocaleString()} — £{Number(profile.preferences.salaryMax).toLocaleString()}</span></div>
              <div><span className="text-xs text-text-muted block">Work Arrangement</span><div className="flex flex-wrap gap-1 mt-1">{profile.preferences.workArrangement.map(a => <span key={a} className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-accent-emerald-muted text-accent-emerald">{a}</span>)}</div></div>
              <div><span className="text-xs text-text-muted block">Seniority</span><div className="flex flex-wrap gap-1 mt-1">{profile.preferences.seniority.map(s => <span key={s} className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-bg-tertiary text-text-secondary">{s}</span>)}</div></div>
              <div><span className="text-xs text-text-muted block">Job Types</span><div className="flex flex-wrap gap-1 mt-1">{profile.preferences.jobTypes.map(j => <span key={j} className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-bg-tertiary text-text-secondary">{j}</span>)}</div></div>
              <div><span className="text-xs text-text-muted block">Roles to Avoid</span><div className="flex flex-wrap gap-1 mt-1">{profile.preferences.rolesToAvoid.map(r => <span key={r} className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-accent-rose-muted text-accent-rose">{r}</span>)}</div></div>
            </div>
          </div>
        )}
      </motion.section>

      {/* ─── Section: Career Goals ─── */}
      <motion.section
        ref={el => { sectionRefs.current['goals'] = el }} data-section="goals"
        variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-50px' }} custom={6}
        className="p-5 md:p-6 rounded-card bg-bg-secondary border border-border-subtle"
      >
        <SectionHeader
          title="Career Goals" icon={Sparkles}
          onAdd={() => setEditingSection('goals')}
          onEdit={() => setEditingSection('goals')}
          onDelete={() => setConfirmDialog({ open: true, title: 'Delete Goals', message: 'Clear career goals?', onConfirm: () => { setProfile(p => ({ ...p, goals: { careerGoal: '', skillsToLearn: [] } })); setConfirmDialog(pr => ({ ...pr, open: false })) }, destructive: true })}
          onExport={() => handleExport('goals')}
          onClear={() => handleClear('goals')}
        />
        {editingSection === 'goals' ? (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Career Goal Statement</label>
              <textarea
                value={profile.goals.careerGoal}
                onChange={e => setProfile(p => ({ ...p, goals: { ...p.goals, careerGoal: e.target.value } }))}
                rows={4}
                className="w-full px-3 py-2 rounded-lg bg-bg-tertiary border border-border-default text-sm text-text-primary placeholder:text-text-muted focus:border-accent-indigo focus:ring-2 focus:ring-accent-indigo/15 transition-all resize-y"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-2">Skills I Want to Learn</label>
              <TagInput tags={profile.goals.skillsToLearn} placeholder="Add skill and press Enter"
                onAdd={t => setProfile(p => ({ ...p, goals: { ...p.goals, skillsToLearn: [...p.goals.skillsToLearn, t] } }))}
                onRemove={t => setProfile(p => ({ ...p, goals: { ...p.goals, skillsToLearn: p.goals.skillsToLearn.filter(x => x !== t) } }))}
              />
            </div>
            <button onClick={() => setEditingSection(null)} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-accent-indigo text-white text-sm font-medium hover:bg-accent-indigo-hover transition-colors">
              <Save size={14} /> Save Goals
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <span className="text-xs text-text-muted block mb-1">Career Goal</span>
              <p className="text-sm text-text-primary leading-relaxed">{profile.goals.careerGoal || 'Not set yet.'}</p>
            </div>
            <div>
              <span className="text-xs text-text-muted block mb-1">Skills to Learn</span>
              <div className="flex flex-wrap gap-1.5">
                {profile.goals.skillsToLearn.map(s => <span key={s} className="px-2.5 py-1 rounded-full text-xs font-medium bg-accent-violet-muted text-accent-violet">{s}</span>)}
              </div>
            </div>
          </div>
        )}
      </motion.section>

      {/* ─── Section: Application Answers ─── */}
      <motion.section
        ref={el => { sectionRefs.current['answers'] = el }} data-section="answers"
        variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-50px' }} custom={7}
        className="p-5 md:p-6 rounded-card bg-bg-secondary border border-border-subtle"
      >
        <SectionHeader
          title="Application Answers" icon={BookOpenCheck}
          onAdd={() => setEditingSection('answers')}
          onEdit={() => setEditingSection('answers')}
          onDelete={() => setConfirmDialog({ open: true, title: 'Delete Answers', message: 'Clear all saved answers?', onConfirm: () => { setProfile(p => ({ ...p, answers: p.answers.map(a => ({ ...a, answer: '' })) })); setConfirmDialog(pr => ({ ...pr, open: false })) }, destructive: true })}
          onExport={() => handleExport('answers')}
          onClear={() => handleClear('answers')}
        />
        <div className="space-y-4">
          {profile.answers.map((item, idx) => (
            <motion.div key={idx} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.05 }} className="border border-border-subtle rounded-xl overflow-hidden">
              <button
                onClick={() => setEditingSection(editingSection === `answer-${idx}` ? null : `answer-${idx}` as unknown as SectionId)}
                className="w-full flex items-center justify-between p-4 text-left hover:bg-bg-tertiary/30 transition-colors"
              >
                <div className="flex items-center gap-2">
                  {item.answer ? <CheckCircle2 size={16} className="text-accent-emerald" /> : <XCircle size={16} className="text-text-muted" />}
                  <span className="text-sm font-medium text-text-primary">{item.question}</span>
                </div>
                <ChevronDown size={14} className={`text-text-muted transition-transform ${editingSection === `answer-${idx}` ? 'rotate-180' : ''}`} />
              </button>
              <AnimatePresence>
                {editingSection === `answer-${idx}` && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                    <div className="p-4 pt-0 border-t border-border-subtle">
                      <textarea
                        value={item.answer}
                        onChange={e => setProfile(p => ({ ...p, answers: p.answers.map((a, i) => i === idx ? { ...a, answer: e.target.value } : a) }))}
                        rows={5}
                        className="w-full mt-3 px-3 py-2 rounded-lg bg-bg-tertiary border border-border-default text-sm text-text-primary placeholder:text-text-muted focus:border-accent-indigo focus:ring-2 focus:ring-accent-indigo/15 transition-all resize-y"
                        placeholder="Write your answer here..."
                      />
                      <div className="flex justify-end mt-2">
                        <button onClick={() => setEditingSection(null)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent-indigo text-white text-xs font-medium hover:bg-accent-indigo-hover transition-colors">
                          <Save size={12} /> Save
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* Bottom Actions Bar */}
      <motion.div
        variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={8}
        className="sticky bottom-0 -mx-4 px-4 py-4 bg-bg-secondary border-t border-border-subtle flex flex-col sm:flex-row gap-2 justify-end"
      >
        <button onClick={handleExportAll} className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-medium border border-border-default text-text-secondary hover:bg-bg-tertiary transition-colors">
          <Download size={14} /> Export All Profile Data
        </button>
        <button onClick={() => { setImportSection(null); setShowImportModal(true) }} className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-medium border border-border-default text-text-secondary hover:bg-bg-tertiary transition-colors">
          <Upload size={14} /> Import Profile Data
        </button>
        <button
          onClick={() => setConfirmDialog({ open: true, title: 'Delete All Profile Data', message: 'This will permanently delete ALL your profile data. This cannot be undone.', onConfirm: () => { setProfile(initialData); setConfirmDialog(pr => ({ ...pr, open: false })) }, destructive: true })}
          className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-medium bg-accent-rose text-white hover:bg-rose-500 transition-colors"
        >
          <Trash2 size={14} /> Delete All Data
        </button>
      </motion.div>

      {/* Import Modal */}
      <AnimatePresence>
        {showImportModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={() => setShowImportModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2, ease: easeOut }}
              className="bg-bg-elevated rounded-card-lg border border-border-subtle p-6 max-w-lg w-[90%] shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <h3 className="font-heading text-lg font-semibold text-text-primary mb-2">Import Profile Data</h3>
              <p className="text-sm text-text-muted mb-4">Paste JSON data below. {importSection ? `This will replace your ${sections.find(s => s.id === importSection)?.label} data.` : 'This will replace all profile data.'}</p>
              <textarea
                id="import-json" rows={10}
                className="w-full px-3 py-2 rounded-lg bg-bg-tertiary border border-border-default text-sm text-text-primary placeholder:text-text-muted focus:border-accent-indigo focus:ring-2 focus:ring-accent-indigo/15 transition-all resize-y font-mono"
                placeholder={`Paste JSON here...`}
              />
              <div className="flex justify-end gap-3 mt-4">
                <button onClick={() => setShowImportModal(false)} className="px-4 py-2 rounded-lg text-sm text-text-secondary hover:bg-bg-tertiary transition-colors">Cancel</button>
                <button
                  onClick={() => { const val = (document.getElementById('import-json') as HTMLTextAreaElement)?.value; if (importSection) handleImport(importSection, val); else { try { const d = JSON.parse(val); setProfile(d); setShowImportModal(false); } catch { alert('Invalid JSON') } } }}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-accent-indigo text-white hover:bg-accent-indigo-hover transition-colors"
                >
                  Import
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        open={confirmDialog.open} title={confirmDialog.title} message={confirmDialog.message}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog(prev => ({ ...prev, open: false }))}
        destructive={confirmDialog.destructive}
      />
    </div>
  )
}
