'use client'
import { useActionState, type ReactNode } from 'react'
import p from '@/styles/primitives.module.css'
import b from '@/styles/btn.module.css'
import f from '@/styles/form.module.css'
import s from './Checkout.module.css'
import type { PaymentPageView } from '@/lib/checkout-view.ts'
import type { FormState } from '@/lib/checkout-form.ts'

type Action = (prev: FormState, form: FormData) => Promise<FormState>

/* Последний шаг. Недопустимый способ — выключен с причиной, а не спрятан;
   сумма стоит над кнопкой; кнопка называет обязанность платить (И262). */
export function PaymentForm({ view, action, permalink, children }: { view: PaymentPageView; action: Action; permalink: string; children: ReactNode }) {
  const [state, formAction, pending] = useActionState(action, null, permalink)
  return (
    <form className={p.stack} action={formAction}>
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
      {children}
      <p className={s.terms}>{view.terms.note} <a href={view.terms.link.href}>{view.terms.link.label}</a></p>
      <button className={b.btn} data-voice="loud" data-wide type="submit" disabled={pending}>{view.submit}</button>
    </form>
  )
}
