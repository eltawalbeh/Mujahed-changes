import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import PublicHeader from '@/components/public/PublicHeader'
import PublicFooter from '@/components/public/PublicFooter'
import ProductGrid from '@/components/public/ProductGrid'
import HeroMediaStack from '@/components/public/HeroMediaStack'
import CatalogSkeleton from '@/components/public/CatalogSkeleton'
import StatePanel from '@/components/ui/StatePanel'
import AnimateIn from '@/components/ui/AnimateIn'
import { getPublicProducts } from '@/data/catalog'
import { useSitePage } from '@/hooks/useSitePage'
import type { Product } from '@/types/product'

export default function B2CHomePage() {
  const content = useSitePage<any>('home')
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [heroVideoFailed, setHeroVideoFailed] = useState(false)

  const load = useCallback(async () => {
    try { setLoading(true); setError(''); setProducts((await getPublicProducts()).slice(0, 4)) }
    catch { setError('تعذر تحميل مختارات القائمة حالياً.') }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { void load() }, [load])

  return (
    <div className="min-h-screen overflow-x-hidden bg-[var(--color-bg)]">
      <PublicHeader />
      <main>

        {/* ── Hero ───────────────────────────────────────────────────── */}
        {content.heroVideoUrl && !heroVideoFailed ? <section className="relative isolate min-h-[560px] overflow-hidden border-b border-[var(--color-border)] bg-[#26170f] text-white md:min-h-[530px]">
          <video className="absolute inset-0 -z-20 h-full w-full object-cover" src={content.heroVideoUrl} poster={content.heroPosterUrl || content.heroImageUrl || content.heroImages?.[0] || undefined} autoPlay muted loop playsInline preload="metadata" aria-hidden="true" onError={() => setHeroVideoFailed(true)} />
          <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(27,15,9,.08)_0%,rgba(27,15,9,.35)_36%,rgba(27,15,9,.86)_100%)]" />
          <div className="relative mx-auto flex min-h-[560px] max-w-[1440px] items-center px-5 py-16 md:min-h-[530px] md:px-16" dir="rtl">
            <div className="max-w-[650px] text-right">
              <p className="text-sm font-semibold text-[#f4c78b] anim-slide-right" style={{ animationDelay: '80ms' }}>{content.eyebrow}</p>
              <h1 className="mt-4 text-[38px] font-bold leading-[1.25] md:text-[46px] anim-slide-right" style={{ animationDelay: '170ms' }}>{content.title}</h1>
              <p className="mt-6 max-w-[600px] text-base leading-8 text-white/85 md:text-lg anim-slide-right" style={{ animationDelay: '260ms' }}>{content.description}</p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-start anim-slide-up" style={{ animationDelay: '360ms' }}>
                <Link to="/products" className="inline-flex h-12 items-center justify-center rounded-xl bg-white px-7 font-semibold !text-[#2E1E17] shadow-sm transition-colors hover:bg-[#F7F0E8]">{content.primaryCtaLabel}</Link>
                <Link to="/business" className="inline-flex h-12 items-center justify-center rounded-xl border border-white/50 bg-white/10 px-7 font-semibold !text-white backdrop-blur-sm transition-colors hover:bg-white/20">{content.secondaryCtaLabel}</Link>
              </div>
              <p className="mt-5 text-xs leading-6 text-white/70 anim-slide-up" style={{ animationDelay: '440ms' }}>تسجيل الطلب لا يعني تأكيده؛ تتم مراجعة التفاصيل والتواصل معك قبل بدء التجهيز.</p>
            </div>
          </div>
        </section> : <section className="relative overflow-hidden border-b border-[var(--color-border)] bg-[var(--color-surface)]">
          <div
            className="mx-auto grid min-h-[620px] max-w-[1440px] items-center gap-10 px-4 py-14 md:px-16 lg:grid-cols-[1fr_0.82fr] lg:py-20"
            dir="ltr"
          >
            {/* Media stack — slides in from left */}
            <div className="anim-slide-left" style={{ animationDelay: '60ms' }}>
              <HeroMediaStack
                images={
                  Array.isArray(content.heroImages) && content.heroImages.length
                    ? content.heroImages
                    : content.heroImageUrl
                      ? [content.heroImageUrl]
                      : []
                }
              />
            </div>

            {/* Text block — each line staggers from the right */}
            <div dir="rtl" className="mx-auto max-w-[680px] text-right lg:mx-0">
              <p
                className="text-sm font-semibold text-[var(--color-accent)] anim-slide-right"
                style={{ animationDelay: '80ms' }}
              >
                {content.eyebrow}
              </p>
              <h1
                className="mt-4 text-[38px] font-bold leading-[1.25] text-[var(--color-text)] md:text-[46px] anim-slide-right"
                style={{ animationDelay: '170ms' }}
              >
                {content.title}
              </h1>
              <p
                className="mt-6 max-w-[600px] text-base leading-8 text-[var(--color-text-muted)] md:text-lg anim-slide-right"
                style={{ animationDelay: '260ms' }}
              >
                {content.description}
              </p>
              <div
                className="mt-8 flex flex-col gap-3 sm:flex-row anim-slide-up"
                style={{ animationDelay: '360ms' }}
              >
                <Link
                  to="/products"
                  className="inline-flex h-12 items-center justify-center rounded-xl bg-[#2E1E17] px-7 font-semibold !text-white shadow-sm transition-colors hover:bg-[#4A3024]"
                >
                  {content.primaryCtaLabel}
                </Link>
                <Link
                  to="/business"
                  className="inline-flex h-12 items-center justify-center rounded-xl border border-[#2E1E17]/20 bg-white px-7 font-semibold !text-[#2E1E17] transition-colors hover:bg-[#F7F0E8]"
                >
                  {content.secondaryCtaLabel}
                </Link>
              </div>
              <p
                className="mt-5 text-xs leading-6 text-[var(--color-text-muted)] anim-slide-up"
                style={{ animationDelay: '440ms' }}
              >
                تسجيل الطلب لا يعني تأكيده؛ تتم مراجعة التفاصيل والتواصل معك قبل بدء التجهيز.
              </p>
            </div>
          </div>
        </section>}

        {/* ── Featured products ───────────────────────────────────────── */}
        <section className="mx-auto max-w-[1440px] px-4 py-14 md:px-16 md:py-20">
          <AnimateIn animation="slide-up" className="mb-8 flex items-end justify-between gap-4">
            <Link
              to="/products"
              className="text-sm font-semibold text-[var(--color-text-muted)] underline underline-offset-4"
            >
              عرض القائمة كاملة
            </Link>
            <div className="text-right">
              <p className="text-xs font-semibold text-[var(--color-accent)]">مختارات من قائمتنا</p>
              <h2 className="mt-2 text-2xl font-bold md:text-3xl">ابدأ من هنا</h2>
            </div>
          </AnimateIn>
          {loading ? (
            <CatalogSkeleton />
          ) : error ? (
            <StatePanel
              title="تعذر تحميل المختارات"
              description={error}
              actionLabel="إعادة المحاولة"
              onAction={() => void load()}
              tone="error"
            />
          ) : products.length ? (
            <ProductGrid products={products} />
          ) : (
            <StatePanel title="لا توجد منتجات منشورة حالياً" />
          )}
        </section>

        {/* ── Process steps ───────────────────────────────────────────── */}
        <section className="border-y border-[var(--color-border)] bg-[var(--color-surface)]">
          <div className="mx-auto max-w-[1440px] px-4 py-14 md:px-16 md:py-20">
            <AnimateIn animation="slide-up" className="mx-auto max-w-2xl text-center">
              <p className="text-xs font-semibold text-[var(--color-accent)]">{content.processEyebrow}</p>
              <h2 className="mt-2 text-2xl font-bold md:text-3xl">{content.processTitle}</h2>
            </AnimateIn>
            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {(content.steps ?? []).map((step: any, index: number) => (
                <AnimateIn key={index} animation="slide-up" delay={index * 110}>
                  <article className="h-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] p-6 text-right">
                    <span className="text-sm font-bold text-[var(--color-accent)]">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <h3 className="mt-5 text-lg font-bold">{step.title}</h3>
                    <p className="mt-3 text-sm leading-7 text-[var(--color-text-muted)]">{step.description}</p>
                  </article>
                </AnimateIn>
              ))}
            </div>
          </div>
        </section>

        {/* ── Promo cards ─────────────────────────────────────────────── */}
        <section className="mx-auto grid max-w-[1440px] gap-6 px-4 py-14 md:px-16 md:py-20 lg:grid-cols-2">
          <AnimateIn animation="slide-right">
            <article dir="rtl" className="relative min-h-[360px] overflow-hidden rounded-[28px] bg-[var(--color-text-muted)] p-7 text-right text-[var(--color-surface)] md:p-10">
              {content.businessImageUrl ? (
                <img src={content.businessImageUrl} alt="" className="absolute inset-0 h-full w-full object-cover opacity-35" />
              ) : null}
              <div className="relative z-10">
                <span className="text-xs font-semibold text-[var(--color-accent)]">{content.businessEyebrow}</span>
                <h2 className="mt-3 text-3xl font-bold">{content.businessTitle}</h2>
                <p className="mt-4 max-w-lg text-sm leading-7 opacity-90">{content.businessDescription}</p>
                <div dir="ltr" className="mt-7 flex justify-start">
                  <Link dir="rtl" to="/business" className="inline-flex rounded-xl bg-white px-5 py-3 text-sm font-bold text-[#2E1E17] shadow-sm transition-colors hover:bg-[#F7F0E8]">
                    الدخول إلى قسم الشركات
                  </Link>
                </div>
              </div>
            </article>
          </AnimateIn>

          <AnimateIn animation="slide-left" delay={110}>
            <article dir="rtl" className="relative min-h-[360px] overflow-hidden rounded-[28px] border border-[var(--color-border)] bg-[var(--color-surface)] p-7 text-right md:p-10">
              {content.aboutImageUrl ? (
                <img src={content.aboutImageUrl} alt="" className="absolute inset-0 h-full w-full object-cover opacity-20" />
              ) : null}
              <div className="relative z-10">
                <span className="text-xs font-semibold text-[var(--color-accent)]">{content.aboutEyebrow}</span>
                <h2 className="mt-3 text-3xl font-bold">{content.aboutTitle}</h2>
                <p className="mt-4 text-sm leading-7 text-[var(--color-text-muted)]">{content.aboutDescription}</p>
                <div dir="ltr" className="mt-7 flex justify-start">
                  <Link dir="rtl" to="/about" className="inline-flex text-sm font-bold text-[var(--color-text-muted)] underline underline-offset-4">
                    اعرف أكثر
                  </Link>
                </div>
              </div>
            </article>
          </AnimateIn>
        </section>

        {/* ── Contact CTA ─────────────────────────────────────────────── */}
        <section className="border-t border-[var(--color-border)] bg-[var(--color-surface)]">
          <AnimateIn animation="slide-up">
            <div dir="ltr" className="mx-auto flex max-w-[1440px] flex-col gap-6 px-4 py-12 md:flex-row md:items-center md:justify-between md:px-16">
              <Link
                dir="rtl"
                to="/contact"
                className="inline-flex h-11 items-center justify-center rounded-xl border border-[#2E1E17]/25 bg-white px-6 text-sm font-semibold !text-[#2E1E17] hover:bg-[#F7F0E8]"
              >
                تواصل معنا
              </Link>
              <div dir="rtl" className="text-right">
                <h2 className="text-2xl font-bold">{content.contactTitle}</h2>
                <p className="mt-2 text-sm text-[var(--color-text-muted)]">{content.contactDescription}</p>
              </div>
            </div>
          </AnimateIn>
        </section>

      </main>
      <PublicFooter />
    </div>
  )
}
