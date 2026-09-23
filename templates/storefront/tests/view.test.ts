import { test } from 'node:test'
import assert from 'node:assert/strict'
import { sample } from '../lib/source/sample/catalog.ts'
import { shelfCard } from '../lib/view.ts'
import { faqLd } from '../lib/ld.ts'

test('a shelf card carries ready strings: address, "from" price, stock', async () => {
  const r = await sample.cards('ro', ['ulei-cbd-full-spectrum', 'ser-fata-cbd'])
  assert.ok(r.ok)
  const [oil, serum] = r.value.map((c) => shelfCard('ro', c))
  assert.equal(oil.href, '/ro/product/ulei-cbd-full-spectrum')
  assert.equal(oil.price, 'de la 89,90\u00a0lei')
  assert.equal(oil.stock, 'În stoc')
  assert.equal(serum.price, '159,90\u00a0lei')
  assert.equal(serum.stock, 'Stoc epuizat')
})

test('FAQ markup lists exactly the questions it is given', () => {
  const ld = faqLd([{ q: 'Q1', a: 'A1' }, { q: 'Q2', a: 'A2' }])
  assert.equal(ld['@type'], 'FAQPage')
  assert.equal(ld.mainEntity.length, 2)
  assert.deepEqual(ld.mainEntity[1], { '@type': 'Question', name: 'Q2', acceptedAnswer: { '@type': 'Answer', text: 'A2' } })
})
