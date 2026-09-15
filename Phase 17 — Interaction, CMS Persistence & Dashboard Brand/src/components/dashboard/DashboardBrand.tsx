import { useEffect, useState } from 'react'
import { getDashboardBrandSettings } from '@/data/dashboard'
import { useDashboard } from '@/state/DashboardContext'
export default function DashboardBrand() { const { runtime } = useDashboard(); const [logoUrl, setLogoUrl] = useState<string | null>(null); useEffect(() => { void getDashboardBrandSettings(runtime).then(x => setLogoUrl(x.logoUrl)).catch(() => undefined) }, [runtime]); return logoUrl ? <img src={logoUrl} alt="شعار لوحة التحكم" className="size-10 rounded-[10px] object-cover" /> : <div className="grid size-10 place-items-center rounded-[10px] bg-[var(--color-text-muted)] font-bold text-[var(--color-on-primary)]">ش</div> }
