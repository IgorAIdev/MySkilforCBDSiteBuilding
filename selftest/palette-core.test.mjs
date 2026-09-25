/**
 * Ядро палитры: разбор краски, кольцо фокуса на каждой поверхности, APCA по
 * эталону, выпуск только после замера (И246).
 *
 * Дефекты, найденные проверкой ядра 22.09.2026 (1 578 построений): `#FFF`
 * читался как `#000FFF` (синий), `red` и `#FFCC0080` — молча как мусор;
 * кольцо фокуса подбиралось против одной ступени 1 и в тёмной теме
 * выпущенной «Латуни на угле» давало на карточке 2,31 : 1 при норме 3;
 * APCA отсекала шум на 0.001 вместо 0.1 и не знала deltaYmin;
 * `npm run palette` записывал файл, который замер браковал.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, mkdtempSync, mkdirSync, writeFileSync, cpSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { roles, ratio, apca, auditPalette, lightness, groundChecks, deckOf, SOLID_GAP, NEED } from '../tools/palette.mjs'

const KIT = fileURLToPath(new URL('..', import.meta.url))
const shipped = {
  ...JSON.parse(readFileSync(join(KIT, 'styles/palette.json'), 'utf8')),
  ...JSON.parse(readFileSync(join(KIT, 'templates/palette.json'), 'utf8')),
}
const themes = (set) => ['light', 'dark'].filter((mode) => set[mode]).map((mode) => [mode, set[mode]])

test('a paint is read as written: #RGB expands, anything else is refused by name', () => {
  assert.equal(ratio('#FFF', '#000'), ratio('#FFFFFF', '#000000'))
  assert.equal(ratio('#fff', '#000').toFixed(2), '21.00')
  for (const bad of ['red', '#FFCC0080', '#12345', 'FFFFFF', '', undefined]) {
    assert.throws(() => ratio(bad, '#000000'), /краск/, String(bad))
  }
  const base = { paper: '#FCFBF9', ink: '#1F1E1C' }
  assert.throws(() => roles({ ...base, accent: 'red' }, 'light'), /accent|краск/)
  assert.doesNotThrow(() => roles({ ...base, accent: '#B79339' }, 'light'))
})

test('the focus ring reaches 3 : 1 on every background step it can sit on (1–5), in every shipped set and theme', () => {
  for (const [name, set] of Object.entries(shipped)) {
    for (const [mode, paints] of themes(set)) {
      const r = roles(paints, mode)
      const worst = Math.min(...[1, 2, 3, 4, 5].map((i) => ratio(r['--ring'], r[`--n-${i}`])))
      assert.ok(worst >= 3, `${name} · ${mode}: кольцо ${r['--ring']} даёт ${worst.toFixed(2)} на худшей поверхности`)
    }
  }
})

test('the audit measures the ring on the surface where it is weakest', () => {
  for (const [name, set] of Object.entries(shipped)) {
    for (const [mode, paints] of themes(set)) {
      assert.ok(!auditPalette(paints, mode).some((f) => /кольцо/.test(f.rule)), `${name} · ${mode}`)
    }
  }
  const src = readFileSync(join(KIT, 'tools/palette.mjs'), 'utf8')
  assert.match(src, /кольцо фокуса на всех поверхностях/)
})

test('APCA follows the reference: published values, loClip 0.1 and deltaYmin', () => {
  assert.equal(apca('#888888', '#FFFFFF').toFixed(2), '63.06')
  assert.equal(apca('#FFFFFF', '#888888').toFixed(2), '68.54')
  assert.equal(apca('#000000', '#AAAAAA').toFixed(2), '58.15')
  assert.equal(apca('#AAAAAA', '#000000').toFixed(2), '56.24')
  assert.equal(apca('#777777', '#787878'), 0)
  assert.equal(apca('#404040', '#444444'), 0, 'below loClip is zero, not a small number')
})

test('npm run palette refuses to write a set the audit rejects, and leaves the old file', () => {
  const dir = mkdtempSync(join(tmpdir(), 'palette-refuse-'))
  try {
    cpSync(join(KIT, 'tools'), join(dir, 'tools'), { recursive: true })
    writeFileSync(join(dir, 'package.json'), '{"name":"probe","private":true,"type":"module"}')
    mkdirSync(join(dir, 'styles'))
    const bad = { 'Жёлтый': { light: { paper: '#FCFBF9', ink: '#1F1E1C', accent: '#FFFF00' }, dark: { paper: '#161513', ink: '#EDEBE6', accent: '#FFFF00' } } }
    writeFileSync(join(dir, 'styles/palette.json'), JSON.stringify(bad))
    writeFileSync(join(dir, 'styles/palette.css'), '/* old */\n')
    const run = spawnSync(process.execPath, [join(dir, 'tools/palette-css.mjs')], { cwd: dir, encoding: 'utf8' })
    assert.notEqual(run.status, 0, run.stdout)
    assert.match(run.stderr, /не выпущена/)
    assert.equal(readFileSync(join(dir, 'styles/palette.css'), 'utf8'), '/* old */\n')
  } finally { rmSync(dir, { recursive: true, force: true }) }
})

test('--edge — the control edge that holds 3 : 1 on every background 1–5; --border keeps its look (И252)', () => {
  for (const [name, set] of Object.entries(shipped)) {
    for (const [mode, paints] of themes(set)) {
      const r = roles(paints, mode)
      assert.ok(r['--edge'], `${name} · ${mode}: нет --edge`)
      const worst = Math.min(...[1, 2, 3, 4, 5].map((i) => ratio(r['--edge'], r[`--n-${i}`])))
      assert.ok(worst >= 3, `${name} · ${mode}: --edge ${r['--edge']} даёт ${worst.toFixed(2)}`)
      assert.ok(ratio(r['--border'], r['--n-2']) >= 3, `${name} · ${mode}: --border на поле`)
    }
  }
})

/* Роли кнопки и сцены (И295): их выпускает строитель, а не стили. Дефект —
   тона хвоста главной кнопки, кромка выключенной и вуаль героя рождались
   числом в стилях, и их контраст не считал никто; у «Аптеки» тихая строка
   героя под прежними 72 % давала 4.15 : 1. */
test('button and hero roles come from the builder with their guarantees, on every kit set and theme (И295)', () => {
  const G = (r) => [1, 2, 3, 4, 5].map((i) => r[`--n-${i}`])
  for (const [name, set] of Object.entries(shipped)) {
    for (const [mode, paints] of themes(set)) {
      const r = roles(paints, mode)
      const at = `${name} · ${mode}`
      /* хвост: дальний виден на каждом полу бумаги, ближний — между ним и
         заливкой, оба отстоят от заливки */
      const [fill, near, far] = [r['--a-9'], r['--pop-trail-near-paper'], r['--pop-trail-far-paper']]
      assert.ok(Math.min(...G(r).map((bg) => Math.abs(apca(far, bg)))) >= NEED.decorLc, `${at}: дальний тон хвоста ${far} не виден на полу`)
      assert.ok(Math.abs(lightness(far) - lightness(fill)) >= SOLID_GAP[mode], `${at}: дальний тон слился с заливкой`)
      const [lf, ln, lr] = [lightness(fill), lightness(near), lightness(far)]
      assert.ok((ln - lf) * (lr - ln) > 0, `${at}: ближний тон ${near} не между заливкой и дальним`)
      /* палуба: пара палубы и хвост от её знака к её полу */
      const n = Array.from({ length: 12 }, (_, i) => r[`--n-${i + 1}`])
      const deck = deckOf(n, mode)
      assert.equal(r['--chrome-bg'], deck.bg)
      assert.ok(Math.min(...deck.grounds.map((bg) => Math.abs(apca(r['--pop-trail-far-deck'], bg)))) >= NEED.decorLc, `${at}: хвост на палубе`)
      /* выпущенное — роль, а не формула в стилях: краски, а не ссылки */
      for (const k of ['--quiet-paper', '--scrim', '--scrim-near', '--scrim-far', '--sh-near-paper', '--chrome-fg-2']) assert.match(r[k], /^#[0-9A-F]{8}$/, `${at}: ${k} — вуаль строителя #RRGGBBAA`)
      for (const k of ['--pop-trail-near-paper', '--pop-trail-far-paper', '--edge-off-paper', '--edge-off-deck', '--pop-hover-deck', '--pop-grad-paper', '--pop-grad-deck']) assert.match(r[k], /^#[0-9A-F]{6}$/, `${at}: ${k}`)
      /* Второй конец градиента главной (И424): надпись держит 4.5 : 1 и на нём. */
      assert.ok(ratio(r['--on-a-9'], r['--pop-grad-paper']) >= NEED.text, `${at}: надпись главной на втором конце градиента`)
      /* Стекло главной (И427): краска долей, не сплошная; надпись держит
         4.5 : 1 над каждым полом и любым снимком, а на бумаге стекло видно —
         это меряет groundChecks ниже. */
      for (const k of ['--pop-glass', '--pop-rim']) assert.match(r[k], /^#[0-9A-F]{8}$/, `${at}: ${k} — стекло строителя #RRGGBBAA`)
      assert.ok(parseInt(r['--pop-glass'].slice(7), 16) < 255, `${at}: стекло просвечивает`)
      /* замер ролей по полу — весь чистый */
      const failed = groundChecks(paints, mode).filter((c) => c.got < c.need)
      assert.deepEqual(failed, [], at)
    }
  }
  /* Вуаль героя берётся замером, а не одной долей на все палитры: у «Аптеки»
     в светлой её дальняя ступень плотнее прежних 72 %. */
  const scrim = roles(shipped['Аптека'].light, 'light')['--scrim-far']
  assert.ok(Number.parseInt(scrim.slice(7), 16) / 255 > 0.72, `Аптека: вуаль героя ${scrim}`)
})

/* Светлая марка вплотную к светлой бумаге: хвост не тянет марку за собой —
   он идёт от заливки к чернилам (И295). */
test('a bright brand keeps its colour: the trail steps away from the ground instead of moving the brand', async () => {
  const { fitPalette } = await import('../tools/palette.mjs')
  const yellow = fitPalette({ brand: '#FFE600', paper: 'warm', tint: 'light' })
  const r = roles(yellow.seed.light, 'light')
  assert.ok(lightness(r['--pop-trail-far-paper']) < lightness(r['--a-9']), 'хвост темнее заливки — со стороны чернил')
  assert.ok(Math.min(...[1, 2, 3, 4, 5].map((i) => Math.abs(apca(r['--pop-trail-far-paper'], r[`--n-${i}`])))) >= NEED.decorLc)
})
