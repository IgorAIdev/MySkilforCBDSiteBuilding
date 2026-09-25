/**
 * Проверки запускаются на машине заказчика так же, как в облаке (И240).
 *
 * Дефект: на Windows `check:lint` не запускал `npx`, `check:open` падал
 * ReferenceError вместо отчёта, а отрисованные проверки искали Playwright по
 * пути одной облачной машины.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const KIT = fileURLToPath(new URL('..', import.meta.url))
const TOOLS = join(KIT, 'tools')
const read = (name) => readFileSync(join(TOOLS, name), 'utf8')

test('no tool depends on a path that exists on one machine only', () => {
  const offenders = readdirSync(TOOLS)
    .filter((f) => f.endsWith('.mjs'))
    .filter((f) => /\/opt\/node\d+\//.test(read(f)))
  assert.deepEqual(offenders, [])
})

test('rendered checks load Playwright and sharp through the one loader', () => {
  for (const f of ['check-craft.mjs', 'check-detect.mjs', 'sweep.mjs', 'shade.mjs']) {
    const src = read(f)
    assert.match(src, /from '\.\/browser\.mjs'/, f)
    assert.doesNotMatch(src, /^import sharp from 'sharp'/m, f)
  }
})

test('missing Playwright exits "not checked" with the install command', () => {
  const run = spawnSync(process.execPath, [
    '--input-type=module', '-e',
    `const m = await import(${JSON.stringify(new URL('../tools/browser.mjs', import.meta.url).href)}); await m.loadPlaywright()`,
  ], { encoding: 'utf8', env: { ...process.env, PLAYWRIGHT: 'playwright-that-does-not-exist-240' } })
  assert.equal(run.status, 2, run.stderr)
  assert.match(run.stderr, /НЕ ПРОВЕДЕНА/)
  assert.match(run.stderr, /npm i -D playwright sharp/)
})

test('check:open declares its stop function before the failure branch calls it', () => {
  const src = read('check-open.mjs')
  const declared = src.indexOf('const stop = ')
  const firstCall = src.indexOf('stop()')
  assert.ok(declared > -1 && firstCall > -1)
  assert.ok(declared < firstCall, 'stop() is called before it is declared')
  assert.match(src, /taskkill/)
})

test('check:lint starts npx through a shell on Windows and prints the launch error', () => {
  const src = read('check-lint.mjs')
  assert.match(src, /process\.platform === 'win32'\s*\?\s*execSync\(/)
  assert.match(src, /e\.message/)
})
