import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { blockedBy, clashes, complete, compose, FIELDS } from '../ui/choice.mjs'
import { stripHeaders, stripPanel, OWNED } from '../scripts/remove.mjs'
import { parseFaces } from '../scripts/fonts.mjs'
import { acceptLook, problems, type Facts } from '../../lib/look-rule.ts'
import { valid, type Slots } from '../../lib/look-values.ts'
import { HEADERS } from '../../lib/headers.ts'
import { availability } from '../../tools/buttons.mjs'

/* Тесты панели вида — уходят вместе с ней (`npm run test:panel`). */
const read = (p: string) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8')
type Option = { id: string; name: string; vars?: Record<string, string>; fonts?: { family: string; weights: number[] }[]; seed?: unknown; style?: unknown }
type Pair = { x: { field: string; id: string }; y: { field: string; id: string }; why: string }
const catalog = JSON.parse(read('look-panel/ui/catalog.json')) as { defaults: Record<string, string>; groups: Record<string, Option[]>; pairs: Pair[] }
const { slots, facts } = JSON.parse(read('lib/look-slots.json')) as { slots: Slots; facts: Facts }

test('panel catalog: every variant is values of properties the site declares, each of its kind', () => {
  assert.deepEqual(Object.keys(catalog.groups).sort(), [...FIELDS].sort())
  for (const [field, list] of Object.entries(catalog.groups)) {
    assert.ok(list.length >= 2, `${field}: выбирать есть из чего`)
    for (const o of list) for (const [k, v] of Object.entries(o.vars ?? {})) {
      assert.ok(slots[k], `${field} «${o.id}»: ${k} — свойство сайта`)
      assert.ok(valid(slots[k].type, v), `${field} «${o.id}»: ${k}: ${v}`)
    }
  }
  for (const f of FIELDS) assert.equal(catalog.defaults[f], catalog.groups[f][0].id, `${f}: умолчание — первый, вариант сайта`)
})

test('panel catalog: the default look is what the site publishes and it is accepted whole', () => {
  const { look } = compose(catalog.defaults, catalog)
  const published = JSON.parse(read('lib/source/sample/look.json'))
  assert.deepEqual(acceptLook(look, slots, facts, HEADERS).notes, [])
  assert.deepEqual(Object.keys(published.vars).sort(), Object.keys(look.vars).sort(), 'опубликованный вид — те же свойства')
})

test('panel pairs: each listed pair is a problem of the site rule, and the guard finds it from both sides', () => {
  assert.ok(catalog.pairs.length > 0)
  const base = Object.fromEntries(Object.entries(slots).map(([k, s]) => [k, s.value]))
  const opt = (field: string, id: string) => catalog.groups[field].find((o) => o.id === id)!
  for (const p of catalog.pairs) {
    const x = opt(p.x.field, p.x.id)
    const y = opt(p.y.field, p.y.id)
    const fonts = [x, y].flatMap((o, i) => ([p.x.field, p.y.field][i] === 'face' ? o.fonts ?? [] : []))
      .map((f) => ({ family: f.family, files: f.weights.map((w) => ({ url: '', weight: String(w), range: '' })) }))
    assert.ok(problems({ ...base, ...x.vars, ...y.vars }, fonts, facts).some((q) => q.why === p.why), `${p.x.id} × ${p.y.id}`)
    const names = complete({ [p.x.field]: p.x.id, [p.y.field]: p.y.id }, catalog)
    assert.equal(clashes(names, catalog.pairs).length >= 1, true)
    assert.equal(blockedBy(p.x.field, p.x.id, names, catalog.pairs)?.id, p.y.id)
    assert.equal(blockedBy(p.y.field, p.y.id, names, catalog.pairs)?.id, p.x.id)
  }
})

test('panel pairs: button × palette agrees with the kit button audit on every catalog palette', () => {
  const styles = Object.fromEntries(catalog.groups.button.map((o) => [o.id, o.style]))
  const palettes = Object.fromEntries(catalog.groups.palette.map((o) => [o.id, o.seed]))
  const { off, clash } = availability(styles, palettes) as unknown as { off: Record<string, unknown>; clash: Record<string, Record<string, unknown>> }
  for (const style of Object.keys(styles)) {
    for (const palette of Object.keys(palettes)) {
      const kit = Boolean(off[style] || clash[style]?.[palette])
      const site = catalog.pairs.some((p) => p.x.field === 'palette' && p.x.id === palette && p.y.field === 'button' && p.y.id === style)
      assert.equal(site, kit, `${style} × ${palette}`)
    }
  }
})

test('panel removal: the panel lines go, the chosen header stays without its marks', () => {
  assert.deepEqual(OWNED, ['look-panel', 'app/look-panel'])
  const shell = stripPanel(read('components/Shell.tsx'))
  assert.ok(!shell.includes('look-panel'))
  assert.match(shell, /<style href="look" precedence="look">/)
  for (const chosen of HEADERS) {
    const tsx = stripHeaders(read('components/Header.tsx'), chosen)
    assert.ok(!tsx.includes('look-header'), `${chosen}: меток не осталось`)
    for (const h of HEADERS) assert.equal(tsx.includes(`data-variant="${h}"`), h === chosen, `${chosen}: ${h}`)
    const list = stripHeaders(read('lib/headers.ts'), chosen)
    assert.match(list, new RegExp(`HEADERS = \\[\\n  '${chosen}',\\n\\] as const`))
    const css = stripHeaders(read('components/Header.module.css'), chosen)
    assert.ok(!css.includes('look-header'))
    assert.equal(css.includes("[data-variant='boutique']"), chosen === 'boutique')
    assert.equal(css.includes('.strip{'), chosen === 'search')
  }
})

test('panel fonts: the Google CSS gives one file per face of the latin subsets, variable fonts as a weight range', () => {
  const css = ['latin-ext', 'latin', 'cyrillic'].flatMap((subset) => [400, 700].map((w) => `/* ${subset} */\n@font-face {\n  font-family: 'Inter';\n  font-weight: ${w};\n  src: url(https://fonts.gstatic.com/s/inter/v1/${subset}.woff2) format('woff2');\n  unicode-range: U+0000-00FF, U+0131;\n}`)).join('\n')
  const faces = parseFaces(css)
  assert.deepEqual(faces.map((f) => [f.subset, f.weights]), [['latin-ext', [400, 700]], ['latin', [400, 700]]])
})
