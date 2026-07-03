import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  User, MapPin, Phone, Briefcase, Wrench, GraduationCap, Target,
  Plus, X, ChevronRight, ChevronLeft, Check, Sparkles, Rocket,
} from 'lucide-react'
import { saveProfile } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import { useUIStore } from '@/store/uiStore'

// ─────────────────────────────────────────────────────────────
// Onboarding — collects a NEW user's details so job search and every
// AI feature works on THEIR profile (the seeded profile belongs to the
// app owner only). 4 short steps, saves to the backend on finish.
// ─────────────────────────────────────────────────────────────

const easeOut = [0.16, 1, 0.3, 1] as [number, number, number, number]

interface EduEntry { institution: string; degree: string; dates: string }
interface ExpEntry { role: string; company: string; dates: string; detail: string }

const STEPS = [
  { title: 'About you', icon: User },
  { title: 'Your skills', icon: Wrench },
  { title: 'Background', icon: GraduationCap },
  { title: 'Job targets', icon: Target },
]

export default function Onboarding() {
  const navigate = useNavigate()
  const authUser = useAuthStore((s) => s.user)
  const addToast = useUIStore((s) => s.addToast)

  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)

  // Step 1 — basics
  const [fullName, setFullName] = useState(authUser?.user_metadata?.full_name || '')
  const [headline, setHeadline] = useState('')
  const [location, setLocation] = useState('')
  const [phone, setPhone] = useState('')

  // Step 2 — skills
  const [skills, setSkills] = useState<string[]>([])
  const [learning, setLearning] = useState<string[]>([])

  // Step 3 — background
  const [summary, setSummary] = useState('')
  const [education, setEducation] = useState<EduEntry[]>([])
  const [experience, setExperience] = useState<ExpEntry[]>([])

  // Step 4 — job targets
  const [titles, setTitles] = useState<string[]>([])
  const [locations, setLocations] = useState<string[]>([])
  const [salaryMin, setSalaryMin] = useState(25000)
  const [salaryMax, setSalaryMax] = useState(45000)
  const [seniority, setSeniority] = useState<string[]>(['Entry-level', 'Junior'])

  const [error, setError] = useState('')

  const canNext = () => {
    if (step === 0) return fullName.trim().length > 1
    if (step === 3) return titles.length > 0
    return true
  }

  const next = () => {
    if (!canNext()) {
      setError(step === 0 ? 'Please enter your name to continue.' : 'Add at least one target job title.')
      return
    }
    setError('')
    setStep((s) => Math.min(s + 1, STEPS.length - 1))
  }
  const back = () => { setError(''); setStep((s) => Math.max(s - 1, 0)) }

  const finish = async () => {
    if (!canNext()) {
      setError('Add at least one target job title — the AI searches based on these.')
      return
    }
    setSaving(true)
    const profile = {
      full_name: fullName.trim(),
      email: authUser?.email || '',
      phone: phone.trim(),
      website: '', linkedin: '', github: '',
      location: location.trim(),
      headline: headline.trim(),
      summary: summary.trim(),
      education: education.filter((e) => e.institution || e.degree),
      experience: experience.filter((e) => e.role || e.company),
      skills: skills.length ? { 'Core Skills': skills } : {},
      projects: [],
      preferences: {
        titles,
        seniority,
        locations: locations.length ? locations : [location.trim()].filter(Boolean),
        salary_min: salaryMin,
        salary_max: salaryMax,
        currency: 'GBP',
        avoid: [],
      },
      goals: '',
      skills_to_learn: learning,
      additional: {},
    }
    const saved = await saveProfile(profile)
    setSaving(false)
    if (saved) {
      addToast({ type: 'success', title: `Welcome, ${fullName.split(' ')[0]}!`, message: 'Profile saved — running your first AI job search is next.' })
      navigate('/search-settings')
    } else {
      addToast({ type: 'error', title: 'Could not save', message: 'Backend unreachable — please try again.' })
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: easeOut }}
      className="max-w-2xl mx-auto pb-24"
    >
      {/* Header */}
      <div className="text-center mb-8">
        <div className="w-14 h-14 rounded-2xl bg-accent-indigo-muted flex items-center justify-center mx-auto mb-4">
          <Rocket size={26} className="text-accent-indigo" />
        </div>
        <h1 className="font-heading text-display-md font-semibold text-text-primary tracking-tight">
          Let&apos;s set up your profile
        </h1>
        <p className="text-body-md text-text-secondary mt-2 max-w-md mx-auto">
          JobPilot finds and scores jobs <span className="text-text-primary font-medium">based on you</span> — the more
          you share, the better your matches.
        </p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center justify-center gap-2 mb-8">
        {STEPS.map((s, i) => (
          <div key={s.title} className="flex items-center gap-2">
            <button
              onClick={() => i < step && setStep(i)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                i === step
                  ? 'bg-accent-indigo text-white'
                  : i < step
                  ? 'bg-accent-emerald-muted text-accent-emerald cursor-pointer'
                  : 'bg-bg-tertiary text-text-muted'
              }`}
            >
              {i < step ? <Check size={12} /> : <s.icon size={12} />}
              <span className="hidden sm:inline">{s.title}</span>
            </button>
            {i < STEPS.length - 1 && <div className={`w-6 h-px ${i < step ? 'bg-accent-emerald' : 'bg-border-default'}`} />}
          </div>
        ))}
      </div>

      {/* Step content */}
      <div className="rounded-card-lg border border-border-subtle bg-bg-secondary p-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.25, ease: easeOut }}
          >
            {step === 0 && (
              <div className="space-y-4">
                <Field label="Full name *" icon={User}>
                  <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="e.g. Jane Smith" className={inputCls} />
                </Field>
                <Field label="Professional headline" icon={Briefcase} hint="One line that describes you, e.g. “Junior Data Analyst | SQL & Python”">
                  <input value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder="e.g. Junior Software Developer | Python & React" className={inputCls} />
                </Field>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Location" icon={MapPin}>
                    <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. London" className={inputCls} />
                  </Field>
                  <Field label="Phone (optional)" icon={Phone}>
                    <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="e.g. 07123 456 789" className={inputCls} />
                  </Field>
                </div>
                <p className="text-body-xs text-text-muted">Signed in as <span className="text-text-secondary">{authUser?.email}</span> — this stays your account email.</p>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-5">
                <TagEditor
                  label="Your skills *"
                  hint="Type a skill and press Enter — e.g. Excel, Java, customer service, forklift licence…"
                  tags={skills}
                  onChange={setSkills}
                  color="indigo"
                  placeholder="Add a skill…"
                />
                <TagEditor
                  label="Skills you're learning (optional)"
                  hint="These help the AI suggest roles you can grow into."
                  tags={learning}
                  onChange={setLearning}
                  color="cyan"
                  placeholder="Add a skill you're learning…"
                />
              </div>
            )}

            {step === 2 && (
              <div className="space-y-5">
                <Field label="Short professional summary" icon={Sparkles} hint="2–3 sentences about you. The AI uses this in your CVs and cover letters.">
                  <textarea value={summary} onChange={(e) => setSummary(e.target.value)} rows={4} placeholder="e.g. Recent graduate with hands-on experience in…" className={`${inputCls} resize-y min-h-[90px]`} />
                </Field>
                <ListEditor<EduEntry>
                  label="Education"
                  items={education}
                  onChange={setEducation}
                  blank={{ institution: '', degree: '', dates: '' }}
                  render={(item, update) => (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <input value={item.degree} onChange={(e) => update({ ...item, degree: e.target.value })} placeholder="Qualification (e.g. BSc)" className={inputCls} />
                      <input value={item.institution} onChange={(e) => update({ ...item, institution: e.target.value })} placeholder="Institution" className={inputCls} />
                      <input value={item.dates} onChange={(e) => update({ ...item, dates: e.target.value })} placeholder="Dates (e.g. 2021–2024)" className={inputCls} />
                    </div>
                  )}
                />
                <ListEditor<ExpEntry>
                  label="Work experience"
                  items={experience}
                  onChange={setExperience}
                  blank={{ role: '', company: '', dates: '', detail: '' }}
                  render={(item, update) => (
                    <div className="space-y-2">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <input value={item.role} onChange={(e) => update({ ...item, role: e.target.value })} placeholder="Role" className={inputCls} />
                        <input value={item.company} onChange={(e) => update({ ...item, company: e.target.value })} placeholder="Company" className={inputCls} />
                        <input value={item.dates} onChange={(e) => update({ ...item, dates: e.target.value })} placeholder="Dates" className={inputCls} />
                      </div>
                      <input value={item.detail} onChange={(e) => update({ ...item, detail: e.target.value })} placeholder="What did you do there? (one line)" className={inputCls} />
                    </div>
                  )}
                />
              </div>
            )}

            {step === 3 && (
              <div className="space-y-5">
                <TagEditor
                  label="Target job titles *"
                  hint="The AI searches for these — e.g. “Junior Software Developer”, “Warehouse Operative”, “Data Analyst”."
                  tags={titles}
                  onChange={setTitles}
                  color="indigo"
                  placeholder="Add a job title…"
                />
                <TagEditor
                  label="Preferred locations"
                  hint="Cities or “Remote (UK)”. Defaults to your location if left empty."
                  tags={locations}
                  onChange={setLocations}
                  color="cyan"
                  placeholder="Add a location…"
                />
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Salary min (£)">
                    <input type="number" value={salaryMin} onChange={(e) => setSalaryMin(parseInt(e.target.value) || 0)} className={inputCls} />
                  </Field>
                  <Field label="Salary max (£)">
                    <input type="number" value={salaryMax} onChange={(e) => setSalaryMax(parseInt(e.target.value) || 0)} className={inputCls} />
                  </Field>
                </div>
                <div>
                  <label className="block text-body-sm font-medium text-text-secondary mb-2">Experience level</label>
                  <div className="flex flex-wrap gap-2">
                    {['Entry-level', 'Graduate', 'Junior', 'Mid-level', 'Senior'].map((lvl) => (
                      <button
                        key={lvl}
                        onClick={() => setSeniority((prev) => prev.includes(lvl) ? prev.filter((x) => x !== lvl) : [...prev, lvl])}
                        className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                          seniority.includes(lvl)
                            ? 'bg-accent-indigo text-white'
                            : 'bg-bg-tertiary text-text-secondary border border-border-default hover:border-border-focus'
                        }`}
                      >
                        {lvl}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {error && <p className="text-body-sm text-accent-rose mt-4">{error}</p>}

        {/* Nav buttons */}
        <div className="flex items-center justify-between mt-8 pt-5 border-t border-border-subtle">
          {step > 0 ? (
            <button onClick={back} className="flex items-center gap-1.5 px-4 py-2.5 rounded-button border border-border-default text-body-sm text-text-secondary hover:bg-bg-tertiary transition-colors">
              <ChevronLeft size={15} /> Back
            </button>
          ) : (
            <button onClick={() => navigate('/dashboard')} className="px-4 py-2.5 text-body-sm text-text-muted hover:text-text-secondary transition-colors">
              Skip for now
            </button>
          )}
          {step < STEPS.length - 1 ? (
            <button onClick={next} className="flex items-center gap-1.5 px-5 py-2.5 rounded-button bg-accent-indigo text-white text-body-sm font-medium hover:bg-accent-indigo-hover hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-accent-indigo/20">
              Continue <ChevronRight size={15} />
            </button>
          ) : (
            <button onClick={finish} disabled={saving} className="flex items-center gap-1.5 px-5 py-2.5 rounded-button bg-accent-emerald text-[#0B0F19] text-body-sm font-semibold hover:bg-accent-emerald/90 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-accent-emerald/20 disabled:opacity-60">
              {saving ? 'Saving…' : (<><Check size={15} /> Finish & find my jobs</>)}
            </button>
          )}
        </div>
      </div>

      <p className="text-center text-body-xs text-text-muted mt-4">
        You can edit everything later in <span className="text-text-secondary">Career Profile</span>.
      </p>
    </motion.div>
  )
}

// ─── Small building blocks ───────────────────────────────────

const inputCls =
  'w-full h-10 px-3 rounded-input bg-bg-tertiary border border-border-default text-sm text-text-primary placeholder:text-text-muted focus:border-accent-indigo focus:outline-none focus:ring-2 focus:ring-accent-indigo/15 transition-all'

function Field({ label, icon: Icon, hint, children }: { label: string; icon?: React.ComponentType<{ size?: number; className?: string }>; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="flex items-center gap-1.5 text-body-sm font-medium text-text-secondary mb-2">
        {Icon && <Icon size={14} className="text-text-muted" />} {label}
      </label>
      {children}
      {hint && <p className="text-body-xs text-text-muted mt-1.5">{hint}</p>}
    </div>
  )
}

function TagEditor({ label, hint, tags, onChange, color, placeholder }: {
  label: string; hint?: string; tags: string[]; onChange: (t: string[]) => void
  color: 'indigo' | 'cyan'; placeholder: string
}) {
  const [input, setInput] = useState('')
  const add = () => {
    const v = input.trim()
    if (v && !tags.includes(v)) onChange([...tags, v])
    setInput('')
  }
  const colorCls = color === 'indigo' ? 'bg-accent-indigo-muted text-accent-indigo' : 'bg-accent-cyan-muted text-accent-cyan'
  return (
    <div>
      <label className="block text-body-sm font-medium text-text-secondary mb-2">{label}</label>
      {hint && <p className="text-body-xs text-text-muted mb-2">{hint}</p>}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {tags.map((t) => (
            <span key={t} className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm ${colorCls}`}>
              {t}
              <button onClick={() => onChange(tags.filter((x) => x !== t))} className="hover:opacity-70 ml-0.5" aria-label={`Remove ${t}`}>
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add() } }}
          placeholder={placeholder}
          className={inputCls}
        />
        <button onClick={add} disabled={!input.trim()} className="h-10 px-3 rounded-button bg-accent-indigo text-white hover:bg-accent-indigo-hover transition-colors disabled:opacity-30">
          <Plus size={16} />
        </button>
      </div>
    </div>
  )
}

function ListEditor<T>({ label, items, onChange, blank, render }: {
  label: string; items: T[]; onChange: (items: T[]) => void; blank: T
  render: (item: T, update: (item: T) => void) => React.ReactNode
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-body-sm font-medium text-text-secondary">{label}</label>
        <button onClick={() => onChange([...items, { ...blank }])} className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs text-accent-indigo hover:bg-accent-indigo-muted transition-colors">
          <Plus size={12} /> Add
        </button>
      </div>
      {items.length === 0 && <p className="text-body-xs text-text-muted">None added — optional, but improves your matches.</p>}
      <div className="space-y-3">
        {items.map((item, i) => (
          <div key={i} className="relative p-3 rounded-lg bg-bg-tertiary/50 border border-border-subtle">
            <button
              onClick={() => onChange(items.filter((_, idx) => idx !== i))}
              className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-bg-elevated border border-border-default text-text-muted hover:text-accent-rose flex items-center justify-center"
              aria-label="Remove entry"
            >
              <X size={10} />
            </button>
            {render(item, (updated) => onChange(items.map((it, idx) => (idx === i ? updated : it))))}
          </div>
        ))}
      </div>
    </div>
  )
}
