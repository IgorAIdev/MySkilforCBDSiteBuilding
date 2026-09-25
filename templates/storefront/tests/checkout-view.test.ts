import { test, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { stepsView, contactView, daysText, deliveryView, paymentView, doneView, summaryView } from '../lib/checkout-view.ts'
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

test('steps: passed ones are links back, the current one is marked and names the page, later ones have no address', () => {
  const v = stepsView('ro', 'delivery')
  assert.deepEqual(v.items.map((i) => [i.name, i.href, i.current, i.done]), [
    ['Date de contact', '/ro/checkout/contact', false, true],
    ['Livrare', null, true, false],
    ['Plată', null, false, false],
  ])
  assert.equal(v.title, 'Livrare', 'the step is named once — as the page heading')
})

/* WCAG 1.3.5: у каждого поля о человеке — токен автозаполнения; имя и
   фамилия — парой в одном ряду (разбор 24.09.2026, O4). */
test('contact: fields keep what the checkout already knows, name and surname side by side', async () => {
  const v = contactView('ro', (await at(FIXTURES.contact)).contact)
  assert.deepEqual(v.rows.map((r) => r.map((f) => f.name)), [['email'], ['firstName', 'lastName'], ['phone']])
  assert.deepEqual(v.rows.flat().map((f) => [f.name, f.type, f.autoComplete, f.value]), [
    ['email', 'email', 'email', 'ana.popescu@example.com'],
    ['firstName', 'text', 'given-name', 'Ana'],
    ['lastName', 'text', 'family-name', 'Popescu'],
    ['phone', 'tel', 'tel', '0722 123 456'],
  ])
  assert.equal(v.submit, 'Continuă')
})

/* Порядок имени — факт языка (И381): по-венгерски фамилия первой, и поле
   фамилии стоит первым; токены автозаполнения при этом те же. */
test('contact: the name pair follows the page language — Hungarian asks for the family name first', async () => {
  const known = (await at(FIXTURES.contact, 'hu')).contact
  const hu = contactView('hu', known)
  assert.deepEqual(hu.rows[1].map((f) => [f.name, f.autoComplete, f.label]), [
    ['lastName', 'family-name', 'Vezetéknév'],
    ['firstName', 'given-name', 'Keresztnév'],
  ])
  assert.deepEqual(contactView('en', known).rows[1].map((f) => f.name), ['firstName', 'lastName'])
})

test('days count by the upper end, in every language', () => {
  assert.equal(daysText('ro', { min: 1, max: 1 }), `1${NB}zi lucrătoare`)
  assert.equal(daysText('ro', { min: 2, max: 2 }), `2${NB}zile lucrătoare`)
  assert.equal(daysText('ro', { min: 1, max: 3 }), `1–\u20603${NB}zile lucrătoare`)
  assert.equal(daysText('en', { min: 1, max: 1 }), `1${NB}working day`)
  assert.equal(daysText('hu', { min: 1, max: 2 }), `1–\u20602${NB}munkanap`)
  assert.equal(daysText('ro', null), null)
})

test('delivery: methods speak their kind, carrier and days; nothing chosen — no details', async () => {
  const v = deliveryView('ro', { methods: await methods(), delivery: null, pickup: null })
  assert.deepEqual(v.methods.map((m) => [m.id, m.meta, m.price, m.checked]), [
    ['curier', `La adresă · FAN Courier · 1–\u20602${NB}zile lucrătoare`, `4,99${NB}€`, false],
    ['locker', `Punct de ridicare · Sameday · 1–\u20602${NB}zile lucrătoare`, `3,49${NB}€`, false],
    ['magazin', 'Punct de ridicare', 'Gratuit', false],
  ])
  assert.equal(v.details, null)
})

test('delivery to the door asks for the address; the country comes from the market', async () => {
  const s = await at(FIXTURES.address)
  const v = deliveryView('ro', { methods: await methods(), delivery: s.delivery, pickup: null })
  assert.equal(v.methods.find((m) => m.checked)?.id, 'curier')
  assert.ok(v.details?.kind === 'address')
  assert.equal(v.saved, 'curier')
  const rows = v.details.rows
  assert.deepEqual(rows.map((r) => r.map((f) => f.name)), [['street'], ['postalCode', 'city'], ['region']], 'the short postcode stands by the town')
  assert.deepEqual(rows.flat().map((f) => f.autoComplete), ['address-line1', 'postal-code', 'address-level2', 'address-level1'])
  const [postal] = rows[1]
  assert.deepEqual([postal.inputMode, postal.short], ['numeric', true])
  const region = rows[2][0]
  assert.equal(region.options?.none, 'Alegeți județul')
  assert.equal(region.options?.values.length, 42)
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
  const v = paymentView('ro', { methods: pay.value, checkout: s, terms: { title: 'Termeni și condiții', href: '/ro/info/termeni' }, returnDays: 14 })
  assert.deepEqual(v.methods.map((m) => [m.code, m.checked, m.disabled]), [['ramburs', true, false], ['transfer', false, false]])
  assert.deepEqual(v.recaps.map((r) => r.lines), [
    ['Ana Popescu', 'ana.popescu@example.com', '0722 123 456'],
    ['Curier la domiciliu · FAN Courier', 'Str. Exemplului 1', '010011 București', 'București'],
  ])
  assert.equal(v.recaps[1].change!.href, '/ro/checkout/delivery')
  assert.equal(v.recaps[1].change!.aria, 'Modifică: Livrare')
  assert.deepEqual([v.items[0].name, v.items[0].facts, v.items[1].facts], ['Ulei CBD full spectrum', `20${NB}% · 10${NB}ml · Cant. 1`, `30${NB}buc. · Cant. 2`])
  assert.deepEqual(v.pledges.items.map((i) => i.text), ['Retur în 14 zile'], 'by the order button: the return deadline from the data')
  assert.equal(v.totals.total.value, `135,22${NB}€`)
  assert.equal(v.submit, 'Comandă cu obligație de plată')
  assert.deepEqual(v.expected, { minor: '13522', currency: 'EUR' }, 'the form carries the total the buyer sees')
  const hu = paymentView('hu', { methods: pay.value, checkout: await at(FIXTURES.ready, 'hu'), terms: { title: 'ÁSZF', href: '/hu/info/termeni' }, returnDays: null })
  assert.equal(hu.recaps[0].lines[0], 'Popescu Ana')
})

/* «Спасибо»: номер своим блоком; что дальше — из способов этого заказа их
   же словами; детали — кому и куда (разбор 24.09.2026, O8). */
test('done: the order number, what happens next from this order’s methods, who and where', async () => {
  const r = await c.lastOrder(FIXTURES.placed, 'ro')
  assert.ok(r.ok && r.value)
  const v = doneView('ro', r.value)
  assert.deepEqual(v.code, { label: 'Numărul comenzii', value: 'EXEMPLU1' })
  assert.equal(v.title, 'Mulțumim, comanda a fost plasată')
  assert.doesNotMatch(v.title, /!/, 'the voice has no exclamation marks (docs/words.md)')
  assert.equal(v.next.title, 'Ce urmează')
  assert.deepEqual(v.next.steps.map((x) => [x.title, x.lines]), [
    ['Livrare', [`Curier la domiciliu · FAN Courier · 1–\u20602${NB}zile lucrătoare`, 'Curierul vă sună înainte de livrare.']],
    ['Plată', ['Plata la livrare (ramburs)', 'Plătiți la primirea coletului.']],
  ])
  assert.equal(v.review, 'Detaliile comenzii')
  assert.equal(v.recaps[0].change, null)
  assert.deepEqual(v.recaps.map((x) => [x.title, x.lines]), [
    ['Date de contact', ['Ana Popescu', 'ana.popescu@example.com', '0722 123 456']],
    ['Adresa de livrare', ['Str. Exemplului 1', '010011 București', 'București']],
  ])
  assert.equal(v.totals.rows.at(-1)?.value, `4,99${NB}€`)
})

test('the checkout summary shows the items on every step, with the total for the phone line', async () => {
  const v = summaryView('en', (await at(FIXTURES.cart, 'en')).cart)
  assert.deepEqual(v.items.map((i) => i.name), ['Full-spectrum CBD oil', 'CBD capsules 25 mg'])
  assert.equal(v.show, 'Order summary')
  assert.equal(v.total, '€130.23')
  assert.equal(v.totals.total.value, v.total)
})
