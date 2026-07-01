import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface NotificationBadge {
  count: number
  hasUnread: boolean
}

interface UIState {
  // Sidebar
  sidebarCollapsed: boolean
  toggleSidebar: () => void
  setSidebarCollapsed: (collapsed: boolean) => void

  // Notifications
  notificationBadge: NotificationBadge
  setNotificationBadge: (badge: NotificationBadge) => void

  // Search command palette
  searchOpen: boolean
  setSearchOpen: (open: boolean) => void

  // Page title
  pageTitle: string
  setPageTitle: (title: string) => void

  // Toasts
  toasts: Toast[]
  addToast: (toast: Omit<Toast, 'id'>) => void
  removeToast: (id: string) => void

  // Mobile menu
  mobileMenuOpen: boolean
  setMobileMenuOpen: (open: boolean) => void
}

export interface Toast {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message?: string
  duration?: number
}

let toastIdCounter = 0

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      // Sidebar
      sidebarCollapsed: false,
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),

      // Notifications
      notificationBadge: { count: 3, hasUnread: true },
      setNotificationBadge: (badge) => set({ notificationBadge: badge }),

      // Search
      searchOpen: false,
      setSearchOpen: (open) => set({ searchOpen: open }),

      // Page title
      pageTitle: 'Dashboard',
      setPageTitle: (title) => set({ pageTitle: title }),

      // Toasts
      toasts: [],
      addToast: (toast) => {
        const id = `toast-${++toastIdCounter}`
        set((s) => ({
          toasts: [{ ...toast, id }, ...s.toasts].slice(0, 5),
        }))
        // Auto-dismiss
        const duration = toast.duration ?? 5000
        setTimeout(() => {
          get().removeToast(id)
        }, duration)
      },
      removeToast: (id) =>
        set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

      // Mobile menu
      mobileMenuOpen: false,
      setMobileMenuOpen: (open) => set({ mobileMenuOpen: open }),
    }),
    {
      name: 'jobpilot-ui',
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
      }),
    }
  )
)
