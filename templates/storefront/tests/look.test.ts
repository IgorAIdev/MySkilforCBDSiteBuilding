import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
/* Значения вида читаются как текст: lib/look.ts тянет next/headers, пока
   панель выбора не снята, а тесту нужен только утверждённый LOOK. */
const src = read('lib/look.ts')
const LOOK = Object.fromEntries([...(src.match(/export const LOOK: Look = \{([^}]*)\}/)?.[1] ?? '').matchAll(/(\w+): '([^']*)'/g)].map((m) => [m[1], m[2]]))
const HEADERS = [...(src.match(/export const HEADERS = \[([^\]]*)\]/)?.[1] ?? '').matchAll(/'([^']+)'/g)].map((m) => m[1])

test('look: the approved values name a face, a released button style and a header that exist', () => {
  assert.deepEqual(Object.keys(LOOK).sort(), ['button', 'face', 'header'])
  assert.ok(read('styles/storefront.css').includes(`[data-face='${LOOK.face}']{`), `face ${LOOK.face}`)
  assert.ok(Object.keys(JSON.parse(read('styles/buttons.json'))).includes(LOOK.button), `button ${LOOK.button} в каталоге`)
  assert.ok(read('styles/buttons.css').includes(`[data-button="${LOOK.button}"]`), `button ${LOOK.button} выпущен на палитре`)
  assert.deepEqual(HEADERS, ['classic', 'search', 'boutique'])
  assert.ok(HEADERS.includes(LOOK.header), `header ${LOOK.header}`)
})

test('look: the header draws each variant it is given', () => {
  const header = read('components/Header.tsx')
  for (const h of HEADERS) assert.match(header, new RegExp(`data-variant="${h}"`), h)
})
