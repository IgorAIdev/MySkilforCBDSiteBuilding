'use client'
import { useSyncExternalStore } from 'react'
import b from '@/styles/btn.module.css'
import f from '@/styles/form.module.css'
import s from './Look.module.css'
import { applyLook, lookLine, type FaceId, type LookData } from '@/lib/look.ts'
import { Icon } from './Icon.tsx'

/* Выбор живёт атрибутами на `<html>` — их ставит загрузочный скрипт до
   отрисовки и склад выбора (lib/look.ts), и на них же подписана панель:
   второго хранилища выбора нет. */
const root = () => document.documentElement
const watch = (on: () => void) => {
  const mo = new MutationObserver(on)
  mo.observe(root(), { attributes: true, attributeFilter: ['data-face', 'data-button'] })
  return () => mo.disconnect()
}
const now = () => `${root().dataset.face ?? ''}|${root().dataset.button ?? ''}`
const before = () => '|'

/* Панель «Вид» — инструмент мастерской на самой витрине: заказчик выбирает
   шрифт и кнопки на настоящих страницах (CLAUDE.md, «Выбор показывается
   глазами»). Немодальная (`popover="manual"`): ни затемнения, ни захвата
   прокрутки, страница под ней нажимается; закрывает её крестик или та же
   кнопка «Вид». Сама панель не наследует выбранного: свой системный шрифт и
   стиль кнопок по умолчанию (Look.module.css, `data-button` на обёртке). */
export function Look({ data }: { data: LookData }) {
  const [faceNow, buttonNow] = useSyncExternalStore(watch, now, before).split('|')
  const first = data.buttons.find((x) => x.on)?.name ?? ''
  const face = (data.faces.find((x) => x.id === faceNow)?.id ?? data.faces[0].id) as FaceId
  const button = data.buttons.some((x) => x.on && x.name === buttonNow) ? buttonNow : first
  return (
    <div className={s.look} data-button={first}>
      <button className={`${b.btn} ${s.open}`} type="button" popoverTarget="look"><Icon id="sliders-horizontal" />Вид</button>
      <form id="look" popover="manual" className={s.panel} aria-label="Вид витрины">
        <div className={s.head}>
          <p className={s.title}>Вид витрины</p>
          <button className={b.btn} data-size="sm" type="button" popoverTarget="look" popoverTargetAction="hide" aria-label="Закрыть"><Icon id="x" /></button>
        </div>
        <p className={s.now} aria-live="polite">{lookLine(face, button, data.faces)}</p>
        <fieldset className={s.set}>
          <legend className={s.legend}>Шрифт</legend>
          {data.faces.map((x) => (
            <label key={x.id} className={f.tick}>
              <input type="radio" name="face" value={x.id} checked={face === x.id} onChange={() => applyLook({ face: x.id, button })} />
              <span className={s.face} data-face={x.id}>
                <span className={s.faceName}>{x.name}</span>
                <span className={s.faceSample}>Ulei CBD 10 % · 129,90 lei · ș ț ă î â</span>
              </span>
            </label>
          ))}
        </fieldset>
        <fieldset className={s.set}>
          <legend className={s.legend}>Кнопки</legend>
          {data.buttons.map((x) => x.on ? (
            <label key={x.name} className={`${f.tick} ${s.row}`}>
              <input type="radio" name="button" value={x.name} checked={button === x.name} onChange={() => applyLook({ face, button: x.name })} />
              <span>{x.name}</span>
              <span className={s.pair} data-button={x.name} aria-hidden="true">
                <span className={b.btn} data-voice="loud" data-size="sm">Adaugă</span>
                <span className={b.btn} data-size="sm">Detalii</span>
              </span>
            </label>
          ) : (
            <div key={x.name}>
              <label className={f.tick}><input type="radio" name="button" value={x.name} disabled />{x.name}</label>
              <p className={s.why}>{x.why}</p>
            </div>
          ))}
        </fieldset>
      </form>
    </div>
  )
}
