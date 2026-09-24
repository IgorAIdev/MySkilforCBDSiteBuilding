import type { Lang } from './locale.ts'
import type { Address, Cart, CartLine, Checkout, Contact, Delivery, DeliveryMethod, Image, Order, PaymentMethod, PickupPoint, PointType } from './source/contract.ts'
import type { Empty } from './catalog-view.ts'
import { LIMITS, type Field } from './checkout-form.ts'
import { STEPS, type Step } from './checkout-steps.ts'
import { t, tn, type Key } from './i18n/index.ts'
import { money } from './money.ts'
import { hrefFor } from './href.ts'
import { intlLocale, MARKET } from './market.ts'
import { lineFacts, priceOrFree, totalsView, type TotalsView } from './cart-view.ts'
import { pledgesView, type PledgesView } from './pledges.ts'

/** Поле формы готовыми строками. `short` — ввод короткий по природе
 *  (индекс): поле шириной с ожидаемый ввод, а не во всю колонку (Baymard).
 *  `options` — выбор из закрытого списка рынка (уезд) вместо свободной строки. */
export type FieldView = {
  name: Field; label: string; type: 'email' | 'tel' | 'text'; autoComplete: string; inputMode: 'numeric' | null
  max: number; value: string; short: boolean; options: { none: string; values: readonly string[] } | null
}
/** Ряд формы: одно поле — во всю меру; два — парой (имя и фамилия; индекс и
 *  населённый пункт). Что с чем в паре — решает вид, как лечь паре — узел. */
export type FieldRow = FieldView[]
export type StepsView = { label: string; title: string; items: { name: string; href: string | null; current: boolean; done: boolean }[] }
export type ContactView = { rows: FieldRow[]; submit: string }
export type MethodView = { id: string; name: string; meta: string; description: string; price: string; checked: boolean }
export type PointView = { id: string; name: string; meta: string; hours: string | null; checked: boolean }
export type AddressDetails = { kind: 'address'; method: string; title: string; rows: FieldRow[]; country: { label: string; value: string }; submit: string }
export type PickupDetails = {
  kind: 'pickup'; method: string; title: string
  search: { action: string; label: string; value: string; submit: string } | null
  prompt: string | null; empty: Empty | null; points: PointView[]; submit: string
}
/** Шаг доставки. `saved` — способ, уже записанный в заказ: его подробности
 *  стоят под выбором; выбран другой — кнопка «выбрать» подтверждает смену. */
export type DeliveryPageView = { title: string; methods: MethodView[]; saved: string | null; choose: string; details: AddressDetails | PickupDetails | null }
export type Recap = { title: string; lines: string[]; change: { label: string; aria: string; href: string } | null }
/** Товар в сводке заказа: снимок, имя, факты и количество строкой, сумма. */
export type ItemView = { id: string; name: string; facts: string; total: string; image: Image }
/** Сводка заказа рядом с шагом: товары и итоги; на телефоне — раскрывашка
 *  сверху с итогом в строке (`show`, `total`). */
export type SummaryView = { label: string; show: string; total: string; items: ItemView[]; totals: TotalsView }
export type PaymentPageView = {
  title: string
  methods: { code: string; name: string; description: string; disabled: boolean; reason: string | null; checked: boolean }[]
  review: string; recaps: Recap[]; itemsTitle: string; items: ItemView[]; totals: TotalsView
  terms: { note: string; link: { label: string; href: string } }; submit: string; pledges: PledgesView
  /** Итог, который покупатель видит у кнопки, — форма уносит его с заказом:
   *  другой у корзины — заказ не ставится (И262). Малые единицы строкой. */
  expected: { minor: string; currency: string }
}
/** «Спасибо»: номер крупно, что дальше — по способам этого заказа, детали. */
export type DonePageView = {
  title: string; code: { label: string; value: string }; keep: string
  next: { title: string; steps: Recap[] }
  review: string; recaps: Recap[]; itemsTitle: string; items: ItemView[]; totals: TotalsView; more: { label: string; href: string }
}

const STEP_NAME: Record<Step, Key> = { contact: 'checkout.step.contact', delivery: 'checkout.step.delivery', payment: 'checkout.step.payment' }
const POINT: Record<PointType, Key> = { office: 'point.office', locker: 'point.locker', partner: 'point.partner', shop: 'point.shop' }
const KIND: Record<DeliveryMethod['kind'], Key> = { address: 'delivery.kind.address', pickup: 'delivery.kind.pickup' }

/** Шаги: пройденные — ссылками назад, текущий отмечен и назван заголовком
 *  страницы (`title`), будущие без адреса — к ним не пускает сервер (`stepFor`). */
export function stepsView(lang: Lang, current: Step): StepsView {
  const at = STEPS.indexOf(current)
  return {
    label: t(lang, 'checkout.steps'), title: t(lang, STEP_NAME[current]),
    items: STEPS.map((s, i) => ({ name: t(lang, STEP_NAME[s]), href: i < at ? hrefFor(lang, { checkout: s }) : null, current: i === at, done: i < at })),
  }
}

type Spec = { key: Key; type?: FieldView['type']; auto: string; numeric?: boolean; short?: boolean; options?: FieldView['options'] }
const field = (lang: Lang, name: Field, value: string, spec: Spec): FieldView => ({
  name, label: t(lang, spec.key), type: spec.type ?? 'text', autoComplete: spec.auto,
  inputMode: spec.numeric ? 'numeric' : null, max: LIMITS[name], value, short: spec.short ?? false, options: spec.options ?? null,
})

/** Контакты: почта, имя с фамилией парой, телефон. Автозаполнение — токены
 *  WHATWG (WCAG 1.3.5): браузер подставляет то, что знает. */
export function contactView(lang: Lang, contact: Contact | null): ContactView {
  const c = contact ?? { email: '', firstName: '', lastName: '', phone: '' }
  return {
    rows: [
      [field(lang, 'email', c.email, { key: 'field.email', type: 'email', auto: 'email' })],
      [
        field(lang, 'firstName', c.firstName, { key: 'field.firstName', auto: 'given-name' }),
        field(lang, 'lastName', c.lastName, { key: 'field.lastName', auto: 'family-name' }),
      ],
      [field(lang, 'phone', c.phone, { key: 'field.phone', type: 'tel', auto: 'tel' })],
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

/* Адрес: улица; индекс (короткий) рядом с населённым пунктом — в Румынии
   адрес пишется «010011 București»; уезд — выбор из списка рынка. Улица —
   одна строка ввода, её токен `address-line1` (`street-address` — для
   многострочного поля). */
function addressRows(lang: Lang, a: Address | null): FieldRow[] {
  const v = a ?? { street: '', city: '', region: '', postalCode: '' }
  return [
    [field(lang, 'street', v.street, { key: 'field.street', auto: 'address-line1' })],
    [
      field(lang, 'postalCode', v.postalCode, { key: 'field.postalCode', auto: 'postal-code', numeric: true, short: true }),
      field(lang, 'city', v.city, { key: 'field.city', auto: 'address-level2' }),
    ],
    [field(lang, 'region', v.region, { key: 'field.region', auto: 'address-level1', options: { none: t(lang, 'field.regionNone'), values: MARKET.regions } })],
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
      ? { kind: 'address' as const, method: chosen.id, title: t(lang, 'delivery.address'), rows: addressRows(lang, a.delivery?.address ?? null), country: { label: t(lang, 'field.country'), value: countryName(lang, MARKET.country) }, submit: t(lang, 'delivery.next') }
      : pickupDetails(lang, chosen, a.delivery?.point?.id ?? null, a.pickup ?? { listed: false, city: '', points: [] })
  return {
    title: t(lang, 'delivery.title'),
    methods: a.methods.map((m) => ({
      id: m.id, name: m.name, description: m.description, price: priceOrFree(lang, m.price), checked: m.id === chosen?.id,
      meta: [t(lang, KIND[m.kind]), m.carrier, daysText(lang, m.days)].filter(Boolean).join(' · '),
    })),
    saved: chosen?.id ?? null,
    choose: t(lang, 'delivery.choose'),
    details,
  }
}

const contactLines = (lang: Lang, c: Contact): string[] => [t(lang, 'order.name', { first: c.firstName, last: c.lastName }), c.email, c.phone]
const methodHead = (d: Delivery): string => [d.method.name, d.method.carrier].filter(Boolean).join(' · ')
function placeLines(lang: Lang, d: Delivery): string[] {
  if (d.address) return [d.address.street, t(lang, 'order.cityLine', { postal: d.address.postalCode, city: d.address.city }), d.address.region]
  if (d.point) return [d.point.name, d.point.address, d.point.city]
  return []
}
const deliveryLines = (lang: Lang, d: Delivery): string[] => [methodHead(d), ...placeLines(lang, d)]

/** Товар сводки: имя, выбранные опции и количество строкой фактов, сумма
 *  строки и снимок — тот же, что в корзине. */
const itemsOf = (lang: Lang, cart: Cart): ItemView[] =>
  cart.lines.map((l: CartLine) => ({
    id: l.id, name: l.name, image: l.image, total: money(l.total, lang),
    facts: [lineFacts(l), t(lang, 'order.qty', { n: l.quantity })].filter(Boolean).join(' · '),
  }))

const recap = (lang: Lang, step: Step, lines: string[]): Recap => {
  const title = t(lang, STEP_NAME[step])
  return { title, lines, change: { label: t(lang, 'checkout.change'), aria: t(lang, 'checkout.changeStep', { step: title }), href: hrefFor(lang, { checkout: step }) } }
}

/** Сводка заказа рядом с шагом оформления: что покупается и сколько стоит —
 *  на каждом шаге, а не только на последнем (разбор 24.09.2026, O2). */
export const summaryView = (lang: Lang, cart: Cart): SummaryView => ({
  label: t(lang, 'cart.summary'), show: t(lang, 'checkout.summaryShow'), total: money(cart.total, lang),
  items: itemsOf(lang, cart), totals: totalsView(lang, cart),
})

/** Шаг оплаты: способы — допустимые, недопустимый выключен с причиной и не
 *  прячется; сверка того, что заказано, куда и кому; кнопка называет
 *  обязанность платить (И262); у кнопки — срок возврата из данных. */
export function paymentView(lang: Lang, a: { methods: PaymentMethod[]; checkout: Checkout; terms: { title: string; href: string }; returnDays: number | null }): PaymentPageView {
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
    pledges: pledgesView(lang, { payments: null, methods: null, returnDays: a.returnDays }),
    expected: { minor: String(c.cart.total.minor), currency: c.cart.total.currency },
  }
}

/** «Спасибо». Что дальше — из способов ЭТОГО заказа, их же словами: как
 *  приедет (способ, служба, срок, что делает служба) и как платится (способ
 *  и его условие). Своих обещаний витрина не пишет: письма образец не шлёт и
 *  не обещает (план 4). Детали — кому и куда; товары со снимками; итог. */
export function doneView(lang: Lang, order: Order): DonePageView {
  const d = order.delivery
  const days = daysText(lang, d.method.days)
  return {
    title: t(lang, 'done.title'), code: { label: t(lang, 'done.codeLabel'), value: order.code }, keep: t(lang, 'done.keep'),
    next: {
      title: t(lang, 'done.next'),
      steps: [
        { title: t(lang, 'checkout.step.delivery'), lines: [[methodHead(d), days].filter(Boolean).join(' · '), d.method.description], change: null },
        { title: t(lang, 'checkout.step.payment'), lines: [order.payment.name, order.payment.description], change: null },
      ],
    },
    review: t(lang, 'done.summary'),
    recaps: [
      { title: t(lang, 'checkout.step.contact'), lines: contactLines(lang, order.contact), change: null },
      { title: t(lang, d.address ? 'delivery.address' : 'delivery.points'), lines: placeLines(lang, d), change: null },
    ],
    itemsTitle: t(lang, 'order.items'), items: itemsOf(lang, order.cart), totals: totalsView(lang, order.cart),
    more: { label: t(lang, 'done.more'), href: hrefFor(lang, { catalog: true }) },
  }
}

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
