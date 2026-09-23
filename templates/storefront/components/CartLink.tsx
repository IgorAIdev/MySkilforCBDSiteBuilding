'use client'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import s from './Header.module.css'
import { Icon } from './Icon.tsx'

/* Корзина в шапке. Число приходит своим запросом после загрузки и заново —
   после каждого перехода (шапка не размонтируется между страницами, а
   переход, скажем, оформления заказа корзину меняет без записи через форму
   корзины) — и после каждой записи в корзину — событием `cart:count` от
   формы корзины. Без скрипта — ссылка без числа. Знак шапки, а не кнопка
   действия: стиль кнопок сайта его не касается; `labelled` — со словом
   «Cart» рядом (шапка «Search first»). */
export function CartLink({ href, label, countUrl, labelled = false }: { href: string; label: string; countUrl: string; labelled?: boolean }) {
  const [count, setCount] = useState<number | null>(null)
  const pathname = usePathname()
  useEffect(() => {
    const stop = new AbortController()
    fetch(countUrl, { cache: 'no-store', signal: stop.signal })
      .then((r) => (r.ok ? (r.json() as Promise<{ count: number | null }>) : null))
      .then((d) => { if (d && typeof d.count === 'number') setCount(d.count) })
      .catch(() => {})
    const on = (e: Event) => setCount((e as CustomEvent<number>).detail)
    window.addEventListener('cart:count', on)
    return () => { stop.abort(); window.removeEventListener('cart:count', on) }
  }, [countUrl, pathname])
  return (
    <a className={`${s.glyph} ${s.cart}`} href={href} aria-label={count ? `${label} (${count})` : label}>
      <Icon id="shopping-cart" />
      {labelled ? <span className={s.cartLabel} aria-hidden="true">{label}</span> : null}
      {count ? <span className={s.badge} aria-hidden="true">{count}</span> : null}
    </a>
  )
}
