import go from '@/styles/go.module.css'
import p from '@/styles/primitives.module.css'
import s from './LabReport.module.css'
import type { LabView } from '@/lib/product-view.ts'
import { Icon } from './Icon.tsx'

/* Протокол партии — ОДИН на карте товара (заголовок второго уровня) и в
   листе лаборатории главной (третьего: там он внутри своего раздела). Он
   плоский и листа своего не носит: строки через волосок, под ними — сам
   документ, если он есть (`lab.open`). Лежит на том, что его держит, —
   колонке покупки или листе лаборатории; лист в листе был бы вложенной
   карточкой (И281). Номер партии — одним куском: «Lot RO-2409-05» не
   рвётся на дефисе.

   `code` — номер партии крупно, отдельной строкой под заголовком: так его
   ставит главная «протокол сразу» (lib/homes.ts, `proof`), где номер
   партии — самый крупный знак страницы; заголовок тогда — имя документа. */
export function LabReport({ lab, level = 2, code = false }: { lab: LabView; level?: 2 | 3; code?: boolean }) {
  const H = level === 2 ? 'h2' : 'h3'
  return (
    <section className={`${p.stack} ${s.report}`} aria-labelledby="lab-title">
      {code
        ? <H id="lab-title" className={s.title}>{lab.title}</H>
        : <H id="lab-title" className={s.title}>{lab.title} · <span className={s.batch}>{lab.batch}</span></H>}
      {code ? <p className={s.code}>{lab.code}</p> : null /* look-home:proof */}
      <dl className={s.facts}>
        {lab.rows.map(([k, v]) => <div key={k} className={s.fact}><dt>{k}</dt><dd>{v}</dd></div>)}
      </dl>
      {lab.open ? <a className={go.go} href={lab.open.href}>{lab.open.label}<Icon id="arrow-right" /></a> : null}
    </section>
  )
}
