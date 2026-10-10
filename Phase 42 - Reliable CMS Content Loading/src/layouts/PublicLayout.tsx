import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { RequestDraftProvider } from '@/state/RequestDraftContext'
import { B2BRequestDraftProvider } from '@/state/B2BRequestDraftContext'
import RequestPanel from '@/components/request/RequestPanel'
import B2BRequestPanel from '@/components/b2b/B2BRequestPanel'
import Seo from '@/components/seo/Seo'
import { PublicPlatformGate } from '@/components/app/PlatformMaintenance'
import { hasSitePageContent, preloadSitePages } from '@/hooks/useSitePage'
import type { SitePageKey } from '@/content/defaultSiteContent'

function pageForPath(pathname: string): SitePageKey | null {
  if (pathname.startsWith('/business')) return 'business'
  if (pathname === '/about') return 'about'
  if (pathname === '/contact') return 'contact'
  if (pathname === '/faq') return 'faq'
  if (pathname === '/privacy') return 'privacy'
  if (pathname === '/terms') return 'terms'
  if (pathname === '/') return 'home'
  return null
}

function PublicContentLoading() {
  return <main className="grid min-h-screen place-items-center bg-[var(--color-bg)] p-5" dir="rtl" aria-live="polite"><div className="w-full max-w-sm animate-pulse rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-7"><div className="h-5 w-28 rounded bg-[var(--color-placeholder)]"/><div className="mt-7 h-10 w-4/5 rounded bg-[var(--color-placeholder)]"/><div className="mt-4 h-4 w-full rounded bg-[var(--color-placeholder)]"/><div className="mt-2 h-4 w-3/4 rounded bg-[var(--color-placeholder)]"/></div><span className="sr-only">يتم تحميل محتوى الموقع</span></main>
}

function PublicContentGate({ children }: { children: ReactNode }) {
  const location = useLocation()
  const pageKey = pageForPath(location.pathname)
  const keys = useMemo(() => (pageKey ? ['footer', pageKey] : ['footer']) as SitePageKey[], [pageKey])
  const contentKey = keys.join(':')
  const [ready, setReady] = useState(() => keys.every((key) => hasSitePageContent(key)))

  useEffect(() => {
    let active = true
    if (keys.every((key) => hasSitePageContent(key))) {
      setReady(true)
      return () => { active = false }
    }
    setReady(false)
    void preloadSitePages(keys).finally(() => { if (active) setReady(true) })
    return () => { active = false }
  }, [contentKey, keys])

  return ready ? <>{children}</> : <PublicContentLoading />
}

export default function PublicLayout() {
  const location = useLocation()
  const isB2B = location.pathname.startsWith('/business')

  if (isB2B) {
    return (
      <PublicPlatformGate><PublicContentGate><B2BRequestDraftProvider>
        <div dir="rtl" className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
          <Seo />
          <Outlet />
          <B2BRequestPanel />
        </div>
      </B2BRequestDraftProvider></PublicContentGate></PublicPlatformGate>
    )
  }

  return (
    <PublicPlatformGate><PublicContentGate><RequestDraftProvider>
      <div dir="rtl" className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
        <Seo />
        <Outlet />
        <RequestPanel />
      </div>
    </RequestDraftProvider></PublicContentGate></PublicPlatformGate>
  )
}
