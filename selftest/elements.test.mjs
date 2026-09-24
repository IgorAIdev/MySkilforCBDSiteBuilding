/**
 * Элементы на выбор (И336): метки из словаря, семья заведена, состояния
 * продуманы и показаны застывшими, у каждого элемента есть источник и
 * отрисовка. Страница собирается из каталога, а не набирается рукой.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { auditElements, toHtml, sheetIds } from '../tools/elements.mjs'

const DIR = fileURLToPath(new URL('../elements', import.meta.url))
const ids = sheetIds(readFileSync(fileURLToPath(new URL('../styles/icons.svg', import.meta.url)), 'utf8'))
const catalog = JSON.parse(readFileSync(join(DIR, 'elements.json'), 'utf8'))
const read = (p) => (existsSync(join(DIR, p)) ? readFileSync(join(DIR, p), 'utf8') : null)

test('the elements catalog is clean: tags from the vocabulary, states thought out, files in place', () => {
  assert.deepEqual(auditElements(catalog, read, ids), [])
})

test('a tag outside the vocabulary, a missing family and an unthought state are named', () => {
  const bad = structuredClone(catalog)
  bad.элементы[0].метки.заливка = 'стекло'
  bad.элементы[0].семья = 'нет-такой'
  delete bad.элементы[1].состояния.нажатие
  const found = auditElements(bad, read, ids).join('\n')
  assert.match(found, /01-header-pills: заливка: «стекло» не из словаря/)
  assert.match(found, /01-header-pills: семья «нет-такой» не заведена/)
  assert.match(found, /02-explore-arrow: состояние «нажатие» не продумано/)
})

test('an element that does not show its states frozen is named', () => {
  const found = auditElements(catalog, (p) => (p.endsWith('element.html') ? '<link rel="stylesheet" href="../base.css"><button>без состояний</button>' : read(p)), ids).join('\n')
  assert.match(found, /наведение и нажатие не показаны застывшими/)
})

/* Единая форма (И337): элемент не несёт своих стилей и красок — только
   атрибуты основы; значки — из листа набора. */
test('an element with its own style, its own colour or a sign outside the kit sheet is named', () => {
  const page = read('02-explore-arrow/element.html')
  const own = (html) => auditElements(catalog, (p) => (p === '02-explore-arrow/element.html' ? html : read(p)), ['arrow-right', 'arrow-left', 'search', 'shopping-cart']).join('\n')
  assert.match(own(page.replace('</head>', '<style>.x{padding:3px}</style></head>')), /свои стили/)
  assert.match(own(page.replace('<body>', '<body style="color:#ff0000">')), /своя краска/)
  assert.match(own(page.replace('../base.css', 'my.css')), /не на основе/)
  assert.match(own(page.replace('#arrow-right"', '#rocket"')), /значка «rocket» нет в листе набора/)
})

test('the page lists every element under its family, with its tags', () => {
  const html = toHtml(catalog)
  for (const e of catalog.элементы) assert.ok(html.includes(`${e.папка}/element.html`), e.папка)
  assert.match(html, /Мягкий тон/)
  assert.match(html, /поворот знака/)
})
