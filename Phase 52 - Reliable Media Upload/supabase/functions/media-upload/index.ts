import { createClient } from 'jsr:@supabase/supabase-js@2'

const bucket = 'site-content'
const maxSize = 25 * 1024 * 1024
const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm'])
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (body: Record<string, unknown>, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
function fileExtension(file: File) {
  return ({ 'image/png': 'png', 'image/webp': 'webp', 'video/mp4': 'mp4', 'video/webm': 'webm' } as Record<string, string>)[file.type] ?? 'jpg'
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const url = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const authorization = request.headers.get('Authorization')
  if (!url || !serviceRoleKey) return json({ error: 'Media service is not configured.' }, 500)
  if (!authorization) return json({ error: 'يرجى تسجيل الدخول أولاً.' }, 401)

  const client = createClient(url, serviceRoleKey, { global: { headers: { Authorization: authorization } } })
  const token = authorization.replace(/^Bearer\s+/i, '')
  const { data: user, error: userError } = await client.auth.getUser(token)
  if (userError || !user.user) return json({ error: 'انتهت جلسة تسجيل الدخول. سجّل الدخول مجدداً.' }, 401)

  const { data: access, error: accessError } = await client.rpc('dashboard_my_access')
  if (accessError || !access) return json({ error: 'هذا الحساب غير مصرح له برفع الملفات.' }, 403)

  try {
    const form = await request.formData()
    const file = form.get('file')
    const inputFolder = form.get('folder')
    if (!(file instanceof File)) return json({ error: 'لم يتم اختيار ملف.' }, 400)
    if (!allowedTypes.has(file.type)) return json({ error: 'صيغة الملف غير مدعومة.' }, 400)
    if (file.size > maxSize) return json({ error: 'حجم الملف يجب ألا يتجاوز 25 MB.' }, 400)

    const admin = createClient(url, serviceRoleKey)
    const { data: existingBucket, error: bucketError } = await admin.storage.getBucket(bucket)
    if (bucketError && !/not found/i.test(bucketError.message)) throw bucketError
    if (!existingBucket) {
      const { error } = await admin.storage.createBucket(bucket, { public: true, fileSizeLimit: maxSize, allowedMimeTypes: [...allowedTypes] })
      if (error && !/already exists/i.test(error.message)) throw error
    }

    const folder = (typeof inputFolder === 'string' ? inputFolder : 'uploads').replace(/[^a-zA-Z0-9/_-]/g, '').replace(/^\/+|\/+$/g, '') || 'uploads'
    const path = `${folder}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${fileExtension(file)}`
    const { error: uploadError } = await admin.storage.from(bucket).upload(path, file, { cacheControl: '31536000', contentType: file.type, upsert: false })
    if (uploadError) throw uploadError
    const { data } = admin.storage.from(bucket).getPublicUrl(path)
    return json({ publicUrl: data.publicUrl })
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'تعذر حفظ الملف.' }, 500)
  }
})
