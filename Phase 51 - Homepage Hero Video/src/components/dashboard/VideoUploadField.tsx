import { DragEvent, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Props = {
  label: string
  value: string
  onChange: (value: string) => void
  storagePath: string
  disabled?: boolean
}

const ACCEPT = ['video/mp4', 'video/webm']
const MAX_SIZE = 25 * 1024 * 1024

function extension(file: File) {
  return file.type === 'video/webm' ? 'webm' : 'mp4'
}

export default function VideoUploadField({ label, value, onChange, storagePath, disabled = false }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  const upload = async (file: File) => {
    setError('')
    if (!ACCEPT.includes(file.type)) return setError('الصيغ المدعومة: MP4 أو WebM فقط.')
    if (file.size > MAX_SIZE) return setError('حجم الفيديو يجب ألا يتجاوز 25 MB.')
    try {
      setUploading(true)
      const path = `${storagePath}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${extension(file)}`.replace(/\/+/g, '/')
      const { error: uploadError } = await supabase.storage.from('site-content').upload(path, file, { cacheControl: '31536000', upsert: false, contentType: file.type })
      if (uploadError) throw uploadError
      const { data } = supabase.storage.from('site-content').getPublicUrl(path)
      onChange(data.publicUrl)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر رفع الفيديو. حاول مرة أخرى.')
    } finally { setUploading(false) }
  }

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setDragging(false)
    const file = event.dataTransfer.files?.[0]
    if (file) void upload(file)
  }

  return <div className="block">
    <div className="mb-2 flex items-center justify-between gap-3"><span className="text-sm font-semibold">{label}</span><span className="text-[11px] text-[var(--color-text-muted)]">MP4 / WebM · حتى 25 MB</span></div>
    <div onDragEnter={(event) => { event.preventDefault(); setDragging(true) }} onDragOver={(event) => { event.preventDefault(); setDragging(true) }} onDragLeave={(event) => { event.preventDefault(); setDragging(false) }} onDrop={onDrop} className={`rounded-2xl border-2 border-dashed p-5 text-center transition-colors ${dragging ? 'border-[var(--color-text-muted)] bg-[var(--color-bg)]' : 'border-[var(--color-border)] bg-white'}`}>
      <input ref={inputRef} type="file" accept="video/mp4,video/webm" className="hidden" disabled={disabled || uploading} onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(file); event.currentTarget.value = '' }} />
      <p className="text-sm font-semibold">اسحب فيديو الـ Hero وأفلته هنا</p>
      <p className="mt-1 text-xs text-[var(--color-text-muted)]">يعمل تلقائياً بدون صوت، ويأخذ مكان صور الـHero المتحركة.</p>
      <button type="button" disabled={disabled || uploading} onClick={() => inputRef.current?.click()} className="mt-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50">{uploading ? 'جاري رفع الفيديو...' : 'رفع فيديو'}</button>
    </div>
    <p className="mt-2 text-xs leading-5 text-[var(--color-text-muted)]">المقاس الأفضل: <bdi dir="ltr">1920 × 1080</bdi> أو أعلى، والمدة المثالية 8–15 ثانية. لا يُشغّل الصوت تلقائياً.</p>
    {error ? <p className="mt-2 rounded-lg bg-[#FFEBEE] px-3 py-2 text-xs font-semibold text-[#B71C1C]">{error}</p> : null}
    {value ? <div className="mt-3 overflow-hidden rounded-xl border border-[var(--color-border)] bg-black"><video src={value} className="aspect-video w-full" controls muted playsInline /><div className="flex items-center justify-between gap-3 bg-[var(--color-bg)] p-2 text-xs text-[var(--color-text-muted)]"><button type="button" onClick={() => onChange('')} className="rounded-lg bg-white px-2 py-1 font-semibold text-[#9B2C2C]">إزالة الفيديو</button><span>معاينة فيديو الـHero الحالي</span></div></div> : null}
  </div>
}
