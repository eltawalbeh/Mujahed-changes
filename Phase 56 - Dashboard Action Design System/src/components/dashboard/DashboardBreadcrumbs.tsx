import { Link } from 'react-router-dom'
import { CaretLeft } from '@phosphor-icons/react'

export type Crumb = {label:string; to?:string}
export default function DashboardBreadcrumbs({items}:{items:Crumb[]}) {
  return <nav dir="rtl" aria-label="مسار التنقل" className="flex min-h-11 flex-wrap items-center gap-x-2 gap-y-1 text-sm text-[#755747]">
    {items.map((item,i)=><span key={item.to||item.label+i} className="inline-flex items-center gap-2">
      {i>0?<CaretLeft aria-hidden="true" size={14} className="shrink-0 text-[#A58B78]"/>:null}
      {item.to?<Link to={item.to} className="rounded-md px-1 py-1 font-medium underline decoration-transparent underline-offset-4 transition-colors hover:bg-[#F4E7D9] hover:text-[#3E271D] hover:decoration-current focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-accent)]">{item.label}</Link>:
        <span aria-current="page" className="max-w-[26ch] truncate px-1 font-bold text-[var(--color-text)] sm:max-w-none">{item.label}</span>}
    </span>)}
  </nav>
}
