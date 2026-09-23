import p from '@/styles/primitives.module.css'
import s from './ProductView.module.css'
import type { ProductPageView } from '@/lib/product-view.ts'
import { Breadcrumbs } from './Breadcrumbs.tsx'
import { ProductCard } from './ProductCard.tsx'
import { VariantPicker } from './VariantPicker.tsx'
import { LabReport } from './LabReport.tsx'

export function ProductView({ view }: { view: ProductPageView }) {
  return (
    <>
      <Breadcrumbs trail={view.crumbs} label={view.crumbLabel} />
      <section className={`${p.switcher} ${s.pdp}`}>
        <div className={`${p.frame} ${s.gallery}`}>
          <img src={view.image.src} alt={view.image.alt} width={view.image.width} height={view.image.height} fetchPriority="high" />
        </div>
        <div className={`${p.stack} ${s.offer}`}>
          {view.eyebrow ? <p className={p.eyebrow}>{view.eyebrow}</p> : null}
          <h1 className={s.name}>{view.name}</h1>
          <p className={s.price}>{view.price}</p>
          {view.stock ? <p className={p.muted}>{view.stock}</p> : null}
          <VariantPicker groups={view.groups} />
          {view.message ? <p className={s.message} role="status">{view.message}</p> : null}
          <div className={p.prose}><p>{view.description}</p></div>
          {view.lab ? <LabReport lab={view.lab} /> : null}
        </div>
      </section>
      {view.related.length ? (
        <section className={p.section}>
          <div className={p.sectionHead}><h2>{view.relatedTitle}</h2></div>
          <ul className={`${p.grid} ${s.related}`}>{view.related.map((c) => <li key={c.id}><ProductCard card={c} /></li>)}</ul>
        </section>
      ) : null}
    </>
  )
}
