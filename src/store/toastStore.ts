import { create } from 'zustand'

export interface ToastOptions {
  id: string
  type: 'success' | 'error' | 'warning' | 'info' | 'loading'
  title: string
  message: string
  suggestion?: string
  action?: { label: string; onClick: () => void }
  duration?: number
  persistent?: boolean
  timestamp?: number
}

interface ToastState {
  toasts: ToastOptions[]
  addToast: (options: Omit<ToastOptions, 'id' | 'timestamp'>) => string
  removeToast: (id: string) => void
  clearAll: () => void
}

let toastIdCounter = 0

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],

  addToast: (options) => {
    const id = `toast-${++toastIdCounter}-${Date.now()}`
    const toast: ToastOptions = {
      ...options,
      id,
      timestamp: Date.now(),
      duration: options.duration ?? 5000,
      persistent: options.persistent ?? false,
    }

    set((state) => ({
      toasts: [toast, ...state.toasts].slice(0, 5),
    }))

    // Auto-dismiss if not persistent and not loading
    if (!toast.persistent && toast.type !== 'loading') {
      const duration = toast.duration ?? 5000
      setTimeout(() => {
        get().removeToast(id)
      }, duration)
    }

    return id
  },

  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }))
  },

  clearAll: () => {
    set({ toasts: [] })
  },
}))
