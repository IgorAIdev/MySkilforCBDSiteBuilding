/**
 * Лист знаков (И249): один лист на сайт из знаков набора, каждый знак с
 * краской и штрихом в пикселях экрана — и лист не отстаёт от папки.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, mkdtempSync, cpSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const KIT = fileURLToPath(new URL('..', import.meta.url))
const LUCIDE = join(KIT, 'skills/site-building/assets/icons/lucide')
const sheet = readFileSync(join(KIT, 'styles/icons.svg'), 'utf8')

test('every icon of the kit is in the sheet exactly once, painted and with screen-pixel stroke', () => {
  const names = readdirSync(LUCIDE).filter((n) => n.endsWith('.svg')).map((n) => n.replace('.svg', ''))
  assert.ok(names.length >= 30)
  for (const id of names) assert.equal(sheet.split(`<symbol id="${id}"`).length - 1, 1, id)
  for (const symbol of sheet.match(/<symbol[\s\S]*?<\/symbol>/g)) {
    assert.match(symbol, /fill="none" stroke="currentColor"/)
    const shapes = symbol.match(/<(?:path|circle|rect|line|polyline|polygon|ellipse)\b[^>]*>/g)
    assert.ok(shapes.every((s) => s.includes('vector-effect="non-scaling-stroke"')), symbol.slice(0, 60))
    assert.doesNotMatch(symbol, /stroke-width/, 'толщину держит base.css, не знак')
  }
})

test('check fails when an icon is added to the kit and the sheet is not re-emitted', () => {
  const dir = mkdtempSync(join(tmpdir(), 'icons-'))
  try {
    cpSync(join(KIT, 'tools'), join(dir, 'tools'), { recursive: true })
    cpSync(LUCIDE, join(dir, 'skills/site-building/assets/icons/lucide'), { recursive: true })
    mkdirSync(join(dir, 'styles'))
    writeFileSync(join(dir, 'styles/icons.svg'), sheet)
    const run = (...a) => spawnSync(process.execPath, [join(dir, 'tools/icons.mjs'), ...a], { cwd: dir, encoding: 'utf8' })
    assert.equal(run('--check').status, 0)
    writeFileSync(join(dir, 'skills/site-building/assets/icons/lucide/dot.svg'), '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="2" /></svg>')
    assert.notEqual(run('--check').status, 0)
    assert.equal(run().status, 0)
    assert.equal(run('--check').status, 0)
  } finally { rmSync(dir, { recursive: true, force: true }) }
})
