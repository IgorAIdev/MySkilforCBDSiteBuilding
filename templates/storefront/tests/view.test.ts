import { test } from 'node:test'
import assert from 'node:assert/strict'
import { sample } from '../lib/source/sample/catalog.ts'
import { shelfCard } from '../lib/view.ts'
import { faqLd } from '../lib/ld.ts'

test('a shelf card carries ready strings: address, "from" price, facts, stock only as an exception', async () => {
  const r = await sample.cards('ro', ['ulei-cbd-full-spectrum', 'ser-fata-cbd', 'ulei-pisici-cbd'])
  assert.ok(r.ok)
  const [oil, serum, cats] = r.value.map((c) => shelfCard('ro', c))
  assert.equal(oil.href, '/ro/product/ulei-cbd-full-spectrum')
  assert.equal(oil.price, 'de la 34,90 €')
  assert.equal(oil.flag, null, '«în stoc» на полке не печатается')
  assert.equal(oil.facts, '5–\u206030 % · 10/30 ml')
  assert.equal(serum.price, '32,90 €')
  assert.deepEqual(serum.flag, { level: 'out', text: 'Stoc epuizat' })
  assert.deepEqual(cats.flag?.level, 'low')
  assert.equal(cats.facts, '2,5 % · 10 ml · 250 mg')
})

test('a shelf card binds a number to its unit in the name', async () => {
  const r = await sample.cards('en', ['ulei-cbd-30-forte'])
  assert.ok(r.ok)
  assert.equal(shelfCard('en', r.value[0]).name, 'CBD oil 30 % forte')
})

/* «В корзину» с полки (слово заказчика 25.09.2026): вариант один — кладётся
   сразу; вариантов несколько — кнопка ведёт к выбору (И284); распродано —
   на карту словом «View». Прежняя цена — у товара одной цены. */
test('a shelf card buys one variant directly, sends a choice to the product page, shows the old price', async () => {
  const r = await sample.cards('en', ['ulei-cbd-30-forte', 'ulei-cbd-full-spectrum', 'ser-fata-cbd'])
  assert.ok(r.ok)
  const [forte, oil, serum] = r.value.map((c) => shelfCard('en', c))
  assert.equal(forte.buy.variant, 'uf30-10')
  assert.equal(forte.buy.add, 'Add')
  assert.equal(forte.buy.name, 'Add to cart: CBD oil 30 % forte')
  assert.equal(forte.was?.text, '€104.90')
  assert.equal(forte.sale, '−14 %')
  assert.equal(oil.buy.variant, null)
  assert.equal(oil.buy.choose, 'Choose')
  assert.equal(oil.buy.ask, '/en/product/ulei-cbd-full-spectrum?choose=1')
  assert.equal(oil.was, null, 'у цены «от» прежней цены нет')
  assert.equal(serum.buy.variant, null, 'распродано — с полки не купить')
  assert.equal(serum.buy.choose, 'View')
})

test('FAQ markup lists exactly the questions it is given', () => {
  const ld = faqLd([{ q: 'Q1', a: 'A1' }, { q: 'Q2', a: 'A2' }])
  assert.equal(ld['@type'], 'FAQPage')
  assert.equal(ld.mainEntity.length, 2)
  assert.deepEqual(ld.mainEntity[1], { '@type': 'Question', name: 'Q2', acceptedAnswer: { '@type': 'Answer', text: 'A2' } })
})
