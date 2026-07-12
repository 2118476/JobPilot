import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, Send, ExternalLink, Loader2, AlertCircle, CornerDownLeft } from 'lucide-react'
import { jobChat, updateJob, type AssistantAction, type AssistantCitation, type CoachMessage } from '@/lib/api'
import { useUIStore } from '@/store/uiStore'
import type { Job } from '@/types'

// ─────────────────────────────────────────────────────────────
// JobAssistant — chat about ONE job. The backend resolves the job
// from the authenticated user, so we only send the job id + messages.
// Read-only suggested actions run immediately (navigation/generation);
// data-changing actions (save / apply / follow-up) require an explicit
// in-UI confirmation before calling the backend.
// ─────────────────────────────────────────────────────────────

const SUGGESTIONS = [
  'Why is this a match?',
  'Should I apply?',
  'What am I missing?',
  'Is it too senior for me?',
  'What should my cover letter mention?',
]

type Msg = CoachMessage & { citations?: AssistantCitation[]; actions?: AssistantAction[] }

export function JobAssistant({
  job,
  onOpenCv,
  onOpenCl,
  onPrepInterview,
}: {
  job: Job
  onOpenCv: () => void
  onOpenCl: () => void
  onPrepInterview: () => void
}) {
  const navigate = useNavigate()
  const addToast = useUIStore((s) => s.addToast)
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [pending, setPending] = useState<AssistantAction | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, loading])

  const send = async (text: string) => {
    const content = text.trim()
    if (!content || loading) return
    setError('')
    setInput('')
    const history: Msg[] = [...messages, { role: 'user', content }]
    setMessages(history)
    setLoading(true)
    try {
      const apiMsgs: CoachMessage[] = history.map((m) => ({ role: m.role, content: m.content }))
      const res = await jobChat(job.id, apiMsgs, { includeOriginalPage: false })
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: res.message.content, citations: res.citations, actions: res.suggestedActions },
      ])
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      setError(/Failed to fetch|NetworkError/i.test(msg) ? 'Can’t reach the assistant — is the backend running?' : msg)
    } finally {
      setLoading(false)
    }
  }

  // Run a suggested action. Read-only → immediate; mutating → confirm first.
  const runAction = (a: AssistantAction) => {
    if (a.requiresConfirmation) {
      setPending(a)
      return
    }
    switch (a.type) {
      case 'open_original_job':
        if (job.source_url) window.open(job.source_url, '_blank', 'noopener,noreferrer')
        break
      case 'generate_cv':
        onOpenCv()
        break
      case 'generate_cover_letter':
        onOpenCl()
        break
      case 'prepare_interview':
        onPrepInterview()
        break
      case 'show_similar_jobs':
        navigate(`/jobs?q=${encodeURIComponent(job.title)}`)
        break
    }
  }

  const confirmAction = async (a: AssistantAction) => {
    setPending(null)
    try {
      if (a.type === 'save_job') {
        await updateJob(job.id, { saved: true, status: 'saved' })
        addToast({ type: 'success', title: 'Job saved' })
      } else if (a.type === 'mark_applied') {
        const d = new Date()
        d.setDate(d.getDate() + 7)
        await updateJob(job.id, { status: 'applied', applied_date: new Date().toISOString(), next_action: 'Follow up on application', next_action_date: d.toISOString(), reminder_date: d.toISOString(), reminder_set: true })
        addToast({ type: 'success', title: 'Marked applied', message: '7-day follow-up reminder set.' })
      } else if (a.type === 'set_follow_up') {
        const d = new Date()
        d.setDate(d.getDate() + 7)
        await updateJob(job.id, { next_action: 'Follow up', next_action_date: d.toISOString(), reminder_date: d.toISOString(), reminder_set: true })
        addToast({ type: 'success', title: 'Follow-up set for 7 days' })
      }
    } catch {
      addToast({ type: 'error', title: 'Action failed', message: 'Backend unreachable — please try again.' })
    }
  }

  return (
    <div className="rounded-card bg-bg-secondary border border-border-subtle p-6 flex flex-col" style={{ maxHeight: 560 }}>
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-accent-indigo-muted flex items-center justify-center">
          <Sparkles size={16} className="text-accent-indigo" />
        </div>
        <div>
          <h2 className="font-heading text-lg font-semibold text-text-primary">Ask about this job</h2>
          <p className="text-xs text-text-muted">Grounded in your profile — no invented facts</p>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-3 pr-1">
        {messages.length === 0 && (
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => send(s)}
                className="px-3 py-1.5 rounded-full bg-bg-tertiary border border-border-subtle text-xs text-text-secondary hover:border-accent-indigo hover:text-text-primary transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
            <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm ${m.role === 'user' ? 'bg-accent-indigo text-white' : 'bg-bg-tertiary text-text-primary'}`}>
              <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>

              {/* Citations */}
              {m.citations && m.citations.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2 pt-2 border-t border-border-subtle/40">
                  {m.citations.map((c) => (
                    <span key={`${c.type}-${c.id}`} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-bg-secondary/60 text-[10px] text-text-muted">
                      <span className="w-1.5 h-1.5 rounded-full bg-accent-indigo" /> {c.label}
                    </span>
                  ))}
                </div>
              )}

              {/* Suggested actions */}
              {m.actions && m.actions.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2.5">
                  {m.actions.map((a) => (
                    <button
                      key={a.type}
                      onClick={() => runAction(a)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                        a.requiresConfirmation
                          ? 'bg-accent-amber-muted text-accent-amber hover:brightness-110'
                          : 'bg-accent-indigo-muted text-accent-indigo hover:brightness-110'
                      }`}
                    >
                      {a.type === 'open_original_job' && <ExternalLink size={11} />}
                      {a.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2 text-sm text-text-muted">
            <Loader2 size={14} className="animate-spin" /> Thinking…
          </div>
        )}
        {error && (
          <div className="flex items-start gap-2 text-sm text-accent-rose bg-accent-rose-muted rounded-lg p-2.5">
            <AlertCircle size={14} className="mt-0.5 flex-shrink-0" /> {error}
          </div>
        )}
      </div>

      {/* Confirmation card */}
      <AnimatePresence>
        {pending && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="mt-3 p-3 rounded-lg bg-accent-amber-muted border border-accent-amber/30"
          >
            <p className="text-sm text-text-primary mb-2">
              {pending.type === 'save_job' && 'Save this job to your pipeline?'}
              {pending.type === 'mark_applied' && 'Mark this job as applied and set a 7-day follow-up reminder?'}
              {pending.type === 'set_follow_up' && 'Add a follow-up reminder in 7 days?'}
            </p>
            <div className="flex gap-2">
              <button onClick={() => confirmAction(pending)} className="px-3 py-1.5 rounded-lg bg-accent-amber text-[#0B0F19] text-xs font-semibold">Confirm</button>
              <button onClick={() => setPending(null)} className="px-3 py-1.5 rounded-lg border border-border-default text-text-secondary text-xs">Cancel</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input */}
      <div className="mt-3 flex items-end gap-2">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              send(input)
            }
          }}
          rows={1}
          placeholder="Ask anything about this job…"
          className="flex-1 resize-none max-h-28 px-3 py-2.5 rounded-input bg-bg-tertiary border border-border-default text-sm text-text-primary placeholder:text-text-muted focus:border-accent-indigo focus:outline-none"
          aria-label="Message the job assistant"
        />
        <button
          onClick={() => send(input)}
          disabled={loading || !input.trim()}
          className="h-10 w-10 flex items-center justify-center rounded-button bg-accent-indigo text-white disabled:opacity-40 hover:bg-accent-indigo-hover transition-colors"
          aria-label="Send"
        >
          <Send size={16} />
        </button>
      </div>
      <p className="text-[10px] text-text-muted mt-1.5 flex items-center gap-1">
        <CornerDownLeft size={10} /> Enter to send · Shift+Enter for a new line
      </p>
    </div>
  )
}
