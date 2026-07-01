import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { WifiOff, Wifi } from 'lucide-react'

export function NetworkStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [showOnlineBanner, setShowOnlineBanner] = useState(false)

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      setShowOnlineBanner(true)
      setTimeout(() => setShowOnlineBanner(false), 3000)
    }
    const handleOffline = () => {
      setIsOnline(false)
      setShowOnlineBanner(false)
    }
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  if (isOnline && !showOnlineBanner) return null

  if (isOnline && showOnlineBanner) {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="fixed top-0 left-0 right-0 z-sticky"
        >
          <div className="w-full bg-emerald-500/15 border-b border-emerald-500/20">
            <div className="max-w-content mx-auto px-4 sm:px-6 py-2 flex items-center justify-center gap-2">
              <Wifi className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-xs font-medium text-emerald-400">Back online</span>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    )
  }

  // Offline banner
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="fixed top-0 left-0 right-0 z-sticky"
      >
        <div
          className="w-full border-b border-amber-500/20"
          style={{ backgroundColor: 'rgba(251,191,36,0.12)' }}
        >
          <div className="max-w-content mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-center gap-2.5">
            <WifiOff className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span className="text-xs sm:text-sm text-[var(--text-primary)]">
              You are offline. Some features may not work until you reconnect.
            </span>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
