import p from '@/styles/primitives.module.css'
import s from './Checkout.module.css'
import type { ItemView, Recap } from '@/lib/checkout-view.ts'

/* Сверка заказа: кому, куда, что. «Изменить» ведёт на свой шаг и
   называет его вслух (`aria-label`): три одинаковые ссылки «Modifică»
   для чтения вслух неразличимы. */
export function OrderReview({ title, recaps, itemsTitle, items }: { title: string; recaps: Recap[]; itemsTitle: string; items: ItemView[] }) {
  return (
    <section className={`${p.stack} ${s.review}`} aria-labelledby="review-title">
      <h2 id="review-title" className={s.title}>{title}</h2>
      {recaps.map((r) => (
        <div key={r.title} className={s.recap}>
          <div className={s.recapHead}>
            <h3 className={s.recapTitle}>{r.title}</h3>
            {r.change ? <a href={r.change.href} aria-label={r.change.aria}>{r.change.label}</a> : null}
          </div>
          {r.lines.map((l) => <p key={l}>{l}</p>)}
        </div>
      ))}
      <div className={s.recap}>
        <h3 className={s.recapTitle}>{itemsTitle}</h3>
        <ul className={s.items}>
          {items.map((i) => (
            <li key={i.id} className={s.item}>
              <span>{i.line}{i.detail ? <span className={p.muted}> · {i.detail}</span> : null}</span>
              <span className={s.price}>{i.total}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
