import { test } from 'node:test'
import assert from 'node:assert/strict'
import { bindUnits, factsLine, percentOf } from '../lib/facts.ts'
import { PRODUCTS, FACETS } from '../lib/products.ts'
import { sample } from '../lib/source/sample/catalog.ts'

const NB = ' '

test('concentration is mg ÷ (ml × 10), only for liquids with declared mg', () => {
  assert.equal(percentOf({ mg: 1000, size: 10, unit: 'ml' }), 10)
  assert.equal(percentOf({ mg: 250, size: 10, unit: 'ml' }), 2.5)
  assert.equal(percentOf({ mg: 750, size: 30, unit: 'pcs' }), null, 'у капсул концентрации нет')
  assert.equal(percentOf({ mg: null, size: 30, unit: 'ml' }), null)
})

test('the facts line follows how the product is sold', () => {
  const line = (strength: 'percent' | 'mg', packs: Parameters<typeof factsLine>[1]['packs']) => factsLine('en', { strength, packs })
  assert.equal(line('percent', [{ mg: 1000, size: 10, unit: 'ml' }]), `10${NB}%${NB}· 10${NB}ml${NB}· 1000${NB}mg`)
  assert.equal(line('percent', [{ mg: 2000, size: 10, unit: 'ml' }, { mg: 6000, size: 30, unit: 'ml' }]), `20${NB}%${NB}· 10/30${NB}ml`, 'всего мг у разных упаковок — не печатается')
  assert.equal(line('mg', [{ mg: 750, size: 30, unit: 'pcs' }, { mg: 1500, size: 60, unit: 'pcs' }]), `30/60${NB}×${NB}25${NB}mg`, 'у штучного — доза одной штуки')
  assert.equal(line('mg', [{ mg: 500, size: 50, unit: 'ml' }]), `500${NB}mg${NB}· 50${NB}ml`)
  assert.equal(line('mg', [{ mg: null, size: 30, unit: 'ml' }]), `30${NB}ml`)
  assert.equal(line('mg', []), null)
  assert.equal(factsLine('hu', { strength: 'percent', packs: [{ mg: 250, size: 10, unit: 'ml' }] }), `2,5${NB}%${NB}· 10${NB}ml${NB}· 250${NB}mg`)
})

test('a number stays with its unit in a name', () => {
  assert.equal(bindUnits('CBD oil 30 % forte'), `CBD oil 30${NB}% forte`)
  assert.equal(bindUnits('Capsule CBD 25 mg'), `Capsule CBD 25${NB}mg`)
  assert.equal(bindUnits('Gummies 5 mangos'), 'Gummies 5 mangos', 'слово, начатое как единица, — не единица')
})

/* Данные согласны с собой (shop, «Один факт о товаре — одно место»): что
   написано в варианте и в имени, то и выходит из упаковки. */
test('sample data agrees with itself: options, names and packs', () => {
  for (const p of PRODUCTS) {
    for (const v of p.variants) {
      if (v.options.putere) assert.equal(String(percentOf(v.pack)), v.options.putere, `${v.id}: концентрация`)
      if (v.options.volum) assert.equal(`${v.pack.size}${v.pack.unit}`, `${v.options.volum}ml`, `${v.id}: объём`)
      if (v.options.bucati) assert.equal(`${v.pack.size}${v.pack.unit}`, `${v.options.bucati}pcs`, `${v.id}: штук`)
    }
    const pct = /(\d+(?:[.,]\d+)?)\s*%/.exec(p.name.en)
    if (pct) for (const v of p.variants) assert.equal(percentOf(v.pack), Number(pct[1].replace(',', '.')), `${p.id}: процент в имени`)
    const dose = /(\d+)\s*mg/.exec(p.name.en)
    if (dose && p.variants[0].pack.unit === 'pcs') for (const v of p.variants) assert.equal((v.pack.mg ?? 0) / v.pack.size, Number(dose[1]), `${p.id}: доза в имени`)
  }
})

test('every derived strength is a value of the strength facet', async () => {
  const known = new Set(FACETS.find((f) => f.code === 'putere')?.values.map((v) => v.code))
  for (const p of PRODUCTS.filter((x) => x.strength === 'percent')) {
    for (const v of p.variants) assert.ok(known.has(String(percentOf(v.pack))), `${v.id}: ${percentOf(v.pack)} % нет в грани`)
  }
  const r = await sample.listing('en', { facets: { putere: ['5'] }, sort: 'popular', page: null })
  assert.ok(r.ok)
  assert.ok(r.value.items.every((c) => c.strength === 'percent'), 'капсулы под «5 %» не попадают')
})
