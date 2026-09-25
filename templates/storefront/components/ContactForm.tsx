'use client'
import { useActionState } from 'react'
import b from '@/styles/btn.module.css'
import f from '@/styles/form.module.css'
import s from './Checkout.module.css'
import type { ContactView } from '@/lib/checkout-view.ts'
import type { FormState } from '@/lib/checkout-form.ts'
import { Fields } from './Field.tsx'

type Action = (prev: FormState, form: FormData) => Promise<FormState>

/* Контакты — главная группа шага: её имя — заголовок страницы (`step-title`,
   рамка), своего заголовка у формы нет — шаг назван один раз. Кнопка
   продолжения — громкая, одна; на телефоне во всю строку, под большим
   пальцем (Checkout.module.css, `.form`). */
export function ContactForm({ view, action, permalink }: { view: ContactView; action: Action; permalink: string }) {
  const [state, formAction, pending] = useActionState(action, null, permalink)
  return (
    <form className={s.form} action={formAction} noValidate aria-labelledby="step-title">
      {state?.message ? <p className={f.say} data-state="error" role="alert">{state.message}</p> : null}
      <fieldset className={`${f.rows} ${s.plain}`} disabled={pending}>
        <Fields rows={view.rows} state={state} />
      </fieldset>
      <button className={b.btn} data-voice="loud" data-size="lg" type="submit" disabled={pending}>{view.submit}</button>
    </form>
  )
}
