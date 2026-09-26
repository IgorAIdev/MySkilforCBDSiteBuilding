import p from '@/styles/primitives.module.css'
import s from './ProductView.module.css'
import type { ProductPageView } from '@/lib/product-view.ts'
import type { Outcome } from '@/lib/cart-ops.ts'
import { Breadcrumbs } from './Breadcrumbs.tsx'
import { ProductCard } from './ProductCard.tsx'
import { Gallery } from './Gallery.tsx'
import { VariantPicker } from './VariantPicker.tsx'
import { KeyFacts } from './KeyFacts.tsx'
import { AddToCart } from './AddToCart.tsx'

/* Карта товара. Колонка покупки — три группы, и воздух между группами
   крупнее воздуха внутри (И278, И444; бриф docs/design/карта-товара.md, §7):
   что это — марка, имя, цена, описание; как купить — выбор варианта и
   строка покупки (количество, «в корзину», «быстрый заказ»); что внутри —
   поле основных параметров. Порядок — слово заказчика 25.09.2026 (И441).
   Порядок разметки — порядок чтения и на телефоне.

   Марка — первая строка ЗАГОЛОВКА, а не надпись над ним: полное имя товара
   «Câmpia Full-spectrum CBD oil» читается одним заголовком и вслух, и
   поиском; надпись над заголовком — запрет impeccable (`check:design`,
   семья `eyebrow`). */
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
          <div className={s.part}>
            <div className={s.identity}>
              <h1 className={s.name}>{view.brand ? <span className={s.brand} translate="no">{view.brand} </span> : null}{view.name}</h1>
              <p className={s.price}>
                <span className={s.now}>{view.price}</span>
                {view.was ? <><s className={s.was} aria-hidden="true">{view.was.text}</s><span className={p.said}>{view.was.said}</span></> : null}
                {view.stock ? <span className={s.stock}>{view.stock}</span> : null}
              </p>
            </div>
            <div className={p.prose}><p>{view.description}</p></div>
          </div>
          <div className={s.part}>
            {view.groups.length ? <div className={s.choice}><VariantPicker groups={view.groups} error={view.choose} /></div> : null}
            <AddToCart lang={lang} buy={view.buy} hint={view.message} submit={submit} call={call} />
          </div>
          {view.facts ? <KeyFacts facts={view.facts} /> : null}
        </div>
      </section>
      {view.related.length ? (
        <section className={p.section}>
          <div className={p.sectionHead}><h2>{view.relatedTitle}</h2></div>
          <ul className={`${p.grid} ${s.related}`}>{view.related.map((c) => <li key={c.id}><ProductCard card={c} cart={{ submit, call }} /></li>)}</ul>
        </section>
      ) : null}
    </>
  )
}
