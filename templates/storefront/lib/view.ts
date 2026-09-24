import type { Lang } from './locale.ts'
import type { Card, Image, Price, Stock } from './source/contract.ts'
import { t } from './i18n/index.ts'
import { money } from './money.ts'
import { hrefFor } from './href.ts'
import { bindUnits, factsLine } from './facts.ts'

/** Наличие на полке — только исключение: мало или нет. «В наличии» стояло
 *  на всех двенадцати карточках и ничего не различало (разбор 24.09.2026,
 *  X3); сигнал стоит печатать там, где он отличает товар от соседей. */
export type StockFlag = { level: Exclude<Stock, 'in'>; text: string }
/** Карточка на полке — готовые строки: блок не считает и не переводит.
 *  `facts` — сила, мера и мг одной строкой (lib/facts.ts); нечего сказать —
 *  null. */
export type ShelfCard = { id: string; href: string; name: string; image: Image; price: string; facts: string | null; flag: StockFlag | null }

const STOCK = { in: 'product.inStock', low: 'product.lowStock', out: 'product.outOfStock' } as const
export const stockText = (lang: Lang, stock: Stock): string => t(lang, STOCK[stock])

/** «Цена от» — только у полки с разными ценами вариантов; у выбранного варианта — своя цена. */
export const priceText = (lang: Lang, price: Price): string =>
  price.kind === 'single' ? money(price.value, lang) : t(lang, 'product.from', { price: money(price.min, lang) })

export const shelfCard = (lang: Lang, c: Card): ShelfCard => ({
  id: c.id, href: hrefFor(lang, { product: c.id }), name: bindUnits(c.name), image: c.image,
  price: priceText(lang, c.price), facts: factsLine(lang, c),
  flag: c.stock === 'in' ? null : { level: c.stock, text: stockText(lang, c.stock) },
})
