import { DragEvent, useRef, useState } from 'react'
import { uploadDashboardMedia } from '@/lib/mediaUpload'

type Props = {
  label: string
  value: string
  onChange: (value: string) => void
  storagePath: string
  help: string
  recommendedSize?: string
  disabled?: boolean
  sharedNote?: string
}

const ACCEPT = ['image/jpeg', 'image/png', 'image/webp']
const MAX_SIZE = 5 * 1024 * 1024

export default function ImageUploadField({
  label, value, onChange, storagePath, help, recommendedSize, disabled = false,
  sharedNote = 'الصورة مشتركة بين النسخة العربية والإنجليزية لنفس الموضع.',
}: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  const upload = async (file: File) => {
    setError('')
    if (!ACCEPT.includes(file.type)) { setError('الصيغ المدعومة: JPG، PNG، WebP فقط.'); return }
    if (file.size > MAX_SIZE) { setError('حجم الصورة يجب ألا يتجاوز 5 MB.'); return }
    try {
      setUploading(true)
      onChange(await uploadDashboardMedia(file, storagePath))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر رفع الصورة. حاول مرة أخرى.')
    } finally { setUploading(false) }
  }

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault(); setDragging(false)
    const file = event.dataTransfer.files?.[0]
    if (file) void upload(file)
  }

  return <div className="block">
    <div className="mb-2 flex items-center justify-between gap-3">
      <span className="text-sm font-semibold">{label}</span>
      <span className="text-[11px] text-[var(--color-text-muted)]">JPG / PNG / WebP · حتى 5 MB</span>
    </div>
    <div onDragEnter={(event) => { event.preventDefault(); setDragging(true) }} onDragOver={(event) => { event.preventDefault(); setDragging(true) }} onDragLeave={(event) => { event.preventDefault(); setDragging(false) }} onDrop={onDrop} className={`rounded-2xl border-2 border-dashed p-5 text-center transition-colors ${dragging ? 'border-[var(--color-text-muted)] bg-[var(--color-bg)]' : 'border-[var(--color-border)] bg-white'}`}>
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" disabled={disabled || uploading} onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(file); event.currentTarget.value = '' }} />
      <p className="text-sm font-semibold">اسحب الصورة وأفلتها هنا</p>
      <p className="mt-1 text-xs text-[var(--color-text-muted)]">أو اخترها من جهازك. سيتم حفظها في Media Storage واستخدام رابطها تلقائياً.</p>
      <button type="button" disabled={disabled || uploading} onClick={() => inputRef.current?.click()} className="mt-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50">{uploading ? 'جاري رفع الصورة...' : 'رفع صورة'}</button>
    </div>
    <div className="mt-3">
      <label className="block text-xs font-semibold text-[var(--color-text-muted)]">أو استخدم رابط صورة مباشر</label>
      <input dir="ltr" type="url" value={value} onChange={(event) => onChange(event.target.value)} placeholder="https://..." className="mt-1.5 w-full rounded-xl border border-[var(--color-border)] bg-white px-3 py-2.5 text-left text-sm outline-none focus:border-[var(--color-text-muted)]" />
    </div>
    <p className="mt-2 text-xs leading-5 text-[var(--color-text-muted)]">{help}{recommendedSize ? ` · المقاس المقترح: ${recommendedSize}.` : ''}</p>
    {sharedNote ? <p className="mt-1 text-[11px] leading-5 text-[var(--color-text-muted)]">{sharedNote}</p> : null}
    {error ? <p className="mt-2 rounded-lg bg-[#FFEBEE] px-3 py-2 text-xs font-semibold text-[#B71C1C]">{error}</p> : null}
    {value ? <div className="mt-3 overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)]"><img src={value} alt="معاينة الصورة" className="h-48 w-full object-cover" /><div className="flex items-center justify-between gap-3 p-2 text-xs text-[var(--color-text-muted)]"><button type="button" onClick={() => onChange('')} className="rounded-lg bg-white px-2 py-1 font-semibold text-[#9B2C2C]">إزالة الصورة</button><span>معاينة الصورة الحالية</span></div></div> : null}
  </div>
}
