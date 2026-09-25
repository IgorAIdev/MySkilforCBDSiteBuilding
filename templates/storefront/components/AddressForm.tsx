'use client'
import { useActionState } from 'react'
import b from '@/styles/btn.module.css'
import f from '@/styles/form.module.css'
import s from './Checkout.module.css'
import type { AddressDetails } from '@/lib/checkout-view.ts'
import type { FormState } from '@/lib/checkout-form.ts'
import { Fields } from './Field.tsx'

type Action = (prev: FormState, form: FormData) => Promise<FormState>

/* Адрес — подробности выбранного способа (`data-details`): выбран другой
   способ, но ещё не подтверждён — адрес прячется, чтобы на экране была одна
   громкая кнопка (Checkout.module.css, «Выбор способа»). */
export function AddressForm({ details, action, permalink }: { details: AddressDetails; action: Action; permalink: string }) {
  const [state, formAction, pending] = useActionState(action, null, permalink)
  return (
    <form className={s.form} action={formAction} noValidate aria-labelledby="address-title" data-details>
      <h2 id="address-title">{details.title}</h2>
      {state?.message ? <p className={f.say} data-state="error" role="alert">{state.message}</p> : null}
      <fieldset className={`${f.rows} ${s.plain}`} disabled={pending}>
        <Fields rows={details.rows} state={state} />
        <p className={s.country}><span className={f.label}>{details.country.label}</span> {details.country.value}</p>
      </fieldset>
      <button className={b.btn} data-voice="loud" data-size="lg" type="submit" disabled={pending}>{details.submit}</button>
      <input type="hidden" name="method" value={details.method} />
    </form>
  )
}
