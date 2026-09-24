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
   (WCAG 3.2.2, «On Input»).

   Громкая кнопка на экране одна (разбор 24.09.2026, O5). Способа ещё нет —
   громкая «Выбрать доставку». Способ записан (`data-saved`) и он же
   отмечен — кнопка не нужна, вперёд ведут его подробности; отмечен другой —
   кнопка появляется, а подробности прежнего прячутся. Это делает CSS по
   отметке (`:has`), без скрипта; где `:has` нет — видны обе, как прежде.
   Имя группы — заголовок страницы «Livrare»; своё имя у группы — для
   чтения вслух. */
export function MethodForm({ view, action, permalink }: { view: DeliveryPageView; action: Action; permalink: string }) {
  const [state, formAction, pending] = useActionState(action, null, permalink)
  return (
    <form className={s.form} action={formAction}>
      {state?.message ? <p className={f.say} data-state="error" role="alert">{state.message}</p> : null}
      <fieldset className={`${s.options} ${s.plain}`} disabled={pending}>
        <legend className={p.said}>{view.title}</legend>
        {view.methods.map((m) => (
          <label key={m.id} className={s.option}>
            <input type="radio" name="method" value={m.id} defaultChecked={m.checked} required data-saved={m.id === view.saved ? '' : undefined} />
            <span className={s.optionBody}>
              <span className={s.optionHead}><span className={s.optionName}>{m.name}</span><span className={s.price}>{m.price}</span></span>
              <span className={p.note}>{m.meta}</span>
              <span className={s.optionText}>{m.description}</span>
            </span>
          </label>
        ))}
      </fieldset>
      <button className={b.btn} data-voice="loud" data-size="lg" type="submit" disabled={pending} data-choose>{view.choose}</button>
    </form>
  )
}
