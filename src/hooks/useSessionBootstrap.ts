// ═══════════════════════════════════════════════════════════════════════════════
// useSessionBootstrap.ts — Session Bootstrap at App Root
// ═══════════════════════════════════════════════════════════════════════════════
// Called ONCE in App.tsx above the router. Checks localStorage for an existing
// session and sets up the onAuthStateChange listener. This runs independently
// of routes, so refreshing a protected page no longer deadlocks.
// ═══════════════════════════════════════════════════════════════════════════════

import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { SupabaseCompatibleSession } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { classifyError } from '@/lib/errors'
import { logError } from '@/lib/errorLog'

export function useSessionBootstrap() {
  const setUser = useAuthStore((s) => s.setUser)
  const setIsLoading = useAuthStore((s) => s.setIsLoading)

  useEffect(() => {
    let active = true

    // Check for existing session on first mount
    ;(async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (active) setUser(session?.user ?? null)
      } catch (err) {
        logError(classifyError(err), 'session-bootstrap')
        if (active) setUser(null)
      } finally {
        if (active) setIsLoading(false)
      }
    })()

    // Subscribe to auth state changes (exactly ONE subscription app-wide)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event: string, session: SupabaseCompatibleSession | null) => {
        setUser(session?.user ?? null)
        setIsLoading(false)
      },
    )

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [setUser, setIsLoading])
}
