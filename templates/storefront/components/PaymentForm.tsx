'use client'
import { useActionState, type ReactNode } from 'react'
import p from '@/styles/primitives.module.css'
import b from '@/styles/btn.module.css'
import f from '@/styles/form.module.css'
import s from './Checkout.module.css'
import c from './Cart.module.css'
import type { PaymentPageView } from '@/lib/checkout-view.ts'
import type { FormState } from '@/lib/checkout-form.ts'

type Action = (prev: FormState, form: FormData) => Promise<FormState>

/* Последний шаг. Недопустимый способ — выключен с причиной, а не спрятан;
   кнопка называет обязанность платить (И262).

   Форма — сам ряд (`sidebar`), как корзина: способы оплаты слева, сверка,
   итог, условия и кнопка заказа — колонкой рядом, тем же листом, что итог
   корзины и шагов (`.summary`). Колонка одна и та же на обеих ширинах: на
   телефоне она переносится под способы, и сумма стоит прямо над кнопкой,
   которой её подтверждают. Одна форма — выбор способа и кнопка уходят одной
   отправкой и без скрипта.

   Колонка не приклеена (`pinned`): сверка с итогом выше окна ноутбука, а
   приклеенное выше окна свой низ — кнопку заказа — не показывает никогда
   (правило 9). Она и так длиннее соседки — ехать ей не вдоль чего.

   Итог, который покупатель видит над кнопкой, форма уносит с заказом
   (`total`, `currency`): другой у корзины — заказ не ставится (И262).
   Скрытые поля — в конце формы: первыми в стопке они дали бы пустой зазор. */
export function PaymentForm({ view, action, permalink, children }: { view: PaymentPageView; action: Action; permalink: string; children: ReactNode }) {
  const [state, formAction, pending] = useActionState(action, null, permalink)
  return (
    <form className={p.sidebar} action={formAction}>
      <div className={p.stack}>
        <h2 id="payment-title" className={s.title}>{view.title}</h2>
        {state?.message ? <p className={f.say} data-state="error" role="alert">{state.message}</p> : null}
        <fieldset className={`${s.options} ${s.plain}`} disabled={pending} aria-labelledby="payment-title">
          {view.methods.map((m) => (
            <label key={m.code} className={s.option}>
              <input type="radio" name="payment" value={m.code} defaultChecked={m.checked} disabled={m.disabled} required />
              <span className={s.optionBody}>
                <span className={s.optionName}>{m.name}</span>
                <span className={p.muted}>{m.description}</span>
                {m.reason ? <span className={s.reason}>{m.reason}</span> : null}
              </span>
            </label>
          ))}
        </fieldset>
      </div>
      <aside className={p.aside}>
        <div className={`${p.stack} ${c.summary}`}>
          {children}
          <p className={s.terms}>{view.terms.note} <a href={view.terms.link.href}>{view.terms.link.label}</a></p>
          <button className={b.btn} data-voice="loud" data-wide type="submit" disabled={pending}>{view.submit}</button>
        </div>
      </aside>
      <input type="hidden" name="total" value={view.expected.minor} />
      <input type="hidden" name="currency" value={view.expected.currency} />
    </form>
  )
}
