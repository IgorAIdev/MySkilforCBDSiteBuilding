import { test } from 'node:test'
import assert from 'node:assert/strict'
import { sampleContent } from '../lib/source/sample/content.ts'
import { PRODUCTS } from '../lib/products.ts'

test('home page blocks exist in every language, in one order, and point at real products', async () => {
  for (const lang of ['ro', 'en', 'hu'] as const) {
    const r = await sampleContent.page(lang, 'home')
    assert.ok(r.ok, lang)
    assert.deepEqual(r.value.blocks.map((b) => b.type), ['hero', 'categories', 'featured', 'lab', 'delivery', 'faq'])
    for (const b of r.value.blocks) if (b.type === 'featured') for (const id of b.ids) assert.ok(PRODUCTS.some((p) => p.id === id), id)
    /* Герой лежит поверх широкого снимка — снимок у него свой, а не первая
       карточка полки (флакон во весь экран под заголовком). */
    const hero = r.value.blocks.find((b) => b.type === 'hero')
    assert.ok(hero?.type === 'hero' && hero.image.width > hero.image.height, `${lang}: снимок героя широкий`)
  }
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
