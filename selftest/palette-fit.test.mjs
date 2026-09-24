/**
 * Строитель палитры для заказчика — верен по построению (И275): любое
 * намерение (цвет марки, тёплая/нейтральная/холодная бумага, тон, чернила)
 * даёт набор, который проходит весь замер набора в обеих темах; краска,
 * которая и так проходит, не трогается; подвинутая — ближайшая и названа.
 * Одна реализация: tools/palette.mjs, её копия в движке мастерской и панели.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { auditPalette, difference, fitPalette, intentOf, oklch } from '../tools/palette.mjs'
import * as engine from '../skills/site-building/assets/studio/engine/palette.mjs'

const sets = { ...JSON.parse(readFileSync(new URL('../styles/palette.json', import.meta.url), 'utf8')), ...JSON.parse(readFileSync(new URL('../templates/palette.json', import.meta.url), 'utf8')) }
/** Повторяемый случай (mulberry32): падение воспроизводится тем же числом. */
const random = (seed) => () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
const hex = (r) => `#${[0, 1, 2].map(() => Math.floor(r() * 256).toString(16).padStart(2, '0')).join('').toUpperCase()}`

test('any intent comes out as a palette that passes the whole kit audit in both themes', () => {
  const r = random(20260924)
  for (let i = 0; i < 40; i++) {
    const intent = { brand: hex(r), paper: ['warm', 'neutral', 'cool'][Math.floor(r() * 3)], tint: r() < 0.5 ? 'none' : 'light', inkTowardBrand: r() < 0.3 }
    const fit = fitPalette(intent)
    assert.ok(fit.ok, `${JSON.stringify(intent)}: ${JSON.stringify(fit.notes)}`)
    for (const mode of ['light', 'dark']) assert.deepEqual(auditPalette(fit.seed[mode], mode), [], `${JSON.stringify(intent)} · ${mode}`)
    for (const n of fit.notes) {
      assert.ok(n.why && !/[а-яё]/i.test(n.why), `одна строка по-английски для заказчика: ${n.why}`)
      if (n.what === 'brand' && !/hue/.test(n.why)) {
        assert.ok(Math.abs(oklch(n.to)[2] - oklch(n.from)[2]) < 3 || oklch(n.from)[1] < 0.02, `тон марки держится: ${n.from} → ${n.to}`)
      }
    }
  }
})

test('a brand colour that already passes is kept as it is; a moved one is the nearest tone and is named', () => {
  for (const [name, set] of Object.entries(sets)) {
    const intent = intentOf(set)
    const fit = fitPalette(intent)
    assert.ok(fit.ok, name)
    const light = fit.notes.find((n) => n.what === 'brand' && n.mode === 'light')
    if (!light) assert.equal(fit.seed.light.accent.toUpperCase(), intent.brand.toUpperCase(), `${name}: марка не тронута`)
  }
  const yellow = fitPalette({ brand: '#FFE600', paper: 'warm', tint: 'light' })
  const moved = yellow.notes.find((n) => n.what === 'brand' && n.mode === 'light')
  assert.ok(moved, 'жёлтая марка на светлой бумаге подвинута')
  assert.match(moved.why, /darker/)
  assert.ok(difference(moved.from, moved.to) < 12, `ближайшая: ΔE ${difference(moved.from, moved.to).toFixed(1)}`)
})

test('the panel and the studio run the same fitter: the engine copy gives the same answer', () => {
  const r = random(7)
  for (let i = 0; i < 6; i++) {
    const intent = { brand: hex(r), paper: 'cool', tint: 'light' }
    assert.deepEqual(engine.fitPalette(intent), fitPalette(intent), JSON.stringify(intent))
  }
  for (const set of Object.values(sets)) assert.deepEqual(engine.intentOf(set), intentOf(set))
})
