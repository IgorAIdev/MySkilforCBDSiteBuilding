'use client'
import { useActionState } from 'react'
import p from '@/styles/primitives.module.css'
import b from '@/styles/btn.module.css'
import f from '@/styles/form.module.css'
import s from './Checkout.module.css'
import type { DeliveryPageView } from '@/lib/checkout-view.ts'
import type { FormState } from '@/lib/checkout-form.ts'

type Action = (prev: FormState, form: FormData) => Promise<FormState>

/* Выбор способа подтверждает кнопка, а не само изменение (И265): стрелки в
   группе радиокнопок меняют выбор, и отправка на изменение уводила
   покупателя с клавиатурой и чтением с экрана на следующий шаг, роняя фокус
   (WCAG 3.2.2, «On Input»). Кнопка тихая — громкая у форм подробностей ниже. */
export function MethodForm({ view, action, permalink }: { view: DeliveryPageView; action: Action; permalink: string }) {
  const [state, formAction, pending] = useActionState(action, null, permalink)
  return (
    <form className={p.stack} action={formAction}>
      <h2 id="delivery-title" className={s.title}>{view.title}</h2>
      {state?.message ? <p className={f.say} data-state="error" role="alert">{state.message}</p> : null}
      <fieldset className={`${s.options} ${s.plain}`} disabled={pending} aria-labelledby="delivery-title">
        {view.methods.map((m) => (
          <label key={m.id} className={s.option}>
            <input type="radio" name="method" value={m.id} defaultChecked={m.checked} required />
            <span className={s.optionBody}>
              <span className={s.optionHead}><span className={s.optionName}>{m.name}</span><span className={s.price}>{m.price}</span></span>
              <span className={p.muted}>{m.meta}</span>
              <span className={p.muted}>{m.description}</span>
            </span>
          </label>
        ))}
      </fieldset>
      <button className={b.btn} type="submit" disabled={pending}>{view.choose}</button>
    </form>
  )
}
