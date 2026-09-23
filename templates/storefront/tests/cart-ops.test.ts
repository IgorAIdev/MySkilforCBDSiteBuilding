import { test, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { readCartOp, runCartOp, outcomeOf } from '../lib/cart-ops.ts'
import { sampleCommerce, resetSample, FIXTURES } from '../lib/source/sample/commerce.ts'

beforeEach(() => resetSample())
const form = (fields: Record<string, string>) => {
  const f = new FormData()
  for (const [k, v] of Object.entries(fields)) f.set(k, v)
  return f
}

test('the cart form says what it wants; the unknown is refused, not guessed', () => {
  assert.deepEqual(readCartOp(form({ op: 'add', variant: 'uf-20-10' })), { op: 'add', variantId: 'uf-20-10', quantity: 1 })
  assert.deepEqual(readCartOp(form({ op: 'add', variant: 'uf-20-10', quantity: ' 3 ' })), { op: 'add', variantId: 'uf-20-10', quantity: 3 })
  assert.deepEqual(readCartOp(form({ op: 'add', variant: 'uf-20-10', quantity: 'abc' })), { op: 'add', variantId: 'uf-20-10', quantity: -1 })
  assert.deepEqual(readCartOp(form({ op: 'set:l2:3' })), { op: 'set', lineId: 'l2', quantity: 3 })
  assert.deepEqual(readCartOp(form({ op: 'remove:l2' })), { op: 'remove', lineId: 'l2' })
  assert.deepEqual(readCartOp(form({ op: 'coupon', code: ' cbd10 ' })), { op: 'coupon', code: 'cbd10' })
  assert.deepEqual(readCartOp(form({ op: 'coupon' })), { op: 'coupon', code: '' })
  assert.deepEqual(readCartOp(form({ op: 'uncoupon:A:B' })), { op: 'uncoupon', code: 'A:B' })
  assert.equal(readCartOp(form({ op: 'add' })), null)
  assert.equal(readCartOp(form({ op: 'drop:l1' })), null)
  assert.equal(readCartOp(form({})), null)
})

test('running an operation returns the session, a code and the new count', async () => {
  const added = await runCartOp(sampleCommerce, null, 'ro', { op: 'add', variantId: 'uf-20-10', quantity: 2 })
  assert.ok(added.session)
  assert.deepEqual([added.code, added.count], ['ok:add', 2])
  const partial = await runCartOp(sampleCommerce, added.session, 'ro', { op: 'add', variantId: 'uf-10-30', quantity: 9 })
  assert.deepEqual([partial.code, partial.count], ['partial:3', 5])
  assert.equal((await runCartOp(sampleCommerce, null, 'ro', { op: 'remove', lineId: 'l1' })).code, 'e:not-found')
  assert.equal((await runCartOp(sampleCommerce, FIXTURES.cart, 'ro', { op: 'coupon', code: '' })).code, 'e:coupon-empty')
  assert.equal((await runCartOp(sampleCommerce, FIXTURES.cart, 'ro', { op: 'coupon', code: 'NU' })).code, 'e:coupon-invalid')
  assert.equal((await runCartOp(sampleCommerce, FIXTURES.cart, 'ro', null)).code, 'e:request')
  const set = await runCartOp(sampleCommerce, FIXTURES.cart, 'ro', { op: 'set', lineId: 'l2', quantity: 1 })
  assert.deepEqual([set.session, set.code, set.count], [FIXTURES.cart, 'ok:set', 2])
})

test('an outcome is read only from the closed list of codes', () => {
  assert.deepEqual(outcomeOf('ro', 'ok:add', 3), { kind: 'ok', code: 'ok:add', message: 'Produsul a fost adăugat în coș.', count: 3 })
  assert.equal(outcomeOf('ro', 'partial:3')?.message, 'Avem doar 3 buc. în stoc — atât sunt acum în coș.')
  assert.equal(outcomeOf('en', 'e:coupon-expired')?.message, 'This code has expired — use a valid one.')
  assert.equal(outcomeOf('ro', 'e:timeout')?.kind, 'error')
  for (const bad of ['ok:constructor', 'e:__proto__', 'partial:abc', 'x', '']) assert.equal(outcomeOf('ro', bad), null, bad)
})
