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
import { roles, ratio, apca, auditPalette } from '../tools/palette.mjs'

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
