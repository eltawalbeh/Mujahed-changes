import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import Button from '@/components/ui/Button'
import ImageUploadField from '@/components/dashboard/ImageUploadField'
import HeroImageSlotsField from '@/components/dashboard/HeroImageSlotsField'
import { DashboardError, DashboardLoading, DashboardRestricted } from '@/components/dashboard/DashboardStates'
import { getDashboardSitePage, updateDashboardSitePage } from '@/data/dashboard'
import { useDashboard } from '@/state/DashboardContext'
import { useDashboardPreferences } from '@/state/DashboardPreferencesContext'
import { dashboardText } from '@/lib/dashboardI18n'
import { canManageContent } from '@/lib/dashboardPermissions'
import type { SitePageKey } from '@/content/defaultSiteContent'

type CmsLocale = 'ar' | 'en'
type FieldKind = 'text' | 'textarea' | 'url' | 'image' | 'heroImages'
type Field = {
  key: string
  label: string
  kind?: FieldKind
  imageSize?: string
  imageHelp?: string
}
type Repeater = { key: string; label: string; itemFields: Field[]; addLabel: string }
type PageContentPair = { ar: Record<string, any>; en: Record<string, any> }

const pages: Array<{ key: SitePageKey; label: string; description: string }> = [
  { key: 'home', label: 'الصفحة الرئيسية', description: 'Hero، تجربة الطلب، الشركات، عن الشيف وCTA.' },
  { key: 'business', label: 'صفحة الشركات', description: 'محتوى B2B والتعريف بالرحلة والكتالوج.' },
  { key: 'about', label: 'من نحن', description: 'قصة الشيف، الفلسفة والحرفية.' },
  { key: 'contact', label: 'تواصل معنا', description: 'الهاتف، واتساب، العنوان وساعات العمل.' },
  { key: 'faq', label: 'الأسئلة الشائعة', description: 'الأسئلة والإجابات العامة.' },
  { key: 'footer', label: 'التذييل', description: 'وصف العلامة وحقوق النشر.' },
  { key: 'privacy', label: 'سياسة الخصوصية', description: 'النص القانوني المنشور.' },
  { key: 'terms', label: 'الشروط والأحكام', description: 'النص القانوني المنشور.' },
]

const contentCache = new Map<SitePageKey, PageContentPair>()
const DRAFT_PREFIX = 'chef-mujahed:cms-draft:'
function readDraft(page: SitePageKey): PageContentPair | null { try { const raw = window.sessionStorage.getItem(DRAFT_PREFIX + page); return raw ? JSON.parse(raw) : null } catch { return null } }
function writeDraft(page: SitePageKey, value: PageContentPair) { try { window.sessionStorage.setItem(DRAFT_PREFIX + page, JSON.stringify(value)) } catch {} }
function clearDraft(page: SitePageKey) { try { window.sessionStorage.removeItem(DRAFT_PREFIX + page) } catch {} }

const pageSchema: Record<SitePageKey, { fields: Field[]; repeaters?: Repeater[] }> = {
  home: {
    fields: [
      { key: 'eyebrow', label: 'النص فوق العنوان' },
      { key: 'title', label: 'عنوان الـ Hero', kind: 'textarea' },
      { key: 'description', label: 'وصف الـ Hero', kind: 'textarea' },
      { key: 'heroImages', label: 'صور الـ Hero المتحركة', kind: 'heroImages', imageSize: '1400 × 1200 px · 7:6', imageHelp: 'ارفع من صورة واحدة إلى ثلاث صور؛ الصور اختيارية بعد الصورة الأولى.' },
      { key: 'primaryCtaLabel', label: 'نص الزر الرئيسي' },
      { key: 'secondaryCtaLabel', label: 'نص زر الشركات' },
      { key: 'processEyebrow', label: 'عنوان صغير لقسم كيف يعمل الطلب' },
      { key: 'processTitle', label: 'عنوان كيف يعمل الطلب' },
      { key: 'businessEyebrow', label: 'عنوان صغير لقسم الشركات' },
      { key: 'businessTitle', label: 'عنوان قسم الشركات' },
      { key: 'businessDescription', label: 'وصف قسم الشركات', kind: 'textarea' },
      { key: 'businessImageUrl', label: 'صورة بطاقة الشركات', kind: 'image', imageSize: '1200 × 800 px · 3:2', imageHelp: 'يفضل صورة تمثل تجهيز الطلبات أو التغليف أو خدمة الشركات.' },
      { key: 'aboutEyebrow', label: 'عنوان صغير لقسم عن الشيف' },
      { key: 'aboutTitle', label: 'عنوان قسم عن الشيف' },
      { key: 'aboutDescription', label: 'وصف قسم عن الشيف', kind: 'textarea' },
      { key: 'aboutImageUrl', label: 'صورة بطاقة عن الشيف', kind: 'image', imageSize: '1200 × 800 px · 3:2', imageHelp: 'يفضل صورة حقيقية للشيف أو مساحة العمل، بإضاءة واضحة وقص مناسب.' },
      { key: 'contactTitle', label: 'عنوان CTA التواصل' },
      { key: 'contactDescription', label: 'وصف CTA التواصل', kind: 'textarea' },
    ],
    repeaters: [{
      key: 'steps', label: 'خطوات الطلب', addLabel: 'إضافة خطوة',
      itemFields: [{ key: 'title', label: 'العنوان' }, { key: 'description', label: 'الوصف', kind: 'textarea' }],
    }],
  },
  business: {
    fields: [
      { key: 'eyebrow', label: 'Badge' },
      { key: 'title', label: 'العنوان الرئيسي', kind: 'textarea' },
      { key: 'description', label: 'الوصف الرئيسي', kind: 'textarea' },
      { key: 'heroImageUrl', label: 'صورة Hero الشركات', kind: 'image', imageSize: '1400 × 1000 px · 7:5', imageHelp: 'صورة مناسبة لطلبات الشركات أو الكميات أو التغليف الاحترافي.' },
      { key: 'catalogEyebrow', label: 'عنوان صغير للكتالوج' },
      { key: 'catalogTitle', label: 'عنوان الكتالوج' },
      { key: 'catalogDescription', label: 'وصف الكتالوج', kind: 'textarea' },
      { key: 'confirmationTitle', label: 'عنوان تنبيه التأكيد' },
      { key: 'confirmationDescription', label: 'شرح تنبيه التأكيد', kind: 'textarea' },
    ],
    repeaters: [{
      key: 'steps', label: 'خطوات طلب الشركات', addLabel: 'إضافة خطوة',
      itemFields: [{ key: 'title', label: 'العنوان' }, { key: 'description', label: 'الوصف', kind: 'textarea' }],
    }],
  },
  about: {
    fields: [
      { key: 'eyebrow', label: 'النص فوق العنوان' },
      { key: 'title', label: 'العنوان الرئيسي', kind: 'textarea' },
      { key: 'intro', label: 'المقدمة', kind: 'textarea' },
      { key: 'heroImageUrl', label: 'صورة صفحة من نحن', kind: 'image', imageSize: '1200 × 900 px · 4:3', imageHelp: 'صورة حقيقية تعبّر عن الشيف أو الحرفية أو بيئة العمل.' },
    ],
    repeaters: [{
      key: 'cards', label: 'أقسام من نحن', addLabel: 'إضافة قسم',
      itemFields: [{ key: 'title', label: 'العنوان' }, { key: 'body', label: 'المحتوى', kind: 'textarea' }],
    }],
  },
  contact: {
    fields: [
      { key: 'eyebrow', label: 'النص فوق العنوان' },
      { key: 'title', label: 'العنوان' },
      { key: 'intro', label: 'المقدمة', kind: 'textarea' },
      { key: 'whatsapp', label: 'رقم واتساب' },
      { key: 'phone', label: 'الهاتف' },
      { key: 'address', label: 'العنوان', kind: 'textarea' },
      { key: 'workingHours', label: 'ساعات العمل', kind: 'textarea' },
    ],
  },
  faq: {
    fields: [
      { key: 'eyebrow', label: 'النص فوق العنوان' },
      { key: 'title', label: 'العنوان' },
      { key: 'intro', label: 'المقدمة', kind: 'textarea' },
    ],
    repeaters: [{
      key: 'items', label: 'الأسئلة والإجابات', addLabel: 'إضافة سؤال',
      itemFields: [{ key: 'question', label: 'السؤال' }, { key: 'answer', label: 'الإجابة', kind: 'textarea' }],
    }],
  },
  footer: {
    fields: [
      { key: 'logoUrl', label: 'لوجو الموقع', kind: 'image', imageSize: 'يفضل SVG أو PNG بخلفية شفافة', imageHelp: 'ارفع اللوجو الرسمي بخلفية شفافة. سيُستخدم تلقائياً في الـHeader والـFooter على الموبايل والديسكتوب.' },
      { key: 'description', label: 'وصف العلامة', kind: 'textarea' },
      { key: 'copyright', label: 'حقوق النشر' },
    ],
  },
  privacy: { fields: [{ key: 'title', label: 'العنوان' }, { key: 'body', label: 'النص القانوني', kind: 'textarea' }] },
  terms: { fields: [{ key: 'title', label: 'العنوان' }, { key: 'body', label: 'النص القانوني', kind: 'textarea' }] },
}

type Guidance = { help: string; placeholder?: string; maxLength?: number; recommended?: string; dir?: 'rtl' | 'ltr' }

function guidanceFor(field: Field, locale: CmsLocale): Guidance {
  const english = locale === 'en'
  const language = english ? 'بالإنجليزية' : 'بالعربية'
  const key = field.key.toLowerCase()

  if (field.kind === 'image') return { help: field.imageHelp ?? 'ارفع صورة واضحة ومضغوطة مناسبة لهذا الموضع.' }
  if (key === 'whatsapp') return {
    help: 'اكتب رقم واتساب بصيغة دولية ليكون صالحاً للرابط المباشر. مثال الأردن: +9627XXXXXXXX. بدون كلمات إضافية.',
    placeholder: '+9627XXXXXXXX', maxLength: 20, recommended: '10–16 رقم/رمز', dir: 'ltr',
  }
  if (key === 'phone') return {
    help: 'اكتب رقم الهاتف بصيغة دولية واضحة. مثال: +962 6 XXX XXXX. يمكن استخدام المسافات للقراءة.',
    placeholder: '+962 ...', maxLength: 24, recommended: '10–20 حرف', dir: 'ltr',
  }
  if (key === 'address') return {
    help: `اكتب العنوان ${language} كما تريد أن يظهر للعميل: المدينة/المنطقة ثم الشارع أو معلم واضح. لا تضع رابط خرائط هنا.`,
    placeholder: english ? 'City, area, street, landmark' : 'المدينة، المنطقة، الشارع، معلم واضح',
    maxLength: 180, recommended: '40–140 حرف',
  }
  if (key === 'workinghours') return {
    help: `اكتب الأيام والساعات ${language} بصيغة سهلة للمسح السريع. مثال: السبت–الخميس، 9:00 ص – 8:00 م. استخدم سطراً جديداً فقط عند وجود فترات مختلفة.`,
    placeholder: english ? 'Sat–Thu, 9:00 AM–8:00 PM' : 'السبت–الخميس، 9:00 ص – 8:00 م',
    maxLength: 160, recommended: '20–120 حرف',
  }
  if (key === 'copyright') return {
    help: `سطر واحد قصير ${language}. استخدم رمز © ثم السنة والاسم وعبارة الحقوق.`,
    placeholder: english ? '© 2026 Chef Mujahed. All rights reserved.' : '© ٢٠٢٦ الشيف مجاهد. جميع الحقوق محفوظة.',
    maxLength: 100, recommended: '25–80 حرف',
  }
  if (key === 'body') return {
    help: `استخدم فقط النص المعتمد ${language}. قسم المحتوى إلى فقرات قصيرة، واترك سطراً فارغاً بين الفقرات. لا تضف صياغة قانونية غير معتمدة.`,
    placeholder: english ? 'Paste the approved legal content here…' : 'الصق النص القانوني المعتمد هنا…',
    maxLength: 12000, recommended: 'حسب النص القانوني المعتمد',
  }
  if (key === 'question') return {
    help: `اكتب سؤالاً واحداً مباشراً ${language} كما قد يسأله العميل. تجنب جمع سؤالين في نفس السطر.`,
    placeholder: english ? 'How is my request confirmed?' : 'كيف يتم تأكيد طلبي؟',
    maxLength: 120, recommended: '20–90 حرف',
  }
  if (key === 'answer') return {
    help: `أجب ${language} بشكل مباشر ومختصر. ابدأ بالإجابة نفسها ثم أضف التفاصيل الضرورية فقط.`,
    placeholder: english ? 'Write a clear, direct answer…' : 'اكتب إجابة واضحة ومباشرة…',
    maxLength: 600, recommended: '60–350 حرف',
  }
  if (key.includes('ctalabel')) return {
    help: `نص زر قصير وواضح ${language} يبدأ بفعل قدر الإمكان. لا تستخدم جملة كاملة أو علامة نقطة.`,
    placeholder: english ? 'Explore our menu' : 'استكشف قائمتنا',
    maxLength: 36, recommended: '8–28 حرف',
  }
  if (key.includes('eyebrow') || key === 'badge') return {
    help: `عبارة قصيرة جداً ${language} تعطي سياقاً للقسم قبل العنوان الرئيسي.`,
    placeholder: english ? 'For business' : 'للشركات',
    maxLength: 48, recommended: '8–35 حرف',
  }
  if (key === 'title' || key.endsWith('title')) return {
    help: `عنوان واضح ${language}. ضع الفكرة الأهم أولاً وتجنب الحشو. يفضل ألا يتجاوز سطرين على الموبايل.`,
    placeholder: english ? 'Write a clear section title…' : 'اكتب عنواناً واضحاً للقسم…',
    maxLength: 110, recommended: '25–80 حرف',
  }
  if (key === 'description' || key.endsWith('description') || key === 'intro') return {
    help: `اكتب ${language} فقرة قصيرة تشرح الفكرة بدون تكرار العنوان. جملتان كحد عملي في أغلب الأقسام.`,
    placeholder: english ? 'Explain the section in one or two short sentences…' : 'اشرح الفكرة بجملة أو جملتين قصيرتين…',
    maxLength: 320, recommended: '70–220 حرف',
  }

  return {
    help: `اكتب القيمة ${language} كما تريد أن تظهر للعميل. استخدم صياغة مختصرة وواضحة بدون تنسيق زائد.`,
    maxLength: 180, recommended: '10–120 حرف',
  }
}

export default function ContentManagementPage() {
  const { runtime, role } = useDashboard()
  const [searchParams, setSearchParams] = useSearchParams()
  const selected = (searchParams.get('page') as SitePageKey) || 'home'
  const { locale } = useDashboardPreferences()
  const [contentPair, setContentPair] = useState<PageContentPair | null>(() => contentCache.get(selected) ?? readDraft(selected) ?? null)
  const [error, setError] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const canEdit = runtime.mode === 'preview' || canManageContent(role)

  const load = useCallback(async (force = false) => {
    try {
      if (!force) { const cached = contentCache.get(selected) ?? readDraft(selected); if (cached) { contentCache.set(selected, cached); setContentPair(cached); return } }
      setError(false)
      setSaved(false)
      const result = await getDashboardSitePage(runtime, selected)
      const next = { ar: result.content, en: result.contentEn ?? {} }
      contentCache.set(selected, next)
      setContentPair(next)
    } catch {
      setError(true)
    }
  }, [runtime, selected])

  useEffect(() => { void load() }, [selected])

  const schema = useMemo(() => pageSchema[selected], [selected])
  if (error) return <DashboardError onRetry={() => void load()} />
  if (!contentPair) return <DashboardLoading />

  const content = contentPair.ar
  const setLocaleContent = (next: Record<string, any>) => {
    const pair = { ...contentPair, ar: next }
    contentCache.set(selected, pair)
    writeDraft(selected, pair)
    setContentPair(pair)
    setSaved(false)
  }

  const setSharedImage = (key: string, value: string) => {
    const pair = {
      ar: { ...contentPair.ar, [key]: value },
      en: { ...contentPair.en, [key]: value },
    }
    contentCache.set(selected, pair)
    writeDraft(selected, pair)
    setContentPair(pair)
    setSaved(false)
  }

  const setPage = (pageKey: SitePageKey) => {
    const next = new URLSearchParams(searchParams)
    next.set('page', pageKey)
    setSearchParams(next)
  }

  const save = async () => {
    try {
      setSaving(true)
      setSaved(false)
      const result = await updateDashboardSitePage(runtime, selected, contentPair.ar, contentPair.en)
      const next = { ar: result.content, en: contentPair.en }
      contentCache.set(selected, next)
      clearDraft(selected)
      setContentPair(next)
      setSaved(true)
    } catch {
      setError(true)
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="p-4 lg:p-8"><div className="sticky top-[112px] z-10 mb-6 flex items-center justify-between gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]/95 p-4 shadow-sm backdrop-blur" dir={locale === "en" ? "ltr" : "rtl"}><div><p className="font-semibold">تغييرات محتوى الموقع</p><p className="text-xs text-[var(--color-text-muted)]">الحفظ متاح دائماً من هذا الشريط.</p></div><div className="flex gap-2"><Button variant="ghost" onClick={() => void load(true)}>{locale === "en" ? "Reset" : "تراجع"}</Button><Button disabled={saving} onClick={() => void save()}>{saving ? dashboardText(locale, "common.saving") : dashboardText(locale, "common.save")}</Button></div></div>
      <div className="grid gap-5 xl:grid-cols-[290px_minmax(0,1fr)]" dir="rtl">
        <aside dir="rtl" className="flex gap-2 overflow-x-auto rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 xl:block xl:h-fit">
          <p className="hidden px-3 py-2 text-xs font-semibold text-[var(--color-text-muted)] xl:block">صفحات الموقع</p>
          {pages.map((page) => (
            <button
              key={page.key}
              type="button"
              onClick={() => setPage(page.key)}
              className={`mb-0 w-[190px] shrink-0 rounded-xl p-3 text-right xl:mb-1 xl:w-full ${selected === page.key ? 'bg-[var(--color-bg)]' : 'hover:bg-[var(--color-bg)]/60'}`}
            >
              <strong className="block text-sm">{page.label}</strong>
              <span className="mt-1 block text-xs leading-5 text-[var(--color-text-muted)]">{page.description}</span>
            </button>
          ))}
        </aside>

        <section dir="rtl" className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 lg:p-7">
          <div className="mb-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-4 text-xs leading-6 text-[var(--color-text-muted)]">
            <strong className="text-[var(--color-text)]">دليل الصور:</strong>{' '}
            Hero الرئيسية <bdi dir="ltr">1400 × 1200</bdi> · بطاقة الشركات <bdi dir="ltr">1200 × 800</bdi> · بطاقة عن الشيف <bdi dir="ltr">1200 × 800</bdi> · Hero الشركات <bdi dir="ltr">1400 × 1000</bdi> · صورة من نحن <bdi dir="ltr">1200 × 900</bdi> · صور المنتجات <bdi dir="ltr">1200 × 1200</bdi>. يفضل JPG أو WebP مضغوط.
          </div>

          {!canEdit ? <DashboardRestricted /> : (
            <div className="space-y-5" dir={locale === 'en' ? 'ltr' : 'rtl'}>
              <div className={`rounded-xl border border-[var(--color-border)] bg-white p-3 text-xs leading-5 text-[var(--color-text-muted)] ${locale === 'en' ? 'text-left' : 'text-right'}`}>
                <strong className="text-[var(--color-text)]">{locale === 'en' ? 'English content' : 'المحتوى العربي'}:</strong>{' '}
                {locale === 'en' ? 'Write natural English, not literal word-for-word translation. Keep the same approved meaning and business claims.' : 'اكتب عربي واضح وطبيعي، بدون مبالغة أو ادعاءات غير معتمدة.'}
              </div>

              {schema.fields.map((field) => {
                if (field.kind === 'heroImages') {
                  return (
                    <HeroImageSlotsField
                      key={field.key}
                      values={Array.isArray(contentPair.ar[field.key]) ? contentPair.ar[field.key] : contentPair.ar.heroImageUrl ? [contentPair.ar.heroImageUrl] : []}
                      onChange={(values) => {
                        const pair = {
                          ar: { ...contentPair.ar, heroImages: values, heroImageUrl: values[0] ?? '' },
                          en: { ...contentPair.en, heroImages: values, heroImageUrl: values[0] ?? '' },
                        }
                        contentCache.set(selected, pair)
                        setContentPair(pair)
                        setSaved(false)
                      }}
                      storagePath={`cms/${selected}/hero`}
                      disabled={runtime.mode === 'preview'}
                    />
                  )
                }

                if (field.kind === 'image') {
                  return (
                    <ImageUploadField
                      key={field.key}
                      label={field.label}
                      value={contentPair.ar[field.key] ?? contentPair.en[field.key] ?? ''}
                      onChange={(value) => setSharedImage(field.key, value)}
                      storagePath={`cms/${selected}/${field.key}`}
                      help={field.imageHelp ?? 'ارفع صورة مناسبة لهذا الموضع.'}
                      recommendedSize={field.imageSize}
                      disabled={runtime.mode === 'preview'}
                    />
                  )
                }
                return (
                  <EditorField
                    key={field.key}
                    field={field}
                    locale={locale}
                    value={content[field.key] ?? ''}
                    onChange={(value) => setLocaleContent({ ...content, [field.key]: value })}
                  />
                )
              })}

              {schema.repeaters?.map((repeater) => (
                <RepeaterEditor
                  key={repeater.key}
                  config={repeater}
                  locale={locale}
                  items={Array.isArray(content[repeater.key]) ? content[repeater.key] : []}
                  onChange={(items) => setLocaleContent({ ...content, [repeater.key]: items })}
                />
              ))}

              </div>
          )}
        </section>
      </div>
    </main>
  )
}

function EditorField({ field, value, locale, onChange }: { field: Field; value: string; locale: CmsLocale; onChange: (value: string) => void }) {
  const guide = guidanceFor(field, locale)
  const base = 'w-full rounded-xl border border-[var(--color-border)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--color-text-muted)]'
  const inputDir = guide.dir ?? (locale === 'en' ? 'ltr' : 'rtl')
  const count = String(value ?? '').length
  const helpAlign = locale === 'en' ? 'text-left' : 'text-right'

  return (
    <label className="block">
      <span className={`mb-2 block text-sm font-semibold ${helpAlign}`}>{field.label}</span>
      {field.kind === 'textarea' ? (
        <textarea
          dir={inputDir}
          rows={field.key === 'body' ? 12 : 4}
          value={value}
          maxLength={guide.maxLength}
          placeholder={guide.placeholder}
          onChange={(event) => onChange(event.target.value)}
          className={`${base} ${inputDir === 'ltr' ? 'text-left' : 'text-right'}`}
        />
      ) : (
        <input
          dir={inputDir}
          type={field.kind === 'url' ? 'url' : field.key === 'phone' || field.key === 'whatsapp' ? 'tel' : 'text'}
          value={value}
          maxLength={guide.maxLength}
          placeholder={guide.placeholder}
          onChange={(event) => onChange(event.target.value)}
          className={`${base} ${inputDir === 'ltr' ? 'text-left' : 'text-right'}`}
        />
      )}
      <div className={`mt-1.5 flex flex-wrap items-start justify-between gap-2 text-xs leading-5 text-[var(--color-text-muted)] ${helpAlign}`} dir={locale === 'en' ? 'ltr' : 'rtl'}>
        <span className="max-w-[780px]">{guide.help}{guide.recommended ? ` · الطول المقترح: ${guide.recommended}.` : ''}</span>
        {guide.maxLength ? <span dir="ltr" className="shrink-0 tabular-nums">{count} / {guide.maxLength}</span> : null}
      </div>
    </label>
  )
}

function RepeaterEditor({ config, items, locale, onChange }: { config: Repeater; items: any[]; locale: CmsLocale; onChange: (items: any[]) => void }) {
  const move = (index: number, delta: number) => {
    const target = index + delta
    if (target < 0 || target >= items.length) return
    const next = [...items]
    ;[next[index], next[target]] = [next[target], next[index]]
    onChange(next)
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between" dir="rtl">
        <button type="button" onClick={() => onChange([...items, Object.fromEntries(config.itemFields.map((field) => [field.key, '']))])} className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-xs font-semibold">+ {config.addLabel}</button>
        <div className="text-right">
          <h4 className="font-bold">{config.label}</h4>
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">كل عنصر يحتاج عنواناً ومحتوى مختصراً. حافظ على نفس ترتيب العناصر في العربي والإنجليزي.</p>
        </div>
      </div>
      <div className="space-y-3">
        {items.map((item, index) => (
          <div key={index} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-4">
            <div className="mb-3 flex items-center justify-between" dir="rtl">
              <div className="flex gap-1">
                <button type="button" onClick={() => move(index, -1)} className="rounded bg-white px-2 py-1 text-xs">↑</button>
                <button type="button" onClick={() => move(index, 1)} className="rounded bg-white px-2 py-1 text-xs">↓</button>
                <button type="button" onClick={() => onChange(items.filter((_, itemIndex) => itemIndex !== index))} className="rounded bg-white px-2 py-1 text-xs text-[#C62828]">حذف</button>
              </div>
              <strong className="text-sm">#{index + 1}</strong>
            </div>
            <div className="space-y-3">
              {config.itemFields.map((field) => (
                <EditorField
                  key={field.key}
                  field={field}
                  locale={locale}
                  value={item[field.key] ?? ''}
                  onChange={(value) => onChange(items.map((current, itemIndex) => itemIndex === index ? { ...current, [field.key]: value } : current))}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
