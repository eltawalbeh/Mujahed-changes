import { useEffect, useMemo, useState } from 'react'

type Props = {
  images: string[]
}

const positionClasses = [
  'absolute left-0 top-16 z-10 h-[300px] w-[300px] rotate-[-7deg] rounded-[42px] object-cover shadow-[0_24px_70px_rgba(29,23,20,.08)]',
  'absolute bottom-0 right-2 z-20 h-[265px] w-[250px] rotate-[6deg] rounded-[36px] object-cover shadow-[0_24px_70px_rgba(29,23,20,.08)]',
  'absolute left-20 top-0 z-30 h-[330px] w-[300px] rotate-0 rounded-[42px] object-cover shadow-[0_24px_70px_rgba(29,23,20,.12)]',
]

const emptyClasses = [
  'absolute left-0 top-16 z-10 h-[300px] w-[300px] rotate-[-7deg] rounded-[42px] bg-[var(--color-bg)]',
  'absolute bottom-0 right-2 z-20 h-[265px] w-[250px] rotate-[6deg] rounded-[36px] border border-[var(--color-border)] bg-[#EEE1D2]',
]

export default function HeroMediaStack({ images }: Props) {
  const normalized = useMemo(
    () => images.filter((image) => image.trim()).slice(0, 3),
    [images],
  )
  const [order, setOrder] = useState<number[]>([0, 1, 2])

  useEffect(() => {
    setOrder([0, 1, 2])
  }, [normalized.length])

  useEffect(() => {
    if (normalized.length < 2) return
    const timer = window.setInterval(() => {
      setOrder((current) => [current[2], current[0], current[1]])
    }, 4200)
    return () => window.clearInterval(timer)
  }, [normalized.length])

  if (!normalized.length) {
    return (
      <div className="relative mx-auto hidden h-[430px] w-full max-w-[500px] lg:block" aria-hidden="true">
        {emptyClasses.map((className) => <div key={className} className={className} />)}
        <div className="absolute left-20 top-0 z-30 grid h-[330px] w-[300px] place-items-center rounded-[42px] border border-[var(--color-border)] bg-[var(--color-text-muted)] shadow-[0_24px_70px_rgba(29,23,20,.12)]">
          <div className="text-center text-[var(--color-surface)]">
            <span className="block text-[84px] font-bold leading-none">ش</span>
            <span className="mt-5 block text-sm tracking-[.18em]">حلويات · كيك · معجنات</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative mx-auto hidden h-[430px] w-full max-w-[500px] lg:block" aria-hidden="true">
      {[0, 1, 2].map((position) => {
        const imageIndex = order[position]
        const image = normalized[imageIndex]
        const isVisible = Boolean(image && imageIndex < normalized.length)
        return (
          <div
            key={imageIndex}
            className={`${positionClasses[position]} overflow-hidden bg-[var(--color-bg)] transition-all duration-1000 ease-in-out ${isVisible ? 'opacity-100' : 'opacity-90'}`}
          >
            {image ? <img src={image} alt="" className="h-full w-full object-cover" /> : null}
          </div>
        )
      })}
    </div>
  )
}
