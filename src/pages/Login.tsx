import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  User,
  AlertCircle,
  Briefcase,
  Code,
  Search,
  FileText,
  Sparkles,
  X,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useAuthStore } from '@/store/authStore'
import { ErrorDisplay } from '@/components/ErrorDisplay'
import { isSupabaseConfigured } from '@/lib/supabase'

// ─── Particle Field Hero ─────────────────────

function ParticleField() {
  const canvasRef = useCallback((canvas: HTMLCanvasElement | null) => {
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationId: number
    let particles: Array<{
      x: number
      y: number
      vx: number
      vy: number
      radius: number
      color: string
    }> = []

    const resize = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio
      canvas.height = canvas.offsetHeight * window.devicePixelRatio
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio)
    }

    const initParticles = () => {
      const w = canvas.offsetWidth
      const h = canvas.offsetHeight
      const isMobile = w < 640
      const count = isMobile ? 50 : 120

      particles = []
      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * w,
          y: Math.random() * h,
          vx: (Math.random() - 0.5) * 0.4,
          vy: (Math.random() - 0.5) * 0.4,
          radius: Math.random() * 2 + 1,
          color: Math.random() > 0.5 ? 'rgba(99,102,241,0.6)' : 'rgba(34,211,238,0.5)',
        })
      }
    }

    const mouse = { x: -1000, y: -1000 }

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      mouse.x = e.clientX - rect.left
      mouse.y = e.clientY - rect.top
    }

    const handleMouseLeave = () => {
      mouse.x = -1000
      mouse.y = -1000
    }

    const draw = () => {
      const w = canvas.offsetWidth
      const h = canvas.offsetHeight
      ctx.clearRect(0, 0, w, h)

      // Update and draw particles
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i]

        // Mouse repulsion
        const dx = p.x - mouse.x
        const dy = p.y - mouse.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < 150) {
          const force = (150 - dist) / 150 * 0.3
          p.vx += (dx / dist) * force
          p.vy += (dy / dist) * force
        }

        p.x += p.vx
        p.y += p.vy

        // Dampen velocity
        p.vx *= 0.995
        p.vy *= 0.995

        // Bounce off edges
        if (p.x < 0 || p.x > w) p.vx *= -1
        if (p.y < 0 || p.y > h) p.vy *= -1
        p.x = Math.max(0, Math.min(w, p.x))
        p.y = Math.max(0, Math.min(h, p.y))

        // Draw particle
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
        ctx.fillStyle = p.color
        ctx.fill()

        // Draw connections (max 3 per particle)
        let connections = 0
        for (let j = i + 1; j < particles.length && connections < 3; j++) {
          const p2 = particles[j]
          const ddx = p.x - p2.x
          const ddy = p.y - p2.y
          const d = Math.sqrt(ddx * ddx + ddy * ddy)
          if (d < 120) {
            connections++
            ctx.beginPath()
            ctx.moveTo(p.x, p.y)
            ctx.lineTo(p2.x, p2.y)
            ctx.strokeStyle = `rgba(99,102,241,${0.08 * (1 - d / 120)})`
            ctx.lineWidth = 0.5
            ctx.stroke()
          }
        }
      }

      animationId = requestAnimationFrame(draw)
    }

    resize()
    initParticles()
    draw()

    canvas.addEventListener('mousemove', handleMouseMove)
    canvas.addEventListener('mouseleave', handleMouseLeave)
    window.addEventListener('resize', () => {
      resize()
      initParticles()
    })

    return () => {
      cancelAnimationFrame(animationId)
      canvas.removeEventListener('mousemove', handleMouseMove)
      canvas.removeEventListener('mouseleave', handleMouseLeave)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 1,
      }}
    />
  )
}

// ─── Feature Pills ───────────────────────────

const featurePills = [
  { label: 'AI Job Scoring', icon: Sparkles, color: 'bg-accent-indigo-muted text-accent-indigo' },
  { label: 'Tailored CVs', icon: FileText, color: 'bg-accent-violet-muted text-accent-violet' },
  { label: 'Auto Discovery', icon: Search, color: 'bg-accent-cyan-muted text-accent-cyan' },
  { label: 'Truth-First', icon: Code, color: 'bg-accent-emerald-muted text-accent-emerald' },
]

// ─── Floating Icons ──────────────────────────

const floatingIcons = [
  { Icon: Briefcase, x: '15%', y: '25%', delay: 0 },
  { Icon: Code, x: '80%', y: '20%', delay: 1 },
  { Icon: Search, x: '70%', y: '75%', delay: 2 },
  { Icon: FileText, x: '20%', y: '70%', delay: 1.5 },
]

// ─── Main Login Component ────────────────────

export default function Login() {
  const navigate = useNavigate()
  const { user, isAuthenticated } = useAuthStore()
  const { login, register, resetPassword, isLoading } = useAuth()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [showReset, setShowReset] = useState(false)

  // Login form state
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [showLoginPassword, setShowLoginPassword] = useState(false)
  const [loginErrors, setLoginErrors] = useState<Record<string, string>>({})

  // Register form state
  const [regName, setRegName] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [regConfirmPassword, setRegConfirmPassword] = useState('')
  const [showRegPassword, setShowRegPassword] = useState(false)
  const [regErrors, setRegErrors] = useState<Record<string, string>>({})

  // Shared state
  const [serverError, setServerError] = useState('')
  const [shakeForm, setShakeForm] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [resetSent, setResetSent] = useState(false)
  // Demo credentials belong only to the explicitly enabled local mock-auth
  // build. A real production login must look and behave like a clean product.
  const [showDemoHint, setShowDemoHint] = useState(!isSupabaseConfigured)

  // Redirect if authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      navigate('/dashboard')
    }
  }, [isAuthenticated, user, navigate])

  // Clear server error on mode change
  useEffect(() => {
    setServerError('')
    setLoginErrors({})
    setRegErrors({})
  }, [mode])

  const triggerShake = () => {
    setShakeForm(true)
    setTimeout(() => setShakeForm(false), 300)
  }

  const fillDemoCredentials = () => {
    setLoginEmail('demo@jobpilot.ai')
    setLoginPassword('Demo1234!')
    setLoginErrors({})
    setServerError('')
  }

  // Password strength
  const getPasswordStrength = (password: string) => {
    let score = 0
    if (password.length >= 8) score++
    if (/[A-Z]/.test(password)) score++
    if (/[0-9]/.test(password)) score++
    if (/[^A-Za-z0-9]/.test(password)) score++
    return score
  }

  const strengthLabels = ['Weak', 'Fair', 'Good', 'Strong']
  const strengthColors = ['bg-accent-rose', 'bg-accent-amber', 'bg-accent-indigo', 'bg-accent-emerald']

  // Login handler
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setServerError('')
    const errors: Record<string, string> = {}

    if (!loginEmail) errors.email = 'Email is required'
    else if (!/\S+@\S+\.\S+/.test(loginEmail)) errors.email = 'Invalid email format'
    if (!loginPassword) errors.password = 'Password is required'
    else if (loginPassword.length < 8) errors.password = 'Password must be at least 8 characters'

    if (Object.keys(errors).length > 0) {
      setLoginErrors(errors)
      triggerShake()
      return
    }

    setLoginErrors({})
    const result = await login(loginEmail, loginPassword)
    if (!result.success) {
      setServerError(result.error || 'Login failed')
      triggerShake()
    }
  }

  // Register handler
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setServerError('')
    const errors: Record<string, string> = {}

    if (!regName) errors.name = 'Full name is required'
    if (!regEmail) errors.email = 'Email is required'
    else if (!/\S+@\S+\.\S+/.test(regEmail)) errors.email = 'Invalid email format'
    if (!regPassword) errors.password = 'Password is required'
    else if (regPassword.length < 8) errors.password = 'Password must be at least 8 characters'
    if (regPassword !== regConfirmPassword) errors.confirmPassword = 'Passwords do not match'

    if (Object.keys(errors).length > 0) {
      setRegErrors(errors)
      triggerShake()
      return
    }

    setRegErrors({})
    const result = await register(regEmail, regPassword, regName)
    if (!result.success) {
      setServerError(result.error || 'Registration failed')
      triggerShake()
    }
  }

  // Reset password handler
  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!resetEmail || !/\S+@\S+\.\S+/.test(resetEmail)) return
    const result = await resetPassword(resetEmail)
    if (result.success) {
      setResetSent(true)
    } else {
      setServerError(result.error || 'Failed to send reset email')
    }
  }

  const easeOutExpo = [0.16, 1, 0.3, 1] as [number, number, number, number]

  return (
    <div className="min-h-[100dvh] flex flex-col lg:flex-row bg-bg-primary">
      {/* ─── Hero Section ─── */}
      <div className="relative hidden lg:flex lg:w-[60%] min-h-[100dvh] items-center justify-center overflow-hidden bg-gradient-to-br from-[#0B0F19] via-[#0f1530] to-[#0B0F19]">
        {/* Particle canvas */}
        <ParticleField />

        {/* Gradient mesh fallback overlay */}
        <div
          className="absolute inset-0 z-0"
          style={{
            background: `
              radial-gradient(ellipse at 30% 40%, rgba(99,102,241,0.12) 0%, transparent 50%),
              radial-gradient(ellipse at 70% 60%, rgba(34,211,238,0.08) 0%, transparent 50%)
            `,
          }}
        />

        {/* Floating icons */}
        {floatingIcons.map(({ Icon, x, y, delay }, i) => (
          <div
            key={i}
            className="absolute z-[2] animate-float"
            style={{
              left: x,
              top: y,
              animationDelay: `${delay}s`,
              opacity: 0.15,
            }}
          >
            <Icon size={28} className="text-accent-indigo" />
          </div>
        ))}

        {/* Content */}
        <div className="relative z-[3] max-w-lg px-10">
          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: easeOutExpo }}
            className="flex items-center gap-3 mb-8"
          >
            <img src="/logo-icon.svg" alt="" className="w-12 h-12" style={{ filter: 'brightness(2)' }} />
            <span className="font-heading text-[28px] font-bold text-white tracking-tight">
              JobPilot <span className="text-accent-indigo">AI</span>
            </span>
          </motion.div>

          {/* Tagline */}
          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: easeOutExpo, delay: 0.2 }}
            className="font-heading text-display-lg font-bold text-text-primary mb-2 leading-tight"
          >
            Your AI-Powered Job Search Co-Pilot
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: easeOutExpo, delay: 0.3 }}
            className="font-heading text-display-lg font-bold text-accent-cyan mb-6"
          >
            Find. Match. Apply Smarter.
          </motion.p>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: easeOutExpo, delay: 0.4 }}
            className="text-body-lg text-text-secondary max-w-md mb-8"
          >
            Automated job discovery, intelligent scoring, and honest CV tailoring — built for your real skills.
          </motion.p>

          {/* Feature Pills */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.6 }}
            className="flex flex-wrap gap-2"
          >
            {featurePills.map((pill, i) => (
              <motion.span
                key={pill.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: easeOutExpo, delay: 0.6 + i * 0.08 }}
                className={`inline-flex items-center gap-1.5 h-8 px-3.5 rounded-pill text-body-xs font-medium ${pill.color}`}
              >
                <pill.icon size={14} />
                {pill.label}
              </motion.span>
            ))}
          </motion.div>
        </div>
      </div>

      {/* ─── Auth Form Panel ─── */}
      <div className="flex-1 flex items-center justify-center bg-bg-secondary min-h-[100dvh] lg:min-h-0">
        <div className="w-full max-w-[420px] px-6 sm:px-8 py-8 lg:py-0">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
            <img src="/logo-icon.svg" alt="" className="w-9 h-9" style={{ filter: 'brightness(2)' }} />
            <span className="font-heading text-xl font-bold text-text-primary">
              JobPilot <span className="text-accent-indigo">AI</span>
            </span>
          </div>

          {/* Mobile tagline */}
          <p className="lg:hidden text-center text-sm text-text-secondary mb-6">
            Your AI-Powered Job Search Co-Pilot
          </p>

          {/* Server Error */}
          {serverError && (
            <ErrorDisplay
              error={serverError}
              variant="card"
              onDismiss={() => setServerError('')}
              className="mb-4"
            />
          )}

          {/* Mode Switcher */}
          <div className="relative flex mb-6 border-b border-border-subtle">
            <button
              onClick={() => { setMode('login'); setShowReset(false) }}
              className={`flex-1 pb-3 text-sm font-medium transition-colors relative ${
                mode === 'login' ? 'text-text-primary' : 'text-text-muted hover:text-text-secondary'
              }`}
            >
              Sign In
              {mode === 'login' && (
                <motion.div
                  layoutId="authTab"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent-indigo"
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}
            </button>
            <button
              onClick={() => { setMode('register'); setShowReset(false) }}
              className={`flex-1 pb-3 text-sm font-medium transition-colors relative ${
                mode === 'register' ? 'text-text-primary' : 'text-text-muted hover:text-text-secondary'
              }`}
            >
              Create Account
              {mode === 'register' && (
                <motion.div
                  layoutId="authTab"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent-indigo"
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}
            </button>
          </div>

          {/* Forms */}
          <AnimatePresence mode="wait">
            {/* ─── Login Form ─── */}
            {mode === 'login' && !showReset && (
              <motion.form
                key="login"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25, ease: easeOutExpo }}
                onSubmit={handleLogin}
                className={shakeForm ? 'animate-[shake_0.3s_ease-in-out]' : ''}
              >
                <div className="space-y-5">
                  {/* Demo Credentials Hint */}
                  {showDemoHint && (
                    <div className="p-3 rounded-lg bg-accent-indigo-muted border border-accent-indigo/20">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2">
                          <Sparkles className="w-4 h-4 text-accent-indigo mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-sm font-medium text-accent-indigo">Try the demo account</p>
                            <p className="text-xs text-text-secondary mt-0.5">
                              Email: <span className="font-mono text-text-primary">demo@jobpilot.ai</span>
                              {' · '}
                              Password: <span className="font-mono text-text-primary">Demo1234!</span>
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => setShowDemoHint(false)}
                          className="text-text-muted hover:text-text-primary transition-colors"
                          aria-label="Dismiss demo hint"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={fillDemoCredentials}
                        className="mt-2 text-xs font-medium text-accent-indigo hover:text-accent-indigo-hover transition-colors"
                      >
                        Fill demo credentials →
                      </button>
                    </div>
                  )}

                  {/* Email */}
                  <div>
                    <label htmlFor="login-email" className="block text-heading-sm text-text-secondary mb-1.5">
                      Email
                    </label>
                    <div className="relative">
                      <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
                      <input
                        id="login-email"
                        type="email"
                        value={loginEmail}
                        onChange={(e) => { setLoginEmail(e.target.value); setLoginErrors((p) => ({ ...p, email: '' })) }}
                        placeholder="you@example.com"
                        className={`w-full h-11 pl-10 pr-4 rounded-input bg-bg-tertiary border text-sm text-text-primary placeholder:text-text-muted transition-all focus:outline-none ${
                          loginErrors.email
                            ? 'border-accent-rose focus:ring-2 focus:ring-accent-rose-muted'
                            : 'border-border-default focus:border-accent-indigo focus:ring-2 focus:ring-[rgba(99,102,241,0.15)]'
                        }`}
                      />
                    </div>
                    {loginErrors.email && (
                      <p className="mt-1 text-xs text-accent-rose flex items-center gap-1">
                        <AlertCircle size={12} />
                        {loginErrors.email}
                      </p>
                    )}
                  </div>

                  {/* Password */}
                  <div>
                    <label htmlFor="login-password" className="block text-heading-sm text-text-secondary mb-1.5">
                      Password
                    </label>
                    <div className="relative">
                      <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
                      <input
                        id="login-password"
                        type={showLoginPassword ? 'text' : 'password'}
                        value={loginPassword}
                        onChange={(e) => { setLoginPassword(e.target.value); setLoginErrors((p) => ({ ...p, password: '' })) }}
                        placeholder="••••••••"
                        className={`w-full h-11 pl-10 pr-10 rounded-input bg-bg-tertiary border text-sm text-text-primary placeholder:text-text-muted transition-all focus:outline-none ${
                          loginErrors.password
                            ? 'border-accent-rose focus:ring-2 focus:ring-accent-rose-muted'
                            : 'border-border-default focus:border-accent-indigo focus:ring-2 focus:ring-[rgba(99,102,241,0.15)]'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowLoginPassword(!showLoginPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary transition-colors"
                        aria-label={showLoginPassword ? 'Hide password' : 'Show password'}
                      >
                        {showLoginPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    {loginErrors.password && (
                      <p className="mt-1 text-xs text-accent-rose flex items-center gap-1">
                        <AlertCircle size={12} />
                        {loginErrors.password}
                      </p>
                    )}
                  </div>

                  {/* Submit */}
                  <button
                    type="submit"
                    disabled={isLoading}
                    aria-busy={isLoading}
                    className="w-full h-12 rounded-button bg-accent-indigo text-white font-semibold text-base hover:bg-accent-indigo-hover hover:scale-[1.02] hover:shadow-[0_4px_12px_rgba(99,102,241,0.3)] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200"
                  >
                    {isLoading ? (
                      <span className="flex items-center justify-center gap-2" role="status" aria-live="polite">
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin-slow" />
                        Signing in...
                      </span>
                    ) : (
                      'Sign In'
                    )}
                  </button>

                  {/* Forgot password */}
                  <div className="text-center">
                    <button
                      type="button"
                      onClick={() => setShowReset(true)}
                      className="text-sm text-accent-indigo hover:text-accent-indigo-hover transition-colors"
                    >
                      Forgot password?
                    </button>
                  </div>

                  {/* Divider */}
                  <div className="relative flex items-center py-2">
                    <div className="flex-1 border-t border-border-subtle" />
                    <span className="px-3 text-xs text-text-muted">or</span>
                    <div className="flex-1 border-t border-border-subtle" />
                  </div>

                  {/* Switch to register */}
                  <p className="text-center text-sm text-text-secondary">
                    Don&apos;t have an account?{' '}
                    <button
                      type="button"
                      onClick={() => setMode('register')}
                      className="text-accent-indigo hover:text-accent-indigo-hover font-medium transition-colors"
                    >
                      Create one
                    </button>
                  </p>
                </div>
              </motion.form>
            )}

            {/* ─── Password Reset ─── */}
            {mode === 'login' && showReset && (
              <motion.div
                key="reset"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
              >
                {!resetSent ? (
                  <form onSubmit={handleReset} className="space-y-5">
                    <p className="text-sm text-text-secondary">
                      Enter your email and we&apos;ll send you a reset link.
                    </p>
                    <div>
                      <label htmlFor="reset-email" className="block text-heading-sm text-text-secondary mb-1.5">Email</label>
                      <input
                        id="reset-email"
                        type="email"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="w-full h-11 px-4 rounded-input bg-bg-tertiary border border-border-default text-sm text-text-primary placeholder:text-text-muted focus:border-accent-indigo focus:ring-2 focus:ring-[rgba(99,102,241,0.15)] focus:outline-none transition-all"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full h-11 rounded-button bg-accent-indigo text-white font-semibold text-sm hover:bg-accent-indigo-hover hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 transition-all"
                    >
                      {isLoading ? 'Sending...' : 'Send Reset Link'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowReset(false)}
                      className="w-full text-center text-sm text-text-muted hover:text-text-secondary transition-colors"
                    >
                      Back to login
                    </button>
                  </form>
                ) : (
                  <div className="text-center py-4">
                    <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-accent-emerald-muted flex items-center justify-center">
                      <Sparkles size={20} className="text-accent-emerald" />
                    </div>
                    <p className="text-text-primary font-medium mb-1">Check your email</p>
                    <p className="text-sm text-text-secondary mb-4">
                      We sent reset instructions to {resetEmail}
                    </p>
                    <button
                      type="button"
                      onClick={() => { setShowReset(false); setResetSent(false) }}
                      className="text-sm text-accent-indigo hover:text-accent-indigo-hover transition-colors"
                    >
                      Back to login
                    </button>
                  </div>
                )}
              </motion.div>
            )}

            {/* ─── Register Form ─── */}
            {mode === 'register' && (
              <motion.form
                key="register"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25, ease: easeOutExpo }}
                onSubmit={handleRegister}
                className={shakeForm ? 'animate-[shake_0.3s_ease-in-out]' : ''}
              >
                <div className="space-y-5">
                  {/* Full Name */}
                  <div>
                    <label htmlFor="reg-name" className="block text-heading-sm text-text-secondary mb-1.5">Full Name</label>
                    <div className="relative">
                      <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
                      <input
                        id="reg-name"
                        type="text"
                        value={regName}
                        onChange={(e) => { setRegName(e.target.value); setRegErrors((p) => ({ ...p, name: '' })) }}
                        placeholder="Your name"
                        className={`w-full h-11 pl-10 pr-4 rounded-input bg-bg-tertiary border text-sm text-text-primary placeholder:text-text-muted focus:outline-none transition-all ${
                          regErrors.name ? 'border-accent-rose' : 'border-border-default focus:border-accent-indigo focus:ring-2 focus:ring-[rgba(99,102,241,0.15)]'
                        }`}
                      />
                    </div>
                    {regErrors.name && (
                      <p className="mt-1 text-xs text-accent-rose flex items-center gap-1">
                        <AlertCircle size={12} /> {regErrors.name}
                      </p>
                    )}
                  </div>

                  {/* Email */}
                  <div>
                    <label htmlFor="reg-email" className="block text-heading-sm text-text-secondary mb-1.5">Email</label>
                    <div className="relative">
                      <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
                      <input
                        id="reg-email"
                        type="email"
                        value={regEmail}
                        onChange={(e) => { setRegEmail(e.target.value); setRegErrors((p) => ({ ...p, email: '' })) }}
                        placeholder="you@example.com"
                        className={`w-full h-11 pl-10 pr-4 rounded-input bg-bg-tertiary border text-sm text-text-primary placeholder:text-text-muted focus:outline-none transition-all ${
                          regErrors.email ? 'border-accent-rose' : 'border-border-default focus:border-accent-indigo focus:ring-2 focus:ring-[rgba(99,102,241,0.15)]'
                        }`}
                      />
                    </div>
                    {regErrors.email && (
                      <p className="mt-1 text-xs text-accent-rose flex items-center gap-1">
                        <AlertCircle size={12} /> {regErrors.email}
                      </p>
                    )}
                  </div>

                  {/* Password */}
                  <div>
                    <label htmlFor="reg-password" className="block text-heading-sm text-text-secondary mb-1.5">Password</label>
                    <div className="relative">
                      <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
                      <input
                        id="reg-password"
                        type={showRegPassword ? 'text' : 'password'}
                        value={regPassword}
                        onChange={(e) => { setRegPassword(e.target.value); setRegErrors((p) => ({ ...p, password: '' })) }}
                        placeholder="••••••••"
                        className={`w-full h-11 pl-10 pr-10 rounded-input bg-bg-tertiary border text-sm text-text-primary placeholder:text-text-muted focus:outline-none transition-all ${
                          regErrors.password ? 'border-accent-rose' : 'border-border-default focus:border-accent-indigo focus:ring-2 focus:ring-[rgba(99,102,241,0.15)]'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowRegPassword(!showRegPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary"
                        aria-label={showRegPassword ? 'Hide password' : 'Show password'}
                      >
                        {showRegPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    {regErrors.password && (
                      <p className="mt-1 text-xs text-accent-rose flex items-center gap-1">
                        <AlertCircle size={12} /> {regErrors.password}
                      </p>
                    )}

                    {/* Password Strength */}
                    {regPassword && (
                      <div className="mt-2">
                        <div className="flex gap-1 mb-1">
                          {[0, 1, 2, 3].map((i) => (
                            <div
                              key={i}
                              className={`flex-1 h-1 rounded-full transition-colors ${
                                i < getPasswordStrength(regPassword) ? strengthColors[getPasswordStrength(regPassword) - 1] : 'bg-bg-elevated'
                              }`}
                            />
                          ))}
                        </div>
                        <p className={`text-xs ${
                          getPasswordStrength(regPassword) <= 1 ? 'text-accent-rose' :
                          getPasswordStrength(regPassword) === 2 ? 'text-accent-amber' :
                          getPasswordStrength(regPassword) === 3 ? 'text-accent-indigo' : 'text-accent-emerald'
                        }`}>
                          {strengthLabels[getPasswordStrength(regPassword) - 1] || 'Weak'}
                        </p>
                      </div>
                    )}

                    {/* Requirements */}
                    <div className="mt-2 space-y-1">
                      {[
                        { label: '8+ characters', test: regPassword.length >= 8 },
                        { label: '1 uppercase letter', test: /[A-Z]/.test(regPassword) },
                        { label: '1 number', test: /[0-9]/.test(regPassword) },
                        { label: '1 special character', test: /[^A-Za-z0-9]/.test(regPassword) },
                      ].map((req) => (
                        <p key={req.label} className={`text-xs flex items-center gap-1 ${req.test ? 'text-accent-emerald' : 'text-text-muted'}`}>
                          <span className={`w-1 h-1 rounded-full ${req.test ? 'bg-accent-emerald' : 'bg-text-muted'}`} />
                          {req.label}
                        </p>
                      ))}
                    </div>
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label htmlFor="reg-confirm-password" className="block text-heading-sm text-text-secondary mb-1.5">Confirm Password</label>
                    <div className="relative">
                      <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
                      <input
                        id="reg-confirm-password"
                        type="password"
                        value={regConfirmPassword}
                        onChange={(e) => { setRegConfirmPassword(e.target.value); setRegErrors((p) => ({ ...p, confirmPassword: '' })) }}
                        placeholder="••••••••"
                        className={`w-full h-11 pl-10 pr-4 rounded-input bg-bg-tertiary border text-sm text-text-primary placeholder:text-text-muted focus:outline-none transition-all ${
                          regErrors.confirmPassword ? 'border-accent-rose' : 'border-border-default focus:border-accent-indigo focus:ring-2 focus:ring-[rgba(99,102,241,0.15)]'
                        }`}
                      />
                    </div>
                    {regErrors.confirmPassword && (
                      <p className="mt-1 text-xs text-accent-rose flex items-center gap-1">
                        <AlertCircle size={12} /> {regErrors.confirmPassword}
                      </p>
                    )}
                  </div>

                  {/* Submit */}
                  <button
                    type="submit"
                    disabled={isLoading}
                    aria-busy={isLoading}
                    className="w-full h-12 rounded-button bg-accent-indigo text-white font-semibold text-base hover:bg-accent-indigo-hover hover:scale-[1.02] hover:shadow-[0_4px_12px_rgba(99,102,241,0.3)] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  >
                    {isLoading ? (
                      <span className="flex items-center justify-center gap-2" role="status" aria-live="polite">
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin-slow" />
                        Creating account...
                      </span>
                    ) : (
                      'Create Account'
                    )}
                  </button>

                  {/* Terms */}
                  <p className="text-xs text-text-muted text-center">
                    By creating an account, you agree to our{' '}
                    <a
                      href="https://github.com/2118476/JobPilot#readme"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-accent-indigo hover:underline"
                    >
                      Terms of Service
                    </a>
                    {' '}and{' '}
                    <a
                      href="https://github.com/2118476/JobPilot#readme"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-accent-indigo hover:underline"
                    >
                      Privacy Policy
                    </a>.
                  </p>

                  {/* Switch to login */}
                  <p className="text-center text-sm text-text-secondary">
                    Already have an account?{' '}
                    <button
                      type="button"
                      onClick={() => setMode('login')}
                      className="text-accent-indigo hover:text-accent-indigo-hover font-medium transition-colors"
                    >
                      Sign in
                    </button>
                  </p>
                </div>
              </motion.form>
            )}
          </AnimatePresence>

          {/* Mobile Footer */}
          <div className="lg:hidden mt-10 text-center space-y-1">
            <p className="text-xs text-text-muted">&copy; 2025 JobPilot AI</p>
            <p className="text-xs text-text-muted">Private beta &middot; Built for Demo User</p>
          </div>
        </div>
      </div>

      {/* Shake animation keyframes */}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-8px); }
          50% { transform: translateX(8px); }
          75% { transform: translateX(-8px); }
        }
      `}</style>
    </div>
  )
}
