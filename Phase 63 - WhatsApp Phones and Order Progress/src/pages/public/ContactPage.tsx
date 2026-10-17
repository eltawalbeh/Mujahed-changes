import { Link } from 'react-router-dom'
import PublicHeader from '@/components/public/PublicHeader'
import PublicFooter from '@/components/public/PublicFooter'
import { useSitePage } from '@/hooks/useSitePage'
import { normalizePhoneToE164, whatsAppDigits } from '@/lib/phone'

function contactLink(kind:'whatsapp'|'phone',value:unknown){
  if(typeof value!=='string'||!value.trim())return null
  const e164=normalizePhoneToE164(value)
  return e164?(kind==='whatsapp'?'https://wa.me/'+whatsAppDigits(value):'tel:'+e164):null
}

export default function ContactPage() {
  const content = useSitePage<any>('contact')
  const items = [
    { label: 'واتساب', value: content.whatsapp, href: contactLink('whatsapp', content.whatsapp) },
    { label: 'الهاتف', value: content.phone, href: contactLink('phone', content.phone) },
    { label: 'العنوان', value: content.address, href: null },
    { label: 'ساعات العمل', value: content.workingHours, href: null },
  ]
  const cardClass = 'block rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 text-right'

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <PublicHeader />
      <main className="mx-auto max-w-[1100px] px-4 py-14 md:px-16 md:py-20">
        <div className="max-w-2xl text-right">
          <p className="text-xs font-semibold text-[var(--color-accent)]">{content.eyebrow}</p>
          <h1 className="mt-3 text-4xl font-bold">{content.title}</h1>
          <p className="mt-4 text-sm leading-7 text-[var(--color-text-muted)]">{content.intro}</p>
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {items.map(({ label, value, href }) => {
            const inner = <><p className="text-xs text-[var(--color-text-muted)]">{label}</p><p className="mt-2 font-semibold">{value || 'سيتم التحديث قريباً'}</p></>
            return href ? (
              <a key={label} href={href} target={href.startsWith('https:') ? '_blank' : undefined} rel={href.startsWith('https:') ? 'noopener noreferrer' : undefined} aria-label={`${label}: ${value}`} className={`${cardClass} cursor-pointer transition-colors hover:border-[var(--color-accent)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]`}>
                {inner}
              </a>
            ) : (
              <article key={label} className={cardClass}>{inner}</article>
            )
          })}
        </div>
        <div className="mt-8 flex flex-wrap justify-end gap-3">
          <Link to="/products" className="rounded-xl bg-[var(--color-text)] px-6 py-3 text-sm font-semibold text-[var(--color-on-primary)]">ابدأ طلباً</Link>
          <Link to="/faq" className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-3 text-sm font-semibold">الأسئلة الشائعة</Link>
        </div>
      </main>
      <PublicFooter />
    </div>
  )
}
