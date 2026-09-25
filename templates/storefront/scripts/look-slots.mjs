/* Стили вида и закрытый список свойств — из ОДНОГО источника (И270, И272).

   Вид сайта пишется рукой в одном месте — опубликованный вид источника
   данных (у образца lib/source/sample/look.json, у Payload — global «look»,
   план 4). Всё остальное о виде выпускается из него здесь, в сборке
   (`npm run build`) и при снятии панели вида, и руками
   не правится:

     1. стили — значения свойств вида в styles/palette.css, styles/buttons.css
        и styles/scale.css заменяются опубликованными, блоков чужих наборов
        (`[data-palette]`, `[data-button]`, `[data-scale]`) в них нет;
        шрифт, тени, отметка пункта меню, ручки товара (`--pdp-*` карты,
        кадр снимка `--shot-frame`, плотность полки `--shelf-cols`) и
        `@font-face` опубликованных шрифтов — в styles/look.css. Устройство файлов (имена, порядок, блок
        `@media (pointer:coarse)`) берётся из них самих: имена выпускают
        строители набора, значения — вид;
     2. закрытый список свойств — lib/look-slots.json: у каждого свойства
        род, группа и умолчание (то есть опубликованное значение), рядом —
        факты для правила сочетаний (роли из tokens.css, пороги набора,
        заголовки). Сервер страниц tools/ не ввозит (И267): что ему нужно
        от набора, выпускается здесь, самим Node.

   После сборки отгружаемые стили несут ровно опубликованный вид; между
   публикацией и следующей сборкой новое значение приходит блоком вида
   страницы и перекрывает прежнее. styles/palette.json, buttons.json и
   scale.json сайта — записи каталога (панель вида берёт их первыми), не
   источник стилей.

     node scripts/look-slots.mjs          выпустить
     node scripts/look-slots.mjs --check  сверить: стили и список не отстали от вида */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ROLES as BUTTON, tokenMap } from '../tools/buttons.mjs'
import { rolesOf } from '../tools/scale.mjs'
import { CONTRAST, STATE } from '../tools/thresholds.mjs'
import { acceptValues, lookCss, SHADOWS, FLOORS } from '../lib/look-values.ts'
import { settle } from '../lib/look-rule.ts'

const TO = 'lib/look-slots.json'
const PUBLISHED = 'lib/source/sample/look.json'
const FILES = { palette: 'styles/palette.css', buttons: 'styles/buttons.css', scale: 'styles/scale.css', look: 'styles/look.css' }

/** Род свойства отметки текущего пункта меню. */
const MARKER = { line: 'keyword', fill: 'colour', ink: 'colour', r: 'length', pad: 'length', side: 'number' }
/** Род свойства вида поля ввода (И390, styles/form.module.css): заливка,
 *  кромка и 1 / 0 — кромка вокруг или только черта снизу. */
const FIELD = { fill: 'colour', edge: 'colour', side: 'number', label: ['keyword', 'field-label'] }
/** Род свойства отмеченной галочки и радио (И392, styles/base.css). */
const TICK = { fill: 'colour' }
/** Ручки товара: карта (И278, «Admin → Product page») и полка (И400,
 *  «Admin → Card») — пропорция снимка одна на полку и карту, плотность —
 *  сколько карточек в ряд на полке каталога, место кнопки «в корзину» на
 *  карточке — во всю ширину или рядом с ценой. Каждое свойство — своя
 *  настройка панели, группа — имя свойства без `--`. Род и умолчание — на
 *  случай, когда styles/look.css сайта старше группы и их ещё не несёт;
 *  дальше значение приходит из опубликованного вида. */
export const PRODUCT = {
  '--pdp-gallery': { type: 'length', value: '50%' },
  '--pdp-thumbs': { type: 'keyword', value: 'below' },
  '--pdp-edge': { type: 'keyword', value: 'inset' },
  '--seg-look': { type: 'keyword', value: 'chips' },
  '--shot-frame': { type: 'number', value: '1 / 1' },
  '--shelf-cols': { type: 'number', value: '4' },
  '--card-buy': { type: 'keyword', value: 'full' },
  '--sort-label': { type: 'keyword', value: 'beside' },
}
/* Роли тени — по работе (И228): предмет в покое, подъём под рукой,
   всплывающее, вдавленное. Объявлены ОДИН раз — в styles/look.css, на
   списке полов `FLOORS` (lib/look-values.ts): основа набора их больше не
   объявляет (И385). */
/** Группа свойства из styles/scale.css: углы и холст выбираются отдельно от
 *  ритма (Shape и Layout панели) — ритм углов не меняет. */
const scaleGroup = (name) => (/^--r-(xs|ctrl|card|sheet)$/.test(name) ? 'corners' : name === '--wrap' ? 'width' : 'scale')

const bare = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '')
/** Границы первого блока `:root{…}` вне @media: [начало тела, конец тела]. */
function rootRange(css) {
  const at = css.search(/(^|\n):root\s*\{/)
  if (at < 0) return null
  const from = css.indexOf('{', at) + 1
  return [from, css.indexOf('}', from)]
}
/** Объявления первого блока `:root{…}` вне @media. */
function rootBlock(css) {
  const text = bare(css)
  const r = rootRange(text)
  if (!r) return {}
  return Object.fromEntries([...text.slice(r[0], r[1]).matchAll(/(--[\w-]+)\s*:\s*([^;]+);?/g)].map((m) => [m[1], m[2].trim()]))
}
/** Объявления блока ролей тени — того, чей селектор — список полов `FLOORS`. */
function floorBlock(css) {
  const text = bare(css)
  const at = text.indexOf(`${FLOORS}{`)
  if (at < 0) return {}
  const from = at + FLOORS.length + 1
  return Object.fromEntries([...text.slice(from, text.indexOf('}', from)).matchAll(/(--[\w-]+)\s*:\s*([^;]+);?/g)].map((m) => [m[1], m[2].trim()]))
}
/** Имена, переобъявленные внутри @media. */
const inMedia = (css) => new Set([...bare(css).matchAll(/@media[^{]*\{([^{}]*\{[^}]*\})/g)].flatMap((m) => [...m[1].matchAll(/(--[\w-]+)\s*:/g)].map((x) => x[1])))

/** Список свойств и факты — из текстов стилей и чисел набора. Шрифт, тени и
 *  отметка — из styles/look.css (у набора он лежит рукой, у витрины
 *  выпущен); отметка, пока файла нет, — из прежнего места
 *  (styles/storefront.css). Шрифта и теней основа не объявляет (И385). */
export function lookSlots({ palette, buttons, scale, tokens, storefront, look, scales }) {
  const slots = {}
  const put = (name, type, group, value) => { slots[name] = { type, group, value } }
  for (const [k, v] of Object.entries(rootBlock(palette))) put(k, 'colour', 'palette', v)
  for (const [k, v] of Object.entries(rootBlock(buttons))) {
    /* Род роли кнопки — из каталога набора (tools/buttons.mjs, ROLES). */
    const type = BUTTON[k]
    if (!type) throw new Error(`${k}: роль кнопки неизвестна каталогу набора (tools/buttons.mjs, ROLES)`)
    put(k, type, 'button', v)
  }
  const coarse = inMedia(scale)
  for (const [k, v] of Object.entries(rootBlock(scale))) if (!coarse.has(k)) put(k, /^-?[\d.]+$/.test(v) ? 'number' : 'length', scaleGroup(k), v)
  const map = tokenMap(tokens)
  const own = look ? { ...rootBlock(look), ...floorBlock(look) } : {}
  for (const [keys, type, group] of [[['--face', '--face-head'], 'font', 'face'], [SHADOWS, 'shadow', 'shadow']]) {
    for (const k of keys) {
      if (!own[k]) throw new Error(`${k}: его не объявляет styles/look.css — шрифт и тени сайта живут там (И385)`)
      put(k, type, group, own[k])
    }
  }
  const marks = look ? own : rootBlock(storefront)
  for (const [k, v] of Object.entries(marks)) {
    if (!k.startsWith('--menu-mark-')) continue
    const type = MARKER[k.replace(/^--menu-mark-/, '')]
    if (!type) throw new Error(`${k}: род свойства отметки неизвестен — дописать в MARKER (scripts/look-slots.mjs)`)
    put(k, type, 'marker', v)
  }
  for (const [prefix, kinds, group, table] of [['--ctrl-field-', FIELD, 'field', 'FIELD'], ['--ctrl-tick-', TICK, 'tick', 'TICK']]) {
    for (const [k, v] of Object.entries(own)) {
      if (!k.startsWith(prefix)) continue
      /* Род — строкой; место подписи поля — [род, своя группа]: выбирается
         отдельно от одежды поля (И394). */
      const kind = kinds[k.slice(prefix.length)]
      if (!kind) throw new Error(`${k}: род свойства неизвестен — дописать в ${table} (scripts/look-slots.mjs)`)
      const [type, own] = Array.isArray(kind) ? kind : [kind, group]
      put(k, type, own, v)
    }
  }
  for (const [k, { type, value }] of Object.entries(PRODUCT)) put(k, type, k.slice(2), own[k] ?? value)
  /* Роли, на которых правило мерит кнопку, отметку и поле: замыкание ссылок от
     полов и ролей кнопки до ступеней палитры (они — свойства вида). Роли
     вариантов панели, которых нет в умолчаниях, — списком: подпись и тихая
     плашка (кромка и заливка поля, И390). */
  const refs = (v) => [...String(v).matchAll(/var\((--[\w-]+)\)/g)].map((m) => m[1])
  const queue = ['--page', '--plate', '--surface', '--ink', '--ink-soft', '--plate-quiet', '--quiet', '--pop', '--on-pop', '--pop-ink', '--rule',
    ...Object.values(slots).filter((s) => ['button', 'marker', 'field', 'tick', 'shadow'].includes(s.group)).flatMap((s) => refs(s.value))]
  const roles = {}
  while (queue.length) {
    const name = queue.shift()
    if (slots[name] || roles[name] || !map[name]) continue
    roles[name] = map[name]
    queue.push(...refs(map[name]))
  }
  const first = Object.keys(scales)[0]
  const headings = Object.entries(rolesOf(scales, first)).filter(([, r]) => r.род === 'заголовок').map(([role]) => role)
  return { slots, facts: { roles, need: { text: CONTRAST.text, control: CONTRAST.control, visible: STATE.visible }, headings } }
}

const HEAD = (what) => `/* Выпущен scripts/look-slots.mjs из опубликованного вида (${PUBLISHED};\n   у Payload — global «look»). Руками не правят: ${what}. */\n\n`

/** Значения в первом блоке `:root{…}`: имя сохраняет место и подпись,
 *  значение — опубликованное. */
function substitute(css, values) {
  const r = rootRange(css)
  if (!r) return css
  const body = css.slice(r[0], r[1]).replace(/(--[\w-]+)(\s*:\s*)([^;]+)(;)/g, (m, name, sep, _v, end) => (Object.hasOwn(values, name) ? `${name}${sep}${values[name]}${end}` : m))
  return css.slice(0, r[0]) + body + css.slice(r[1])
}
/** Файл от первого `:root{` до первого блока чужого набора. */
const ownPart = (css, attr) => {
  const at = css.search(/(^|\n):root\s*\{/)
  const cut = css.indexOf(`\n[data-${attr}=`)
  return css.slice(at < 0 ? 0 : at, cut < 0 ? css.length : cut).replace(/^\n/, '').replace(/\s*$/, '\n')
}

/** Опубликованный вид → тексты стилей вида и список свойств. `notes` —
 *  чего вид не дал или что не прошло проверку: там остаётся прежнее. */
export function lookStyles(site, raw) {
  const before = lookSlots(site)
  const { look, dropped } = acceptValues(raw, before.slots)
  const kept = settle(look.vars, look.fonts, before.slots, before.facts)
  const values = kept.vars
  const missing = raw ? Object.keys(before.slots).filter((k) => !Object.hasOwn(values, k)) : []
  const notes = [...dropped.map((d) => `${d.what} ${d.why}`), ...kept.fell.map((f) => `${f.group} ${f.why}`),
    ...(missing.length ? [`вид не дал значения ${missing.length} свойствам (${missing.slice(0, 4).join(', ')}${missing.length > 4 ? ' …' : ''}) — остались прежние; вид старше каталога — пересчитать из имён (И352)`] : [])]
  const decls = (group) => Object.entries(before.slots).filter(([, s]) => s.group === group)
    .map(([k, s]) => `  ${k}: ${values[k] ?? s.value};`).join('\n')
  const out = {
    palette: `${HEAD('краски обеих тем — ступени и линии')}:root{\n  color-scheme: light dark;\n${decls('palette')}\n}\n`,
    buttons: `${HEAD('роли одной кнопки основы (styles/btn.module.css)')}:root{\n${decls('button')}\n}\n`,
    scale: HEAD('ступени кегля и ритма, поле, воздух, зазор, холст и углы; под пальцем — свои высоты органов') + substitute(ownPart(site.scale, 'scale'), values),
    /* Роли тени — своим блоком на списке полов (И385): на палубе и листе
       геометрия вида пересчитывается из их ингредиентов. */
    look: `${HEAD('шрифт, тени, отметка текущего пункта меню, вид поля ввода и галочки, ручки карты товара и полки и шрифты вида со своего адреса')}:root{\n${['face', 'marker', 'field', 'field-label', 'tick', ...Object.keys(PRODUCT).map((k) => k.slice(2))].map(decls).join('\n')}\n}\n` +
      `${FLOORS}{\n${decls('shadow')}\n}\n` +
      (kept.fonts.length ? `\n${lookCss({ header: look.header, vars: {}, fonts: kept.fonts, names: {} })}\n` : ''),
  }
  const after = lookSlots({ ...site, ...out })
  return { files: out, slots: after, notes }
}

const HEADER = 'Собран scripts/look-slots.mjs из стилей сайта (они — из опубликованного вида) и порогов набора. Руками не правят.'
export const render = (data) => JSON.stringify({ about: HEADER, ...data }, null, 2) + '\n'

/** Тексты стилей сайта и опубликованный вид с диска. */
export function readSite(root = '.') {
  const at = (p) => readFileSync(resolve(root, p), 'utf8')
  const maybe = (p) => (existsSync(resolve(root, p)) ? at(p) : null)
  return {
    palette: at(FILES.palette), buttons: at(FILES.buttons), scale: at(FILES.scale), look: maybe(FILES.look),
    tokens: at('styles/tokens.css'), storefront: at('styles/storefront.css'), scales: JSON.parse(at('styles/scale.json')),
  }
}
export const readPublished = (root = '.') => (existsSync(resolve(root, PUBLISHED)) ? JSON.parse(readFileSync(resolve(root, PUBLISHED), 'utf8')) : null)

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { files, slots, notes } = lookStyles(readSite(), readPublished())
  const texts = { ...Object.fromEntries(Object.entries(files).map(([k, v]) => [FILES[k], v])), [TO]: render(slots) }
  for (const n of notes) console.warn(`· вид: ${n}`)
  if (process.argv.includes('--check')) {
    const behind = Object.entries(texts).filter(([p, text]) => (existsSync(p) ? readFileSync(p, 'utf8').replace(/\r\n/g, '\n') : '') !== text).map(([p]) => p)
    if (!behind.length) { console.log(`Стили вида и список свойств не отстали от опубликованного вида: ${Object.keys(slots.slots).length} свойств`); process.exit(0) }
    console.error(`✗ Отстали от опубликованного вида: ${behind.join(', ')}. Выпустить: node scripts/look-slots.mjs (идёт в npm run build)`)
    process.exit(1)
  }
  for (const [p, text] of Object.entries(texts)) writeFileSync(p, text)
  console.log(`Выпущено из опубликованного вида: ${Object.values(FILES).join(', ')}, ${TO} · свойств вида: ${Object.keys(slots.slots).length}`)
}
