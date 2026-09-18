import { Navigate, Route, Routes } from 'react-router-dom'
import { appRoutes } from './routes'
import PublicLayout from '@/layouts/PublicLayout'
import DashboardLayout from '@/layouts/DashboardLayout'
import ProductionLayout from '@/layouts/ProductionLayout'
import DashboardLoginPage from '@/pages/auth/DashboardLoginPage'
import ChangePasswordPage from '@/pages/auth/ChangePasswordPage'
import NotFoundPage from '@/pages/public/NotFoundPage'
import AppErrorBoundary from '@/components/app/AppErrorBoundary'

export default function App() {
  return (
    <AppErrorBoundary><Routes>
      <Route element={<PublicLayout />}>
        {appRoutes.public.map((route) => (
          <Route key={route.path} path={route.path} element={route.element} />
        ))}
      </Route>

      <Route path="/dashboard/login" element={<DashboardLoginPage />} />
      <Route path="/dashboard/change-password" element={<ChangePasswordPage />} />

      <Route path="/dashboard" element={<DashboardLayout />}>
        {appRoutes.dashboard.map((route) => (
          <Route key={route.path} path={route.path} element={route.element} />
        ))}
      </Route>

      <Route path="/kitchen" element={<ProductionLayout />}>
        {appRoutes.production.map((route) => (
          <Route key={route.path} path={route.path} element={route.element} />
        ))}
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes></AppErrorBoundary>
  )
}
