import p from '@/styles/primitives.module.css'
import s from './ProductView.module.css'
import type { LabView } from '@/lib/product-view.ts'

/* Протокол партии — на карте товара (заголовок второго уровня) и в блоке
   «лаборатория» главной (третьего: там он внутри своего раздела). Номер
   партии — одним куском: «Lot RO-2409-05» не рвётся на дефисе. */
export function LabReport({ lab, level = 2 }: { lab: LabView; level?: 2 | 3 }) {
  const H = level === 2 ? 'h2' : 'h3'
  return (
    <section className={`${p.stack} ${s.lab}`} aria-labelledby="lab-title">
      <H id="lab-title" className={s.labTitle}>{lab.title} · <span className={s.batch}>{lab.batch}</span></H>
      <dl className={s.facts}>
        {lab.rows.map(([k, v]) => <div key={k} className={s.fact}><dt>{k}</dt><dd>{v}</dd></div>)}
      </dl>
    </section>
  )
}
