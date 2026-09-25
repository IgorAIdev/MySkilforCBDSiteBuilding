'use client'
import { useState, type FormEvent, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import f from '@/styles/form.module.css'
import p from '@/styles/primitives.module.css'
import s from './Cart.module.css'
import { cartLane, isTimeout } from '@/lib/cart-lane.ts'
import type { Outcome } from '@/lib/cart-ops.ts'

type Said = Pick<Outcome, 'kind' | 'message'>
type Props = {
  lang: string; className?: string; refresh?: boolean; quiet?: boolean
  submit: (form: FormData) => Promise<void>
  call: (form: FormData) => Promise<Outcome>
  initial: Said | null; timeout: string; failed: string
  after?: ReactNode; children: ReactNode
}
/** Форма записи в корзину. Без скрипта — обычная отправка: сервер пишет и
 *  переводит на корзину с исходом в адресе. Со скриптом — одна полоса на
 *  корзину вкладки: пока запись идёт, вторая отклоняется; нет ответа 15
 *  секунд — исход неизвестен, корзина перечитывается, запись сама не
 *  повторяется (references/commerce-patterns.md).
 *
 *  Полоса общая, а «жду» — своё (И440). Поля выключает и `aria-busy` ставит
 *  только форма, которая пишет: полоса отклоняет вторую запись молча, у
 *  каждой формы в `onSubmit`. Выключала общая полоса — и нажатие «Add» на
 *  одной карточке гасило кнопки всех карточек полки разом (слово заказчика
 *  25.09.2026: «срабатывает нажатие этой же кнопки и в других карточках»). */
/* `quiet` — форма в тесном месте (кнопка на карточке полки): удачный исход
   читается вслух, но строки под кнопкой не занимает — его показывает сама
   кнопка по `data-said` формы («Add» → «Added»). Ошибка видна всегда: её
   нельзя сказать надписью кнопки. */
export function CartForm({ lang, className, refresh = true, quiet = false, submit, call, initial, timeout, failed, after, children }: Props) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [said, setSaid] = useState<Said | null>(initial)
  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (cartLane.pending) return
    const form = new FormData(e.currentTarget, (e.nativeEvent as SubmitEvent).submitter)
    /* Удачная запись перерисовывает страницу сама — её ответ несёт страницу
       после `sessionChanged()`. Перечитывать надо только после ошибки или
       таймаута: исход не известен, корзина могла разойтись с экраном. */
    let unsure = false
    setBusy(true)
    try {
      const out = await cartLane.run(() => call(form))
      setSaid(out)
      unsure = out.kind === 'error'
      if (out.count !== null) window.dispatchEvent(new CustomEvent('cart:count', { detail: out.count }))
      /* Положено — говорит корзина в шапке (CartLink), а не строка под
         кнопкой: у всех кнопок «в корзину» одно место ответа. */
      if (!unsure && form.get('op') === 'add') window.dispatchEvent(new CustomEvent('cart:added'))
    } catch (error) {
      setSaid({ kind: 'error', message: isTimeout(error) ? timeout : failed })
      unsure = true
    }
    setBusy(false)
    if (refresh && unsure) router.refresh()
  }
  return (
    <form className={className} action={submit} onSubmit={onSubmit} aria-busy={busy} data-said={said?.kind}>
      <input type="hidden" name="lang" value={lang} />
      <fieldset className={s.bare} disabled={busy}>{children}</fieldset>
      <p className={quiet && said?.kind !== 'error' ? `${f.say} ${p.said}` : f.say} data-state={said?.kind === 'error' ? 'error' : undefined} role="status">{said?.message}</p>
      {said && said.kind !== 'error' ? after : null}
    </form>
  )
}
