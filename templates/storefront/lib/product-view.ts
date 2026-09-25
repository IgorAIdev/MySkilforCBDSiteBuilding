import type { Lang } from './locale.ts'
import type { Card, Collection, Image, LabReport, Product } from './source/contract.ts'
import { t } from './i18n/index.ts'
import { money } from './money.ts'
import { hrefFor } from './href.ts'
import { intlLocale } from './market.ts'
import { percent } from './format.ts'
import { pickState, optionLinks, type OptionGroupLinks } from './variant.ts'
import { saleOf, shelfCard, stockText, type ShelfCard, type WasView } from './view.ts'
import { QTY_MAX } from './cart-view.ts'
import { factsLine, packFacts, type FactsView } from './facts.ts'
import { MESSENGERS, type Messenger } from './contacts.ts'
import { MARKET } from './market.ts'

/** Протокол готовыми строками. `batch` — номер партии отдельно от заголовка:
 *  код партии не рвётся посередине (`RO-` / `2409-05`), его держит разметка.
 *  `open` — ссылка на сам документ партии, одна на карте товара и на
 *  главной (shop, «Лаборатория — процесс»: «где посмотреть»); адреса
 *  документа нет — нет и ссылки: якорь `#lab-…` образца документом не
 *  является (docs/open.md). */
/** `batch` — номер партии словами («Batch RO-2409-10»), `code` — сам номер,
 *  как на этикетке: его сверяют глазом с флаконом. */
export type LabView = { title: string; batch: string; code: string; rows: [string, string][]; open: { label: string; href: string } | null }
/** `add` — надпись кнопки, одно действие без цены: цена стоит под именем,
 *  второй раз на кнопке она не нужна (слово заказчика 25.09.2026: «цену два
 *  раза указывать не нужно, с кнопки убирай цену», И441). `ask` — варианта ещё не выбрали: кнопка
 *  НЕ выключена (Baymard: выключенная кнопка прячет, почему нельзя), нажатие
 *  ведёт на адрес карты с `choose=1` — путь формы и поля, разобранные из
 *  `hrefFor`, а не склеенные второй раз. Без скрипта это обычный переход,
 *  со скриптом — мягкий. Выключена кнопка только там, где выбирать нечего:
 *  вариант распродан или сочетания нет — почему, говорит `message`. */
export type AskView = { action: string; keep: [string, string][] }
/** `quantity`, `less`, `more` — подпись счётчика и имена его «−» и «+»:
 *  счётчик один на сайт (QuantityStepper), корзина и карта берут его. */
export type BuyView = { variant: string | null; ask: AskView | null; add: string; quantity: string; less: string; more: string; max: number; timeout: string; failed: string; quick: QuickView }
/** Быстрый заказ — окно со строками мессенджеров (слово заказчика
 *  25.09.2026, И442). `what` — что заказывают, строкой окна и сообщения:
 *  марка, имя и упаковка выбранного варианта; количество окно берёт из
 *  счётчика в миг открытия. Строки — мессенджеры магазина из данных
 *  (lib/contacts.ts), подпись уже набрана; адрес ссылки окно считает само:
 *  в текст сообщения входят количество и телефон, а их знает только окно. */
export type QuickView = {
  open: string; title: string; lead: string; close: string; what: string
  greet: string; qty: string; myPhone: string
  rows: { key: Messenger; label: string; value: string }[]
  phone: { label: string; hint: string }; call: string
}
/** Снимок галереи: `id` — якорь слайда (ссылка миниатюры ведёт на него и
 *  без скрипта), `show` — имя ссылки миниатюры («Image 2 of 4»). */
export type Slide = Image & { id: string; show: string }
/** Галерея готовыми строками: снимки по порядку (первый — главный), плашка
 *  скидки, имена стрелок и ленты. */
export type GalleryView = { label: string; prev: string; next: string; slides: Slide[]; badge: string | null }
/* Прежняя цена (`WasView`) и скидка (`saleOf`) — одни на полку и карту,
   lib/view.ts. */
export type { WasView }
/** `choose` — «Choose an option» у групп выбора: покупатель нажал «в
 *  корзину», не выбрав варианта (адрес с `choose=1`), и выбора всё ещё нет.
 *  `message` — строка под кнопкой, когда купить нельзя: сочетания нет. */
export type ProductPageView = {
  crumbs: { name: string; href?: string }[]; crumbLabel: string
  brand: string | null; name: string; price: string; was: WasView | null; stock: string | null; message: string | null; choose: string | null
  gallery: GalleryView; groups: OptionGroupLinks[]; facts: FactsView | null; description: string
  related: ShelfCard[]; relatedTitle: string
  buy: BuyView
}

/** Галерея товара: якоря слайдов, имена ссылок миниатюр, плашка скидки. */
export function galleryView(lang: Lang, images: Image[], badge: string | null): GalleryView {
  return {
    label: t(lang, 'gallery.label'), prev: t(lang, 'gallery.prev'), next: t(lang, 'gallery.next'), badge,
    slides: images.map((image, i) => ({ ...image, id: `shot-${i + 1}`, show: t(lang, 'gallery.show', { n: i + 1, total: images.length }) })),
  }
}


/** Протокол партии: цифры анализа — записью языка страницы (`percent`,
 *  «10.2 %» / «10,2 %», И347); дата — порядком рынка (`intlLocale`). */
export function labView(lang: Lang, r: LabReport): LabView {
  const date = new Intl.DateTimeFormat(intlLocale(lang), { dateStyle: 'long', timeZone: 'UTC' })
  return {
    title: t(lang, 'product.lab'),
    batch: t(lang, 'product.batch', { batch: r.batch }),
    code: r.batch,
    rows: [
      [t(lang, 'lab.lab'), r.lab],
      [t(lang, 'lab.date'), date.format(new Date(r.date))],
      ['CBD', percent(lang, r.cbdPercent, 2)],
      ['THC', percent(lang, r.thcPercent, 2)],
    ],
    open: r.url && !r.url.startsWith('#') ? { label: t(lang, 'lab.open'), href: r.url } : null,
  }
}

/** Куда ведёт «в корзину» без выбора: адрес карты с тем, что уже выбрано, и
 *  `choose=1` — путём и полями формы. Адрес собирает `hrefFor`, здесь он
 *  только разбирается на части. */
function askOf(lang: Lang, product: Product, selected: Record<string, string>): AskView {
  const known = Object.fromEntries(Object.entries(selected).filter(([k, v]) => product.optionGroups.some((g) => g.code === k && g.options.some((o) => o.code === v))))
  const url = new URL(hrefFor(lang, { product: product.id, options: known, choose: true }), 'http://site')
  return { action: url.pathname, keep: [...url.searchParams] }
}

/** Окно быстрого заказа готовыми строками. Упаковка — выбранного варианта
 *  (у товара с одним вариантом он выбран сам); без выбора — одно имя. */
function quickView(lang: Lang, product: Product, variant: Product['variants'][number] | null): QuickView {
  const pack = variant?.pack ? factsLine(lang, { strength: product.strength, packs: [variant.pack] }) : null
  const name = [product.brand, product.name].filter(Boolean).join(' ')
  return {
    open: t(lang, 'quick.open'), title: t(lang, 'quick.open'), lead: t(lang, 'quick.lead'), close: t(lang, 'quick.close'),
    what: pack ? `${name} · ${pack}` : name,
    greet: t(lang, 'quick.greet'), qty: t(lang, 'quick.qty'), myPhone: t(lang, 'quick.myPhone'),
    rows: MESSENGERS.map((m) => ({ key: m.key, label: t(lang, 'quick.via', { name: m.label }), value: m.value })),
    phone: { label: t(lang, 'quick.phone'), hint: MARKET.phone.example }, call: t(lang, 'quick.call'),
  }
}

/** Страница товара готовыми строками. Цена — выбранного варианта; пока
 *  выбора нет — «de la» самой низкой, если цены разные. Поле основных
 *  параметров — упаковки выбранного варианта (у товара с одним вариантом он
 *  выбран сам); без выбора поля нет: у разных упаковок разные числа.
 *  Протокола партии на карте нет — слово заказчика 25.09.2026 («lab report
 *  убирай, делай просто поле, где будут основные параметры»); образец
 *  протокола остаётся блоком главной. `asked` — адрес несёт `choose=1`:
 *  покупатель нажал «в корзину» без выбора. */
export function productView(lang: Lang, product: Product, selected: Record<string, string>, ctx: { category: Collection | null; related: Card[]; asked?: boolean }): ProductPageView {
  const state = pickState(product, selected)
  const cheapest = product.variants.reduce((a, b) => (b.price.minor < a.price.minor ? b : a))
  const same = product.variants.every((v) => v.price.minor === cheapest.price.minor)
  const chosen = state.variant
  const price = chosen ? money(chosen.price, lang) : same ? money(cheapest.price, lang) : t(lang, 'product.from', { price: money(cheapest.price, lang) })
  /* Прежняя цена и плашка скидки — у той цены, что напечатана: выбранного
     варианта, а без выбора — самой низкой. */
  const shown = chosen ?? cheapest
  const sale = saleOf(lang, shown.price, shown.was)
  /* Выбора нет — об этом говорят только после нажатия, у групп выбора; до
     нажатия строки под кнопкой нет: кнопка открыта и сама приведёт к ответу. */
  const open = state.status === 'incomplete' || state.status === 'ambiguous'
  const message = state.status === 'missing' || state.status === 'invalid' ? t(lang, 'product.missing') : null
  /* В корзину идёт только выбранный вариант в наличии; у товара с одним
     вариантом он выбран сам. Не выбран — кнопка ведёт к выбору (`ask`);
     распродан или сочетания нет — выключена, почему — строкой наличия или
     `message`. */
  const buyable = chosen ?? (product.variants.length === 1 ? product.variants[0] : null)
  const sellable = buyable && buyable.stock !== 'out' ? buyable : null
  const ask = !buyable && open ? askOf(lang, product, selected) : null
  return {
    crumbs: [
      { name: t(lang, 'crumb.home'), href: hrefFor(lang, { home: true }) },
      ...(ctx.category ? [{ name: ctx.category.name, href: hrefFor(lang, { category: ctx.category.slug }) }] : []),
      { name: product.name },
    ],
    crumbLabel: t(lang, 'crumb.label'),
    brand: product.brand,
    name: product.name,
    price, was: sale?.was ?? null,
    stock: chosen ? stockText(lang, chosen.stock) : null,
    message,
    choose: ask && ctx.asked ? t(lang, 'product.choose') : null,
    gallery: galleryView(lang, product.images, sale?.badge ?? null),
    groups: optionLinks(lang, product, selected),
    facts: buyable ? packFacts(lang, buyable.pack, product.strength, buyable.price) : null,
    description: product.description,
    related: ctx.related.map((c) => shelfCard(lang, c)),
    relatedTitle: t(lang, 'product.related'),
    buy: {
      variant: sellable?.id ?? null,
      ask,
      add: t(lang, 'cart.add'),
      quantity: t(lang, 'cart.quantity'),
      less: t(lang, 'cart.less', { name: product.name }), more: t(lang, 'cart.more', { name: product.name }), max: QTY_MAX,
      timeout: t(lang, 'cart.error.timeout'), failed: t(lang, 'cart.error.unavailable'),
      quick: quickView(lang, product, buyable),
    },
  }
}
