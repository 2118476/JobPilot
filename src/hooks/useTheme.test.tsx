// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, waitFor } from '@testing-library/react'
import { useTheme } from './useTheme'
import { useThemeStore } from '@/store/themeStore'

function ThemeHarness() {
  useTheme()
  return null
}

describe('appearance settings', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.className = ''
    vi.stubGlobal('matchMedia', vi.fn().mockImplementation(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })))
    useThemeStore.setState({
      theme: 'dark',
      resolvedTheme: 'dark',
      fontSize: 'default',
      compactMode: false,
      animations: true,
      scoreRingStyle: 'gradient',
    })
  })

  it('applies theme, density, motion and score presentation globally', async () => {
    render(<ThemeHarness />)
    act(() => {
      useThemeStore.getState().setTheme('light')
      useThemeStore.getState().setFontSize('large')
      useThemeStore.getState().setCompactMode(true)
      useThemeStore.getState().setAnimations(false)
      useThemeStore.getState().setScoreRingStyle('minimal')
    })

    await waitFor(() => expect(document.documentElement.dataset.theme).toBe('light'))
    expect(document.documentElement.dataset.fontSize).toBe('large')
    expect(document.documentElement.dataset.compact).toBe('true')
    expect(document.documentElement.dataset.animations).toBe('off')
    expect(document.documentElement.dataset.scoreRing).toBe('minimal')
    expect(document.documentElement.classList.contains('light')).toBe(true)
  })
})
