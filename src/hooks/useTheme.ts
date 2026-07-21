import { useCallback, useEffect } from 'react'
import { useThemeStore } from '@/store/themeStore'

export function useTheme() {
  const appearance = useThemeStore()
  const {
    theme,
    resolvedTheme,
    fontSize,
    compactMode,
    animations,
    scoreRingStyle,
    refreshResolvedTheme,
    setTheme,
  } = appearance

  useEffect(() => {
    const root = document.documentElement
    root.dataset.theme = resolvedTheme
    root.dataset.fontSize = fontSize
    root.dataset.compact = String(compactMode)
    root.dataset.animations = animations ? 'on' : 'off'
    root.dataset.scoreRing = scoreRingStyle
    root.style.colorScheme = resolvedTheme
    root.classList.toggle('dark', resolvedTheme === 'dark')
    root.classList.toggle('light', resolvedTheme === 'light')
  }, [animations, compactMode, fontSize, resolvedTheme, scoreRingStyle])

  useEffect(() => {
    if (theme !== 'system') return
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => refreshResolvedTheme()
    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [refreshResolvedTheme, theme])

  const toggleTheme = useCallback(() => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')
  }, [resolvedTheme, setTheme])

  return {
    ...appearance,
    toggleTheme,
    isDark: resolvedTheme === 'dark',
  }
}
