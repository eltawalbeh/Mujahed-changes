import { supabase } from '@/lib/supabase'

export async function uploadDashboardMedia(file: File, folder: string) {
  const { data: sessionData } = await supabase.auth.getSession()
  if (!sessionData.session) throw new Error('يرجى تسجيل الدخول أولاً.')

  const body = new FormData()
  body.set('file', file)
  body.set('folder', folder)
  const baseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://hqvxhhhwzhefydvwlpje.supabase.co'
  const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_BnJGRB4zHFXelhpi-NFtuQ_KqKppb7o'
  const response = await fetch(`${baseUrl}/functions/v1/media-upload-cdn`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${sessionData.session.access_token}`, apikey: publishableKey },
    body,
  })
  const data = await response.json().catch(() => null)
  if (!response.ok) throw new Error(data?.error || 'تعذر الاتصال بخدمة Cloudflare CDN.')
  if (!data?.publicUrl || typeof data.publicUrl !== 'string') throw new Error(data?.error || 'تعذر حفظ الملف. حاول مرة أخرى.')
  return data.publicUrl
}
/** Authenticated cleanup for this product's own, unreferenced Storage images. */
export async function cleanupUnusedProductImages(productId: string, urls: string[]) {
  const unique = [...new Set(urls.filter(Boolean))]
  if (!unique.length) return { removed: 0, shared: 0, ignored: 0 }
  const cdnPrefix = 'https://chef-mujahed-assets.pages.dev/uploads/'
  const cdnUrls = unique.filter(url => url.startsWith(cdnPrefix))
  const legacyUrls = unique.filter(url => !url.startsWith(cdnPrefix))
  const {data: sessionData} = await supabase.auth.getSession()
  if (!sessionData.session) throw new Error('يرجى تسجيل الدخول أولاً.')
  const baseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://hqvxhhhwzhefydvwlpje.supabase.co'
  const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_BnJGRB4zHFXelhpi-NFtuQ_KqKppb7o'
  const summarize = async (target: string, mediaUrls: string[], operation?: string) => {
    if (!mediaUrls.length) return {removed:0,shared:0,ignored:0}
    const response = await fetch(baseUrl + '/functions/v1/' + target, {
      method: 'POST',
      headers: {Authorization: 'Bearer ' + sessionData.session.access_token,apikey:publishableKey,'Content-Type':'application/json'},
      body: JSON.stringify({productId,urls:mediaUrls, ...(operation ? {operation} : {})}),
    })
    const result = await response.json().catch(()=>null)
    if (!response.ok) throw new Error(result?.error || 'تعذر تنظيف ملفات المنتج.')
    return {removed:Number(result?.removed||0),shared:Number(result?.shared||0),ignored:Number(result?.ignored||0)}
  }
  const a = await summarize('make-server-146e5e37/media-cleanup-product',legacyUrls)
  const b = await summarize('media-upload-cdn',cdnUrls,'cleanup')
  return {removed:a.removed+b.removed,shared:a.shared+b.shared,ignored:a.ignored+b.ignored}
}
