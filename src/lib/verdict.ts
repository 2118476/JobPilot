// ─────────────────────────────────────────────────────────────
// verdict.ts — turns an AI match score + analysis into a clear,
// human recommendation so users instantly know what to do next.
// ─────────────────────────────────────────────────────────────
import type { Job } from '@/types'

export interface Verdict {
  label: string
  advice: string
  tone: 'emerald' | 'indigo' | 'amber' | 'rose'
}

const TONE_CLASSES: Record<Verdict['tone'], string> = {
  emerald: 'bg-accent-emerald-muted text-accent-emerald',
  indigo: 'bg-accent-indigo-muted text-accent-indigo',
  amber: 'bg-accent-amber-muted text-accent-amber',
  rose: 'bg-accent-rose-muted text-accent-rose',
}

export const verdictClasses = (v: Verdict) => TONE_CLASSES[v.tone]

/** Derive an actionable verdict from the job's AI analysis. */
export function jobVerdict(job: Pick<Job, 'match_score' | 'match_analysis' | 'title'>): Verdict | null {
  if (!job.match_analysis) return null
  const score = job.match_score || 0
  const text = `${job.title || ''} ${job.match_analysis.explanation || ''}`.toLowerCase()
  const tooSenior =
    /too senior|more senior|senior[- ]level role|\b(senior|lead|principal|staff|head of|director)\b/.test(text) &&
    score < 60

  if (tooSenior) {
    return { label: 'Too senior', advice: 'This role expects more experience than your profile shows — not recommended.', tone: 'rose' }
  }
  if (score >= 85) {
    return { label: 'Strong match — apply now', advice: 'Your profile lines up well. Generate a tailored CV and apply today.', tone: 'emerald' }
  }
  if (score >= 70) {
    return { label: 'Apply with tailored CV', advice: 'A good fit — a tailored CV that mirrors the job wording will lift your chances.', tone: 'indigo' }
  }
  if (score >= 55) {
    return { label: 'Possible — needs work', advice: 'Worth considering, but close the missing skills first or address them in your cover letter.', tone: 'amber' }
  }
  return { label: 'Weak match', advice: 'Your profile does not cover enough of this role — better options likely exist.', tone: 'rose' }
}
