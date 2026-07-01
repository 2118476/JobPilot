// ═══════════════════════════════════════════════════════════════════════════════
// errors.ts — Comprehensive Error Handling System
// ═══════════════════════════════════════════════════════════════════════════════
// Provides typed error classification, user-friendly messages, and helper
// functions for consistent error handling across the application.
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Error Categories ────────────────────────────────────────────────────────

export const ErrorType = {
  NETWORK: 'network' as const,
  AUTH: 'auth' as const,
  VALIDATION: 'validation' as const,
  NOT_FOUND: 'not_found' as const,
  PERMISSION: 'permission' as const,
  SERVER: 'server' as const,
  RATE_LIMIT: 'rate_limit' as const,
  TIMEOUT: 'timeout' as const,
  UNKNOWN: 'unknown' as const,
}
export type ErrorType = (typeof ErrorType)[keyof typeof ErrorType]

// ─── Error Messages Catalog ──────────────────────────────────────────────────

export const ERROR_MESSAGES: Record<string, {
  title: string
  message: string
  suggestion: string
  retryable: boolean
}> = {
  // ── Auth errors ──
  'auth/invalid-credentials': {
    title: 'Login Failed',
    message: 'The email or password you entered is incorrect.',
    suggestion: 'Double-check your email and password. If you forgot your password, use the reset link below.',
    retryable: true,
  },
  'auth/user-not-found': {
    title: 'Account Not Found',
    message: 'No account exists with this email address.',
    suggestion: 'Check your email address for typos, or create a new account.',
    retryable: true,
  },
  'auth/email-in-use': {
    title: 'Email Already Registered',
    message: 'An account with this email already exists.',
    suggestion: 'Try logging in instead, or use a different email address.',
    retryable: true,
  },
  'auth/weak-password': {
    title: 'Password Too Weak',
    message: 'Your password must be at least 8 characters.',
    suggestion: 'Use a mix of letters, numbers, and symbols for a stronger password.',
    retryable: true,
  },
  'auth/session-expired': {
    title: 'Session Expired',
    message: 'Your session has expired. Please log in again.',
    suggestion: 'Log in again to continue using JobPilot AI.',
    retryable: true,
  },
  'auth/network-failed': {
    title: 'Connection Failed',
    message: 'Could not connect to the authentication service.',
    suggestion: 'Check your internet connection and try again. If the problem persists, the service may be temporarily unavailable.',
    retryable: true,
  },
  'auth/too-many-requests': {
    title: 'Too Many Attempts',
    message: 'Too many login attempts. Please try again later.',
    suggestion: 'Wait a few minutes before trying again. Consider resetting your password.',
    retryable: true,
  },

  // ── Network errors ──
  'network/offline': {
    title: 'You Are Offline',
    message: 'No internet connection detected.',
    suggestion: 'Check your Wi-Fi or mobile data connection and try again.',
    retryable: true,
  },
  'network/timeout': {
    title: 'Request Timed Out',
    message: 'The server took too long to respond.',
    suggestion: 'Your connection may be slow. Try again in a moment.',
    retryable: true,
  },
  'network/dns-failed': {
    title: 'Connection Failed',
    message: 'Could not reach the server.',
    suggestion: 'The service may be down. Please try again later.',
    retryable: true,
  },

  // ── Server errors ──
  'server/internal': {
    title: 'Server Error',
    message: 'Something went wrong on our end.',
    suggestion: 'This is a temporary issue. Please try again in a few moments.',
    retryable: true,
  },
  'server/maintenance': {
    title: 'Under Maintenance',
    message: 'JobPilot AI is currently undergoing maintenance.',
    suggestion: 'We will be back shortly. Please try again later.',
    retryable: true,
  },
  'server/unavailable': {
    title: 'Service Unavailable',
    message: 'The service is temporarily unavailable.',
    suggestion: 'Please try again later. We apologize for the inconvenience.',
    retryable: true,
  },

  // ── Validation errors ──
  'validation/required': {
    title: 'Missing Information',
    message: 'Please fill in all required fields.',
    suggestion: 'Complete the highlighted fields and try again.',
    retryable: true,
  },
  'validation/email': {
    title: 'Invalid Email',
    message: 'Please enter a valid email address.',
    suggestion: 'Check your email format (e.g., name@example.com).',
    retryable: true,
  },
  'validation/password-match': {
    title: 'Passwords Do Not Match',
    message: 'The passwords you entered do not match.',
    suggestion: 'Make sure both password fields are identical.',
    retryable: true,
  },

  // ── Generic ──
  'unknown/generic': {
    title: 'Something Went Wrong',
    message: 'An unexpected error occurred.',
    suggestion: 'Please try again. If the problem persists, contact support.',
    retryable: true,
  },
}

// ─── AppError Class ──────────────────────────────────────────────────────────

export interface AppErrorOptions {
  code: string
  message?: string
  type?: ErrorType
  field?: string
  suggestion?: string
  retryable?: boolean
  originalError?: unknown
}

export class AppError extends Error {
  public readonly code: string
  public readonly type: ErrorType
  public readonly field?: string
  public readonly suggestion: string
  public readonly retryable: boolean
  public readonly timestamp: string
  public readonly originalError?: unknown

  constructor(options: AppErrorOptions) {
    const messageInfo = getErrorMessage(options.code)
    const message = options.message || messageInfo.message

    super(message)

    this.name = 'AppError'
    this.code = options.code
    this.type = options.type || ErrorType.UNKNOWN
    this.field = options.field
    this.suggestion = options.suggestion || messageInfo.suggestion
    this.retryable = options.retryable ?? messageInfo.retryable
    this.timestamp = new Date().toISOString()
    this.originalError = options.originalError

    // Maintain proper prototype chain
    Object.setPrototypeOf(this, AppError.prototype)
  }

  /** Serialize to a plain object for logging/storage */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      type: this.type,
      message: this.message,
      field: this.field,
      suggestion: this.suggestion,
      retryable: this.retryable,
      timestamp: this.timestamp,
      stack: this.stack,
    }
  }

  /** Get user-friendly message bundle */
  toUserMessage(): { title: string; message: string; suggestion: string; retryable: boolean } {
    const messageInfo = getErrorMessage(this.code)
    return {
      title: messageInfo.title,
      message: this.message || messageInfo.message,
      suggestion: this.suggestion || messageInfo.suggestion,
      retryable: this.retryable,
    }
  }
}

// ─── Helper Functions ────────────────────────────────────────────────────────

/**
 * Get the error message entry for a given error code.
 * Falls back to the generic unknown error if the code is not found.
 */
export function getErrorMessage(code: string): {
  title: string
  message: string
  suggestion: string
  retryable: boolean
} {
  return ERROR_MESSAGES[code] || ERROR_MESSAGES['unknown/generic']
}

/**
 * Classify any unknown error into a proper AppError instance.
 * Handles native Errors, network failures, auth errors, and more.
 */
export function classifyError(error: unknown): AppError {
  // Already an AppError — pass through
  if (error instanceof AppError) {
    return error
  }

  // Handle native Error instances
  if (error instanceof Error) {
    const msg = error.message.toLowerCase()

    // Auth errors
    if (msg.includes('invalid login') || msg.includes('invalid credentials')) {
      return new AppError({ code: 'auth/invalid-credentials', type: ErrorType.AUTH, originalError: error })
    }
    if (msg.includes('user not found')) {
      return new AppError({ code: 'auth/user-not-found', type: ErrorType.AUTH, originalError: error })
    }
    if (msg.includes('already registered') || msg.includes('email already') || msg.includes('user already')) {
      return new AppError({ code: 'auth/email-in-use', type: ErrorType.AUTH, originalError: error })
    }
    if (msg.includes('weak password') || msg.includes('password too short')) {
      return new AppError({ code: 'auth/weak-password', type: ErrorType.AUTH, originalError: error })
    }
    if (msg.includes('session') && msg.includes('expired')) {
      return new AppError({ code: 'auth/session-expired', type: ErrorType.AUTH, originalError: error })
    }
    if (msg.includes('too many requests')) {
      return new AppError({ code: 'auth/too-many-requests', type: ErrorType.RATE_LIMIT, originalError: error })
    }

    // Network errors
    if (msg.includes('failed to fetch') || msg.includes('networkerror') || msg.includes('network error')) {
      return new AppError({ code: 'auth/network-failed', type: ErrorType.NETWORK, originalError: error })
    }
    if (msg.includes('timeout')) {
      return new AppError({ code: 'network/timeout', type: ErrorType.TIMEOUT, originalError: error })
    }
    if (msg.includes('offline') || msg.includes('internet')) {
      return new AppError({ code: 'network/offline', type: ErrorType.NETWORK, originalError: error })
    }
    if (msg.includes('dns') || msg.includes('enotfound') || msg.includes('econnrefused')) {
      return new AppError({ code: 'network/dns-failed', type: ErrorType.NETWORK, originalError: error })
    }

    // Server errors
    if (msg.includes('internal server error') || msg.includes('500')) {
      return new AppError({ code: 'server/internal', type: ErrorType.SERVER, originalError: error })
    }
    if (msg.includes('maintenance')) {
      return new AppError({ code: 'server/maintenance', type: ErrorType.SERVER, originalError: error })
    }
    if (msg.includes('unavailable') || msg.includes('503')) {
      return new AppError({ code: 'server/unavailable', type: ErrorType.SERVER, originalError: error })
    }

    // Validation errors
    if (msg.includes('required') || msg.includes('missing')) {
      return new AppError({ code: 'validation/required', type: ErrorType.VALIDATION, originalError: error })
    }
    if (msg.includes('invalid email')) {
      return new AppError({ code: 'validation/email', type: ErrorType.VALIDATION, originalError: error })
    }
    if (msg.includes('password') && msg.includes('match')) {
      return new AppError({ code: 'validation/password-match', type: ErrorType.VALIDATION, originalError: error })
    }

    // Unknown — carry the original message
    return new AppError({
      code: 'unknown/generic',
      message: error.message,
      type: ErrorType.UNKNOWN,
      originalError: error,
    })
  }

  // Handle string errors
  if (typeof error === 'string') {
    return classifyError(new Error(error))
  }

  // Handle null/undefined or any other type
  return new AppError({
    code: 'unknown/generic',
    message: 'An unexpected error occurred.',
    type: ErrorType.UNKNOWN,
    originalError: error,
  })
}

/** Check if an error is a network-related error */
export function isNetworkError(error: unknown): boolean {
  const classified = error instanceof AppError ? error : classifyError(error)
  return classified.type === ErrorType.NETWORK || classified.type === ErrorType.TIMEOUT
}

/** Check if an error is an auth-related error */
export function isAuthError(error: unknown): boolean {
  const classified = error instanceof AppError ? error : classifyError(error)
  return classified.type === ErrorType.AUTH
}

/** Check if an error is retryable */
export function isRetryable(error: unknown): boolean {
  const classified = error instanceof AppError ? error : classifyError(error)
  return classified.retryable
}


