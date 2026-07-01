import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  HardHat,
  ShieldCheck,
  Truck,
  Construction,
  CheckCircle2,
  Clock,
  MapPin,
  Phone,
  Mail,
  Globe,
  BadgeCheck,
  Sparkles,
  FileText,
  ArrowRight,
  GraduationCap,
} from 'lucide-react'
import { useTrackStore } from '@/store/trackStore'
import { getProfile } from '@/lib/api'

// ─── Fallback profile (renders even if backend is down) ───────

interface ConstructionData {
  full_name: string
  email: string
  phone: string
  website?: string
  location: string
  headline: string
  summary: string
  skills: Record<string, string[]>
  experience: { role: string; company: string; dates: string; detail: string }[]
  education: { institution: string; degree: string; dates: string; note?: string }[]
  cards_certifications: string[]
  preferences: { titles: string[] }
  additional: { availability?: string; right_to_work?: string; languages?: string[] }
}

const FALLBACK: ConstructionData = {
  full_name: 'Mihretab Nega',
  email: 'mihretabtesfahun2124@gmail.com',
  phone: '07388 617 329',
  website: 'mihretab.org',
  location: 'Acton, West London',
  headline: 'Hoist Operator | Traffic Marshal | Banksman | CPCS Blue Card (since Aug 2020)',
  summary:
    'Reliable and safety-driven construction site operative with hands-on experience as a Hoist Driver and Traffic Marshal/Banksman. Holds a CPCS Blue (Competent Operator) card for Traffic Marshal and Hoist Operator, held since August 2020. Proven track record coordinating plant movements, managing gatehouse and traffic flow, and delivering clear radio and hand-signal communication on busy London construction sites.',
  skills: {
    'Plant & Hoist Operations': ['Passenger & goods hoist operation', 'Pre-use inspections', 'Load limits & safe travel', 'Loading bay & delivery coordination'],
    'Traffic & Site Management': ['Traffic management & gatehouse control', 'Banksman hand-signals', 'Radio communication', 'Exclusion zones & hazard spotting'],
    'Safety & Compliance': ['Permit to work & site inductions', 'RAMS & toolbox talks awareness', 'Emergency stop procedures', 'Housekeeping & waste segregation'],
    'People & Reliability': ['Customer & subcontractor liaison', 'Site logs & basic paperwork', 'Teamwork', 'Punctuality & reliability'],
  },
  experience: [
    {
      role: 'Hoist Driver / Hoist Operator',
      company: 'Various Construction Sites — London',
      dates: '2024 – 2025',
      detail:
        'Operated passenger and goods hoists, adhering strictly to load limits and safe travel procedures. Performed pre-use inspections, reported defects and coordinated with site management for timely fixes. Managed queues and ensured safe access and egress for trades, maintaining clear radio communication throughout.',
    },
    {
      role: 'Traffic Marshal / Banksman',
      company: 'Construction Sites — West London',
      dates: '2020 – 2025',
      detail:
        'Directed vehicle and plant movements using standard hand-signals and maintained exclusion zones. Controlled deliveries at the gatehouse, checked paperwork and kept accurate daily movement logs. Supported loading bay operations, liaising with drivers and trades to reduce waiting times and keep the site moving safely.',
    },
  ],
  education: [{ institution: 'Brunel University London', degree: 'BSc (Hons) Computer Science', dates: 'Sept 2021 – June 2024' }],
  cards_certifications: [
    'CPCS Blue (Competent Operator) — Traffic / Vehicle Marshal — held since August 2020',
    'CPCS Blue (Competent Operator) — Hoist Operator — held since August 2020',
  ],
  preferences: { titles: ['Hoist Operator', 'Traffic Marshal', 'Banksman', 'Vehicle Marshal', 'Gateman', 'Loading Bay Operative', 'Site Operative'] },
  additional: {
    availability: 'Immediate start — available for day or night shifts',
    right_to_work: 'UK Right to Work (ILR / settled)',
    languages: ['English (fluent)', 'Amharic (fluent)', 'Tigrinya (basic)'],
  },
}

const skillIcon: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  'Plant & Hoist Operations': Construction,
  'Traffic & Site Management': Truck,
  'Safety & Compliance': ShieldCheck,
  'People & Reliability': BadgeCheck,
}

const easeOut = [0.16, 1, 0.3, 1] as [number, number, number, number]

// ─── Main Component ───────────────────────────────────────────

export default function ConstructionProfile() {
  const { activeTrack, switchTrack } = useTrackStore()
  const [data, setData] = useState<ConstructionData>(FALLBACK)
  const isActive = activeTrack === 'construction'

  useEffect(() => {
    let alive = true
    getProfile('construction').then((p) => {
      if (alive && p && typeof p === 'object' && 'headline' in p) {
        setData({ ...FALLBACK, ...(p as unknown as ConstructionData) })
      }
    })
    return () => {
      alive = false
    }
  }, [])

  return (
    <motion.div
      className="space-y-6 pb-24 max-w-4xl"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: easeOut }}
    >
      {/* ── Header ── */}
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-xl bg-accent-amber-muted flex items-center justify-center flex-shrink-0">
          <HardHat size={22} className="text-accent-amber" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="font-heading text-display-md font-semibold text-text-primary tracking-tight">
              Site Operative CV
            </h1>
            <span className="px-2 py-0.5 rounded-full bg-accent-amber-muted text-accent-amber text-mono-xs font-medium">
              Track 2
            </span>
          </div>
          <p className="text-body-sm text-text-secondary">
            Your second career track — construction site work, kept separate from your software CV but using the same search and AI tools.
          </p>
        </div>
      </div>

      {/* ── Active Track Switch ── */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.08, duration: 0.3, ease: easeOut }}
        className={`rounded-card-lg border p-5 transition-colors ${
          isActive ? 'border-accent-amber/30 bg-accent-amber-muted/20' : 'border-border-subtle bg-bg-secondary'
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <Sparkles size={18} className={isActive ? 'text-accent-amber mt-0.5' : 'text-text-muted mt-0.5'} />
            <div>
              <p className="text-body-md font-medium text-text-primary">
                {isActive ? 'This track is ACTIVE' : 'Switch to this track'}
              </p>
              <p className="text-body-sm text-text-secondary mt-0.5">
                {isActive
                  ? 'Job search and AI CV / cover-letter drafting are currently targeting construction roles.'
                  : 'Make search and AI drafting target Hoist Operator / Traffic Marshal / Banksman roles.'}
              </p>
            </div>
          </div>
          <button
            onClick={() => switchTrack(isActive ? 'tech' : 'construction')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-button text-body-sm font-medium transition-all hover:scale-[1.02] active:scale-[0.98] ${
              isActive
                ? 'border border-border-default text-text-secondary hover:bg-bg-tertiary'
                : 'bg-accent-amber text-white shadow-lg shadow-accent-amber/20'
            }`}
          >
            {isActive ? (
              <>Switch back to Software Dev</>
            ) : (
              <>
                <HardHat size={15} />
                Use Site Operative track
                <ArrowRight size={15} />
              </>
            )}
          </button>
        </div>
      </motion.div>

      {/* ── CPCS Cards (the headline credential) ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.12, duration: 0.3, ease: easeOut }}
        className="rounded-card-lg border border-blue-500/30 bg-blue-500/10 p-5"
      >
        <div className="flex items-center gap-2 mb-3">
          <BadgeCheck size={18} className="text-blue-400" />
          <h2 className="font-heading text-heading-lg font-semibold text-text-primary">CPCS Blue Card</h2>
          <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-mono-xs font-medium">
            Held since Aug 2020
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {data.cards_certifications.map((card) => (
            <div key={card} className="flex items-start gap-2.5 p-3 rounded-lg bg-bg-secondary border border-border-subtle">
              <ShieldCheck size={16} className="text-blue-400 mt-0.5 flex-shrink-0" />
              <span className="text-body-sm text-text-primary">{card}</span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* ── Contact + Headline ── */}
      <Section delay={0.16}>
        <h2 className="font-heading text-heading-lg font-semibold text-text-primary mb-1">{data.full_name}</h2>
        <p className="text-body-md text-accent-amber font-medium mb-3">{data.headline}</p>
        <div className="flex flex-wrap gap-x-5 gap-y-2 text-body-sm text-text-secondary">
          <span className="flex items-center gap-1.5"><MapPin size={14} className="text-text-muted" />{data.location}</span>
          <span className="flex items-center gap-1.5"><Phone size={14} className="text-text-muted" />{data.phone}</span>
          <span className="flex items-center gap-1.5"><Mail size={14} className="text-text-muted" />{data.email}</span>
          {data.website && <span className="flex items-center gap-1.5"><Globe size={14} className="text-text-muted" />{data.website}</span>}
        </div>
      </Section>

      {/* ── Profile summary ── */}
      <Section delay={0.2} title="Profile">
        <p className="text-body-sm text-text-secondary leading-relaxed">{data.summary}</p>
        <div className="flex flex-wrap gap-2 mt-4">
          {data.additional.availability && (
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent-emerald-muted text-accent-emerald text-body-xs font-medium">
              <Clock size={13} />{data.additional.availability}
            </span>
          )}
          {data.additional.right_to_work && (
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-bg-tertiary text-text-secondary text-body-xs font-medium">
              <CheckCircle2 size={13} />{data.additional.right_to_work}
            </span>
          )}
        </div>
      </Section>

      {/* ── Key skills ── */}
      <Section delay={0.24} title="Key Skills">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Object.entries(data.skills).map(([cat, list]) => {
            const Icon = skillIcon[cat] || Construction
            return (
              <div key={cat} className="p-4 rounded-card border border-border-subtle bg-bg-tertiary/40">
                <div className="flex items-center gap-2 mb-2">
                  <Icon size={15} className="text-accent-amber" />
                  <h4 className="text-body-sm font-semibold text-text-primary">{cat}</h4>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {list.map((s) => (
                    <span key={s} className="px-2 py-1 rounded-md bg-bg-secondary border border-border-subtle text-body-xs text-text-secondary">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </Section>

      {/* ── Site experience ── */}
      <Section delay={0.28} title="Site Experience">
        <div className="space-y-4">
          {data.experience.map((e) => (
            <div key={e.role} className="relative pl-5 border-l-2 border-accent-amber/30">
              <span className="absolute -left-[7px] top-1 w-3 h-3 rounded-full bg-accent-amber" />
              <div className="flex items-baseline justify-between flex-wrap gap-x-3">
                <h4 className="text-body-md font-semibold text-text-primary">{e.role}</h4>
                <span className="text-body-xs text-text-muted font-mono">{e.dates}</span>
              </div>
              <p className="text-body-sm text-accent-amber/90 mb-1">{e.company}</p>
              <p className="text-body-sm text-text-secondary leading-relaxed">{e.detail}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* ── Education ── */}
      <Section delay={0.32} title="Education">
        {data.education.map((e) => (
          <div key={e.degree} className="flex items-start gap-2.5">
            <GraduationCap size={16} className="text-text-muted mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-body-sm font-medium text-text-primary">{e.degree}</p>
              <p className="text-body-xs text-text-muted">{e.institution} · {e.dates}</p>
            </div>
          </div>
        ))}
      </Section>

      {/* ── How AI uses this ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.36 }}
        className="rounded-card-lg border border-accent-indigo/20 bg-accent-indigo-muted/20 p-5"
      >
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-accent-indigo-muted flex items-center justify-center flex-shrink-0">
            <FileText size={16} className="text-accent-indigo" />
          </div>
          <div>
            <h3 className="font-heading text-heading-md font-semibold text-text-primary mb-1">
              Same AI tools, this profile
            </h3>
            <p className="text-body-sm text-text-secondary leading-relaxed">
              When this track is active, every AI feature uses this construction profile: the job search looks for{' '}
              {data.preferences.titles.slice(0, 4).join(', ')} roles, and the{' '}
              <a href="#/cv-manager" className="text-accent-indigo hover:underline">CV Manager</a> drafts CVs and cover
              letters that lead with your CPCS Blue card and site experience — never your software projects. Switch back
              any time and the AI returns to your developer profile.
            </p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─── Section wrapper ──────────────────────────────────────────

function Section({ children, title, delay = 0 }: { children: React.ReactNode; title?: string; delay?: number }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3, ease: easeOut }}
      className="rounded-card-lg border border-border-subtle bg-bg-secondary p-5"
    >
      {title && <h3 className="font-heading text-heading-md font-semibold text-text-primary mb-3">{title}</h3>}
      {children}
    </motion.section>
  )
}
