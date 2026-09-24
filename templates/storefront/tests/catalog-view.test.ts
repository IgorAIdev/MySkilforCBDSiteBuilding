import { test } from 'node:test'
import assert from 'node:assert/strict'
import { sample, sampleSource } from '../lib/source/sample/catalog.ts'
import { catalogView, emptyFor, shownFacets } from '../lib/catalog-view.ts'
import { hrefFor, type Query } from '../lib/href.ts'
import type { Asked } from '../lib/listing.ts'
import type { Facet } from '../lib/source/contract.ts'

const none = { title: '', step: '', href: '' }

test('page links keep the chosen facets and sort; the first page carries no number', async () => {
  const asked: Asked = { facets: {}, sort: 'price-asc', page: '2' }
  const r = await sampleSource(8).listing('ro', asked)
  assert.ok(r.ok)
  const at = (q: Query) => hrefFor('ro', { catalog: true, ...q })
  const v = catalogView('ro', { title: 'T', lede: null, listing: r.value, asked, at, filters: true, empty: emptyFor('ro', asked, at) })
  assert.equal(v.pages?.prev, '/ro/catalog?sort=price-asc')
  assert.equal(v.pages?.next, null)
  assert.equal(v.pages?.label, 'Pagina 2 din 2')
  assert.deepEqual(v.pages?.items, [{ n: 1, href: '/ro/catalog?sort=price-asc', gap: false }, { n: 2, href: null, gap: false }])
  assert.equal(v.count, '12 produse')
  assert.equal(v.cards.length, 4)
  assert.equal(v.sort?.options.find((o) => o.on)?.value, 'price-asc')
})

/* Порядок — ссылками (И265): каждая ведёт на первую страницу той же полки
   с теми же гранями. */
test('sort options are addresses that keep the facets and start from the first page', async () => {
  const asked: Asked = { facets: { forma: ['ulei'] }, sort: 'popular', page: null }
  const r = await sample.listing('en', asked)
  assert.ok(r.ok)
  const v = catalogView('en', { title: 'T', lede: null, listing: r.value, asked, at: (q) => hrefFor('en', { catalog: true, ...q }), filters: true, empty: none })
  assert.deepEqual(v.sort?.options.map((o) => o.href), ['/en/catalog?facet.forma=ulei', '/en/catalog?facet.forma=ulei&sort=price-asc', '/en/catalog?facet.forma=ulei&sort=price-desc'])
  assert.equal(v.sort?.said, 'Sort by: Best sellers')
})

test('long page runs keep the first, the last and the neighbours of the current', async () => {
  const r = await sampleSource(1).listing('en', { facets: {}, sort: 'popular', page: '6' })
  assert.ok(r.ok)
  const v = catalogView('en', { title: 'T', lede: null, listing: r.value, asked: { facets: {}, sort: 'popular', page: '6' }, at: (q) => hrefFor('en', { catalog: true, ...q }), filters: true, empty: none })
  assert.deepEqual(v.pages?.items.flatMap((x) => (x.gap ? ['…', x.n] : [x.n])), [1, '…', 5, 6, 7, '…', 12])
})

test('empty: with facets — clear them; without — go to all products', () => {
  const at = (q: Query) => hrefFor('en', { category: 'uleiuri', ...q })
  const out = emptyFor('en', { facets: { forma: ['crema'] }, sort: 'popular', page: null }, at)
  assert.deepEqual(out, { title: 'No products match these filters', step: 'Clear one of the filters', href: '/en/catalog/uleiuri' })
  assert.equal(emptyFor('en', { facets: {}, sort: 'popular', page: null }, at).href, '/en/catalog')
})

test('filters on a phone: the open button counts what is chosen', async () => {
  const asked: Asked = { facets: { putere: ['10', '20'] }, sort: 'popular', page: null }
  const r = await sample.listing('ro', { category: 'uleiuri', ...asked })
  assert.ok(r.ok)
  const at = (q: Query) => hrefFor('ro', { category: 'uleiuri', ...q })
  const v = catalogView('ro', { title: 'T', lede: null, listing: r.value, asked, at, filters: true, empty: none })
  assert.equal(v.filters?.chosen, 2)
  assert.equal(v.filters?.open, 'Filtre (2)')
  assert.equal(v.filters?.close, 'Închide filtrele')
})

/* cbd-facet, §7: значение без товаров — тупик; грань, где у всей выборки
   одно значение, выбора не даёт; выбранное остаётся всегда. */
test('facets show only what can change the shelf', () => {
  const f = (code: string, values: [string, number, boolean][]): Facet => ({ code, name: code, values: values.map(([c, count, selected]) => ({ code: c, name: c, count, selected })) })
  const shown = shownFacets([
    f('forma', [['ulei', 5, false], ['capsule', 0, false]]),
    f('putere', [['5', 2, false], ['10', 2, false], ['2.5', 0, false]]),
    f('marca', [['a', 0, true]]),
    f('note', [['x', 2, false]]),
  ], 5)
  assert.deepEqual(shown.map((x) => [x.code, x.values.map((v) => v.code)]), [['putere', ['5', '10']], ['marca', ['a']], ['note', ['x']]])
})

test('chosen values become pills that remove only themselves and keep the order', async () => {
  const asked: Asked = { facets: { forma: ['ulei'], putere: ['10'] }, sort: 'price-asc', page: null }
  const r = await sample.listing('en', asked)
  assert.ok(r.ok)
  const at = (q: Query) => hrefFor('en', { catalog: true, ...q })
  const v = catalogView('en', { title: 'T', lede: null, listing: r.value, asked, at, filters: true, empty: none })
  assert.deepEqual(v.chips.map((c) => [c.label, c.href]), [
    ['Oil', '/en/catalog?facet.putere=10&sort=price-asc'],
    ['10 %', '/en/catalog?facet.forma=ulei&sort=price-asc'],
  ])
  assert.equal(v.chips[0].said, 'Remove filter Form: Oil')
  assert.equal(v.clear?.href, '/en/catalog?sort=price-asc', 'сброс граней не сбрасывает порядок')
})

test('nothing chosen — no clear button and no pills', async () => {
  const asked: Asked = { facets: {}, sort: 'popular', page: null }
  const r = await sample.listing('en', asked)
  assert.ok(r.ok)
  const v = catalogView('en', { title: 'T', lede: null, listing: r.value, asked, at: (q) => hrefFor('en', { catalog: true, ...q }), filters: true, empty: none })
  assert.equal(v.clear, null)
  assert.equal(v.filters?.clear, null)
  assert.deepEqual(v.chips, [])
})
