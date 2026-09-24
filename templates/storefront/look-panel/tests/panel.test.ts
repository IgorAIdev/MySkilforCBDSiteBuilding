import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { blockedBy, clashes, complete, compose, CUSTOM, fieldsOf, paletteChecks, paletteVars, reresolve, ruleGroup, sectionsOf, STRUCTURE, uncovered } from '../ui/choice.mjs'
import { toCss } from '../../tools/palette.mjs'
import { stripHeaders, stripPanel, stripVariants, OWNED } from '../scripts/remove.mjs'
import { pairsOf } from '../scripts/pairs.mjs'
import { parseFaces } from '../scripts/fonts.mjs'
import { acceptLook, problems, type Facts } from '../../lib/look-rule.ts'
import { valid, type Slots } from '../../lib/look-values.ts'
import { HEADERS } from '../../lib/headers.ts'
import { CARDS } from '../../lib/cards.ts'
import { HOMES } from '../../lib/homes.ts'
import { availability } from '../../tools/buttons.mjs'

/* Тесты панели вида — уходят вместе с ней (`npm run test:panel`). */
const read = (p: string) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8')
type Paints = { light: Record<string, string>; dark: Record<string, string> }
type Option = { id: string; name: string; line?: string; plan?: string[]; vars?: Record<string, string>; fonts?: { family: string; weights: number[] }[]; seed?: Paints; style?: unknown }
type Pair = { x: { field: string; id: string }; y: { field: string; id: string }; why: string }
const catalog = JSON.parse(read('look-panel/ui/catalog.json')) as { defaults: Record<string, string>; groups: Record<string, Option[]>; axes: { field: string; name: string }[]; pairs: Pair[]; steps: Record<string, Record<string, string>> }
const FIELDS = fieldsOf(catalog) as string[]
const SECTIONS = sectionsOf(catalog)
const { slots, facts } = JSON.parse(read('lib/look-slots.json')) as { slots: Slots; facts: Facts }

test('panel catalog: every variant is values of properties the site declares, each of its kind', () => {
  assert.deepEqual(Object.keys(catalog.groups).sort(), [...FIELDS].sort())
  for (const [field, list] of Object.entries(catalog.groups)) {
    /* Ось кнопки может стоять одним вариантом, пока каталог не вырос (И273). */
    assert.ok(list.length >= (field.startsWith('btn-') ? 1 : 2), `${field}: выбирать есть из чего`)
    for (const o of list) for (const [k, v] of Object.entries(o.vars ?? {})) {
      assert.ok(slots[k], `${field} «${o.id}»: ${k} — свойство сайта`)
      assert.equal(slots[k].group, ruleGroup(field), `${field} «${o.id}»: ${k} — свойство своей группы (ритм углов не меняет)`)
      assert.ok(valid(slots[k].type, v), `${field} «${o.id}»: ${k}: ${v}`)
    }
  }
  for (const f of FIELDS) assert.equal(catalog.defaults[f], catalog.groups[f][0].id, `${f}: умолчание — первый, вариант сайта`)
})

test('panel sections: every field sits in exactly one sub-tab; System is colour, type, spacing, layout, shape, buttons', () => {
  const placed = SECTIONS.flatMap((s) => s.subs.flatMap((sub) => sub.fields.map((f) => f[0])))
  assert.deepEqual([...placed].sort(), [...FIELDS].sort())
  assert.equal(new Set(placed).size, placed.length)
  assert.deepEqual(SECTIONS[0].subs.map((s) => s.name), ['Color', 'Type', 'Spacing', 'Layout', 'Shape', 'Buttons'])
  assert.deepEqual(SECTIONS[1].subs.map((s) => s.name), ['Header', 'Card', 'Home', 'Product page'])
  /* Главная — разметка вида (lib/homes.ts): варианты каталога — все главные
     сайта, по порядку; первая, нынешняя, — умолчание. */
  assert.deepEqual(catalog.groups.home.map((o) => o.id), [...HOMES])
  assert.equal(catalog.defaults.home, HOMES[0])
  for (const o of catalog.groups.home) assert.ok(o.name && o.line && o.plan?.length, `${o.id}: имя, строка и схема первого экрана`)
  /* Карта товара (И278): доля ряда, край снимка, миниатюры — значения
     `--pdp-*`, умолчание — то, что стоит у сайта. Полка (И400): одежда,
     пропорция снимка — одна на полку и карту — и плотность полки. */
  const product = SECTIONS[1].subs.find((s) => s.id === 'product')!
  assert.deepEqual(product.fields.map((f) => f[1]), ['Gallery width', 'Picture edge', 'Thumbnails'])
  const card = SECTIONS[1].subs.find((s) => s.id === 'card')!
  assert.deepEqual(card.fields.map((f) => f[1]), ['Product card', 'Picture', 'Cart button', 'Shelf density'])
  assert.deepEqual(catalog.groups['pdp-gallery'].map((o) => o.id).sort(), ['40', '50', '60'])
  assert.deepEqual(catalog.groups['shot-frame'].map((o) => o.name).sort(), ['1:1', '3:4', '4:3', '4:5'])
  for (const o of catalog.groups['shot-frame']) assert.match(o.vars!['--shot-frame'], /^\d+ \/ \d+$/, `${o.id}: дробью a / b — из неё карта считает высоту галереи`)
  assert.deepEqual(catalog.groups['shelf-cols'].map((o) => o.id).sort(), ['4', '5'], 'плотность — 4 или 5 в ряд (shop: 4–5)')
  assert.deepEqual(catalog.groups['card-buy'].map((o) => o.id), ['full', 'beside'], 'кнопка карточки — во всю ширину по умолчанию')
  assert.deepEqual(catalog.groups['pdp-thumbs'].map((o) => o.name).sort(), ['Below', 'Dots', 'On the picture', 'Side'])
  for (const f of ['pdp-gallery', 'pdp-thumbs', 'pdp-edge', 'shot-frame', 'shelf-cols', 'card-buy']) assert.equal(catalog.groups[f][0].vars![`--${f}`], slots[`--${f}`].value, `${f}: умолчание — значение сайта`)
  const buttons = SECTIONS[0].subs.find((s) => s.id === 'buttons')!
  assert.deepEqual(buttons.fields.map((f) => f[0]), catalog.axes.map((a) => a.field), 'Buttons — оси каталога кнопки')
  assert.deepEqual(catalog.axes.map((a) => a.name), ['Letters', 'Main button', 'Quiet button', 'Main button shape'])
  assert.deepEqual(catalog.groups['btn-letters'].map((o) => o.name), ['Sentence case', 'CAPITALS'], 'как в предложении — по умолчанию')
  assert.deepEqual(catalog.groups.width.map((o) => o.id), ['1440', '1280', '1600'], 'холст по умолчанию — 1440')
  assert.deepEqual(catalog.groups.corners.map((o) => o.name).sort(), ['Crisp', 'Round', 'Standard'])
  assert.deepEqual(catalog.groups.shadow.map((o) => o.name), ['Soft', 'Flat', 'Lifted'])
  for (const o of catalog.groups.corners) {
    const [ctrl, card, sheet] = ['--r-ctrl', '--r-card', '--r-sheet'].map((k) => Number.parseFloat(o.vars![k]))
    assert.ok(ctrl <= card && card <= sheet, `${o.name}: орган ≤ карточка ≤ лист`)
  }
  assert.ok(STRUCTURE.every((f) => SECTIONS[1].subs.some((s) => s.fields.some((x) => x[0] === f))), 'разметка — в Admin')
})

test('panel palette builder: the kit engine gives each catalog set the values the kit palette writes, and every set passes the checks', () => {
  for (const o of catalog.groups.palette) {
    const kit = Object.fromEntries([...toCss({ [o.id]: o.seed }).split('[data-palette=')[0].matchAll(/ {2}(--[\w-]+): ([^;]+);/g)].map((m) => [m[1], m[2]]))
    assert.deepEqual(paletteVars(o.seed!), kit, `${o.name}: движок панели = tools/palette.mjs`)
    assert.deepEqual(o.vars, kit, `${o.name}: каталог посчитан тем же движком`)
    const m = paletteChecks(o.seed!, catalog.steps)
    assert.ok(m.ok, `${o.name}: ${[...m.rows.filter((r: { pass: boolean }) => !r.pass), ...m.extra].map((r: { label: string; mode: string }) => `${r.label} ${r.mode}`).join(', ')}`)
  }
  const loud = { light: { paper: '#FFFFFF', ink: '#1F1E1C', accent: '#FFE600' }, dark: { paper: '#121110', ink: '#EDEBE8', accent: '#B8955A' } }
  const m = paletteChecks(loud, catalog.steps)
  assert.equal(m.ok, false, 'жёлтая марка на белом — не годится')
  assert.ok([...m.rows.filter((r: { pass: boolean }) => !r.pass), ...m.extra].length > 0)
  const own = compose({ ...catalog.defaults, palette: CUSTOM }, catalog, { name: 'Mine', ...loud })
  assert.equal(own.look.names.palette, CUSTOM)
  assert.deepEqual(own.look.paints, { name: 'Mine', ...loud }, 'три краски на тему — рядом со значениями')
  assert.equal(own.look.vars['--a-9'], paletteVars(loud)['--a-9'])
  assert.equal(compose({ palette: CUSTOM }, catalog).look.names.palette, catalog.defaults.palette, 'своя палитра без красок — умолчание')
})

test('panel catalog: the default look is accepted whole, and the published look gives every site property a value', () => {
  const { look } = compose(catalog.defaults, catalog)
  assert.deepEqual(acceptLook(look, slots, facts).notes, [])
  assert.deepEqual(uncovered(look.vars, slots), [], 'умолчание каталога покрывает каждое свойство сайта')
  /* И353: вид, старше каталога, не смешивается с умолчаниями стилей чужой
     палитры — сборка каталога пересчитывает его из имён (И352). */
  const published = JSON.parse(read('lib/source/sample/look.json'))
  assert.deepEqual(acceptLook(published, slots, facts).notes, [])
  assert.deepEqual(uncovered(published.vars, slots), [], 'опубликованный вид — значение каждому свойству сайта')
})

test('a look published before the picture ratio moved to Card keeps its choice: pdp-frame carries over to shot-frame', () => {
  /* И400: пропорция снимка переехала из «Product page» в «Card» под новым
     именем. Выбор заказчика под прежним именем переносится, а не теряется. */
  const names = { 'pdp-frame': 'portrait' }
  assert.equal(complete(names, catalog)['shot-frame'], 'portrait', 'панель показывает прежний выбор')
  const r = reresolve({ vars: { '--pdp-frame': '4 / 5' }, names }, catalog)
  assert.equal(r.look.vars['--shot-frame'], '4 / 5', 'значение — из прежнего выбора')
  assert.ok(r.dropped.includes('--pdp-frame'), 'прежнего свойства у сайта больше нет')
  assert.ok(!r.kept.some((k) => k.field === 'shot-frame'), 'группа не держит чужое — выбор узнан')
})

test('published look re-resolved from its names: new properties get values of the owner\'s choice, names stay, a vanished name keeps its group', () => {
  const palette = catalog.groups.palette.find((o) => o.id !== catalog.defaults.palette)!
  const names = { palette: palette.id, face: catalog.groups.face.at(-1)!.id, marker: catalog.groups.marker.at(-1)!.id }
  const full = compose(names, catalog).look
  /* Вид, опубликованный до новых ролей палитры, теней и формы кнопки. */
  const newer = [...Object.keys(palette.vars!).slice(-5), '--sh-raised', '--shot-frame']
  const old = { header: 'classic', vars: Object.fromEntries(Object.entries(full.vars).filter(([k]) => !newer.includes(k))), fonts: [], names }
  const r = reresolve(old, catalog)
  assert.deepEqual(r.look.names, names, 'имена — как были')
  assert.equal(r.look.names, names, 'тот же объект имён')
  assert.deepEqual(r.look.vars, full.vars, 'значения — из выбора заказчика, как у свежей публикации')
  assert.deepEqual([...r.added].sort(), [...newer].sort())
  assert.deepEqual([r.changed, r.dropped, r.kept, r.same], [[], [], [], false])
  assert.equal(reresolve(r.look, catalog).same, true, 'второй пересчёт ничего не меняет')
  /* Имени в каталоге больше нет — не угадывается: группа держит прежнее. */
  const gone = reresolve({ ...old, names: { ...names, face: 'gone' }, vars: { ...old.vars, '--face': "'Gone', var(--face-stack)" } }, catalog)
  assert.deepEqual(gone.kept, [{ field: 'face', id: 'gone', why: '«gone» is no longer in the catalog' }])
  assert.equal(gone.look.vars['--face'], "'Gone', var(--face-stack)")
  /* Поля не было при публикации: умолчание каталога — если прежние значения
     группы и есть умолчание; иначе прежние остаются и называются. */
  const width = catalog.groups.width.find((o) => o.id !== catalog.defaults.width)!
  const unnamed = reresolve({ ...old, vars: { ...old.vars, ...width.vars } }, catalog)
  assert.deepEqual(unnamed.kept.map((k) => k.field), ['width'])
  assert.equal(unnamed.look.vars['--wrap'], width.vars!['--wrap'])
  /* Умолчание, которое набор переписал (И385): прежние значения «Soft»
     узнаются по `was` — группа без имени пересчитывается на нынешнее. */
  const soft = catalog.groups.shadow.find((o) => o.id === catalog.defaults.shadow)!
  const was = (soft as { was?: Record<string, string>[] }).was?.[0]
  assert.ok(was, 'у умолчания теней нет прежних значений')
  const moved = reresolve({ ...old, vars: { ...old.vars, ...was } }, catalog)
  assert.deepEqual(moved.kept, [])
  assert.equal(moved.look.vars['--sh-in'], soft.vars!['--sh-in'])
  /* Своя палитра — из её трёх красок на тему, тем же движком. */
  const own = { light: { paper: '#FBFAF7', ink: '#1F1E1C', accent: '#2F6B4F' }, dark: { paper: '#121110', ink: '#EDEBE8', accent: '#7FB89A' } }
  const custom = reresolve({ ...old, names: { ...names, palette: CUSTOM }, paints: { name: 'Mine', ...own } }, catalog)
  assert.deepEqual(Object.fromEntries(Object.keys(paletteVars(own)).map((k) => [k, custom.look.vars[k]])), paletteVars(own))
  assert.deepEqual(custom.kept, [])
})

test('panel pairs: each listed pair is a problem of the site rule, and the guard finds it from both sides', () => {
  const base = Object.fromEntries(Object.entries(slots).map(([k, s]) => [k, s.value]))
  /* Наборы набора доведены строителем (И285), и каталог может не нести ни
     одной пары. Сторож при этом жив: бледная палитра — «Аптека» до
     24.09.2026 — не носится с вуалью тихой кнопки, и та же функция, что у
     /look-panel/guard, это находит. */
  const pale = { light: { paper: '#FEFCF5', ink: '#24352B', accent: '#B79339' }, dark: { paper: '#0C1510', ink: '#EDECE9', accent: '#B79339' } }
  const guard = pairsOf({ groups: { ...catalog.groups, palette: [{ id: CUSTOM, vars: paletteVars(pale) }] }, fields: FIELDS.filter((f) => !STRUCTURE.includes(f)), base, facts, problems, only: 'palette' })
  assert.ok(guard.some((p) => p.y.field === 'btn-quiet' && /quiet button fades/.test(p.why)), JSON.stringify(guard))
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

test('panel pairs: every button axis option × palette agrees with the kit button audit on every catalog palette', () => {
  /* Каталог кнопки — оси: вариант каждой оси меряется набором своими ролями. */
  const buttons = Object.fromEntries(catalog.axes.map((a) => [a.field.slice(4), { имя: a.name, name: a.name, варианты: Object.fromEntries(catalog.groups[a.field].map((o) => [o.id, { имя: o.name, name: o.name, что: o.name, роли: o.vars }])) }]))
  const palettes = Object.fromEntries(catalog.groups.palette.map((o) => [o.id, o.seed]))
  const { off, clash } = availability(buttons, palettes) as unknown as { off: Record<string, unknown>; clash: Record<string, Record<string, unknown>> }
  for (const a of catalog.axes) {
    for (const o of catalog.groups[a.field]) {
      const style = `${a.field.slice(4)}/${o.id}`
      for (const palette of Object.keys(palettes)) {
        const kit = Boolean(off[style] || clash[style]?.[palette])
        const site = catalog.pairs.some((p) => p.x.field === 'palette' && p.x.id === palette && p.y.field === a.field && p.y.id === o.id)
        assert.equal(site, kit, `${style} × ${palette}`)
      }
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
  for (const chosen of CARDS) {
    const css = stripVariants(read('components/ProductCard.module.css'), 'look-card', chosen)
    assert.ok(!css.includes('look-card'), `${chosen}: меток не осталось`)
    for (const c of CARDS) assert.equal(css.includes(`[data-card='${c}']`), c === chosen, `${chosen}: ${c}`)
    assert.ok(!/\/\*[^*]*$/.test(css.replace(/\/\*[\s\S]*?\*\//g, '')), `${chosen}: комментарии закрыты`)
    assert.match(stripVariants(read('lib/cards.ts'), 'look-card', chosen), new RegExp(`CARDS = \\[\\n  '${chosen}',\\n\\] as const`))
  }
  /* Главная: снятие оставляет рецепт, раскладки блоков и правила только
     выбранной; метки и следы снятия уходят, комментарии закрыты. */
  const HOME_FILES = ['lib/homes.ts', 'components/blocks/registry.tsx', 'components/blocks/Hero.tsx', 'components/blocks/Categories.tsx', 'components/blocks/Featured.tsx',
    'components/blocks/Lab.tsx', 'components/blocks/blocks.module.css', 'components/LabReport.tsx', 'components/LabReport.module.css']
  for (const chosen of HOMES) {
    for (const f of HOME_FILES) {
      const text = stripVariants(read(f), 'look-home', chosen)
      assert.ok(!text.includes('look-home') && !text.includes('look:remove'), `${chosen}: ${f} — меток не осталось`)
      assert.ok(!/\/\*[^*]*$/.test(text.replace(/\/\*[\s\S]*?\*\//g, '')), `${chosen}: ${f} — комментарии закрыты`)
      for (const other of HOMES.filter((h) => h !== chosen)) assert.ok(!new RegExp(`^\\s+${other}: `, 'm').test(text), `${chosen}: ${f} — нет строки варианта ${other}`)
    }
    assert.match(stripVariants(read('lib/homes.ts'), 'look-home', chosen), new RegExp(`HOMES = \\[\\n  '${chosen}',\\n\\] as const`))
    assert.equal(stripVariants(read('components/blocks/registry.tsx'), 'look-home', chosen).includes('Still'), chosen === 'cabinet', `${chosen}: пауза снимком — только у аптеки`)
  }
})

test('panel fonts: the Google CSS gives one file per face of the latin subsets, variable fonts as a weight range', () => {
  const css = ['latin-ext', 'latin', 'cyrillic'].flatMap((subset) => [400, 700].map((w) => `/* ${subset} */\n@font-face {\n  font-family: 'Inter';\n  font-weight: ${w};\n  src: url(https://fonts.gstatic.com/s/inter/v1/${subset}.woff2) format('woff2');\n  unicode-range: U+0000-00FF, U+0131;\n}`)).join('\n')
  const faces = parseFaces(css)
  assert.deepEqual(faces.map((f) => [f.subset, f.weights]), [['latin-ext', [400, 700]], ['latin', [400, 700]]])
})
