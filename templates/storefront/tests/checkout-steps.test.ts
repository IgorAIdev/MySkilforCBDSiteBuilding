import { test } from 'node:test'
import assert from 'node:assert/strict'
import { stepFor, deliveryReady } from '../lib/checkout-steps.ts'
import type { Checkout, Delivery, DeliveryMethod } from '../lib/source/contract.ts'

const RON = (minor: number) => ({ minor, currency: 'RON' })
const cart = (n: number): Checkout['cart'] => ({
  lines: Array.from({ length: n }, (_, i) => ({ id: `l${i}`, productId: 'p', variantId: 'v', name: 'P', options: [], image: { src: '', alt: '', width: 1, height: 1 }, unit: RON(100), quantity: 1, total: RON(100) })),
  quantity: n, subtotal: RON(100 * n), discounts: [], delivery: null, total: RON(100 * n),
})
const door: DeliveryMethod = { id: 'd', kind: 'address', carrier: null, name: 'D', description: '', price: RON(0), days: null }
const pick: DeliveryMethod = { ...door, id: 'p', kind: 'pickup' }
const contact = { email: 'a@example.com', firstName: 'A', lastName: 'B', phone: '0722000000' }
const address = { street: 'S 1', city: 'C', region: 'R', postalCode: '010011', country: 'RO' }
const point = { id: 'x', type: 'locker' as const, name: 'X', address: 'A', city: 'C', hours: null }

test('delivery is ready only with its address or its point', () => {
  const d = (over: Partial<Delivery>): Delivery => ({ method: door, address: null, point: null, ...over })
  assert.equal(deliveryReady(null), false)
  assert.equal(deliveryReady(d({})), false)
  assert.equal(deliveryReady(d({ address })), true)
  assert.equal(deliveryReady(d({ method: pick })), false)
  assert.equal(deliveryReady(d({ method: pick, point })), true)
})

test('the server decides the step: empty cart, then the first unfinished step', () => {
  assert.equal(stepFor(null, 'payment'), 'cart')
  assert.equal(stepFor({ cart: cart(0), contact, delivery: null }, 'contact'), 'cart')
  const base: Checkout = { cart: cart(1), contact: null, delivery: null }
  assert.equal(stepFor(base, 'contact'), 'contact')
  assert.equal(stepFor(base, 'payment'), 'contact')
  const known = { ...base, contact }
  assert.equal(stepFor(known, 'delivery'), 'delivery')
  assert.equal(stepFor(known, 'payment'), 'delivery')
  const ready = { ...known, delivery: { method: door, address, point: null } }
  assert.equal(stepFor(ready, 'payment'), 'payment')
  assert.equal(stepFor(ready, 'contact'), 'contact')
})

