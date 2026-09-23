import { randomBytes } from 'node:crypto'
import type { Lang } from '../../locale.ts'
import type {
  Address, Cart, CartLine, Change, Checkout, Commerce, CommerceError, Contact, Delivery,
  DeliveryChoice, DeliveryMethod, Money, Order, PaymentMethod, PickupPoint, Result,
} from '../contract.ts'
import { PRODUCTS, type SampleProduct, type SampleVariant } from '../../products.ts'
import { METHODS, POINTS, PAYMENTS, COUPONS, type SampleMethod, type SamplePoint } from '../../shipping.ts'
import { MARKET } from '../../market.ts'
import { money as moneyText } from '../../money.ts'
import { deliveryReady } from '../../checkout-steps.ts'
import { bottle } from './art.ts'

type Line = { id: string; variantId: string; quantity: number }
type State = { lines: Line[]; coupons: string[]; contact: Contact | null; delivery: DeliveryChoice | null; lastOrder: string | null; seq: number }
type Placed = { code: string; placedAt: string; session: string; lines: Line[]; coupons: string[]; contact: Contact; delivery: DeliveryChoice; payment: string }
type Store = { sessions: Map<string, State>; orders: Map<string, Placed> }

const MAX = 99
/* Способ, у которого точек не больше трёх, отдаёт их без города. */
const FEW = 3
/* Остаток образца: у данных каталога есть только «в наличии / мало / нет». */
const AVAILABLE = { in: 50, low: 3, out: 0 } as const
const money = (minor: number): Money => ({ minor, currency: MARKET.currency })
const ok = <T,>(value: T): Result<T> => ({ ok: true, value })
const fail = <T,>(error: CommerceError): Change<T> => ({ ok: false, error })
const fold = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim()

/** Заготовленные сессии — корзина и шаги оформления уже заполнены: по ним
 *  отрисованные проверки меряют корзину и оформление полными (И263).
 *  Только у образца; у живого источника их нет. Заготовка — только для
 *  чтения: каждое чтение даёт её свежую копию, и запись (товар, заказ)
 *  ложится на копию — следующая проверка снова видит заготовку полной. */
export const FIXTURES = {
  cart: 'sample-cart', contact: 'sample-contact', address: 'sample-address',
  pickup: 'sample-pickup', ready: 'sample-ready', placed: 'sample-placed',
} as const
const SAMPLE_CONTACT: Contact = { email: 'ana.popescu@example.com', firstName: 'Ana', lastName: 'Popescu', phone: '0722 123 456' }
const SAMPLE_ADDRESS: Address = { street: 'Str. Exemplului 1', city: 'București', region: 'București', postalCode: '010011', country: MARKET.country }

/* Не замыкания внутри fixture(): не берут ничего снаружи, и линтер
   (unicorn/consistent-function-scoping) просит держать их уровнем выше. */
const seedLines = (): Line[] => [{ id: 'l1', variantId: 'uf-20-10', quantity: 1 }, { id: 'l2', variantId: 'cc-30', quantity: 2 }]
const seeded = (over: Partial<State>): State => ({ lines: seedLines(), coupons: ['CBD10'], contact: null, delivery: null, lastOrder: null, seq: 2, ...over })
const door = (): DeliveryChoice => ({ methodId: 'curier', address: SAMPLE_ADDRESS, pointId: null })
const FIXTURE: Record<string, () => State> = {
  [FIXTURES.cart]: () => seeded({}),
  [FIXTURES.contact]: () => seeded({ contact: SAMPLE_CONTACT }),
  [FIXTURES.address]: () => seeded({ contact: SAMPLE_CONTACT, delivery: { methodId: 'curier', address: null, pointId: null } }),
  [FIXTURES.pickup]: () => seeded({ contact: SAMPLE_CONTACT, delivery: { methodId: 'locker', address: null, pointId: null } }),
  [FIXTURES.ready]: () => seeded({ contact: SAMPLE_CONTACT, delivery: door() }),
  [FIXTURES.placed]: () => seeded({ lines: [], coupons: [], lastOrder: 'EXEMPLU1' }),
}
/** Свежая копия заготовки или null — это не заготовка. */
const fixture = (session: string): State | null => (Object.hasOwn(FIXTURE, session) ? FIXTURE[session]() : null)

function seed(): Store {
  return {
    sessions: new Map<string, State>(),
    orders: new Map<string, Placed>([
      ['EXEMPLU1', { code: 'EXEMPLU1', placedAt: '2026-09-23T10:00:00.000Z', session: FIXTURES.placed, lines: seedLines(), coupons: ['CBD10'], contact: SAMPLE_CONTACT, delivery: door(), payment: 'ramburs' }],
    ]),
  }
}

/* Корзины образца живут в памяти процесса и пропадают при перезапуске — как
   сказано в замысле. Хранилище — на globalThis: перезагрузка модуля в
   разработке не теряет корзину посреди оформления. */
const KEY = Symbol.for('storefront.sample.commerce')
const shelf = globalThis as unknown as Record<symbol, Store | undefined>
const store = (): Store => (shelf[KEY] ??= seed())
/** Для тестов: хранилище заново. */
export function resetSample(): void {
  shelf[KEY] = seed()
}
const live = (session: string | null): State | null => (session ? fixture(session) ?? store().sessions.get(session) ?? null : null)
const token = () => randomBytes(24).toString('base64url')
const orderCode = () => `RO${randomBytes(4).toString('hex').toUpperCase()}`

function variantOf(id: string): { p: SampleProduct; v: SampleVariant } | null {
  for (const p of PRODUCTS) {
    const v = p.variants.find((x) => x.id === id)
    if (v) return { p, v }
  }
  return null
}

function lineOf(l: Line, lang: Lang): CartLine | null {
  const found = variantOf(l.variantId)
  if (!found) return null
  const { p, v } = found
  return {
    id: l.id, productId: p.id, variantId: v.id, name: p.name[lang],
    options: p.groups.map((g) => {
      const code = v.options[g.code] ?? ''
      return { group: g.code, code, name: g.options.find((o) => o.code === code)?.name[lang] ?? code }
    }),
    image: { src: bottle(p.hue, p.label), alt: p.name[lang], width: 800, height: 800 },
    unit: money(v.price), quantity: l.quantity, total: money(v.price * l.quantity),
  }
}

function cartOf(s: State, lang: Lang): Cart {
  const lines = s.lines.flatMap((l) => lineOf(l, lang) ?? [])
  const subtotal = lines.reduce((sum, l) => sum + l.total.minor, 0)
  const discounts = s.coupons.map((code) => ({ code, amount: money(Math.round((subtotal * (COUPONS.get(code)?.percent ?? 0)) / 100)) }))
  const method = s.delivery ? METHODS.find((m) => m.id === s.delivery?.methodId) : undefined
  const delivery = method ? money(method.price) : null
  const off = discounts.reduce((sum, d) => sum + d.amount.minor, 0)
  return {
    lines, quantity: lines.reduce((n, l) => n + l.quantity, 0), subtotal: money(subtotal),
    discounts, delivery, total: money(subtotal - off + (delivery?.minor ?? 0)),
  }
}

const methodOf = (m: SampleMethod, lang: Lang): DeliveryMethod => ({
  id: m.id, kind: m.kind, carrier: m.carrier, name: m.name[lang], description: m.description[lang],
  price: money(m.price), days: m.days ? { min: m.days[0], max: m.days[1] } : null,
})
const pointOf = (p: SamplePoint, lang: Lang): PickupPoint => ({
  id: p.id, type: p.type, name: p.name, address: p.address, city: p.city, hours: p.hours ? p.hours[lang] : null,
})
const pointsOf = (methodId: string) => POINTS.filter((p) => p.method === methodId)

function deliveryOf(choice: DeliveryChoice | null, lang: Lang): Delivery | null {
  const m = choice ? METHODS.find((x) => x.id === choice.methodId) : undefined
  if (!choice || !m) return null
  const point = choice.pointId ? pointsOf(m.id).find((p) => p.id === choice.pointId) : undefined
  return { method: methodOf(m, lang), address: m.kind === 'address' ? choice.address : null, point: point ? pointOf(point, lang) : null }
}

const checkoutOf = (s: State, lang: Lang): Checkout => ({ cart: cartOf(s, lang), contact: s.contact, delivery: deliveryOf(s.delivery, lang) })

function paymentsOf(total: number, lang: Lang): PaymentMethod[] {
  return PAYMENTS.map((p) => {
    const eligible = p.limit === null || total <= p.limit
    const limit = p.limit === null ? '' : moneyText(money(p.limit), lang)
    return {
      code: p.code, kind: p.kind, name: p.name[lang], description: p.description[lang], eligible,
      reason: eligible || !p.reason ? null : p.reason[lang].replace('{limit}', limit),
    }
  })
}

function orderOf(o: Placed, lang: Lang): Order {
  const cart = cartOf({ lines: o.lines, coupons: o.coupons, contact: o.contact, delivery: o.delivery, lastOrder: null, seq: 0 }, lang)
  const delivery = deliveryOf(o.delivery, lang)
  const payment = paymentsOf(cart.total.minor, lang).find((p) => p.code === o.payment)
  if (!delivery || !payment) throw new Error(`sample order ${o.code}: broken record`)
  return { code: o.code, placedAt: o.placedAt, contact: o.contact, delivery, payment, cart }
}

const valid = (q: number) => Number.isInteger(q) && q >= 1 && q <= MAX

export const sampleCommerce: Commerce = {
  async checkout(session, lang) {
    const s = live(session)
    return ok(s ? checkoutOf(s, lang) : null)
  },
  async add(session, lang, variantId, quantity) {
    if (!valid(quantity)) return { session, change: fail('quantity') }
    const found = variantOf(variantId)
    if (!found) return { session, change: fail('not-found') }
    const current = live(session)
    const line = current?.lines.find((l) => l.variantId === variantId)
    const room = Math.min(AVAILABLE[found.v.stock], MAX) - (line?.quantity ?? 0)
    if (room <= 0) return { session, change: fail('out-of-stock') }
    const added = Math.min(quantity, room)
    let key = session
    let s = current
    if (!s || !key) {
      key = token()
      s = { lines: [], coupons: [], contact: null, delivery: null, lastOrder: null, seq: 0 }
      store().sessions.set(key, s)
    }
    if (line) line.quantity += added
    else s.lines.push({ id: `l${++s.seq}`, variantId, quantity: added })
    const value = cartOf(s, lang)
    return { session: key, change: added < quantity ? { ok: true, value, added: (line?.quantity ?? added) } : { ok: true, value } }
  },
  async setQuantity(session, lang, lineId, quantity) {
    const s = live(session)
    const line = s?.lines.find((l) => l.id === lineId)
    if (!s || !line) return fail('not-found')
    if (!valid(quantity)) return fail('quantity')
    const found = variantOf(line.variantId)
    const cap = found ? Math.min(AVAILABLE[found.v.stock], MAX) : 0
    if (cap === 0) return fail('out-of-stock')
    line.quantity = Math.min(quantity, cap)
    const value = cartOf(s, lang)
    return line.quantity < quantity ? { ok: true, value, added: line.quantity } : { ok: true, value }
  },
  async remove(session, lang, lineId) {
    const s = live(session)
    if (!s || !s.lines.some((l) => l.id === lineId)) return fail('not-found')
    s.lines = s.lines.filter((l) => l.id !== lineId)
    return { ok: true, value: cartOf(s, lang) }
  },
  async applyCoupon(session, lang, code) {
    const s = live(session)
    if (!s) return fail('not-found')
    const key = code.trim().toUpperCase()
    const coupon = COUPONS.get(key)
    if (!coupon) return fail('coupon-invalid')
    if (coupon.expired) return fail('coupon-expired')
    if (!s.coupons.includes(key)) s.coupons = [...s.coupons, key]
    return { ok: true, value: cartOf(s, lang) }
  },
  async removeCoupon(session, lang, code) {
    const s = live(session)
    if (!s) return fail('not-found')
    s.coupons = s.coupons.filter((x) => x !== code)
    return { ok: true, value: cartOf(s, lang) }
  },
  async setContact(session, lang, contact) {
    const s = live(session)
    if (!s || !s.lines.length) return fail('empty-cart')
    s.contact = contact
    return { ok: true, value: checkoutOf(s, lang) }
  },
  async deliveryMethods(_session, lang) {
    return ok(METHODS.map((m) => methodOf(m, lang)))
  },
  async pickupPoints(lang, methodId, city) {
    const m = METHODS.find((x) => x.id === methodId && x.kind === 'pickup')
    if (!m) return { ok: false, reason: 'not-found' }
    const all = pointsOf(m.id)
    const want = fold(city)
    const found = all.length <= FEW ? all : want ? all.filter((p) => fold(p.city).startsWith(want)) : []
    return ok(found.map((p) => pointOf(p, lang)))
  },
  async setDelivery(session, lang, choice) {
    const s = live(session)
    if (!s || !s.lines.length) return fail('empty-cart')
    const m = METHODS.find((x) => x.id === choice.methodId)
    if (!m) return fail('not-found')
    const points = pointsOf(m.id)
    if (choice.pointId && !points.some((p) => p.id === choice.pointId)) return fail('point-missing')
    const keep = s.delivery?.methodId === m.id && !choice.address && !choice.pointId
    if (!keep) {
      /* Способ с одной точкой (магазин продавца) выбирается целиком: просить
         выбрать единственную точку — лишний шаг. */
      const only = m.kind === 'pickup' && points.length === 1 ? points[0].id : null
      s.delivery = {
        methodId: m.id,
        address: m.kind === 'address' ? choice.address : null,
        pointId: m.kind === 'pickup' ? (choice.pointId ?? only) : null,
      }
    }
    return { ok: true, value: checkoutOf(s, lang) }
  },
  async paymentMethods(session, lang) {
    const s = live(session)
    if (!s) return { ok: false, reason: 'not-found' }
    return ok(paymentsOf(cartOf(s, lang).total.minor, lang))
  },
  async placeOrder(session, lang, paymentCode, expected) {
    const s = live(session)
    if (!s || !s.lines.length) return fail('empty-cart')
    if (!s.contact) return fail('no-contact')
    const checkout = checkoutOf(s, lang)
    if (!s.delivery || !deliveryReady(checkout.delivery)) return fail('no-delivery')
    const total = checkout.cart.total
    if (total.minor !== expected.minor || total.currency !== expected.currency) return fail('changed')
    const pay = paymentsOf(checkout.cart.total.minor, lang).find((p) => p.code === paymentCode)
    if (!pay || !pay.eligible) return fail('payment-ineligible')
    for (const l of s.lines) {
      const found = variantOf(l.variantId)
      if (!found || l.quantity > AVAILABLE[found.v.stock]) return fail('out-of-stock')
    }
    const placed: Placed = {
      code: orderCode(), placedAt: new Date().toISOString(), session,
      lines: s.lines, coupons: s.coupons, contact: s.contact, delivery: s.delivery, payment: pay.code,
    }
    store().orders.set(placed.code, placed)
    Object.assign(s, { lines: [], coupons: [], contact: null, delivery: null, lastOrder: placed.code })
    return { ok: true, value: orderOf(placed, lang) }
  },
  async lastOrder(session, lang) {
    const s = live(session)
    const placed = s?.lastOrder ? store().orders.get(s.lastOrder) : undefined
    return ok(placed && placed.session === session ? orderOf(placed, lang) : null)
  },
}

