'use client'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import s from './Header.module.css'
import p from '@/styles/primitives.module.css'
import { Icon } from './Icon.tsx'

/* Корзина в шапке. Число приходит своим запросом после загрузки и заново —
   после каждого перехода (шапка не размонтируется между страницами, а
   переход, скажем, оформления заказа корзину меняет без записи через форму
   корзины) — и после каждой записи в корзину — событием `cart:count` от
   формы корзины. Без скрипта — ссылка без числа. Знак шапки, а не кнопка
   действия: стиль кнопок сайта его не касается; `labelled` — со словом
   «Cart» рядом (шапка «Search first»).

   «Положено» говорит корзина, а не кнопка (слово заказчика 25.09.2026:
   «Added to your cart — должно быть не текстом на странице, а текстом в
   корзине», И441): удачная запись `add` шлёт `cart:added` (CartForm), и под
   знаком на время всплывает строка `added`. Строка стоит рядом со ссылкой,
   а не в ней: объявление вслух (`role="status"`) — не часть имени ссылки.
   Видимая строка и объявление — порознь: видимая гаснет прозрачностью со
   своими словами, а объявление пустеет, чтобы следующее «положено» снова
   прозвучало.

   Знак корзины и сумма рядом — вид сайта (шапка cbdin.bg, И430): знак —
   тележка или сумка (`--cart-sign`), рядом со знаком — число на углу или ещё
   и сумма товаров (`--cart-meta`). Сумму пишет страница (`/api/cart`, в
   записи языка), не компонент; оба знака в разметке, какой виден — решают
   стили. */
const SHOWN_MS = 2400
export function CartLink({ href, label, added, countUrl, labelled = false }: { href: string; label: string; added: string; countUrl: string; labelled?: boolean }) {
  const [count, setCount] = useState<number | null>(null)
  const [sum, setSum] = useState<string | null>(null)
  const [told, setTold] = useState(false)
  const pathname = usePathname()
  useEffect(() => {
    const stop = new AbortController()
    fetch(countUrl, { cache: 'no-store', signal: stop.signal })
      .then((r) => (r.ok ? (r.json() as Promise<{ count: number | null; sum?: string | null }>) : null))
      .then((d) => { if (d && typeof d.count === 'number') { setCount(d.count); setSum(d.sum ?? null) } })
      .catch(() => {})
    /* Запись в корзину говорит только число — сумму спрашиваем заново. */
    const on = (e: Event) => {
      setCount((e as CustomEvent<number>).detail)
      fetch(countUrl, { cache: 'no-store' })
        .then((r) => (r.ok ? (r.json() as Promise<{ sum?: string | null }>) : null))
        .then((d) => { if (d) setSum(d.sum ?? null) })
        .catch(() => {})
    }
    window.addEventListener('cart:count', on)
    return () => { stop.abort(); window.removeEventListener('cart:count', on) }
  }, [countUrl, pathname])
  useEffect(() => {
    let hide: ReturnType<typeof setTimeout> | undefined
    const on = () => { setTold(true); clearTimeout(hide); hide = setTimeout(() => setTold(false), SHOWN_MS) }
    window.addEventListener('cart:added', on)
    return () => { clearTimeout(hide); window.removeEventListener('cart:added', on) }
  }, [])
  return (
    <span className={s.cartBox}>
      <a className={`${s.glyph} ${s.cart}`} href={href} aria-label={count ? `${label} (${count}${sum ? `, ${sum}` : ''})` : label}>
        <span className={s.cartSign}>
          <span className={s.signCart}><Icon id="shopping-cart" /></span>
          <span className={s.signBag}><Icon id="handbag" /></span>
          {count ? <span className={s.badge} aria-hidden="true">{count}</span> : null}
        </span>
        {labelled ? <span className={s.cartLabel} aria-hidden="true">{label}</span> : null}
        {sum ? <b className={s.cartSum} aria-hidden="true">{sum}</b> : null}
      </a>
      <span className={s.told} data-shown={told} aria-hidden="true"><Icon id="check" />{added}</span>
      <span className={p.said} role="status">{told ? added : ''}</span>
    </span>
  )
}
