import { test } from 'node:test'
import assert from 'node:assert/strict'
import { packOf, vendureEnv, vendureSource } from '../lib/source/vendure/catalog.ts'
import { vendureCommerce } from '../lib/source/vendure/commerce.ts'

/* Торговля из Vendure (SOURCE=vendure) — против подставного движка: форма
   ответов снята с движка cbdin (Vendure 3.7) 25.09.2026. Живой движок тесты
   не зовут: проверка не должна ни зависеть от сети, ни трогать магазин. */

const ENV = vendureEnv({ VENDURE_SHOP_API_URL: 'https://engine.test/shop-api', VENDURE_CHANNEL_TOKEN: 'shop' })

type Body = { query: string; variables: Record<string, unknown> }
/** Подставной движок: ответ по признаку запроса; `seen` — что спросили. */
function engine(answer: (body: Body, headers: Record<string, string>) => unknown) {
  const seen: { body: Body; url: string; headers: Record<string, string> }[] = []
  const fetchImpl = (async (url: string, init: RequestInit) => {
    const body = JSON.parse(String(init.body)) as Body
    const headers = init.headers as Record<string, string>
    seen.push({ body, url, headers })
    const data = answer(body, headers)
    return new Response(JSON.stringify(data && typeof data === 'object' && 'errors' in data ? data : { data }), { status: 200, headers: { 'content-type': 'application/json', 'vendure-auth-token': 'tok-1' } })
  }) as unknown as typeof fetch
  return { fetchImpl, seen }
}

const CHANNEL = { activeChannel: { defaultLanguageCode: 'bg', availableLanguageCodes: ['bg', 'en'], defaultCurrencyCode: 'EUR' } }
const product = (id: string, over: Record<string, unknown> = {}) => ({
  id, name: `Oil ${id}`, slug: `oil-${id}-en`, description: '<p>Full spectrum oil. Second sentence.</p>',
  translations: [{ languageCode: 'bg', slug: `oil-${id}` }, { languageCode: 'en', slug: `oil-${id}-en` }],
  featuredAsset: { preview: 'https://engine.test/assets/preview/a.webp', width: 400, height: 400 }, assets: [],
  collections: [{ id: '10', slug: 'oil-en', translations: [{ languageCode: 'bg', slug: 'oil' }] }],
  facetValues: [{ code: 'oil', facet: { code: 'category' } }],
  customFields: { brand: 'Nature', volume: '10ml', strength: '1000mg', wasPrice: 3600, seoDescription: null },
  optionGroups: [], variants: [{ id: `v${id}`, sku: `S${id}`, name: `Oil ${id}`, priceWithTax: 3000, stockLevel: 'IN_STOCK', options: [] }],
  ...over,
})
const FACETS = [
  { count: 2, facetValue: { id: '7', code: 'relax', name: 'relax', facet: { id: '1', code: 'effect', name: 'Effect' } } },
  { count: 1, facetValue: { id: '8', code: 'sleep', name: 'sleep', facet: { id: '1', code: 'effect', name: 'Effect' } } },
]

test('vendure: pack from the engine fields — measure from volume, CBD from strength, in either language', () => {
  assert.deepEqual(packOf('10ml', '1000mg'), { mg: 1000, size: 10, unit: 'ml' })
  assert.deepEqual(packOf('30 capsules', '750mg CBD+CBDA'), { mg: 750, size: 30, unit: 'pcs' })
  assert.deepEqual(packOf('30 капсули', null), { mg: null, size: 30, unit: 'pcs' })
  assert.deepEqual(packOf('50 g', '500 mg'), { mg: 500, size: 50, unit: 'g' })
  assert.equal(packOf('a bottle', '1000mg'), null, 'не разобралось — молчим, а не выдумываем')
  assert.throws(() => vendureEnv({}), /VENDURE_SHOP_API_URL/)
})

test('vendure: the listing pages, filters OR within a facet, counts each facet against the others, names unknown filters', async () => {
  const { fetchImpl, seen } = engine(({ query, variables }) => {
    if (query.includes('activeChannel')) return CHANNEL
    /* Товары — раньше разделов: запрос товаров спрашивает и их разделы. */
    if (query.includes('products(')) return { products: { items: [product('1'), product('2')] } }
    if (query.includes('collections(')) return { collections: { items: [{ id: '10', slug: 'oil-en', name: 'Oils', description: '', featuredAsset: null, translations: [{ languageCode: 'bg', slug: 'oil' }] }] } }
    const input = (variables as { input: { take: number } }).input
    if (input.take === 0) return { search: { facetValues: FACETS } }
    return { search: { totalItems: 26, items: [{ productId: '1', productName: 'Oil 1', slug: 'oil-1-en', priceWithTax: { min: 3000, max: 3000 }, productAsset: null }, { productId: '2', productName: 'Oil 2', slug: 'oil-2-en', priceWithTax: { min: 3000, max: 3000 }, productAsset: null }], facetValues: FACETS } }
  })
  const s = vendureSource(ENV, fetchImpl)
  const r = await s.listing('ro', { category: 'oil', facets: { effect: ['relax', 'sleep'], ghost: ['x'] }, sort: 'price-asc', page: '2' })
  assert.ok(r.ok)
  assert.equal(r.value.page, 2)
  assert.equal(r.value.pages, 2, '26 товаров по 24 — две страницы')
  assert.deepEqual(r.value.invalid, ['ghost:x'], 'незнакомый фильтр назван, а не угадан')
  assert.equal(r.value.items[0].id, 'oil-1', 'адрес — slug языка канала: один на все языки')
  assert.equal(r.value.items[0].category, 'oil')
  assert.deepEqual(r.value.items[0].was, { minor: 3600, currency: 'EUR' })
  assert.equal(r.value.items[0].variant, 'v1', 'один вариант — кладётся с полки сразу')
  assert.equal(r.value.items[0].strength, 'percent', 'масло продаётся концентрацией')
  const main = seen.find((x) => (x.body.variables as { input?: { take: number } }).input?.take === 24)!
  const input = (main.body.variables as { input: Record<string, unknown> }).input
  assert.deepEqual(input.facetValueFilters, [{ or: ['7', '8'] }], 'два значения одной грани — ИЛИ')
  assert.equal(input.skip, 24)
  assert.equal(input.collectionId, '10')
  assert.deepEqual(input.sort, { price: 'ASC' })
  assert.match(main.url, /languageCode=en/, 'румынской страницы у канала нет — спрашиваем запасным языком, а не болгарским')
  assert.equal(main.headers['vendure-token'], 'shop', 'канал — явно')
  const past = await s.listing('en', { facets: {}, sort: 'popular', page: '9' })
  assert.deepEqual(past, { ok: false, reason: 'not-found' }, 'страница за концом — «не найдено», а не пустая')
  assert.deepEqual(await s.listing('en', { facets: {}, sort: 'popular', page: '0' }), { ok: false, reason: 'bad-request' })
})

test('vendure: a missing product is not found, a silent engine is unavailable — two different states', async () => {
  const quiet = vendureSource(ENV, (async () => { throw new Error('offline') }) as unknown as typeof fetch)
  assert.deepEqual(await quiet.product('en', 'oil-1'), { ok: false, reason: 'unavailable' })
  const { fetchImpl } = engine(({ query }) => (query.includes('activeChannel') ? CHANNEL : { product: null }))
  assert.deepEqual(await vendureSource(ENV, fetchImpl).product('en', 'nope'), { ok: false, reason: 'not-found' })
})

const ORDER = (over: Record<string, unknown> = {}) => ({
  __typename: 'Order', id: '21', code: 'ABC', state: 'AddingItems', orderPlacedAt: null, totalQuantity: 1,
  subTotalWithTax: 3000, totalWithTax: 3490, shippingWithTax: 490, currencyCode: 'EUR', couponCodes: [],
  discounts: [], payments: [],
  lines: [{ id: 'l1', quantity: 1, unitPriceWithTax: 3000, linePriceWithTax: 3000, featuredAsset: null, productVariant: { id: 'v1', name: 'Oil 1', options: [], product: { slug: 'oil-1-en', name: 'Oil 1', translations: [{ languageCode: 'bg', slug: 'oil-1' }], featuredAsset: null } } }],
  customer: { emailAddress: 'a@b.c', firstName: 'A', lastName: 'B', phoneNumber: null },
  shippingAddress: { streetLine1: 'ul. 1', city: 'Sofia', province: '', postalCode: '1000', countryCode: 'BG' },
  shippingLines: [{ priceWithTax: 490, shippingMethod: { id: '6', code: 'econt-address', name: 'Econt — до адрес', description: '' } }],
  ...over,
})

test('vendure: the cart reads every result — partial stock, invalid coupon, the engine session becomes the storefront session', async () => {
  const { fetchImpl } = engine(({ query }) => {
    if (query.includes('activeChannel')) return CHANNEL
    if (query.includes('addItemToOrder')) return { addItemToOrder: { __typename: 'InsufficientStockError', errorCode: 'INSUFFICIENT_STOCK_ERROR', quantityAvailable: 2, order: ORDER() } }
    if (query.includes('applyCouponCode')) return { applyCouponCode: { __typename: 'CouponCodeInvalidError', errorCode: 'COUPON_CODE_INVALID_ERROR', message: 'nope' } }
    return null
  })
  const c = vendureCommerce({ ...ENV, placeOrders: false }, fetchImpl)
  const added = await c.add(null, 'en', 'v1', 5)
  assert.equal(added.session, 'tok-1', 'движок завёл сессию — её токен и есть сессия витрины')
  assert.ok(added.change.ok)
  assert.equal(added.change.added, 2, 'нехватка остатка — частичный успех, а не молчаливая удача')
  assert.equal(added.change.value.lines[0].productId, 'oil-1')
  assert.deepEqual(await c.applyCoupon('tok-1', 'en', 'NOPE'), { ok: false, error: 'coupon-invalid' })
  assert.deepEqual((await c.add(null, 'en', 'v1', 0)).change, { ok: false, error: 'quantity' })
})

test('vendure: no order is placed in a live shop without VENDURE_PLACE_ORDERS=on; a changed total never places', async () => {
  const placed: string[] = []
  const { fetchImpl } = engine(({ query }) => {
    if (query.includes('activeChannel')) return CHANNEL
    if (query.includes('activeOrder')) return { activeOrder: ORDER() }
    if (query.includes('addPaymentToOrder') || query.includes('transitionOrderToState')) { placed.push(query); return null }
    if (query.includes('eligibleShippingMethods')) return { eligibleShippingMethods: [{ id: '1', code: 'box-now-locker', name: 'BOX NOW — автомат', description: '', priceWithTax: 290 }, { id: '6', code: 'econt-address', name: 'Econt — до адрес', description: '', priceWithTax: 490 }] }
    return null
  })
  const off = vendureCommerce({ ...ENV, placeOrders: false }, fetchImpl)
  assert.deepEqual(await off.placeOrder('tok-1', 'en', 'cod', { minor: 3490, currency: 'EUR' }), { ok: false, error: 'orders-off' })
  assert.deepEqual(await off.placeOrder('tok-1', 'en', 'cod', { minor: 1, currency: 'EUR' }), { ok: false, error: 'changed' })
  assert.deepEqual(placed, [], 'движку не ушло ни перехода, ни оплаты')
  /* Точки выдачи отдаёт служба перевозчика, не движок: способ с точкой —
     тупик на шаге точки, и его нет в списке. */
  const methods = await off.deliveryMethods('tok-1', 'en')
  assert.ok(methods.ok)
  assert.deepEqual(methods.value.map((m) => [m.id, m.kind, m.carrier]), [['6', 'address', 'Econt']])
})
