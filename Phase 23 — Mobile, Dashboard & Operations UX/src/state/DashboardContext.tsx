import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
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
  const [runtime, setRuntime] = useState<DashboardRuntime>({ mode: 'unauthorized' })
  const [loading, setLoading] = useState(true)

  const refreshRuntime = useCallback(async (options?: { silent?: boolean }) => {
    if (!options?.silent) setLoading(true)
    try {
      setRuntime(await getDashboardRuntime())
    } finally {
      if (!options?.silent) setLoading(false)
    }
  }, [])

  const logout = useCallback(async () => {
    await dashboardSignOut()
    setRuntime({ mode: 'unauthorized' })
  }, [])

  useEffect(() => {
    void refreshRuntime()
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') { setRuntime({ mode: 'unauthorized' }); return }
      if (event === 'SIGNED_IN' || event === 'USER_UPDATED') { void refreshRuntime() }
    })
    return () => data.subscription.unsubscribe()
  }, [refreshRuntime])

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
