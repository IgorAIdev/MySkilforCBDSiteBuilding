import { test, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { stepsView, contactView, daysText, deliveryView, paymentView, doneView } from '../lib/checkout-view.ts'
import { sampleCommerce as c, resetSample, FIXTURES } from '../lib/source/sample/commerce.ts'
import type { Lang } from '../lib/locale.ts'

beforeEach(() => resetSample())
const NB = '\u00a0'
async function at(session: string, lang: Lang = 'ro') {
  const r = await c.checkout(session, lang)
  assert.ok(r.ok && r.value)
  return r.value
}
async function methods(lang: Lang = 'ro') {
  const r = await c.deliveryMethods(null, lang)
  assert.ok(r.ok)
  return r.value
}

test('steps: passed ones are links back, the current one is marked, later ones have no address', () => {
  const v = stepsView('ro', 'delivery')
  assert.deepEqual(v.items.map((i) => [i.name, i.href, i.current]), [
    ['Date de contact', '/ro/checkout/contact', false],
    ['Livrare', null, true],
    ['Plată', null, false],
  ])
})

test('contact: fields keep what the checkout already knows', async () => {
  const v = contactView('ro', (await at(FIXTURES.contact)).contact)
  assert.deepEqual(v.fields.map((f) => [f.name, f.type, f.autoComplete, f.value]), [
    ['email', 'email', 'email', 'ana.popescu@example.com'],
    ['firstName', 'text', 'given-name', 'Ana'],
    ['lastName', 'text', 'family-name', 'Popescu'],
    ['phone', 'tel', 'tel', '0722 123 456'],
  ])
  assert.equal(v.submit, 'Continuă')
})

test('days count by the upper end, in every language', () => {
  assert.equal(daysText('ro', { min: 1, max: 1 }), '1 zi lucrătoare')
  assert.equal(daysText('ro', { min: 2, max: 2 }), '2 zile lucrătoare')
  assert.equal(daysText('ro', { min: 1, max: 3 }), '1–3 zile lucrătoare')
  assert.equal(daysText('en', { min: 1, max: 1 }), '1 working day')
  assert.equal(daysText('hu', { min: 1, max: 2 }), '1–2 munkanap')
  assert.equal(daysText('ro', null), null)
})

test('delivery: methods speak their kind, carrier and days; nothing chosen — no details', async () => {
  const v = deliveryView('ro', { methods: await methods(), delivery: null, pickup: null })
  assert.deepEqual(v.methods.map((m) => [m.id, m.meta, m.price, m.checked]), [
    ['curier', 'La adresă · FAN Courier · 1–2 zile lucrătoare', `19,99${NB}lei`, false],
    ['locker', 'Punct de ridicare · Sameday · 1–2 zile lucrătoare', `12,99${NB}lei`, false],
    ['magazin', 'Punct de ridicare', 'Gratuit', false],
  ])
  assert.equal(v.details, null)
})

test('delivery to the door asks for the address; the country comes from the market', async () => {
  const s = await at(FIXTURES.address)
  const v = deliveryView('ro', { methods: await methods(), delivery: s.delivery, pickup: null })
  assert.equal(v.methods.find((m) => m.checked)?.id, 'curier')
  assert.ok(v.details?.kind === 'address')
  assert.deepEqual(v.details.fields.map((f) => f.name), ['street', 'city', 'region', 'postalCode'])
  assert.equal(v.details.fields[3].inputMode, 'numeric')
  assert.deepEqual(v.details.country, { label: 'Țara', value: 'România' })
})

test('a pickup point is searched by town: prompt, nothing found, found', async () => {
  const s = await at(FIXTURES.pickup)
  const ms = await methods()
  const prompt = deliveryView('ro', { methods: ms, delivery: s.delivery, pickup: { listed: false, city: '', points: [] } })
  assert.ok(prompt.details?.kind === 'pickup')
  assert.equal(prompt.details.prompt, 'Scrieți localitatea pentru a vedea punctele de ridicare.')
  assert.equal(prompt.details.search?.action, '/ro/checkout/delivery')
  const none = deliveryView('ro', { methods: ms, delivery: s.delivery, pickup: { listed: false, city: 'Vaslui', points: [] } })
  assert.ok(none.details?.kind === 'pickup')
  assert.equal(none.details.empty?.title, 'Niciun punct de ridicare în „Vaslui”')
  const pts = await c.pickupPoints('ro', 'locker', 'București')
  assert.ok(pts.ok)
  const found = deliveryView('ro', { methods: ms, delivery: s.delivery, pickup: { listed: false, city: 'București', points: pts.value } })
  assert.ok(found.details?.kind === 'pickup')
  assert.equal(found.details.points[0].meta, 'Locker · Bd. Exemplului 1 · București')
  assert.equal(found.details.prompt, null)
})

test('payment: eligible first, the rest disabled with the reason; the review and the obligation to pay', async () => {
  const s = await at(FIXTURES.ready)
  const pay = await c.paymentMethods(FIXTURES.ready, 'ro')
  assert.ok(pay.ok)
  const v = paymentView('ro', { methods: pay.value, checkout: s, terms: { title: 'Termeni și condiții', href: '/ro/info/termeni' } })
  assert.deepEqual(v.methods.map((m) => [m.code, m.checked, m.disabled]), [['ramburs', true, false], ['transfer', false, false]])
  assert.deepEqual(v.recaps.map((r) => r.lines), [
    ['Ana Popescu', 'ana.popescu@example.com', '0722 123 456'],
    ['Curier la domiciliu · FAN Courier', 'Str. Exemplului 1', '010011 București', 'București'],
  ])
  assert.equal(v.recaps[1].change!.href, '/ro/checkout/delivery')
  assert.equal(v.recaps[1].change!.aria, 'Modifică: Livrare')
  assert.equal(v.items[0].line, 'Ulei CBD full spectrum × 1')
  assert.equal(v.items[0].detail, '20 % · 10 ml')
  assert.equal(v.totals.total.value, `469,72${NB}lei`)
  assert.equal(v.submit, 'Comandă cu obligație de plată')
  assert.deepEqual(v.expected, { minor: '46972', currency: 'RON' }, 'the form carries the total the buyer sees')
  const hu = paymentView('hu', { methods: pay.value, checkout: await at(FIXTURES.ready, 'hu'), terms: { title: 'ÁSZF', href: '/hu/info/termeni' } })
  assert.equal(hu.recaps[0].lines[0], 'Popescu Ana')
})

test('done: the order number, what, where and how it is paid', async () => {
  const r = await c.lastOrder(FIXTURES.placed, 'ro')
  assert.ok(r.ok && r.value)
  const v = doneView('ro', r.value)
  assert.equal(v.code, 'Numărul comenzii: EXEMPLU1')
  assert.equal(v.review, 'Detaliile comenzii')
  assert.equal(v.recaps[0].change, null)
  assert.deepEqual(v.recaps.map((x) => x.title), ['Date de contact', 'Livrare', 'Plată'])
  assert.deepEqual(v.recaps[2].lines, ['Plata la livrare (ramburs)', 'Plătiți la primirea coletului.'])
  assert.equal(v.totals.rows.at(-1)?.value, `19,99${NB}lei`)
})
