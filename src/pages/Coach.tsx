import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Sparkles, Send, Bot, User } from 'lucide-react'
import { ApiError, coachChat, type CoachMessage } from '@/lib/api'

const SUGGESTIONS = [
  'What should I focus on this week?',
  'How do I improve my CV for junior Java roles?',
  'What skills should I learn next to get more matches?',
  'Help me prepare for a junior developer interview',
  'How do I explain my career gap / non-tech work?',
]

export default function Coach() {
  const [messages, setMessages] = useState<CoachMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, loading])

  const send = async (text: string) => {
    const content = text.trim()
    if (!content || loading) return
    const next: CoachMessage[] = [...messages, { role: 'user', content }]
    setMessages(next)
    setInput('')
    setLoading(true)
    try {
      const res = await coachChat(next)
      setMessages([...next, { role: 'assistant', content: res.text }])
    } catch (error) {
      const content = error instanceof ApiError
        ? error.message
        : 'Sorry — I could not reach the coach. Please try again in a moment.'
      setMessages([...next, { role: 'assistant', content }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-[calc(100dvh-120px)] max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-indigo to-accent-violet flex items-center justify-center">
          <Sparkles size={20} className="text-white" />
        </div>
        <div>
          <h1 className="font-heading text-xl font-semibold text-text-primary">AI Career Coach</h1>
          <p className="text-xs text-text-muted">Grounded in your real profile and live pipeline</p>
        </div>
      </div>

      {/* Conversation */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto rounded-card bg-bg-secondary border border-border-subtle p-4 space-y-4">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center px-6">
            <div className="w-14 h-14 rounded-2xl bg-accent-indigo-muted flex items-center justify-center mb-4">
              <Bot size={26} className="text-accent-indigo" />
            </div>
            <h2 className="font-heading text-lg font-semibold text-text-primary mb-1">Ask me anything about your job hunt</h2>
            <p className="text-sm text-text-muted max-w-md mb-6">
              I know your skills, projects and current matches. I&apos;ll give honest, practical, junior-focused advice.
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="px-3 py-2 rounded-full text-xs font-medium border border-border-default text-text-secondary hover:bg-bg-tertiary hover:border-accent-indigo/40 hover:text-text-primary transition-all"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex gap-3 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}
          >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${m.role === 'user' ? 'bg-bg-tertiary' : 'bg-accent-indigo-muted'}`}>
              {m.role === 'user' ? <User size={15} className="text-text-secondary" /> : <Sparkles size={15} className="text-accent-indigo" />}
            </div>
            <div
              className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                m.role === 'user'
                  ? 'bg-accent-indigo text-white rounded-tr-sm'
                  : 'bg-bg-tertiary text-text-primary rounded-tl-sm'
              }`}
            >
              {m.content}
            </div>
          </motion.div>
        ))}

        {loading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-lg bg-accent-indigo-muted flex items-center justify-center flex-shrink-0">
              <Sparkles size={15} className="text-accent-indigo" />
            </div>
            <div className="px-4 py-3 rounded-2xl rounded-tl-sm bg-bg-tertiary flex items-center gap-1.5">
              {[0, 1, 2].map((d) => (
                <span key={d} className="w-1.5 h-1.5 rounded-full bg-text-muted animate-bounce" style={{ animationDelay: `${d * 0.15}s` }} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Composer */}
      <form
        onSubmit={(e) => { e.preventDefault(); send(input) }}
        className="mt-3 flex items-end gap-2"
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input) } }}
          placeholder="Ask your coach… (Enter to send, Shift+Enter for new line)"
          rows={1}
          className="flex-1 resize-none max-h-32 px-4 py-3 rounded-xl bg-bg-tertiary border border-border-default text-sm text-text-primary placeholder:text-text-muted focus:border-accent-indigo focus:ring-2 focus:ring-accent-indigo/15 focus:outline-none transition-all"
        />
        <button
          type="submit"
          disabled={!input.trim() || loading}
          className="h-12 w-12 flex items-center justify-center rounded-xl bg-accent-indigo text-white hover:bg-accent-indigo-hover disabled:opacity-40 disabled:cursor-not-allowed transition-all flex-shrink-0"
          aria-label="Send"
        >
          <Send size={18} />
        </button>
      </form>
    </div>
  )
}
