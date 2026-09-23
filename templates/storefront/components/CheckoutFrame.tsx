import type { ReactNode } from 'react'
import p from '@/styles/primitives.module.css'
import go from '@/styles/go.module.css'
import s from './Checkout.module.css'
import c from './Cart.module.css'
import type { FrameText, StepsView } from '@/lib/checkout-view.ts'
import type { TotalsView } from '@/lib/cart-view.ts'
import type { Empty } from '@/lib/catalog-view.ts'
import { OrderTotals } from './OrderTotals.tsx'
import { CheckoutSteps } from './CheckoutSteps.tsx'
import { StateScreen } from './StateScreen.tsx'
import { Icon } from './Icon.tsx'

/* Оформление: шаги сверху, шаг слева, итог — рядом, тем же столбиком, что
   в корзине. На шаге оплаты второй колонки рамка не даёт (`totals={null}`):
   форма оплаты сама ряд — способы слева, сверка, итог и кнопка заказа
   колонкой рядом (PaymentForm). Колонка итога рамки ушла бы на телефоне под
   форму, и сумма оказалась бы ниже кнопки, которой её подтверждают. */
export function CheckoutFrame({ text, steps, totals, children }: { text: FrameText; steps: StepsView; totals: TotalsView | null; children: ReactNode }) {
  const step = <div className={`${p.stack} ${s.step}`}>{children}</div>
  return (
    <main id="main" className={`${p.wrap} ${p.section}`}>
      <div className={p.pagehead}><h1>{text.title}</h1></div>
      <CheckoutSteps steps={steps} />
      {totals ? (
        <div className={p.sidebar}>
          {step}
          <aside className={p.aside}>
            <div className={`${p.stack} ${p.pinned} ${c.summary}`}>
              <h2 className={c.summaryTitle}>{text.summary}</h2>
              <OrderTotals totals={totals} />
              <a className={go.go} href={text.back.href}><Icon id="arrow-left" />{text.back.label}</a>
            </div>
          </aside>
        </div>
      ) : step}
    </main>
  )
}

/** Шаг без корзины или «спасибо» без заказа — экран «почему и куда дальше»
 *  с кодом 200: адрес из дерева открывается всегда (check:open). */
export function CheckoutEmpty({ empty }: { empty: Empty }) {
  return (
    <main id="main" className={p.wrap}>
      <StateScreen level={1} kind="empty" title={empty.title} step={empty.step} href={empty.href} />
    </main>
  )
}
