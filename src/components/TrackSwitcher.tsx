import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { Code2, HardHat } from 'lucide-react'
import { useTrackStore } from '@/store/trackStore'

// ─────────────────────────────────────────────────────────────
// TrackSwitcher — segmented control to flip the active career track.
// Switching here re-points job search and every AI feature (CV/cover
// drafting, scoring, coach) at the chosen profile.
// ─────────────────────────────────────────────────────────────

const ICONS: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  code: Code2,
  hardhat: HardHat,
}

export function TrackSwitcher({ compact = false }: { compact?: boolean }) {
  const { activeTrack, tracks, loadTracks, switchTrack } = useTrackStore()

  useEffect(() => {
    loadTracks()
  }, [loadTracks])

  return (
    <div
      className="relative inline-flex items-center gap-0.5 p-1 rounded-xl bg-bg-tertiary border border-border-subtle"
      role="tablist"
      aria-label="Career track"
    >
      {tracks.map((t) => {
        const Icon = ICONS[t.icon] || Code2
        const active = activeTrack === t.id
        return (
          <button
            key={t.id}
            role="tab"
            aria-selected={active}
            onClick={() => switchTrack(t.id)}
            title={t.headline}
            className={`relative z-10 flex items-center gap-1.5 rounded-lg font-medium transition-colors ${
              compact ? 'px-2.5 py-1.5 text-xs' : 'px-3 py-1.5 text-sm'
            } ${active ? 'text-white' : 'text-text-muted hover:text-text-secondary'}`}
          >
            {active && (
              <motion.span
                layoutId="track-pill"
                className="absolute inset-0 rounded-lg bg-accent-indigo shadow-sm shadow-accent-indigo/30"
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              />
            )}
            <Icon size={compact ? 13 : 15} className="relative z-10 flex-shrink-0" />
            <span className="relative z-10 whitespace-nowrap">
              {compact ? (t.id === 'construction' ? 'Site' : 'Dev') : t.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}
