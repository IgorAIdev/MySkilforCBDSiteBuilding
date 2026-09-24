'use client'
import { useRef, useState, useSyncExternalStore, type MouseEvent } from 'react'
import p from '@/styles/primitives.module.css'
import go from '@/styles/go.module.css'
import s from './Gallery.module.css'
import type { GalleryView } from '@/lib/product-view.ts'
import { Icon } from './Icon.tsx'

const never = () => () => {}

/* Галерея товара: главный кадр — лента слайдов с прилипанием, под ним ряд
   миниатюр (или точек — ручка `--pdp-thumbs`). Без скрипта работает
   целиком: у каждого слайда якорь, миниатюра — ссылка на него, лента
   листается пальцем и колесом. Скрипт добавляет стрелки на кадре и держит
   отметку текущей миниатюры; помнит компонент одно — номер слайда.

   Размер — не здесь: блок целиком (кадр, зазор, ряд) помещается в экран
   правилом Gallery.module.css (И278), разметка о высоте окна не знает. */
export function Gallery({ view }: { view: GalleryView }) {
  const strip = useRef<HTMLDivElement>(null)
  const [current, setCurrent] = useState(0)
  /* Стрелки — только со скриптом: без него они ничего не умеют. Снимок
     сервера — «скрипта нет», после гидратации — «есть». */
  const live = useSyncExternalStore(never, () => true, () => false)
  const many = view.slides.length > 1

  function show(i: number) {
    const el = strip.current
    if (!el) return
    const to = (i + view.slides.length) % view.slides.length
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    el.scrollTo({ left: to * el.clientWidth, behavior: still ? 'instant' : 'smooth' })
    setCurrent(to)
  }
  /* Миниатюра со скриптом листает ленту на месте: без скрипта тот же адрес
     `#shot-2` довозит слайд браузер, но вместе с ним двигает и страницу. */
  function pick(e: MouseEvent<HTMLAnchorElement>, i: number) {
    e.preventDefault()
    show(i)
  }
  function onScroll() {
    const el = strip.current
    if (el && el.clientWidth) setCurrent(Math.round(el.scrollLeft / el.clientWidth))
  }

  return (
    <div className={s.gallery} data-gallery="" data-many={many ? '' : undefined}>
      <div className={`${p.frame} ${s.stage}`}>
        {/* Ленту клавиатура берёт и без tabIndex: прокручиваемая коробка без
            фокусируемых детей сама становится целью Tab (Chrome 130+, Firefox). */}
        <div ref={strip} className={s.strip} role="region" aria-label={view.label} onScroll={many ? onScroll : undefined}>
          {view.slides.map((slide, i) => (
            <div key={slide.id} id={slide.id} className={s.slide}>
              <img
                src={slide.src} alt={slide.alt} width={slide.width} height={slide.height} decoding="async"
                fetchPriority={i === 0 ? 'high' : undefined} loading={i === 0 ? undefined : 'lazy'}
              />
            </div>
          ))}
        </div>
        {view.badge ? <span className={`${p.cut} ${s.badge}`}>{view.badge}</span> : null}
        {many && live ? (
          <>
            <button type="button" className={`${go.go} ${s.arrow}`} data-around="edge" data-to="back" aria-label={view.prev} onClick={() => show(current - 1)}>
              <Icon id="chevron-left" />
            </button>
            <button type="button" className={`${go.go} ${s.arrow}`} data-around="edge" aria-label={view.next} onClick={() => show(current + 1)}>
              <Icon id="chevron-right" />
            </button>
          </>
        ) : null}
      </div>
      {many ? (
        <>
          <ol className={s.thumbs}>
            {view.slides.map((slide, i) => (
              <li key={slide.id}>
                <a className={`${p.frame} ${s.thumb}`} href={`#${slide.id}`} aria-label={slide.show} aria-current={i === current ? 'true' : undefined} onClick={(e) => pick(e, i)}>
                  <img src={slide.src} alt="" width={slide.width} height={slide.height} loading="lazy" decoding="async" />
                </a>
              </li>
            ))}
          </ol>
          <ol className={s.dots}>
            {view.slides.map((slide, i) => (
              <li key={slide.id}>
                <a className={s.dot} href={`#${slide.id}`} aria-label={slide.show} aria-current={i === current ? 'true' : undefined} onClick={(e) => pick(e, i)} />
              </li>
            ))}
          </ol>
        </>
      ) : null}
    </div>
  )
}
