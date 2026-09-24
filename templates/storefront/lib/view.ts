import type { Lang } from './locale.ts'
import type { Card, Image, Money, Price, Stock } from './source/contract.ts'
import { t } from './i18n/index.ts'
import { money } from './money.ts'
import { hrefFor } from './href.ts'
import { bindUnits, factsLine } from './facts.ts'
import { percent } from './format.ts'

/** Наличие на полке — только исключение: мало или нет. «В наличии» стояло
 *  на всех двенадцати карточках и ничего не различало (разбор 24.09.2026,
 *  X3); сигнал стоит печатать там, где он отличает товар от соседей. */
export type StockFlag = { level: Exclude<Stock, 'in'>; text: string }
/** Прежняя цена: `text` — видимая, зачёркнутая; `said` — она же словами для
 *  чтения вслух (зачёркивание голосом не читается). */
export type WasView = { text: string; said: string }
/** «В корзину» с полки. `variant` — вариант, который кладётся сразу (у
 *  товара он один); null — вариантов несколько, и кнопка ведёт к выбору на
 *  карте (`ask` — её адрес с `choose=1`, И284); распродано — тоже null, и
 *  кнопка ведёт на карту словом «View». `add` и `added` — надпись
 *  кнопки до записи и после; `name` — имя кнопки для чтения вслух: кнопок на
 *  полке много, и у каждой своё. `timeout`, `failed` — слова исхода записи,
 *  те же, что у кнопки карты товара. */
export type ShelfBuy = { variant: string | null; ask: string; add: string; added: string; choose: string; name: string; timeout: string; failed: string }
/** Карточка на полке — готовые строки: блок не считает и не переводит.
 *  `facts` — сила, мера и мг одной строкой (lib/facts.ts); нечего сказать —
 *  null. `was` и `sale` — прежняя цена и плашка «−15 %» (скидки нет — null);
 *  `lang` — язык формы корзины. */
export type ShelfCard = { id: string; lang: Lang; href: string; name: string; image: Image; price: string; was: WasView | null; sale: string | null; facts: string | null; flag: StockFlag | null; buy: ShelfBuy }

const STOCK = { in: 'product.inStock', low: 'product.lowStock', out: 'product.outOfStock' } as const
export const stockText = (lang: Lang, stock: Stock): string => t(lang, STOCK[stock])

/** «Цена от» — только у полки с разными ценами вариантов; у выбранного варианта — своя цена. */
export const priceText = (lang: Lang, price: Price): string =>
  price.kind === 'single' ? money(price.value, lang) : t(lang, 'product.from', { price: money(price.min, lang) })

/** Скидка показанной цены: прежняя цена строкой и плашка «−15 %» записью
 *  языка страницы (`percent`, lib/format.ts, И347). Считает вид, а не
 *  компонент (И248): блок получает готовые строки. Прежней цены нет или она
 *  не выше — скидки нет. Одна на полку и карту товара. */
export function saleOf(lang: Lang, price: Money, was: Money | null): { was: WasView; badge: string } | null {
  if (!was || was.minor <= price.minor) return null
  const text = money(was, lang)
  return { was: { text, said: t(lang, 'product.was', { price: text }) }, badge: t(lang, 'product.off', { pct: percent(lang, (1 - price.minor / was.minor) * 100, 0) }) }
}

export const shelfCard = (lang: Lang, c: Card): ShelfCard => {
  const name = bindUnits(c.name)
  const sale = c.price.kind === 'single' ? saleOf(lang, c.price.value, c.was) : null
  /* Распродано — купить с полки нечего: кнопка ведёт на карту словом «View»,
     а не «Choose» — выбирать там нечего (плашка «нет» уже на снимке). */
  const out = c.stock === 'out'
  const direct = out ? null : c.variant
  return {
    id: c.id, lang, href: hrefFor(lang, { product: c.id }), name, image: c.image,
    price: priceText(lang, c.price), was: sale?.was ?? null, sale: sale?.badge ?? null, facts: factsLine(lang, c),
    flag: c.stock === 'in' ? null : { level: c.stock, text: stockText(lang, c.stock) },
    buy: {
      variant: direct, ask: out ? hrefFor(lang, { product: c.id }) : hrefFor(lang, { product: c.id, choose: true }),
      add: t(lang, 'shelf.add'), added: t(lang, 'shelf.added'), choose: t(lang, out ? 'shelf.view' : 'shelf.choose'),
      name: t(lang, direct ? 'shelf.addName' : out ? 'shelf.viewName' : 'shelf.chooseName', { name }),
      timeout: t(lang, 'cart.error.timeout'), failed: t(lang, 'cart.error.unavailable'),
    },
  }
}
