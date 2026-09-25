import type { Lang } from './locale.ts'
import type { Card, Cart, CartLine, DeliveryMethod, Image, Money, PaymentMethod } from './source/contract.ts'
import type { Empty } from './catalog-view.ts'
import { outcomeOf, type Outcome } from './cart-ops.ts'
import { t, tn } from './i18n/index.ts'
import { money } from './money.ts'
import { hrefFor } from './href.ts'
import { MARKET } from './market.ts'
import { shelfCard, type ShelfCard } from './view.ts'
import { pledgesView, type PledgesView } from './pledges.ts'

export type TotalsView = { rows: { label: string; value: string }[]; total: { label: string; value: string }; note: string }
/** Шаг счётчика строки корзины: «−» и «+» — кнопки записи (`op`), без
 *  скрипта обычная отправка формы; `op: null` — шага в эту сторону нет (1 и
 *  99): кнопка выключена, но названа. */
export type StepView = { op: string | null; label: string }
export type CartLineView = {
  id: string; href: string; name: string; facts: string; image: Image
  unit: string; total: string
  stepper: { label: string; value: number; less: StepView; more: StepView }
  remove: { op: string; label: string; text: string }
}
export type ShelfView = { title: string; all: { label: string; href: string }; cards: ShelfCard[] }
export type CartPageView = {
  title: string; count: string; summary: string; lines: CartLineView[]; totals: TotalsView
  checkout: { label: string; href: string }
  coupon: { ask: string; label: string; apply: string; open: boolean; applied: { code: string; op: string; label: string }[] }
  pledges: PledgesView
  notice: Outcome | null; couponNotice: Outcome | null
  empty: Empty & { shelf: ShelfView | null }
  messages: { timeout: string; failed: string }
}
/** Что страница корзины собрала у источника сверх самой корзины: способы
 *  оплаты этой корзины, способы доставки, срок возврата — для обещаний у
 *  кнопки; ходовые товары — для полки пустой корзины. Нет — строки нет. */
export type CartExtras = { payments: PaymentMethod[] | null; methods: DeliveryMethod[] | null; returnDays: number | null; popular: Card[] }

/** Предел количества в строке — один на корзину и карту товара (в договоре
 *  его пока нет, docs/open.md, «Предел количества»). */
export const QTY_MAX = 99
const zero = (): Money => ({ minor: 0, currency: MARKET.currency })
const EMPTY: Cart = { lines: [], quantity: 0, subtotal: zero(), discounts: [], delivery: null, total: zero() }
const NO_EXTRAS: CartExtras = { payments: null, methods: null, returnDays: null, popular: [] }

/* Исход кода скидки живёт у поля кода, а не у списка товаров: по имени
   исхода (после «:») — свой блок кодов купона, остальное — линии корзины. */
const COUPON_CODES = new Set(['coupon', 'uncoupon', 'coupon-invalid', 'coupon-expired', 'coupon-empty'])
const isCouponCode = (code: string): boolean => COUPON_CODES.has(code.split(':')[1] ?? '')

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

/** Выбранные опции строки одной строкой фактов: «20 % · 10 ml». */
export const lineFacts = (l: CartLine): string => l.options.map((o) => o.name).join(' · ')

/* Строка ведёт на свой вариант: адрес с опциями, как у выбора на карте
   товара (скилл shop, «Строка, повторяющая карточку, ведёт на товар»). */
function lineView(lang: Lang, l: CartLine): CartLineView {
  const options = Object.fromEntries(l.options.map((o) => [o.group, o.code]))
  return {
    id: l.id, href: hrefFor(lang, { product: l.productId, options }), name: l.name,
    facts: lineFacts(l), image: l.image,
    unit: t(lang, 'cart.unit', { price: money(l.unit, lang) }), total: money(l.total, lang),
    stepper: {
      label: t(lang, 'cart.quantity'), value: l.quantity,
      less: { op: l.quantity > 1 ? `set:${l.id}:${l.quantity - 1}` : null, label: t(lang, 'cart.less', { name: l.name }) },
      more: { op: l.quantity < QTY_MAX ? `set:${l.id}:${l.quantity + 1}` : null, label: t(lang, 'cart.more', { name: l.name }) },
    },
    remove: { op: `remove:${l.id}`, text: t(lang, 'cart.remove'), label: t(lang, 'cart.removeName', { name: l.name }) },
  }
}

/** Корзина готовыми строками. `result` — код исхода из адреса (без
 *  скрипта: запись → переход → корзина); чужой код не показывается.
 *  Поле кода скидки свёрнуто под вопросом (Baymard: открытое поле уводит
 *  искать коды); открыто, когда о коде есть что сказать — ошибка. */
export function cartView(lang: Lang, cart: Cart | null, result: string | null, extras: CartExtras = NO_EXTRAS): CartPageView {
  const c = cart ?? EMPTY
  const outcome = result ? outcomeOf(lang, result) : null
  const coupon = outcome !== null && isCouponCode(outcome.code)
  const popular = extras.popular.map((card) => shelfCard(lang, card))
  return {
    title: t(lang, 'cart.title'),
    count: tn(lang, 'catalog.count', c.quantity),
    summary: t(lang, 'cart.summary'),
    lines: c.lines.map((l) => lineView(lang, l)),
    totals: totalsView(lang, c),
    checkout: { label: t(lang, 'cart.checkout'), href: hrefFor(lang, { checkout: 'contact' }) },
    coupon: {
      ask: t(lang, 'cart.promo'), label: t(lang, 'cart.coupon'), apply: t(lang, 'cart.apply'),
      open: coupon && outcome.kind === 'error',
      applied: c.discounts.map((d) => ({ code: d.code, op: `uncoupon:${d.code}`, label: t(lang, 'cart.couponRemove', { code: d.code }) })),
    },
    pledges: pledgesView(lang, extras),
    notice: outcome && !coupon ? outcome : null,
    couponNotice: outcome && coupon ? outcome : null,
    empty: {
      title: t(lang, 'cart.empty'), step: t(lang, 'cart.emptyStep'), href: hrefFor(lang, { catalog: true }),
      shelf: popular.length ? { title: t(lang, 'cart.popular'), all: { label: t(lang, 'nav.catalog'), href: hrefFor(lang, { catalog: true }) }, cards: popular } : null,
    },
    messages: { timeout: t(lang, 'cart.error.timeout'), failed: t(lang, 'cart.error.unavailable') },
  }
}
