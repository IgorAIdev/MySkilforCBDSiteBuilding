import p from '@/styles/primitives.module.css'
import s from './Cart.module.css'
import type { TotalsView } from '@/lib/cart-view.ts'

/* Итоги — одни на корзину, оформление и «спасибо». Итог — самое крупное
   число, но не заголовок (скилл shop, И69); строка про НДС — справка при
   нём, ролью сноски. */
export function OrderTotals({ totals }: { totals: TotalsView }) {
  return (
    <div className={s.tally}>
      <dl className={s.totals}>
        {totals.rows.map((r) => <div key={r.label} className={s.row}><dt>{r.label}</dt><dd>{r.value}</dd></div>)}
        <div className={`${s.row} ${s.grand}`}><dt>{totals.total.label}</dt><dd>{totals.total.value}</dd></div>
      </dl>
      <p className={p.note}>{totals.note}</p>
    </div>
  )
}
