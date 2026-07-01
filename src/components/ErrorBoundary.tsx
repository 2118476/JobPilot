import { Component, type ReactNode, type ErrorInfo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AlertTriangle,
  RefreshCw,
  Home,
  Copy,
  ChevronDown,
  ChevronUp,
  Download,
  CheckCircle,
} from 'lucide-react'
import { classifyError } from '@/lib/errors'
import { logError } from '@/lib/errorLog'

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
  copied: boolean
  detailsOpen: boolean
}

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      copied: false,
      detailsOpen: false,
    }
  }

  static getDerivedStateFromError(_error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log to console
    console.error('[ErrorBoundary] Caught error:', error)
    console.error('[ErrorBoundary] Component stack:', errorInfo.componentStack)

    this.setState({ error, errorInfo })

    // Log to unified error log (includes component stack context)
    logError(classifyError(error), 'react-error-boundary')
  }

  handleReload = () => {
    window.location.reload()
  }

  handleGoHome = () => {
    window.location.hash = '#/dashboard'
    this.setState({ hasError: false, error: null, errorInfo: null })
  }

  handleCopyError = async () => {
    const { error, errorInfo } = this.state
    if (!error) return

    const details = [
      `Error: ${error.name}: ${error.message}`,
      `URL: ${window.location.href}`,
      `Time: ${new Date().toISOString()}`,
      `Browser: ${navigator.userAgent}`,
      '',
      'Stack Trace:',
      error.stack || 'No stack trace',
      '',
      'Component Stack:',
      errorInfo?.componentStack || 'No component stack',
    ].join('\n')

    try {
      await navigator.clipboard.writeText(details)
      this.setState({ copied: true })
      setTimeout(() => this.setState({ copied: false }), 2000)
    } catch {
      // Fallback
      const textarea = document.createElement('textarea')
      textarea.value = details
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      this.setState({ copied: true })
      setTimeout(() => this.setState({ copied: false }), 2000)
    }
  }

  handleExportReport = () => {
    const { error, errorInfo } = this.state
    if (!error) return

    const report = {
      name: error.name,
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo?.componentStack,
      url: window.location.href,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
    }

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `error-report-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  toggleDetails = () => {
    this.setState((s) => ({ detailsOpen: !s.detailsOpen }))
  }

  render() {
    if (this.state.hasError) {
      // Custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback
      }

      const { error, copied, detailsOpen } = this.state
      const errorCode = error?.name
        ? `${error.name}-${btoa(error.message).slice(0, 8).toUpperCase()}`
        : 'UNKNOWN-ERROR'

      return (
        <div className="min-h-[100dvh] flex items-center justify-center bg-[var(--bg-primary)] p-4">
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-lg"
          >
            <div className="rounded-card-lg bg-[var(--bg-secondary)] border border-border-subtle shadow-2xl shadow-black/30 overflow-hidden">
              {/* Header */}
              <div className="flex flex-col items-center pt-10 pb-6 px-8 text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.1, type: 'spring', stiffness: 300, damping: 20 }}
                  className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
                  style={{ backgroundColor: 'rgba(251,113,133,0.12)' }}
                >
                  <AlertTriangle className="w-8 h-8 text-[var(--accent-rose)]" />
                </motion.div>

                <motion.h1
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  className="font-heading text-2xl font-bold text-[var(--text-primary)]"
                >
                  Something Went Wrong
                </motion.h1>

                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="mt-3 text-sm text-[var(--text-secondary)] max-w-sm"
                >
                  {error?.message || 'An unexpected error occurred.'}
                </motion.p>

                {/* Error Code */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.25 }}
                  className="mt-4 px-3 py-1 rounded-md bg-[var(--bg-tertiary)] border border-border-subtle"
                >
                  <code className="text-[11px] font-mono text-[var(--accent-rose)] tracking-wider">
                    {errorCode}
                  </code>
                </motion.div>

                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="mt-4 text-xs text-[var(--text-muted)]"
                >
                  Try refreshing the page or going back to the dashboard.
                </motion.p>

                {/* Action buttons */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35 }}
                  className="flex flex-wrap items-center justify-center gap-3 mt-6"
                >
                  <button
                    onClick={this.handleReload}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-button bg-[var(--accent-indigo)] text-white text-sm font-medium hover:bg-[var(--accent-indigo-hover)] transition-colors"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Reload Page
                  </button>
                  <button
                    onClick={this.handleGoHome}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-button bg-[var(--bg-elevated)] border border-border-default text-[var(--text-primary)] text-sm font-medium hover:bg-[var(--bg-tertiary)] transition-colors"
                  >
                    <Home className="w-4 h-4" />
                    Go to Dashboard
                  </button>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="mt-3"
                >
                  <button
                    onClick={this.handleCopyError}
                    className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
                  >
                    {copied ? (
                      <>
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        Copy Error Details
                      </>
                    )}
                  </button>
                </motion.div>
              </div>

              {/* Error Details Accordion */}
              <div className="border-t border-border-subtle">
                <button
                  onClick={this.toggleDetails}
                  className="w-full flex items-center justify-between px-8 py-3 text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
                >
                  <span className="font-medium">Error Details</span>
                  {detailsOpen ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>

                <AnimatePresence>
                  {detailsOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="px-8 pb-6 space-y-3">
                        <div className="space-y-1.5">
                          <label className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-medium">
                            Error
                          </label>
                          <div className="p-3 rounded-card-sm bg-[var(--bg-tertiary)] border border-border-subtle">
                            <p className="text-xs font-mono text-[var(--accent-rose)]">
                              {error?.name}: {error?.message}
                            </p>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-medium">
                            Component Stack
                          </label>
                          <pre className="p-3 rounded-card-sm bg-[var(--bg-tertiary)] border border-border-subtle text-[11px] font-mono text-[var(--text-secondary)] overflow-x-auto whitespace-pre-wrap max-h-40 overflow-y-auto">
                            {this.state.errorInfo?.componentStack || 'N/A'}
                          </pre>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <label className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-medium">
                              URL
                            </label>
                            <p className="text-xs text-[var(--text-secondary)] font-mono break-all">
                              {window.location.href}
                            </p>
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-medium">
                              Timestamp
                            </label>
                            <p className="text-xs text-[var(--text-secondary)] font-mono">
                              {new Date().toISOString()}
                            </p>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-medium">
                            Browser
                          </label>
                          <p className="text-xs text-[var(--text-secondary)] font-mono break-all">
                            {navigator.userAgent}
                          </p>
                        </div>

                        <button
                          onClick={this.handleExportReport}
                          className="flex items-center gap-2 px-3 py-2 rounded-button text-xs font-medium text-[var(--text-secondary)] bg-[var(--bg-elevated)] border border-border-default hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] transition-colors"
                        >
                          <Download className="w-3.5 h-3.5" />
                          Export Error Report
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        </div>
      )
    }

    return this.props.children
  }
}
