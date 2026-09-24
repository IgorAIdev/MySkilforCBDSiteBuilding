import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { acceptLook, contrast, problems, settle, type Facts } from '../lib/look-rule.ts'
import type { Slots } from '../lib/look-values.ts'
import { ratio } from '../tools/palette.mjs'
import { HEADERS } from '../lib/headers.ts'

/* Правило сочетаний вида — чистое, по значениям (И270). Тесты на своих
   числах: правило видит вуаль тихой кнопки из бледных чернил, угол кнопки
   круглее карточки, толщину, которой у шрифта нет; сайт уступает младшей
   группой и называет её. */
const facts: Facts = {
  roles: {
    '--page': 'light-dark(var(--n-5), var(--n-1))', '--plate': 'light-dark(var(--n-1), var(--n-4))', '--surface': 'var(--plate)',
    '--ink': 'var(--n-12)', '--quiet': 'color-mix(in srgb, var(--ink) 8%, transparent)',
    '--pop': 'var(--a-9)', '--on-pop': 'var(--on-a-9)', '--pop-ink': 'var(--a-11)',
  },
  need: { text: 4.5, control: 3, visible: 1.15 },
  headings: ['h2'],
}
const slots: Slots = {
  '--n-1': { type: 'colour', group: 'palette', value: 'light-dark(#FFFFFF, #121110)' },
  '--n-4': { type: 'colour', group: 'palette', value: 'light-dark(#F0F0F0, #2D2924)' },
  '--n-5': { type: 'colour', group: 'palette', value: 'light-dark(#E1E1DF, #35312A)' },
  '--n-12': { type: 'colour', group: 'palette', value: 'light-dark(#1F1E1C, #EDEBE8)' },
  '--a-9': { type: 'colour', group: 'palette', value: 'light-dark(#9A7B3F, #B8955A)' },
  '--a-11': { type: 'colour', group: 'palette', value: 'light-dark(#795F29, #CBB593)' },
  '--on-a-9': { type: 'colour', group: 'palette', value: 'light-dark(#111111, #111111)' },
  '--edge': { type: 'colour', group: 'palette', value: 'light-dark(#64635F, #82796C)' },
  '--ctrl-btn-r': { type: 'length', group: 'button', value: '8px' },
  '--ctrl-btn-fill': { type: 'colour', group: 'button', value: 'var(--quiet)' },
  '--ctrl-btn-edge': { type: 'colour', group: 'button', value: 'transparent' },
  '--ctrl-btn-fill-pop': { type: 'colour', group: 'button', value: 'var(--pop)' },
  '--ctrl-btn-ink-pop': { type: 'colour', group: 'button', value: 'var(--on-pop)' },
  '--ctrl-btn-edge-pop': { type: 'colour', group: 'button', value: 'transparent' },
  '--ctrl-btn-weight': { type: 'number', group: 'button', value: '600' },
  '--r-card': { type: 'length', group: 'scale', value: '24px' },
  '--h2-weight': { type: 'number', group: 'scale', value: '600' },
  '--body-weight': { type: 'number', group: 'scale', value: '400' },
  '--face': { type: 'font', group: 'face', value: 'var(--face-stack)' },
  '--face-head': { type: 'font', group: 'face', value: 'var(--face)' },
}
const base = Object.fromEntries(Object.entries(slots).map(([k, s]) => [k, s.value]))
/* Бледные чернила: их вуаль 8 % на полу не видна. */
const pale = { '--n-12': 'light-dark(#8A8A8A, #EDEBE8)' }
const edgeStyle = { '--ctrl-btn-fill': 'transparent', '--ctrl-btn-edge': 'var(--edge)' }

test('look rule: the contrast is the kit formula', () => {
  for (const [a, b] of [['#9A7B3F', '#FFFFFF'], ['#111111', '#B8955A'], ['#E1E1DF', '#1F1E1C']]) {
    const c = (h: string) => [Number.parseInt(h.slice(1, 3), 16), Number.parseInt(h.slice(3, 5), 16), Number.parseInt(h.slice(5, 7), 16), 1] as const
    assert.equal(contrast(c(a), c(b)).toFixed(6), ratio(a, b).toFixed(6), `${a} / ${b}`)
  }
})

test('look rule: the site defaults hold together', () => {
  assert.deepEqual(problems(base, [], facts), [])
})

test('look rule: a quiet veil of pale ink is a button × palette problem; an edged quiet button is not', () => {
  const hit = problems({ ...base, ...pale }, [], facts)
  assert.equal(hit.length, 2)
  assert.deepEqual([...hit[0].groups], ['button', 'palette'])
  assert.match(hit[0].why, /quiet button fades into the page: 1\.\d+ : 1 in the light theme, needs 1\.15/)
  assert.deepEqual(problems({ ...base, ...pale, ...edgeStyle }, [], facts), [])
})

test('look rule: a button rounder than the card is a button × scale problem', () => {
  const hit = problems({ ...base, '--ctrl-btn-r': '16px', '--r-card': '12px' }, [], facts)
  assert.deepEqual(hit.map((p) => [...p.groups]), [['button', 'scale']])
  assert.match(hit[0].why, /16 px.*12 px/)
})

test('look rule: a weight the loaded font lacks is a face problem; the system face has every weight', () => {
  const inter = [{ family: 'Inter', files: [{ url: '/fonts/i.woff2', weight: '400', range: 'U+0000-00FF' }, { url: '/fonts/j.woff2', weight: '700', range: 'U+0000-00FF' }] }]
  const hit = problems({ ...base, '--face': "'Inter', var(--face-stack)" }, inter, facts)
  assert.deepEqual(hit.map((p) => [...p.groups]).sort(), [['face', 'button'], ['face', 'scale']])
  assert.ok(hit.some((p) => /button labels is set at weight 600; Inter is loaded at 400, 700/.test(p.why)))
  const variable = [{ family: 'Inter', files: [{ url: '/fonts/i.woff2', weight: '400 700', range: 'U+0000-00FF' }] }]
  assert.deepEqual(problems({ ...base, '--face': "'Inter', var(--face-stack)" }, variable, facts), [])
})

test('look rule: settling drops the younger group of a failing pair, and again if the default still fails', () => {
  /* Бледные чернила + тихая с кромкой: носятся. */
  assert.deepEqual(settle({ ...pale, ...edgeStyle }, [], slots, facts).fell, [])
  /* Бледные чернила + вуаль: уступает кнопка — и умолчание кнопки (тоже
     вуаль) с ними не носится: уступает и палитра. */
  const two = settle({ ...pale, '--ctrl-btn-r': '4px' }, [], slots, facts)
  assert.deepEqual(two.fell.map((f) => f.group), ['button', 'palette'])
  assert.deepEqual(two.vars, {})
  /* Кнопка круглее карточки: уступает кнопка, ритм остаётся. */
  const round = settle({ '--ctrl-btn-r': '16px', '--r-card': '12px' }, [], slots, facts)
  assert.deepEqual(round.fell.map((f) => f.group), ['button'])
  assert.deepEqual(round.vars, { '--r-card': '12px' })
  assert.match(round.fell[0].why, /^does not go with the scale: button corners/)
})

test('look rule: acceptLook names every dropped thing and keeps only values that differ from the site styles', () => {
  const { look, notes } = acceptLook({ header: HEADERS[0], vars: { ...base, '--ctrl-btn-r': '16px', '--r-card': '12px' }, fonts: [], names: {} }, slots, facts, HEADERS)
  assert.deepEqual(look.vars, { '--r-card': '12px' })
  assert.deepEqual(notes.map((n) => n.what), ['button'])
  assert.ok(JSON.parse(readFileSync(new URL('../lib/look-slots.json', import.meta.url), 'utf8')).facts.need.visible === 1.15, 'пороги — из набора')
})
