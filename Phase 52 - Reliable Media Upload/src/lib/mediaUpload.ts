import { supabase } from '@/lib/supabase'

export async function uploadDashboardMedia(file: File, folder: string) {
  const { data: sessionData } = await supabase.auth.getSession()
  if (!sessionData.session) throw new Error('يرجى تسجيل الدخول أولاً.')

  const body = new FormData()
  body.set('file', file)
  body.set('folder', folder)
  const baseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://hqvxhhhwzhefydvwlpje.supabase.co'
  const response = await fetch(`${baseUrl}/functions/v1/make-server-146e5e37/media-upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${sessionData.session.access_token}` },
    body,
  })
  const data = await response.json().catch(() => null)
  if (!response.ok) throw new Error(data?.error || 'تعذر الاتصال بخدمة رفع الملفات.')
  if (!data?.publicUrl || typeof data.publicUrl !== 'string') throw new Error(data?.error || 'تعذر حفظ الملف. حاول مرة أخرى.')
  return data.publicUrl
}
