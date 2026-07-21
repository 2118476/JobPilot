import { useState, useMemo, useEffect } from 'react'
import { getStats, getJobs, getDocuments, getProfile } from '@/lib/api'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bell,
  Check,
  CheckCircle2,
  X,
  Award,
  Clock,
  AlertTriangle,
  Briefcase,
  FileText,
  Calendar,
  AlertCircle,
  Info,
  Zap,
  Trash2,
  BarChart3,
  Sparkles,
} from 'lucide-react'
import { formatDistanceToNow, isToday, isYesterday } from 'date-fns'
import { useUIStore } from '@/store/uiStore'
import { useAuthStore } from '@/store/authStore'
import {
  dismissNotifications,
  loadNotificationState,
  markNotificationsRead,
} from '@/lib/notificationState'

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

type NotificationType = 'strong_match' | 'closing_soon' | 'unapplied_match' | 'cv_ready' | 'cl_ready' | 'follow_up' | 'interview' | 'search_failed' | 'api_limit' | 'weekly_report' | 'profile_incomplete'

interface NotificationItem {
  id: string
  type: NotificationType
  title: string
  message: string
  read: boolean
  timestamp: string
  filterCategory: 'jobs' | 'applications' | 'system'
}

// ─────────────────────────────────────────────
// Animation config
// ─────────────────────────────────────────────

const easeOutExpo = [0.16, 1, 0.3, 1] as [number, number, number, number]

const staggerContainer = {
  animate: { transition: { staggerChildren: 0.03 } },
}

const staggerItem = {
  initial: { opacity: 0, y: 15 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.25, ease: easeOutExpo } },
  exit: { opacity: 0, x: -100, transition: { duration: 0.3, ease: easeOutExpo } },
}

// ─────────────────────────────────────────────
// Extended notification type config (10 types)
// ─────────────────────────────────────────────

const notificationConfig: Record<NotificationType, { icon: typeof Award; color: string; bgColor: string; label: string }> = {
  strong_match: { icon: Award, color: 'text-accent-emerald', bgColor: 'bg-accent-emerald-muted', label: 'Strong Match' },
  closing_soon: { icon: Clock, color: 'text-accent-amber', bgColor: 'bg-accent-amber-muted', label: 'Closing Soon' },
  unapplied_match: { icon: AlertTriangle, color: 'text-accent-orange', bgColor: 'bg-accent-orange-muted', label: 'Unapplied Match' },
  cv_ready: { icon: FileText, color: 'text-accent-indigo', bgColor: 'bg-accent-indigo-muted', label: 'CV Ready' },
  cl_ready: { icon: Sparkles, color: 'text-accent-violet', bgColor: 'bg-accent-violet-muted', label: 'Cover Letter Ready' },
  follow_up: { icon: Zap, color: 'text-accent-cyan', bgColor: 'bg-accent-cyan-muted', label: 'Follow-up Due' },
  interview: { icon: Calendar, color: 'text-accent-amber', bgColor: 'bg-accent-amber-muted', label: 'Interview' },
  search_failed: { icon: AlertCircle, color: 'text-accent-rose', bgColor: 'bg-accent-rose-muted', label: 'Search Failed' },
  api_limit: { icon: Info, color: 'text-accent-rose', bgColor: 'bg-accent-rose-muted', label: 'API Limit' },
  weekly_report: { icon: BarChart3, color: 'text-accent-emerald', bgColor: 'bg-accent-emerald-muted', label: 'Weekly Report' },
  profile_incomplete: { icon: Info, color: 'text-accent-indigo', bgColor: 'bg-accent-indigo-muted', label: 'Complete Profile' },
}

// ─────────────────────────────────────────────
// Account-scoped notification filters
// ─────────────────────────────────────────────

type FilterTab = 'all' | 'unread' | 'jobs' | 'applications' | 'system'

export default function Notifications() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const setNotificationBadge = useUIStore((state) => state.setNotificationBadge)
  const userId = useAuthStore((state) => state.user?.id)

  // Build notifications only from this account's live workspace.
  useEffect(() => {
    let alive = true
    ;(async () => {
      const [stats, jobs, docs, profile] = await Promise.all([getStats(), getJobs(), getDocuments(), getProfile()])
      if (!alive || (!stats && !jobs && !docs)) return
      let enabled = true
      let typeSettings: Record<string, boolean> = {}
      try {
        enabled = JSON.parse(localStorage.getItem('jobpilot-inapp-notifs') || 'true') !== false
        typeSettings = JSON.parse(localStorage.getItem('jobpilot-notification-types') || '{}')
      } catch {
        // Corrupt device preferences fall back to notifications enabled.
      }
      if (!enabled) {
        setNotifications([])
        return
      }
      const items: NotificationItem[] = []
      const nowIso = new Date().toISOString()

      if (profile && !(profile as { full_name?: string }).full_name) {
        items.push({
          id: 'real-profile', type: 'profile_incomplete', read: false, timestamp: nowIso,
          title: 'Finish setting up your profile',
          message: 'AI matching, CV generation and the coach all need your real details. Complete onboarding to unlock them.',
          filterCategory: 'system',
        })
      }

      for (const d of stats?.deadlines || []) {
        items.push({
          id: `real-deadline-${d.jobId}`, type: 'follow_up', read: false, timestamp: d.deadline,
          title: `${d.action}: ${d.title}`,
          message: `${d.company} — due ${new Date(d.deadline).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}.`,
          filterCategory: 'applications',
        })
      }

      const strong = (jobs || [])
        .filter((j) => (j.match_score || 0) >= 85 && ['new', 'saved'].includes(j.status))
        .slice(0, 6)
      for (const j of strong) {
        items.push({
          id: `real-match-${j.id}`, type: j.status === 'new' ? 'strong_match' : 'unapplied_match',
          read: false, timestamp: j.updated_at || nowIso,
          title: `${j.match_score}% match: ${j.title}`,
          message: `${j.company} — ${j.status === 'new' ? 'new strong match, worth a look.' : 'saved but not applied yet.'}`,
          filterCategory: 'jobs',
        })
      }

      for (const j of (jobs || []).filter((x) => x.status === 'interview').slice(0, 3)) {
        items.push({
          id: `real-interview-${j.id}`, type: 'interview', read: false, timestamp: j.updated_at || nowIso,
          title: `Interview stage: ${j.title}`,
          message: `${j.company} — prepare with the AI interview questions on the job page.`,
          filterCategory: 'applications',
        })
      }

      for (const d of (docs || []).slice(0, 5)) {
        items.push({
          id: `real-doc-${d.id}`, type: d.type === 'cover_letter' ? 'cl_ready' : 'cv_ready',
          read: false, timestamp: d.created_at,
          title: `${d.type === 'cover_letter' ? 'Cover letter' : 'CV'} ready: ${d.job_title || 'document'}`,
          message: d.company ? `Generated for ${d.company} — download it from the CV Manager.` : 'Available in the CV Manager.',
          filterCategory: 'applications',
        })
      }

      const persisted = loadNotificationState(userId)
      const readIds = new Set(persisted.readIds)
      const dismissedIds = new Set(persisted.dismissedIds)
      items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      setNotifications(items
        .filter((item) => typeSettings[item.type] !== false && !dismissedIds.has(item.id))
        .slice(0, 25)
        .map((item) => ({ ...item, read: readIds.has(item.id) })))
    })()
    return () => { alive = false }
  }, [userId])

  const [activeFilter, setActiveFilter] = useState<FilterTab>('all')
  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const unreadCount = notifications.filter((n) => !n.read).length

  useEffect(() => {
    setNotificationBadge({ count: unreadCount, hasUnread: unreadCount > 0 })
  }, [setNotificationBadge, unreadCount])

  const filteredNotifications = useMemo(() => {
    switch (activeFilter) {
      case 'unread':
        return notifications.filter((n) => !n.read)
      case 'jobs':
        return notifications.filter((n) => n.filterCategory === 'jobs')
      case 'applications':
        return notifications.filter((n) => n.filterCategory === 'applications')
      case 'system':
        return notifications.filter((n) => n.filterCategory === 'system')
      default:
        return notifications
    }
  }, [notifications, activeFilter])

  // Group by date
  const grouped = useMemo(() => {
    const groups: { label: string; items: NotificationItem[] }[] = []
    const today: NotificationItem[] = []
    const yesterday: NotificationItem[] = []
    const earlier: NotificationItem[] = []

    filteredNotifications.forEach((n) => {
      const d = new Date(n.timestamp)
      if (isToday(d)) today.push(n)
      else if (isYesterday(d)) yesterday.push(n)
      else earlier.push(n)
    })

    if (today.length) groups.push({ label: 'Today', items: today })
    if (yesterday.length) groups.push({ label: 'Yesterday', items: yesterday })
    if (earlier.length) groups.push({ label: 'Earlier', items: earlier })

    return groups
  }, [filteredNotifications])

  const markAllRead = () => {
    markNotificationsRead(userId, notifications.map((notification) => notification.id))
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }

  const markRead = (id: string) => {
    markNotificationsRead(userId, [id])
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
  }

  const dismissNotification = (id: string) => {
    dismissNotifications(userId, [id])
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const markSelectedRead = () => {
    markNotificationsRead(userId, [...selectedIds])
    setNotifications((prev) => prev.map((n) => (selectedIds.has(n.id) ? { ...n, read: true } : n)))
    setSelectedIds(new Set())
  }

  const deleteSelected = () => {
    dismissNotifications(userId, [...selectedIds])
    setNotifications((prev) => prev.filter((n) => !selectedIds.has(n.id)))
    setSelectedIds(new Set())
    setSelectMode(false)
  }

  const tabs: { key: FilterTab; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'unread', label: `Unread${unreadCount > 0 ? ` (${unreadCount})` : ''}` },
    { key: 'jobs', label: 'Jobs' },
    { key: 'applications', label: 'Applications' },
    { key: 'system', label: 'System' },
  ]

  return (
    <motion.div
      className="space-y-4 pb-8 max-w-4xl"
      variants={staggerContainer}
      initial="initial"
      animate="animate"
    >
      {/* ── Header ── */}
      <motion.div variants={staggerItem} className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-heading text-display-md font-semibold text-text-primary tracking-tight">
            Notifications
          </h1>
          {unreadCount > 0 && (
            <span className="inline-flex items-center gap-1.5 mt-1 px-2.5 py-0.5 rounded-full bg-accent-indigo-muted text-accent-indigo text-mono-sm font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-indigo animate-pulse-dot" />
              {unreadCount} unread
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="flex items-center gap-2 px-4 py-2 rounded-button text-body-sm text-text-secondary hover:text-text-primary hover:bg-bg-tertiary border border-border-subtle hover:border-border-default transition-all"
            >
              <CheckCircle2 size={14} />
              Mark All Read
            </button>
          )}
          <button
            onClick={() => {
              setSelectMode(!selectMode)
              setSelectedIds(new Set())
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-button text-body-sm transition-all ${
              selectMode
                ? 'bg-accent-indigo text-white'
                : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary border border-border-subtle hover:border-border-default'
            }`}
          >
            {selectMode ? 'Done' : 'Select'}
          </button>
        </div>
      </motion.div>

      {/* ── Filter Tabs ── */}
      <motion.div variants={staggerItem} className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveFilter(tab.key)}
            className={`px-4 py-2 rounded-pill text-body-sm font-medium transition-all ${
              activeFilter === tab.key
                ? 'bg-accent-indigo-muted text-accent-indigo'
                : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </motion.div>

      {/* ── Batch Selection Bar ── */}
      <AnimatePresence>
        {selectMode && selectedIds.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center justify-between p-3 rounded-card bg-bg-secondary border border-border-subtle"
          >
            <span className="text-body-sm text-text-secondary">
              <span className="font-medium text-text-primary">{selectedIds.size}</span> selected
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={markSelectedRead}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-button text-body-xs text-text-secondary hover:text-text-primary hover:bg-bg-tertiary border border-border-subtle transition-colors"
              >
                <Check size={12} />
                Mark Read
              </button>
              <button
                onClick={deleteSelected}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-button text-body-xs text-accent-rose hover:bg-accent-rose-muted border border-accent-rose/20 transition-colors"
              >
                <Trash2 size={12} />
                Delete
              </button>
              <button
                onClick={() => setSelectedIds(new Set())}
                className="px-3 py-1.5 rounded-button text-body-xs text-text-muted hover:text-text-primary transition-colors"
              >
                Clear
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Notification List ── */}
      <AnimatePresence mode="wait">
        {grouped.length > 0 ? (
          <motion.div
            key={activeFilter}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            {grouped.map((group) => (
              <div key={group.label}>
                {/* Date Group Header */}
                <div className="sticky top-topbar z-10 bg-bg-primary/95 backdrop-blur-sm py-2 px-1 mb-2">
                  <h3 className="font-heading text-heading-sm text-text-secondary">{group.label}</h3>
                </div>

                <motion.div
                  variants={staggerContainer}
                  initial="initial"
                  animate="animate"
                  className="space-y-1"
                >
                  {group.items.map((notification) => (
                    <NotificationRow
                      key={notification.id}
                      notification={notification}
                      selectMode={selectMode}
                      selected={selectedIds.has(notification.id)}
                      onToggleSelect={() => toggleSelect(notification.id)}
                      onMarkRead={() => markRead(notification.id)}
                      onDismiss={() => dismissNotification(notification.id)}
                    />
                  ))}
                </motion.div>
              </div>
            ))}

            {/* Caught up */}
            <motion.div variants={staggerItem} className="flex flex-col items-center py-8 text-center">
              <CheckCircle2 size={32} className="text-accent-emerald/40 mb-2" />
              <p className="text-body-sm text-text-muted">All caught up</p>
            </motion.div>
          </motion.div>
        ) : (
          <EmptyState filter={activeFilter} />
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ─────────────────────────────────────────────
// Notification Row Component
// ─────────────────────────────────────────────

function NotificationRow({
  notification,
  selectMode,
  selected,
  onToggleSelect,
  onMarkRead,
  onDismiss,
}: {
  notification: NotificationItem
  selectMode: boolean
  selected: boolean
  onToggleSelect: () => void
  onMarkRead: () => void
  onDismiss: () => void
}) {
  const config = notificationConfig[notification.type]
  const Icon = config.icon
  const timeAgo = formatDistanceToNow(new Date(notification.timestamp), { addSuffix: true })

  return (
    <motion.div
      layout
      variants={staggerItem}
      className={`group relative flex items-start gap-4 p-4 rounded-card border transition-all ${
        notification.read
          ? 'bg-transparent border-transparent hover:bg-bg-tertiary/50'
          : 'bg-bg-secondary border-l-[3px] border-l-accent-indigo hover:bg-bg-tertiary/50'
      }`}
      onClick={() => {
        if (selectMode) onToggleSelect()
        else if (!notification.read) onMarkRead()
      }}
    >
      {/* Checkbox in select mode */}
      <AnimatePresence>
        {selectMode && (
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0 }}
            className="flex-shrink-0 mt-1"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className={`w-[18px] h-[18px] rounded flex items-center justify-center border cursor-pointer transition-colors ${
                selected
                  ? 'bg-accent-indigo border-accent-indigo'
                  : 'border-border-default bg-bg-tertiary hover:border-border-focus'
              }`}
              onClick={onToggleSelect}
            >
              {selected && <Check size={12} className="text-white" />}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Icon Circle */}
      <div className={`flex-shrink-0 w-10 h-10 rounded-full ${config.bgColor} flex items-center justify-center`}>
        <Icon size={20} className={config.color} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h4 className={`text-body-md font-semibold leading-snug ${notification.read ? 'text-text-secondary' : 'text-text-primary'}`}>
              {notification.title}
            </h4>
            <p className={`text-body-sm mt-0.5 line-clamp-2 ${notification.read ? 'text-text-muted' : 'text-text-secondary'}`}>
              {notification.message}
            </p>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="text-body-xs text-text-muted">{timeAgo}</span>
              <span className="text-body-xs text-text-muted">&middot;</span>
              <span className={`text-body-xs ${config.color}`}>{config.label}</span>
            </div>
          </div>

          {/* Actions - visible on hover or always on mobile */}
          {!selectMode && (
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
              {!notification.read && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onMarkRead()
                  }}
                  className="p-1.5 rounded-lg hover:bg-bg-tertiary text-text-muted hover:text-text-primary transition-colors"
                  title="Mark as read"
                >
                  <Check size={14} />
                </button>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onDismiss()
                }}
                className="p-1.5 rounded-lg hover:bg-bg-tertiary text-text-muted hover:text-accent-rose transition-colors"
                title="Dismiss"
              >
                <X size={14} />
              </button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}

// ─────────────────────────────────────────────
// Empty State
// ─────────────────────────────────────────────

function EmptyState({ filter }: { filter: FilterTab }) {
  const configs: Record<FilterTab, { icon: typeof Bell; title: string; desc: string }> = {
    all: { icon: Bell, title: 'No notifications yet', desc: 'We will notify you when strong matches are found, deadlines approach, or searches complete.' },
    unread: { icon: CheckCircle2, title: 'All caught up!', desc: 'You have read all notifications.' },
    jobs: { icon: Briefcase, title: 'No job alerts', desc: 'No job-related notifications in this category.' },
    applications: { icon: ClipboardList, title: 'No application updates', desc: 'No application-related notifications yet.' },
    system: { icon: Info, title: 'No system alerts', desc: 'Everything is running smoothly.' },
  }

  const config = configs[filter]
  const Icon = config.icon

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center py-16 text-center"
    >
      <Icon size={64} className="text-text-muted/40 mb-4" />
      <h3 className="font-heading text-heading-md text-text-secondary">{config.title}</h3>
      <p className="text-body-md text-text-muted max-w-[360px] mt-2">{config.desc}</p>
    </motion.div>
  )
}

// Needed for the empty state
import { ClipboardList } from 'lucide-react'
