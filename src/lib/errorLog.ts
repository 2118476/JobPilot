// ═══════════════════════════════════════════════════════════════════════════════
// errorLog.ts — Structured Error Logging System
// ═══════════════════════════════════════════════════════════════════════════════
// Provides persistent error logging with localStorage, including metadata
// like timestamp, context, URL, and user agent. Supports export for debugging.
// ═══════════════════════════════════════════════════════════════════════════════

import type { AppError } from './errors'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ErrorLogEntry {
  /** ISO 8601 timestamp when the error occurred */
  timestamp: string
  /** Machine-readable error code (e.g., 'auth/invalid-credentials') */
  code: string
  /** Error category (e.g., 'auth', 'network', 'validation') */
  type: string
  /** Human-readable error message */
  message: string
  /** Contextual description of where the error occurred */
  context: string
  /** Full URL at the time of the error */
  url: string
  /** Browser user agent string */
  userAgent: string
}

// ─── Constants ───────────────────────────────────────────────────────────────

const STORAGE_KEY = 'jobpilot_error_log'
const MAX_ENTRIES = 100

// ─── Core Functions ──────────────────────────────────────────────────────────

/**
 * Log an error with full metadata to localStorage.
 * Errors are stored in a FIFO queue (max 100 entries).
 */
export function logError(error: AppError, context?: string): void {
  if (typeof window === 'undefined') return

  const entry: ErrorLogEntry = {
    timestamp: error.timestamp,
    code: error.code,
    type: error.type,
    message: error.message,
    context: context || 'general',
    url: window.location.href,
    userAgent: navigator.userAgent,
  }

  try {
    const existing = getErrorLog()
    existing.unshift(entry)

    // Enforce max size (FIFO)
    if (existing.length > MAX_ENTRIES) {
      existing.length = MAX_ENTRIES
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing))
  } catch {
    // localStorage may be unavailable (private browsing, quota exceeded)
  }

  // Also log to console for immediate visibility
  console.error(
    `[${entry.type.toUpperCase()}] ${entry.code}${context ? ` | ${context}` : ''}: ${entry.message}`,
    error.toJSON?.() ?? error,
  )
}

/**
 * Retrieve all error log entries from localStorage.
 * Returns newest first.
 */
export function getErrorLog(): ErrorLogEntry[] {
  if (typeof window === 'undefined') return []

  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []

    const parsed = JSON.parse(raw) as ErrorLogEntry[]
    // Validate shape — filter out malformed entries
    return parsed.filter(
      (entry): entry is ErrorLogEntry =>
        typeof entry === 'object' &&
        entry !== null &&
        typeof entry.timestamp === 'string' &&
        typeof entry.code === 'string' &&
        typeof entry.type === 'string' &&
        typeof entry.message === 'string',
    )
  } catch {
    // Malformed JSON or localStorage unavailable
    return []
  }
}

/**
 * Clear all error log entries from localStorage.
 */
export function clearErrorLog(): void {
  if (typeof window === 'undefined') return

  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // localStorage may be unavailable
  }
}

/**
 * Export the error log as a formatted JSON string.
 * Useful for attaching to support tickets or bug reports.
 */
export function exportErrorLog(): string {
  const entries = getErrorLog()

  const exportPayload = {
    exportedAt: new Date().toISOString(),
    entryCount: entries.length,
    entries,
  }

  return JSON.stringify(exportPayload, null, 2)
}

/**
 * Download the error log as a JSON file.
 */
export function downloadErrorLog(): void {
  if (typeof window === 'undefined') return

  const json = exportErrorLog()
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)

  const a = document.createElement('a')
  a.href = url
  a.download = `jobpilot-error-log-${new Date().toISOString().slice(0, 10)}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)

  URL.revokeObjectURL(url)
}

/**
 * Get a summary of error counts by type.
 */
export function getErrorSummary(): Record<string, number> {
  const entries = getErrorLog()
  const summary: Record<string, number> = {}

  for (const entry of entries) {
    summary[entry.type] = (summary[entry.type] || 0) + 1
  }

  return summary
}
