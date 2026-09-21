import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useRef,
  type ReactNode,
} from 'react'
import { getDashboardRuntime, type DashboardRuntime } from '@/data/dashboard'
import { dashboardSignOut } from '@/data/auth'
import { supabase } from '@/lib/supabase'
import type { DashboardRole } from '@/types/dashboard'

type DashboardContextValue = {
  runtime: DashboardRuntime
  role: DashboardRole
  loading: boolean
  refreshRuntime: (options?: { silent?: boolean }) => Promise<void>
  logout: () => Promise<void>
}

const DashboardContext = createContext<DashboardContextValue | null>(null)

export function DashboardProvider({ children }: { children: ReactNode }) {
  const cachedRuntime = (() => {
    try {
      const raw = sessionStorage.getItem('chef-mujahed:dashboard-runtime')
      const value = raw ? JSON.parse(raw) as DashboardRuntime : null
      // A cached unauthorized state must never block a freshly-created auth session.
      return value?.mode === 'secure' ? value : null
    } catch {
      return null
    }
  })()
  const [runtime, setRuntime] = useState<DashboardRuntime>(cachedRuntime ?? { mode: 'unauthorized' })
  const [loading, setLoading] = useState(!cachedRuntime)
  const hydrated = useRef(Boolean(cachedRuntime))

  const refreshRuntime = useCallback(async (options?: { silent?: boolean }) => {
    if (!options?.silent) setLoading(true)
    try {
      const next = await getDashboardRuntime()
      setRuntime(next)
      try { sessionStorage.setItem('chef-mujahed:dashboard-runtime', JSON.stringify(next)) } catch { /* storage is optional */ }
    } finally {
      if (!options?.silent) setLoading(false)
    }
  }, [])

  const logout = useCallback(async () => {
    await dashboardSignOut()
    setRuntime({ mode: 'unauthorized' })
    try { sessionStorage.removeItem('chef-mujahed:dashboard-runtime') } catch { /* storage is optional */ }
  }, [])

  useEffect(() => {
    if (!hydrated.current) void refreshRuntime()
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') { setRuntime({ mode: 'unauthorized' }); try { sessionStorage.removeItem('chef-mujahed:dashboard-runtime') } catch {} ; return }
      if (event === 'SIGNED_IN' && runtime.mode === 'unauthorized') void refreshRuntime({ silent: true })
    })
    return () => data.subscription.unsubscribe()
  }, [refreshRuntime, runtime.mode])

  const role = runtime.role ?? 'SUPERVISOR'
  const value = useMemo(
    () => ({ runtime, role, loading, refreshRuntime, logout }),
    [runtime, role, loading, refreshRuntime, logout],
  )

  return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>
}

export function useDashboard() {
  const context = useContext(DashboardContext)
  if (!context) throw new Error('useDashboard must be used inside DashboardProvider')
  return context
}
