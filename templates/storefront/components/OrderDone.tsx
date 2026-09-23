import p from '@/styles/primitives.module.css'
import go from '@/styles/go.module.css'
import s from './Checkout.module.css'
import c from './Cart.module.css'
import type { DonePageView } from '@/lib/checkout-view.ts'
import { OrderReview } from './OrderReview.tsx'
import { OrderTotals } from './OrderTotals.tsx'
import { Icon } from './Icon.tsx'

/* «Спасибо»: номер заказа крупно, что заказано, куда и как платится.
   Письма образец не шлёт — и не обещает его (план 4, сервер Vendure).
   Выход «продолжить покупки» — в столбике итога, как «назад» на шагах
   (CheckoutFrame): отдельной строкой под раскладкой он вставал вплотную к
   итогу, без воздуха (check:craft, семья collision, на полной странице). */
export function OrderDone({ view }: { view: DonePageView }) {
  return (
    <main id="main" className={`${p.wrap} ${p.section}`} data-air="head">
      <div className={p.pagehead}>
        <h1>{view.title}</h1>
        <p className={s.code}>{view.code}</p>
        <p>{view.keep}</p>
      </div>
      <div className={p.sidebar}>
        <OrderReview title={view.review} recaps={view.recaps} itemsTitle={view.itemsTitle} items={view.items} />
        <aside className={p.aside}>
          <div className={`${p.stack} ${c.summary}`}>
            <OrderTotals totals={view.totals} />
            <a className={go.go} href={view.more.href}>{view.more.label}<Icon id="arrow-right" /></a>
          </div>
        </aside>
      </div>
    </main>
  )
}
