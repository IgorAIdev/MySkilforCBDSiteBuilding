/**
 * Один расчёт для панели, сайта и проверок: копия движка мастерской не может
 * разойтись с tools/ молча (И247).
 *
 * Дефект, доказанный проверкой ядра 22.09.2026 на копиях репозитория:
 * `sync-studio-assets.mjs` правил ввозы строковой заменой, а `--check`
 * сравнивал копию с тем же заменённым текстом. Сменилась строка ввоза —
 * замена молча не сработала, копия ввозила `kit-config.mjs` или `node:fs`,
 * а проверка печатала «Studio engines match canonical sources».
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, cpSync, readFileSync, writeFileSync, rmSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const KIT = fileURLToPath(new URL('..', import.meta.url))

const copy = () => {
  const dir = mkdtempSync(join(tmpdir(), 'studio-sync-'))
  for (const part of ['tools', 'styles', 'templates', 'skills/site-building']) {
    mkdirSync(join(dir, part, '..'), { recursive: true })
    cpSync(join(KIT, part), join(dir, part), { recursive: true })
  }
  writeFileSync(join(dir, 'package.json'), '{"name":"probe","private":true,"type":"module"}')
  return dir
}
const sync = (dir, ...args) => spawnSync(process.execPath, [join(dir, 'tools/sync-studio-assets.mjs'), ...args], { cwd: dir, encoding: 'utf8' })
const edit = (path, from, to) => {
  const text = readFileSync(path, 'utf8')
  assert.ok(text.includes(from), `fixture: ${from}`)
  writeFileSync(path, text.replace(from, to))
}

test('the real kit: sync --check passes and imports the copy', () => {
  const r = sync(KIT, '--check')
  assert.equal(r.status, 0, r.stderr)
  assert.match(r.stdout, /same output/)
})

test('a changed import line in tools/ stops the sync instead of shipping a copy that imports Node', () => {
  const dir = copy()
  try {
    edit(join(dir, 'tools/scale.mjs'), "import { PREFIX, BREAKPOINTS } from './kit-config.mjs'", "import { PREFIX, BREAKPOINTS, SEAMS } from './kit-config.mjs'")
    const r = sync(dir)
    assert.notEqual(r.status, 0, r.stdout)
    assert.match(r.stderr, /matched 0 times/)
  } finally { rmSync(dir, { recursive: true, force: true }) }
})

test('check fails when the copied engine still reaches for Node', () => {
  const dir = copy()
  try {
    edit(join(dir, 'tools/thresholds.mjs'), '/**', "import { readFileSync } from 'node:fs'\n/**")
    assert.notEqual(sync(dir).status, 0, 'generate must refuse')
    const engine = join(dir, 'skills/site-building/assets/studio/engine/thresholds.mjs')
    edit(engine, '/**', "import { readFileSync } from 'node:fs'\n/**")
    const r = sync(dir, '--check')
    assert.notEqual(r.status, 0, r.stdout)
    assert.match(r.stderr, /not portable|node:/)
  } finally { rmSync(dir, { recursive: true, force: true }) }
})
