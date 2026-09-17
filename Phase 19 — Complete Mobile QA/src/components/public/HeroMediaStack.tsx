import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'

type Props = {
  images: string[]
}

const positionClasses = [
  'absolute left-0 top-12 z-10 h-[190px] w-[190px] rotate-[-7deg] rounded-[30px] object-cover shadow-[0_24px_70px_rgba(29,23,20,.08)] sm:top-14 sm:h-[240px] sm:w-[240px] sm:rounded-[36px] lg:top-16 lg:h-[300px] lg:w-[300px] lg:rounded-[42px]',
  'absolute bottom-0 right-0 z-20 h-[170px] w-[165px] rotate-[6deg] rounded-[28px] object-cover shadow-[0_24px_70px_rgba(29,23,20,.08)] sm:right-2 sm:h-[210px] sm:w-[200px] sm:rounded-[32px] lg:h-[265px] lg:w-[250px] lg:rounded-[36px]',
  'absolute left-10 top-0 z-30 h-[210px] w-[190px] rotate-0 rounded-[30px] object-cover shadow-[0_24px_70px_rgba(29,23,20,.12)] sm:left-16 sm:h-[270px] sm:w-[245px] sm:rounded-[36px] lg:left-20 lg:h-[330px] lg:w-[300px] lg:rounded-[42px]',
]

export default function HeroMediaStack({ images }: Props) {
  const normalized = useMemo(
    () => images.filter((image) => image.trim()).slice(0, 3),
    [images],
  )
  const [order, setOrder] = useState<number[]>([0, 1, 2])
  const [paused, setPaused] = useState(false)
  const pointerStart = useRef<{ x: number; y: number; active: boolean }>({ x: 0, y: 0, active: false })

  useEffect(() => {
    setOrder([0, 1, 2])
  }, [normalized.length])

  const rotate = (direction: 1 | -1) => {
    setOrder((current) => direction === 1
      ? [current[2], current[0], current[1]]
      : [current[1], current[2], current[0]])
  }

  useEffect(() => {
    if (normalized.length < 2 || paused) return
    const timer = window.setInterval(() => rotate(1), 5200)
    return () => window.clearInterval(timer)
  }, [normalized.length, paused])

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return
    pointerStart.current = { x: event.clientX, y: event.clientY, active: true }
    event.currentTarget.setPointerCapture?.(event.pointerId)
    setPaused(true)
  }

  const onPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!pointerStart.current.active) return
    const deltaX = event.clientX - pointerStart.current.x
    const deltaY = event.clientY - pointerStart.current.y
    pointerStart.current.active = false
    setPaused(false)

    if (Math.abs(deltaX) < 45 || Math.abs(deltaX) < Math.abs(deltaY)) return
    rotate(deltaX < 0 ? 1 : -1)
  }

  const onPointerCancel = () => {
    pointerStart.current.active = false
    setPaused(false)
  }

  if (!normalized.length) return null

  return (
    <>
      <div className="mx-auto w-full max-w-[520px] lg:hidden">
        <div className="relative aspect-[5/4] overflow-hidden rounded-[28px] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[0_18px_50px_rgba(29,23,20,.08)]">
          <img src={normalized[order[2] % normalized.length]} alt="" className="h-full w-full object-cover transition-opacity duration-700" />
          {normalized.length > 1 ? <div className="absolute inset-x-0 bottom-0 flex justify-center gap-1.5 bg-gradient-to-t from-black/35 to-transparent pb-3 pt-8">{normalized.map((_, index) => <span key={index} className={`size-1.5 rounded-full ${order[2] % normalized.length === index ? 'bg-white' : 'bg-white/55'}`} />)}</div> : null}
        </div>
      </div>
      <div
        className="relative mx-auto hidden h-[430px] w-full max-w-[500px] select-none touch-pan-y cursor-grab lg:block active:cursor-grabbing"
        aria-hidden="true"
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onPointerLeave={(event) => {
          if (event.pointerType === 'mouse' && !pointerStart.current.active) setPaused(false)
        }}
        onPointerEnter={(event) => {
          if (event.pointerType === 'mouse') setPaused(true)
        }}
      >
        {[0, 1, 2].map((position) => {
          const imageIndex = order[position]
          const image = normalized[imageIndex]
          const isVisible = Boolean(image && imageIndex < normalized.length)
          return <div key={imageIndex} className={`${positionClasses[position]} overflow-hidden bg-[var(--color-bg)] transition-[left,right,top,bottom,transform,opacity] duration-[1200ms] ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform ${isVisible ? 'opacity-100' : 'opacity-90'}`}>{image ? <img src={image} alt="" draggable={false} className="h-full w-full object-cover" /> : null}</div>
        })}
      </div>
    </>
  )
}
