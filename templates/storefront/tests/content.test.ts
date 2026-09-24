import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { sampleContent } from '../lib/source/sample/content.ts'
import { sampleCommerce } from '../lib/source/sample/commerce.ts'
import { PRODUCTS } from '../lib/products.ts'

test('home page blocks exist in every language, in one order, and point at real products', async () => {
  for (const lang of ['ro', 'en', 'hu'] as const) {
    const r = await sampleContent.page(lang, 'home')
    assert.ok(r.ok, lang)
    assert.deepEqual(r.value.blocks.map((b) => b.type), ['hero', 'categories', 'featured', 'lab', 'story', 'delivery', 'faq'])
    for (const b of r.value.blocks) if (b.type === 'featured') for (const id of b.ids) assert.ok(PRODUCTS.some((p) => p.id === id), id)
    /* Герой лежит поверх широкого снимка — снимок у него свой, а не первая
       карточка полки (флакон во весь экран под заголовком). */
    const hero = r.value.blocks.find((b) => b.type === 'hero')
    assert.ok(hero?.type === 'hero' && hero.image.width > hero.image.height, `${lang}: снимок героя широкий`)
  }
})

/* И279: способ доставки словами блока — второй источник срока и цены.
   «Delivered in 1–3 working days» стояло на главной рядом с «1–2» из
   данных магазина. Способы, срок и цену блок берёт у того же списка, что
   выбор на оформлении; своими словами он несёт только заметки об оплате. */
test('the home delivery block does not name a delivery method: methods, days and prices come from the shop data', async () => {
  for (const lang of ['ro', 'en', 'hu'] as const) {
    const r = await sampleContent.page(lang, 'home')
    const m = await sampleCommerce.deliveryMethods(null, lang)
    assert.ok(r.ok && m.ok, lang)
    const names = new Set(m.value.map((x) => x.name))
    for (const b of r.value.blocks) if (b.type === 'delivery') for (const i of b.items) assert.ok(!names.has(i.title), `${lang}: «${i.title}» — способ доставки словами блока`)
  }
})

/* Протокол на главной ведёт к САМОМУ документу, а не к якорю на той же
   странице: обещание «протокол на каждую партию» проверяется открытием. */
test('the home lab report links to a document that exists', async () => {
  const r = await sampleContent.page('en', 'home')
  assert.ok(r.ok)
  const lab = r.value.blocks.find((b) => b.type === 'lab')
  assert.ok(lab?.type === 'lab' && lab.report)
  assert.match(lab.report.url, /^\/[^#]+$/)
  assert.ok(existsSync(new URL(`../public${lab.report.url}`, import.meta.url)), lab.report.url)
})

test('the required pages exist in every language', async () => {
  for (const lang of ['ro', 'en', 'hu'] as const) {
    const r = await sampleContent.docs(lang)
    assert.ok(r.ok)
    assert.deepEqual(r.value.map((d) => d.slug).sort(), ['confidentialitate', 'contact', 'despre-noi', 'livrare-si-plata', 'retur', 'termeni'])
    for (const d of r.value) assert.ok(d.title && d.summary && d.sections.length >= 2, `${lang}/${d.slug}`)
  }
  assert.deepEqual(await sampleContent.doc('ro', 'nu-exista'), { ok: false, reason: 'not-found' })
})
