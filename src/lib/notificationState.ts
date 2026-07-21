const PREFIX = 'jobpilot-notification-state:'
const MAX_IDS = 500

export interface NotificationState {
  readIds: string[]
  dismissedIds: string[]
}

const emptyState = (): NotificationState => ({ readIds: [], dismissedIds: [] })

const storageKey = (userId?: string | null) => `${PREFIX}${userId || 'anonymous'}`

const safeIds = (value: unknown): string[] => {
  if (!Array.isArray(value)) return []
  return [...new Set(value.filter((id): id is string => typeof id === 'string' && id.length <= 160))].slice(-MAX_IDS)
}

export function loadNotificationState(userId?: string | null): NotificationState {
  try {
    const parsed = JSON.parse(localStorage.getItem(storageKey(userId)) || '{}') as Partial<NotificationState>
    return {
      readIds: safeIds(parsed.readIds),
      dismissedIds: safeIds(parsed.dismissedIds),
    }
  } catch {
    return emptyState()
  }
}

export function updateNotificationState(
  userId: string | null | undefined,
  update: (state: NotificationState) => NotificationState,
): NotificationState {
  const next = update(loadNotificationState(userId))
  const safe = {
    readIds: safeIds(next.readIds),
    dismissedIds: safeIds(next.dismissedIds),
  }
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(safe))
  } catch {
    // Device storage can be unavailable; the current screen still updates.
  }
  window.dispatchEvent(new CustomEvent('jobpilot-notifications-changed'))
  return safe
}

export function markNotificationsRead(userId: string | null | undefined, ids: string[]) {
  return updateNotificationState(userId, (state) => ({
    ...state,
    readIds: [...state.readIds, ...ids],
  }))
}

export function dismissNotifications(userId: string | null | undefined, ids: string[]) {
  return updateNotificationState(userId, (state) => ({
    readIds: [...state.readIds, ...ids],
    dismissedIds: [...state.dismissedIds, ...ids],
  }))
}
