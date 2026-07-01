import { useCallback, useEffect } from 'react'
import { useThemeStore } from '@/store/themeStore'

export function useTheme() {
  const { theme, setTheme, resolvedTheme } = useThemeStore()

  // Apply theme to document
  useEffect(() => {
    const root = document.documentElement
    const resolved = resolvedTheme

    if (resolved === 'light') {
      root.setAttribute('data-theme', 'light')
      root.classList.remove('dark')
      root.classList.add('light')
    } else {
      root.setAttribute('data-theme', 'dark')
      root.classList.remove('light')
      root.classList.add('dark')
    }
  }, [resolvedTheme])

  // Listen for system preference changes
  useEffect(() => {
    if (theme !== 'system') return

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => {
      // Force re-render by calling setTheme with same value
      setTheme('system')
    }

    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [theme, setTheme])

  const toggleTheme = useCallback(() => {
    if (resolvedTheme === 'dark') {
      setTheme('light')
    } else {
      setTheme('dark')
    }
  }, [resolvedTheme, setTheme])

  return {
    theme,
    resolvedTheme,
    setTheme,
    toggleTheme,
    isDark: resolvedTheme === 'dark',
  }
}
