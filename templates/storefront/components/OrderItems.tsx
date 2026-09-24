import p from '@/styles/primitives.module.css'
import s from './Checkout.module.css'
import type { ItemView } from '@/lib/checkout-view.ts'

/* Товары заказа — снимок в колодце, имя, факты варианта с количеством,
   сумма строки. Одни на сводку шагов, сверку перед оплатой и «спасибо»:
   что покупается, видно на каждом шаге, а не только на последнем (разбор
   24.09.2026, O2); миниатюра — тот же снимок, что в строке корзины. */
export function OrderItems({ items }: { items: ItemView[] }) {
  return (
    <ul className={s.items}>
      {items.map((i) => (
        <li key={i.id} className={s.item}>
          <div className={`${p.frame} ${s.shot}`}><img src={i.image.src} alt="" width={i.image.width} height={i.image.height} loading="lazy" decoding="async" /></div>
          <div className={s.itemWhat}>
            <p className={s.itemName}>{i.name}</p>
            <p className={p.note}>{i.facts}</p>
          </div>
          <p className={s.itemSum}>{i.total}</p>
        </li>
      ))}
    </ul>
  )
}
