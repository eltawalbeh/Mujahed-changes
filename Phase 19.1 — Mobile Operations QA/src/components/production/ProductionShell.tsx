import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import BrandLogo from '@/components/public/BrandLogo'
import { useProduction } from '@/state/ProductionContext'

const tabs = [
  ['/kitchen/queue', 'قيد الإنتاج'],
  ['/kitchen/ready', 'جاهز'],
  ['/kitchen/completed', 'مكتمل اليوم'],
] as const

export default function ProductionShell({ children }: { children: ReactNode }) {
  const { session, logout } = useProduction()
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-[var(--color-border)] bg-[var(--color-surface)]/95 backdrop-blur">
        <div className="mx-auto flex min-h-20 max-w-[1600px] items-center justify-between gap-4 px-4 md:px-8">
          <div className="flex items-center gap-4">
            <BrandLogo compact className="sm:hidden" />
            <BrandLogo className="hidden sm:inline-flex" />
            <span className="hidden rounded-full bg-[var(--color-bg)] px-3 py-1 text-xs font-semibold text-[var(--color-text-muted)] sm:inline">شاشة الإنتاج</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden text-[var(--color-text-muted)] md:inline">{session?.stationName}</span>
            <button type="button" onClick={() => void logout()} className="min-h-11 rounded-xl border border-[var(--color-border)] px-3 text-sm font-semibold outline-none transition-colors hover:bg-[var(--color-bg)] focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 sm:px-4">إنهاء الجلسة</button>
          </div>
        </div>
        <nav className="mx-auto flex max-w-[1600px] gap-2 overflow-x-auto px-4 pb-3 md:px-8" aria-label="التنقل في شاشة الإنتاج">
          {tabs.map(([to, label]) => <NavLink key={to} to={to} className={({ isActive }) => 'min-h-11 shrink-0 rounded-xl px-5 py-3 text-sm font-bold outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 ' + (isActive ? 'bg-[var(--color-text)] text-[var(--color-on-primary)]' : 'bg-[var(--color-bg)] text-[var(--color-text-muted)]')}>{label}</NavLink>)}
        </nav>
      </header>
      <main className="mx-auto max-w-[1600px] p-4 md:p-8">{children}</main>
    </div>
  )
}
