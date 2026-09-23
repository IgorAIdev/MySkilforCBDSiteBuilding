import { test, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { sampleCommerce as c, resetSample, FIXTURES } from '../lib/source/sample/commerce.ts'
import { stepFor } from '../lib/checkout-steps.ts'
import type { Address, Contact } from '../lib/source/contract.ts'

const CONTACT: Contact = { email: 'ion@example.com', firstName: 'Ion', lastName: 'Ionescu', phone: '0722 000 000' }
const ADDRESS: Address = { street: 'Str. Test 2', city: 'Cluj-Napoca', region: 'Cluj', postalCode: '400001', country: 'RO' }
const RON = (minor: number) => ({ minor, currency: 'RON' })

beforeEach(() => resetSample())

async function fresh(variant = 'uf-20-10', qty = 1): Promise<string> {
  const r = await c.add(null, 'ro', variant, qty)
  assert.ok(r.session && r.change.ok)
  return r.session
}

test('add: the first item opens a session, a line and totals from the source', async () => {
  const r = await c.add(null, 'ro', 'uf-20-10', 2)
  assert.ok(r.session && r.change.ok)
  const cart = r.change.value
  assert.equal(cart.lines.length, 1)
  assert.equal(cart.quantity, 2)
  assert.deepEqual(cart.subtotal, RON(43980))
  assert.equal(cart.delivery, null)
  assert.deepEqual(cart.total, RON(43980))
  assert.equal(r.change.added, undefined)
  assert.deepEqual(cart.lines[0].options.map((o) => `${o.group}=${o.code}:${o.name}`), ['putere=20:20 %', 'volum=10:10 ml'])
})

test('add: the same variant twice is one line; limits are loud', async () => {
  const s = await fresh('uf-20-10', 1)
  const again = await c.add(s, 'ro', 'uf-20-10', 2)
  assert.equal(again.session, s)
  assert.ok(again.change.ok)
  assert.equal(again.change.value.lines.length, 1)
  assert.equal(again.change.value.lines[0].quantity, 3)
  assert.deepEqual((await c.add(s, 'ro', 'nu-exista', 1)).change, { ok: false, error: 'not-found' })
  assert.deepEqual((await c.add(s, 'ro', 'uf-30-10', 1)).change, { ok: false, error: 'out-of-stock' })
  for (const q of [0, 100, 1.5]) assert.deepEqual((await c.add(s, 'ro', 'uf-20-10', q)).change, { ok: false, error: 'quantity' })
  const none = await c.add(null, 'ro', 'uf-30-10', 1)
  assert.equal(none.session, null)
})

test('add: more than in stock is a partial success with what was added', async () => {
  const r = await c.add(null, 'ro', 'uf-10-30', 5)
  assert.ok(r.change.ok)
  assert.equal(r.change.added, 3)
  assert.equal(r.change.value.lines[0].quantity, 3)
})

test('setQuantity caps at stock, remove drops the line, unknown lines are not found', async () => {
  const s = await fresh('cc-60', 1)
  const line = { id: 'l1' }
  const capped = await c.setQuantity(s, 'ro', line.id, 9)
  assert.ok(capped.ok)
  assert.equal(capped.added, 3)
  assert.equal(capped.value.lines[0].quantity, 3)
  assert.deepEqual(await c.setQuantity(s, 'ro', line.id, 0), { ok: false, error: 'quantity' })
  assert.deepEqual(await c.setQuantity(s, 'ro', 'l999', 1), { ok: false, error: 'not-found' })
  const gone = await c.remove(s, 'ro', line.id)
  assert.ok(gone.ok)
  assert.equal(gone.value.lines.length, 0)
  assert.deepEqual(await c.remove(s, 'ro', line.id), { ok: false, error: 'not-found' })
})

test('coupons: the source takes the discount; wrong and expired codes are told apart', async () => {
  const s = await fresh('uf-20-10', 1)
  const applied = await c.applyCoupon(s, 'ro', ' cbd10 ')
  assert.ok(applied.ok)
  assert.deepEqual(applied.value.discounts, [{ code: 'CBD10', amount: RON(2199) }])
  assert.deepEqual(applied.value.total, RON(19791))
  assert.deepEqual(await c.applyCoupon(s, 'ro', 'EXPIRAT'), { ok: false, error: 'coupon-expired' })
  assert.deepEqual(await c.applyCoupon(s, 'ro', 'constructor'), { ok: false, error: 'coupon-invalid' })
  const removed = await c.removeCoupon(s, 'ro', 'CBD10')
  assert.ok(removed.ok)
  assert.deepEqual(removed.value.discounts, [])
})

test('delivery: methods are data; points are searched by town unless there are few', async () => {
  const m = await c.deliveryMethods(null, 'ro')
  assert.ok(m.ok)
  assert.deepEqual(m.value.map((x) => `${x.id}:${x.kind}`), ['curier:address', 'locker:pickup', 'magazin:pickup'])
  assert.deepEqual(await c.pickupPoints('ro', 'locker', ''), { ok: true, value: [] })
  const buc = await c.pickupPoints('ro', 'locker', 'bucuresti')
  assert.ok(buc.ok)
  assert.equal(buc.value.length, 3)
  assert.ok(buc.value.every((p) => p.city === 'București' && p.type === 'locker'))
  const shop = await c.pickupPoints('ro', 'magazin', '')
  assert.ok(shop.ok)
  assert.deepEqual(shop.value.map((p) => p.type), ['shop'])
  assert.deepEqual(await c.pickupPoints('ro', 'curier', 'x'), { ok: false, reason: 'not-found' })
})

test('setDelivery: a foreign point is refused, a one-point method is chosen whole, the same method keeps details', async () => {
  const s = await fresh()
  assert.deepEqual(await c.setDelivery(s, 'ro', { methodId: 'locker', address: null, pointId: 'mg-buc' }), { ok: false, error: 'point-missing' })
  const shop = await c.setDelivery(s, 'ro', { methodId: 'magazin', address: null, pointId: null })
  assert.ok(shop.ok)
  assert.equal(shop.value.delivery?.point?.id, 'mg-buc')
  assert.deepEqual(shop.value.cart.delivery, RON(0))
  const door = await c.setDelivery(s, 'ro', { methodId: 'curier', address: ADDRESS, pointId: null })
  assert.ok(door.ok)
  const again = await c.setDelivery(s, 'ro', { methodId: 'curier', address: null, pointId: null })
  assert.ok(again.ok)
  assert.deepEqual(again.value.delivery?.address, ADDRESS)
  assert.deepEqual(again.value.cart.delivery, RON(1999))
})

test('payments: a method over its limit is shown with a reason, not hidden', async () => {
  const s = await fresh('ul-20-30', 5)
  const r = await c.paymentMethods(s, 'ro')
  assert.ok(r.ok)
  const cod = r.value.find((p) => p.code === 'ramburs')
  assert.ok(cod)
  assert.equal(cod.eligible, false)
  assert.equal(cod.reason, 'Plata la livrare este disponibilă pentru comenzi de până la 2.000,00\u00a0lei.')
  assert.equal(r.value.find((p) => p.code === 'transfer')?.eligible, true)
})

test('placeOrder: every precondition is checked by the source, then the cart is emptied', async () => {
  const empty = (await c.add(null, 'ro', 'uf-20-10', 1)).session
  assert.ok(empty)
  const shown = RON(21990 + 1999)
  assert.deepEqual(await c.placeOrder(empty, 'ro', 'ramburs', shown), { ok: false, error: 'no-contact' })
  await c.setContact(empty, 'ro', CONTACT)
  assert.deepEqual(await c.placeOrder(empty, 'ro', 'ramburs', shown), { ok: false, error: 'no-delivery' })
  await c.setDelivery(empty, 'ro', { methodId: 'curier', address: ADDRESS, pointId: null })
  assert.deepEqual(await c.placeOrder(empty, 'ro', 'card', shown), { ok: false, error: 'payment-ineligible' })
  const placed = await c.placeOrder(empty, 'ro', 'ramburs', shown)
  assert.ok(placed.ok)
  assert.match(placed.value.code, /^RO[0-9A-F]{8}$/)
  assert.deepEqual(placed.value.cart.total, RON(21990 + 1999))
  const after = await c.checkout(empty, 'ro')
  assert.ok(after.ok && after.value)
  assert.equal(after.value.cart.lines.length, 0)
  assert.equal(after.value.contact, null)
  const last = await c.lastOrder(empty, 'ro')
  assert.ok(last.ok)
  assert.equal(last.value?.code, placed.value.code)
  assert.deepEqual(await c.lastOrder('someone-else', 'ro'), { ok: true, value: null })
  assert.deepEqual(await c.placeOrder(empty, 'ro', 'ramburs', shown), { ok: false, error: 'placed' })
  assert.deepEqual(await c.placeOrder('nobody', 'ro', 'ramburs', shown), { ok: false, error: 'empty-cart' })
  assert.deepEqual(await c.setContact('nobody', 'ro', CONTACT), { ok: false, error: 'empty-cart' })
})

/* И262, Директива 2011/83/ЕС, ст. 8(2): заказ ставится только по тому итогу,
   который покупатель видел прямо перед кнопкой. Другая вкладка поменяла
   корзину — итог уже другой, и заказ не ставится. */
test('placeOrder: only at the total the buyer saw', async () => {
  const s = await fresh('uf-20-10', 1)
  await c.setContact(s, 'ro', CONTACT)
  await c.setDelivery(s, 'ro', { methodId: 'curier', address: ADDRESS, pointId: null })
  const shown = RON(21990 + 1999)
  await c.add(s, 'ro', 'uf-20-10', 1)
  assert.deepEqual(await c.placeOrder(s, 'ro', 'ramburs', shown), { ok: false, error: 'changed' })
  const now = 2 * 21990 + 1999
  assert.deepEqual(await c.placeOrder(s, 'ro', 'ramburs', { minor: now, currency: 'EUR' }), { ok: false, error: 'changed' })
  const placed = await c.placeOrder(s, 'ro', 'ramburs', RON(now))
  assert.ok(placed.ok)
  assert.deepEqual(placed.value.cart.total, RON(now))
})

/* Окно заказа: «спасибо» показывает заказ два часа — столько гость Vendure
   открывает свой заказ по коду (DefaultOrderByCodeAccessStrategy, '2h').
   Пустая корзина в окне — заказ уже поставлен (второе нажатие), после
   окна — просто пустая корзина. Часы — хранилища, не стенные. */
test('the last order is shown for two hours; an empty cart within them is «placed», later «empty-cart»', async () => {
  const HOUR = 60 * 60 * 1000
  let now = Date.parse('2026-09-23T10:00:00.000Z')
  resetSample(() => now)
  const s = await fresh('uf-20-10', 1)
  await c.setContact(s, 'ro', CONTACT)
  await c.setDelivery(s, 'ro', { methodId: 'curier', address: ADDRESS, pointId: null })
  const shown = RON(21990 + 1999)
  const placed = await c.placeOrder(s, 'ro', 'ramburs', shown)
  assert.ok(placed.ok)
  assert.equal(placed.value.placedAt, '2026-09-23T10:00:00.000Z')
  now += 2 * HOUR - 1
  const within = await c.lastOrder(s, 'ro')
  assert.ok(within.ok)
  assert.equal(within.value?.code, placed.value.code)
  assert.deepEqual(await c.placeOrder(s, 'ro', 'ramburs', shown), { ok: false, error: 'placed' })
  now += 1
  assert.deepEqual(await c.lastOrder(s, 'ro'), { ok: true, value: null })
  assert.deepEqual(await c.placeOrder(s, 'ro', 'ramburs', shown), { ok: false, error: 'empty-cart' })
})

test('the placed fixture shows its order at any hour of the store clock', async () => {
  resetSample(() => Date.parse('2031-01-01T00:00:00.000Z'))
  const last = await c.lastOrder(FIXTURES.placed, 'ro')
  assert.ok(last.ok && last.value)
  assert.equal(last.value.code, 'EXEMPLU1')
  assert.equal(last.value.placedAt, '2030-12-31T23:50:00.000Z')
  assert.deepEqual(await c.placeOrder(FIXTURES.placed, 'ro', 'ramburs', RON(0)), { ok: false, error: 'placed' })
})

/* Заготовка — только для чтения: запись в неё (товар, заказ) ложится на
   копию, и следующая отрисованная проверка снова видит её полной. Иначе
   первый же прогон сценария по заготовке опустошал бы её до перезапуска. */
test('fixtures are read-only: an add and an order never empty them', async () => {
  const add = await c.add(FIXTURES.ready, 'ro', 'uf-20-10', 1)
  assert.equal(add.session, FIXTURES.ready)
  assert.ok(add.change.ok)
  const full = RON(49970 - 4997 + 1999)
  const placed = await c.placeOrder(FIXTURES.ready, 'ro', 'ramburs', full)
  assert.ok(placed.ok)
  const after = await c.checkout(FIXTURES.ready, 'ro')
  assert.ok(after.ok && after.value)
  assert.equal(after.value.cart.lines.length, 2)
  assert.deepEqual(after.value.cart.total, full)
  assert.equal(after.value.contact?.email, 'ana.popescu@example.com')
  assert.equal(after.value.delivery?.method.id, 'curier')
})

test('fixtures: the prepared sessions stand at their steps', async () => {
  const at = async (s: string) => {
    const r = await c.checkout(s, 'ro')
    assert.ok(r.ok)
    return r.value
  }
  assert.equal(stepFor(await at(FIXTURES.cart), 'payment'), 'contact')
  assert.equal(stepFor(await at(FIXTURES.contact), 'payment'), 'delivery')
  assert.equal(stepFor(await at(FIXTURES.address), 'payment'), 'delivery')
  assert.equal((await at(FIXTURES.pickup))?.delivery?.method.id, 'locker')
  const ready = await at(FIXTURES.ready)
  assert.equal(stepFor(ready, 'payment'), 'payment')
  assert.deepEqual(ready?.cart.total, RON(49970 - 4997 + 1999))
  const last = await c.lastOrder(FIXTURES.placed, 'ro')
  assert.ok(last.ok)
  assert.equal(last.value?.code, 'EXEMPLU1')
})

