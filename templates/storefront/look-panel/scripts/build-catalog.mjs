/* Каталог панели вида — look-panel/ui/catalog.json (PANEL.md, шаг 1).

   Все варианты, из которых выбирают, живут у панели, а не в сайте
   (CLAUDE.md, «Панель настройки физически отделена от сайта»). Каталог
   собирается из полного каталога НАБОРА — палитры (styles/palette.json и
   образцы templates/palette.json), стили кнопок (styles/buttons.json),
   наборы ритма (styles/scale.json) — строителями набора, которые уже лежат
   в сайте (tools/): каждый вариант — готовые значения тех же свойств, что
   сайт объявляет у себя (lib/look-slots.json). Варианты самого сайта идут
   первыми — это умолчания каталога. Шрифты-кандидаты и отметка пункта меню
   — здесь же, данными.

   Пары, которые не носятся, считает правило сайта (lib/look-rule.ts) на
   каждой паре вариантов двух групп — панель гасит по ним, сайт судит тем
   же правилом. Список пар ложится и в PANEL.md.

     node look-panel/scripts/build-catalog.mjs --from ../SkillSiteBuilding
       --from   папка набора: откуда брать полный каталог (ставщик передаёт сам)
       --look   заодно записать опубликованный вид образца = умолчание каталога */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { roles as paletteRoles } from '../../tools/palette.mjs'
import { buttonRoles, resolver, tokenMap } from '../../tools/buttons.mjs'
import { variables, inputCss, resolve as resolveScale } from '../../tools/scale.mjs'
import { valid } from '../../lib/look-values.ts'
import { problems } from '../../lib/look-rule.ts'
import { compose } from '../ui/choice.mjs'

const ROOT = fileURLToPath(new URL('../..', import.meta.url))
const read = (dir, p) => JSON.parse(readFileSync(join(dir, p), 'utf8'))
/** Слить каталоги: первое имя побеждает — вариант сайта раньше варианта набора. */
const merge = (...lists) => {
  const out = {}
  for (const list of lists) for (const [k, v] of Object.entries(list)) if (!(k in out)) out[k] = v
  return out
}

/** Имена вариантов в панели — по-английски; ключ набора остаётся значением. */
const TITLES = {
  palette: {
    'Латунь на угле': 'Brass on charcoal', 'Аптека': 'Apothecary', 'Олива': 'Olive', 'Мек остров': 'Soft island',
    'Тёплый лист': 'Warm leaf', 'Ледяной шалфей': 'Icy sage', 'Аптечный синий': 'Pharmacy blue',
  },
  button: {
    'Пилюля': 'Pill', 'Строгий угол': 'Sharp corner', 'Мягкий тон': 'Soft tone', 'Контур': 'Outline', 'Заглавные': 'Capitals',
    'С тенью': 'Shadow', 'Тонкий люкс': 'Quiet luxury', 'Аптека': 'Pharmacy', 'Округлый': 'Rounded', 'Плотный': 'Dense',
  },
  scale: { 'Нынешний': 'Standard', 'Тесный': 'Compact', 'Просторный': 'Spacious', 'Тихий': 'Quiet' },
}

/** Шрифты-кандидаты: семейства и толщины, которые загрузит публикация
 *  (scripts/fonts.mjs — со своего адреса сайта), и стек для `--face`. */
export const FACES = [
  { id: 'system', name: 'System', body: null, head: null },
  { id: 'manrope', name: 'Manrope', body: { family: 'Manrope', weights: [400, 500, 600, 700] }, head: null },
  { id: 'plex', name: 'IBM Plex Sans', body: { family: 'IBM Plex Sans', weights: [400, 500, 600, 700] }, head: null },
  { id: 'inter', name: 'Inter', body: { family: 'Inter', weights: [400, 500, 600, 700] }, head: null },
  { id: 'serif', name: 'Source Serif + Plex', body: { family: 'IBM Plex Sans', weights: [400, 500, 600, 700] }, head: { family: 'Source Serif 4', weights: [600, 700], stack: "Georgia, 'Times New Roman', serif" } },
]
/** Отметка текущего пункта меню в строке полок шапки. */
export const MARKERS = [
  { id: 'underline', name: 'Underline', vars: { '--menu-mark-line': 'underline', '--menu-mark-fill': 'transparent', '--menu-mark-ink': 'var(--ink)', '--menu-mark-r': '0', '--menu-mark-pad': '0' } },
  { id: 'pill', name: 'Pill', vars: { '--menu-mark-line': 'none', '--menu-mark-fill': 'var(--quiet)', '--menu-mark-ink': 'var(--ink)', '--menu-mark-r': 'var(--r-ctrl)', '--menu-mark-pad': 'var(--sp-2)' } },
]
/** Шапки: id — HEADERS в lib/headers.ts. */
const HEADER_LINES = {
  classic: { name: 'Classic', line: 'Categories beside the logo' },
  search: { name: 'Search first', line: 'Promise bar, wide search, categories below' },
  boutique: { name: 'Boutique', line: 'Centred logo, a Shop panel with pictures' },
}

const faceVars = (f) => ({
  '--face': f.body ? `'${f.body.family}', var(--face-stack)` : 'var(--face-stack)',
  '--face-head': f.head ? `'${f.head.family}', ${f.head.stack}` : 'var(--face)',
})
const google = (f) => {
  const fams = [f.body, f.head].filter(Boolean)
  return fams.length ? `https://fonts.googleapis.com/css2?${fams.map((x) => `family=${x.family.replace(/ /g, '+')}:wght@${x.weights.join(';')}`).join('&')}&display=swap` : null
}
/** Шрифт кандидата как его увидит правило: семейства и толщины без файлов. */
const pseudoFonts = (fonts) => fonts.map((x) => ({ family: x.family, files: x.weights.map((w) => ({ url: '', weight: String(w), range: '' })) }))

/** Каталог: группы вариантов значениями, умолчания, пары. */
export function buildCatalog({ site, kit }) {
  const slotsFile = read(site, 'lib/look-slots.json')
  const { slots, facts } = slotsFile
  const tokens = tokenMap(readFileSync(join(site, 'styles/tokens.css'), 'utf8'))
  const palettes = merge(read(site, 'styles/palette.json'), read(kit, 'styles/palette.json'), read(kit, 'templates/palette.json'))
  const styles = merge(read(site, 'styles/buttons.json'), read(kit, 'styles/buttons.json'))
  const kitScales = read(kit, 'styles/scale.json')
  const roleSource = Object.values(kitScales)[0]?.текст
  const scales = merge(read(site, 'styles/scale.json'), kitScales)
  const headers = [...(readFileSync(join(site, 'lib/headers.ts'), 'utf8').match(/HEADERS = \[([\s\S]*?)\]/)?.[1] ?? '').matchAll(/'([a-z-]+)'/g)].map((m) => m[1])

  const check = (group, id, vars) => {
    for (const [k, v] of Object.entries(vars)) {
      if (!slots[k]) throw new Error(`${group} «${id}»: ${k} — не свойство сайта (lib/look-slots.json)`)
      if (!valid(slots[k].type, v)) throw new Error(`${group} «${id}»: ${k}: ${v} — не ${slots[k].type}`)
    }
    return vars
  }
  const dots = (set) => Object.fromEntries(['light', 'dark'].map((theme) => {
    const role = resolver(paletteRoles(set[theme], theme), tokens, theme)
    return [theme, ['--page', '--pop', '--ink'].map((r) => role(r))]
  }))
  const groups = {
    palette: Object.entries(palettes).map(([id, set]) => {
      const light = paletteRoles(set.light, 'light')
      const dark = paletteRoles(set.dark, 'dark')
      const vars = Object.fromEntries(Object.keys(light).map((k) => [k, `light-dark(${light[k]}, ${dark[k] ?? light[k]})`]))
      return { id, name: TITLES.palette[id] ?? id, seed: set, dots: dots(set), vars: check('palette', id, vars) }
    }),
    face: FACES.map((f) => ({ id: f.id, name: f.name, stack: faceVars(f)[f.head ? '--face-head' : '--face'], google: google(f), fonts: [f.body, f.head].filter(Boolean).map(({ family, weights }) => ({ family, weights })), vars: check('face', f.id, faceVars(f)) })),
    scale: Object.entries(scales).map(([id, raw]) => {
      const set = { ...raw, текст: raw.текст ?? roleSource }
      const coarse = new Set([...inputCss(set, 'x').matchAll(/(--[\w-]+):/g)].map((m) => m[1]))
      const vars = Object.fromEntries(Object.entries(variables(set)).filter(([k]) => !coarse.has(k)))
      const r = resolveScale(set)
      const line = `Text ${r.тело[0]}–${r.тело[1]} px · sections ${r.воздух.page.pair[0]}–${r.воздух.page.pair[1]} px apart · card corners ${set.радиус?.card ?? '—'} px`
      return { id, name: TITLES.scale[id] ?? id, line, vars: check('scale', id, vars) }
    }),
    button: Object.entries(styles).map(([id, s]) => ({ id, name: TITLES.button[id] ?? id, style: s, vars: check('button', id, buttonRoles(s)) })),
    marker: MARKERS.map((m) => ({ ...m, vars: check('marker', m.id, m.vars) })),
    header: headers.map((id) => ({ id, ...(HEADER_LINES[id] ?? { name: id, line: '' }) })),
  }
  const defaults = Object.fromEntries(Object.entries(groups).map(([g, list]) => [g, list[0].id]))

  /* Пары: правило сайта на значениях «умолчания сайта + вариант A + вариант B»;
     проверки правила парные, поэтому пара, найденная так, — ровно пара. */
  const base = Object.fromEntries(Object.entries(slots).map(([k, s]) => [k, s.value]))
  const pairs = []
  const valueGroups = ['palette', 'scale', 'face', 'button', 'marker']
  for (let i = 0; i < valueGroups.length; i++) {
    for (let j = i + 1; j < valueGroups.length; j++) {
      const [gx, gy] = [valueGroups[i], valueGroups[j]]
      for (const x of groups[gx]) {
        for (const y of groups[gy]) {
          const fonts = pseudoFonts([...(gx === 'face' ? x.fonts : []), ...(gy === 'face' ? y.fonts : [])])
          const hit = problems({ ...base, ...x.vars, ...y.vars }, fonts, facts).find((p) => p.groups.includes(gx) && p.groups.includes(gy))
          if (hit) pairs.push({ x: { field: gx, id: x.id }, y: { field: gy, id: y.id }, why: hit.why })
        }
      }
    }
  }
  return { about: 'Собран look-panel/scripts/build-catalog.mjs из каталога набора. Руками не правят.', defaults, groups, pairs }
}

/** Список пар для PANEL.md — между метками `pairs:start` и `pairs:end`. */
export function pairsMarkdown(catalog) {
  const name = (field, id) => catalog.groups[field].find((o) => o.id === id)?.name ?? id
  const lines = catalog.pairs.map((p) => `| ${p.x.field} · ${name(p.x.field, p.x.id)} | ${p.y.field} · ${name(p.y.field, p.y.id)} | ${p.why} |`)
  return ['| вариант | не носится с | почему |', '| --- | --- | --- |', ...lines].join('\n')
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const at = process.argv.indexOf('--from')
  const kit = at > 0 ? resolve(process.argv[at + 1]) : null
  if (!kit || !existsSync(join(kit, 'templates/palette.json'))) {
    console.error('✗ Нужна папка набора: --from <путь к SkillSiteBuilding> — полный каталог живёт там.')
    process.exit(1)
  }
  const catalog = buildCatalog({ site: ROOT, kit })
  writeFileSync(join(ROOT, 'look-panel/ui/catalog.json'), JSON.stringify(catalog, null, 1) + '\n')
  const md = join(ROOT, 'look-panel/PANEL.md')
  if (existsSync(md)) {
    const text = readFileSync(md, 'utf8')
    writeFileSync(md, text.replace(/(<!-- pairs:start -->\n)[\s\S]*?(\n<!-- pairs:end -->)/, `$1${pairsMarkdown(catalog)}$2`))
  }
  if (process.argv.includes('--look')) {
    const { look } = compose(catalog.defaults, catalog)
    writeFileSync(join(ROOT, 'lib/source/sample/look.json'), JSON.stringify(look, null, 2) + '\n')
  }
  const count = Object.fromEntries(Object.entries(catalog.groups).map(([g, l]) => [g, l.length]))
  console.log(`Каталог панели: ${Object.entries(count).map(([g, n]) => `${g} ${n}`).join(' · ')} · пар, которые не носятся: ${catalog.pairs.length}`)
}
