import { useCallback } from 'react'
import { useToastStore } from '@/store/toastStore'
import type { ToastOptions } from '@/store/toastStore'

export interface UseToastReturn {
  toasts: ToastOptions[]
  showToast: (options: Omit<ToastOptions, 'id' | 'timestamp'>) => string
  showSuccess: (title: string, message: string, suggestion?: string) => string
  showError: (
    title: string,
    message: string,
    suggestion?: string,
    action?: { label: string; onClick: () => void }
  ) => string
  showWarning: (title: string, message: string, suggestion?: string) => string
  showInfo: (title: string, message: string, suggestion?: string) => string
  showLoading: (title: string, message: string) => string
  hideToast: (id: string) => void
  clearAll: () => void
}

export function useToast(): UseToastReturn {
  const toasts = useToastStore((s) => s.toasts)
  const addToast = useToastStore((s) => s.addToast)
  const removeToast = useToastStore((s) => s.removeToast)
  const clearAll = useToastStore((s) => s.clearAll)

  const showToast = useCallback(
    (options: Omit<ToastOptions, 'id' | 'timestamp'>) => {
      return addToast(options)
    },
    [addToast]
  )

  const showSuccess = useCallback(
    (title: string, message: string, suggestion?: string) => {
      return addToast({ type: 'success', title, message, suggestion })
    },
    [addToast]
  )

  const showError = useCallback(
    (
      title: string,
      message: string,
      suggestion?: string,
      action?: { label: string; onClick: () => void }
    ) => {
      return addToast({
        type: 'error',
        title,
        message,
        suggestion,
        action,
      })
    },
    [addToast]
  )

  const showWarning = useCallback(
    (title: string, message: string, suggestion?: string) => {
      return addToast({ type: 'warning', title, message, suggestion })
    },
    [addToast]
  )

  const showInfo = useCallback(
    (title: string, message: string, suggestion?: string) => {
      return addToast({ type: 'info', title, message, suggestion })
    },
    [addToast]
  )

  const showLoading = useCallback(
    (title: string, message: string) => {
      return addToast({
        type: 'loading',
        title,
        message,
        persistent: true,
      })
    },
    [addToast]
  )

  const hideToast = useCallback(
    (id: string) => {
      removeToast(id)
    },
    [removeToast]
  )

  return {
    toasts,
    showToast,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showLoading,
    hideToast,
    clearAll,
  }
}

// Convenience export for direct access without hook
export { useToastStore }
