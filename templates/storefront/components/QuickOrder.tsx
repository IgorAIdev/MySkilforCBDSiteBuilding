'use client'
import { useEffect, useRef, useState, type MouseEvent } from 'react'
import b from '@/styles/btn.module.css'
import f from '@/styles/form.module.css'
import s from './QuickOrder.module.css'
import type { QuickView } from '@/lib/product-view.ts'
import { chatHref, type Messenger } from '@/lib/contacts.ts'
import { Icon } from './Icon.tsx'

/* Знак строки — из листа: марки силуэтами (brands/), Telegram — самолётик
   нашим пером, без круга (решение заказчика на cbdin.bg). */
const MARK: Record<Messenger, string> = { viber: 'viber', telegram: 'send', whatsapp: 'whatsapp', instagram: 'instagram' }

/* Быстрый заказ — одно сообщение в мессенджер вместо оформления (слово
   заказчика 25.09.2026: «быстрый заказ вызывает всплывающее меню с
   мессенджерами», образец — окно cbdin.bg; И442).

   Окно — `<dialog>` с `showModal()` (правило 8): Escape, возврат фокуса,
   затемнение и верхний слой приходят от браузера. Кнопка стоит в форме
   покупки рядом с «в корзину» и берёт количество из её счётчика в миг
   открытия — сообщение говорит, сколько штук.

   Телефон уезжает тем же путём, что заказ: номер ложится в текст сообщения,
   «Call me back» открывает первый мессенджер с готовой ссылкой. Сервера
   под звонок нет, и поле, молча теряющее номер, было бы человеком,
   уверенным, что заказал (прежний проект, lib/contacts.ts `orderText`).

   Строка без адреса стоит надписью, нажатие прячется (И111 прежнего
   проекта): заказчик видит, что канал есть и ждёт номера. */
export function QuickOrder({ view }: { view: QuickView }) {
  const ref = useRef<HTMLDialogElement>(null)
  const [qty, setQty] = useState(1)
  const [phone, setPhone] = useState('')

  /* Нажатие мимо окна закрывает его: цель — сам `<dialog>`, а не его
     содержимое. Клавиатурный путь у окна свой — Escape. */
  useEffect(() => {
    const d = ref.current
    if (!d) return
    const miss = (e: globalThis.MouseEvent) => { if (e.target === d) d.close() }
    d.addEventListener('click', miss)
    return () => d.removeEventListener('click', miss)
  }, [])

  function open(e: MouseEvent<HTMLButtonElement>) {
    const field = e.currentTarget.form?.elements.namedItem('quantity')
    const n = field instanceof HTMLInputElement ? Number.parseInt(field.value, 10) : 1
    setQty(Number.isFinite(n) && n > 0 ? n : 1)
    ref.current?.showModal()
  }

  const what = `${view.what} × ${qty} ${view.qty}`
  const text = `${view.greet} ${what}${phone.trim() ? `. ${view.myPhone}: ${phone.trim()}` : ''}`
  const rows = view.rows.map((r) => ({ ...r, href: chatHref(r, text) }))
  const call = rows.find((r) => r.href)?.href ?? null

  return (
    <>
      <button className={`${b.btn} ${s.trigger}`} data-size="lg" type="button" aria-haspopup="dialog" onClick={open}>{view.open}</button>
      <dialog ref={ref} className={s.dialog} aria-labelledby="quick-title">
        <div className={s.intro}>
          <div className={s.head}>
            <h2 className={s.title} id="quick-title">{view.title}</h2>
            <button className={`${b.btn} ${s.close}`} type="button" aria-label={view.close} onClick={() => ref.current?.close()}><Icon id="x" /></button>
          </div>
          <p className={s.lead}>{view.lead}</p>
          {/* Что заказывают — видно в окне, а не только в набранном сообщении:
              у Viber и Instagram текста в ссылке нет, и человеку нужно, что
              написать. */}
          <p className={s.what}>{what}</p>
        </div>
        <ul className={s.rows}>
          {rows.map((r) => (
            <li key={r.key}>
              {r.href
                ? <a className={`${b.btn} ${s.row}`} data-size="lg" href={r.href} target="_blank" rel="noopener noreferrer"><Icon id={MARK[r.key]} />{r.label}</a>
                : <span className={`${b.btn} ${s.row}`} data-size="lg" aria-disabled="true"><Icon id={MARK[r.key]} />{r.label}</span>}
            </li>
          ))}
        </ul>
        <div className={s.phone}>
          <div className={f.field}>
            <label className={f.label} htmlFor="quick-phone">{view.phone.label}</label>
            <input className={f.box} id="quick-phone" type="tel" inputMode="tel" autoComplete="tel" placeholder={view.phone.hint} value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          {call
            ? <a className={b.btn} data-voice="loud" href={call} target="_blank" rel="noopener noreferrer"><Icon id="arrow-right" />{view.call}</a>
            : <span className={b.btn} data-voice="loud" aria-disabled="true"><Icon id="arrow-right" />{view.call}</span>}
        </div>
      </dialog>
    </>
  )
}
