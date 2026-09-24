import p from '@/styles/primitives.module.css'
import s from './ProductView.module.css'
import type { ProductPageView } from '@/lib/product-view.ts'
import type { Outcome } from '@/lib/cart-ops.ts'
import { Breadcrumbs } from './Breadcrumbs.tsx'
import { ProductCard } from './ProductCard.tsx'
import { Gallery } from './Gallery.tsx'
import { VariantPicker } from './VariantPicker.tsx'
import { LabReport } from './LabReport.tsx'
import { AddToCart } from './AddToCart.tsx'

/* Карта товара. Колонка покупки — четыре группы, и воздух между группами
   крупнее воздуха внутри (И271): кто это и сколько стоит; выбор варианта;
   покупка; сведения. Порядок разметки — порядок чтения и на телефоне:
   галерея, имя и цена, выбор, покупка, сведения. */
export function ProductView({ view, lang, submit, call }: { view: ProductPageView; lang: string; submit: (form: FormData) => Promise<void>; call: (form: FormData) => Promise<Outcome> }) {
  return (
    <>
      <Breadcrumbs trail={view.crumbs} label={view.crumbLabel} />
      <section className={`${p.switcher} ${s.pdp}`}>
        {/* Галерея едет рядом с колонкой покупки, пока колонок две (`pinned`),
            и помещается в экран целиком — кадр, зазор, ряд миниатюр. */}
        <div className={`${p.pinned} ${p.bias} ${s.pin}`}>
          <Gallery view={view.gallery} />
        </div>
        <div className={`${p.stack} ${s.offer}`}>
          <div className={s.identity}>
            {view.eyebrow ? <p className={p.eyebrow}>{view.eyebrow}</p> : null}
            <h1 className={s.name}>{view.name}</h1>
            <p className={s.price}>
              <span className={s.now}>{view.price}</span>
              {view.was ? <><s className={s.was} aria-hidden="true">{view.was.text}</s><span className={p.said}>{view.was.said}</span></> : null}
              {view.stock ? <span className={s.stock}>{view.stock}</span> : null}
            </p>
          </div>
          {view.groups.length ? <div className={s.choice}><VariantPicker groups={view.groups} /></div> : null}
          <AddToCart lang={lang} buy={view.buy} hint={view.message} submit={submit} call={call} />
          <div className={s.info}>
            <div className={p.prose}><p>{view.description}</p></div>
            {view.lab ? <LabReport lab={view.lab} /> : null}
          </div>
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
