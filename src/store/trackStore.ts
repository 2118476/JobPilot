import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { getTracks, setActiveTrack as apiSetActiveTrack, type CareerTrack } from '@/lib/api'

// ─────────────────────────────────────────────────────────────
// trackStore — global active career track (Software Developer vs
// Site Operative). The active track drives job search and every AI
// feature on the backend, so this is the single client-side switch.
// ─────────────────────────────────────────────────────────────

const FALLBACK_TRACKS: CareerTrack[] = [
  { id: 'tech', label: 'Tech / Office', headline: 'Professional and office-based roles', icon: 'code' },
  { id: 'construction', label: 'Trades / Site', headline: 'Construction, trades and site-based roles', icon: 'hardhat' },
]

interface TrackState {
  activeTrack: string
  tracks: CareerTrack[]
  loading: boolean
  synced: boolean
  loadTracks: () => Promise<void>
  switchTrack: (track: string) => Promise<void>
}

export const useTrackStore = create<TrackState>()(
  persist(
    (set, get) => ({
      activeTrack: 'tech',
      tracks: FALLBACK_TRACKS,
      loading: false,
      synced: false,

      loadTracks: async () => {
        set({ loading: true })
        const res = await getTracks()
        if (res) {
          set({ activeTrack: res.active, tracks: res.tracks, loading: false, synced: true })
        } else {
          // Backend down — keep persisted/fallback values.
          set({ loading: false, tracks: get().tracks.length ? get().tracks : FALLBACK_TRACKS })
        }
      },

      switchTrack: async (track: string) => {
        const prev = get().activeTrack
        if (track === prev) return
        set({ activeTrack: track }) // optimistic
        const res = await apiSetActiveTrack(track)
        if (res) set({ activeTrack: res.active, tracks: res.tracks, synced: true })
        else set({ activeTrack: prev }) // revert on failure
      },
    }),
    {
      name: 'jobpilot-track',
      partialize: (s) => ({ activeTrack: s.activeTrack }),
    },
  ),
)
