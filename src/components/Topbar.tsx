import { useState, useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  Plus,
  Bell,
  Command,
  User,
  Settings,
  LogOut,
} from 'lucide-react'
import { useUIStore } from '@/store/uiStore'
import { useAuth } from '@/hooks/useAuth'
import { useAuthStore } from '@/store/authStore'
import { TrackSwitcher } from '@/components/TrackSwitcher'
import { mockNotifications, mockUserProfile } from '@/data/mockData'

const pageTitleMap: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/coach': 'AI Coach',
  '/jobs': 'Jobs',
  '/profile': 'Career Profile',
  '/construction': 'Site Operative CV',
  '/itil': 'ITIL Learning',
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

export function Topbar() {
  const location = useLocation()
  const { notificationBadge, setSearchOpen } = useUIStore()
  const { logout } = useAuth()
  const authUser = useAuthStore((s) => s.user)
  const displayName = authUser?.user_metadata?.full_name || authUser?.email?.split('@')[0] || mockUserProfile.full_name
  const [userDropdownOpen, setUserDropdownOpen] = useState(false)
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false)
  const [searchFocused, setSearchFocused] = useState(false)
  const userDropdownRef = useRef<HTMLDivElement>(null)
  const notifDropdownRef = useRef<HTMLDivElement>(null)

  // Derive page title
  const pageTitle = pageTitleMap[location.pathname] ||
    (location.pathname.startsWith('/jobs/') ? 'Job Detail' : 'JobPilot AI')

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (userDropdownRef.current && !userDropdownRef.current.contains(e.target as Node)) {
        setUserDropdownOpen(false)
      }
      if (notifDropdownRef.current && !notifDropdownRef.current.contains(e.target as Node)) {
        setNotifDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Keyboard shortcut: Cmd+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen(true)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [setSearchOpen])

  const handleLogout = async () => {
    await logout()
  }

  const unreadNotifications = mockNotifications.filter((n) => !n.read).slice(0, 5)

  return (
    <header className="fixed top-0 right-0 left-0 lg:left-sidebar h-topbar bg-bg-primary/80 backdrop-blur-xl border-b border-border-subtle z-40 flex items-center justify-between px-4 lg:px-6 transition-all duration-300">
      {/* Left: Page Title */}
      <div className="flex items-center gap-4 ml-10 lg:ml-0">
        <h1 className="font-heading text-xl lg:text-[22px] font-semibold text-text-primary tracking-tight">
          {pageTitle}
        </h1>
      </div>

      {/* Center: Track Switcher + Search Bar */}
      <div className="hidden md:flex items-center justify-center flex-1 max-w-xl mx-4 gap-3">
        <TrackSwitcher />
        <button
          onClick={() => setSearchOpen(true)}
          className={`hidden lg:flex items-center gap-2 h-10 px-4 rounded-lg bg-bg-tertiary border border-border-default text-left transition-all duration-200 ${
            searchFocused ? 'border-accent-indigo w-[300px]' : 'w-[220px] hover:border-border-focus'
          }`}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
        >
          <Search size={16} className="text-text-muted flex-shrink-0" />
          <span className="text-sm text-text-muted flex-1">Search jobs, skills...</span>
          <kbd className="hidden lg:flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-bg-secondary border border-border-default text-xs text-text-muted font-mono">
            <Command size={10} />
            <span>K</span>
          </kbd>
        </button>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        {/* Track switcher (compact, mobile) */}
        <div className="md:hidden">
          <TrackSwitcher compact />
        </div>
        {/* Manual Job Button */}
        <a
          href="#/manual-job"
          className="hidden sm:flex items-center gap-2 h-9 px-3 rounded-lg text-sm text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-colors"
        >
          <Plus size={16} />
          <span className="hidden lg:inline">Add Job</span>
        </a>

        {/* Notification Bell */}
        <div className="relative" ref={notifDropdownRef}>
          <button
            onClick={() => setNotifDropdownOpen(!notifDropdownOpen)}
            className="relative flex items-center justify-center w-9 h-9 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-colors"
            aria-label="Notifications"
          >
            <Bell size={18} />
            {notificationBadge.hasUnread && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-accent-rose rounded-full animate-pulse-dot" />
            )}
            {notificationBadge.count > 1 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 flex items-center justify-center bg-accent-indigo text-white text-[11px] font-medium rounded-full">
                {notificationBadge.count}
              </span>
            )}
          </button>

          <AnimatePresence>
            {notifDropdownOpen && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.96 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-full mt-2 w-[360px] max-h-[480px] overflow-y-auto bg-bg-elevated border border-border-subtle rounded-card-lg shadow-xl z-50"
              >
                <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle">
                  <h3 className="font-heading text-sm font-semibold text-text-primary">Notifications</h3>
                  <a
                    href="#/notifications"
                    className="text-xs text-accent-indigo hover:text-accent-indigo-hover transition-colors"
                    onClick={() => setNotifDropdownOpen(false)}
                  >
                    View all
                  </a>
                </div>
                {unreadNotifications.length === 0 ? (
                  <div className="px-4 py-8 text-center">
                    <p className="text-sm text-text-muted">No new notifications</p>
                  </div>
                ) : (
                  <div className="py-1">
                    {unreadNotifications.map((notif) => (
                      <a
                        key={notif.id}
                        href={notif.action_url ? `#${notif.action_url}` : undefined}
                        className="flex items-start gap-3 px-4 py-3 hover:bg-bg-tertiary transition-colors"
                        onClick={() => setNotifDropdownOpen(false)}
                      >
                        <div className="w-2 h-2 mt-1.5 rounded-full bg-accent-indigo flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-text-primary truncate">{notif.title}</p>
                          <p className="text-xs text-text-secondary line-clamp-2">{notif.message}</p>
                        </div>
                      </a>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* User Avatar Dropdown */}
        <div className="relative" ref={userDropdownRef}>
          <button
            onClick={() => setUserDropdownOpen(!userDropdownOpen)}
            className="flex items-center justify-center w-9 h-9 rounded-full border-2 border-border-subtle bg-accent-indigo-muted hover:border-border-default transition-colors"
            aria-label="User menu"
            title={displayName}
          >
            <span className="text-xs font-bold text-accent-indigo">
              {displayName.split(/\s+/).map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()}
            </span>
          </button>

          <AnimatePresence>
            {userDropdownOpen && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.96 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-full mt-2 w-[200px] bg-bg-elevated border border-border-subtle rounded-card-lg shadow-xl z-50 py-1"
              >
                <a
                  href="#/profile"
                  className="flex items-center gap-3 px-3 py-2.5 text-sm text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-colors"
                  onClick={() => setUserDropdownOpen(false)}
                >
                  <User size={16} />
                  Career Profile
                </a>
                <a
                  href="#/settings"
                  className="flex items-center gap-3 px-3 py-2.5 text-sm text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-colors"
                  onClick={() => setUserDropdownOpen(false)}
                >
                  <Settings size={16} />
                  Settings
                </a>
                <div className="my-1 border-t border-border-subtle" />
                <button
                  onClick={() => {
                    setUserDropdownOpen(false)
                    handleLogout()
                  }}
                  className="flex items-center gap-3 px-3 py-2.5 text-sm text-accent-rose hover:bg-accent-rose-muted transition-colors w-full"
                >
                  <LogOut size={16} />
                  Logout
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  )
}
