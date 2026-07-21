import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Sparkles, Send, Bot, User, Mic, Square, ShieldCheck,
  Check, X, LoaderCircle, AlertCircle,
} from 'lucide-react'
import {
  ApiError,
  coachChat,
  confirmCoachProfileUpdate,
  type CoachMessage,
  type CoachProfileUpdate,
} from '@/lib/api'
import { useTrackStore } from '@/store/trackStore'
import { useUIStore } from '@/store/uiStore'

const TECH_SUGGESTIONS = [
  'What should I focus on this week?',
  'How do I improve my CV for junior Java roles?',
  'What skills should I learn next to get more matches?',
  'Help me prepare for a junior developer interview',
  'Ask me questions to complete my Career Profile',
]

const CONSTRUCTION_SUGGESTIONS = [
  'What site roles fit my current cards and experience?',
  'Ask me questions to complete my Trades / Site profile',
  'How can I make my site-work CV stronger?',
  'What should I focus on this week?',
  'Help me prepare for a construction interview',
]

type UpdateState = 'pending' | 'saving' | 'saved' | 'declined' | 'error'

interface ConversationMessage extends CoachMessage {
  profileUpdate?: CoachProfileUpdate
  updateState?: UpdateState
  updateError?: string
}

interface SpeechResultLike {
  isFinal: boolean
  0: { transcript: string }
}

interface SpeechRecognitionLike {
  continuous: boolean
  interimResults: boolean
  lang: string
  start: () => void
  stop: () => void
  abort: () => void
  onresult: ((event: { resultIndex: number; results: ArrayLike<SpeechResultLike> }) => void) | null
  onend: (() => void) | null
  onerror: ((event: { error: string }) => void) | null
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike

function proposalDetails(changes: Record<string, unknown>): { label: string; value: string }[] {
  const details: { label: string; value: string }[] = []
  const labels: Record<string, string> = {
    full_name: 'Name', location: 'Location', headline: 'Target role', summary: 'Profile summary',
    goals: 'Career goals', email: 'Email', phone: 'Phone', website: 'Website', linkedin: 'LinkedIn',
    github: 'GitHub', cards_certifications: 'Cards & certifications', certifications: 'Certifications',
    skills_to_learn: 'Learning goals', skills: 'Skills', experience: 'Experience', education: 'Education',
    projects: 'Projects', preferences: 'Job preferences', additional: 'Additional details',
  }

  for (const [field, raw] of Object.entries(changes)) {
    let value = ''
    if (typeof raw === 'string' || typeof raw === 'number') value = String(raw)
    else if (Array.isArray(raw)) {
      value = raw.map((item) => {
        if (typeof item === 'string') return item
        if (item && typeof item === 'object') {
          const entry = item as Record<string, unknown>
          return String(entry.role || entry.degree || entry.name || entry.institution || 'New entry') +
            (entry.dates ? ` (${entry.dates})` : '')
        }
        return ''
      }).filter(Boolean).join(', ')
    } else if (raw && typeof raw === 'object') {
      const object = raw as Record<string, unknown>
      value = Object.entries(object).map(([key, item]) =>
        `${key}: ${Array.isArray(item) ? item.join(', ') : String(item)}`,
      ).join(' · ')
    }
    if (value) details.push({ label: labels[field] || field.replaceAll('_', ' '), value: value.slice(0, 320) })
  }
  return details.slice(0, 10)
}

export default function Coach() {
  const activeTrack = useTrackStore((s) => s.activeTrack)
  const addToast = useUIStore((s) => s.addToast)
  const suggestions = activeTrack === 'construction' ? CONSTRUCTION_SUGGESTIONS : TECH_SUGGESTIONS
  const [messages, setMessages] = useState<ConversationMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [speechSupported, setSpeechSupported] = useState(false)
  const [listening, setListening] = useState(false)
  const [speechError, setSpeechError] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)
  const speechBaseRef = useRef('')

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, loading])

  useEffect(() => {
    const speechWindow = window as typeof window & {
      SpeechRecognition?: SpeechRecognitionConstructor
      webkitSpeechRecognition?: SpeechRecognitionConstructor
    }
    const Recognition = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition
    if (!Recognition) return

    const recognition = new Recognition()
    recognition.continuous = false
    recognition.interimResults = true
    recognition.lang = 'en-GB'
    recognition.onresult = (event) => {
      let transcript = ''
      for (let i = 0; i < event.results.length; i++) transcript += event.results[i][0]?.transcript || ''
      setInput([speechBaseRef.current, transcript.trim()].filter(Boolean).join(' '))
    }
    recognition.onend = () => setListening(false)
    recognition.onerror = (event) => {
      setListening(false)
      setSpeechError(event.error === 'not-allowed'
        ? 'Microphone permission was not granted. You can still type your answer.'
        : 'Voice input stopped. Please try again or type your answer.')
    }
    recognitionRef.current = recognition
    setSpeechSupported(true)
    return () => recognition.abort()
  }, [])

  const send = async (text: string) => {
    const content = text.trim()
    if (!content || loading) return
    const next: ConversationMessage[] = [...messages, { role: 'user', content }]
    setMessages(next)
    setInput('')
    setSpeechError('')
    setLoading(true)
    try {
      const history: CoachMessage[] = next.map(({ role, content: messageContent }) => ({ role, content: messageContent }))
      const res = await coachChat(history)
      setMessages([...next, {
        role: 'assistant',
        content: res.text,
        profileUpdate: res.profile_update || undefined,
        updateState: res.profile_update ? 'pending' : undefined,
      }])
    } catch (error) {
      const errorText = error instanceof ApiError
        ? error.message
        : 'Sorry — I could not reach the coach. Please try again in a moment.'
      setMessages([...next, { role: 'assistant', content: errorText }])
    } finally {
      setLoading(false)
    }
  }

  const confirmUpdate = async (index: number, profileUpdate: CoachProfileUpdate) => {
    setMessages((current) => current.map((message, i) =>
      i === index ? { ...message, updateState: 'saving', updateError: undefined } : message,
    ))
    try {
      const result = await confirmCoachProfileUpdate(profileUpdate)
      setMessages((current) => current.map((message, i) =>
        i === index ? { ...message, updateState: 'saved' } : message,
      ))
      addToast({
        type: 'success',
        title: 'Profile updated',
        message: `Added to your ${result.track === 'construction' ? 'Trades / Site' : 'Tech / Office'} profile.`,
      })
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'The update could not be saved. Please try again.'
      setMessages((current) => current.map((item, i) =>
        i === index ? { ...item, updateState: 'error', updateError: message } : item,
      ))
    }
  }

  const declineUpdate = (index: number) => {
    setMessages((current) => current.map((message, i) =>
      i === index ? { ...message, updateState: 'declined' } : message,
    ))
  }

  const toggleVoice = () => {
    const recognition = recognitionRef.current
    if (!recognition) {
      setSpeechError('Voice input is not supported in this browser. Chrome or Edge provides the best experience.')
      return
    }
    if (listening) {
      recognition.stop()
      setListening(false)
      return
    }
    speechBaseRef.current = input.trim()
    setSpeechError('')
    try {
      recognition.start()
      setListening(true)
    } catch {
      setSpeechError('Voice input is already active. Please wait a moment and try again.')
    }
  }

  return (
    <div className="flex flex-col h-[calc(100dvh-120px)] max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-indigo to-accent-violet flex items-center justify-center">
          <Sparkles size={20} className="text-white" />
        </div>
        <div>
          <h1 className="font-heading text-xl font-semibold text-text-primary">AI Career Coach</h1>
          <p className="text-xs text-text-muted">Grounded in your real profile · saves details only with your permission</p>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto rounded-card bg-bg-secondary border border-border-subtle p-4 space-y-4">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center px-6">
            <div className="w-14 h-14 rounded-2xl bg-accent-indigo-muted flex items-center justify-center mb-4">
              <Bot size={26} className="text-accent-indigo" />
            </div>
            <h2 className="font-heading text-lg font-semibold text-text-primary mb-1">Your JobPilot career conversation</h2>
            <p className="text-sm text-text-muted max-w-md mb-6">
              Tell me about your experience and goals. I can prepare profile updates, but nothing is saved until you approve it.
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => send(suggestion)}
                  className="px-3 py-2 rounded-full text-xs font-medium border border-border-default text-text-secondary hover:bg-bg-tertiary hover:border-accent-indigo/40 hover:text-text-primary transition-all"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((message, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
          >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${message.role === 'user' ? 'bg-bg-tertiary' : 'bg-accent-indigo-muted'}`}>
              {message.role === 'user' ? <User size={15} className="text-text-secondary" /> : <Sparkles size={15} className="text-accent-indigo" />}
            </div>
            <div className={`max-w-[85%] ${message.role === 'user' ? '' : 'space-y-2'}`}>
              <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                message.role === 'user'
                  ? 'bg-accent-indigo text-white rounded-tr-sm'
                  : 'bg-bg-tertiary text-text-primary rounded-tl-sm'
              }`}>
                {message.content}
              </div>

              {message.profileUpdate && (
                <div className="rounded-xl border border-accent-indigo/30 bg-accent-indigo-muted/20 p-4">
                  <div className="flex items-start gap-2.5">
                    <ShieldCheck size={18} className="text-accent-indigo mt-0.5 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-text-primary">
                        Add this to your {message.profileUpdate.track === 'construction' ? 'Trades / Site' : 'Tech / Office'} profile?
                      </p>
                      <p className="text-xs text-text-secondary mt-1">{message.profileUpdate.summary}</p>
                      <div className="mt-3 space-y-2">
                        {proposalDetails(message.profileUpdate.changes).map((detail) => (
                          <div key={`${detail.label}-${detail.value}`} className="text-xs">
                            <span className="font-medium text-text-primary">{detail.label}: </span>
                            <span className="text-text-secondary">{detail.value}</span>
                          </div>
                        ))}
                      </div>

                      {(message.updateState === 'pending' || message.updateState === 'error') && (
                        <div className="flex flex-wrap gap-2 mt-4">
                          <button
                            onClick={() => confirmUpdate(index, message.profileUpdate!)}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-accent-indigo text-white text-xs font-semibold hover:bg-accent-indigo-hover transition-colors"
                          >
                            <Check size={14} /> Yes, add to profile
                          </button>
                          <button
                            onClick={() => declineUpdate(index)}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border-default text-text-secondary text-xs font-medium hover:bg-bg-tertiary transition-colors"
                          >
                            <X size={14} /> No, not now
                          </button>
                        </div>
                      )}
                      {message.updateState === 'saving' && (
                        <p className="mt-3 flex items-center gap-1.5 text-xs text-accent-indigo">
                          <LoaderCircle size={14} className="animate-spin" /> Saving securely…
                        </p>
                      )}
                      {message.updateState === 'saved' && (
                        <p className="mt-3 flex items-center gap-1.5 text-xs font-medium text-accent-emerald">
                          <Check size={14} /> Added to your profile
                        </p>
                      )}
                      {message.updateState === 'declined' && (
                        <p className="mt-3 text-xs text-text-muted">Not saved. You can share or edit these details later.</p>
                      )}
                      {message.updateState === 'error' && message.updateError && (
                        <p className="mt-3 flex items-start gap-1.5 text-xs text-accent-rose">
                          <AlertCircle size={14} className="mt-0.5 flex-shrink-0" /> {message.updateError}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        ))}

        {loading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-lg bg-accent-indigo-muted flex items-center justify-center flex-shrink-0">
              <Sparkles size={15} className="text-accent-indigo" />
            </div>
            <div className="px-4 py-3 rounded-2xl rounded-tl-sm bg-bg-tertiary flex items-center gap-1.5">
              {[0, 1, 2].map((delay) => (
                <span key={delay} className="w-1.5 h-1.5 rounded-full bg-text-muted animate-bounce" style={{ animationDelay: `${delay * 0.15}s` }} />
              ))}
            </div>
          </div>
        )}
      </div>

      <form onSubmit={(event) => { event.preventDefault(); send(input) }} className="mt-3">
        <div className="flex items-end gap-2">
          <div className="relative flex-1">
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); send(input) } }}
              placeholder={listening ? 'Listening… speak naturally' : 'Ask or tell your coach something…'}
              rows={1}
              className={`w-full resize-none max-h-32 pl-4 pr-12 py-3 rounded-xl bg-bg-tertiary border text-sm text-text-primary placeholder:text-text-muted focus:ring-2 focus:outline-none transition-all ${
                listening ? 'border-accent-rose focus:border-accent-rose focus:ring-accent-rose/15' : 'border-border-default focus:border-accent-indigo focus:ring-accent-indigo/15'
              }`}
            />
            <button
              type="button"
              onClick={toggleVoice}
              disabled={!speechSupported && !speechError}
              className={`absolute right-2 bottom-2 h-8 w-8 rounded-lg flex items-center justify-center transition-all ${
                listening ? 'bg-accent-rose text-white animate-pulse' : 'text-text-muted hover:text-accent-indigo hover:bg-accent-indigo-muted disabled:opacity-30'
              }`}
              aria-label={listening ? 'Stop voice input' : 'Start voice input'}
              title={speechSupported ? 'Use your microphone to dictate' : 'Voice input is not supported in this browser'}
            >
              {listening ? <Square size={14} /> : <Mic size={16} />}
            </button>
          </div>
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="h-12 w-12 flex items-center justify-center rounded-xl bg-accent-indigo text-white hover:bg-accent-indigo-hover disabled:opacity-40 disabled:cursor-not-allowed transition-all flex-shrink-0"
            aria-label="Send"
          >
            <Send size={18} />
          </button>
        </div>
        <p className={`mt-1.5 px-1 text-[11px] ${speechError ? 'text-accent-rose' : listening ? 'text-accent-rose' : 'text-text-muted'}`}>
          {speechError || (listening
            ? 'Listening now — press stop when finished. Review the transcript before sending.'
            : speechSupported
              ? 'Voice is handled by your browser. JobPilot sends only the transcript when you press Send.'
              : 'Enter to send · Shift+Enter for a new line')}
        </p>
      </form>
    </div>
  )
}
