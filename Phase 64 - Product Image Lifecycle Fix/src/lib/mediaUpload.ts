import { supabase } from '@/lib/supabase'

export async function uploadDashboardMedia(file: File, folder: string) {
  const { data: sessionData } = await supabase.auth.getSession()
  if (!sessionData.session) throw new Error('يرجى تسجيل الدخول أولاً.')

  const body = new FormData()
  body.set('file', file)
  body.set('folder', folder)
  const baseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://hqvxhhhwzhefydvwlpje.supabase.co'
  const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_BnJGRB4zHFXelhpi-NFtuQ_KqKppb7o'
  const response = await fetch(`${baseUrl}/functions/v1/make-server-146e5e37/media-upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${sessionData.session.access_token}`, apikey: publishableKey },
    body,
  })
  const data = await response.json().catch(() => null)
  if (!response.ok) throw new Error(data?.error || 'تعذر الاتصال بخدمة رفع الملفات.')
  if (!data?.publicUrl || typeof data.publicUrl !== 'string') throw new Error(data?.error || 'تعذر حفظ الملف. حاول مرة أخرى.')
  return data.publicUrl
}
/** Authenticated cleanup for this product's own, unreferenced Storage images. */
export async function cleanupUnusedProductImages(productId: string, urls: string[]) {
  const unique = [...new Set(urls.filter(Boolean))]
  if (!unique.length) return { removed: 0, shared: 0, ignored: 0 }
  const {data: sessionData} = await supabase.auth.getSession()
  if (!sessionData.session) throw new Error('يرجى تسجيل الدخول أولاً.')
  const baseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://hqvxhhhwzhefydvwlpje.supabase.co'
  const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_BnJGRB4zHFXelhpi-NFtuQ_KqKppb7o'
  const response = await fetch(`${baseUrl}/functions/v1/make-server-146e5e37/media-cleanup-product`, {
    method: 'POST',
    headers: {Authorization: `Bearer ${sessionData.session.access_token}`,apikey:publishableKey,'Content-Type':'application/json'},
    body: JSON.stringify({productId,urls:unique})
  })
  const result = await response.json().catch(()=>null)
  if (!response.ok) throw new Error(result?.error || 'تعذر تنظيف صور المنتج من Storage.')
  return {removed:Number(result?.removed||0),shared:Number(result?.shared||0),ignored:Number(result?.ignored||0)}
}
