import { test } from 'node:test'
import assert from 'node:assert/strict'
import { hrefFor } from '../lib/href.ts'

test('one function builds every address, language first', () => {
  assert.equal(hrefFor('ro', { home: true }), '/ro')
  assert.equal(hrefFor('hu', { catalog: true }), '/hu/catalog')
  assert.equal(hrefFor('hu', { catalog: true, page: 1 }), '/hu/catalog')
  assert.equal(hrefFor('en', { category: 'uleiuri', page: 2 }), '/en/catalog/uleiuri?page=2')
  assert.equal(hrefFor('ro', { product: 'ulei-cbd-full-spectrum', options: { volum: '10', putere: '20' } }), '/ro/product/ulei-cbd-full-spectrum?option.putere=20&option.volum=10')
  assert.equal(hrefFor('ro', { search: 'ulei 10 %' }), '/ro/search?q=ulei+10+%25')
  assert.equal(hrefFor('ro', { search: '' }), '/ro/search')
  assert.equal(hrefFor('en', { doc: 'livrare-si-plata' }), '/en/info/livrare-si-plata')
})

test('a shelf address keeps facets, sort and page in one stable order', () => {
  assert.equal(
    hrefFor('ro', { category: 'uleiuri', facets: { putere: ['10', '20'], forma: ['ulei'] }, sort: 'price-asc', page: 2 }),
    '/ro/catalog/uleiuri?facet.forma=ulei&facet.putere=10%2C20&sort=price-asc&page=2',
  )
  assert.equal(hrefFor('ro', { catalog: true, facets: { forma: [] }, sort: 'popular' }), '/ro/catalog')
})

test('a slug or id is one encoded path segment: a space, a diacritic or a slash cannot break the address', () => {
  assert.equal(hrefFor('ro', { category: 'uleiuri și creme' }), '/ro/catalog/uleiuri%20%C8%99i%20creme')
  assert.equal(hrefFor('hu', { product: 'olaj/10' }), '/hu/product/olaj%2F10')
  assert.equal(hrefFor('ro', { doc: 'politica de retur' }), '/ro/info/politica%20de%20retur')
  assert.equal(hrefFor('ro', { category: 'uleiuri', page: 2 }), '/ro/catalog/uleiuri?page=2')
})

test('cart and checkout addresses', () => {
  assert.equal(hrefFor('ro', { cart: true }), '/ro/cart')
  assert.equal(hrefFor('ro', { cart: true, result: 'ok:add' }), '/ro/cart?r=ok%3Aadd')
  assert.equal(hrefFor('hu', { checkout: 'delivery' }), '/hu/checkout/delivery')
  assert.equal(hrefFor('ro', { checkout: 'delivery', city: 'București' }), '/ro/checkout/delivery?city=Bucure%C8%99ti')
  assert.equal(hrefFor('en', { checkout: 'done' }), '/en/checkout/done')
})
