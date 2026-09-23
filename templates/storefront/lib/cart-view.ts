import type { Lang } from './locale.ts'
import type { Cart, CartLine, Image, Money } from './source/contract.ts'
import type { Empty } from './catalog-view.ts'
import { outcomeOf, type Outcome } from './cart-ops.ts'
import { t, tn } from './i18n/index.ts'
import { money } from './money.ts'
import { hrefFor } from './href.ts'
import { MARKET } from './market.ts'

export type TotalsView = { rows: { label: string; value: string }[]; total: { label: string; value: string }; note: string }
export type CartLineView = {
  id: string; href: string; name: string; options: string; image: Image
  unit: string; quantity: number; total: string
  less: string | null; more: string | null; remove: string
  labels: { quantity: string; less: string; more: string; remove: string }
}
export type CartPageView = {
  title: string; count: string; summary: string; lines: CartLineView[]; totals: TotalsView
  checkout: { label: string; href: string }
  coupon: { label: string; apply: string; applied: { code: string; op: string; label: string }[] }
  notice: Outcome | null; empty: Empty; messages: { timeout: string; failed: string }
}

const MAX = 99
const zero = (): Money => ({ minor: 0, currency: MARKET.currency })
const EMPTY: Cart = { lines: [], quantity: 0, subtotal: zero(), discounts: [], delivery: null, total: zero() }

/** Ноль у доставки — словом «бесплатно», а не «0,00 lei». */
export const priceOrFree = (lang: Lang, m: Money): string => (m.minor === 0 ? t(lang, 'delivery.free') : money(m, lang))

/** Итоги готовыми строками — одни на корзину, оформление и «спасибо».
 *  Складывает их источник; здесь только слова. */
export function totalsView(lang: Lang, cart: Cart): TotalsView {
  return {
    rows: [
      { label: t(lang, 'cart.subtotal'), value: money(cart.subtotal, lang) },
      ...cart.discounts.map((d) => ({ label: t(lang, 'cart.discount', { code: d.code }), value: t(lang, 'cart.minus', { amount: money(d.amount, lang) }) })),
      { label: t(lang, 'cart.delivery'), value: cart.delivery === null ? t(lang, 'cart.deliveryLater') : priceOrFree(lang, cart.delivery) },
    ],
    total: { label: t(lang, 'cart.total'), value: money(cart.total, lang) },
    note: t(lang, 'cart.vat'),
  }
}

/* Строка ведёт на свой вариант: адрес с опциями, как у выбора на карте
   товара (скилл shop, «Строка, повторяющая карточку, ведёт на товар»). */
function lineView(lang: Lang, l: CartLine): CartLineView {
  const options = Object.fromEntries(l.options.map((o) => [o.group, o.code]))
  return {
    id: l.id, href: hrefFor(lang, { product: l.productId, options }), name: l.name,
    options: l.options.map((o) => o.name).join(' · '), image: l.image,
    unit: t(lang, 'cart.unit', { price: money(l.unit, lang) }), quantity: l.quantity, total: money(l.total, lang),
    less: l.quantity > 1 ? `set:${l.id}:${l.quantity - 1}` : null,
    more: l.quantity < MAX ? `set:${l.id}:${l.quantity + 1}` : null,
    remove: `remove:${l.id}`,
    labels: {
      quantity: t(lang, 'cart.quantity'),
      less: t(lang, 'cart.less', { name: l.name }),
      more: t(lang, 'cart.more', { name: l.name }),
      remove: t(lang, 'cart.removeName', { name: l.name }),
    },
  }
}

/** Корзина готовыми строками. `result` — код исхода из адреса (без
 *  скрипта: запись → переход → корзина); чужой код не показывается. */
export function cartView(lang: Lang, cart: Cart | null, result: string | null): CartPageView {
  const c = cart ?? EMPTY
  return {
    title: t(lang, 'cart.title'),
    count: tn(lang, 'catalog.count', c.quantity),
    summary: t(lang, 'cart.summary'),
    lines: c.lines.map((l) => lineView(lang, l)),
    totals: totalsView(lang, c),
    checkout: { label: t(lang, 'cart.checkout'), href: hrefFor(lang, { checkout: 'contact' }) },
    coupon: {
      label: t(lang, 'cart.coupon'), apply: t(lang, 'cart.apply'),
      applied: c.discounts.map((d) => ({ code: d.code, op: `uncoupon:${d.code}`, label: t(lang, 'cart.couponRemove', { code: d.code }) })),
    },
    notice: result ? outcomeOf(lang, result) : null,
    empty: { title: t(lang, 'cart.empty'), step: t(lang, 'cart.emptyStep'), href: hrefFor(lang, { catalog: true }) },
    messages: { timeout: t(lang, 'cart.error.timeout'), failed: t(lang, 'cart.error.unavailable') },
  }
}
