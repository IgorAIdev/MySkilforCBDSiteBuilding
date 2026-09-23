import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { FACES, buttonOptions, lookLine, lookOn, lookScript } from '../lib/look.ts'
import { availability } from '../tools/buttons.mjs'

const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
const STYLES = JSON.parse(read('styles/buttons.json')) as Record<string, unknown>
const OFF = availability(STYLES, JSON.parse(read('styles/palette.json'))).off

test('look: five faces, the system stack first, each with its [data-face] block and its font variable', () => {
  assert.deepEqual(FACES.map((f) => f.id), ['system', 'manrope', 'plex', 'inter', 'serif'])
  const css = read('styles/storefront.css')
  const fonts = read('components/look-fonts.ts')
  for (const f of FACES) assert.match(css, new RegExp(`\\[data-face='${f.id}'\\]\\{`), f.id)
  for (const v of ['--f-manrope', '--f-plex', '--f-inter', '--f-serif']) {
    assert.ok(fonts.includes(`variable: '${v}'`), `${v} не объявлена next/font`)
    assert.ok(css.includes(`var(${v},`), `${v} не читается с запасным семейством`)
  }
})

test('look: button options follow the catalog, measured on the site palette; an off style says why', () => {
  const list = buttonOptions(STYLES, OFF)
  assert.deepEqual(list.map((o) => o.name), Object.keys(STYLES))
  assert.equal(list[0].on, true, 'первый стиль — умолчание, он обязан быть выпущен')
  const css = read('styles/buttons.css')
  for (const o of list) {
    assert.equal(css.includes(`[data-button="${o.name}"]`), o.on, `${o.name}: выпуск и список расходятся`)
    assert.equal(Boolean(o.why), !o.on, o.name)
  }
  const made = buttonOptions({ А: {}, Б: {} }, { Б: [{ rule: 'тон виден', got: 1.07, need: 1.15 }] })
  assert.deepEqual(made, [
    { name: 'А', on: true, why: '' },
    { name: 'Б', on: false, why: 'не проходит на этой палитре: тон виден — 1.07 из 1.15' },
  ])
})

test('look: the switch is on only by the word «on»', () => {
  assert.equal(lookOn({ LOOK_PICKER: 'on' }), true)
  for (const v of [undefined, '', '1', 'true', 'ON']) assert.equal(lookOn({ LOOK_PICKER: v }), false, String(v))
})

test('look: the head script applies only a known face and a released style; broken memory is ignored', () => {
  const list = buttonOptions(STYLES, OFF)
  const off = list.find((o) => !o.on)?.name ?? 'нет такого'
  const run = (saved: string | null, throws = false) => {
    const dataset: Record<string, string> = {}
    const localStorage = { getItem: () => { if (throws) throw new Error('закрыто'); return saved } }
    new Function('localStorage', 'document', lookScript(FACES, list))(localStorage, { documentElement: { dataset } })
    return dataset
  }
  assert.deepEqual(run(JSON.stringify({ face: 'manrope', button: 'Контур' })), { face: 'manrope', button: 'Контур' })
  assert.deepEqual(run(JSON.stringify({ face: 'comic', button: off })), {})
  assert.deepEqual(run('{битый'), {})
  assert.deepEqual(run(null, true), {})
  assert.equal(lookLine('manrope', 'Пилюля', FACES), 'Сейчас: Manrope · Пилюля')
})
