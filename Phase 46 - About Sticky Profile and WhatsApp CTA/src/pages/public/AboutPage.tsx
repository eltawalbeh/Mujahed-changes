import { useState, type ReactNode } from 'react'
import { FacebookLogo, InstagramLogo, SnapchatLogo, WhatsappLogo } from '@phosphor-icons/react'
import PublicHeader from '@/components/public/PublicHeader'
import PublicFooter from '@/components/public/PublicFooter'
import { useSitePage } from '@/hooks/useSitePage'

type AboutCard = { title?: string; body?: string }
type FeedItem = { imageUrl?: string; postUrl?: string; alt?: string }

function instagramEmbedUrl(url?: string) {
  if (!url) return null
  try {
    const match = new URL(url).pathname.match(/^\/(p|reel|tv)\/([^/?#]+)/)
    return match ? `https://www.instagram.com/${match[1]}/${match[2]}/embed/captioned/` : null
  } catch { return null }
}

function instagramMediaUrl(url?: string) {
  if (!url) return null
  try {
    const match = new URL(url).pathname.match(/^\/(p|reel|tv)\/([^/?#]+)/)
    return match ? `https://www.instagram.com/${match[1]}/${match[2]}/media/?size=l` : null
  } catch { return null }
}

function InstagramFeedCard({ item, index, profileUrl }: { item: FeedItem; index: number; profileUrl?: string }) {
  const [thumbnailUnavailable, setThumbnailUnavailable] = useState(false)
  const embedUrl = instagramEmbedUrl(item.postUrl)
  const thumbnailUrl = instagramMediaUrl(item.postUrl)
  const href = item.postUrl || item.imageUrl || profileUrl || '#'
  return <a href={href} target={href !== '#' ? '_blank' : undefined} rel="noreferrer" className="relative block w-[210px] shrink-0 snap-start overflow-hidden rounded-2xl bg-white shadow-sm sm:w-[245px]" aria-label={item.alt || 'فتح منشور إنستجرام'}>{thumbnailUrl && !thumbnailUnavailable ? <img src={thumbnailUrl} alt={item.alt || 'من يوميات مطبخ الشيف مجاهد'} onError={() => setThumbnailUnavailable(true)} className="aspect-[.78] w-full object-cover" /> : embedUrl ? <iframe src={embedUrl} title={item.alt || `منشور إنستجرام ${index + 1}`} loading="lazy" className="pointer-events-none aspect-[.78] w-full border-0" /> : <img src={item.imageUrl} alt={item.alt || 'من يوميات مطبخ الشيف مجاهد'} className="aspect-[.78] w-full object-cover" />}</a>
}

function SocialLink({ href, label, children }: { href?: string; label: string; children: ReactNode }) {
  if (!href) return <span className="grid size-10 place-items-center rounded-full border border-[var(--color-border)] text-[var(--color-text-muted)]" aria-label={label}>{children}</span>
  return <a href={href} target="_blank" rel="noreferrer" aria-label={label} className="grid size-10 place-items-center rounded-full border border-[var(--color-border)] transition hover:border-[var(--color-text)] hover:text-[var(--color-text)]">{children}</a>
}

export default function AboutPage() {
  const content = useSitePage<any>('about')
  const cards = (content.cards ?? []) as AboutCard[]
  const story = cards[0] ?? {}
  const philosophy = cards[1] ?? {}
  const craft = cards[2] ?? {}
  const legacyChefImage = Array.isArray(content.chefImages) ? content.chefImages.find(Boolean) : ''
  const chefImage = content.chefImageUrl || legacyChefImage
  const feed = (Array.isArray(content.instagramFeed) ? content.instagramFeed : []).filter((item: FeedItem) => item?.postUrl || item?.imageUrl) as FeedItem[]
  const heroImage = content.heroImageUrl || chefImage

  return <div className="min-h-screen bg-[var(--color-surface)] text-[var(--color-text)]" dir="rtl">
    <PublicHeader />
    <main>
      <section className="border-b border-[var(--color-border)] bg-white">
        <div className="mx-auto grid max-w-[1440px] items-center gap-10 px-5 py-12 md:px-16 md:py-20 lg:grid-cols-[minmax(0,1.05fr)_minmax(360px,.95fr)] lg:gap-20">
          <div className="order-2 text-right lg:order-1">
            <p className="text-sm font-semibold text-[var(--color-accent)]">{content.eyebrow}</p>
            <h1 className="mt-5 max-w-[650px] text-4xl font-bold leading-[1.18] tracking-[-.03em] md:text-5xl lg:text-[56px]">{content.title}</h1>
            <p className="mt-7 max-w-[625px] text-base leading-8 text-[var(--color-text-muted)] md:text-lg">{content.intro}</p>
          </div>
          <div className="order-1 overflow-hidden rounded-[28px] bg-[#3e271a] lg:order-2">
            {heroImage ? <img src={heroImage} alt="الشيف مجاهد" className="aspect-[1.2/1] h-full w-full object-cover" /> : <div className="aspect-[1.2/1] bg-[linear-gradient(135deg,#3a2418,#6e4b36)]" />}
          </div>
        </div>
      </section>

      <section className="border-b border-[var(--color-border)] bg-[var(--color-bg)] py-10 md:py-14" aria-label="من يوميات المطبخ">
        <div className="mx-auto max-w-[1440px] px-5 md:px-16">
          <div className="mb-5 flex items-end justify-between gap-4"><div className="text-right"><p className="text-sm font-semibold text-[var(--color-accent)]">من يوميات المطبخ</p><h2 className="mt-2 text-2xl font-bold">أحدث التفاصيل</h2></div>{content.instagramUrl ? <a href={content.instagramUrl} target="_blank" rel="noreferrer" className="text-sm font-semibold underline underline-offset-4">تابعنا على إنستجرام</a> : null}</div>
          {feed.length ? <div className="flex snap-x gap-4 overflow-x-auto pb-2 [scrollbar-width:thin]" dir="ltr">{feed.map((item, index) => <InstagramFeedCard key={`${item.postUrl}-${index}`} item={item} index={index} profileUrl={content.instagramUrl} />)}</div> : <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">{[0, 1, 2, 3, 4].map((item) => <div key={item} className="aspect-[.78] rounded-2xl bg-[linear-gradient(135deg,#eee5db,#d8c2af)]" />)}</div>}
        </div>
      </section>

      <section className="bg-[var(--color-bg)] py-12 md:py-20">
        <div className="mx-auto grid max-w-[1140px] items-start gap-8 px-5 md:px-16 lg:grid-cols-[355px_minmax(0,1fr)]" dir="ltr">
          <div className="lg:sticky lg:top-6 lg:self-start">
            <aside className="overflow-hidden rounded-[24px] bg-white text-center shadow-sm">
              <div className="h-[410px] bg-[var(--color-bg)] sm:h-[500px] lg:h-[560px]">
                {chefImage ? <img src={chefImage} alt="الشيف مجاهد" className="h-full w-full object-cover" /> : <div className="h-full w-full bg-[linear-gradient(145deg,#50382a,#ad8060)]" />}
              </div>
              <div className="px-6 py-7"><h2 className="text-2xl font-bold">{content.chefName || 'الشيف مجاهد'}</h2><div className="mt-5 flex justify-center gap-3"><SocialLink href={content.snapchatUrl} label="سناب شات"><SnapchatLogo size={20} /></SocialLink><SocialLink href={content.facebookUrl} label="فيسبوك"><FacebookLogo size={20} /></SocialLink><SocialLink href={content.instagramUrl} label="إنستجرام"><InstagramLogo size={20} /></SocialLink></div>{content.whatsappUrl ? <a href={content.whatsappUrl} target="_blank" rel="noreferrer" className="mt-6 flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 text-sm font-bold text-white shadow-sm transition hover:bg-[#1fae56]"><WhatsappLogo size={19} weight="fill" />تواصل عبر واتساب</a> : null}</div>
            </aside>
          </div>

          <div className="space-y-5 text-right" dir="rtl">
            {[story, philosophy, craft].filter((card) => card.title || card.body).map((card, index) => <article key={index} className="rounded-[22px] border border-[var(--color-border)] bg-white px-6 py-7 md:px-9 md:py-9"><h2 className="text-2xl font-bold md:text-3xl">{card.title}</h2><p className="mt-5 whitespace-pre-line text-[15px] leading-8 text-[var(--color-text-muted)] md:text-base">{card.body}</p></article>)}
          </div>
        </div>
      </section>
    </main>
    <PublicFooter />
  </div>
}
