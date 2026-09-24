import s from './Checkout.module.css'
import type { ItemView, Recap } from '@/lib/checkout-view.ts'
import { OrderItems } from './OrderItems.tsx'

/* Строки сверки — одной записью, как адрес на конверте: строка под
   строкой, без воздуха между ними. Это строки данных, а не абзац: блок, а
   не `p`, перевод строки держит `pre-line` (строки бывают одинаковыми —
   «București» городом и уездом, ключом им служить нечем). */
export function RecapLines({ lines }: { lines: string[] }) {
  return <div className={s.recapBody}>{lines.join('\n')}</div>
}

/* Сверка заказа: кому, куда, что. «Изменить» ведёт на свой шаг и
   называет его вслух (`aria-label`): три одинаковые ссылки «Modifică»
   для чтения вслух неразличимы. Группы отделены воздухом группы, внутри
   группы — заголовок и его запись вплотную (разбор 24.09.2026, O8;
   check:design, flatRhythm); товары — со снимками, как в сводке шагов. */
export function OrderReview({ title, recaps, itemsTitle, items }: { title: string; recaps: Recap[]; itemsTitle: string; items: ItemView[] }) {
  return (
    <section className={s.review} aria-labelledby="review-title">
      <h2 id="review-title">{title}</h2>
      {recaps.map((r) => (
        <div key={r.title} className={s.recap}>
          <div className={s.recapHead}>
            <h3 className={s.recapTitle}>{r.title}</h3>
            {r.change ? <a href={r.change.href} aria-label={r.change.aria}>{r.change.label}</a> : null}
          </div>
          <RecapLines lines={r.lines} />
        </div>
      ))}
      <div className={s.recap}>
        <div className={s.recapHead}><h3 className={s.recapTitle}>{itemsTitle}</h3></div>
        <OrderItems items={items} />
      </div>
    </section>
  )
}
