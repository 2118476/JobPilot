// ═══════════════════════════════════════════════════════════════════════════════
// authStore.ts — Authentication State with Error Tracking
// ═══════════════════════════════════════════════════════════════════════════════
// Zustand store for auth state. Tracks the current user, loading state,
// and the last authentication error for display. Also counts login attempts
// for rate-limiting awareness.
// ═══════════════════════════════════════════════════════════════════════════════

import { create } from 'zustand'
import type { SupabaseCompatibleUser } from '@/lib/supabase'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AuthError {
  message: string
  code: string
  type: 'network' | 'validation' | 'auth' | 'server' | 'timeout' | 'unknown'
  field?: string
  suggestion?: string
  retryable: boolean
  timestamp: string
}

export interface AuthState {
  // ── User ──
  user: SupabaseCompatibleUser | null
  setUser: (user: SupabaseCompatibleUser | null) => void

  // ── Loading ──
  isLoading: boolean
  setIsLoading: (loading: boolean) => void

  // ── Auth status ──
  isAuthenticated: boolean

  // ── Error tracking ──
  lastError: AuthError | null
  setLastError: (error: AuthError) => void
  clearError: () => void

  // ── Rate limiting ──
  authAttemptCount: number
  incrementAttemptCount: () => void
  resetAttemptCount: () => void
  cooldownEnd: number | null
  setCooldownEnd: (ts: number | null) => void
}

// ─── Store ───────────────────────────────────────────────────────────────────

export const useAuthStore = create<AuthState>((set) => ({
  // ── User ──
  user: null,
  setUser: (user) => set({ user, isAuthenticated: !!user }),

  // ── Loading ──
  isLoading: true,
  setIsLoading: (isLoading) => set({ isLoading }),

  // ── Auth status ──
  isAuthenticated: false,

  // ── Error tracking ──
  lastError: null,
  setLastError: (lastError) => set({ lastError }),
  clearError: () => set({ lastError: null }),

  // ── Rate limiting ──
  authAttemptCount: 0,
  incrementAttemptCount: () =>
    set((state) => ({ authAttemptCount: state.authAttemptCount + 1 })),
  resetAttemptCount: () => set({ authAttemptCount: 0 }),
  cooldownEnd: null,
  setCooldownEnd: (cooldownEnd) => set({ cooldownEnd }),
}))
