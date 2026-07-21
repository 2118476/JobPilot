import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Theme = 'dark' | 'light' | 'system'
export type FontSize = 'small' | 'default' | 'large'
export type ScoreRingStyle = 'gradient' | 'solid' | 'minimal'

interface AppearanceState {
  theme: Theme
  resolvedTheme: 'dark' | 'light'
  fontSize: FontSize
  compactMode: boolean
  animations: boolean
  scoreRingStyle: ScoreRingStyle
  setTheme: (theme: Theme) => void
  setFontSize: (fontSize: FontSize) => void
  setCompactMode: (compactMode: boolean) => void
  setAnimations: (animations: boolean) => void
  setScoreRingStyle: (scoreRingStyle: ScoreRingStyle) => void
  refreshResolvedTheme: () => void
}

const THEMES: Theme[] = ['dark', 'light', 'system']
const FONT_SIZES: FontSize[] = ['small', 'default', 'large']
const RING_STYLES: ScoreRingStyle[] = ['gradient', 'solid', 'minimal']

export function resolveTheme(theme: Theme): 'dark' | 'light' {
  if (theme === 'system') {
    return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light'
  }
  return theme
}

function parseStoredValue<T>(key: string, allowed?: readonly T[]): T | undefined {
  if (typeof window === 'undefined') return undefined
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return undefined
    const parsed = JSON.parse(raw) as unknown
    const value = (
      parsed && typeof parsed === 'object' && 'state' in parsed
        ? (parsed as { state?: Record<string, unknown> }).state?.theme
        : parsed
    ) as T
    return !allowed || allowed.includes(value) ? value : undefined
  } catch {
    return undefined
  }
}

function parseStoredBoolean(key: string, fallback: boolean): boolean {
  const value = parseStoredValue<unknown>(key)
  return typeof value === 'boolean' ? value : fallback
}

const legacyTheme = parseStoredValue<Theme>('jobpilot-theme', THEMES) ?? 'dark'
const legacyFontSize = parseStoredValue<FontSize>('jobpilot-font-size', FONT_SIZES) ?? 'default'
const legacyCompactMode = parseStoredBoolean('jobpilot-compact', false)
const legacyAnimations = parseStoredBoolean('jobpilot-animations', true)
const legacyScoreRing = parseStoredValue<ScoreRingStyle>('jobpilot-score-ring', RING_STYLES) ?? 'gradient'

export const useThemeStore = create<AppearanceState>()(
  persist(
    (set, get) => ({
      theme: legacyTheme,
      resolvedTheme: resolveTheme(legacyTheme),
      fontSize: legacyFontSize,
      compactMode: legacyCompactMode,
      animations: legacyAnimations,
      scoreRingStyle: legacyScoreRing,
      setTheme: (theme) => set({ theme, resolvedTheme: resolveTheme(theme) }),
      setFontSize: (fontSize) => set({ fontSize }),
      setCompactMode: (compactMode) => set({ compactMode }),
      setAnimations: (animations) => set({ animations }),
      setScoreRingStyle: (scoreRingStyle) => set({ scoreRingStyle }),
      refreshResolvedTheme: () => set({ resolvedTheme: resolveTheme(get().theme) }),
    }),
    {
      name: 'jobpilot-appearance',
      version: 1,
      partialize: ({ theme, fontSize, compactMode, animations, scoreRingStyle }) => ({
        theme,
        fontSize,
        compactMode,
        animations,
        scoreRingStyle,
      }),
      onRehydrateStorage: () => (state) => state?.refreshResolvedTheme(),
    },
  ),
)
