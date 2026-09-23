import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { strip, OWNED } from '../scripts/look-remove.mjs'

/* Панель «Look» снимается одной командой (scripts/look-remove.mjs); этот
   тест принадлежит панели и уходит вместе с ней. Полная проверка на копии
   с tsc и сборкой — `npm run check:look`. */
const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')

test('look panel: stripping its marks leaves the site reading look() and nothing of the panel', () => {
  const look = strip(read('lib/look.ts'))
  for (const gone of ['look-panel', 'cookies', 'draftMode', 'LOOK_PICKER', 'function preview']) assert.ok(!look.includes(gone), gone)
  for (const kept of ['export async function lookNow', 'published()', 'unstable_cache', "tags: ['look']"]) assert.ok(look.includes(kept), kept)
  const shell = strip(read('components/Shell.tsx'))
  assert.ok(!shell.includes('/look/look.js'), 'строка подключения')
  assert.match(shell, /data-face=\{look\.face\}/)
  assert.ok(read('app/api/look-preview/route.ts').includes('look-panel:file'))
  assert.ok(OWNED.includes('public/look') && OWNED.includes('app/api/look-preview'))
})
