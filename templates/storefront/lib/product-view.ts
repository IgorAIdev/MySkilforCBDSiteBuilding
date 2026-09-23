import type { Lang } from './locale.ts'
import type { Card, Collection, Image, LabReport, Product } from './source/contract.ts'
import { t } from './i18n/index.ts'
import { money } from './money.ts'
import { hrefFor } from './href.ts'
import { intlLocale } from './market.ts'
import { pickState, optionLinks, type OptionGroupLinks } from './variant.ts'
import { shelfCard, stockText, type ShelfCard } from './view.ts'

/** Протокол готовыми строками. `batch` — номер партии отдельно от заголовка:
 *  код партии не рвётся посередине (`RO-` / `2409-05`), его держит разметка. */
export type LabView = { title: string; batch: string; rows: [string, string][] }
export type BuyView = { variant: string | null; add: string; quantity: string; view: { label: string; href: string }; timeout: string; failed: string }
export type ProductPageView = {
  crumbs: { name: string; href?: string }[]; crumbLabel: string
  eyebrow: string; name: string; price: string; stock: string | null; message: string | null
  image: Image; groups: OptionGroupLinks[]; lab: LabView | null; description: string
  related: ShelfCard[]; relatedTitle: string
  buy: BuyView
}

export function labView(lang: Lang, r: LabReport): LabView {
  const pct = new Intl.NumberFormat(intlLocale(lang), { style: 'percent', maximumFractionDigits: 2 })
  const date = new Intl.DateTimeFormat(intlLocale(lang), { dateStyle: 'long', timeZone: 'UTC' })
  return {
    title: t(lang, 'product.lab'),
    batch: t(lang, 'product.batch', { batch: r.batch }),
    rows: [
      [t(lang, 'lab.lab'), r.lab],
      [t(lang, 'lab.date'), date.format(new Date(r.date))],
      ['CBD', pct.format(r.cbdPercent / 100)],
      ['THC', pct.format(r.thcPercent / 100)],
    ],
  }
}

/** Страница товара готовыми строками. Цена — выбранного варианта; пока
 *  выбора нет — «de la» самой низкой, если цены разные. Протокол — партии
 *  выбранного варианта; без выбора — первой партии товара. */
export function productView(lang: Lang, product: Product, selected: Record<string, string>, ctx: { category: Collection | null; related: Card[] }): ProductPageView {
  const state = pickState(product, selected)
  const cheapest = product.variants.reduce((a, b) => (b.price.minor < a.price.minor ? b : a))
  const same = product.variants.every((v) => v.price.minor === cheapest.price.minor)
  const chosen = state.variant
  const price = chosen ? money(chosen.price, lang) : same ? money(cheapest.price, lang) : t(lang, 'product.from', { price: money(cheapest.price, lang) })
  const message =
    state.status === 'incomplete' || state.status === 'ambiguous' ? t(lang, 'product.choose')
    : state.status === 'missing' || state.status === 'invalid' ? t(lang, 'product.missing')
    : null
  const report = chosen ? product.labReports.find((r) => r.batch === chosen.batch) : product.labReports[0]
  /* В корзину идёт только выбранный вариант в наличии; у товара с одним
     вариантом он выбран сам. Кнопка без варианта выключена: почему — уже
     сказано строкой выбора или наличия над ней. */
  const buyable = chosen ?? (product.variants.length === 1 ? product.variants[0] : null)
  return {
    crumbs: [
      { name: t(lang, 'crumb.home'), href: hrefFor(lang, { home: true }) },
      ...(ctx.category ? [{ name: ctx.category.name, href: hrefFor(lang, { category: ctx.category.slug }) }] : []),
      { name: product.name },
    ],
    crumbLabel: t(lang, 'crumb.label'),
    eyebrow: ctx.category?.name ?? '',
    name: product.name,
    price,
    stock: chosen ? stockText(lang, chosen.stock) : null,
    message,
    image: product.images[0],
    groups: optionLinks(lang, product, selected),
    lab: report ? labView(lang, report) : null,
    description: product.description,
    related: ctx.related.map((c) => shelfCard(lang, c)),
    relatedTitle: t(lang, 'product.related'),
    buy: {
      variant: buyable && buyable.stock !== 'out' ? buyable.id : null,
      add: t(lang, 'cart.add'), quantity: t(lang, 'cart.quantity'),
      view: { label: t(lang, 'cart.view'), href: hrefFor(lang, { cart: true }) },
      timeout: t(lang, 'cart.error.timeout'), failed: t(lang, 'cart.error.unavailable'),
    },
  }
}
