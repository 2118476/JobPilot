// ═══════════════════════════════════════════════════════════════════════════════
// useAuth.ts — Authentication Hook with Comprehensive Error Handling
// ═══════════════════════════════════════════════════════════════════════════════
// Provides login, register, logout, and resetPassword functions with
// enriched error objects including type classification, field mapping,
// user-friendly suggestions, and retry indicators.
//
// NOTE: Session bootstrap has been lifted to useSessionBootstrap.ts which
// is called once at the App root. This hook only exposes auth ACTIONS.
// ═══════════════════════════════════════════════════════════════════════════════

import { useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { classifyError, AppError, ErrorType } from '@/lib/errors'
import { logError as persistError } from '@/lib/errorLog'
import type { SupabaseCompatibleUser } from '@/lib/supabase'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AuthErrorDetails {
  type: 'network' | 'validation' | 'auth' | 'server' | 'timeout' | 'unknown'
  field?: string
  suggestion?: string
  retryable: boolean
  timestamp: string
}

export interface AuthResult {
  success: boolean
  error: string | null // Human-readable message
  errorCode: string | null // Machine-readable code for i18n/debugging
  errorDetails: AuthErrorDetails | null
}

// ─── Enriched User Type ──────────────────────────────────────────────────────

export type User = SupabaseCompatibleUser

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Build a standardized AuthResult from an error.
 */
function buildErrorResult(err: unknown, context: string): AuthResult {
  const classified = classifyError(err)

  // Persist error to log
  persistError(classified, context)

  return {
    success: false,
    error: classified.message,
    errorCode: classified.code,
    errorDetails: {
      type: classified.type as AuthErrorDetails['type'],
      field: classified.field,
      suggestion: classified.suggestion,
      retryable: classified.retryable,
      timestamp: classified.timestamp,
    },
  }
}

function buildSuccessResult(): AuthResult {
  return {
    success: true,
    error: null,
    errorCode: null,
    errorDetails: null,
  }
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useAuth() {
  const {
    user,
    setUser,
    isLoading,
    setIsLoading,
    isAuthenticated,
    setLastError,
    clearError,
    incrementAttemptCount,
    resetAttemptCount,
    authAttemptCount,
    cooldownEnd,
    setCooldownEnd,
  } = useAuthStore()

  // ── Login ────────────────────────────────────────────────────────────────
  const login = useCallback(
    async (email: string, password: string): Promise<AuthResult> => {
      // Check cooldown
      if (cooldownEnd && Date.now() < cooldownEnd) {
        const appErr = new AppError({
          code: 'auth/too-many-requests',
          message: 'Too many login attempts. Please wait before trying again.',
          type: ErrorType.RATE_LIMIT,
          retryable: true,
        })
        setLastError({
          message: appErr.message,
          code: appErr.code,
          type: appErr.type as AuthErrorDetails['type'],
          retryable: appErr.retryable,
          timestamp: appErr.timestamp,
        })
        return buildErrorResult(appErr, 'login')
      }

      setIsLoading(true)
      clearError()
      incrementAttemptCount()

      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (error) {
          // Check if we should trigger cooldown after this failure
          const newAttemptCount = authAttemptCount + 1
          if (newAttemptCount >= 5) {
            setCooldownEnd(Date.now() + 30000) // 30 second cooldown
          }

          // Map Supabase-style errors to our error system
          const appErr = new AppError({
            code: mapSupabaseErrorToCode(error.message),
            message: error.message,
            type: ErrorType.AUTH,
            retryable: true,
          })
          setLastError({
            message: appErr.message,
            code: appErr.code,
            type: appErr.type as AuthErrorDetails['type'],
            retryable: appErr.retryable,
            timestamp: appErr.timestamp,
          })
          return buildErrorResult(appErr, 'login')
        }

        // Success: reset rate limiting
        resetAttemptCount()
        setCooldownEnd(null)
        setUser(data.user)
        return buildSuccessResult()
      } catch (err) {
        const result = buildErrorResult(err, 'login')
        if (result.errorDetails) {
          setLastError({
            message: result.error ?? '',
            code: result.errorCode ?? '',
            type: result.errorDetails.type,
            retryable: result.errorDetails.retryable,
            timestamp: result.errorDetails.timestamp,
          })
        }
        return result
      } finally {
        setIsLoading(false)
      }
    },
    [
      setUser,
      setIsLoading,
      setLastError,
      clearError,
      incrementAttemptCount,
      resetAttemptCount,
      authAttemptCount,
      cooldownEnd,
      setCooldownEnd,
    ],
  )

  // ── Register ──────────────────────────────────────────────────────────────
  const register = useCallback(
    async (email: string, password: string, fullName: string): Promise<AuthResult> => {
      setIsLoading(true)
      clearError()

      try {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName },
          },
        })

        if (error) {
          const appErr = new AppError({
            code: mapSupabaseErrorToCode(error.message),
            message: error.message,
            type: ErrorType.AUTH,
            retryable: true,
          })
          setLastError({
            message: appErr.message,
            code: appErr.code,
            type: appErr.type as AuthErrorDetails['type'],
            retryable: appErr.retryable,
            timestamp: appErr.timestamp,
          })
          const result = buildErrorResult(appErr, 'register')
          return result
        }

        setUser(data.user)
        return buildSuccessResult()
      } catch (err) {
        const result = buildErrorResult(err, 'register')
        if (result.errorDetails) {
          setLastError({
            message: result.error ?? '',
            code: result.errorCode ?? '',
            type: result.errorDetails.type,
            retryable: result.errorDetails.retryable,
            timestamp: result.errorDetails.timestamp,
          })
        }
        return result
      } finally {
        setIsLoading(false)
      }
    },
    [setUser, setIsLoading, setLastError, clearError],
  )

  // ── Logout ────────────────────────────────────────────────────────────────
  const logout = useCallback(async (): Promise<AuthResult> => {
    setIsLoading(true)
    clearError()

    try {
      const { error } = await supabase.auth.signOut()

      if (error) {
        // Even if signOut fails, clear the local user state
        setUser(null)
        const result = buildErrorResult(error, 'logout')
        return result
      }

      setUser(null)
      return buildSuccessResult()
    } catch (err) {
      setUser(null)
      return buildErrorResult(err, 'logout')
    } finally {
      setIsLoading(false)
    }
  }, [setUser, setIsLoading, clearError])

  // ── Reset Password ────────────────────────────────────────────────────────
  const resetPassword = useCallback(
    async (email: string): Promise<AuthResult> => {
      setIsLoading(true)
      clearError()

      try {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/#/reset-password`,
        })

        if (error) {
          const result = buildErrorResult(error, 'reset-password')
          return result
        }

        return buildSuccessResult()
      } catch (err) {
        return buildErrorResult(err, 'reset-password')
      } finally {
        setIsLoading(false)
      }
    },
    [setIsLoading, clearError],
  )

  return {
    user,
    isLoading,
    isAuthenticated,
    isReady: true, // Always true — bootstrap is handled at App root
    login,
    register,
    logout,
    resetPassword,
  }
}

// ─── Error Mapping ───────────────────────────────────────────────────────────

/**
 * Map Supabase/mock error messages to our error codes.
 */
function mapSupabaseErrorToCode(message: string): string {
  const lower = message.toLowerCase()

  if (lower.includes('invalid login')) return 'auth/invalid-credentials'
  if (lower.includes('invalid credentials')) return 'auth/invalid-credentials'
  if (lower.includes('user not found')) return 'auth/user-not-found'
  if (lower.includes('already registered')) return 'auth/email-in-use'
  if (lower.includes('user already')) return 'auth/email-in-use'
  if (lower.includes('email already')) return 'auth/email-in-use'
  if (lower.includes('weak password')) return 'auth/weak-password'
  if (lower.includes('at least 8')) return 'auth/weak-password'
  if (lower.includes('session expired')) return 'auth/session-expired'
  if (lower.includes('too many requests')) return 'auth/too-many-requests'
  if (lower.includes('not authenticated')) return 'auth/session-expired'
  if (lower.includes('failed to fetch')) return 'auth/network-failed'
  if (lower.includes('network')) return 'auth/network-failed'

  return 'unknown/generic'
}

// ─── Type Export ─────────────────────────────────────────────────────────────

export type AuthHook = ReturnType<typeof useAuth>
