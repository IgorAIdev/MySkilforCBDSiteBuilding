import { test } from 'node:test'
import assert from 'node:assert/strict'
import { sample } from '../lib/source/sample/catalog.ts'
import { catalogView, emptyFor } from '../lib/catalog-view.ts'
import { hrefFor, type Query } from '../lib/href.ts'
import type { Asked } from '../lib/listing.ts'

test('page links keep the chosen facets and sort; the first page carries no number', async () => {
  const asked: Asked = { facets: {}, sort: 'price-asc', page: '2' }
  const r = await sample.listing('ro', asked)
  assert.ok(r.ok)
  const at = (q: Query) => hrefFor('ro', { catalog: true, ...q })
  const v = catalogView('ro', { title: 'T', lede: null, listing: r.value, asked, at, filters: true, empty: emptyFor('ro', asked, at) })
  assert.equal(v.pages?.prev, '/ro/catalog?sort=price-asc')
  assert.equal(v.pages?.next, null)
  assert.equal(v.pages?.label, 'Pagina 2 din 2')
  assert.equal(v.count, '12 produse')
  assert.equal(v.cards.length, 4)
  assert.equal(v.filters?.sort.value, 'price-asc')
})

test('empty: with facets — clear them; without — go to all products', () => {
  const at = (q: Query) => hrefFor('en', { category: 'uleiuri', ...q })
  const none = emptyFor('en', { facets: { forma: ['crema'] }, sort: 'popular', page: null }, at)
  assert.deepEqual(none, { title: 'No products match these filters', step: 'Clear one of the filters', href: '/en/catalog/uleiuri' })
  assert.equal(emptyFor('en', { facets: {}, sort: 'popular', page: null }, at).href, '/en/catalog')
})
