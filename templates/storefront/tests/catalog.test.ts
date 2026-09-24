import { test } from 'node:test'
import assert from 'node:assert/strict'
import { sample } from '../lib/source/sample/catalog.ts'
import type { ListingQuery } from '../lib/source/contract.ts'

const q = (over: Partial<ListingQuery> = {}): ListingQuery => ({ facets: {}, sort: 'popular', page: null, ...over })

test('categories and a shelf come from the sample in the asked language', async () => {
  const cols = await sample.collections('hu')
  assert.ok(cols.ok && cols.value.length === 4)
  const oils = await sample.listing('ro', q({ category: 'uleiuri' }))
  assert.ok(oils.ok)
  assert.equal(oils.value.total, 5)
  assert.ok(oils.value.items.every((c) => c.category === 'uleiuri'))
})

test('two values of one facet are alternatives, two facets narrow, unknown values are reported', async () => {
  const one = await sample.listing('ro', q({ facets: { forma: ['ulei'] } }))
  const two = await sample.listing('ro', q({ facets: { forma: ['ulei', 'capsule'] } }))
  const narrow = await sample.listing('ro', q({ facets: { forma: ['ulei'], putere: ['10'] } }))
  assert.ok(one.ok && two.ok && narrow.ok)
  assert.equal(one.value.total, 5)
  assert.equal(two.value.total, 7, 'ИЛИ внутри грани расширяет')
  assert.equal(narrow.value.total, 2, 'И между гранями сужает')
  const unknown = await sample.listing('ro', q({ facets: { forma: ['nu-exista'] } }))
  assert.ok(unknown.ok)
  assert.deepEqual(unknown.value.invalid, ['forma:nu-exista'])
})

test('page numbers: junk is a bad request, past the end is not found', async () => {
  assert.deepEqual(await sample.listing('ro', q({ page: 'abc' })), { ok: false, reason: 'bad-request' })
  assert.deepEqual(await sample.listing('ro', q({ page: '999' })), { ok: false, reason: 'not-found' })
  const second = await sample.listing('ro', q({ page: '2' }))
  assert.ok(second.ok)
  assert.deepEqual([second.value.page, second.value.pages, second.value.items.length], [2, 2, 4])
})

test('sorting by price is by the lowest variant price', async () => {
  const r = await sample.listing('ro', q({ sort: 'price-asc' }))
  assert.ok(r.ok)
  const low = r.value.items.map((c) => (c.price.kind === 'single' ? c.price.value.minor : c.price.min.minor))
  assert.deepEqual(low, [...low].sort((a, b) => a - b))
})

test('cards come in the asked order and unknown ids are skipped', async () => {
  const r = await sample.cards('en', ['capsule-cbd-25', 'nu-exista', 'ulei-cbd-full-spectrum'])
  assert.ok(r.ok)
  assert.deepEqual(r.value.map((c) => c.id), ['capsule-cbd-25', 'ulei-cbd-full-spectrum'])
  assert.equal(r.value[1].price.kind, 'range')
})

test('a product carries option groups, variants and lab reports; unknown id is not found', async () => {
  const p = await sample.product('en', 'ulei-cbd-full-spectrum')
  assert.ok(p.ok)
  assert.equal(p.value.optionGroups.length, 2)
  assert.ok(p.value.variants.some((v) => v.stock === 'out'), 'образец держит и «нет в наличии»')
  assert.equal(p.value.labReports.length, 4)
  assert.deepEqual(await sample.product('en', 'nu-exista'), { ok: false, reason: 'not-found' })
})

test('search finds by name in the asked language', async () => {
  const r = await sample.listing('hu', q({ q: 'olaj' }))
  assert.ok(r.ok && r.value.total >= 5)
  const none = await sample.listing('ro', q({ q: 'zzzz' }))
  assert.ok(none.ok && none.value.total === 0)
})

/* Снимки образца: три-четыре вида одного предмета (лицо, задник, упаковка,
   деталь), каждый помечен «sample» и детерминирован — те же данные дают тот
   же SVG байт в байт; первый — тот же, что на полке. */
test('every sample product has three or four images, marked and deterministic', async () => {
  const ids = await sample.productIds()
  assert.ok(ids.ok)
  for (const id of ids.value) {
    const [a, b, card] = await Promise.all([sample.product('en', id), sample.product('en', id), sample.cards('en', [id])])
    assert.ok(a.ok && b.ok && card.ok)
    assert.ok(a.value.images.length >= 3 && a.value.images.length <= 4, `${id}: ${a.value.images.length}`)
    assert.deepEqual(a.value.images, b.value.images, id)
    assert.equal(a.value.images[0].src, card.value[0].image.src, `${id}: главный снимок — тот же, что на полке`)
    assert.equal(new Set(a.value.images.map((i) => i.src)).size, a.value.images.length, `${id}: снимки разные`)
    assert.ok(a.value.images.every((i) => decodeURIComponent(i.src).includes('>sample</text>')), `${id}: пометка «sample»`)
  }
})
