import { useState, useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard,
  Briefcase,
  ClipboardList,
  FileText,
  FolderOpen,
  Brain,
  TrendingUp,
  BarChart3,
  Search,
  Bell,
  Shield,
  Settings,
  Sparkles,
  BookOpen,
  HardHat,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Menu,
  X,
} from 'lucide-react'
import { useUIStore } from '@/store/uiStore'
import { useAuth } from '@/hooks/useAuth'
import { mockUserProfile } from '@/data/mockData'

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/coach', label: 'AI Coach', icon: Sparkles },
  { to: '/jobs', label: 'Jobs', icon: Briefcase },
  { to: '/applications', label: 'Applications', icon: ClipboardList },
  { to: '/cv-manager', label: 'CV Manager', icon: FileText },
  { to: '/projects', label: 'Project Library', icon: FolderOpen },
  { to: '/profile', label: 'Career Profile', icon: Brain },
  { to: '/construction', label: 'Site Operative CV', icon: HardHat },
  { to: '/itil', label: 'ITIL Learning', icon: BookOpen },
  { to: '/skill-gaps', label: 'Skill Gaps', icon: TrendingUp },
  { to: '/reports', label: 'Reports', icon: BarChart3 },
  { to: '/search-settings', label: 'Search Settings', icon: Search },
  { to: '/notifications', label: 'Notifications', icon: Bell },
  { to: '/privacy', label: 'Privacy & Data', icon: Shield },
  { to: '/settings', label: 'Settings', icon: Settings },
]

export function Sidebar() {
  const location = useLocation()
  const { sidebarCollapsed, toggleSidebar, mobileMenuOpen, setMobileMenuOpen } = useUIStore()
  const { logout } = useAuth()
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [location.pathname, setMobileMenuOpen])

  const handleLogout = async () => {
    await logout()
  }

  const sidebarWidth = sidebarCollapsed ? 'w-sidebar-collapsed' : 'w-sidebar'

  // Mobile sidebar overlay
  if (isMobile) {
    return (
      <>
        {/* Mobile hamburger button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="fixed top-4 left-4 z-[60] p-2 rounded-lg bg-bg-tertiary text-text-primary hover:bg-bg-elevated transition-colors"
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>

        <AnimatePresence>
          {mobileMenuOpen && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 bg-black/60 z-[55]"
                onClick={() => setMobileMenuOpen(false)}
              />
              {/* Mobile drawer */}
              <motion.aside
                initial={{ x: -256 }}
                animate={{ x: 0 }}
                exit={{ x: -256 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
                className="fixed left-0 top-0 bottom-0 w-sidebar bg-bg-secondary border-r border-border-subtle z-[56] flex flex-col"
              >
                <SidebarContent
                  sidebarCollapsed={false}
                  toggleSidebar={() => {}}
                  onLogout={handleLogout}
                  isMobile={true}
                />
              </motion.aside>
            </>
          )}
        </AnimatePresence>
      </>
    )
  }

  // Desktop sidebar
  return (
    <motion.aside
      className={`fixed left-0 top-0 bottom-0 ${sidebarWidth} bg-bg-secondary border-r border-border-subtle z-30 flex flex-col transition-all duration-300 ease-out`}
    >
      <SidebarContent
        sidebarCollapsed={sidebarCollapsed}
        toggleSidebar={toggleSidebar}
        onLogout={handleLogout}
        isMobile={false}
      />
    </motion.aside>
  )
}

// ─── Sidebar Content ─────────────────────────

interface SidebarContentProps {
  sidebarCollapsed: boolean
  toggleSidebar: () => void
  onLogout: () => void
  isMobile: boolean
}

function SidebarContent({ sidebarCollapsed, toggleSidebar, onLogout, isMobile }: SidebarContentProps) {
  return (
    <>
      {/* Logo Area */}
      <div className={`flex items-center gap-3 px-5 h-topbar border-b border-border-subtle ${sidebarCollapsed && !isMobile ? 'justify-center' : ''}`}>
        <img src="/logo-icon.svg" alt="JobPilot" className="w-8 h-8 text-accent-indigo" style={{ color: '#6366F1' }} />
        {(!sidebarCollapsed || isMobile) && (
          <span className="font-heading text-lg font-bold text-text-primary tracking-tight">
            JobPilot
          </span>
        )}
      </div>

      {/* Nav Items */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
        {navItems.map((item) => (
          <NavItem
            key={item.to}
            to={item.to}
            label={item.label}
            icon={item.icon}
            collapsed={sidebarCollapsed && !isMobile}
          />
        ))}
      </nav>

      {/* Bottom Section */}
      <div className="border-t border-border-subtle p-3 space-y-2">
        {/* User Mini-Card */}
        <div className={`flex items-center gap-3 rounded-card-sm p-2 ${sidebarCollapsed && !isMobile ? 'justify-center' : ''}`}>
          <img
            src={mockUserProfile.avatar_url || '/avatar-default.png'}
            alt={mockUserProfile.full_name}
            className="w-8 h-8 rounded-full object-cover flex-shrink-0 border border-border-default"
          />
          {(!sidebarCollapsed || isMobile) && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-text-primary truncate">
                {mockUserProfile.full_name}
              </p>
              <p className="text-xs text-text-muted truncate">
                {mockUserProfile.email}
              </p>
            </div>
          )}
        </div>

        {/* Collapse Toggle (desktop only) */}
        {!isMobile && (
          <button
            onClick={toggleSidebar}
            className={`flex items-center gap-2 w-full px-2 py-1.5 text-sm text-text-muted hover:text-text-primary hover:bg-bg-tertiary rounded-card-sm transition-colors ${sidebarCollapsed ? 'justify-center' : ''}`}
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            {(!sidebarCollapsed) && <span>Collapse</span>}
          </button>
        )}

        {/* Logout */}
        <button
          onClick={onLogout}
          className={`flex items-center gap-2 w-full px-2 py-1.5 text-sm text-accent-rose hover:bg-accent-rose-muted rounded-card-sm transition-colors ${sidebarCollapsed && !isMobile ? 'justify-center' : ''}`}
        >
          <LogOut size={16} />
          {(!sidebarCollapsed || isMobile) && <span>Logout</span>}
        </button>
      </div>
    </>
  )
}

// ─── Nav Item ────────────────────────────────

interface NavItemProps {
  to: string
  label: string
  icon: React.ComponentType<{ size?: number; className?: string }>
  collapsed: boolean
}

function NavItem({ to, label, icon: Icon, collapsed }: NavItemProps) {
  return (
    <NavLink
      to={to}
      end={to === '/dashboard'}
      className={({ isActive }) =>
        `flex items-center gap-3 h-[44px] px-3 rounded-xl transition-all duration-150 group relative ${
          isActive
            ? 'bg-accent-indigo-muted text-accent-indigo border-l-[3px] border-accent-indigo'
            : 'text-text-secondary hover:bg-bg-tertiary hover:text-text-primary border-l-[3px] border-transparent'
        } ${collapsed ? 'justify-center px-2' : ''}`
      }
    >
      <Icon size={20} className="flex-shrink-0" />
      {!collapsed && (
        <span className="text-sm font-medium truncate">{label}</span>
      )}
      {/* Tooltip for collapsed state */}
      {collapsed && (
        <div className="absolute left-full ml-2 px-3 py-1.5 bg-bg-elevated text-text-primary text-sm rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50 border border-border-subtle">
          {label}
          <div className="absolute left-0 top-1/2 -translate-x-1 -translate-y-1/2 w-2 h-2 bg-bg-elevated rotate-45 border-l border-b border-border-subtle" />
        </div>
      )}
    </NavLink>
  )
}
