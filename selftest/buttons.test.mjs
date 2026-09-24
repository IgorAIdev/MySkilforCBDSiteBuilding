/**
 * Каталог стилей кнопки (И252): стиль — набор ролей ОДНОЙ кнопки основы, а
 * не новая кнопка; каждый стиль меряется на палитре сайта в обеих темах;
 * выпуск только после замера.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, mkdtempSync, cpSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { buttonRoles, auditButtons, availability, toCss } from '../tools/buttons.mjs'

const KIT = fileURLToPath(new URL('..', import.meta.url))
const styles = JSON.parse(readFileSync(join(KIT, 'styles/buttons.json'), 'utf8'))
const sitePalette = JSON.parse(readFileSync(join(KIT, 'styles/palette.json'), 'utf8'))
const samples = JSON.parse(readFileSync(join(KIT, 'templates/palette.json'), 'utf8'))

test('every style is well-formed; the default passes on the site palette; the rest are measured, not assumed', () => {
  assert.ok(Object.keys(styles).length >= 10)
  assert.deepEqual(auditButtons(styles, {}), [], 'каталог устроен')
  const { structure, off, on } = availability(styles, sitePalette)
  assert.deepEqual(structure, [])
  assert.ok(on.includes(Object.keys(styles)[0]), 'стиль по умолчанию проходит')
  for (const [name, list] of Object.entries(off)) assert.ok(list.every((f) => f.kind === 'palette' && f.rule), name)
  const css = toCss(styles, off)
  for (const name of Object.keys(off)) assert.ok(!css.includes(`[data-button="${name}"]`), `${name} не должен выпускаться`)
})

test('the audit runs on every sample palette and names style, palette and theme', () => {
  for (const f of auditButtons(styles, samples)) {
    assert.ok(f.style && f.palette && f.theme && f.rule, JSON.stringify(f))
  }
})

/* Наборов цвета несколько (витрина с выбором вида, И270): стиль, не
   прошедший на части наборов, выпускается, а пара «стиль × набор» названа;
   не прошедший ни на одном — не выпускается. */
test('several palettes: a style that fails on some is released and the pairs are named; one failing on all is not', () => {
  const names = Object.keys(samples)
  const { off, clash, on } = availability(styles, samples)
  const css = toCss(styles, off, clash)
  for (const [style, by] of Object.entries(clash)) {
    assert.ok(on.includes(style), `${style} выпускается`)
    assert.ok(css.includes(`[data-button="${style}"]{`), `${style} в CSS`)
    assert.ok(names.some((p) => !by[p]), `${style} проходит хоть на одном наборе`)
    for (const f of Object.values(by)) assert.ok(f.part && f.rule && f.theme && f.got < f.need, JSON.stringify(f))
  }
  for (const [style, list] of Object.entries(off)) {
    assert.deepEqual([...new Set(list.map((f) => f.palette))].sort(), [...names].sort(), `${style} падает на всех`)
    assert.ok(!css.includes(`[data-button="${style}"]`), `${style} не выпущен`)
  }
  assert.ok(Object.keys(clash).length, 'на образцах есть пары, которые не носятся')
  assert.match(css, /Не носятся с частью наборов цвета/)
})

test('a style is a set of roles of the one button, first style is the default', () => {
  const css = toCss(styles)
  const names = Object.keys(styles)
  assert.match(css, /^:root\{[\s\S]*?--ctrl-btn-r:/m)
  for (const name of names) assert.ok(css.includes(`[data-button="${name}"]{`), name)
  const pill = buttonRoles(styles['Пилюля'])
  assert.equal(pill['--ctrl-btn-r-pop'], 'var(--r-pop)')
  assert.equal(pill['--ctrl-btn-fill'], 'var(--quiet)')
  const strict = buttonRoles(styles['Строгий угол'])
  assert.equal(strict['--ctrl-btn-r'], '0px')
  assert.equal(strict['--ctrl-btn-case'], 'uppercase')
  assert.equal(strict['--ctrl-btn-edge'], 'var(--edge)')
  const btn = readFileSync(join(KIT, 'styles/btn.module.css'), 'utf8')
  for (const role of ['--ctrl-btn-r', '--ctrl-btn-r-pop', '--ctrl-btn-weight', '--ctrl-btn-fill', '--ctrl-btn-fill-pop', '--ctrl-btn-ink-pop', '--ctrl-btn-press']) {
    assert.ok(btn.includes(`var(${role},`), `btn.module.css не читает ${role}`)
  }
})

const one = (patch) => auditButtons({ X: { ...styles['Пилюля'], ...patch } }, sitePalette).map((f) => f.rule).join(' | ')

test('audit refuses what the foundation forbids', () => {
  assert.match(one({ угол: 7 }), /лестниц/)
  assert.match(one({ вес: 800 }), /толщин/)
  assert.match(one({ разрядка: 0.08 }), /разрядк/)
  assert.match(one({ регистр: 'заглавные', разрядка: 0 }), /заглавн/)
  assert.match(one({ громкая: 'градиент' }), /громкая/)
  assert.match(one({ тихая: 'текст' }), /тихая/)
  assert.match(one({ нажатие: 'прыжок' }), /нажатие/)
})

test('buttons emitter refuses to write a catalog the audit rejects', () => {
  const dir = mkdtempSync(join(tmpdir(), 'buttons-refuse-'))
  try {
    cpSync(join(KIT, 'tools'), join(dir, 'tools'), { recursive: true })
    writeFileSync(join(dir, 'package.json'), '{"name":"probe","private":true,"type":"module"}')
    mkdirSync(join(dir, 'styles'))
    writeFileSync(join(dir, 'styles/palette.json'), JSON.stringify(sitePalette))
    writeFileSync(join(dir, 'styles/buttons.json'), JSON.stringify({ Плохой: { ...styles['Пилюля'], угол: 7 } }))
    writeFileSync(join(dir, 'styles/buttons.css'), '/* old */\n')
    const run = spawnSync(process.execPath, [join(dir, 'tools/buttons.mjs')], { cwd: dir, encoding: 'utf8' })
    assert.notEqual(run.status, 0, run.stdout)
    assert.match(run.stderr, /не выпущен/)
    assert.equal(readFileSync(join(dir, 'styles/buttons.css'), 'utf8'), '/* old */\n')
  } finally { rmSync(dir, { recursive: true, force: true }) }
})
