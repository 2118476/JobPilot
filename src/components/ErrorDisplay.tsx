
import { motion, AnimatePresence } from 'framer-motion'
import {
  AlertCircle,
  AlertTriangle,
  WifiOff,
  Lock,
  ServerCrash,
  TimerOff,
  HelpCircle,
  X,
  RefreshCw,
  ChevronRight,
} from 'lucide-react'

export interface ErrorDisplayError {
  message: string
  code?: string
  type?: 'network' | 'validation' | 'auth' | 'server' | 'timeout' | 'unknown'
  suggestion?: string
  retryable?: boolean
  field?: string
}

export interface ErrorDisplayProps {
  error: ErrorDisplayError | string | null
  variant?: 'inline' | 'card' | 'banner' | 'modal'
  onRetry?: () => void
  onDismiss?: () => void
  className?: string
}

const errorTypeConfig: Record<
  string,
  {
    icon: typeof AlertCircle
    title: string
    color: string
    bgColor: string
    borderColor: string
    iconColor: string
  }
> = {
  network: {
    icon: WifiOff,
    title: 'Network Error',
    color: '#FBBF24',
    bgColor: 'rgba(251,191,36,0.12)',
    borderColor: 'border-amber-500/30',
    iconColor: 'text-amber-400',
  },
  validation: {
    icon: AlertTriangle,
    title: 'Validation Error',
    color: '#FB923C',
    bgColor: 'rgba(251,146,60,0.12)',
    borderColor: 'border-orange-500/30',
    iconColor: 'text-orange-400',
  },
  auth: {
    icon: Lock,
    title: 'Authentication Error',
    color: '#A78BFA',
    bgColor: 'rgba(167,139,250,0.12)',
    borderColor: 'border-violet-500/30',
    iconColor: 'text-violet-400',
  },
  server: {
    icon: ServerCrash,
    title: 'Server Error',
    color: '#FB7185',
    bgColor: 'rgba(251,113,133,0.12)',
    borderColor: 'border-rose-500/30',
    iconColor: 'text-rose-400',
  },
  timeout: {
    icon: TimerOff,
    title: 'Request Timeout',
    color: '#FBBF24',
    bgColor: 'rgba(251,191,36,0.12)',
    borderColor: 'border-amber-500/30',
    iconColor: 'text-amber-400',
  },
  unknown: {
    icon: HelpCircle,
    title: 'Unexpected Error',
    color: '#FB7185',
    bgColor: 'rgba(251,113,133,0.12)',
    borderColor: 'border-rose-500/30',
    iconColor: 'text-rose-400',
  },
}

function normalizeError(error: ErrorDisplayError | string | null): ErrorDisplayError | null {
  if (!error) return null
  if (typeof error === 'string') {
    return { message: error, type: 'unknown' }
  }
  return error
}

function getErrorConfig(error: ErrorDisplayError) {
  return errorTypeConfig[error.type ?? 'unknown'] ?? errorTypeConfig.unknown
}

// ─── Inline Variant ─────────────────────────────────────────────────

function InlineError({
  error,
  onRetry,
}: {
  error: ErrorDisplayError
  onRetry?: () => void
}) {
  const config = getErrorConfig(error)
  const Icon = config.icon

  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      className="flex items-center gap-1.5"
    >
      <Icon className={`w-3.5 h-3.5 ${config.iconColor} flex-shrink-0`} />
      <span className="text-xs text-[var(--accent-rose)]">
        {error.message}
      </span>
      {onRetry && error.retryable && (
        <button
          onClick={onRetry}
          className="flex items-center gap-0.5 text-xs text-[var(--accent-indigo)] hover:text-[var(--accent-indigo-hover)] transition-colors ml-1"
        >
          <RefreshCw className="w-3 h-3" />
          Retry
        </button>
      )}
    </motion.div>
  )
}

// ─── Card Variant ───────────────────────────────────────────────────

function CardError({
  error,
  onRetry,
  onDismiss,
}: {
  error: ErrorDisplayError
  onRetry?: () => void
  onDismiss?: () => void
}) {
  const config = getErrorConfig(error)
  const Icon = config.icon

  return (
    <motion.div
      role="alert"
      aria-live="assertive"
      initial={{ opacity: 0, y: 8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.97 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className={`
        relative rounded-card border ${config.borderColor}
        bg-[var(--bg-secondary)] overflow-hidden
      `}
      style={{ borderLeftWidth: '3px', borderLeftColor: config.color }}
    >
      <div className="flex items-start gap-3 p-4">
        {/* Icon */}
        <div
          className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: config.bgColor }}
        >
          <Icon className={`w-4 h-4 ${config.iconColor}`} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h4 className="font-heading font-semibold text-sm text-[var(--text-primary)]">
              {config.title}
            </h4>
            {onDismiss && (
              <button
                onClick={onDismiss}
                className="flex-shrink-0 p-0.5 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors"
                aria-label="Dismiss"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <p className="mt-1 text-xs text-[var(--text-secondary)] leading-relaxed">
            {error.message}
          </p>

          {error.suggestion && (
            <div className="mt-2 flex items-start gap-1.5 px-2.5 py-1.5 rounded-card-sm bg-[var(--bg-tertiary)] border border-border-subtle">
              <ChevronRight className="w-3 h-3 text-[var(--accent-indigo)] flex-shrink-0 mt-0.5" />
              <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                <span className="font-medium text-[var(--text-secondary)]">Suggestion: </span>
                {error.suggestion}
              </p>
            </div>
          )}

          <div className="flex items-center gap-2 mt-3">
            {onRetry && error.retryable && (
              <button
                onClick={onRetry}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-button text-xs font-medium bg-[var(--accent-indigo)] text-white hover:bg-[var(--accent-indigo-hover)] transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Retry
              </button>
            )}
            {onDismiss && (
              <button
                onClick={onDismiss}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-button text-xs font-medium bg-[var(--bg-elevated)] border border-border-default text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] transition-colors"
              >
                Dismiss
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Error code */}
      {error.code && (
        <div className="flex justify-end px-4 pb-2">
          <code className="text-[10px] font-mono text-[var(--text-muted)] tabular-nums">
            {error.code}
          </code>
        </div>
      )}
    </motion.div>
  )
}

// ─── Banner Variant ─────────────────────────────────────────────────

function BannerError({
  error,
  onRetry,
  onDismiss,
}: {
  error: ErrorDisplayError
  onRetry?: () => void
  onDismiss?: () => void
}) {
  const config = getErrorConfig(error)
  const Icon = config.icon

  return (
    <motion.div
      role="alert"
      aria-live="assertive"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="w-full"
      style={{ backgroundColor: config.bgColor, borderBottom: `1px solid ${config.color}33` }}
    >
      <div className="max-w-content mx-auto px-4 sm:px-6 py-3 flex items-center gap-3">
        <Icon className={`w-4 h-4 ${config.iconColor} flex-shrink-0`} />
        <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
          <span className="text-sm font-medium" style={{ color: config.color }}>
            {config.title}
          </span>
          <span className="text-xs text-[var(--text-secondary)]">
            {error.message}
          </span>
          {error.suggestion && (
            <span className="text-xs text-[var(--text-muted)] hidden sm:inline">
              {' '}— {error.suggestion}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {onRetry && error.retryable && (
            <button
              onClick={onRetry}
              className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-md transition-colors"
              style={{ color: config.color, backgroundColor: `${config.color}22` }}
            >
              <RefreshCw className="w-3 h-3" />
              Retry
            </button>
          )}
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  )
}

// ─── Modal Variant ──────────────────────────────────────────────────

function ModalError({
  error,
  onRetry,
  onDismiss,
}: {
  error: ErrorDisplayError
  onRetry?: () => void
  onDismiss?: () => void
}) {
  const config = getErrorConfig(error)
  const Icon = config.icon

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-modal flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
        onClick={onDismiss}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-md rounded-card-lg bg-[var(--bg-secondary)] border border-border-subtle shadow-2xl shadow-black/30"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex flex-col items-center pt-8 pb-6 px-6 text-center">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
              style={{ backgroundColor: config.bgColor }}
            >
              <Icon className={`w-7 h-7 ${config.iconColor}`} />
            </div>

            <h3 className="font-heading text-lg font-bold text-[var(--text-primary)]">
              {config.title}
            </h3>

            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              {error.message}
            </p>

            {error.suggestion && (
              <div className="mt-3 px-3 py-2 rounded-card-sm bg-[var(--bg-tertiary)] border border-border-subtle w-full text-left">
                <p className="text-xs text-[var(--text-muted)]">
                  <span className="font-medium text-[var(--text-secondary)]">Suggestion: </span>
                  {error.suggestion}
                </p>
              </div>
            )}

            <div className="flex items-center gap-3 mt-6">
              {onRetry && error.retryable && (
                <button
                  onClick={onRetry}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-button text-sm font-medium bg-[var(--accent-indigo)] text-white hover:bg-[var(--accent-indigo-hover)] transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  Retry
                </button>
              )}
              {onDismiss && (
                <button
                  onClick={onDismiss}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-button text-sm font-medium bg-[var(--bg-elevated)] border border-border-default text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors"
                >
                  Dismiss
                </button>
              )}
            </div>

            {error.code && (
              <code className="mt-3 text-[10px] font-mono text-[var(--text-muted)] tabular-nums">
                {error.code}
              </code>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

// ─── Main Component ─────────────────────────────────────────────────

export function ErrorDisplay({
  error,
  variant = 'card',
  onRetry,
  onDismiss,
  className = '',
}: ErrorDisplayProps) {
  const normalizedError = normalizeError(error)

  if (!normalizedError) return null

  return (
    <div className={className}>
      <AnimatePresence mode="wait">
        <motion.div
          key={`${variant}-${normalizedError.message}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {variant === 'inline' && (
            <InlineError error={normalizedError} onRetry={onRetry} />
          )}
          {variant === 'card' && (
            <CardError
              error={normalizedError}
              onRetry={onRetry}
              onDismiss={onDismiss}
            />
          )}
          {variant === 'banner' && (
            <BannerError
              error={normalizedError}
              onRetry={onRetry}
              onDismiss={onDismiss}
            />
          )}
          {variant === 'modal' && (
            <ModalError
              error={normalizedError}
              onRetry={onRetry}
              onDismiss={onDismiss}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
