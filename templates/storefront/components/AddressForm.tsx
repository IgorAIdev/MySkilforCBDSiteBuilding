'use client'
import { useActionState } from 'react'
import p from '@/styles/primitives.module.css'
import b from '@/styles/btn.module.css'
import f from '@/styles/form.module.css'
import s from './Checkout.module.css'
import type { AddressDetails } from '@/lib/checkout-view.ts'
import type { FormState } from '@/lib/checkout-form.ts'
import { Field } from './Field.tsx'

type Action = (prev: FormState, form: FormData) => Promise<FormState>

export function AddressForm({ details, action, permalink }: { details: AddressDetails; action: Action; permalink: string }) {
  const [state, formAction, pending] = useActionState(action, null, permalink)
  return (
    <form className={p.stack} action={formAction} noValidate aria-labelledby="address-title">
      <h2 id="address-title" className={s.title}>{details.title}</h2>
      <input type="hidden" name="method" value={details.method} />
      {state?.message ? <p className={f.say} data-state="error" role="alert">{state.message}</p> : null}
      <fieldset className={`${f.rows} ${s.plain}`} disabled={pending}>
        {details.fields.map((fd) => <Field key={fd.name} field={fd} value={state?.values[fd.name] ?? fd.value} error={state?.errors[fd.name] ?? null} />)}
        <p className={s.country}><span className={f.label}>{details.country.label}</span> {details.country.value}</p>
      </fieldset>
      <button className={b.btn} data-voice="loud" type="submit" disabled={pending}>{details.submit}</button>
    </form>
  )
}
