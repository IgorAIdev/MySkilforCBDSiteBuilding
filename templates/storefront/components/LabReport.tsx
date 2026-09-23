import p from '@/styles/primitives.module.css'
import s from './ProductView.module.css'
import type { LabView } from '@/lib/product-view.ts'

export function LabReport({ lab }: { lab: LabView }) {
  return (
    <section className={`${p.stack} ${s.lab}`} aria-labelledby="lab-title">
      <h2 id="lab-title" className={s.labTitle}>{lab.title}</h2>
      <dl className={s.facts}>
        {lab.rows.map(([k, v]) => <div key={k} className={s.fact}><dt>{k}</dt><dd>{v}</dd></div>)}
      </dl>
    </section>
  )
}
