'use client'
import { useActionState, type ReactNode } from 'react'
import p from '@/styles/primitives.module.css'
import b from '@/styles/btn.module.css'
import f from '@/styles/form.module.css'
import s from './Checkout.module.css'
import c from './Cart.module.css'
import type { PaymentPageView } from '@/lib/checkout-view.ts'
import type { FormState } from '@/lib/checkout-form.ts'
import { OrderTotals } from './OrderTotals.tsx'
import { Pledges } from './Pledges.tsx'

type Action = (prev: FormState, form: FormData) => Promise<FormState>

/* Последний шаг. Недопустимый способ — выключен с причиной, а не спрятан;
   кнопка называет обязанность платить (И262).

   Форма — сам ряд (`sidebar`), как корзина: слева способы оплаты и сверка
   (кому, куда, что — со снимками), справа листом — итог, условия и кнопка
   заказа. Лист короткий и едет с прокруткой (`pinned`): кнопка заказа стоит
   в первом экране ноутбука и не уходит из него (разбор 24.09.2026, O3:
   прежде сверка жила в колонке кнопки, и кнопка стояла на 1078-м пикселе
   при окне в 900). На телефоне колонка встаёт под сверку: сумма — прямо над
   кнопкой, которой её подтверждают. Одна форма — выбор способа и кнопка
   уходят одной отправкой и без скрипта.

   Итог, который покупатель видит над кнопкой, форма уносит с заказом
   (`total`, `currency`): другой у корзины — заказ не ставится (И262).
   Скрытые поля — в конце формы: первыми в стопке они дали бы пустой зазор. */
export function PaymentForm({ view, action, permalink, children }: { view: PaymentPageView; action: Action; permalink: string; children: ReactNode }) {
  const [state, formAction, pending] = useActionState(action, null, permalink)
  return (
    <form className={`${p.sidebar} ${s.frame}`} action={formAction} aria-labelledby="step-title">
      <div className={`${p.stack} ${s.step} ${s.measure}`}>
        {state?.message ? <p className={f.say} data-state="error" role="alert">{state.message}</p> : null}
        <fieldset className={`${s.options} ${s.plain}`} disabled={pending}>
          <legend className={p.said}>{view.title}</legend>
          {view.methods.map((m) => (
            <label key={m.code} className={s.option}>
              <input type="radio" name="payment" value={m.code} defaultChecked={m.checked} disabled={m.disabled} required />
              <span className={s.optionBody}>
                <span className={s.optionName}>{m.name}</span>
                <span className={s.optionText}>{m.description}</span>
                {m.reason ? <span className={s.reason}>{m.reason}</span> : null}
              </span>
            </label>
          ))}
        </fieldset>
        {children}
      </div>
      <aside className={p.aside}>
        <div className={`${p.stack} ${p.pinned} ${c.summary}`}>
          <OrderTotals totals={view.totals} />
          <div className={c.decide}>
            <p className={s.terms}>{view.terms.note} <a href={view.terms.link.href}>{view.terms.link.label}</a></p>
            <button className={b.btn} data-voice="loud" data-size="lg" data-wide type="submit" disabled={pending}>{view.submit}</button>
            <Pledges pledges={view.pledges} />
          </div>
        </div>
      </aside>
      <input type="hidden" name="total" value={view.expected.minor} />
      <input type="hidden" name="currency" value={view.expected.currency} />
    </form>
  )
}
