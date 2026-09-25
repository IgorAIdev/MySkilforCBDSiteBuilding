import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { arrange, HOMES, RECIPES } from '../lib/homes.ts'
import { PAGES } from '../lib/pages.ts'
import type { Block } from '../lib/source/contract.ts'

const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')

/* Вариант главной решает, ГДЕ стоит блок, а не ЕСТЬ ли он: блок владельца
   не пропадает ни в одном варианте, и ни один не встаёт дважды (снимок
   героя паузой — не второй герой, а его снимок отдельным местом). */
test('home variants: every block of the page stands once in every variant, in the variant order', () => {
  for (const lang of ['ro', 'en', 'hu'] as const) {
    const blocks = PAGES.home.blocks[lang]
    for (const home of HOMES) {
      const placed = arrange(blocks, home).filter((x) => x.slot !== 'still')
      assert.deepEqual([...placed.map((x) => x.block)].sort((a, b) => blocks.indexOf(a) - blocks.indexOf(b)), blocks, `${lang} · ${home}: каждый блок — один раз`)
      const order = RECIPES[home].map(([slot]) => slot)
      const at = placed.map((x) => order.indexOf(x.slot))
      assert.deepEqual(at, [...at].sort((a, b) => a - b), `${lang} · ${home}: порядок рецепта`)
      assert.equal(new Set(arrange(blocks, home).map((x) => x.key)).size, arrange(blocks, home).length, `${lang} · ${home}: ключи мест различны`)
    }
  }
})

test('home variants: a block type the recipe does not name still stands, at the end, in data order', () => {
  /* Тип, которого договор ещё не знает, — как придёт из админки раньше
     витрины: рецепт его не называет, место у него — в конце. */
  const later = [{ type: 'banner' }, { type: 'banner' }] as unknown as Block[]
  const blocks: Block[] = [later[0], ...PAGES.home.blocks.en, later[1]]
  for (const home of HOMES) {
    const placed = arrange(blocks, home)
    assert.deepEqual(placed.slice(-2).map((x) => x.block), later, home)
  }
})

test('home variants: the page marks which home it draws, and every variant has a recipe', () => {
  assert.match(read('app/[lang]/page.tsx'), /data-home=\{look\.home\}/)
  assert.deepEqual(Object.keys(RECIPES), [...HOMES])
  for (const home of HOMES) {
    const slots = RECIPES[home].map(([slot]) => slot)
    assert.equal(new Set(slots).size, slots.length, `${home}: место не повторяется`)
    for (const type of ['hero', 'categories', 'featured', 'lab', 'delivery', 'faq', 'story']) assert.ok(slots.includes(type as never), `${home}: ${type}`)
  }
})
