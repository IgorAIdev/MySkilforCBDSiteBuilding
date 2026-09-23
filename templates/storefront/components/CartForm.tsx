'use client'
import { useState, useSyncExternalStore, type FormEvent, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import f from '@/styles/form.module.css'
import s from './Cart.module.css'
import { cartLane, isTimeout } from '@/lib/cart-lane.ts'
import type { Outcome } from '@/lib/cart-ops.ts'

type Said = Pick<Outcome, 'kind' | 'message'>
type Props = {
  lang: string; className?: string; refresh?: boolean
  submit: (form: FormData) => Promise<void>
  call: (form: FormData) => Promise<Outcome>
  initial: Said | null; timeout: string; failed: string
  after?: ReactNode; children: ReactNode
}
const idle = () => false

/** Форма записи в корзину. Без скрипта — обычная отправка: сервер пишет и
 *  переводит на корзину с исходом в адресе. Со скриптом — одна полоса на
 *  корзину вкладки: пока запись идёт, вторая отклоняется (поля выключены);
 *  нет ответа 15 секунд — исход неизвестен, корзина перечитывается, запись
 *  сама не повторяется (references/commerce-patterns.md). */
export function CartForm({ lang, className, refresh = true, submit, call, initial, timeout, failed, after, children }: Props) {
  const router = useRouter()
  const pending = useSyncExternalStore(cartLane.subscribe, () => cartLane.pending, idle)
  const [said, setSaid] = useState<Said | null>(initial)
  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (cartLane.pending) return
    const form = new FormData(e.currentTarget, (e.nativeEvent as SubmitEvent).submitter)
    /* Удачная запись перерисовывает страницу сама — её ответ несёт страницу
       после `sessionChanged()`. Перечитывать надо только после ошибки или
       таймаута: исход не известен, корзина могла разойтись с экраном. */
    let unsure = false
    try {
      const out = await cartLane.run(() => call(form))
      setSaid(out)
      unsure = out.kind === 'error'
      if (out.count !== null) window.dispatchEvent(new CustomEvent('cart:count', { detail: out.count }))
    } catch (error) {
      setSaid({ kind: 'error', message: isTimeout(error) ? timeout : failed })
      unsure = true
    }
    if (refresh && unsure) router.refresh()
  }
  return (
    <form className={className} action={submit} onSubmit={onSubmit} aria-busy={pending}>
      <input type="hidden" name="lang" value={lang} />
      <fieldset className={s.bare} disabled={pending}>{children}</fieldset>
      <p className={f.say} data-state={said?.kind === 'error' ? 'error' : undefined} role="status">{said?.message}</p>
      {said && said.kind !== 'error' ? after : null}
    </form>
  )
}
