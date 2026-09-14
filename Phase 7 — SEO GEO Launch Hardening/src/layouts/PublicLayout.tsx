import { Outlet, useLocation } from 'react-router-dom'
import { RequestDraftProvider } from '@/state/RequestDraftContext'
import { B2BRequestDraftProvider } from '@/state/B2BRequestDraftContext'
import RequestPanel from '@/components/request/RequestPanel'
import B2BRequestPanel from '@/components/b2b/B2BRequestPanel'
import Seo from '@/components/seo/Seo'

export default function PublicLayout() {
  const location = useLocation()
  const isB2B = location.pathname.startsWith('/business')

  if (isB2B) {
    return (
      <B2BRequestDraftProvider>
        <div dir="rtl" className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
          <Seo />
          <Outlet />
          <B2BRequestPanel />
        </div>
      </B2BRequestDraftProvider>
    )
  }

  return (
    <RequestDraftProvider>
      <div dir="rtl" className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
        <Seo />
        <Outlet />
        <RequestPanel />
      </div>
    </RequestDraftProvider>
  )
}
