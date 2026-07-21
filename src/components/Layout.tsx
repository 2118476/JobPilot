import { useEffect, useRef } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Sidebar } from '@/components/Sidebar'
import { Topbar } from '@/components/Topbar'
import { Footer } from '@/components/Footer'
import { useUIStore } from '@/store/uiStore'
import { getProfile } from '@/lib/api'

const PAGE_TITLE_MAP: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/coach': 'AI Coach',
  '/jobs': 'Jobs',
  '/profile': 'Career Profile',
  '/cv-manager': 'CV Manager',
  '/projects': 'Project Library',
  '/search-settings': 'Search Settings',
  '/applications': 'Applications',
  '/skill-gaps': 'Skill Gaps',
  '/reports': 'Reports',
  '/privacy': 'Privacy & Data',
  '/settings': 'Settings',
  '/notifications': 'Notifications',
  '/manual-job': 'Add Job Manually',
}

export function Layout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { sidebarCollapsed, setPageTitle } = useUIStore()
  const onboardingChecked = useRef(false)

  // New-user gate: if the signed-in user's profile is blank (fresh account),
  // send them to onboarding so the AI has THEIR details to work with.
  // Existing accounts can restore their own workspace after signing in.
  useEffect(() => {
    if (onboardingChecked.current) return
    onboardingChecked.current = true
    getProfile()
      .then((p) => {
        if (p && !(p as { full_name?: string }).full_name && window.location.hash !== '#/onboarding') {
          navigate('/onboarding')
        }
      })
      .catch(() => {})
  }, [navigate])

  useEffect(() => {
    const title = PAGE_TITLE_MAP[location.pathname] ||
      (location.pathname.startsWith('/jobs/') ? 'Job Detail' : 'JobPilot AI')
    setPageTitle(title)
    document.title = `${title} — JobPilot AI`
  }, [location.pathname, setPageTitle])

  return (
    <div className="min-h-[100dvh] bg-bg-primary">
      <Sidebar />
      <Topbar />

      {/* Main content area */}
      <motion.main
        className="pt-topbar min-h-[100dvh] transition-all duration-300 lg:ml-sidebar"
        style={{
          marginLeft: sidebarCollapsed ? '72px' : undefined,
        }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{
              duration: 0.3,
              ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
            }}
            className="min-h-[calc(100dvh-64px)] flex flex-col"
          >
            <div className="app-page flex-1 p-4 lg:p-8">
              <div className="max-w-content mx-auto">
                <Outlet />
              </div>
            </div>
            <Footer />
          </motion.div>
        </AnimatePresence>
      </motion.main>
    </div>
  )
}
