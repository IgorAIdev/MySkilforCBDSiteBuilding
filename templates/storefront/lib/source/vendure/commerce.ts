import type { Lang } from '../../locale.ts'
import type { Address, Cart, CartLine, Change, Checkout, Commerce, CommerceError, Contact, Delivery, DeliveryMethod, Image, Money, Order, PaymentKind, PaymentMethod, Result } from '../contract.ts'
import { shopFetch } from './core/request.mjs'
import { assetImage, type Asset } from './image.ts'
import type { VendureEnv } from './catalog.ts'

/* Покупка через Vendure Shop API (план 4, торговая половина; references/
   vendure.md, «Корзина», «Оформление»). Итоги, скидки и доставку считает
   движок — витрина их только печатает. Сессия витрины — токен сессии движка
   (`vendure-auth-token`); сервер держит его в cookie `httpOnly`
   (lib/session.ts), в браузер он не уходит.

   Постановка заказа — только словом окружения `VENDURE_PLACE_ORDERS=on`.
   Без него оформление доходит до оплаты и говорит «заказы выключены»
   (`orders-off`): витрина, подключённая к действующему магазину для показа,
   не должна ставить в нём настоящих заказов.

   Способы с точкой выдачи (автомат, офис) не показываются: точки отдаёт не
   движок, а служба перевозчика, и пока её нет, способ с точкой — тупик на
   шаге выбора точки. Остаются способы до адреса. */

type Fetched<T> = { ok: true; data: T; authToken?: string } | { ok: false; kind: string; message: string; errors?: { extensions?: { code?: string } }[] }
type Translation = { languageCode: string; slug: string }
type VOrder = {
  id: string; code: string; state: string; orderPlacedAt: string | null; totalQuantity: number
  subTotalWithTax: number; totalWithTax: number; shippingWithTax: number; currencyCode: string; couponCodes: string[]
  discounts: { description: string; amountWithTax: number }[]
  lines: {
    id: string; quantity: number; unitPriceWithTax: number; linePriceWithTax: number; featuredAsset: Asset | null
    productVariant: { id: string; name: string; options: { code: string; name: string; group: { code: string; name: string } }[]; product: { slug: string; name: string; translations: Translation[]; featuredAsset: Asset | null } }
  }[]
  customer: { emailAddress: string; firstName: string; lastName: string; phoneNumber: string | null } | null
  shippingAddress: { streetLine1: string | null; city: string | null; province: string | null; postalCode: string | null; countryCode: string | null } | null
  shippingLines: { priceWithTax: number; shippingMethod: VMethod }[]
  payments: { method: string }[] | null
}
type VMethod = { id: string; code: string; name: string; description: string; priceWithTax?: number }
type Union = { __typename: string; errorCode?: string; message?: string; quantityAvailable?: number; order?: VOrder } & Partial<VOrder>

const ASSET = `preview width height`
const ORDER = `
  id code state orderPlacedAt totalQuantity subTotalWithTax totalWithTax shippingWithTax currencyCode couponCodes
  discounts { description amountWithTax }
  lines { id quantity unitPriceWithTax linePriceWithTax featuredAsset { ${ASSET} }
    productVariant { id name options { code name group { code name } } product { slug name translations { languageCode slug } featuredAsset { ${ASSET} } } } }
  customer { emailAddress firstName lastName phoneNumber }
  shippingAddress { streetLine1 city province postalCode countryCode }
  shippingLines { priceWithTax shippingMethod { id code name description } }
  payments { method }
`
/** Ответ записи — заказ или ошибка движка по `__typename` (result.mjs).
 *  Нехватка остатка — только у записей количества: чужой вариант в ответе
 *  движок не принимает, и запрос падает целиком. */
const UNION = `__typename ... on Order { ${ORDER} } ... on ErrorResult { errorCode message }`
const STOCK_UNION = `${UNION} ... on InsufficientStockError { quantityAvailable order { ${ORDER} } }`

/** Гость видит свой заказ два часа (стратегия движка по умолчанию). */
const RECENT = 2 * 60 * 60 * 1000
const MAX_QTY = 99

const PAYMENT_KIND: Record<string, PaymentKind> = { cod: 'on-delivery', cash: 'on-delivery', bank: 'transfer', transfer: 'transfer' }
const kindOfPayment = (code: string): PaymentKind => PAYMENT_KIND[code] ?? 'online'

/* Перевод ответов движка — без состояния адаптера. */
const image = (a: Asset | null, alt: string): Image => (a ? assetImage(a, alt, 200) : { src: '', alt, width: 200, height: 200 })
const money = (o: VOrder, minor: number): Money => ({ minor, currency: o.currencyCode })

const methodOf = (m: VMethod, currency: string): DeliveryMethod => ({
  id: m.id, kind: /address/.test(m.code) ? 'address' : 'pickup',
  /* Служба — часть имени до тире («Служба — до адрес»): так её пишет админка. */
  carrier: m.name.includes(' — ') ? m.name.split(' — ')[0] : null,
  name: m.name, description: m.description, price: { minor: m.priceWithTax ?? 0, currency }, days: null,
})
const contactOf = (o: VOrder): Contact | null => (o.customer
  ? { email: o.customer.emailAddress, firstName: o.customer.firstName, lastName: o.customer.lastName, phone: o.customer.phoneNumber ?? '' }
  : null)
const deliveryOf = (o: VOrder): Delivery | null => {
  const line = o.shippingLines[0]
  if (!line) return null
  const a = o.shippingAddress
  const address: Address | null = a?.streetLine1 ? { street: a.streetLine1, city: a.city ?? '', region: a.province ?? '', postalCode: a.postalCode ?? '', country: a.countryCode ?? '' } : null
  return { method: methodOf({ ...line.shippingMethod, priceWithTax: line.priceWithTax }, o.currencyCode), address, point: null }
}
const fail = <T,>(error: CommerceError): Change<T> => ({ ok: false, error })
const valid = (q: number) => Number.isInteger(q) && q >= 1 && q <= MAX_QTY

export function vendureCommerce(env: VendureEnv & { placeOrders: boolean }, fetchImpl: typeof fetch = globalThis.fetch): Commerce {
  /* Заказ, поставленный этой сессией, — код и время: гость потом находит его
     по коду (`orderByCode`). Память процесса сервера — как у образца; живой
     магазин с несколькими серверами держит это в cookie (план 4). */
  const placed = new Map<string, { code: string; at: number }>()

  let channel: Promise<{ defaultLanguageCode: string; availableLanguageCodes: string[] } | null> | null = null
  const ask = <T,>(query: string, variables: Record<string, unknown>, session: string | null, languageCode?: string): Promise<Fetched<T>> =>
    shopFetch({ apiUrl: env.apiUrl, query, variables, channelToken: env.channelToken, languageCode, authToken: session ?? undefined }, { fetch: fetchImpl, init: { cache: 'no-store' } }) as Promise<Fetched<T>>
  const channelOf = () => (channel ??= ask<{ activeChannel: { defaultLanguageCode: string; availableLanguageCodes: string[] } }>(`{ activeChannel { defaultLanguageCode availableLanguageCodes } }`, {}, null)
    .then((r) => (r.ok ? r.data.activeChannel : null))
    .then((c) => { if (!c) channel = null; return c }))
  const speak = async (lang: Lang): Promise<string | undefined> => {
    const c = await channelOf()
    if (!c) return undefined
    return c.availableLanguageCodes.includes(lang) ? lang : c.availableLanguageCodes.includes(env.fallbackLang) ? env.fallbackLang : c.defaultLanguageCode
  }
  const nativeSlug = async (p: { slug: string; translations: Translation[] }) => {
    const c = await channelOf()
    return p.translations.find((t) => t.languageCode === c?.defaultLanguageCode)?.slug ?? p.slug
  }

  const cartOf = async (o: VOrder): Promise<Cart> => {
    const lines: CartLine[] = await Promise.all(o.lines.map(async (l) => ({
      id: l.id, productId: await nativeSlug(l.productVariant.product), variantId: l.productVariant.id,
      name: l.productVariant.product.name,
      options: l.productVariant.options.map((x) => ({ group: x.group.code, code: x.code, name: x.name })),
      image: image(l.featuredAsset ?? l.productVariant.product.featuredAsset, l.productVariant.product.name),
      unit: money(o, l.unitPriceWithTax), quantity: l.quantity, total: money(o, l.linePriceWithTax),
    })))
    return {
      lines, quantity: o.totalQuantity, subtotal: money(o, o.subTotalWithTax),
      /* Скидку движок пишет отрицательной суммой; витрина печатает её со
         знаком сама. Имя скидки — код купона, когда он один на скидку. */
      discounts: o.discounts.map((d, i) => ({ code: o.couponCodes[i] ?? d.description, amount: money(o, Math.abs(d.amountWithTax)) })),
      delivery: o.shippingLines.length ? money(o, o.shippingWithTax) : null,
      total: money(o, o.totalWithTax),
    }
  }
  const checkoutOf = async (o: VOrder): Promise<Checkout> => ({ cart: await cartOf(o), contact: contactOf(o), delivery: deliveryOf(o) })

  const activeOrder = async (session: string | null, lang: Lang): Promise<Result<VOrder | null>> => {
    if (!session) return { ok: true, value: null }
    const r = await ask<{ activeOrder: VOrder | null }>(`{ activeOrder { ${ORDER} } }`, {}, session, await speak(lang))
    return r.ok ? { ok: true, value: r.data.activeOrder } : { ok: false, reason: 'unavailable' }
  }
  /** Ответ записи корзины → изменение корзины. */
  const cartChange = async (r: Fetched<Record<string, Union | null>>, field: string): Promise<Change<Cart>> => {
    if (!r.ok) return fail(r.errors?.some((e) => e.extensions?.code === 'ENTITY_NOT_FOUND') ? 'not-found' : 'unavailable')
    const u = r.data[field]
    if (!u) return fail('empty-cart')
    if (u.__typename === 'Order') return { ok: true, value: await cartOf(u as VOrder) }
    if (u.__typename === 'InsufficientStockError' && u.order) {
      return u.quantityAvailable ? { ok: true, value: await cartOf(u.order), added: u.quantityAvailable } : fail('out-of-stock')
    }
    const CODES: Record<string, CommerceError> = {
      ORDER_LIMIT_ERROR: 'quantity', NEGATIVE_QUANTITY_ERROR: 'quantity',
      COUPON_CODE_INVALID_ERROR: 'coupon-invalid', COUPON_CODE_LIMIT_ERROR: 'coupon-invalid', COUPON_CODE_EXPIRED_ERROR: 'coupon-expired',
      NO_ACTIVE_ORDER_ERROR: 'empty-cart',
    }
    return fail(CODES[u.errorCode ?? ''] ?? 'unavailable')
  }
  const deliveryMethods = async (session: string | null, lang: Lang): Promise<Result<DeliveryMethod[]>> => {
    if (!session) return { ok: true, value: [] }
    const o = await activeOrder(session, lang)
    if (!o.ok) return o
    const r = await ask<{ eligibleShippingMethods: VMethod[] }>(`{ eligibleShippingMethods { id code name description priceWithTax } }`, {}, session, await speak(lang))
    if (!r.ok) return { ok: false, reason: 'unavailable' }
    const currency = o.value?.currencyCode ?? 'EUR'
    return { ok: true, value: r.data.eligibleShippingMethods.map((m) => methodOf(m, currency)).filter((m) => m.kind === 'address') }
  }

  return {
    async checkout(session, lang) {
      const o = await activeOrder(session, lang)
      if (!o.ok) return o
      return { ok: true, value: o.value ? await checkoutOf(o.value) : null }
    },
    async add(session, lang, variantId, quantity) {
      if (!valid(quantity)) return { session, change: fail('quantity') }
      const r = await ask<Record<string, Union | null>>(`mutation ($id: ID!, $qty: Int!) { addItemToOrder(productVariantId: $id, quantity: $qty) { ${STOCK_UNION} } }`, { id: variantId, qty: quantity }, session, await speak(lang))
      /* Движок завёл или продлил сессию — её токен и есть сессия витрины. */
      const next = r.ok && r.authToken ? r.authToken : session
      return { session: next, change: await cartChange(r, 'addItemToOrder') }
    },
    async setQuantity(session, lang, lineId, quantity) {
      if (!valid(quantity)) return fail('quantity')
      return cartChange(await ask<Record<string, Union | null>>(`mutation ($id: ID!, $qty: Int!) { adjustOrderLine(orderLineId: $id, quantity: $qty) { ${STOCK_UNION} } }`, { id: lineId, qty: quantity }, session, await speak(lang)), 'adjustOrderLine')
    },
    async remove(session, lang, lineId) {
      return cartChange(await ask<Record<string, Union | null>>(`mutation ($id: ID!) { removeOrderLine(orderLineId: $id) { ${UNION} } }`, { id: lineId }, session, await speak(lang)), 'removeOrderLine')
    },
    async applyCoupon(session, lang, code) {
      return cartChange(await ask<Record<string, Union | null>>(`mutation ($code: String!) { applyCouponCode(couponCode: $code) { ${UNION} } }`, { code }, session, await speak(lang)), 'applyCouponCode')
    },
    async removeCoupon(session, lang, code) {
      return cartChange(await ask<Record<string, Union | null>>(`mutation ($code: String!) { removeCouponCode(couponCode: $code) { __typename ... on Order { ${ORDER} } } }`, { code }, session, await speak(lang)), 'removeCouponCode')
    },
    async setContact(session, lang, contact) {
      const languageCode = await speak(lang)
      const r = await ask<{ setCustomerForOrder: Union }>(`mutation ($input: CreateCustomerInput!) { setCustomerForOrder(input: $input) { ${UNION} } }`,
        { input: { emailAddress: contact.email, firstName: contact.firstName, lastName: contact.lastName, phoneNumber: contact.phone } }, session, languageCode)
      if (!r.ok) return fail('unavailable')
      const u = r.data.setCustomerForOrder
      /* Вошедший покупатель — уже клиент заказа: шаг пропускается. */
      if (u.__typename !== 'Order' && u.errorCode !== 'ALREADY_LOGGED_IN_ERROR') return fail(u.errorCode === 'NO_ACTIVE_ORDER_ERROR' ? 'empty-cart' : 'no-contact')
      const o = await activeOrder(session, lang)
      return o.ok && o.value ? { ok: true, value: await checkoutOf(o.value) } : fail('empty-cart')
    },
    deliveryMethods,
    async pickupPoints() {
      return { ok: true, value: [] }
    },
    async setDelivery(session, lang, choice) {
      const languageCode = await speak(lang)
      const methods = await deliveryMethods(session, lang)
      if (!methods.ok) return fail('unavailable')
      const m = methods.value.find((x) => x.id === choice.methodId)
      if (!m) return fail('not-found')
      if (choice.address) {
        const a = choice.address
        const r = await ask<{ setOrderShippingAddress: Union }>(`mutation ($input: CreateAddressInput!) { setOrderShippingAddress(input: $input) { __typename ... on ErrorResult { errorCode } } }`,
          { input: { streetLine1: a.street, city: a.city, province: a.region, postalCode: a.postalCode, countryCode: a.country } }, session, languageCode)
        if (!r.ok || r.data.setOrderShippingAddress.__typename !== 'Order') return fail('no-delivery')
      }
      const r = await ask<{ setOrderShippingMethod: Union }>(`mutation ($id: [ID!]!) { setOrderShippingMethod(shippingMethodId: $id) { __typename ... on ErrorResult { errorCode } } }`, { id: [m.id] }, session, languageCode)
      if (!r.ok || r.data.setOrderShippingMethod.__typename !== 'Order') return fail('no-delivery')
      const o = await activeOrder(session, lang)
      return o.ok && o.value ? { ok: true, value: await checkoutOf(o.value) } : fail('empty-cart')
    },
    async paymentMethods(session, lang) {
      const r = await ask<{ eligiblePaymentMethods: { code: string; name: string; description: string; isEligible: boolean; eligibilityMessage: string | null }[] }>(`{ eligiblePaymentMethods { code name description isEligible eligibilityMessage } }`, {}, session, await speak(lang))
      if (!r.ok) return { ok: false, reason: 'unavailable' }
      return { ok: true, value: r.data.eligiblePaymentMethods.map((p): PaymentMethod => ({ code: p.code, kind: kindOfPayment(p.code), name: p.name, description: p.description, eligible: p.isEligible, reason: p.eligibilityMessage })) }
    },
    async placeOrder(session, lang, paymentCode, expected) {
      const o = await activeOrder(session, lang)
      if (!o.ok) return fail('unavailable')
      const order = o.value
      if (!order || !order.lines.length) {
        const last = placed.get(session)
        return fail(last && Date.now() - last.at < RECENT ? 'placed' : 'empty-cart')
      }
      if (!order.customer) return fail('no-contact')
      if (!order.shippingLines.length) return fail('no-delivery')
      if (order.totalWithTax !== expected.minor || order.currencyCode !== expected.currency) return fail('changed')
      if (!env.placeOrders) return fail('orders-off')
      const languageCode = await speak(lang)
      /* В `ArrangingPayment` — только из `AddingItems`; повтор после отказа
         платежа идёт без перехода (references/vendure.md, шаг 4). */
      if (order.state === 'AddingItems') {
        const t = await ask<{ transitionOrderToState: Union | null }>(`mutation { transitionOrderToState(state: "ArrangingPayment") { __typename ... on ErrorResult { errorCode } } }`, {}, session, languageCode)
        if (!t.ok || t.data.transitionOrderToState?.__typename !== 'Order') return fail('unavailable')
      }
      const r = await ask<{ addPaymentToOrder: Union }>(`mutation ($input: PaymentInput!) { addPaymentToOrder(input: $input) { ${UNION} } }`, { input: { method: paymentCode, metadata: {} } }, session, languageCode)
      if (!r.ok) return fail('unavailable')
      const u = r.data.addPaymentToOrder
      if (u.__typename !== 'Order') {
        return fail(u.errorCode === 'INELIGIBLE_PAYMENT_METHOD_ERROR' ? 'payment-ineligible' : u.errorCode === 'PAYMENT_DECLINED_ERROR' || u.errorCode === 'PAYMENT_FAILED_ERROR' ? 'payment-declined' : 'unavailable')
      }
      const done = u as VOrder
      placed.set(session, { code: done.code, at: Date.now() })
      return { ok: true, value: await orderOf(done, lang) }
    },
    async lastOrder(session, lang) {
      const last = session ? placed.get(session) : undefined
      if (!session || !last || Date.now() - last.at >= RECENT) return { ok: true, value: null }
      const r = await ask<{ orderByCode: VOrder | null }>(`query ($code: String!) { orderByCode(code: $code) { ${ORDER} } }`, { code: last.code }, session, await speak(lang))
      if (!r.ok) return { ok: false, reason: 'unavailable' }
      return { ok: true, value: r.data.orderByCode ? await orderOf(r.data.orderByCode, lang) : null }
    },
  }

  async function orderOf(o: VOrder, lang: Lang): Promise<Order> {
    const code = o.payments?.[0]?.method ?? ''
    const methods = await ask<{ eligiblePaymentMethods: { code: string; name: string; description: string }[] }>(`{ eligiblePaymentMethods { code name description } }`, {}, null, await speak(lang))
    const pm = methods.ok ? methods.data.eligiblePaymentMethods.find((p) => p.code === code) : undefined
    return {
      code: o.code, placedAt: o.orderPlacedAt ?? new Date().toISOString(),
      contact: contactOf(o) ?? { email: '', firstName: '', lastName: '', phone: '' },
      delivery: deliveryOf(o) ?? { method: { id: '', kind: 'address', carrier: null, name: '', description: '', price: { minor: 0, currency: o.currencyCode }, days: null }, address: null, point: null },
      payment: { code, kind: kindOfPayment(code), name: pm?.name ?? code, description: pm?.description ?? '', eligible: true, reason: null },
      cart: await cartOf(o),
    }
  }
}
