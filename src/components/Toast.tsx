import { useEffect, useRef, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Info,
  Loader2,
  X,
} from 'lucide-react'
import type { ToastOptions } from '@/store/toastStore'
import { useToastStore } from '@/store/toastStore'

export { type ToastOptions }

const toastConfig = {
  success: {
    icon: CheckCircle,
    accentColor: '#34D399',
    accentBg: 'rgba(52,211,153,0.12)',
    progressColor: 'var(--accent-emerald)',
    iconClass: 'text-emerald-400',
    borderClass: 'border-emerald-500/30',
  },
  error: {
    icon: AlertCircle,
    accentColor: '#FB7185',
    accentBg: 'rgba(251,113,133,0.12)',
    progressColor: 'var(--accent-rose)',
    iconClass: 'text-rose-400',
    borderClass: 'border-rose-500/30',
  },
  warning: {
    icon: AlertTriangle,
    accentColor: '#FBBF24',
    accentBg: 'rgba(251,191,36,0.12)',
    progressColor: 'var(--accent-amber)',
    iconClass: 'text-amber-400',
    borderClass: 'border-amber-500/30',
  },
  info: {
    icon: Info,
    accentColor: '#6366F1',
    accentBg: 'rgba(99,102,241,0.15)',
    progressColor: 'var(--accent-indigo)',
    iconClass: 'text-indigo-400',
    borderClass: 'border-indigo-500/30',
  },
  loading: {
    icon: Loader2,
    accentColor: '#22D3EE',
    accentBg: 'rgba(34,211,238,0.12)',
    progressColor: 'var(--accent-cyan)',
    iconClass: 'text-cyan-400',
    borderClass: 'border-cyan-500/30',
  },
}

function formatTimestamp(timestamp: number): string {
  const now = Date.now()
  const diff = now - timestamp
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)

  if (seconds < 10) return 'Just now'
  if (seconds < 60) return `${seconds}s ago`
  if (minutes < 60) return `${minutes} min ago`
  if (hours < 24) return `${hours}h ago`
  return new Date(timestamp).toLocaleTimeString()
}

interface ToastProps {
  toast: ToastOptions
}

export function Toast({ toast }: ToastProps) {
  const removeToast = useToastStore((s) => s.removeToast)
  const config = toastConfig[toast.type]
  const Icon = config.icon

  const [timeAgo, setTimeAgo] = useState(formatTimestamp(toast.timestamp ?? Date.now()))
  const [progress, setProgress] = useState(100)
  const progressRef = useRef<number>(100)
  const rafRef = useRef<number | null>(null)
  const duration = toast.duration ?? 5000
  const startTimeRef = useRef(Date.now())

  // Update timestamp display
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeAgo(formatTimestamp(toast.timestamp ?? Date.now()))
    }, 10000)
    return () => clearInterval(interval)
  }, [toast.timestamp])

  // Progress bar countdown
  useEffect(() => {
    if (toast.persistent || toast.type === 'loading') return

    startTimeRef.current = Date.now()

    const tick = () => {
      const elapsed = Date.now() - startTimeRef.current
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100)
      progressRef.current = remaining
      setProgress(remaining)

      if (remaining > 0) {
        rafRef.current = requestAnimationFrame(tick)
      }
    }

    rafRef.current = requestAnimationFrame(tick)

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [duration, toast.persistent, toast.type])

  const handleClose = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    removeToast(toast.id)
  }, [removeToast, toast.id])

  return (
    <motion.div
      layout
      initial={{ x: '120%', opacity: 0, scale: 0.9 }}
      animate={{ x: 0, opacity: 1, scale: 1 }}
      exit={{ x: '120%', opacity: 0, scale: 0.9 }}
      transition={{
        type: 'spring',
        stiffness: 400,
        damping: 30,
        mass: 0.8,
      }}
      className={`
        relative w-[380px] max-w-[calc(100vw-2rem)]
        rounded-[12px] border ${config.borderClass}
        bg-[var(--bg-elevated)] shadow-xl shadow-black/20
        overflow-hidden cursor-pointer
        select-none
      `}
      onClick={(e) => {
        // Don't dismiss if clicking action button
        if ((e.target as HTMLElement).closest('[data-toast-action]')) return
        handleClose()
      }}
    >
      {/* Progress bar */}
      {!toast.persistent && toast.type !== 'loading' && (
        <div
          className="absolute bottom-0 left-0 h-[2px] z-10"
          style={{
            width: `${progress}%`,
            backgroundColor: config.accentColor,
            transition: 'width 50ms linear',
          }}
        />
      )}

      {/* Loading bar animation */}
      {toast.type === 'loading' && (
        <div className="absolute bottom-0 left-0 h-[2px] w-full overflow-hidden">
          <motion.div
            className="h-full"
            style={{ backgroundColor: config.accentColor }}
            animate={{ x: ['-100%', '100%'] }}
            transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}
          />
        </div>
      )}

      <div className="flex items-start gap-3 p-4 pb-3">
        {/* Icon */}
        <div
          className={`
            flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center
            ${toast.type === 'loading' ? '' : config.iconClass}
          `}
          style={{
            backgroundColor: config.accentBg,
          }}
        >
          {toast.type === 'loading' ? (
            <Loader2 className={`w-4 h-4 ${config.iconClass} animate-spin-slow`} />
          ) : (
            <Icon className="w-4 h-4" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h4 className="font-heading font-semibold text-sm text-[var(--text-primary)] leading-tight">
              {toast.title}
            </h4>
            <button
              onClick={handleClose}
              className="flex-shrink-0 p-0.5 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors"
              aria-label="Close toast"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <p className="mt-1 text-xs text-[var(--text-secondary)] leading-relaxed">
            {toast.message}
          </p>

          {toast.suggestion && (
            <p className="mt-1.5 text-[11px] text-[var(--text-muted)] leading-relaxed">
              {toast.suggestion}
            </p>
          )}

          <div className="flex items-center justify-between mt-2">
            {/* Timestamp */}
            <span className="text-[10px] text-[var(--text-muted)] tabular-nums">
              {timeAgo}
            </span>

            {/* Action button */}
            {toast.action && (
              <button
                data-toast-action
                onClick={(e) => {
                  e.stopPropagation()
                  toast.action?.onClick()
                  handleClose()
                }}
                className="
                  px-3 py-1 rounded-button text-[11px] font-medium
                  bg-[var(--accent-indigo)] text-white
                  hover:bg-[var(--accent-indigo-hover)] transition-colors
                "
              >
                {toast.action.label}
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}
