import { test } from 'node:test'
import assert from 'node:assert/strict'
import { sample } from '../lib/source/sample/catalog.ts'
import { productView } from '../lib/product-view.ts'

const none = { category: null, related: [] }

test('nothing chosen: a "from" price, a request to choose and a button without a price', async () => {
  const r = await sample.product('ro', 'ulei-cbd-full-spectrum')
  assert.ok(r.ok)
  const v = productView('ro', r.value, {}, none)
  assert.equal(v.price, 'de la 34,90 €')
  assert.equal(v.message, 'Alegeți o variantă')
  assert.equal(v.stock, null)
  assert.equal(v.buy.variant, null)
  assert.equal(v.buy.add, 'Adaugă în coș', 'выключенная кнопка называет одно действие')
})

test('a chosen variant: its price, its stock and the report of its batch', async () => {
  const r = await sample.product('ro', 'ulei-cbd-full-spectrum')
  assert.ok(r.ok)
  const v = productView('ro', r.value, { putere: '20', volum: '10' }, none)
  assert.equal(v.price, '64,90 €')
  assert.equal(v.stock, 'În stoc')
  assert.equal(v.message, null)
  assert.equal(v.lab?.title, 'Buletin de analiză')
  assert.equal(v.lab?.batch, 'Lot RO-2409-20')
  assert.deepEqual(v.lab?.rows.map(([k]) => k), ['Laborator', 'Data analizei', 'CBD', 'THC'])
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
  assert.equal(v.lab, null)
})

/* Цена в кнопке — выбранного варианта, за штуку: строку собирает вид, а не
   компонент; количество её не пересчитывает (как у Shopify). */
test('buying: only a chosen variant in stock goes to the cart, and the button names its price', async () => {
  const oil = await sample.product('en', 'ulei-cbd-full-spectrum')
  assert.ok(oil.ok)
  assert.equal(productView('en', oil.value, {}, none).buy.variant, null)
  const chosen = productView('en', oil.value, { putere: '20', volum: '10' }, none).buy
  assert.equal(chosen.variant, 'uf-20-10')
  assert.equal(chosen.add, 'Add to cart · €64.90')
  const out = productView('en', oil.value, { putere: '30', volum: '10' }, none).buy
  assert.equal(out.variant, null)
  assert.equal(out.add, 'Add to cart', 'нет в наличии — цены в кнопке нет')
  const cream = await sample.product('ro', 'crema-cbd')
  assert.ok(cream.ok)
  const buy = productView('ro', cream.value, {}, none).buy
  assert.equal(buy.variant, 'cr-50')
  assert.equal(buy.add, 'Adaugă în coș · 24,90 €')
  assert.equal(buy.view.href, '/ro/cart')
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
  assert.equal(v.gallery.badge, '−15%', 'без выбора — скидка самой низкой цены')
  assert.deepEqual(v.was, { text: '€46.90', said: 'Was €46.90' })
  const sixty = productView('ro', caps.value, { bucati: '60' }, none)
  assert.equal(sixty.gallery.badge, null)
  assert.equal(sixty.was, null)
  assert.equal(productView('ro', caps.value, { bucati: '30' }, none).gallery.badge, '−15 %')
  const cream = await sample.product('hu', 'crema-cbd')
  assert.ok(cream.ok)
  assert.equal(productView('hu', cream.value, {}, none).gallery.slides.length, 3, 'у косметики три снимка')
})
