import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import PublicHeader from '@/components/public/PublicHeader'
import PublicFooter from '@/components/public/PublicFooter'
import ProductGrid from '@/components/public/ProductGrid'
import HeroMediaStack from '@/components/public/HeroMediaStack'
import CatalogSkeleton from '@/components/public/CatalogSkeleton'
import StatePanel from '@/components/ui/StatePanel'
import { getPublicProducts } from '@/data/catalog'
import { useSitePage } from '@/hooks/useSitePage'
import type { Product } from '@/types/product'

export default function B2CHomePage() {
  const content = useSitePage<any>('home')
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    try { setLoading(true); setError(''); setProducts((await getPublicProducts()).slice(0, 4)) }
    catch { setError('تعذر تحميل مختارات القائمة حالياً.') }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { void load() }, [load])

  return <div className="min-h-screen overflow-x-hidden bg-[var(--color-bg)]"><PublicHeader /><main>
    <section className="relative overflow-hidden border-b border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="mx-auto grid min-h-[620px] max-w-[1440px] items-center gap-10 px-4 py-14 md:px-16 lg:grid-cols-[1fr_0.82fr] lg:py-20" dir="ltr">
        <HeroMediaStack images={Array.isArray(content.heroImages) && content.heroImages.length ? content.heroImages : content.heroImageUrl ? [content.heroImageUrl] : []} />
        <div dir="rtl" className="mx-auto max-w-[680px] text-right lg:mx-0"><p className="text-sm font-semibold text-[var(--color-accent)]">{content.eyebrow}</p><h1 className="mt-4 text-[42px] font-bold leading-[1.25] text-[var(--color-text)] md:text-[58px]">{content.title}</h1><p className="mt-6 max-w-[600px] text-base leading-8 text-[var(--color-text-muted)] md:text-lg">{content.description}</p><div className="mt-8 flex flex-col gap-3 sm:flex-row"><Link to="/products" className="inline-flex h-12 items-center justify-center rounded-xl bg-[#2E1E17] px-7 font-semibold !text-white shadow-sm transition-colors hover:bg-[#4A3024]">{content.primaryCtaLabel}</Link><Link to="/business" className="inline-flex h-12 items-center justify-center rounded-xl border border-[#2E1E17]/20 bg-white px-7 font-semibold !text-[#2E1E17] transition-colors hover:bg-[#F7F0E8]">{content.secondaryCtaLabel}</Link></div><p className="mt-5 text-xs leading-6 text-[var(--color-text-muted)]">تسجيل الطلب لا يعني تأكيده؛ تتم مراجعة التفاصيل والتواصل معك قبل بدء التجهيز.</p></div>
      </div>
    </section>

    <section className="mx-auto max-w-[1440px] px-4 py-14 md:px-16 md:py-20"><div className="mb-8 flex items-end justify-between gap-4"><Link to="/products" className="text-sm font-semibold text-[var(--color-text-muted)] underline underline-offset-4">عرض القائمة كاملة</Link><div className="text-right"><p className="text-xs font-semibold text-[var(--color-accent)]">مختارات من قائمتنا</p><h2 className="mt-2 text-2xl font-bold md:text-3xl">ابدأ من هنا</h2></div></div>{loading?<CatalogSkeleton/>:error?<StatePanel title="تعذر تحميل المختارات" description={error} actionLabel="إعادة المحاولة" onAction={()=>void load()} tone="error"/>:products.length?<ProductGrid products={products}/>:<StatePanel title="لا توجد منتجات منشورة حالياً"/>}</section>

    <section className="border-y border-[var(--color-border)] bg-[var(--color-surface)]"><div className="mx-auto max-w-[1440px] px-4 py-14 md:px-16 md:py-20"><div className="mx-auto max-w-2xl text-center"><p className="text-xs font-semibold text-[var(--color-accent)]">{content.processEyebrow}</p><h2 className="mt-2 text-2xl font-bold md:text-3xl">{content.processTitle}</h2></div><div className="mt-10 grid gap-4 md:grid-cols-3">{(content.steps??[]).map((step:any,index:number)=><article key={index} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] p-6 text-right"><span className="text-sm font-bold text-[var(--color-accent)]">{String(index+1).padStart(2,'0')}</span><h3 className="mt-5 text-lg font-bold">{step.title}</h3><p className="mt-3 text-sm leading-7 text-[var(--color-text-muted)]">{step.description}</p></article>)}</div></div></section>

    <section className="mx-auto grid max-w-[1440px] gap-6 px-4 py-14 md:px-16 md:py-20 lg:grid-cols-2"><article dir="rtl" className="relative min-h-[360px] overflow-hidden rounded-[28px] bg-[var(--color-text-muted)] p-7 text-right text-[var(--color-surface)] md:p-10">{content.businessImageUrl?<img src={content.businessImageUrl} alt="" className="absolute inset-0 h-full w-full object-cover opacity-35"/>:null}<div className="relative z-10"><span className="text-xs font-semibold text-[var(--color-accent)]">{content.businessEyebrow}</span><h2 className="mt-3 text-3xl font-bold">{content.businessTitle}</h2><p className="mt-4 max-w-lg text-sm leading-7 opacity-90">{content.businessDescription}</p><div dir="ltr" className="mt-7 flex justify-start"><Link dir="rtl" to="/business" className="inline-flex rounded-xl bg-white px-5 py-3 text-sm font-bold text-[#2E1E17] shadow-sm transition-colors hover:bg-[#F7F0E8]">الدخول إلى قسم الشركات</Link></div></div></article><article dir="rtl" className="relative min-h-[360px] overflow-hidden rounded-[28px] border border-[var(--color-border)] bg-[var(--color-surface)] p-7 text-right md:p-10">{content.aboutImageUrl?<img src={content.aboutImageUrl} alt="" className="absolute inset-0 h-full w-full object-cover opacity-20"/>:null}<div className="relative z-10"><span className="text-xs font-semibold text-[var(--color-accent)]">{content.aboutEyebrow}</span><h2 className="mt-3 text-3xl font-bold">{content.aboutTitle}</h2><p className="mt-4 text-sm leading-7 text-[var(--color-text-muted)]">{content.aboutDescription}</p><div dir="ltr" className="mt-7 flex justify-start"><Link dir="rtl" to="/about" className="inline-flex text-sm font-bold text-[var(--color-text-muted)] underline underline-offset-4">اعرف أكثر</Link></div></div></article></section>

    <section className="border-t border-[var(--color-border)] bg-[var(--color-surface)]"><div dir="ltr" className="mx-auto flex max-w-[1440px] flex-col gap-6 px-4 py-12 md:flex-row md:items-center md:justify-between md:px-16"><Link dir="rtl" to="/contact" className="inline-flex h-11 items-center justify-center rounded-xl border border-[#2E1E17]/25 bg-white px-6 text-sm font-semibold !text-[#2E1E17] hover:bg-[#F7F0E8]">تواصل معنا</Link><div dir="rtl" className="text-right"><h2 className="text-2xl font-bold">{content.contactTitle}</h2><p className="mt-2 text-sm text-[var(--color-text-muted)]">{content.contactDescription}</p></div></div></section>
  </main><PublicFooter/></div>
}
