import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

type PageMeta = {
  title: string
  description: string
}

const pageMeta: Record<string, PageMeta> = {
  '/': {
    title: 'الشيف مجاهد | بوفيهات وتموين مناسبات',
    description: 'الشيف مجاهد يقدم خدمات البوفيهات والتموين للمناسبات والفعاليات والشركات في الأردن.'
  },
  '/products': {
    title: 'المنتجات والقوائم | الشيف مجاهد',
    description: 'استكشف قوائم الطعام والمنتجات وخيارات الضيافة من الشيف مجاهد.'
  },
  '/business': {
    title: 'خدمات الشركات | الشيف مجاهد',
    description: 'حلول تموين وضيافة مخصصة للشركات والمؤسسات مع خدمة احترافية ومرنة.'
  },
  '/about': {
    title: 'عن الشيف مجاهد',
    description: 'تعرّف على الشيف مجاهد وخبرته في تقديم الطعام والضيافة للمناسبات والفعاليات.'
  },
  '/contact': {
    title: 'تواصل معنا | الشيف مجاهد',
    description: 'تواصل مع فريق الشيف مجاهد للحصول على عرض أو الاستفسار عن خدمات التموين والضيافة.'
  },
  '/faq': {
    title: 'الأسئلة الشائعة | الشيف مجاهد',
    description: 'إجابات عن أكثر الأسئلة شيوعًا حول خدمات الشيف مجاهد والطلبات والتموين.'
  },
  '/privacy': {
    title: 'سياسة الخصوصية | الشيف مجاهد',
    description: 'اطلع على سياسة الخصوصية وشروط التعامل مع البيانات في الشيف مجاهد.'
  },
  '/terms': {
    title: 'الشروط والأحكام | الشيف مجاهد',
    description: 'اطلع على الشروط والأحكام الخاصة باستخدام خدمات الشيف مجاهد.'
  }
}

function upsertMeta(attribute: 'name' | 'property', key: string, content: string) {
  let element = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`)
  if (!element) {
    element = document.createElement('meta')
    element.setAttribute(attribute, key)
    document.head.appendChild(element)
  }
  element.content = content
}

function upsertLink(rel: string, href: string) {
  let element = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`)
  if (!element) {
    element = document.createElement('link')
    element.rel = rel
    document.head.appendChild(element)
  }
  element.href = href
}

export default function Seo() {
  const location = useLocation()

  useEffect(() => {
    const siteUrl = window.location.origin
    const canonicalUrl = `${siteUrl}${location.pathname}`
    const meta = pageMeta[location.pathname] ?? {
      title: 'الشيف مجاهد',
      description: 'خدمات الطعام والتموين والضيافة من الشيف مجاهد.'
    }

    document.title = meta.title
    document.documentElement.lang = 'ar'
    document.documentElement.dir = 'rtl'

    upsertMeta('name', 'description', meta.description)
    upsertMeta('name', 'robots', 'index, follow')
    upsertMeta('property', 'og:title', meta.title)
    upsertMeta('property', 'og:description', meta.description)
    upsertMeta('property', 'og:type', 'website')
    upsertMeta('property', 'og:url', canonicalUrl)
    upsertMeta('name', 'twitter:card', 'summary_large_image')
    upsertMeta('name', 'twitter:title', meta.title)
    upsertMeta('name', 'twitter:description', meta.description)
    upsertLink('canonical', canonicalUrl)

    const existingSchema = document.head.querySelector<HTMLScriptElement>('script[data-chef-mujahed-schema]')
    const schema = existingSchema ?? document.createElement('script')
    schema.type = 'application/ld+json'
    schema.setAttribute('data-chef-mujahed-schema', 'true')
    schema.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'FoodEstablishment',
      name: 'الشيف مجاهد',
      description: meta.description,
      url: siteUrl,
      servesCuisine: 'Middle Eastern',
      areaServed: 'Jordan'
    })
    if (!existingSchema) document.head.appendChild(schema)
  }, [location.pathname])

  return null
}
