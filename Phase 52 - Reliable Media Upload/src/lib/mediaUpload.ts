import { supabase } from '@/lib/supabase'

export async function uploadDashboardMedia(file: File, folder: string) {
  const body = new FormData()
  body.set('file', file)
  body.set('folder', folder)
  const { data, error } = await supabase.functions.invoke('media-upload', {
    body,
  })
  if (error) throw new Error(error.message || 'تعذر الاتصال بخدمة رفع الملفات.')
  if (!data?.publicUrl || typeof data.publicUrl !== 'string') throw new Error(data?.error || 'تعذر حفظ الملف. حاول مرة أخرى.')
  return data.publicUrl
}
