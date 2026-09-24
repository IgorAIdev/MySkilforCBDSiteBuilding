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
import { auditElements, toHtml, sheetIds, byKind, listKinds } from '../tools/elements.mjs'

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
  assert.match(own(page.replace('data-sign="arrow-right"', 'data-sign="rocket"')), /значка «rocket» нет в листе набора/)
  assert.match(own(page.replace('<link rel="stylesheet" href="../palettes.css">', '')), /нет подключения \.\.\/palettes\.css/)
  assert.match(own(page.replace('<svg data-sign="arrow-right"></svg>', '<svg><use href="#arrow-right"/></svg>')), /через <use>/)
  assert.match(own(page.replace('<svg data-sign="arrow-right"></svg>', '<svg><path d="M5 12h14"/></svg>')), /свой рисунок значка/)
})

/* Лист значков — рисунки, а не орган: состояний и меток органа у него нет,
   свои рисунки ему положены. */
test('an icon set carries its own drawings and needs no control states', () => {
  const set = catalog.элементы.find((e) => e.род.includes('набор значков'))
  assert.ok(set, 'в каталоге есть лист значков')
  assert.deepEqual(auditElements({ ...catalog, элементы: [set] }, read, ids), [])
})

test('the page lists every element under its family, with its tags', () => {
  const html = toHtml(catalog)
  for (const e of catalog.элементы) assert.ok(html.includes(`${e.папка}/element.html`), e.папка)
  assert.match(html, /Мягкий тон/)
  assert.match(html, /поворот знака/)
  assert.match(toHtml(catalog, ['Латунь на угле', 'Аптека']), /data-set="palette"[\s\S]*data-value="Аптека"/, 'палитры набора — переключателем')
})

/* Поле не нажимается — в него пишут (И350): у элемента из одних полей
   вместо нажатия продумано заполненное, застывшими — наведение и фокус. */
test('a field needs no press state: it thinks out the filled one and shows hover and focus frozen', () => {
  const field = catalog.элементы.find((e) => e.род.every((k) => k === 'поле'))
  assert.ok(field, 'в каталоге есть поле')
  assert.equal(field.состояния.нажатие, undefined)
  assert.deepEqual(auditElements({ ...catalog, элементы: [field] }, read, ids), [])
  const unthought = structuredClone(field)
  delete unthought.состояния.заполнено
  assert.match(auditElements({ ...catalog, элементы: [unthought] }, read, ids).join('\n'), /состояние «заполнено» не продумано/)
  const page = read(`${field.папка}/element.html`)
  const found = auditElements({ ...catalog, элементы: [field] }, (p) => (p.endsWith('element.html') ? page.replaceAll('data-state="focus"', '') : read(p)), ids).join('\n')
  assert.match(found, /наведение и фокус не показаны застывшими/)
})

/* Элементы ищутся по роду (И351): оглавление на странице и выдача сессиям —
   из одного счёта; элемент с двумя родами стоит в обоих; имя — адрес поиска,
   двух одинаковых не бывает. */
test('elements are found by kind: one table of contents for the page and for --list', () => {
  const both = catalog.элементы.find((e) => e.род.length > 1)
  for (const k of both.род) assert.ok(byKind(catalog).find(([kind]) => kind === k)[1].includes(both), `${both.папка} стоит в роде «${k}»`)
  const lines = listKinds(catalog, 'поле')
  assert.match(lines[0], /^поле — \d+$/)
  for (const e of catalog.элементы.filter((x) => x.род.includes('поле'))) assert.ok(lines.includes(`  ${e.папка.slice(0, 2)} · ${e.имя} · ${catalog.семьи[e.семья].имя}`))
  assert.deepEqual(listKinds(catalog, 'нет-такого'), [])
  const html = toHtml(catalog)
  for (const e of catalog.элементы) {
    assert.ok(html.includes(`id="e-${e.папка.slice(0, 2)}"`), `у ${e.папка} есть якорь`)
    assert.ok(html.includes(`href="#e-${e.папка.slice(0, 2)}"`), `${e.папка} есть в оглавлении`)
  }
})

test('two elements with one name are named', () => {
  const twin = structuredClone(catalog)
  twin.элементы[1].имя = twin.элементы[0].имя
  assert.match(auditElements(twin, read, ids).join('\n'), /имя «.+» уже занято/)
})
