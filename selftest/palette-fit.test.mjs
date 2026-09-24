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

/* Готовые наборы набора — тоже верны по построению (И285): каждый проходит
   весь замер в обеих темах, и строитель, получив его как «свои точные
   краски», ничего в нём не двигает. «Аптека» до 24.09.2026 выходила с тихой
   вуалью 1.14 : 1 на полу страницы — строитель довёл её чернила до
   ближайших, при которых вуаль видна (#24352B → #1E2F25). Своих сигналов
   строитель не несёт, поэтому неподвижность меряется у наборов из трёх
   красок. */
test('every kit set passes the whole audit, and the builder leaves a three-paint set exactly as it is', () => {
  for (const [name, set] of Object.entries(sets)) {
    for (const mode of ['light', 'dark']) assert.deepEqual(auditPalette(set[mode], mode), [], `${name} · ${mode}`)
    if (['light', 'dark'].some((m) => Object.keys(set[m]).some((k) => !['paper', 'ink', 'accent'].includes(k)))) continue
    const fit = fitPalette(intentOf(set), { light: set.light, dark: set.dark })
    assert.deepEqual(fit.notes, [], `${name}: строитель ничего не двигает`)
  }
  const old = fitPalette(intentOf(sets['Аптека']), { light: { ...sets['Аптека'].light, ink: '#24352B' }, dark: sets['Аптека'].dark })
  /* С 24.09.2026 вуаль меряется той долей, какую покажет экран (21/255,
     И295), и прежним чернилам хватает меньшего сдвига, чем был у доводки
     И285: строитель ведёт их к ближайшим, при которых вуаль видна, — не
     глубже нынешних чернил набора. */
  assert.deepEqual(old.notes.map((n) => [n.what, n.mode]), [['ink', 'light']], 'двигаются только чернила светлой темы')
  assert.match(old.notes[0].why, /quiet buttons show/)
  assert.deepEqual(auditPalette(old.seed.light, 'light'), [], 'доведённые чернила проходят замер')
  assert.ok(oklch(old.notes[0].to)[0] >= oklch(sets['Аптека'].light.ink)[0], `не глубже нынешних чернил набора: ${old.notes[0].to}`)
})

/* С 24.09.2026 (И295) вуаль выпускает строитель: доля одна — STATE.quiet,
   её же меряет замер; tokens.css только называет роль и числа не держит. */
test('the quiet veil the audit measures is the one the site paints: the builder emits it at STATE.quiet, tokens.css only names the role', async () => {
  const { STATE } = await import('../tools/thresholds.mjs')
  const { roles } = await import('../tools/palette.mjs')
  const tokens = readFileSync(new URL('../styles/tokens.css', import.meta.url), 'utf8')
  assert.match(tokens, /--quiet:var\(--quiet-paper\);/)
  for (const [name, set] of Object.entries(sets)) {
    for (const mode of ['light', 'dark']) {
      const r = roles(set[mode], mode)
      /* доля не ниже STATE.quiet в восьми битах экрана: 8 % → 21/255 */
      assert.equal(r['--quiet-paper'], `${r['--n-12']}${Math.ceil(STATE.quiet * 255).toString(16).toUpperCase()}`, `${name} · ${mode}`)
    }
  }
})
