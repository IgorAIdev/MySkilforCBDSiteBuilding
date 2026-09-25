/**
 * Vendure adapter resources — the edge cases the reviewed starter got wrong
 * (docs/rules.md, И241): silent default channel, thrown GraphQL errors that
 * look like an empty catalog, ignored ErrorResult unions, AND-only facet
 * filters, `Number(page) || 1`, `/ 100` in components, phantom option buttons.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { shopRequest, shopFetch, CHANNEL_HEADER, AUTH_HEADER } from '../skills/site-building/assets/vendure/request.mjs'
import { readResult } from '../skills/site-building/assets/vendure/result.mjs'
import { formatMoney, searchPrice, toAmount } from '../skills/site-building/assets/vendure/money.mjs'
import { parseFacetParams, facetValueFilters, pageVariables, pageCount } from '../skills/site-building/assets/vendure/search.mjs'
import { assetUrl, assetSrcSet, objectPosition } from '../skills/site-building/assets/vendure/asset.mjs'
import { displayOptionGroups, toSelection } from '../skills/site-building/assets/vendure/product.mjs'
import { inspectSelection } from '../skills/site-building/assets/commerce/variant-selection.mjs'

const base = { apiUrl: 'https://shop.test/shop-api', query: '{ activeChannel { code } }', channelToken: 'bg' }

test('request names the channel explicitly and carries language, currency and session', () => {
  assert.throws(() => shopRequest({ ...base, channelToken: '' }), /channelToken/)
  assert.throws(() => shopRequest({ ...base, apiUrl: '/shop-api' }), /absolute/)
  assert.throws(() => shopRequest({ ...base, languageCode: 'bg-BG' }), /languageCode/)
  assert.throws(() => shopRequest({ ...base, currencyCode: 'eur' }), /currencyCode/)
  const { url, init } = shopRequest({ ...base, languageCode: 'bg', currencyCode: 'EUR', authToken: 'tok' })
  assert.equal(new URL(url).searchParams.get('languageCode'), 'bg')
  assert.equal(new URL(url).searchParams.get('currencyCode'), 'EUR')
  assert.equal(init.headers[CHANNEL_HEADER], 'bg')
  assert.equal(init.headers.authorization, 'Bearer tok')
  assert.equal(shopRequest({ ...base, languageCode: 'pt_BR' }).url.includes('pt_BR'), true)
})

const reply = (body, { status = 200, headers = {} } = {}) => async () =>
  new Response(typeof body === 'string' ? body : JSON.stringify(body), { status, headers })

test('fetch separates unavailable, http, graphql and success, and returns a renewed session', async () => {
  const down = await shopFetch(base, { fetch: async () => { throw new TypeError('fetch failed') } })
  assert.deepEqual([down.ok, down.kind], [false, 'unavailable'])
  const slow = await shopFetch(base, { timeoutMs: 20, fetch: (_, init) => new Promise((_, fail) => init.signal.addEventListener('abort', () => fail(init.signal.reason))) })
  assert.deepEqual([slow.ok, slow.kind], [false, 'unavailable'])
  assert.match(slow.message, /20 ms/)
  assert.equal((await shopFetch(base, { fetch: reply('oops', { status: 502 }) })).kind, 'http')
  assert.equal((await shopFetch(base, { fetch: reply('<html>', { status: 200 }) })).kind, 'unavailable')
  const gql = await shopFetch(base, { fetch: reply({ errors: [{ message: 'Forbidden' }], data: null }) })
  assert.deepEqual([gql.kind, gql.message], ['graphql', 'Forbidden'])
  const empty = await shopFetch(base, { fetch: reply({ data: { search: { items: [], totalItems: 0 } } }) })
  assert.deepEqual(empty, { ok: true, data: { search: { items: [], totalItems: 0 } } })
  const session = await shopFetch(base, { fetch: reply({ data: { activeOrder: null } }, { headers: { [AUTH_HEADER]: 'new-token' } }) })
  assert.equal(session.authToken, 'new-token')
  let seen
  await shopFetch(base, { init: { next: { tags: ['vd:product:1'] } }, fetch: async (url, init) => { seen = init; return new Response('{"data":{}}') } })
  assert.deepEqual(seen.next.tags, ['vd:product:1'])
  assert.equal(seen.method, 'POST')
})

test('mutation results are read by __typename; insufficient stock is a partial success', () => {
  assert.throws(() => readResult({ id: '1' }, 'Order'), /__typename/)
  assert.throws(() => readResult({ __typename: 'Weird' }, 'Order'), /ErrorResult/)
  assert.deepEqual(readResult({ __typename: 'Order', id: '1' }, 'Order'), { ok: true, value: { __typename: 'Order', id: '1' } })
  const limit = readResult({ __typename: 'OrderLimitError', errorCode: 'ORDER_LIMIT_ERROR', message: 'Max 10' }, 'Order')
  assert.deepEqual([limit.ok, limit.code, limit.partial], [false, 'ORDER_LIMIT_ERROR', undefined])
  const stock = readResult({ __typename: 'InsufficientStockError', errorCode: 'INSUFFICIENT_STOCK_ERROR', message: 'Only 2', quantityAvailable: 2, order: { id: '7' } }, 'Order')
  assert.deepEqual(stock.partial, { order: { id: '7' }, quantityAvailable: 2 })
})

test('money: integers in minor units, one formatter, zero is a price, range is "from"', () => {
  assert.equal(toAmount(0), 0)
  assert.equal(toAmount(1999), 19.99)
  assert.throws(() => toAmount(19.99), /integer/)
  assert.throws(() => formatMoney(100, 'eur', 'bg'), /currency/)
  assert.match(formatMoney(1999, 'EUR', 'bg'), /19,99/)
  assert.match(formatMoney(0, 'EUR', 'bg'), /0,00/)
  assert.deepEqual(searchPrice(null), { kind: 'missing' })
  assert.deepEqual(searchPrice({ value: 0 }), { kind: 'single', value: 0 })
  assert.deepEqual(searchPrice({ min: 900, max: 900 }), { kind: 'single', value: 900 })
  assert.deepEqual(searchPrice({ min: 900, max: 2900 }), { kind: 'range', min: 900, max: 2900 })
  assert.throws(() => searchPrice({ min: 3, max: 1 }), /min/)
  assert.throws(() => searchPrice({}), /SinglePrice/)
})

test('facets: OR inside one facet, AND across facets, unknown codes reported not guessed', () => {
  const selected = parseFacetParams(new URLSearchParams('facet.form=oil&facet.form=capsules,oil&facet.strength=10&sort=price&facet.=x'))
  assert.deepEqual(selected, { form: ['oil', 'capsules'], strength: ['10'] })
  const dictionary = { form: { oil: '11', capsules: '12' }, strength: { 10: '31' } }
  assert.deepEqual(facetValueFilters(selected, dictionary), { filters: [{ or: ['11', '12'] }, { and: '31' }], invalid: [] })
  assert.deepEqual(facetValueFilters({ form: ['cream'], ghost: ['x'] }, dictionary), { filters: [], invalid: ['form:cream', 'ghost:x'] })
  assert.deepEqual(parseFacetParams({ 'facet.form': ['oil', 'cream'] }), { form: ['oil', 'cream'] })
  assert.throws(() => parseFacetParams(Promise.resolve({})), /Await/)
})

test('facets: inherited names are unknown codes, not filter ids', () => {
  const dictionary = { form: { oil: '11' } }
  const selected = parseFacetParams(new URLSearchParams('facet.constructor=name&facet.__proto__=x&facet.toString=length'))
  assert.deepEqual(facetValueFilters(selected, dictionary), {
    filters: [],
    invalid: ['constructor:name', '__proto__:x', 'toString:length'],
  })
})

test('page numbers: absent is page 1, junk is a 404, not silently page 1', () => {
  assert.deepEqual(pageVariables(new URLSearchParams('')), { ok: true, page: 1, take: 24, skip: 0 })
  assert.deepEqual(pageVariables(new URLSearchParams('page=3'), { pageSize: 12 }), { ok: true, page: 3, take: 12, skip: 24 })
  for (const bad of ['0', '-1', '1.5', 'abc', '01', '99999999']) assert.deepEqual(pageVariables(new URLSearchParams(`page=${bad}`)), { ok: false }, bad)
  assert.throws(() => pageVariables({}, { pageSize: 1000 }), /pageSize/)
  assert.equal(pageCount(0, 24), 1)
  assert.equal(pageCount(49, 24), 3)
})

test('asset URLs: sizes, crop, format and focal point from Vendure, no second optimizer', () => {
  const preview = 'https://cdn.test/assets/preview/ab/oil__preview.jpg'
  const url = new URL(assetUrl(preview, { w: 640, h: 800, mode: 'crop', format: 'webp', focalPoint: { x: 0.3, y: 0.6 } }))
  assert.deepEqual(Object.fromEntries(url.searchParams), { w: '640', h: '800', mode: 'crop', format: 'webp', fpx: '0.3', fpy: '0.6' })
  assert.throws(() => assetUrl(preview, { w: 0 }), /w must/)
  assert.throws(() => assetUrl(preview, { format: 'gif' }), /format/)
  assert.throws(() => assetUrl(preview, { focalPoint: { x: 2, y: 0 } }), /focalPoint/)
  const set = assetSrcSet(preview, [640, 320, 640], { ratio: 1.25 })
  assert.equal(set.split(', ').length, 2)
  assert.match(set, /w=320&h=400&mode=crop&format=webp 320w/)
  assert.equal(objectPosition({ x: 0.3, y: 0.6 }), '30% 60%')
  assert.equal(objectPosition(null), '50% 50%')
})

const product = {
  optionGroups: [
    { id: 'g1', code: 'strength', options: [{ id: 'o1', code: '5' }, { id: 'o2', code: '10' }, { id: 'o3', code: '30' }] },
    { id: 'g2', code: 'volume', options: [{ id: 'o4', code: '10ml' }] },
    { id: 'g3', code: 'flavour', options: [{ id: 'o5', code: 'mint' }] },
  ],
  variants: [
    { id: 1, stockLevel: 'IN_STOCK', options: [{ id: 'o1' }, { id: 'o4' }] },
    { id: 2, stockLevel: 'OUT_OF_STOCK', options: [{ id: 'o2' }, { id: 'o4' }] },
  ],
}

test('shared option groups: phantom options hidden, codes feed the neutral variant selection', () => {
  const groups = displayOptionGroups(product)
  assert.deepEqual(groups.map((g) => [g.code, g.options.map((o) => o.code)]), [['strength', ['5', '10']], ['volume', ['10ml']]])
  const { options, variants } = toSelection(product)
  assert.deepEqual(options, [{ id: 'strength', values: ['5', '10'] }, { id: 'volume', values: ['10ml'] }])
  assert.deepEqual(variants[1], { id: '2', options: { strength: '10', volume: '10ml' }, available: false })
  assert.equal(inspectSelection(options, variants, { strength: '5', volume: '10ml' }).status, 'ready')
  assert.equal(inspectSelection(options, variants, { strength: '10', volume: '10ml' }).status, 'unavailable')
  assert.throws(() => toSelection({ ...product, variants: [{ id: 9, options: [{ id: 'zz' }] }] }), /outside/)
  assert.throws(() => displayOptionGroups({}), /Select product/)
})

test('money: the market chooses how the currency is written — lei, not RON', () => {
  assert.equal(formatMoney(2990, 'RON', 'ro-RO', { display: 'narrowSymbol' }), '29,90 lei')
  assert.equal(formatMoney(2990, 'RON', 'hu-RO', { display: 'narrowSymbol' }), '29,90 lei')
  assert.match(formatMoney(2990, 'RON', 'ro-RO'), /RON/)
  assert.throws(() => formatMoney(1, 'RON', 'ro-RO', { display: 'emoji' }), /display/)
})
