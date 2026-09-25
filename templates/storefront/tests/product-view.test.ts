import { test } from 'node:test'
import assert from 'node:assert/strict'
import { sample } from '../lib/source/sample/catalog.ts'
import { labView, productView } from '../lib/product-view.ts'

const none = { category: null, related: [] }

test('nothing chosen: a "from" price, an open button without a price that leads to the choice', async () => {
  const r = await sample.product('ro', 'ulei-cbd-full-spectrum')
  assert.ok(r.ok)
  const v = productView('ro', r.value, {}, none)
  assert.equal(v.price, 'de la 34,90 €')
  assert.equal(v.message, null, 'до нажатия под кнопкой ничего: она открыта')
  assert.equal(v.choose, null, 'ошибка выбора — только после нажатия')
  assert.equal(v.stock, null)
  assert.equal(v.buy.variant, null)
  assert.equal(v.buy.add, 'Adaugă în coș', 'без варианта — одно действие, без цены')
  /* Кнопка не выключена: форма ведёт на адрес карты с тем, что уже выбрано,
     и `choose=1` — адрес разобран из hrefFor. */
  assert.deepEqual(v.buy.ask, { action: '/ro/product/ulei-cbd-full-spectrum', keep: [['choose', '1']] })
  const half = productView('en', r.value, { volum: '10' }, none)
  assert.deepEqual(half.buy.ask, { action: '/en/product/ulei-cbd-full-spectrum', keep: [['option.volum', '10'], ['choose', '1']] }, 'выбранное едет в адресе')
  /* Нажали без выбора: «Choose an option» у групп выбора. */
  const asked = productView('en', r.value, { volum: '10' }, { ...none, asked: true })
  assert.equal(asked.choose, 'Choose an option')
  assert.equal(asked.message, null)
  assert.equal(productView('en', r.value, { putere: '20', volum: '10' }, { ...none, asked: true }).choose, null, 'выбрано — ошибки нет')
})

test('a chosen variant: its price, its stock and the key figures of its pack', async () => {
  const r = await sample.product('ro', 'ulei-cbd-full-spectrum')
  assert.ok(r.ok)
  const v = productView('ro', r.value, { putere: '20', volum: '10' }, none)
  assert.equal(v.price, '64,90 €')
  assert.equal(v.stock, 'În stoc')
  assert.equal(v.message, null)
  /* Поле основных параметров вместо протокола (слово заказчика 25.09.2026):
     2000 мг в 10 мл — 200 мг в 1 мл, 10 мг в капле 0,05 мл, 200 капель,
     64,90 € ÷ 2000 мг. */
  const NB = ' '
  assert.deepEqual(v.facts?.rows.map((x) => [x.value, x.label, x.note]), [
    [`2000${NB}mg`, 'CBD în total', null],
    [`200${NB}mg`, 'CBD în 1 ml', null],
    [`10${NB}mg`, 'CBD într-o picătură', '≈ 200 picături în flacon'],
    [`0,032${NB}€`, 'pentru 1 mg de CBD', null],
  ])
  const doc = labView('en', { batch: 'RO-2409-10', lab: 'Lab', date: '2026-09-02', cbdPercent: 10, thcPercent: 0.1, url: '/sample/lab-RO-2409-10.pdf' })
  assert.deepEqual(doc.open, { label: 'Open the lab report', href: '/sample/lab-RO-2409-10.pdf' }, 'протокол — блоком главной')
  assert.equal(productView('ro', r.value, {}, none).facts, null, 'без выбора поля нет: у упаковок разные числа')
  const gone = productView('ro', r.value, { putere: '30', volum: '10' }, none)
  assert.equal(gone.stock, 'Stoc epuizat')
  assert.equal(gone.message, null)
  const missing = productView('en', r.value, { putere: '5', volum: '30' }, none)
  assert.equal(missing.message, 'This combination does not exist')
})

test('a single product has its own price and no choice to make', async () => {
  const r = await sample.product('hu', 'capsule-cbd-10')
  assert.ok(r.ok)
  const v = productView('hu', r.value, {}, none)
  assert.equal(v.price, '34,90 €')
  assert.equal(v.message, null)
  assert.equal(v.groups.length, 0)
  /* Капсулы: доза штуки, капель нет. */
  assert.deepEqual(v.facts?.rows.map((x) => x.label), ['CBD összesen', 'CBD egy darabban', '1 mg CBD ára'])
})

/* Цены в кнопке нет: она стоит под именем (слово заказчика 25.09.2026,
   И441). Окно быстрого заказа называет марку, имя и упаковку варианта. */
test('buying: only a chosen variant in stock goes to the cart; the button carries no price', async () => {
  const oil = await sample.product('en', 'ulei-cbd-full-spectrum')
  assert.ok(oil.ok)
  assert.equal(productView('en', oil.value, {}, none).buy.variant, null)
  const chosen = productView('en', oil.value, { putere: '20', volum: '10' }, none).buy
  assert.equal(chosen.variant, 'uf-20-10')
  assert.equal(chosen.add, 'Add to cart')
  assert.match(chosen.quick.what, /^Câmpia Full-spectrum CBD oil · 20/)
  const out = productView('en', oil.value, { putere: '30', volum: '10' }, none).buy
  assert.equal(out.variant, null)
  assert.equal(out.ask, null, 'распродано — выбирать нечего, кнопка выключена')
  assert.equal(productView('en', oil.value, { putere: '5', volum: '30' }, none).buy.ask, null, 'сочетания нет — кнопка выключена, почему — message')
  assert.equal(out.add, 'Add to cart')
  const cream = await sample.product('ro', 'crema-cbd')
  assert.ok(cream.ok)
  const buy = productView('ro', cream.value, {}, none).buy
  assert.equal(buy.variant, 'cr-50')
  assert.equal(buy.ask, null, 'один вариант выбран сам')
  assert.equal(buy.add, 'Adaugă în coș')
  assert.match(buy.quick.what, /^Floare Verde /)
})

/* Галерея: снимки по порядку, первый — главный; у каждого якорь и имя
   ссылки миниатюры. Плашка скидки — у той цены, что напечатана. */
test('the gallery: every image with its anchor and name; the sale badge follows the shown price', async () => {
  const caps = await sample.product('en', 'capsule-cbd-25')
  assert.ok(caps.ok)
  const v = productView('en', caps.value, {}, none)
  assert.equal(v.gallery.slides.length, 4)
  assert.deepEqual(v.gallery.slides.map((s) => s.id), ['shot-1', 'shot-2', 'shot-3', 'shot-4'])
  assert.equal(v.gallery.slides[0].alt, 'CBD capsules 25 mg')
  assert.equal(v.gallery.slides[1].alt, 'CBD capsules 25 mg, the back label')
  assert.equal(v.gallery.slides[2].show, 'Image 3 of 4')
  assert.equal(v.gallery.badge, '−15\u00a0%', 'без выбора — скидка самой низкой цены; процент — одной записью с фактами и на английском (И347)')
  assert.deepEqual(v.was, { text: '€46.90', said: 'Was €46.90' })
  const sixty = productView('ro', caps.value, { bucati: '60' }, none)
  assert.equal(sixty.gallery.badge, null)
  assert.equal(sixty.was, null)
  assert.equal(productView('ro', caps.value, { bucati: '30' }, none).gallery.badge, '−15 %')
  const cream = await sample.product('hu', 'crema-cbd')
  assert.ok(cream.ok)
  assert.equal(productView('hu', cream.value, {}, none).gallery.slides.length, 3, 'у косметики три снимка')
})
