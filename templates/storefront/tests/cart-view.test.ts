import { test, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { cartView, priceOrFree } from '../lib/cart-view.ts'
import { sampleCommerce, resetSample, FIXTURES } from '../lib/source/sample/commerce.ts'

beforeEach(() => resetSample())
const NB = '\u00a0'

async function fixtureCart(lang: 'ro' | 'hu' = 'ro') {
  const r = await sampleCommerce.checkout(FIXTURES.cart, lang)
  assert.ok(r.ok && r.value)
  return r.value.cart
}

test('a cart line: link back to its variant, unit price, quantity steps', async () => {
  const v = cartView('ro', await fixtureCart(), null)
  assert.equal(v.count, '3 produse')
  const [oil, caps] = v.lines
  assert.equal(oil.href, '/ro/product/ulei-cbd-full-spectrum?option.putere=20&option.volum=10')
  assert.equal(oil.options, '20 % · 10 ml')
  assert.equal(oil.unit, `219,90${NB}lei / buc.`)
  assert.equal(oil.total, `219,90${NB}lei`)
  assert.deepEqual([oil.less, oil.more, oil.remove], [null, 'set:l1:2', 'remove:l1'])
  assert.deepEqual([caps.less, caps.quantity], ['set:l2:1', 2])
  assert.equal(caps.labels.less, 'Scade cantitatea: Capsule CBD 25 mg')
})

test('totals are the source’s, as ready strings', async () => {
  const v = cartView('ro', await fixtureCart(), null)
  assert.deepEqual(v.totals.rows, [
    { label: 'Subtotal', value: `499,70${NB}lei` },
    { label: 'Reducere CBD10', value: `−49,97${NB}lei` },
    { label: 'Livrare', value: 'Se alege la pasul următor' },
  ])
  assert.deepEqual(v.totals.total, { label: 'Total', value: `449,73${NB}lei` })
  assert.equal(v.totals.note, 'Prețurile includ TVA.')
  assert.deepEqual(v.coupon.applied, [{ code: 'CBD10', op: 'uncoupon:CBD10', label: 'Elimină codul CBD10' }])
  assert.equal(v.checkout.href, '/ro/checkout/contact')
  assert.equal(cartView('hu', await fixtureCart('hu'), null).count, '3 termék')
})

test('the notice comes from a known code only; an empty cart says what next', () => {
  const empty = cartView('ro', null, 'ok:remove')
  assert.deepEqual(empty.lines, [])
  assert.equal(empty.notice?.message, 'Produsul a fost scos din coș.')
  assert.deepEqual(empty.empty, { title: 'Coșul este gol', step: 'Vedeți produsele', href: '/ro/catalog' })
  assert.equal(cartView('ro', null, 'nonsense').notice, null)
  assert.equal(priceOrFree('ro', { minor: 0, currency: 'RON' }), 'Gratuit')
})
