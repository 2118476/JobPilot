import { lazy, Suspense } from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { isSupabaseConfigured } from '@/lib/supabase'
import { useSessionBootstrap } from '@/hooks/useSessionBootstrap'
import { Layout } from '@/components/Layout'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { ToastContainer } from '@/components/ToastContainer'
import { NetworkStatus } from '@/components/NetworkStatus'

// Eagerly load Login (public route)
import Login from '@/pages/Login'

// Lazy load all authenticated pages for code splitting
const Dashboard = lazy(() => import('@/pages/Dashboard'))
const JobsList = lazy(() => import('@/pages/JobsList'))
const JobDetail = lazy(() => import('@/pages/JobDetail'))
const CareerProfile = lazy(() => import('@/pages/CareerProfile'))
const CVManager = lazy(() => import('@/pages/CVManager'))
const ProjectLibrary = lazy(() => import('@/pages/ProjectLibrary'))
const SearchSettings = lazy(() => import('@/pages/SearchSettings'))
const Applications = lazy(() => import('@/pages/Applications'))
const SkillGaps = lazy(() => import('@/pages/SkillGaps'))
const Reports = lazy(() => import('@/pages/Reports'))
const PrivacyData = lazy(() => import('@/pages/PrivacyData'))
const SettingsPage = lazy(() => import('@/pages/Settings'))
const Notifications = lazy(() => import('@/pages/Notifications'))
const ManualJob = lazy(() => import('@/pages/ManualJob'))
const Coach = lazy(() => import('@/pages/Coach'))
const ITILLearning = lazy(() => import('@/pages/ITILLearning'))
const ConstructionProfile = lazy(() => import('@/pages/ConstructionProfile'))
const Onboarding = lazy(() => import('@/pages/Onboarding'))

// Loading fallback
function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="w-8 h-8 border-2 border-accent-indigo/30 border-t-accent-indigo rounded-full animate-spin-slow" />
    </div>
  )
}

// Auth guard wrapper
function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthStore()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[100dvh] bg-bg-primary">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-accent-indigo/30 border-t-accent-indigo rounded-full animate-spin-slow" />
          <p className="text-sm text-text-muted">Loading...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}

// Production guard: a deployed build must use real Supabase auth. Mock
// (localStorage) auth is for local development only, unless a demo build
// explicitly sets VITE_ALLOW_MOCK_AUTH=true.
const mockAuthBlocked =
  import.meta.env.PROD && !isSupabaseConfigured && import.meta.env.VITE_ALLOW_MOCK_AUTH !== 'true'

function SetupRequired() {
  return (
    <div className="flex items-center justify-center min-h-[100dvh] bg-bg-primary p-6">
      <div className="max-w-lg w-full rounded-2xl border border-border-subtle bg-bg-secondary p-8 text-center">
        <h1 className="font-heading text-xl font-semibold text-text-primary mb-3">Setup required</h1>
        <p className="text-sm text-text-secondary leading-relaxed">
          This deployment is missing its authentication configuration. Set{' '}
          <code className="text-accent-indigo">VITE_SUPABASE_URL</code> and{' '}
          <code className="text-accent-indigo">VITE_SUPABASE_ANON_KEY</code> in your hosting
          environment and redeploy. See <span className="font-medium">DEPLOY.md</span> in the repository.
        </p>
        <p className="text-xs text-text-muted mt-4">
          (For a credential-less demo build only, set VITE_ALLOW_MOCK_AUTH=true explicitly.)
        </p>
      </div>
    </div>
  )
}

// ─── App ─────────────────────────────────────

export default function App() {
  useSessionBootstrap()
  if (mockAuthBlocked) return <SetupRequired />
  return (
    <ErrorBoundary>
      <HashRouter>
        <ToastContainer />
        <NetworkStatus />
        <Routes>
          {/* Public route */}
          <Route path="/" element={<Login />} />

          {/* Authenticated routes */}
          <Route
            element={
              <AuthGuard>
                <Layout />
              </AuthGuard>
            }
          >
            <Route
              path="/dashboard"
              element={
                <Suspense fallback={<PageLoader />}>
                  <Dashboard />
                </Suspense>
              }
            />
            <Route
              path="/jobs"
              element={
                <Suspense fallback={<PageLoader />}>
                  <JobsList />
                </Suspense>
              }
            />
            <Route
              path="/jobs/:id"
              element={
                <Suspense fallback={<PageLoader />}>
                  <JobDetail />
                </Suspense>
              }
            />
            <Route
              path="/profile"
              element={
                <Suspense fallback={<PageLoader />}>
                  <CareerProfile />
                </Suspense>
              }
            />
            <Route
              path="/cv-manager"
              element={
                <Suspense fallback={<PageLoader />}>
                  <CVManager />
                </Suspense>
              }
            />
            <Route
              path="/projects"
              element={
                <Suspense fallback={<PageLoader />}>
                  <ProjectLibrary />
                </Suspense>
              }
            />
            <Route
              path="/search-settings"
              element={
                <Suspense fallback={<PageLoader />}>
                  <SearchSettings />
                </Suspense>
              }
            />
            <Route
              path="/applications"
              element={
                <Suspense fallback={<PageLoader />}>
                  <Applications />
                </Suspense>
              }
            />
            <Route
              path="/skill-gaps"
              element={
                <Suspense fallback={<PageLoader />}>
                  <SkillGaps />
                </Suspense>
              }
            />
            <Route
              path="/reports"
              element={
                <Suspense fallback={<PageLoader />}>
                  <Reports />
                </Suspense>
              }
            />
            <Route
              path="/privacy"
              element={
                <Suspense fallback={<PageLoader />}>
                  <PrivacyData />
                </Suspense>
              }
            />
            <Route
              path="/settings"
              element={
                <Suspense fallback={<PageLoader />}>
                  <SettingsPage />
                </Suspense>
              }
            />
            <Route
              path="/notifications"
              element={
                <Suspense fallback={<PageLoader />}>
                  <Notifications />
                </Suspense>
              }
            />
            <Route
              path="/manual-job"
              element={
                <Suspense fallback={<PageLoader />}>
                  <ManualJob />
                </Suspense>
              }
            />
            <Route
              path="/coach"
              element={
                <Suspense fallback={<PageLoader />}>
                  <Coach />
                </Suspense>
              }
            />
            <Route
              path="/itil"
              element={
                <Suspense fallback={<PageLoader />}>
                  <ITILLearning />
                </Suspense>
              }
            />
            <Route
              path="/construction"
              element={
                <Suspense fallback={<PageLoader />}>
                  <ConstructionProfile />
                </Suspense>
              }
            />
            <Route
              path="/onboarding"
              element={
                <Suspense fallback={<PageLoader />}>
                  <Onboarding />
                </Suspense>
              }
            />
          </Route>

          {/* Catch all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
    </ErrorBoundary>
  )
}
