/**
 * Крупный текст — из строителя шкал, а не рукой (И245).
 *
 * Дефект, найденный проверкой ядра 22.09.2026: заголовок героя, заголовок
 * страницы и вводный абзац стояли в tokens.css пикселями и голым `cqi` —
 * одна строка на все наборы. В «Просторном» заголовок страницы (42) вышел
 * меньше заголовка раздела (49); вводный абзац (17,5) мельче основного
 * текста (18) на макете; при увеличении шрифта в браузере все три не росли.
 * `npm run scale` при этом записывал файл, даже когда замер его браковал.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, mkdtempSync, mkdirSync, writeFileSync, cpSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { resolve, toCss, auditScale, DISPLAY_KNOBS } from '../tools/scale.mjs'

const KIT = fileURLToPath(new URL('..', import.meta.url))
const sets = JSON.parse(readFileSync(join(KIT, 'styles/scale.json'), 'utf8'))
const ROLES = { герой: 'hero', заголовок: 'pagehead', ввод: 'intro' }

test('every shipped set names its display sizes and passes the audit', () => {
  for (const [name, set] of Object.entries(sets)) {
    const r = resolve(set)
    for (const role of Object.keys(ROLES)) assert.ok(r.крупные?.[role], `${name}: нет «${role}»`)
    assert.deepEqual(auditScale(set), [], name)
  }
})

test('display sizes are emitted in every set block, rem at both ends and a non-negative rem intercept', () => {
  const css = toCss(sets)
  const blocks = css.split(/\n(?=\[data-scale=|:root\{)/)
  for (const name of Object.keys(sets)) {
    const block = blocks.find((b) => b.startsWith(`[data-scale="${name}"]`))
    assert.ok(block, name)
    for (const en of Object.values(ROLES)) {
      assert.match(block, new RegExp(`--${en}-size: clamp\\(\\d*\\.?\\d+rem, \\d*\\.?\\d+rem \\+ \\d*\\.?\\d+cqi, \\d*\\.?\\d+rem\\)`), `${name} ${en}`)
      for (const knob of DISPLAY_KNOBS[en]) assert.match(block, new RegExp(`--${en}-${knob}: `), `${name} --${en}-${knob}`)
    }
  }
})

test('the approved set keeps its sizes; the intro is not smaller than body text', () => {
  const r = resolve(sets['Нынешний'])
  assert.deepEqual([r.крупные.заголовок.низ, r.крупные.заголовок.верх], [30, 42])
  assert.deepEqual([r.крупные.герой.низ, r.крупные.герой.верх], [26, 56])
  assert.ok(r.крупные.ввод.низ >= r.размер.base[1])
})

test('in every set the page title is larger than a section heading at both ends', () => {
  for (const [name, set] of Object.entries(sets)) {
    const r = resolve(set)
    assert.ok(r.крупные.заголовок.низ > r.размер.h2[0] && r.крупные.заголовок.верх > r.размер.h2[1], name)
  }
})

const broken = (patch) => {
  const set = structuredClone(sets['Нынешний'])
  Object.assign(set.крупные[patch.role], patch.value)
  return auditScale(set).map((f) => f.rule).join(' | ')
}

test('audit refuses display sizes out of order, shrinking with zoom or too spread', () => {
  assert.match(broken({ role: 'заголовок', value: { верх: 36 } }), /заголовок страницы/)
  assert.match(broken({ role: 'ввод', value: { низ: 17 } }), /вводный абзац/)
  assert.match(broken({ role: 'герой', value: { верх: 40 } }), /герой/)
  assert.match(broken({ role: 'герой', value: { основа: -2 } }), /увеличени/)
  assert.match(broken({ role: 'герой', value: { низ: 20, верх: 56 } }), /разброс/)
  assert.match(broken({ role: 'ввод', value: { низ: 22, верх: 21 } }), /низ/)
})

test('tokens.css no longer hand-writes the display sizes', () => {
  const tokens = readFileSync(join(KIT, 'styles/tokens.css'), 'utf8')
  for (const en of Object.values(ROLES)) assert.doesNotMatch(tokens, new RegExp(`^\\s*--${en}-size\\s*:`, 'm'), en)
})

test('scale-css refuses to write a set the audit rejects, and leaves the old file', () => {
  const dir = mkdtempSync(join(tmpdir(), 'scale-refuse-'))
  try {
    cpSync(join(KIT, 'tools'), join(dir, 'tools'), { recursive: true })
    writeFileSync(join(dir, 'package.json'), '{"name":"probe","private":true,"type":"module"}')
    mkdirSync(join(dir, 'styles'))
    const bad = structuredClone(sets)
    bad['Нынешний'].крупные.заголовок.верх = 30
    writeFileSync(join(dir, 'styles/scale.json'), JSON.stringify(bad))
    writeFileSync(join(dir, 'styles/scale.css'), '/* old */\n')
    const run = spawnSync(process.execPath, [join(dir, 'tools/scale-css.mjs')], { cwd: dir, encoding: 'utf8' })
    assert.notEqual(run.status, 0, run.stdout)
    assert.match(run.stderr, /заголовок страницы/)
    assert.equal(readFileSync(join(dir, 'styles/scale.css'), 'utf8'), '/* old */\n')
  } finally { rmSync(dir, { recursive: true, force: true }) }
})
