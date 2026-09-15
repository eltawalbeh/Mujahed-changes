import ImageUploadField from '@/components/dashboard/ImageUploadField'

type Props = {
  values: string[]
  onChange: (values: string[]) => void
  storagePath: string
  disabled?: boolean
}

export default function HeroImageSlotsField({ values, onChange, storagePath, disabled = false }: Props) {
  const slots = [0, 1, 2].map((index) => values[index] ?? '')

  const setSlot = (index: number, value: string) => {
    const next = [...slots]
    next[index] = value
    onChange(next)
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-4 text-right text-sm leading-7">
        <strong>صور الـHero المتحركة</strong>
        <p className="mt-1 text-xs text-[var(--color-text-muted)]">
          ارفع صورة واحدة أو صورتين أو ثلاث صور. المربعات تبقى ثابتة، والصور تتبدل بينها تلقائياً حول المركز.
        </p>
      </div>

      {slots.map((value, index) => (
        <ImageUploadField
          key={index}
          label={`صورة الـHero ${index + 1}`}
          value={value}
          onChange={(nextValue) => setSlot(index, nextValue)}
          storagePath={`${storagePath}/${index + 1}`}
          help={index === 0 ? 'الصورة الأساسية تظهر في المربع الأمامي عند استخدام صورة واحدة.' : 'صورة اختيارية تظهر عند رفع أكثر من صورة.'}
          recommendedSize="1400 × 1200 px · 7:6"
          disabled={disabled}
        />
      ))}
    </div>
  )
}
