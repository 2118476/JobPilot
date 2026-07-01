// ═══════════════════════════════════════════════════════════════════════════════
// supabase.ts — Supabase client (real when configured, localStorage mock otherwise)
// ═══════════════════════════════════════════════════════════════════════════════
// If VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY are set, this exports a REAL
// @supabase/supabase-js client (real multi-user auth backed by Postgres).
// Otherwise it falls back to the localStorage mock below — so the app keeps
// working in local/demo mode and on a static-only deploy. The mock implements
// the same interface as @supabase/supabase-js auth, so nothing else changes.
// ═══════════════════════════════════════════════════════════════════════════════

import { createClient } from '@supabase/supabase-js'

// ─── Real-vs-mock selection ──────────────────────────────────────────────────

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/** True when real Supabase credentials are present (multi-user mode). */
export const isSupabaseConfigured = !!(SUPABASE_URL && SUPABASE_ANON_KEY)

// ─── Constants ───────────────────────────────────────────────────────────────

const USERS_KEY = 'jobpilot_mock_users'
const SESSION_KEY = 'jobpilot_mock_session'

// NOTE: Mock uses milliseconds epoch for expires_at. Real Supabase uses seconds.
// When swapping to real Supabase, update expiry checks accordingly.
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

// ─── Types ───────────────────────────────────────────────────────────────────

export interface MockUser {
  id: string
  email: string
  user_metadata: { full_name: string }
  created_at: string
  password_hash?: string // base64(salt+sha256) — opaque mock token
}

export interface MockSession {
  user: MockUser
  access_token: string
  expires_at: number
}

/** Supabase-compatible user shape for consumers */
export interface SupabaseCompatibleUser {
  id: string
  email: string
  user_metadata: { full_name: string }
  created_at: string
  app_metadata: Record<string, unknown>
  aud: string
  role?: string
}

/** Supabase-compatible session shape */
export interface SupabaseCompatibleSession {
  user: SupabaseCompatibleUser
  access_token: string
  expires_at: number
  refresh_token: string
  token_type: string
}

// ─── Password Hashing (Web Crypto API) ───────────────────────────────────────

async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const encoder = new TextEncoder()
  const data = encoder.encode(password)
  const combined = new Uint8Array(salt.length + data.length)
  combined.set(salt)
  combined.set(data, salt.length)
  const hash = await crypto.subtle.digest('SHA-256', combined)
  const hashBytes = new Uint8Array(hash)
  const result = new Uint8Array(salt.length + hashBytes.length)
  result.set(salt)
  result.set(hashBytes, salt.length)
  return btoa(String.fromCharCode(...result))
}

async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  try {
    const stored = Uint8Array.from(atob(storedHash), (c) => c.charCodeAt(0))
    const salt = stored.slice(0, 16)
    const encoder = new TextEncoder()
    const data = encoder.encode(password)
    const combined = new Uint8Array(salt.length + data.length)
    combined.set(salt)
    combined.set(data, salt.length)
    const hash = await crypto.subtle.digest('SHA-256', combined)
    const hashBytes = new Uint8Array(hash)
    const expectedHash = stored.slice(16)
    if (hashBytes.length !== expectedHash.length) return false
    return hashBytes.every((b, i) => b === expectedHash[i])
  } catch {
    return false
  }
}

// ─── localStorage Helpers ────────────────────────────────────────────────────

function getUsers(): MockUser[] {
  try {
    const raw = localStorage.getItem(USERS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveUsers(users: MockUser[]): void {
  try {
    localStorage.setItem(USERS_KEY, JSON.stringify(users))
  } catch {
    // localStorage may be unavailable
  }
}

function getSession(): MockSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const session: MockSession = JSON.parse(raw)
    // Check expiry
    if (Date.now() > session.expires_at) {
      localStorage.removeItem(SESSION_KEY)
      return null
    }
    return session
  } catch {
    return null
  }
}

function saveSession(session: MockSession): void {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session))
  } catch {
    // localStorage may be unavailable
  }
}

function clearSession(): void {
  try {
    localStorage.removeItem(SESSION_KEY)
  } catch {
    // localStorage may be unavailable
  }
}

function generateToken(user: MockUser): string {
  const payload = { id: user.id, email: user.email, ts: Date.now() }
  return btoa(JSON.stringify(payload))
}

function generateId(): string {
  return 'mock-' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36)
}

// ─── Auth Response Types ─────────────────────────────────────────────────────

interface AuthResponse<T = { user: SupabaseCompatibleUser | null; session: SupabaseCompatibleSession | null }> {
  data: T
  error: { message: string; status?: number } | null
}

// ─── Auth State Change ───────────────────────────────────────────────────────

type AuthStateChangeCallback = (event: string, session: SupabaseCompatibleSession | null) => void
const authStateListeners: Set<AuthStateChangeCallback> = new Set()

function notifyListeners(event: string, session: SupabaseCompatibleSession | null): void {
  // Defer notification to next tick to mimic async Supabase behavior
  setTimeout(() => {
    authStateListeners.forEach((cb) => {
      try {
        cb(event, session)
      } catch {
        // Ignore listener errors
      }
    })
  }, 0)
}

// ─── Mock Auth Client ────────────────────────────────────────────────────────

const mockAuth = {
  // ── signInWithPassword ───────────────────────────────────────────────────
  signInWithPassword({
    email,
    password,
  }: {
    email: string
    password: string
  }): Promise<AuthResponse> {
    return new Promise((resolve) => {
      setTimeout(async () => {
        const users = getUsers()
        const found = users.find((u) => u.email.toLowerCase() === email.toLowerCase())

        if (!found) {
          resolve({
            data: { user: null, session: null },
            error: { message: 'Invalid login credentials', status: 400 },
          })
          return
        }

        if (!password || password.length < 1) {
          resolve({
            data: { user: null, session: null },
            error: { message: 'Invalid login credentials', status: 400 },
          })
          return
        }

        // Verify password hash
        if (found.password_hash) {
          const valid = await verifyPassword(password, found.password_hash)
          if (!valid) {
            resolve({
              data: { user: null, session: null },
              error: { message: 'Invalid login credentials', status: 400 },
            })
            return
          }
        }
        // Legacy users without password_hash: allow login for backward compat

        const session: MockSession = {
          user: found,
          access_token: generateToken(found),
          expires_at: Date.now() + SESSION_DURATION_MS,
        }
        saveSession(session)

        const compatibleSession = toCompatibleSession(session)
        notifyListeners('SIGNED_IN', compatibleSession)

        resolve({
          data: {
            user: compatibleSession.user,
            session: compatibleSession,
          },
          error: null,
        })
      }, 300) // Simulate network latency
    })
  },

  // ── signUp ───────────────────────────────────────────────────────────────
  signUp({
    email,
    password,
    options,
  }: {
    email: string
    password: string
    options?: { data?: { full_name?: string } }
  }): Promise<AuthResponse> {
    return new Promise((resolve) => {
      setTimeout(async () => {
        const users = getUsers()

        // Check if email already exists
        if (users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
          resolve({
            data: { user: null, session: null },
            error: { message: 'User already registered', status: 422 },
          })
          return
        }

        // Validate password length
        if (!password || password.length < 8) {
          resolve({
            data: { user: null, session: null },
            error: { message: 'Password should be at least 8 characters', status: 422 },
          })
          return
        }

        const passwordHash = await hashPassword(password)

        const newUser: MockUser = {
          id: generateId(),
          email: email.toLowerCase().trim(),
          user_metadata: {
            full_name: options?.data?.full_name || '',
          },
          created_at: new Date().toISOString(),
          password_hash: passwordHash,
        }

        users.push(newUser)
        saveUsers(users)

        const session: MockSession = {
          user: newUser,
          access_token: generateToken(newUser),
          expires_at: Date.now() + SESSION_DURATION_MS,
        }
        saveSession(session)

        const compatibleSession = toCompatibleSession(session)
        notifyListeners('SIGNED_UP', compatibleSession)

        resolve({
          data: {
            user: compatibleSession.user,
            session: compatibleSession,
          },
          error: null,
        })
      }, 300)
    })
  },

  // ── signOut ──────────────────────────────────────────────────────────────
  signOut(): Promise<{ error: null }> {
    return new Promise((resolve) => {
      setTimeout(() => {
        clearSession()
        notifyListeners('SIGNED_OUT', null)
        resolve({ error: null })
      }, 150)
    })
  },

  // ── getSession ───────────────────────────────────────────────────────────
  getSession(): Promise<{
    data: { session: SupabaseCompatibleSession | null }
    error: null
  }> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const session = getSession()
        resolve({
          data: { session: session ? toCompatibleSession(session) : null },
          error: null,
        })
      }, 50)
    })
  },

  // ── resetPasswordForEmail ────────────────────────────────────────────────
  resetPasswordForEmail(
    _email: string,
    _options?: { redirectTo?: string },
  ): Promise<{ data: Record<string, unknown>; error: null }> {
    return new Promise((resolve) => {
      setTimeout(() => {
        // In mock mode, just simulate success
        // (No actual email is sent)
        resolve({ data: {}, error: null })
      }, 500)
    })
  },

  // ── updateUser ───────────────────────────────────────────────────────────
  updateUser(attributes: {
    data?: Record<string, unknown>
    email?: string
  }): Promise<AuthResponse> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const session = getSession()
        if (!session) {
          resolve({
            data: { user: null, session: null },
            error: { message: 'Not authenticated', status: 401 },
          })
          return
        }

        // Update user metadata
        if (attributes.data) {
          session.user.user_metadata = {
            ...session.user.user_metadata,
            ...attributes.data,
          } as { full_name: string }
        }

        // Update email if provided
        if (attributes.email) {
          session.user.email = attributes.email
          // Also update in users registry
          const users = getUsers()
          const idx = users.findIndex((u) => u.id === session.user.id)
          if (idx !== -1) {
            users[idx].email = attributes.email
            if (attributes.data) {
              users[idx].user_metadata = { ...users[idx].user_metadata, ...attributes.data } as { full_name: string }
            }
            saveUsers(users)
          }
        }

        saveSession(session)

        const compatibleSession = toCompatibleSession(session)
        notifyListeners('USER_UPDATED', compatibleSession)

        resolve({
          data: {
            user: compatibleSession.user,
            session: compatibleSession,
          },
          error: null,
        })
      }, 200)
    })
  },

  // ── onAuthStateChange ────────────────────────────────────────────────────
  onAuthStateChange(callback: AuthStateChangeCallback): {
    data: { subscription: { unsubscribe: () => void } }
  } {
    authStateListeners.add(callback)

    // Immediately call with current state (like Supabase does)
    const session = getSession()
    if (session) {
      callback('INITIAL_SESSION', toCompatibleSession(session))
    } else {
      callback('INITIAL_SESSION', null)
    }

    return {
      data: {
        subscription: {
          unsubscribe: () => {
            authStateListeners.delete(callback)
          },
        },
      },
    }
  },
}

// ─── Converter: Mock → Supabase-compatible ───────────────────────────────────

function toCompatibleUser(user: MockUser): SupabaseCompatibleUser {
  return {
    ...user,
    app_metadata: {},
    aud: 'authenticated',
  }
}

function toCompatibleSession(session: MockSession): SupabaseCompatibleSession {
  return {
    user: toCompatibleUser(session.user),
    access_token: session.access_token,
    expires_at: session.expires_at,
    refresh_token: session.access_token, // Same as access token in mock
    token_type: 'bearer',
  }
}

// ─── Mock Supabase Client ────────────────────────────────────────────────────

/** Mock Supabase client that implements the same interface as the real one */
const mockSupabase = {
  auth: mockAuth,

  // Minimal from() stub for any code that tries to use the database
  from: (_table: string) => ({
    select: () => Promise.resolve({ data: [], error: null }),
    insert: () => Promise.resolve({ data: null, error: null }),
    update: () => Promise.resolve({ data: null, error: null }),
    delete: () => Promise.resolve({ data: null, error: null }),
    eq: () => Promise.resolve({ data: [], error: null }),
    single: () => Promise.resolve({ data: null, error: null }),
  }),

  // Type compatibility: expose the Database generic
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any

// ─── Exported client: real Supabase if configured, else the mock ─────────────

/**
 * The Supabase client used app-wide. Real (multi-user, Postgres-backed) when
 * VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY are set; otherwise the localStorage
 * mock above. Typed as `any` because the codebase has always treated it loosely.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const supabase: any = isSupabaseConfigured
  ? createClient(SUPABASE_URL as string, SUPABASE_ANON_KEY as string, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    })
  : mockSupabase

// ─── Seed Demo Account (mock mode only) ──────────────────────────────────────

;(async () => {
  if (isSupabaseConfigured) return // real auth — no local seeding
  const users = getUsers()
  if (users.length === 0) {
    try {
      const hash = await hashPassword('Demo1234!')
      const demoUser: MockUser = {
        id: 'demo-user-id',
        email: 'demo@jobpilot.ai',
        user_metadata: { full_name: 'Demo User' },
        created_at: new Date().toISOString(),
        password_hash: hash,
      }
      saveUsers([demoUser])
    } catch {
      // If crypto is unavailable, skip seeding
    }
  }
})()

// Type export for consumers
export type SupabaseClient = typeof supabase

// ─── Development Helpers ─────────────────────────────────────────────────────

/** Clear all mock auth data from localStorage. Useful for testing. */
export function clearMockAuthData(): void {
  localStorage.removeItem(USERS_KEY)
  localStorage.removeItem(SESSION_KEY)
}

/** Get current mock session for debugging. */
export function getMockSession(): MockSession | null {
  return getSession()
}
