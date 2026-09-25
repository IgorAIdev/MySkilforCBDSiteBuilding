import { test } from 'node:test'
import assert from 'node:assert/strict'
import { acceptValues, lookCss, valid, validFont, type Slots } from '../lib/look-values.ts'
import { HEADERS } from '../lib/headers.ts'
import { CARDS } from '../lib/cards.ts'
import { HOMES } from '../lib/homes.ts'

/* Вид приходит данными и ложится в страницу блоком <style>: значение,
   которым можно закрыть объявление, блок или тег, не проходит (И270). */
const slots: Slots = {
  '--a-9': { type: 'colour', group: 'palette', value: 'light-dark(#9A7B3F, #B8955A)' },
  '--ctrl-btn-r': { type: 'length', group: 'button', value: '8px' },
  '--ctrl-btn-weight': { type: 'number', group: 'button', value: '600' },
  '--ctrl-btn-case': { type: 'keyword', group: 'button', value: 'none' },
  '--face': { type: 'font', group: 'face', value: 'var(--face-stack)' },
}

test('look values: each kind takes its own shapes', () => {
  for (const v of ['light-dark(#FCFBF9, #121110)', '#fff', 'transparent', 'var(--quiet)', 'color-mix(in oklab, var(--pop), var(--ink) var(--state-press))', 'color-mix(in srgb, var(--pop) 14%, transparent)']) assert.ok(valid('colour', v), v)
  for (const v of ['8px', '0', 'var(--r-pop)', 'normal', '0.04em', 'clamp(.7813rem, .68rem + .29vw, .875rem)', 'calc(var(--sp-2) * 2)', '-.04em']) assert.ok(valid('length', v), v)
  for (const v of ['600', '1.5', 'var(--x)']) assert.ok(valid('number', v), v)
  for (const v of ['none', 'uppercase', 'underline']) assert.ok(valid('keyword', v), v)
  for (const v of ['none', 'var(--sh-raised)', '0 0 0 1px var(--rule)', '0 0 0 1px var(--sh-ring), 0 1px 2px var(--sh-near), 0 8px 20px -10px var(--sh-far-1)', 'inset 0 1px 2px color-mix(in oklab, var(--ink) 18%, transparent)']) assert.ok(valid('shadow', v), v)
  for (const v of ['none, 0 0 1px var(--x)', '0 0 1px red', '0 0 1px #000', '1vw 0 var(--x)']) assert.ok(!valid('shadow', v), `тень: ${v}`)
  for (const v of ['none', 'scale(.97)', 'translateY(1px)']) assert.ok(valid('transform', v), v)
  for (const v of ["'Inter', var(--face-stack)", "'Source Serif 4', Georgia, 'Times New Roman', serif", 'var(--face)']) assert.ok(valid('font', v), v)
})

test('look values: nothing that closes a declaration, a block or a tag gets through', () => {
  const attacks = [
    'red; } body { display:none', '#fff}', '</style><script>alert(1)</script>', 'url(https://evil.test/x.png)',
    'var(--x); background:url(x)', 'expression(alert(1))', '"Inter"', "'Inter'; x", '\\3b', '@import url(x)',
    'light-dark(#fff, #000) !important', 'calc(1px', '1px)', 'var(--x', 'javascript:alert(1)', '#fff\n}',
  ]
  for (const type of ['colour', 'length', 'number', 'keyword', 'shadow', 'transform', 'font'] as const) {
    for (const a of attacks) assert.ok(!valid(type, a), `${type}: ${a}`)
  }
  assert.ok(!valid('keyword', 'inline'), 'слово не из списка рода')
  assert.ok(!valid('number', '600px'), 'число без единицы')
  assert.ok(!valid('colour', '12px'), 'длина вместо краски')
  assert.ok(!valid('length', 'red'), 'краска вместо длины')
  assert.ok(!valid('font', "'Inter<'"), 'имя шрифта простыми знаками')
})

test('look values: a bad property falls back alone and is named; the rest of the look stays', () => {
  const { look, dropped } = acceptValues({
    header: HEADERS[0],
    vars: { '--a-9': 'light-dark(#112233, #445566)', '--ctrl-btn-r': 'red; }', '--unknown': '1px', '--ctrl-btn-weight': '700' },
    fonts: [{ family: 'Inter', files: [{ url: 'https://fonts.gstatic.com/x.woff2', weight: '400', range: 'U+0000-00FF' }] }],
    names: { palette: 'Латунь на угле', evil: '<b>' },
  }, slots)
  assert.deepEqual(look.vars, { '--a-9': 'light-dark(#112233, #445566)', '--ctrl-btn-weight': '700' })
  assert.deepEqual(dropped.map((d) => d.what).sort(), ['--ctrl-btn-r', '--unknown', 'font'])
  assert.deepEqual(look.fonts, [])
  assert.deepEqual(look.names, { palette: 'Латунь на угле' })
  assert.equal(acceptValues({ header: 'mega' }, slots).look.header, HEADERS[0])
  assert.equal(acceptValues({ header: HEADERS[0] }, slots).look.card, CARDS[0], 'без карточки — первая, без слова')
  assert.deepEqual(acceptValues({ header: HEADERS[0], card: 'mega' }, slots).dropped.map((d) => d.what), ['card'])
  /* Главная — разметка вида, как шапка и карточка: вид старше поля берёт
     первую, нынешнюю, без слова; незнакомая называется и уступает первой. */
  assert.equal(acceptValues({ header: HEADERS[0] }, slots).look.home, HOMES[0], 'без главной — первая, без слова')
  assert.equal(acceptValues({ header: HEADERS[0], home: HOMES.at(-1) }, slots).look.home, HOMES.at(-1))
  const odd = acceptValues({ header: HEADERS[0], home: 'mega' }, slots)
  assert.equal(odd.look.home, HOMES[0])
  assert.deepEqual(odd.dropped.map((d) => d.what), ['home'])
})

test('look values: the style block carries the values and the self-hosted fonts', () => {
  const font = { family: 'Inter', files: [{ url: '/fonts/inter-latin-0123456789.woff2', weight: '400 700', range: 'U+0000-00FF, U+0131' }] }
  assert.ok(validFont(font))
  assert.ok(!validFont({ ...font, family: 'Inter}' }))
  const css = lookCss({ header: HEADERS[0], card: CARDS[0], home: HOMES[0], vars: { '--a-9': '#112233' }, fonts: [font], names: {} })
  assert.match(css, /^:root\{--a-9:#112233\}/)
  assert.match(css, /@font-face\{font-family:'Inter';src:url\(\/fonts\/inter-latin-0123456789\.woff2\) format\('woff2'\);font-weight:400 700;/)
  assert.equal(lookCss({ header: HEADERS[0], card: CARDS[0], home: HOMES[0], vars: {}, fonts: [], names: {} }), '')
})
