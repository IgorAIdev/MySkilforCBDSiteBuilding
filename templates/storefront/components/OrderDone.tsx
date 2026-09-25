import p from '@/styles/primitives.module.css'
import go from '@/styles/go.module.css'
import s from './Checkout.module.css'
import c from './Cart.module.css'
import type { DonePageView } from '@/lib/checkout-view.ts'
import { OrderReview, RecapLines } from './OrderReview.tsx'
import { OrderTotals } from './OrderTotals.tsx'
import { Icon } from './Icon.tsx'

/* «Спасибо» — конец пути, и он должен читаться концом (разбор 24.09.2026,
   O8): знак успеха краской события (`--ok`), заголовок, номер заказа
   крупно — своим блоком, а не абзацем шапки, чей кегль лида бил класс
   номера. Дальше — «что будет» из способов ЭТОГО заказа (как приедет, как
   платится), потом детали: кому, куда, что. Письма образец не шлёт — и не
   обещает его (план 4, сервер Vendure). Выход «продолжить покупки» — в
   листе итога. */
export function OrderDone({ view }: { view: DonePageView }) {
  return (
    <main id="main" className={`${p.wrap} ${p.section}`} data-air="head">
      <div className={s.doneHead}>
        <span className={s.ok}><Icon id="circle-check" /></span>
        <h1>{view.title}</h1>
        <div className={s.code}><span className={p.note}>{view.code.label}</span><strong translate="no">{view.code.value}</strong></div>
        <p className={p.note}>{view.keep}</p>
      </div>
      <div className={`${p.sidebar} ${s.frame}`}>
        <div className={`${s.done} ${s.measure}`}>
          <section className={s.review} aria-labelledby="next-title">
            <h2 id="next-title">{view.next.title}</h2>
            <ol className={s.next}>
              {view.next.steps.map((st, n) => (
                <li key={st.title} className={s.nextStep}>
                  <span className={s.stepNo} aria-hidden="true">{n + 1}</span>
                  <div className={s.recap}>
                    <div className={s.recapHead}><h3 className={s.recapTitle}>{st.title}</h3></div>
                    <RecapLines lines={st.lines} />
                  </div>
                </li>
              ))}
            </ol>
          </section>
          <OrderReview title={view.review} recaps={view.recaps} itemsTitle={view.itemsTitle} items={view.items} />
        </div>
        <aside className={p.aside}>
          <div className={`${p.stack} ${p.pinned} ${c.summary}`}>
            <OrderTotals totals={view.totals} />
            <a className={go.go} href={view.more.href}>{view.more.label}<Icon id="arrow-right" /></a>
          </div>
        </aside>
      </div>
    </main>
  )
}
