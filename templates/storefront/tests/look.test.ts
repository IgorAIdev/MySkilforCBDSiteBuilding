import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
/* Код вида ввозит next/* — тест читает его как текст: ему нужны списки
   собранных вариантов и значения источника образца. */
const list = (src: string, name: string) => {
  const from = src.indexOf('= [', src.indexOf(`${name}`)) + 2
  return [...src.slice(from, src.indexOf(']', from)).matchAll(/'([^']+)'/g)].map((m) => m[1])
}
const FACES = list(read('lib/faces.ts'), 'FACE_IDS')
const HEADERS = list(read('lib/look.ts'), 'HEADERS')
const LOOK = JSON.parse(read('lib/source/sample/look.json')) as Record<string, string>

test('look: the sample look names a face, a released button style, a header and a palette the site has built in', () => {
  assert.deepEqual(Object.keys(LOOK).sort(), ['button', 'face', 'header', 'palette'])
  assert.ok(FACES.includes(LOOK.face), `face ${LOOK.face}`)
  for (const f of FACES) assert.ok(read('styles/storefront.css').includes(`[data-face='${f}']{`), `блок [data-face='${f}']`)
  assert.ok(Object.keys(JSON.parse(read('styles/buttons.json'))).includes(LOOK.button), `button ${LOOK.button} в каталоге`)
  assert.ok(read('styles/buttons.css').includes(`[data-button="${LOOK.button}"]`), `button ${LOOK.button} выпущен на палитре`)
  assert.ok(Object.keys(JSON.parse(read('styles/palette.json'))).includes(LOOK.palette), `palette ${LOOK.palette}`)
  assert.ok(read('styles/palette.css').includes(`[data-palette="${LOOK.palette}"]`), `набор ${LOOK.palette} переключается атрибутом`)
  assert.deepEqual(HEADERS, ['classic', 'search', 'boutique'])
  assert.ok(HEADERS.includes(LOOK.header), `header ${LOOK.header}`)
})

test('look: the header draws each variant it is given; the revalidation route knows only closed tags', () => {
  const header = read('components/Header.tsx')
  for (const h of HEADERS) assert.match(header, new RegExp(`data-variant="${h}"`), h)
  const route = read('app/api/revalidate/route.ts')
  assert.match(route, /const TAGS = \['look'\] as const/)
  assert.match(route, /REVALIDATE_SECRET/)
})
