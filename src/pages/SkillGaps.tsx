import { useState, useMemo, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Search,
  CheckCircle,
  AlertTriangle,
  XCircle,
  TrendingUp,
  Code,
  Target,
  BookOpen,
  Star,
  Plus,
  ChevronRight,
  Sparkles,
  SortDesc,
  X,
} from 'lucide-react'
import { mockSkillGaps } from '@/data/mockData'
import { getSkillGaps } from '@/lib/api'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'

// ─── Animation Variants ──────────────────────

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.06,
      duration: 0.35,
      ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
    },
  }),
}

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
}

// ─── Skill Data ──────────────────────────────

const userSkills = [
  { name: 'Java', level: 'advanced', category: 'Languages' },
  { name: 'Spring Boot', level: 'advanced', category: 'Frameworks' },
  { name: 'React', level: 'advanced', category: 'Frameworks' },
  { name: 'MySQL', level: 'advanced', category: 'Databases' },
  { name: 'PostgreSQL', level: 'intermediate', category: 'Databases' },
  { name: 'REST APIs', level: 'advanced', category: 'Tools' },
  { name: 'JWT', level: 'intermediate', category: 'Tools' },
  { name: 'Python', level: 'intermediate', category: 'Languages' },
  { name: 'Twilio', level: 'intermediate', category: 'Tools' },
]

const blockingSkills = [
  { skill: 'AWS', mentions: 18, blocking: 5, priority: 'Critical' as const, jobs: ['Junior DevOps Engineer', 'Cloud Engineer Graduate', 'Backend Developer', 'Platform Engineer', 'Full Stack Developer'] },
  { skill: 'Docker', mentions: 12, blocking: 3, priority: 'High' as const, jobs: ['Full Stack Developer', 'Platform Engineer Junior', 'Backend Developer'] },
  { skill: 'TypeScript', mentions: 10, blocking: 2, priority: 'High' as const, jobs: ['React/TypeScript Frontend Developer', 'Full Stack TypeScript Developer'] },
  { skill: 'Azure', mentions: 10, blocking: 2, priority: 'High' as const, jobs: ['Azure Cloud Engineer', 'Microsoft Stack Developer'] },
  { skill: 'C#', mentions: 8, blocking: 1, priority: 'Medium' as const, jobs: ['.NET Backend Developer'] },
  { skill: 'Kubernetes', mentions: 8, blocking: 1, priority: 'Medium' as const, jobs: ['DevOps Engineer'] },
]

const learnRecommendations = [
  {
    title: 'Learn AWS Basics',
    priority: 'Critical' as const,
    impact: 'highest impact',
    description: 'AWS appears in 18 jobs this week. Free tier available.',
    suggestion: 'Deploy one project to AWS EC2 or S3',
    icon: Sparkles,
  },
  {
    title: 'Learn Docker Fundamentals',
    priority: 'High' as const,
    impact: 'high impact',
    description: '12 jobs mention Docker. Containerization is expected for backend roles.',
    suggestion: 'Dockerize your Hair Salon Booking System',
    icon: BookOpen,
  },
  {
    title: 'Practice SQL Interview Questions',
    priority: 'Medium' as const,
    impact: 'common interview topic',
    description: 'SQL appears in 35 jobs but interview questions often trip up juniors.',
    suggestion: 'Focus on indexing, joins, and query optimization',
    icon: Target,
  },
  {
    title: 'Add TypeScript to a Project',
    priority: 'Medium' as const,
    impact: 'nice to have',
    description: '10 jobs mention TypeScript. Easy to add to React projects.',
    suggestion: 'Convert your React components to TypeScript gradually',
    icon: Code,
  },
]

const priorityColors: Record<string, { badge: string; border: string; text: string; bg: string }> = {
  Critical: { badge: 'bg-accent-rose/[0.12] text-accent-rose', border: 'border-l-accent-rose', text: 'text-accent-rose', bg: 'bg-accent-rose/[0.08]' },
  High: { badge: 'bg-accent-amber/[0.12] text-accent-amber', border: 'border-l-accent-amber', text: 'text-accent-amber', bg: 'bg-accent-amber/[0.08]' },
  Medium: { badge: 'bg-accent-indigo/[0.12] text-accent-indigo', border: 'border-l-accent-indigo', text: 'text-accent-indigo', bg: 'bg-accent-indigo/[0.08]' },
  Low: { badge: 'bg-[rgba(100,116,139,0.12)] text-text-muted', border: 'border-l-[#64748B]', text: 'text-text-muted', bg: 'bg-[rgba(100,116,139,0.06)]' },
}

const skillLevelColors: Record<string, { bg: string; text: string }> = {
  advanced: { bg: 'bg-accent-emerald/[0.12]', text: 'text-accent-emerald' },
  intermediate: { bg: 'bg-accent-indigo/[0.12]', text: 'text-accent-indigo' },
  beginner: { bg: 'bg-bg-tertiary', text: 'text-text-secondary' },
}

// ─── Helpers ─────────────────────────────────

function getChartColor(demand: number, userLevel: number) {
  if (userLevel >= demand) return '#34D399'
  if (userLevel >= demand * 0.6) return '#FBBF24'
  return '#FB7185'
}

// ─── Main Component ──────────────────────────

export default function SkillGaps() {
  const [skillCategory, setSkillCategory] = useState('All')
  const [sortBy, setSortBy] = useState<'priority' | 'demand' | 'blocking'>('priority')

  // Live skill gaps aggregated from AI-scored jobs (fallback to seed data)
  const [gaps, setGaps] = useState<{ skill: string; demand: number; userLevel: number; category: string }[]>(mockSkillGaps)
  useEffect(() => {
    getSkillGaps()
      .then((g) => { if (g && g.length) setGaps(g) })
      .catch(() => {})
  }, [])

  // Summary stats
  const totalSkills = gaps.length
  const skillsHave = gaps.filter((s) => s.userLevel >= s.demand * 0.7).length
  const skillsMissing = totalSkills - skillsHave
  const blockingCount = blockingSkills.reduce((sum, s) => sum + s.blocking, 0)

  // Chart data - most demanded skills
  const chartData = useMemo(() => {
    return [...gaps]
      .sort((a, b) => b.demand - a.demand)
      .slice(0, 10)
      .map((s) => ({
        name: s.skill,
        demand: s.demand,
        userLevel: s.userLevel,
        gap: Math.max(0, s.demand - s.userLevel),
        color: getChartColor(s.demand, s.userLevel),
        have: s.userLevel >= s.demand ? 'Have' : s.userLevel >= s.demand * 0.6 ? 'Partial' : 'Missing',
      }))
  }, [gaps])

  // Filter user skills
  const filteredUserSkills = skillCategory === 'All'
    ? userSkills
    : userSkills.filter((s) => s.category === skillCategory)

  // Sort blocking skills
  const sortedBlocking = useMemo(() => {
    const sorted = [...blockingSkills]
    switch (sortBy) {
      case 'priority':
        return sorted.sort((a, b) => {
          const order = { Critical: 0, High: 1, Medium: 2, Low: 3 }
          return order[a.priority] - order[b.priority]
        })
      case 'demand':
        return sorted.sort((a, b) => b.mentions - a.mentions)
      case 'blocking':
        return sorted.sort((a, b) => b.blocking - a.blocking)
      default:
        return sorted
    }
  }, [sortBy])

  return (
    <div className="space-y-6">
      {/* ─── Section 1: Summary Stats ───────── */}
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {[
          {
            icon: Search,
            iconColor: 'text-accent-cyan',
            accentColor: 'border-t-accent-cyan',
            value: totalSkills.toString(),
            label: 'Unique skills mentioned',
            sub: 'across 247 jobs',
            subColor: 'text-text-muted',
          },
          {
            icon: CheckCircle,
            iconColor: 'text-accent-emerald',
            accentColor: 'border-t-accent-emerald',
            value: skillsHave.toString(),
            label: 'Skills you have',
            sub: `${Math.round((skillsHave / totalSkills) * 100)}% coverage`,
            subColor: 'text-accent-emerald',
          },
          {
            icon: AlertTriangle,
            iconColor: 'text-accent-amber',
            accentColor: 'border-t-accent-amber',
            value: skillsMissing.toString(),
            label: "Skills you're missing",
            sub: `${blockingSkills.length} blocking strong matches`,
            subColor: 'text-accent-rose',
          },
          {
            icon: XCircle,
            iconColor: 'text-accent-rose',
            accentColor: 'border-t-accent-rose',
            value: blockingCount.toString(),
            label: 'Strong matches blocked',
            sub: 'by missing required skills',
            subColor: 'text-accent-rose',
          },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            custom={i}
            variants={cardVariants}
            className={`p-5 rounded-card bg-bg-secondary border border-border-subtle border-t-[3px] ${stat.accentColor} hover:border-border-default hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,0,0,0.15)] transition-all`}
          >
            <div className="flex items-center gap-2 mb-3">
              <stat.icon size={18} className={stat.iconColor} />
              <span className="text-xs text-text-muted">{stat.label}</span>
            </div>
            <p className="font-mono text-[32px] font-bold text-text-primary leading-none">{stat.value}</p>
            <p className={`text-xs mt-2 ${stat.subColor}`}>{stat.sub}</p>
          </motion.div>
        ))}
      </motion.div>

      {/* ─── Section 2: Chart + Skills Grid ─── */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-5">
        {/* Most Demanded Skills Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.2 }}
          className="xl:col-span-3 p-5 rounded-card bg-bg-secondary border border-border-subtle"
        >
          <div className="flex items-center gap-2 mb-5">
            <TrendingUp size={18} className="text-accent-indigo" />
            <h3 className="font-heading text-lg font-semibold text-text-primary">Most Demanded Skills</h3>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 5, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" horizontal={false} />
                <XAxis type="number" stroke="#64748B" fontSize={12} domain={[0, 100]} />
                <YAxis dataKey="name" type="category" stroke="#94A3B8" fontSize={12} width={80} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1E293B',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    color: '#F1F5F9',
                    fontSize: '13px',
                  }}
                  formatter={(value: number, name: string, props: any) => {
                    if (name === 'demand') return [`${value}% demand`, 'Market Demand']
                    if (name === 'userLevel') {
                      const have = props?.payload?.have
                      return [`${value}%`, have === 'Have' ? 'You have ✓' : have === 'Partial' ? 'Partial' : 'Missing ✗']
                    }
                    return [value, name]
                  }}
                />
                <Bar dataKey="demand" fill="#334155" radius={[0, 4, 4, 0]} barSize={12} name="demand" />
                <Bar dataKey="userLevel" radius={[0, 4, 4, 0]} barSize={12} name="userLevel">
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center gap-4 mt-3 text-xs">
            <span className="flex items-center gap-1.5 text-text-muted">
              <span className="w-3 h-3 rounded-sm bg-[#34D399]" /> Have
            </span>
            <span className="flex items-center gap-1.5 text-text-muted">
              <span className="w-3 h-3 rounded-sm bg-[#FBBF24]" /> Partial
            </span>
            <span className="flex items-center gap-1.5 text-text-muted">
              <span className="w-3 h-3 rounded-sm bg-[#FB7185]" /> Missing
            </span>
          </div>
        </motion.div>

        {/* Your Skills Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.28 }}
          className="xl:col-span-2 p-5 rounded-card bg-bg-secondary border border-border-subtle"
        >
          <div className="flex items-center gap-2 mb-4">
            <Code size={18} className="text-accent-emerald" />
            <h3 className="font-heading text-lg font-semibold text-text-primary">Your Current Skills</h3>
          </div>

          {/* Category Tabs */}
          <div className="flex flex-wrap gap-1.5 mb-4">
            {['All', 'Languages', 'Frameworks', 'Databases', 'Tools'].map((cat) => (
              <button
                key={cat}
                onClick={() => setSkillCategory(cat)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                  skillCategory === cat
                    ? 'bg-accent-indigo text-white'
                    : 'bg-bg-tertiary text-text-secondary hover:text-text-primary'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Skill Pills */}
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="flex flex-wrap gap-2"
          >
            {filteredUserSkills.map((skill, i) => {
              const colors = skillLevelColors[skill.level]
              return (
                <motion.div
                  key={skill.name}
                  custom={i}
                  variants={cardVariants}
                  className={`px-3.5 py-1.5 rounded-full ${colors.bg} ${colors.text} text-sm font-medium cursor-default hover:scale-105 transition-transform`}
                  title={`${skill.level} proficiency`}
                >
                  {skill.name}
                </motion.div>
              )
            })}
          </motion.div>

          {filteredUserSkills.length === 0 && (
            <p className="text-sm text-text-muted mt-4">No skills in this category. Add skills in your Career Profile.</p>
          )}
        </motion.div>
      </div>

      {/* ─── Section 3: Priority Matrix ─────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.36 }}
      >
        <div className="flex items-center gap-2 mb-4">
          <Target size={18} className="text-accent-rose" />
          <h3 className="font-heading text-lg font-semibold text-text-primary">Missing Skills Priority Matrix</h3>
        </div>
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3"
        >
          {sortedBlocking.map((skill, i) => {
            const colors = priorityColors[skill.priority]
            return (
              <motion.div
                key={skill.skill}
                custom={i}
                variants={cardVariants}
                className={`p-4 rounded-card bg-bg-secondary border border-border-subtle ${colors.border} border-l-[4px] hover:border-border-default hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,0,0,0.1)] transition-all`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-heading text-[15px] font-semibold text-text-primary">{skill.skill}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${colors.badge}`}>
                    {skill.priority}
                  </span>
                </div>
                <p className="text-xs text-text-muted mb-1">Mentioned in {skill.mentions} jobs</p>
                <p className="text-xs text-text-secondary mb-2">Required in job descriptions</p>
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-medium ${colors.text}`}>
                    Blocking {skill.blocking} strong {skill.blocking === 1 ? 'match' : 'matches'}
                  </span>
                  <button className="text-xs text-accent-indigo hover:text-accent-indigo-hover transition-colors flex items-center gap-0.5">
                    Learn <ChevronRight size={10} />
                  </button>
                </div>
              </motion.div>
            )
          })}
        </motion.div>
      </motion.div>

      {/* ─── Section 4: Blocking + Recommendations ── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {/* Skills Blocking Strong Matches */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.44 }}
          className="p-5 rounded-card bg-bg-secondary border border-border-subtle"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <XCircle size={18} className="text-accent-rose" />
              <h3 className="font-heading text-lg font-semibold text-text-primary">Blocking Your Best Matches?</h3>
            </div>
            <div className="relative group">
              <button className="flex items-center gap-1 text-xs text-text-muted hover:text-text-primary transition-colors">
                <SortDesc size={12} />
                {sortBy === 'priority' ? 'Priority' : sortBy === 'demand' ? 'Demand' : 'Blocking'}
              </button>
              <div className="absolute right-0 top-full mt-1 w-36 bg-bg-elevated border border-border-subtle rounded-lg shadow-lg z-10 py-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                {(['priority', 'demand', 'blocking'] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setSortBy(s)}
                    className={`w-full text-left px-3 py-1.5 text-xs hover:bg-bg-tertiary transition-colors capitalize ${sortBy === s ? 'text-accent-indigo' : 'text-text-secondary'}`}
                  >
                    {s === 'blocking' ? 'Impact' : s}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {sortedBlocking.map((skill) => (
              <div
                key={skill.skill}
                className="p-3 rounded-lg bg-bg-tertiary/50 border border-border-subtle/50 hover:border-border-default transition-all"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-text-primary">{skill.skill}</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-accent-rose/[0.12] text-accent-rose">
                    Blocking {skill.blocking}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {skill.jobs.slice(0, 3).map((job) => (
                    <span key={job} className="text-[10px] px-1.5 py-0.5 rounded bg-bg-secondary text-text-muted">
                      {job}
                    </span>
                  ))}
                  {skill.jobs.length > 3 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-bg-secondary text-text-muted">
                      +{skill.jobs.length - 3} more
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Learn Next Recommendations */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.52 }}
          className="p-5 rounded-card bg-bg-secondary border border-border-subtle"
        >
          <div className="flex items-center gap-2 mb-4">
            <BookOpen size={18} className="text-accent-indigo" />
            <h3 className="font-heading text-lg font-semibold text-text-primary">Recommended Next Steps</h3>
          </div>

          <div className="space-y-3">
            {learnRecommendations.map((rec, i) => {
              const colors = priorityColors[rec.priority]
              return (
                <motion.div
                  key={rec.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: 0.52 + i * 0.08 }}
                  className="p-4 rounded-[10px] bg-bg-tertiary/50 border border-border-subtle hover:border-border-default hover:-translate-y-0.5 transition-all"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <rec.icon size={14} className="text-accent-indigo" />
                      <span className="text-sm font-semibold text-text-primary">{rec.title}</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${colors.badge}`}>
                      {rec.impact}
                    </span>
                  </div>
                  <p className="text-xs text-text-secondary mb-1.5">{rec.description}</p>
                  <p className="text-[11px] text-text-muted mb-3">{rec.suggestion}</p>
                  <button className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border-default text-xs text-text-secondary hover:bg-bg-tertiary hover:text-text-primary transition-colors">
                    <Plus size={12} />
                    Add to Goals
                  </button>
                </motion.div>
              )
            })}
          </div>
        </motion.div>
      </div>

      {/* ─── Section 5: Learning Goals ──────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.6 }}
        className="p-5 rounded-card bg-bg-secondary border border-border-subtle"
      >
        <div className="flex items-center gap-2 mb-4">
          <Target size={18} className="text-accent-violet" />
          <h3 className="font-heading text-lg font-semibold text-text-primary">Your Learning Goals</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          {['AWS Certified', 'Docker Mastery', 'TypeScript Deep Dive', 'System Design'].map((goal) => {
            const priority = goal.includes('AWS') ? 'Critical' : goal.includes('Docker') ? 'High' : goal.includes('TypeScript') ? 'Medium' : 'Low'
            const colors = priorityColors[priority]
            return (
              <div
                key={goal}
                className={`flex items-center gap-2 px-3 py-2 rounded-full ${colors.bg} ${colors.text} text-sm`}
              >
                <Star size={12} />
                {goal}
                <button className="hover:text-accent-rose transition-colors ml-1">
                  <X size={12} />
                </button>
              </div>
            )
          })}
          <button className="flex items-center gap-1 px-3 py-2 rounded-full bg-bg-tertiary text-text-secondary hover:text-text-primary text-sm transition-colors">
            <Plus size={14} />
            Add Goal
          </button>
        </div>
      </motion.div>
    </div>
  )
}


