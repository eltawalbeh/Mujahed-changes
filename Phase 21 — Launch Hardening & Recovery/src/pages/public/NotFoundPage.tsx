import { Link } from 'react-router-dom'
import PublicHeader from '@/components/public/PublicHeader'
import PublicFooter from '@/components/public/PublicFooter'

export default function NotFoundPage() {
  return <div className="flex min-h-screen flex-col bg-[var(--color-bg)]"><PublicHeader /><main className="grid flex-1 place-items-center px-4 py-16 text-center"><section className="max-w-md"><p className="text-sm font-bold text-[var(--color-accent)]">404</p><h1 className="mt-3 text-3xl font-bold">الصفحة غير موجودة</h1><p className="mt-3 leading-7 text-[var(--color-text-muted)]">قد يكون الرابط غير صحيح أو تم نقل الصفحة.</p><Link to="/" className="mt-6 inline-flex min-h-12 items-center rounded-xl bg-[var(--color-text)] px-5 text-sm font-semibold text-[var(--color-on-primary)]">العودة إلى الرئيسية</Link></section></main><PublicFooter /></div>
}
