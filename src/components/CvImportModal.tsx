import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, FileText, X, Check, AlertTriangle, Loader2, ShieldCheck, Info } from 'lucide-react'
import { importCv, type CvExtractionResult } from '@/lib/api'

// ─────────────────────────────────────────────────────────────
// CvImportModal — "Upload your CV to fill your profile".
// Uploads a PDF/DOCX, shows an editable PREVIEW of the extracted
// fields (with confidence + conflict-vs-existing handling), and only
// calls onApply(profile) when the user explicitly approves. Nothing
// is saved by this component — the parent persists on approval.
// ─────────────────────────────────────────────────────────────

const PRIVACY_NOTE =
  'Your CV will be processed to extract your profile information. Relevant CV text may be sent to the configured AI provider. Review all extracted information before saving.'

const FIELD_LABELS: Record<string, string> = {
  full_name: 'Full name', email: 'Email', phone: 'Phone', location: 'Location',
  headline: 'Headline', summary: 'Professional summary', website: 'Portfolio', github: 'GitHub', linkedin: 'LinkedIn',
}

type Extracted = Record<string, unknown>

function countItems(v: unknown): number {
  if (Array.isArray(v)) return v.length
  if (v && typeof v === 'object') return Object.values(v as object).flat().length
  return 0
}

export function CvImportModal({
  open,
  existingProfile,
  onClose,
  onApply,
}: {
  open: boolean
  existingProfile?: Extracted
  onClose: () => void
  onApply: (mergedProfile: Extracted, suggestedTrack: 'tech' | 'construction') => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [phase, setPhase] = useState<'upload' | 'loading' | 'review'>('upload')
  const [error, setError] = useState('')
  const [result, setResult] = useState<CvExtractionResult | null>(null)
  const [edited, setEdited] = useState<Extracted>({})
  // For scalar conflicts, which side to keep: 'new' (extracted) or 'old' (existing)
  const [choices, setChoices] = useState<Record<string, 'new' | 'old'>>({})

  const reset = () => {
    setPhase('upload'); setError(''); setResult(null); setEdited({}); setChoices({})
  }

  const handleFile = async (file: File) => {
    setError('')
    if (file.size > 8 * 1024 * 1024) { setError('That file is over 8 MB. Please upload a smaller PDF or DOCX.'); return }
    const okType = /\.(pdf|docx)$/i.test(file.name)
    if (!okType) { setError('Please upload a PDF or DOCX file.'); return }
    setPhase('loading')
    try {
      const res = await importCv(file)
      setResult(res)
      setEdited({ ...res.profile })
      // Default conflict choice = keep extracted for empty existing, else prompt
      const c: Record<string, 'new' | 'old'> = {}
      for (const k of ['full_name', 'email', 'phone', 'location', 'headline', 'summary', 'website', 'github', 'linkedin']) {
        const oldV = (existingProfile?.[k] as string) || ''
        const newV = (res.profile[k] as string) || ''
        if (oldV && newV && oldV !== newV) c[k] = 'new'
      }
      setChoices(c)
      setPhase('review')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not process this file.')
      setPhase('upload')
    }
  }

  // Build the final profile: merge arrays (dedupe), apply scalar choices/edits.
  const buildMerged = (): Extracted => {
    const ex = existingProfile || {}
    const merged: Extracted = { ...ex }
    for (const k of ['full_name', 'email', 'phone', 'location', 'headline', 'summary', 'website', 'github', 'linkedin']) {
      const editedV = edited[k] as string
      const oldV = (ex[k] as string) || ''
      if (choices[k] === 'old') merged[k] = oldV
      else merged[k] = editedV ?? (ex[k] || '')
    }
    // Merge list sections (dedupe by JSON identity)
    const mergeList = (key: string) => {
      const a = Array.isArray(ex[key]) ? (ex[key] as unknown[]) : []
      const b = Array.isArray(edited[key]) ? (edited[key] as unknown[]) : []
      const seen = new Set(a.map((x) => JSON.stringify(x)))
      const out = [...a]
      for (const item of b) { const k = JSON.stringify(item); if (!seen.has(k)) { seen.add(k); out.push(item) } }
      merged[key] = out
    }
    for (const key of ['education', 'experience', 'projects', 'certifications', 'languages']) mergeList(key)
    // Merge skills maps
    const oldSkills = (ex.skills as Record<string, string[]>) || {}
    const newSkills = (edited.skills as Record<string, string[]>) || {}
    const skills: Record<string, string[]> = { ...oldSkills }
    for (const [cat, items] of Object.entries(newSkills)) {
      skills[cat] = [...new Set([...(skills[cat] || []), ...items])]
    }
    merged.skills = skills
    // Carry construction cards if extracted as certifications
    return merged
  }

  const apply = () => {
    onApply(buildMerged(), result?.suggestedTrack || 'tech')
    reset()
    onClose()
  }

  const setField = (k: string, v: string) => setEdited((p) => ({ ...p, [k]: v }))

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => { reset(); onClose() }}
        >
          <motion.div
            initial={{ scale: 0.96, opacity: 0, y: 16 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.96, opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="bg-bg-elevated rounded-card-lg border border-border-subtle max-w-2xl w-full max-h-[88vh] shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-border-subtle flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <FileText size={20} className="text-accent-indigo" />
                <h2 className="font-heading text-lg font-semibold text-text-primary">Upload your CV to fill your profile</h2>
              </div>
              <button onClick={() => { reset(); onClose() }} className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-colors"><X size={18} /></button>
            </div>

            <div className="p-5 overflow-y-auto flex-1">
              {/* Upload */}
              {phase === 'upload' && (
                <div>
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-bg-tertiary/60 border border-border-subtle mb-4">
                    <ShieldCheck size={16} className="text-accent-emerald mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-text-secondary leading-relaxed">{PRIVACY_NOTE}</p>
                  </div>
                  <button
                    onClick={() => fileRef.current?.click()}
                    className="w-full py-10 rounded-xl border-2 border-dashed border-border-default hover:border-accent-indigo hover:bg-accent-indigo/[0.03] transition-colors flex flex-col items-center gap-2"
                  >
                    <Upload size={28} className="text-accent-indigo" />
                    <span className="text-sm font-medium text-text-primary">Choose a PDF or DOCX CV</span>
                    <span className="text-xs text-text-muted">Max 8 MB · nothing is saved until you approve</span>
                  </button>
                  <input ref={fileRef} type="file" accept=".pdf,.docx" className="hidden"
                    onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
                  {error && <p className="text-sm text-accent-rose mt-3 flex items-center gap-1.5"><AlertTriangle size={14} /> {error}</p>}
                </div>
              )}

              {/* Loading */}
              {phase === 'loading' && (
                <div className="py-16 flex flex-col items-center gap-3">
                  <Loader2 size={28} className="text-accent-indigo animate-spin" />
                  <p className="text-sm text-text-secondary">Reading your CV and extracting your details…</p>
                </div>
              )}

              {/* Review */}
              {phase === 'review' && result && (
                <div className="space-y-5">
                  {result.warnings.length > 0 && (
                    <div className="p-3 rounded-lg bg-accent-amber-muted border border-accent-amber/20">
                      {result.warnings.map((w, i) => (
                        <p key={i} className="text-xs text-accent-amber flex items-start gap-1.5"><Info size={12} className="mt-0.5 flex-shrink-0" /> {w}</p>
                      ))}
                    </div>
                  )}

                  {/* Scalar fields (editable, with conflict choice) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {Object.keys(FIELD_LABELS).map((k) => {
                      const oldV = (existingProfile?.[k] as string) || ''
                      const newV = (edited[k] as string) || ''
                      const conflict = oldV && newV && oldV !== newV
                      const meta = result.fieldMetadata[k]
                      const fullWidth = k === 'summary' || k === 'headline'
                      return (
                        <div key={k} className={fullWidth ? 'sm:col-span-2' : ''}>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-xs font-medium text-text-secondary">{FIELD_LABELS[k]}</label>
                            {meta && <span className="text-[10px] text-text-muted">{Math.round(meta.confidence * 100)}% confident</span>}
                          </div>
                          {k === 'summary' ? (
                            <textarea value={newV} onChange={(e) => setField(k, e.target.value)} rows={3}
                              className="w-full px-3 py-2 rounded-input bg-bg-tertiary border border-border-default text-sm text-text-primary focus:border-accent-indigo focus:outline-none resize-y" />
                          ) : (
                            <input value={newV} onChange={(e) => setField(k, e.target.value)}
                              className="w-full h-9 px-3 rounded-input bg-bg-tertiary border border-border-default text-sm text-text-primary focus:border-accent-indigo focus:outline-none" />
                          )}
                          {conflict && (
                            <div className="flex items-center gap-2 mt-1 text-[11px]">
                              <span className="text-text-muted">Existing: “{oldV}”</span>
                              <button onClick={() => { setChoices((c) => ({ ...c, [k]: 'old' })); setField(k, oldV) }}
                                className={`px-1.5 py-0.5 rounded ${choices[k] === 'old' ? 'bg-accent-indigo text-white' : 'bg-bg-tertiary text-text-secondary'}`}>Keep existing</button>
                              <button onClick={() => setChoices((c) => ({ ...c, [k]: 'new' }))}
                                className={`px-1.5 py-0.5 rounded ${choices[k] !== 'old' ? 'bg-accent-indigo text-white' : 'bg-bg-tertiary text-text-secondary'}`}>Use uploaded</button>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>

                  {/* List sections summary (merged, deduped on save) */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { k: 'experience', label: 'Experience' },
                      { k: 'education', label: 'Education' },
                      { k: 'projects', label: 'Projects' },
                      { k: 'skills', label: 'Skills' },
                    ].map(({ k, label }) => (
                      <div key={k} className="p-2.5 rounded-lg bg-bg-tertiary/50 border border-border-subtle text-center">
                        <p className="text-lg font-bold text-text-primary">{countItems(edited[k])}</p>
                        <p className="text-[11px] text-text-muted">{label} found</p>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-text-muted">
                    Experience, education, projects and skills will be <span className="text-text-secondary">merged</span> with your existing profile (duplicates removed) when you approve.
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            {phase === 'review' && (
              <div className="flex justify-end gap-3 p-5 border-t border-border-subtle flex-shrink-0">
                <button onClick={reset} className="px-4 py-2 rounded-button border border-border-default text-sm text-text-secondary hover:bg-bg-tertiary transition-colors">Upload a different file</button>
                <button onClick={apply} className="flex items-center gap-1.5 px-5 py-2 rounded-button bg-accent-emerald text-[#0B0F19] text-sm font-semibold hover:bg-accent-emerald/90 transition-colors">
                  <Check size={15} /> Approve &amp; fill my profile
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
