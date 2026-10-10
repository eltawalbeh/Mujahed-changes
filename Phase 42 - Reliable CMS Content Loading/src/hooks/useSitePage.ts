import { useEffect, useState } from 'react'
import { defaultSiteContent, defaultSiteContentEn, type SitePageKey } from '@/content/defaultSiteContent'
import { getPublicSitePage, type SiteLocale } from '@/data/content'

const cache = new Map<string, Record<string, any>>()
const pending = new Map<string, Promise<Record<string, any>>>()
const STORAGE_PREFIX = 'chef-mujahed:public-content:'
function readStored(key: string) { try { const raw = window.localStorage.getItem(STORAGE_PREFIX + key); return raw ? JSON.parse(raw) : null } catch { return null } }
function writeStored(key: string, value: Record<string, any>) { try { window.localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value)) } catch {} }
function cacheKeyFor(pageKey: SitePageKey, locale: SiteLocale) { return `${locale}:${pageKey}` }

function hydrateStored(pageKey: SitePageKey, locale: SiteLocale) {
  const cacheKey = cacheKeyFor(pageKey, locale)
  const stored = cache.get(cacheKey) ?? readStored(cacheKey)
  if (stored && typeof stored === 'object') cache.set(cacheKey, stored)
  return stored
}

async function loadSitePage<T extends Record<string, any>>(pageKey: SitePageKey, locale: SiteLocale): Promise<T> {
  const cacheKey = cacheKeyFor(pageKey, locale)
  const existing = pending.get(cacheKey)
  if (existing) return existing as Promise<T>

  const request = getPublicSitePage<T>(pageKey, locale)
    .then((result) => {
      cache.set(cacheKey, result)
      writeStored(cacheKey, result)
      return result
    })
    .finally(() => pending.delete(cacheKey))

  pending.set(cacheKey, request)
  return request
}

export function hasSitePageContent(pageKey: SitePageKey, locale: SiteLocale = 'ar') {
  return Boolean(hydrateStored(pageKey, locale))
}

export function preloadSitePages(pageKeys: SitePageKey[], locale: SiteLocale = 'ar') {
  return Promise.all(pageKeys.map((pageKey) => hydrateStored(pageKey, locale) ?? loadSitePage(pageKey, locale)))
}

export function useSitePage<T extends Record<string, any>>(pageKey: SitePageKey, locale: SiteLocale = 'ar') {
  const cacheKey = cacheKeyFor(pageKey, locale)
  const fallback = locale === 'en' ? defaultSiteContentEn[pageKey] : defaultSiteContent[pageKey]
  const [content, setContent] = useState<T>(() => (hydrateStored(pageKey, locale) ?? fallback) as T)

  useEffect(() => {
    let active = true
    void loadSitePage<T>(pageKey, locale).then((result) => { if (active) setContent(result) })
    return () => { active = false }
  }, [pageKey, locale, cacheKey])

  return content
}
