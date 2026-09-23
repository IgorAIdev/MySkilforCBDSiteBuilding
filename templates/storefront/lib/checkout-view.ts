import type { Lang } from './locale.ts'
import type { Address, Cart, Checkout, Contact, Delivery, DeliveryMethod, Order, PaymentMethod, PickupPoint, PointType } from './source/contract.ts'
import type { Empty } from './catalog-view.ts'
import { LIMITS, type Field } from './checkout-form.ts'
import { STEPS, type Step } from './checkout-steps.ts'
import { t, tn, type Key } from './i18n/index.ts'
import { money } from './money.ts'
import { hrefFor } from './href.ts'
import { intlLocale, MARKET } from './market.ts'
import { priceOrFree, totalsView, type TotalsView } from './cart-view.ts'

export type FieldView = { name: Field; label: string; type: 'email' | 'tel' | 'text'; autoComplete: string; inputMode: 'numeric' | null; max: number; value: string }
export type StepsView = { label: string; items: { name: string; href: string | null; current: boolean }[] }
export type ContactView = { title: string; fields: FieldView[]; submit: string }
export type MethodView = { id: string; name: string; meta: string; description: string; price: string; checked: boolean }
export type PointView = { id: string; name: string; meta: string; hours: string | null; checked: boolean }
export type AddressDetails = { kind: 'address'; method: string; title: string; fields: FieldView[]; country: { label: string; value: string }; submit: string }
export type PickupDetails = {
  kind: 'pickup'; method: string; title: string
  search: { action: string; label: string; value: string; submit: string } | null
  prompt: string | null; empty: Empty | null; points: PointView[]; submit: string
}
export type DeliveryPageView = { title: string; methods: MethodView[]; choose: string; details: AddressDetails | PickupDetails | null }
export type Recap = { title: string; lines: string[]; change: { label: string; aria: string; href: string } | null }
export type ItemView = { id: string; line: string; detail: string; total: string }
export type PaymentPageView = {
  title: string
  methods: { code: string; name: string; description: string; disabled: boolean; reason: string | null; checked: boolean }[]
  review: string; recaps: Recap[]; itemsTitle: string; items: ItemView[]; totals: TotalsView
  terms: { note: string; link: { label: string; href: string } }; submit: string
}
export type DonePageView = {
  title: string; code: string; keep: string; review: string; recaps: Recap[]
  itemsTitle: string; items: ItemView[]; totals: TotalsView; more: { label: string; href: string }
}

const STEP_NAME: Record<Step, Key> = { contact: 'checkout.step.contact', delivery: 'checkout.step.delivery', payment: 'checkout.step.payment' }
const POINT: Record<PointType, Key> = { office: 'point.office', locker: 'point.locker', partner: 'point.partner', shop: 'point.shop' }
const KIND: Record<DeliveryMethod['kind'], Key> = { address: 'delivery.kind.address', pickup: 'delivery.kind.pickup' }

/** Шаги: пройденные — ссылками назад, текущий отмечен, будущие без адреса —
 *  к ним не пускает сервер (`stepFor`). */
export function stepsView(lang: Lang, current: Step): StepsView {
  const at = STEPS.indexOf(current)
  return {
    label: t(lang, 'checkout.steps'),
    items: STEPS.map((s, i) => ({ name: t(lang, STEP_NAME[s]), href: i < at ? hrefFor(lang, { checkout: s }) : null, current: i === at })),
  }
}

type Spec = { key: Key; type?: FieldView['type']; auto: string; numeric?: boolean }
const field = (lang: Lang, name: Field, value: string, spec: Spec): FieldView => ({
  name, label: t(lang, spec.key), type: spec.type ?? 'text', autoComplete: spec.auto,
  inputMode: spec.numeric ? 'numeric' : null, max: LIMITS[name], value,
})

export function contactView(lang: Lang, contact: Contact | null): ContactView {
  const c = contact ?? { email: '', firstName: '', lastName: '', phone: '' }
  return {
    title: t(lang, 'checkout.step.contact'),
    fields: [
      field(lang, 'email', c.email, { key: 'field.email', type: 'email', auto: 'email' }),
      field(lang, 'firstName', c.firstName, { key: 'field.firstName', auto: 'given-name' }),
      field(lang, 'lastName', c.lastName, { key: 'field.lastName', auto: 'family-name' }),
      field(lang, 'phone', c.phone, { key: 'field.phone', type: 'tel', auto: 'tel' }),
    ],
    submit: t(lang, 'checkout.continue'),
  }
}

/** Срок рабочими днями; диапазон считается по верхнему концу. */
export const daysText = (lang: Lang, days: DeliveryMethod['days']): string | null =>
  days === null ? null
  : days.min === days.max ? tn(lang, 'delivery.day', days.max)
  : tn(lang, 'delivery.span', days.max, { min: days.min })

export const countryName = (lang: Lang, code: string): string =>
  new Intl.DisplayNames([intlLocale(lang)], { type: 'region' }).of(code) ?? code

function addressFields(lang: Lang, a: Address | null): FieldView[] {
  const v = a ?? { street: '', city: '', region: '', postalCode: '' }
  return [
    field(lang, 'street', v.street, { key: 'field.street', auto: 'street-address' }),
    field(lang, 'city', v.city, { key: 'field.city', auto: 'address-level2' }),
    field(lang, 'region', v.region, { key: 'field.region', auto: 'address-level1' }),
    field(lang, 'postalCode', v.postalCode, { key: 'field.postalCode', auto: 'postal-code', numeric: true }),
  ]
}

export type Pickup = { listed: boolean; city: string; points: PickupPoint[] }

function pickupDetails(lang: Lang, method: DeliveryMethod, current: string | null, p: Pickup): PickupDetails {
  const searched = !p.listed && p.city !== ''
  return {
    kind: 'pickup', method: method.id, title: t(lang, 'delivery.points'),
    search: p.listed ? null : { action: hrefFor(lang, { checkout: 'delivery' }), label: t(lang, 'field.city'), value: p.city, submit: t(lang, 'delivery.find') },
    prompt: !p.listed && !p.city ? t(lang, 'delivery.cityPrompt') : null,
    empty: searched && !p.points.length
      ? { title: t(lang, 'delivery.noPoints', { city: p.city }), step: t(lang, 'delivery.noPointsStep'), href: hrefFor(lang, { checkout: 'delivery' }) }
      : null,
    points: p.points.map((pt) => ({ id: pt.id, name: pt.name, meta: [t(lang, POINT[pt.type]), pt.address, pt.city].join(' · '), hours: pt.hours, checked: pt.id === current })),
    submit: t(lang, 'delivery.next'),
  }
}

/** Шаг доставки: способы — всегда; под выбранным — его подробности: адрес
 *  у `address`, точка у `pickup`. Точки собирает страница: `listed` — их
 *  мало и они пришли без города; иначе — найденные по городу. */
export function deliveryView(lang: Lang, a: { methods: DeliveryMethod[]; delivery: Delivery | null; pickup: Pickup | null }): DeliveryPageView {
  const chosen = a.delivery?.method ?? null
  const details = !chosen ? null
    : chosen.kind === 'address'
      ? { kind: 'address' as const, method: chosen.id, title: t(lang, 'delivery.address'), fields: addressFields(lang, a.delivery?.address ?? null), country: { label: t(lang, 'field.country'), value: countryName(lang, MARKET.country) }, submit: t(lang, 'delivery.next') }
      : pickupDetails(lang, chosen, a.delivery?.point?.id ?? null, a.pickup ?? { listed: false, city: '', points: [] })
  return {
    title: t(lang, 'delivery.title'),
    methods: a.methods.map((m) => ({
      id: m.id, name: m.name, description: m.description, price: priceOrFree(lang, m.price), checked: m.id === chosen?.id,
      meta: [t(lang, KIND[m.kind]), m.carrier, daysText(lang, m.days)].filter(Boolean).join(' · '),
    })),
    choose: t(lang, 'delivery.choose'),
    details,
  }
}

const contactLines = (lang: Lang, c: Contact): string[] => [t(lang, 'order.name', { first: c.firstName, last: c.lastName }), c.email, c.phone]
function deliveryLines(lang: Lang, d: Delivery): string[] {
  const head = [d.method.name, d.method.carrier].filter(Boolean).join(' · ')
  if (d.address) return [head, d.address.street, t(lang, 'order.cityLine', { postal: d.address.postalCode, city: d.address.city }), d.address.region]
  if (d.point) return [head, d.point.name, d.point.address, d.point.city]
  return [head]
}
const itemsOf = (lang: Lang, cart: Cart): ItemView[] =>
  cart.lines.map((l) => ({ id: l.id, line: t(lang, 'order.line', { name: l.name, n: l.quantity }), detail: l.options.map((o) => o.name).join(' · '), total: money(l.total, lang) }))
const recap = (lang: Lang, step: Step, lines: string[]): Recap => {
  const title = t(lang, STEP_NAME[step])
  return { title, lines, change: { label: t(lang, 'checkout.change'), aria: t(lang, 'checkout.changeStep', { step: title }), href: hrefFor(lang, { checkout: step }) } }
}

/** Шаг оплаты: способы — допустимые, недопустимый выключен с причиной и не
 *  прячется; сверка того, что заказано, куда и кому; кнопка называет
 *  обязанность платить (И262). */
export function paymentView(lang: Lang, a: { methods: PaymentMethod[]; checkout: Checkout; terms: { title: string; href: string } }): PaymentPageView {
  const c = a.checkout
  const first = a.methods.find((m) => m.eligible)?.code ?? null
  return {
    title: t(lang, 'payment.title'),
    methods: a.methods.map((m) => ({ code: m.code, name: m.name, description: m.description, disabled: !m.eligible, reason: m.eligible ? null : m.reason, checked: m.code === first })),
    review: t(lang, 'order.review'),
    recaps: [
      ...(c.contact ? [recap(lang, 'contact', contactLines(lang, c.contact))] : []),
      ...(c.delivery ? [recap(lang, 'delivery', deliveryLines(lang, c.delivery))] : []),
    ],
    itemsTitle: t(lang, 'order.items'), items: itemsOf(lang, c.cart), totals: totalsView(lang, c.cart),
    terms: { note: t(lang, 'order.terms'), link: { label: a.terms.title, href: a.terms.href } },
    submit: t(lang, 'order.place'),
  }
}

export function doneView(lang: Lang, order: Order): DonePageView {
  return {
    title: t(lang, 'done.title'), code: t(lang, 'done.code', { code: order.code }), keep: t(lang, 'done.keep'),
    review: t(lang, 'done.summary'),
    recaps: [
      { title: t(lang, 'checkout.step.contact'), lines: contactLines(lang, order.contact), change: null },
      { title: t(lang, 'checkout.step.delivery'), lines: deliveryLines(lang, order.delivery), change: null },
      { title: t(lang, 'checkout.step.payment'), lines: [order.payment.name, order.payment.description], change: null },
    ],
    itemsTitle: t(lang, 'order.items'), items: itemsOf(lang, order.cart), totals: totalsView(lang, order.cart),
    more: { label: t(lang, 'done.more'), href: hrefFor(lang, { catalog: true }) },
  }
}

/** Рамка шагов: заголовок, подпись итогов, путь назад в корзину. */
export type FrameText = { title: string; summary: string; back: { label: string; href: string } }
export const frameText = (lang: Lang): FrameText => ({
  title: t(lang, 'checkout.title'), summary: t(lang, 'cart.summary'),
  back: { label: t(lang, 'checkout.back'), href: hrefFor(lang, { cart: true }) },
})

export const noOrder = (lang: Lang): Empty => ({ title: t(lang, 'done.none'), step: t(lang, 'done.noneStep'), href: hrefFor(lang, { catalog: true }) })
export const emptyCheckout = (lang: Lang): Empty => ({ title: t(lang, 'cart.empty'), step: t(lang, 'cart.emptyStep'), href: hrefFor(lang, { catalog: true }) })

export type DeliveryTableView = { caption: string; head: [string, string, string]; rows: { id: string; name: string; kind: string; days: string; price: string }[] }

/** Таблица способов для страницы «Доставка и оплата» — из того же списка,
 *  что выбор на оформлении (скилл shop, И95). Три колонки, не четыре: на
 *  телефоне вид способа (`kind`) не тянет свой столбец — он второй строкой
 *  под именем в самой шапке строки (правило И95, экран уже 360). */
export function deliveryTable(lang: Lang, methods: DeliveryMethod[]): DeliveryTableView {
  return {
    caption: t(lang, 'delivery.table'),
    head: [t(lang, 'delivery.col.method'), t(lang, 'delivery.col.days'), t(lang, 'delivery.col.price')],
    rows: methods.map((m) => ({
      id: m.id, name: [m.name, m.carrier].filter(Boolean).join(' · '), kind: t(lang, KIND[m.kind]),
      days: daysText(lang, m.days) ?? '—', price: priceOrFree(lang, m.price),
    })),
  }
}
