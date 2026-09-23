import type { ReactNode } from 'react'
import p from '@/styles/primitives.module.css'
import s from './Catalog.module.css'
import type { CatalogView } from '@/lib/catalog-view.ts'
import { ProductCard } from './ProductCard.tsx'
import { StateScreen } from './StateScreen.tsx'
import { Filters } from './Filters.tsx'
import { Pagination } from './Pagination.tsx'

/* Снимки первого экрана не ленивые: полка у фильтров на ноутбуке держит в
   нём две строки по три (Catalog.module.css, `--cols:3`). Стояло четыре —
   пятый и шестой снимок стояли в первом экране пустыми, пока браузер не
   дошёл до ленивых (check:craft, `broken`, 1440). */
const FIRST_SCREEN = 6

export function Catalog({ view, top }: { view: CatalogView; top?: ReactNode }) {
  const shelf = (
    <div className={p.stack}>
      {/* Полку подписывает заголовок страницы, второй на экране не нужен, но
          лестница для чтения вслух не прыгает с h1 на h3 имён товаров
          (check:craft, heads): h2 говорится и не рисуется (`said`). Стоит
          прямо перед товарами, а не перед фильтрами: переход по заголовкам
          приводит к полке. Одной коробкой со списком — чтобы ритм `stack`
          не лёг между невидимым заголовком и полкой. Пустую полку
          подписывает свой h2 экрана «пусто». */}
      {view.cards.length
        ? <div><h2 className={p.said}>{view.shelf}</h2><ul className={`${p.grid} ${s.shelf}`}>{view.cards.map((c, i) => <li key={c.id}><ProductCard card={c} eager={i < FIRST_SCREEN} /></li>)}</ul></div>
        : <StateScreen level={2} kind="none" title={view.empty.title} step={view.empty.step} href={view.empty.href} />}
      {view.pages ? <Pagination pages={view.pages} /> : null}
    </div>
  )
  return (
    <main id="main" className={`${p.wrap} ${p.section}`}>
      <div className={p.pagehead}>
        <h1>{view.title}</h1>
        {view.lede ? <p>{view.lede}</p> : null}
        <p className={p.muted}>{view.count}</p>
      </div>
      {top}
      {view.invalid ? <p className={p.muted} role="status">{view.invalid}</p> : null}
      {view.filters ? (
        <div className={p.sidebar}>
          <aside className={p.aside}><Filters f={view.filters} /></aside>
          {shelf}
        </div>
      ) : shelf}
    </main>
  )
}
