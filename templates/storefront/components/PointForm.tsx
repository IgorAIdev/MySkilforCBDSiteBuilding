'use client'
import { useActionState } from 'react'
import p from '@/styles/primitives.module.css'
import b from '@/styles/btn.module.css'
import f from '@/styles/form.module.css'
import s from './Checkout.module.css'
import type { PickupDetails } from '@/lib/checkout-view.ts'
import type { FormState } from '@/lib/checkout-form.ts'

type Action = (prev: FormState, form: FormData) => Promise<FormState>

export function PointForm({ details, action, permalink }: { details: PickupDetails; action: Action; permalink: string }) {
  const [state, formAction, pending] = useActionState(action, null, permalink)
  return (
    <form className={p.stack} action={formAction}>
      {state?.message ? <p className={f.say} data-state="error" role="alert">{state.message}</p> : null}
      <fieldset className={`${s.options} ${s.plain}`} disabled={pending} aria-labelledby="points-title">
        {details.points.map((pt) => (
          <label key={pt.id} className={s.option}>
            <input type="radio" name="point" value={pt.id} defaultChecked={pt.checked} required />
            <span className={s.optionBody}>
              <span className={s.optionName}>{pt.name}</span>
              <span className={p.muted}>{pt.meta}</span>
              {pt.hours ? <span className={p.muted}>{pt.hours}</span> : null}
            </span>
          </label>
        ))}
      </fieldset>
      <button className={b.btn} data-voice="loud" type="submit" disabled={pending}>{details.submit}</button>
      <input type="hidden" name="method" value={details.method} />
    </form>
  )
}
