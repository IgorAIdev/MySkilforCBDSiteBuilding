import type { ReactNode } from 'react'
import p from '@/styles/primitives.module.css'
import b from '@/styles/btn.module.css'
import go from '@/styles/go.module.css'
import s from './Catalog.module.css'
import type { CatalogView } from '@/lib/catalog-view.ts'
import type { ShelfCard } from '@/lib/view.ts'
import { ProductCard, type CartActions } from './ProductCard.tsx'
import { StateScreen } from './StateScreen.tsx'
import { Filters } from './Filters.tsx'
import { SortMenu } from './SortMenu.tsx'
import { Pagination } from './Pagination.tsx'
import { Icon } from './Icon.tsx'

/* Снимки первого экрана не ленивые: полка на ноутбуке держит в нём два ряда
   по четыре (Catalog.module.css, `--cols:4`). Снимок первого экрана, стоящий
   ленивым, стоит в нём пустым, пока браузер не дошёл до ленивых (check:craft,
   `broken`, 1440). */
const FIRST_SCREEN = 8

/* Полка товаров — договор товарного каталога (shop, «Каталог и полка»):
   `data-catalog-grid` без панели сбоку — 4–5 карточек по 260–325px; меряет
   отрисованная семья `catalogueColumns`. */
function Shelf({ cards, eager, cart }: { cards: ShelfCard[]; eager: number; cart: CartActions }) {
  return (
    <ul className={`${p.grid} ${s.shelf}`} data-catalog-grid="">
      {cards.map((c, i) => <li key={c.id}><ProductCard card={c} eager={i < eager} cart={cart} /></li>)}
    </ul>
  )
}

/* Полка каталога, категории и поиска — одна раскладка (разбор 24.09.2026,
   пространственный тезис пакета B):

   1. Шапка страницы — имя, лид и, у поиска, поле поиска: поле спрашивает то
      же, что называет заголовок, и стоит с ним одной группой. Стояло между
      шапкой и полкой вне всякого столбика и упиралось в карточки без воздуха
      (разбор, Q2).
   2. Органы полки — одной полосой над ней: грани раскрытиями слева, порядок
      справа; строкой ниже — счёт и выбранное пилюлями. Колонки фильтров
      сбоку больше нет: при двух гранях она отнимала у полки четвёртую
      колонку и растягивала первый экран одной колонкой на полтора окна
      (check:detect, `firstScreen`). На узком полоса — две равные кнопки:
      «Фильтры» (шторка) и порядок.
   3. Полка — вся ширина холста.
   4. Листание, а у пустого поиска — лучшее магазина, куда идти дальше. */
export function Catalog({ view, search, cart }: { view: CatalogView; search?: ReactNode; cart: CartActions }) {
  const tools = Boolean(view.filters || view.sort)
  const state = Boolean(view.count || view.chips.length)
  return (
    <main id="main" className={`${p.wrap} ${p.section}`} data-air="head">
      <div className={p.pagehead}>
        <h1>{view.title}</h1>
        {view.lede ? <p>{view.lede}</p> : null}
        {search ? <div className={s.search}>{search}</div> : null}
      </div>
      <div className={`${p.stack} ${s.area}`}>
        {tools || state || view.invalid ? (
          <div className={`${p.stack} ${s.tools}`}>
            {tools ? (
              <div className={`${p.cluster} ${s.bar}`}>
                {view.filters ? <Filters f={view.filters} /> : null}
                {view.sort ? <SortMenu sort={view.sort} /> : null}
              </div>
            ) : null}
            {state ? (
              <div className={`${p.cluster} ${s.state}`}>
                {view.count ? <p className={p.note}>{view.count}</p> : null}
                {view.chips.map((c) => <a key={c.href} className={p.chip} href={c.href} aria-label={c.said}>{c.label}<Icon id="x" /></a>)}
                {view.clear ? <a className={b.btn} data-size="sm" href={view.clear.href}>{view.clear.label}</a> : null}
              </div>
            ) : null}
            {view.invalid ? <p className={p.muted} role="status">{view.invalid}</p> : null}
          </div>
        ) : null}
        {/* Полку подписывает заголовок страницы, второй на экране не нужен, но
            лестница для чтения вслух не прыгает с h1 на h3 имён товаров
            (check:craft, heads): h2 говорится и не рисуется (`said`). Одной
            коробкой со списком — чтобы ритм `stack` не лёг между невидимым
            заголовком и полкой. */}
        {view.cards.length
          ? <div><h2 className={p.said}>{view.shelf}</h2><Shelf cards={view.cards} eager={FIRST_SCREEN} cart={cart} /></div>
          : view.empty.title
            ? <StateScreen level={2} kind="none" title={view.empty.title} step={view.empty.step} href={view.empty.href} />
            : <p><a className={go.go} href={view.empty.href}>{view.empty.step}<Icon id="arrow-right" /></a></p>}
        {view.pages ? <Pagination pages={view.pages} /> : null}
        {view.more ? (
          <section className={s.more} aria-labelledby="shelf-more">
            <div className={p.sectionHead}><h2 id="shelf-more">{view.more.title}</h2></div>
            <Shelf cards={view.more.cards} eager={0} cart={cart} />
          </section>
        ) : null}
      </div>
    </main>
  )
}
