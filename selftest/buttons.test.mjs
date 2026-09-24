/**
 * Каталог кнопки (И252, И273): оси данных — буквы, главная, тихая; вариант
 * оси — роли ОДНОЙ кнопки основы; каждый вариант меряется на палитре сайта в
 * обеих темах; выпуск только после замера. Угла, рода нажатия и тени в
 * каталоге нет: угол — Shape, нажатие — одно на всё нажимаемое.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, mkdtempSync, cpSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { axesOf, buttonRoles, auditButtons, availability, toCss, ROLES } from '../tools/buttons.mjs'

const KIT = fileURLToPath(new URL('..', import.meta.url))
const catalog = JSON.parse(readFileSync(join(KIT, 'styles/buttons.json'), 'utf8'))
const sitePalette = JSON.parse(readFileSync(join(KIT, 'styles/palette.json'), 'utf8'))
const samples = JSON.parse(readFileSync(join(KIT, 'templates/palette.json'), 'utf8'))
/* Бледный набор — «Аптека» до 24.09.2026: чернила #24352B давали тихой вуали
   1.14 : 1 на полу страницы. Сам набор с тех пор доведён строителем (И285),
   а замер кнопки должен по-прежнему называть такую вуаль — на образце. */
const pale = { 'Бледная': { light: { paper: '#FEFCF5', ink: '#24352B', accent: '#B79339' }, dark: { paper: '#0C1510', ink: '#EDECE9', accent: '#B79339' } } }
const btn = readFileSync(join(KIT, 'styles/btn.module.css'), 'utf8')

test('the catalog is independent axes of data; the defaults pass on the site palette', () => {
  assert.deepEqual(axesOf(catalog).map((a) => a.id), ['letters', 'loud', 'quiet', 'shape'])
  assert.deepEqual(axesOf(catalog)[3].options.map((o) => o.name), ['Standard', 'Arrow', 'Chevron', 'Double chevron', 'Tonal trail · spaced', 'Tonal trail · overlapping'], 'форма главной — обычная по умолчанию')
  assert.deepEqual(axesOf(catalog)[0].options.map((o) => o.name), ['Sentence case', 'CAPITALS'], 'как в предложении — первым, по умолчанию')
  assert.deepEqual(auditButtons(catalog, {}), [], 'каталог устроен')
  const { structure, off, on } = availability(catalog, sitePalette)
  assert.deepEqual(structure, [])
  assert.deepEqual(off, {})
  for (const a of axesOf(catalog)) assert.ok(on.includes(`${a.id}/${a.options[0].id}`), `${a.id}: вариант по умолчанию проходит`)
  assert.deepEqual(buttonRoles(catalog), { '--ctrl-btn-case': 'none', '--ctrl-btn-weight': '600', '--ctrl-btn-track': 'normal', '--ctrl-btn-fill-pop': 'var(--pop)', '--ctrl-btn-ink-pop': 'var(--on-pop)', '--ctrl-btn-edge-pop': 'transparent', '--ctrl-btn-fill': 'var(--quiet)', '--ctrl-btn-ink': 'var(--ink)', '--ctrl-btn-edge': 'transparent', '--ctrl-btn-tip': '0', '--ctrl-btn-tip-at': '0', '--ctrl-btn-notch': '0', '--ctrl-btn-echo': 'none', '--ctrl-btn-trail-1': '0', '--ctrl-btn-trail-2': '0' })
})

test('the button reads every role the catalog may declare, each with a fallback; corners come from Shape; press is one', () => {
  for (const role of Object.keys(ROLES)) assert.ok(btn.includes(`var(${role},`), `btn.module.css не читает ${role}`)
  assert.doesNotMatch(btn, /--ctrl-btn-(r|r-pop|press|sh)\b/, 'угол, нажатие и тень — не роли каталога')
  assert.match(btn, /--btn-r:var\(--r-ctrl\)/, 'угол органа — из Shape')
  assert.match(btn, /\.press:not\(:disabled\):not\(\[aria-disabled='true'\]\):active\{[^}]*transform:translateY\(1px\) scale\(\.97\)/, 'нажатие: чуть меньше и на пиксель ниже')
  assert.match(btn, /\.btn\{\s*composes:press;/, 'кнопка берёт нажатие, а не рисует своё')
  assert.match(btn, /prefers-reduced-motion:reduce[\s\S]*transform:none/, 'меньше движения — только цвет')
  /* Форма главной (И276): режется подложка, а не кнопка — кольцо фокуса и
     цель остаются прямоугольником; надпись не заходит в остриё. */
  assert.match(btn, /\.btn\[data-voice='loud'\]::before\{[^}]*clip-path:polygon\(0 0, calc\(100% - var\(--btn-tip\)\) 0/)
  assert.match(btn, /--btn-tip:calc\(var\(--btn-h\) \* var\(--ctrl-btn-tip, 0\)\)/, 'контур — от высоты самой кнопки')
  assert.match(btn, /padding-inline-end:calc\(var\(--btn-h\) \* \.45 \+ var\(--btn-tip\) \* \.7\)/, 'надпись не заходит в остриё')
  assert.doesNotMatch(btn.match(/\.btn\{[^}]*\}/)[0], /clip-path/, 'сама кнопка не режется')
  assert.match(btn, /:active::after\{transform:scale\(calc\(1 \/ \.97\)\) translateY\(-1px\)\}/, 'хвост при нажатии стоит')
  for (const o of axesOf(catalog)[3].options) for (const k of ['--ctrl-btn-tip', '--ctrl-btn-tip-at', '--ctrl-btn-notch']) assert.ok(Number(o.роли[k]) >= 0 && Number(o.роли[k]) <= 1.5, `${o.id}: ${k} — доля высоты`)
  const css = toCss(catalog)
  assert.match(css, /^:root\{[\s\S]*?--ctrl-btn-case: none;/m)
  for (const a of axesOf(catalog)) for (const o of a.options) assert.ok(css.includes(`[data-button-${a.id}="${o.id}"]{`), `${a.id}/${o.id}`)
})

test('the audit runs on every sample palette and names option, palette and theme; a quiet veil too pale for its floor is named', () => {
  assert.deepEqual(auditButtons(catalog, samples), [], 'каждый набор набора носит каждую кнопку каталога (И285)')
  const found = auditButtons(catalog, { ...samples, ...pale })
  for (const f of found) assert.ok(f.style && f.palette && f.theme && f.rule, JSON.stringify(f))
  assert.ok(found.some((f) => f.style === 'quiet/veil' && f.palette === 'Бледная' && f.part === 'quiet-fill'), 'вуаль тихой на бледном наборе 1.14 : 1')
  const { clash } = availability(catalog, { ...samples, ...pale })
  assert.ok(clash['quiet/veil']?.['Бледная'])
  assert.ok(!clash['quiet/veil']?.['Аптека'], '«Аптека» доведена: вуаль видна')
  assert.ok(!clash['letters/sentence'] && !clash['letters/caps'], 'буквы от набора цвета не зависят')
})

/* Каталог растёт осями данными: новый вариант — запись в JSON; замер и
   выпуск подхватывают его без правки кода. */
test('a new option is data: the audit measures it and the emitter writes it', () => {
  const grown = structuredClone(catalog)
  grown.loud.варианты.tone = { имя: 'Тон', name: 'Tone', что: 'тон марки, тёмная надпись', роли: { '--ctrl-btn-fill-pop': 'var(--a-4)', '--ctrl-btn-ink-pop': 'var(--a-11)', '--ctrl-btn-edge-pop': 'transparent' } }
  grown.quiet.варианты.edge = { имя: 'Кромка', name: 'Edge', что: 'без вуали, кромка органа', роли: { '--ctrl-btn-fill': 'transparent', '--ctrl-btn-ink': 'var(--ink)', '--ctrl-btn-edge': 'var(--edge)' } }
  assert.deepEqual(auditButtons(grown, {}), [])
  const { clash, off, on } = availability(grown, { ...samples, ...pale })
  assert.ok(on.includes('quiet/edge'), 'кромка тихой проходит')
  assert.ok(!clash['quiet/edge']?.['Бледная'] && clash['quiet/veil']?.['Бледная'], 'кромка тихой на бледном наборе проходит там, где вуаль — нет')
  assert.ok(off['loud/tone']?.every((f) => f.part === 'loud-fill'), 'тон марки не виден на полу ни одного образца — назван и не выпускается')
  assert.doesNotMatch(toCss(grown, off, clash), /data-button-loud="tone"/, 'не прошедший замер не выпущен')
  assert.match(toCss(grown), /\[data-button-loud="tone"\]\{\n {2}--ctrl-btn-fill-pop: var\(--a-4\);/)
})

const one = (roles) => auditButtons({ x: { имя: 'x', name: 'x', варианты: { o: { имя: 'o', name: 'o', что: 'o', роли: roles } } } }, sitePalette).map((f) => f.rule).join(' | ')

test('audit refuses what the foundation forbids and the fields the button no longer takes', () => {
  assert.match(one({ '--ctrl-btn-weight': '800' }), /толщин/)
  assert.match(one({ '--ctrl-btn-track': '0.08em' }), /разрядк/)
  assert.match(one({ '--ctrl-btn-case': 'uppercase', '--ctrl-btn-track': 'normal' }), /заглавн/)
  assert.match(one({ '--ctrl-btn-r': '8px' }), /неизвестна/, 'угол — не роль каталога')
  assert.match(one({ '--ctrl-btn-press': 'scale(.9)' }), /неизвестна/, 'нажатие — не роль каталога')
  assert.match(one({ '--ctrl-btn-fill': 'transparent', '--ctrl-btn-edge': 'transparent' }), /не видна как орган/)
  const two = { a: { имя: 'a', name: 'a', варианты: { o: { имя: 'o', name: 'o', что: 'o', роли: { '--ctrl-btn-case': 'none' } } } }, b: { имя: 'b', name: 'b', варианты: { o: { имя: 'o', name: 'o', что: 'o', роли: { '--ctrl-btn-case': 'none' } } } } }
  assert.match(auditButtons(two, {}).map((f) => f.rule).join(), /объявляют две оси/)
})

test('buttons emitter refuses to write a catalog the audit rejects', () => {
  const dir = mkdtempSync(join(tmpdir(), 'buttons-refuse-'))
  try {
    cpSync(join(KIT, 'tools'), join(dir, 'tools'), { recursive: true })
    writeFileSync(join(dir, 'package.json'), '{"name":"probe","private":true,"type":"module"}')
    mkdirSync(join(dir, 'styles'))
    writeFileSync(join(dir, 'styles/palette.json'), JSON.stringify(sitePalette))
    const bad = structuredClone(catalog)
    bad.letters.варианты.sentence.роли['--ctrl-btn-weight'] = '800'
    writeFileSync(join(dir, 'styles/buttons.json'), JSON.stringify(bad))
    writeFileSync(join(dir, 'styles/buttons.css'), '/* old */\n')
    const run = spawnSync(process.execPath, [join(dir, 'tools/buttons.mjs')], { cwd: dir, encoding: 'utf8' })
    assert.notEqual(run.status, 0, run.stdout)
    assert.match(run.stderr, /не выпущен/)
    assert.equal(readFileSync(join(dir, 'styles/buttons.css'), 'utf8'), '/* old */\n')
  } finally { rmSync(dir, { recursive: true, force: true }) }
})
