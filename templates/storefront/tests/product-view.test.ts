import { test } from 'node:test'
import assert from 'node:assert/strict'
import { sample } from '../lib/source/sample/catalog.ts'
import { productView } from '../lib/product-view.ts'

const none = { category: null, related: [] }

test('nothing chosen: a "from" price and a request to choose', async () => {
  const r = await sample.product('ro', 'ulei-cbd-full-spectrum')
  assert.ok(r.ok)
  const v = productView('ro', r.value, {}, none)
  assert.equal(v.price, 'de la 89,90\u00a0lei')
  assert.equal(v.message, 'Alegeți o variantă')
  assert.equal(v.stock, null)
})

test('a chosen variant: its price, its stock and the report of its batch', async () => {
  const r = await sample.product('ro', 'ulei-cbd-full-spectrum')
  assert.ok(r.ok)
  const v = productView('ro', r.value, { putere: '20', volum: '10' }, none)
  assert.equal(v.price, '219,90\u00a0lei')
  assert.equal(v.stock, 'În stoc')
  assert.equal(v.message, null)
  assert.equal(v.lab?.title, 'Buletin de analiză')
  assert.equal(v.lab?.batch, 'Lot RO-2409-20')
  assert.deepEqual(v.lab?.rows.map(([k]) => k), ['Laborator', 'Data analizei', 'CBD', 'THC'])
  const gone = productView('ro', r.value, { putere: '30', volum: '10' }, none)
  assert.equal(gone.stock, 'Stoc epuizat')
  assert.equal(gone.message, null)
  const missing = productView('en', r.value, { putere: '5', volum: '30' }, none)
  assert.equal(missing.message, 'This combination does not exist')
})

test('a single product has its own price and no choice to make', async () => {
  const r = await sample.product('hu', 'capsule-cbd-10')
  assert.ok(r.ok)
  const v = productView('hu', r.value, {}, none)
  assert.equal(v.price, '79,90\u00a0lei')
  assert.equal(v.message, null)
  assert.equal(v.groups.length, 0)
  assert.equal(v.lab, null)
})

test('buying: only a chosen variant in stock can go to the cart', async () => {
  const oil = await sample.product('ro', 'ulei-cbd-full-spectrum')
  assert.ok(oil.ok)
  assert.equal(productView('ro', oil.value, {}, none).buy.variant, null)
  assert.equal(productView('ro', oil.value, { putere: '20', volum: '10' }, none).buy.variant, 'uf-20-10')
  assert.equal(productView('ro', oil.value, { putere: '30', volum: '10' }, none).buy.variant, null)
  const cream = await sample.product('ro', 'crema-cbd')
  assert.ok(cream.ok)
  const buy = productView('ro', cream.value, {}, none).buy
  assert.equal(buy.variant, 'cr-50')
  assert.equal(buy.add, 'Adaugă în coș')
  assert.equal(buy.view.href, '/ro/cart')
})
