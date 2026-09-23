import type { Lang } from './locale.ts'
import type { Card, Image, Price, Stock } from './source/contract.ts'
import { t } from './i18n/index.ts'
import { money } from './money.ts'
import { hrefFor } from './href.ts'

/* Карточка на полке — готовые строки: блок не считает и не переводит. */
export type ShelfCard = { id: string; href: string; name: string; image: Image; price: string; stock: string }

const STOCK = { in: 'product.inStock', low: 'product.lowStock', out: 'product.outOfStock' } as const
export const stockText = (lang: Lang, stock: Stock): string => t(lang, STOCK[stock])

/** «Цена от» — только у полки с разными ценами вариантов; у выбранного варианта — своя цена. */
export const priceText = (lang: Lang, price: Price): string =>
  price.kind === 'single' ? money(price.value, lang) : t(lang, 'product.from', { price: money(price.min, lang) })

export const shelfCard = (lang: Lang, c: Card): ShelfCard => ({
  id: c.id, href: hrefFor(lang, { product: c.id }), name: c.name, image: c.image,
  price: priceText(lang, c.price), stock: stockText(lang, c.stock),
})
