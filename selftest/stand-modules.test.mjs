/**
 * Стенд без сборщика (И335): `composes` снимается из CSS, а взятый класс
 * ставится в разметку — как делает сборщик. Иначе кнопка стенда стоит без
 * `.press`: без вуали и без ответа на руку.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { plainCss, takenBy, withTaken } from '../tools/stand-modules.mjs'

const KIT = fileURLToPath(new URL('..', import.meta.url))

test('composes is read from the module text, own file and neighbour alike', () => {
  const map = takenBy('.btn{\n  composes:press;\n  --btn-h:40px}', ".input{composes:box from './form.module.css'}")
  assert.deepEqual(map, { btn: ['press'], input: ['box'] })
  assert.doesNotMatch(plainCss('.btn{composes:press;color:red}'), /composes/)
})

test('markup gets every taken class, transitively, before the one that takes it', () => {
  const map = { btn: ['press'], press: ['tap'] }
  assert.equal(withTaken('<button class="btn" data-voice="loud">', map), '<button class="tap press btn" data-voice="loud">')
  assert.equal(withTaken('<a class="press btn wide">', map), '<a class="tap press btn wide">', 'взятое дважды — один раз')
})

test('the real button takes press, so a stand built from it shows the veil', () => {
  const map = takenBy(readFileSync(join(KIT, 'styles/btn.module.css'), 'utf8'))
  assert.deepEqual(map.btn, ['press'])
  assert.equal(withTaken('<button class="btn">', map), '<button class="press btn">')
})
