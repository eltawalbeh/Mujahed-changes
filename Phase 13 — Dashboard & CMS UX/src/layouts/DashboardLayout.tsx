import { Navigate, Outlet } from 'react-router-dom'
import { DashboardProvider, useDashboard } from '@/state/DashboardContext'
import { DashboardPreferencesProvider, useDashboardPreferences } from '@/state/DashboardPreferencesContext'
import { DashboardSidebar, DashboardTopbar } from '@/components/dashboard/DashboardChrome'
import { DashboardLoading } from '@/components/dashboard/DashboardStates'
function DashboardFrame(){const {runtime,loading}=useDashboard();const {locale}=useDashboardPreferences();if(loading)return <DashboardLoading/>;if(runtime.mode==='unauthorized')return <Navigate to="/dashboard/login" replace/>;if(runtime.mode==='secure'&&runtime.access?.mustChangePassword)return <Navigate to="/dashboard/change-password" replace/>;return <div dir={locale==='en'?'ltr':'rtl'} className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]"><DashboardSidebar/><div className="min-h-screen lg:mr-[260px]"><DashboardTopbar/><Outlet/></div></div>}
export default function DashboardLayout(){return <DashboardPreferencesProvider><DashboardProvider><DashboardFrame/></DashboardProvider></DashboardPreferencesProvider>}
