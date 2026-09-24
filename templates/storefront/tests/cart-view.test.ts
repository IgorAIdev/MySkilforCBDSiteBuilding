import { test, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { cartView, priceOrFree } from '../lib/cart-view.ts'
import { pledgesView } from '../lib/pledges.ts'
import { sampleCommerce, resetSample, FIXTURES } from '../lib/source/sample/commerce.ts'
import { sampleContent } from '../lib/source/sample/content.ts'
import { sample } from '../lib/source/sample/catalog.ts'
import type { DeliveryMethod } from '../lib/source/contract.ts'

beforeEach(() => resetSample())
const NB = ' '

async function fixtureCart(lang: 'ro' | 'hu' = 'ro') {
  const r = await sampleCommerce.checkout(FIXTURES.cart, lang)
  assert.ok(r.ok && r.value)
  return r.value.cart
}

test('a cart line: link back to its variant, facts, unit price, one stepper, a worded remove', async () => {
  const v = cartView('ro', await fixtureCart(), null)
  assert.equal(v.count, '3 produse')
  const [oil, caps] = v.lines
  assert.equal(oil.href, '/ro/product/ulei-cbd-full-spectrum?option.putere=20&option.volum=10')
  assert.equal(oil.facts, '20 % · 10 ml')
  assert.equal(oil.unit, `64,90${NB}€ / buc.`)
  assert.equal(oil.total, `64,90${NB}€`)
  assert.deepEqual([oil.stepper.less.op, oil.stepper.more.op, oil.remove.op], [null, 'set:l1:2', 'remove:l1'])
  assert.equal(oil.stepper.less.label, 'Scade cantitatea: Ulei CBD full spectrum', 'a step with nowhere to go is off, but still named')
  assert.deepEqual([caps.stepper.less.op, caps.stepper.value], ['set:l2:1', 2])
  assert.deepEqual([caps.remove.text, caps.remove.label], ['Șterge', 'Șterge din coș: Capsule CBD 25 mg'])
})

test('totals are the source’s, as ready strings', async () => {
  const v = cartView('ro', await fixtureCart(), null)
  assert.deepEqual(v.totals.rows, [
    { label: 'Subtotal', value: `144,70${NB}€` },
    { label: 'Reducere CBD10', value: `−14,47${NB}€` },
    { label: 'Livrare', value: 'Se alege la pasul următor' },
  ])
  assert.deepEqual(v.totals.total, { label: 'Total', value: `130,23${NB}€` })
  assert.equal(v.totals.note, 'Prețurile includ TVA.')
  assert.deepEqual(v.coupon.applied, [{ code: 'CBD10', op: 'uncoupon:CBD10', label: 'Elimină codul CBD10' }])
  assert.equal(v.checkout.href, '/ro/checkout/contact')
  assert.equal(cartView('hu', await fixtureCart('hu'), null).count, '3 termék')
})

test('the notice comes from a known code only; an empty cart says what next', () => {
  const empty = cartView('ro', null, 'ok:remove')
  assert.deepEqual(empty.lines, [])
  assert.equal(empty.notice?.message, 'Produsul a fost scos din coș.')
  assert.deepEqual([empty.empty.title, empty.empty.step, empty.empty.href], ['Coșul este gol', 'Vedeți produsele', '/ro/catalog'])
  assert.equal(empty.empty.shelf, null, 'no data — no shelf')
  assert.equal(cartView('ro', null, 'nonsense').notice, null)
  assert.equal(priceOrFree('ro', { minor: 0, currency: 'EUR' }), 'Gratuit')
})

/* Код скидки свёрнут под вопросом (Baymard); раскрыт, когда о коде есть что
   сказать — ошибка кода. Исход кода и исход строки — в разных местах. */
test('a coupon outcome opens the folded code field; a line outcome shows by the lines', () => {
  const coupon = cartView('ro', null, 'e:coupon-expired')
  assert.equal(coupon.notice, null)
  assert.equal(coupon.couponNotice?.message, 'Codul a expirat — folosiți un cod valabil.')
  assert.equal(coupon.coupon.open, true)
  assert.equal(coupon.coupon.ask, 'Aveți un cod de reducere?')
  const line = cartView('ro', null, 'ok:remove')
  assert.equal(line.notice?.message, 'Produsul a fost scos din coș.')
  assert.equal(line.couponNotice, null)
  assert.equal(line.coupon.open, false)
  assert.equal(cartView('ro', null, 'ok:coupon').coupon.open, false, 'an applied code does not keep the field open')
})

/* Обещания у кнопки — из данных магазина (разбор 24.09.2026, K4): оплата
   при получении — если она допустима для этой корзины, доставка «от» — из
   списка способов, возврат — сроком из данных. */
test('pledges by the button come from the shop data, not from words in code', async () => {
  const pay = await sampleCommerce.paymentMethods(FIXTURES.cart, 'en')
  const methods = await sampleCommerce.deliveryMethods(null, 'en')
  const facts = await sampleContent.facts()
  assert.ok(pay.ok && methods.ok && facts.ok)
  const v = cartView('en', await fixtureCart(), null, { payments: pay.value, methods: methods.value, returnDays: facts.value.returnDays, popular: [] })
  assert.deepEqual(v.pledges.items, [
    { icon: 'package', text: 'Cash on delivery' },
    { icon: 'truck', text: 'Delivery from €3.49, pickup free' },
    { icon: 'shield-check', text: '14-day returns' },
  ])
  const over = pay.value.map((m) => (m.kind === 'on-delivery' ? { ...m, eligible: false } : m))
  assert.deepEqual(pledgesView('en', { payments: over, methods: null, returnDays: null }).items, [], 'COD not allowed for this cart — no line; nothing known — nothing said')
  const door: DeliveryMethod = { ...methods.value[0], price: { minor: 0, currency: 'EUR' } }
  assert.equal(pledgesView('ro', { payments: null, methods: [door, methods.value[1]], returnDays: 30 }).items.map((i) => i.text).join(' | '), 'Livrare gratuită | Retur în 30 de zile')
})

/* Запрет 10 (И331): количество на сайте меняется одним органом — корзина и
   карта товара берут QuantityStepper; поле числа не рисует больше никто. */
test('one quantity control on the site: the cart and the product page take the same stepper', () => {
  const dir = new URL('../components/', import.meta.url)
  const tsx = readdirSync(dir).filter((n) => n.endsWith('.tsx'))
  assert.deepEqual(tsx.filter((n) => /type="number"/.test(readFileSync(new URL(n, dir), 'utf8'))), ['QuantityStepper.tsx'])
  for (const user of ['CartView.tsx', 'AddToCart.tsx']) assert.match(readFileSync(new URL(user, dir), 'utf8'), /<QuantityStepper /, user)
})

test('the empty cart shows popular products from the source, as shelf cards', async () => {
  const shelf = await sample.listing('en', { facets: {}, sort: 'popular', page: null })
  assert.ok(shelf.ok)
  const v = cartView('en', null, null, { payments: null, methods: null, returnDays: null, popular: shelf.value.items.slice(0, 4) })
  assert.equal(v.empty.shelf?.title, 'Popular products')
  assert.equal(v.empty.shelf?.cards.length, 4)
  assert.equal(v.empty.shelf?.all.href, '/en/catalog')
  assert.match(v.empty.shelf?.cards[0].href ?? '', /^\/en\/product\//)
})
