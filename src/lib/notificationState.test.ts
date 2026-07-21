// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  dismissNotifications,
  loadNotificationState,
  markNotificationsRead,
} from './notificationState'

describe('notification state', () => {
  beforeEach(() => localStorage.clear())

  it('keeps read state scoped to the signed-in account', () => {
    markNotificationsRead('user-a', ['real-match-1'])

    expect(loadNotificationState('user-a').readIds).toEqual(['real-match-1'])
    expect(loadNotificationState('user-b').readIds).toEqual([])
  })

  it('persists dismissals as read and notifies the open app', () => {
    const listener = vi.fn()
    window.addEventListener('jobpilot-notifications-changed', listener)

    dismissNotifications('user-a', ['real-deadline-1'])

    expect(loadNotificationState('user-a')).toEqual({
      readIds: ['real-deadline-1'],
      dismissedIds: ['real-deadline-1'],
    })
    expect(listener).toHaveBeenCalledOnce()
    window.removeEventListener('jobpilot-notifications-changed', listener)
  })

  it('ignores corrupt device data safely', () => {
    localStorage.setItem('jobpilot-notification-state:user-a', '{bad-json')
    expect(loadNotificationState('user-a')).toEqual({ readIds: [], dismissedIds: [] })
  })
})
