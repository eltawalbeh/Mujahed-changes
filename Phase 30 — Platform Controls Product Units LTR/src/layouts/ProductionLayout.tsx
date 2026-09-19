import { Outlet } from 'react-router-dom'
import { ProductionProvider } from '@/state/ProductionContext'
import { AppPlatformGate } from '@/components/app/PlatformMaintenance'

export default function ProductionLayout() {
  return (
    <AppPlatformGate><ProductionProvider>
      <div dir="rtl" className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
        <Outlet />
      </div>
    </ProductionProvider></AppPlatformGate>
  )
}
