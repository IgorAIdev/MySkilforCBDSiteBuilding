import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { lookSlots, readSite, render } from '../scripts/look-slots.mjs'
import { acceptLook, type Facts } from '../lib/look-rule.ts'
import { lookCss, type Slots } from '../lib/look-values.ts'
import { HEADERS } from '../lib/headers.ts'

/* Вид — один, значениями (CLAUDE.md, «Панель настройки физически отделена
   от сайта»; И270). Тесты сайта: опубликованный вид принимается сайтом без
   потерь, список свойств выпущен из стилей сайта и не отстал, в стилях сайта
   один вариант каждой группы, шапка рисует свои варианты. */
const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
const SLOTS = JSON.parse(read('lib/look-slots.json')) as { slots: Slots; facts: Facts }

test('look: the published look is accepted whole — every property known, every value of its kind, the combination holds', () => {
  const raw = JSON.parse(read('lib/source/sample/look.json')) as { header: string; vars: Record<string, string> }
  const { look, notes } = acceptLook(raw, SLOTS.slots, SLOTS.facts, HEADERS)
  assert.deepEqual(notes, [])
  assert.equal(look.header, raw.header)
  for (const [k, v] of Object.entries(look.vars)) assert.notEqual(SLOTS.slots[k].value, v, `${k}: значение по умолчанию в блок не идёт`)
  assert.ok(lookCss(look).length < 20000, 'блок вида — не каталог')
})

test('look: the property list is emitted from the site styles and is not behind them', () => {
  assert.equal(read('lib/look-slots.json').replace(/\r\n/g, '\n'), render(lookSlots(readSite(fileURLToPath(new URL('..', import.meta.url))))))
  const groups = new Set(Object.values(SLOTS.slots).map((s) => s.group))
  assert.deepEqual([...groups].sort(), ['button', 'face', 'marker', 'palette', 'scale'])
  for (const role of ['--page', '--plate', '--quiet', '--pop', '--on-pop']) assert.ok(SLOTS.facts.roles[role], role)
})

test('look: the site styles carry one variant of each group and no candidate fonts', () => {
  const one = (file: string, attr: string) => {
    const blocks = [...read(file).matchAll(new RegExp(`\\[${attr}="([^"]+)"\\]\\{`, 'g'))].map((m) => m[1])
    assert.ok(new Set(blocks).size <= 1, `${file}: ${[...new Set(blocks)].join(', ')}`)
  }
  one('styles/palette.css', 'data-palette')
  one('styles/buttons.css', 'data-button')
  one('styles/scale.css', 'data-scale')
  assert.ok(!read('styles/storefront.css').includes('[data-face='), 'шрифты-кандидаты — у панели')
  assert.ok(!read('components/Shell.tsx').includes('next/font'), 'next/font в сайте нет')
})

test('look: the header draws each variant the site keeps; the revalidation route knows only closed tags', () => {
  const header = read('components/Header.tsx')
  for (const h of HEADERS) assert.match(header, new RegExp(`data-variant="${h}"`), h)
  const route = read('app/api/revalidate/route.ts')
  assert.match(route, /const TAGS = \['look'\] as const/)
  assert.match(route, /REVALIDATE_SECRET/)
  /* `expire: 0` стирает запись статической страницы языка, и при
     `dynamicParams = false` Next отвечает «не найдено» (И270). */
  assert.doesNotMatch(route, /revalidateTag\([^)]*expire:\s*0/)
  assert.match(route, /revalidateTag\(known, 'max'\)/)
})
