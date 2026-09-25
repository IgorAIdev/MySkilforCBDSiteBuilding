'use client'
import { useState, useSyncExternalStore, type ChangeEvent } from 'react'
import p from '@/styles/primitives.module.css'
import type { CartLineView } from '@/lib/cart-view.ts'
import { Icon } from './Icon.tsx'

/** Корзина: «−» и «+» — кнопки отправки своей формы (`name="op"`), без
 *  скрипта обычная отправка; число — то, что записано. */
type Ops = CartLineView['stepper']
/** Карта товара: число — поле формы (`name`; без выбора варианта поле без
 *  имени и не едет); «−» и «+» шагают по нему в браузере. */
type Field = { label: string; name: string | undefined; min: number; max: number; less: string; more: string }

const never = () => () => {}
const onClient = () => true
const onServer = () => false

/* Счётчик — ОДИН на сайт (CLAUDE.md, запрет 10; разбор 24.09.2026, K2):
   корзина и карта товара берут его отсюда, рисунок — пилюля `qty` из
   примитивов (вид «Pill», выбран заказчиком из четырёх), рост и поле — ручки
   места (`--qty-h`, `--qty-pad`). Цель пальца вынесена наружу (`data-hit`):
   рисунок мельче, нажатие — сорок четыре.

   Без скрипта на карте товара число вписывают в поле, а «−» и «+» стоят
   выключенными: шагать по полю нечем. Скрипт пришёл — они работают. */
function FieldStepper({ field }: { field: Field }) {
  const ready = useSyncExternalStore(never, onClient, onServer)
  const [text, setText] = useState(String(field.min))
  const n = Number(text)
  const clamp = (v: number) => String(Math.min(field.max, Math.max(field.min, v)))
  const by = (d: number) => setText(clamp((Number.isFinite(n) ? n : field.min) + d))
  return (
    <div className={p.qty} role="group" aria-label={field.label} data-hit="out">
      <button type="button" onClick={() => by(-1)} disabled={!ready || n <= field.min} aria-label={field.less}><Icon id="minus" /></button>
      <input
        type="number" name={field.name} min={field.min} max={field.max} value={text} inputMode="numeric" data-tap
        aria-label={field.label} onChange={(e: ChangeEvent<HTMLInputElement>) => setText(e.target.value)}
      />
      <button type="button" data-up onClick={() => by(1)} disabled={!ready || n >= field.max} aria-label={field.more}><Icon id="plus" /></button>
    </div>
  )
}

function OpsStepper({ ops }: { ops: Ops }) {
  return (
    <div className={p.qty} role="group" aria-label={ops.label} data-hit="out">
      <button type="submit" name="op" value={ops.less.op ?? ''} disabled={!ops.less.op} aria-label={ops.less.label}><Icon id="minus" /></button>
      <b>{ops.value}</b>
      <button type="submit" name="op" value={ops.more.op ?? ''} data-up disabled={!ops.more.op} aria-label={ops.more.label}><Icon id="plus" /></button>
    </div>
  )
}

export function QuantityStepper(props: { ops: Ops } | { field: Field }) {
  return 'ops' in props ? <OpsStepper ops={props.ops} /> : <FieldStepper field={props.field} />
}
