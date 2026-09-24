/* Каталог панели вида — look-panel/ui/catalog.json (PANEL.md, шаг 1).

   Все варианты, из которых выбирают, живут у панели, а не в сайте
   (CLAUDE.md, «Панель настройки физически отделена от сайта»). Каталог
   собирается из полного каталога НАБОРА — палитры (styles/palette.json и
   образцы templates/palette.json), стили кнопок (styles/buttons.json),
   наборы ритма (styles/scale.json) — строителями набора, которые уже лежат
   в сайте (tools/): каждый вариант — готовые значения тех же свойств, что
   сайт объявляет у себя (lib/look-slots.json). Варианты самого сайта идут
   первыми — это умолчания каталога. Шрифты-кандидаты, отметка пункта меню
   и ручки карты товара — здесь же, данными.

   Пары, которые не носятся, считает правило сайта (lib/look-rule.ts) на
   каждой паре вариантов двух групп — панель гасит по ним, сайт судит тем
   же правилом. Список пар ложится и в PANEL.md.

   Строитель палитры панели считает движком набора: сборка кладёт его копию
   в ui/engine/ из skills/site-building/assets/studio/engine набора — ту же,
   что выпускает `npm run studio:sync`; краски наборов в каталоге посчитаны
   этой копией.

   Каталог собран — опубликованный вид сайта пересчитывается из своих имён
   этим каталогом (И352, `reresolvePublished`): каталог или движок вырос —
   значения выводятся заново из выбора заказчика, а не берутся умолчаниями
   стилей другой палитры.

     node look-panel/scripts/build-catalog.mjs --from ../SkillSiteBuilding
       --from   папка набора: откуда брать полный каталог (ставщик передаёт сам)
       --look   записать опубликованный вид образца = умолчание каталога
                (новая установка; без ключа вид пересчитывается из имён) */
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { axesOf, resolver, tokenMap } from '../../tools/buttons.mjs'
import { variables, inputCss, resolve as resolveScale } from '../../tools/scale.mjs'
import { valid, FLOORS, SHADOWS } from '../../lib/look-values.ts'
import { problems } from '../../lib/look-rule.ts'
import { pairsOf } from './pairs.mjs'

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
  scale: { 'Нынешний': 'Standard', 'Тесный': 'Compact', 'Просторный': 'Spacious', 'Тихий': 'Quiet' },
}

/** Движок набора: файлы и откуда (И247: одна математика для панели, сайта и проверок). */
export const ENGINE = ['palette.mjs', 'thresholds.mjs', 'palette-profile.json']
export const ENGINE_FROM = 'skills/site-building/assets/studio/engine'
/** Положить копию движка набора в ui/engine/. */
export function copyEngine(kit, site) {
  mkdirSync(join(site, 'look-panel/ui/engine'), { recursive: true })
  for (const f of ENGINE) copyFileSync(join(kit, ENGINE_FROM, f), join(site, 'look-panel/ui/engine', f))
}

/** Холст — ширина коробки страницы (`--wrap`): опубликованная норма
 *  1140–1440, у Shopify 1000–1600; заказчик выбрал 1440 (24.09.2026). */
export const WIDTHS = [1440, 1280, 1600]
/** Наборы углов — из лестницы набора (M3 ∪ Carbon, SHAPE.radii), взятые из
 *  наборов ритма; вложенность «орган ≤ карточка ≤ лист» держит каждый. */
const CORNER_NAMES = { '4/4/12/16': 'Crisp', '8/8/24/28': 'Standard', '8/8/28/32': 'Round' }
/** Тени — роли по работе (И228). Soft — роли основы набора (его
 *  styles/look.css: у сайта этот файл выпущен из опубликованного вида, и
 *  «Soft» из него значил бы «как сейчас», И385); Flat — без тени, одной
 *  линией (всплывающее тень оставляет); Lifted — на ступень выше: покой
 *  берёт подъём, подъём — всплывающее. */
/* `was` у «Soft» — его значения до И385: вдавленная тень брала краску бумаги
   (`--sh-inset-paper`) прямо, а не ингредиент пола (`--sh-inset`). Вид,
   опубликованный на умолчании без имени группы, узнаётся по ним и
   пересчитывается (`reresolve`, ui/choice.mjs). Псевдоним со сроком: снять,
   когда опубликованные виды пересчитаны (план 4, global «look»). */
const SHADOW_SETS = (t) => [
  { id: 'soft', name: 'Soft', line: 'The kit shadow roles: a quiet lift at rest, more under the hand', vars: { '--sh-raised': t['--sh-raised'], '--sh-lift': t['--sh-lift'], '--sh-overlay': t['--sh-overlay'], '--sh-in': t['--sh-in'] }, was: [{ '--sh-raised': t['--sh-raised'], '--sh-lift': t['--sh-lift'], '--sh-overlay': t['--sh-overlay'], '--sh-in': 'inset 0 1px 2px var(--sh-inset-paper)' }] },
  { id: 'flat', name: 'Flat', line: 'No shadow: a hairline marks the card; only overlays keep a shadow', vars: { '--sh-raised': '0 0 0 1px var(--rule)', '--sh-lift': '0 0 0 1px var(--rule)', '--sh-overlay': t['--sh-overlay'], '--sh-in': 'inset 0 0 0 1px var(--rule)' } },
  { id: 'lifted', name: 'Lifted', line: 'One step higher: cards rest lifted, hover rises further', vars: { '--sh-raised': t['--sh-lift'], '--sh-lift': t['--sh-overlay'], '--sh-overlay': t['--sh-overlay'], '--sh-in': t['--sh-in'] } },
]
/** Роли, по которым панель мерит свою палитру, — какими ступенями палитры
 *  сайт их красит в каждой теме (цепочки ссылок tokens.css). */
const STEP_ROLES = { page: '--page', plate: '--plate', ink: '--ink', inkSoft: '--ink-soft', pop: '--pop', onPop: '--on-pop' }

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
  { id: 'underline', name: 'Underline', vars: { '--menu-mark-line': 'underline', '--menu-mark-fill': 'transparent', '--menu-mark-ink': 'var(--ink)', '--menu-mark-r': '0', '--menu-mark-pad': '0', '--menu-mark-side': '0' } },
  { id: 'pill', name: 'Pill', vars: { '--menu-mark-line': 'none', '--menu-mark-fill': 'var(--quiet)', '--menu-mark-ink': 'var(--ink)', '--menu-mark-r': 'var(--r-ctrl)', '--menu-mark-pad': 'var(--sp-2)', '--menu-mark-side': '0' } },
  /* Плашка чернил, слово краской пола — выбранная вкладка элементов 51 и 65
     (elements/, И356). Обе роли правило сочетаний мерит. */
  { id: 'ink', name: 'Ink pill', vars: { '--menu-mark-line': 'none', '--menu-mark-fill': 'var(--ink)', '--menu-mark-ink': 'var(--surface)', '--menu-mark-r': 'var(--r-ctrl)', '--menu-mark-pad': 'var(--sp-2)', '--menu-mark-side': '0' } },
  /* Тон и черта марки у начала строки — текущий пункт меню кабинета,
     элемент 52 (И393); черта краской марки для текста: 3 : 1 к тону. */
  { id: 'side', name: 'Side bar', vars: { '--menu-mark-line': 'none', '--menu-mark-fill': 'var(--quiet)', '--menu-mark-ink': 'var(--ink)', '--menu-mark-r': 'var(--r-ctrl)', '--menu-mark-pad': 'var(--sp-2)', '--menu-mark-side': '1' } },
]
/** Вид поля ввода (И390): одно поле на весь сайт — поиск в шапке, почта,
 *  касса (styles/form.module.css, `.box`). Кромка остаётся у каждого вида:
 *  без неё поле на листе не видно (WCAG 1.4.11) — у тона она чертой снизу.
 *  Угол — из Shape. Пилюля (элемент 44) сюда не идёт: полный круг — только у
 *  главного действия (CLAUDE.md, запрет 2, И228). */
export const FIELD_LOOKS = [
  { id: 'framed', name: 'Framed', line: 'A light fill inside a full edge', vars: { '--ctrl-field-fill': 'var(--field)', '--ctrl-field-edge': 'var(--tick-edge)', '--ctrl-field-side': '1' } },
  /* Кромка контура и черта тона — краской подписи: краска рамки
     (`--tick-edge`) замерена строителем к заливке поля, на поверхности
     тёмной темы она 2.75 : 1, на тоне — 2.5; подпись держит 5 : 1 на всех
     наборах. Тон — тихая плашка, а не вуаль: на вуали поверх пола страницы
     подсказка в поле 3.9 : 1 (замер 25.09.2026, все образцы). */
  { id: 'outline', name: 'Outline', line: 'The card surface inside a darker full edge (element 43)', vars: { '--ctrl-field-fill': 'var(--surface)', '--ctrl-field-edge': 'var(--ink-soft)', '--ctrl-field-side': '1' } },
  { id: 'tone', name: 'Tone', line: 'A tone fill with one line underneath, no box (element 41)', vars: { '--ctrl-field-fill': 'var(--plate-quiet)', '--ctrl-field-edge': 'var(--ink-soft)', '--ctrl-field-side': '0' } },
]
/** Место подписи поля (И394): над полем или на кромке (элемент 47) —
 *  внутри, пока поле пусто, на верхней кромке, когда в него пишут. Краски
 *  подписи — роли поля, их мерит правило поля. */
export const FIELD_LABELS = [
  { id: 'above', name: 'Above', line: 'The label above the field', vars: { '--ctrl-field-label': 'above' } },
  { id: 'edge', name: 'On the edge', line: 'Inside while empty, on the top edge once you type (element 47)', vars: { '--ctrl-field-label': 'edge' } },
]
/** Краска отмеченной галочки и радио (И392): одна на весь сайт — фильтры
 *  полки, касса, формы (styles/base.css, `accent-color`). Сами органы
 *  браузерные; галку на заливке браузер красит под контраст. Марка — краской
 *  марки для текста: заливка марки на пяти образцах из семи тонет в полу
 *  (до 2.21 : 1), а квадрат опознаётся только заливкой (замер 25.09.2026). */
export const TICKS = [
  { id: 'brand', name: 'Brand', line: 'Ticked boxes and radios in the brand colour', vars: { '--ctrl-tick-fill': 'var(--pop-ink)' } },
  { id: 'ink', name: 'Ink', line: 'Ticked boxes and radios in ink (element 60)', vars: { '--ctrl-tick-fill': 'var(--ink)' } },
]
/** Карточки товара: id — CARDS в lib/cards.ts. Каждая — простая карточка
 *  полки (shop: «Полная полка на десктопе держит 4–5 простых карточек по
 *  260–325px»), вариант — одежда одной раскладки (craft: «Вид меняет
 *  поверхность, краску, поле; раскладку внутри он НЕ меняет»). */
const CARD_LINES = {
  framed: { name: 'Framed', line: 'Own surface with a shadow: the card sits above the page' },
  bare: { name: 'Bare', line: 'No box: the picture with its own corners on the page, text below' },
  outlined: { name: 'Outlined', line: 'A hairline instead of a shadow; the picture sits inside the card field' },
  toned: { name: 'Toned', line: 'The picture to the edges, the details on a tone field right under it; no line, no shadow' },
  tinted: { name: 'Tinted', line: 'The whole card in the brand tint, with the sheet corner; no line, no shadow' },
}
/** Полка (И400, «Admin → Card»): пропорция снимка — одна на полку и карту
 *  товара, снимки у товара одни; плотность — сколько карточек в ряд на
 *  полке каталога и поиска (shop: «4–5 простых карточек по 260–325px»),
 *  меньше на узком окне считает сетка; кнопка «в корзину» — во всю ширину
 *  или рядом с ценой (элемент 64 набора). Варианты — значения ручек, которые
 *  сайт объявляет у себя (scripts/look-slots.mjs, PRODUCT). Пропорция —
 *  дробью 'a / b': из неё же карта считает высоту галереи. */
export const SHELF = {
  'shot-frame': [
    { id: 'square', name: '1:1', line: 'Square pictures, on shelves and on the product page', vars: { '--shot-frame': '1 / 1' } },
    { id: 'wide', name: '4:3', line: 'Landscape pictures: shorter cards, more rows on a screen', vars: { '--shot-frame': '4 / 3' } },
    { id: 'portrait', name: '4:5', line: 'Upright pictures, 4 : 5 — taller bottles and boxes', vars: { '--shot-frame': '4 / 5' } },
    { id: 'tall', name: '3:4', line: 'Tall pictures, 3 : 4 — the product stands the whole height', vars: { '--shot-frame': '3 / 4' } },
  ],
  'card-buy': [
    { id: 'full', name: 'Full width', line: 'The cart button under the price, the whole width of the card', vars: { '--card-buy': 'full' } },
    { id: 'beside', name: 'Beside the price', line: 'A smaller cart button at the end of the price row; it moves under the price when the card is narrow', vars: { '--card-buy': 'beside' } },
  ],
  'shelf-cols': [
    { id: '4', name: '4 in a row', line: 'Four cards in a row on a wide screen: larger pictures', vars: { '--shelf-cols': '4' } },
    { id: '5', name: '5 in a row', line: 'Five cards in a row on a wide screen: more products at a glance', vars: { '--shelf-cols': '5' } },
  ],
}
/** Карта товара (И278): варианты — значения ручек `--pdp-*`, которые сайт
 *  объявляет у себя (scripts/look-slots.mjs, PRODUCT). Доля ряда под
 *  галерею — вокруг нормы живых магазинов 45–57 % (образец заказчика ≈ 40 %);
 *  выше экрана галерею не вытянет ни одна: потолок по высоте окна у неё
 *  свой. Миниатюры — ряд под кадром, полоса сбоку (в две колонки) или точки.
 *  Пропорция снимка — одна с полкой (SHELF выше, И400). */
export const PRODUCT_PAGE = {
  'pdp-gallery': [40, 50, 60].map((pct) => ({ id: String(pct), name: `${pct} %`, line: `The gallery takes ${pct} % of the row; the buy column takes the rest`, vars: { '--pdp-gallery': `${pct}%` } })),
  'pdp-thumbs': [
    { id: 'below', name: 'Below', line: 'A row of four thumbnails under the picture', vars: { '--pdp-thumbs': 'below' } },
    { id: 'side', name: 'Side', line: 'A strip of thumbnails beside the picture, on wide screens', vars: { '--pdp-thumbs': 'side' } },
    { id: 'dots', name: 'Dots', line: 'Dots under the picture instead of thumbnails', vars: { '--pdp-thumbs': 'dots' } },
    { id: 'over', name: 'On the picture', line: 'No thumbnails: swipe the picture, dots lie on it', vars: { '--pdp-thumbs': 'over' } },
  ],
  'pdp-edge': [
    { id: 'inset', name: 'Within the margins', line: 'The picture keeps the page margins and rounded corners', vars: { '--pdp-edge': 'inset' } },
    { id: 'bleed', name: 'Full width', line: 'On phones the picture runs edge to edge; with dots on the picture the details slide over it', vars: { '--pdp-edge': 'bleed' } },
  ],
}
/** Главные: id — HOMES в lib/homes.ts (docs/design/home.md). `plan` —
 *  первый экран схемой для образца панели, сверху вниз: из чего он сложен
 *  (look.js рисует полосы — сцену, заголовок, фишки, ряд, лист, ящики,
 *  снимок). Строка — как вариант ощущается, словами заказчика. */
const HOME_LINES = {
  scene: { name: 'Scene', line: 'A dark photo scene first, then shelves, best sellers and the lab sheet', plan: ['scene', 'tiles', 'row'] },
  counter: { name: 'Shop first', line: 'The promise in one line, every shelf and the best sellers on the first screen', plan: ['title', 'chips', 'row'] },
  proof: { name: 'Lab report first', line: 'The batch report opens the page: the batch number is the largest thing on it', plan: ['title', 'sheet', 'row'] },
  journal: { name: 'Headline first', line: 'The promise set large across the page, a wide photo under it, shelves as an index', plan: ['headline', 'photo', 'index'] },
  cabinet: { name: 'Cabinet', line: 'A calm centred heading, shelves as apothecary drawers, a photo as a pause', plan: ['calm', 'drawers', 'row'] },
}
/** Шапки: id — HEADERS в lib/headers.ts. */
const HEADER_LINES = {
  classic: { name: 'Classic', line: 'Categories beside the logo' },
  search: { name: 'Search first', line: 'Promise bar, wide search, categories below' },
  boutique: { name: 'Boutique', line: 'Centred logo, the shelves in a row under it' },
}

const faceVars = (f) => ({
  '--face': f.body ? `'${f.body.family}', var(--face-stack)` : 'var(--face-stack)',
  '--face-head': f.head ? `'${f.head.family}', ${f.head.stack}` : 'var(--face)',
})
const google = (f) => {
  const fams = [f.body, f.head].filter(Boolean)
  return fams.length ? `https://fonts.googleapis.com/css2?${fams.map((x) => `family=${x.family.replace(/ /g, '+')}:wght@${x.weights.join(';')}`).join('&')}&display=swap` : null
}

/** Ступень палитры, которой роль красит тему: по ссылкам `var()` и
 *  `light-dark()` до свойства палитры сайта. */
function stepOf(tokens, palette, name, theme, depth = 0) {
  if (palette.has(name)) return name
  const v = tokens[name]?.trim()
  if (!v || depth > 12) return null
  const ref = v.match(/^var\((--[\w-]+)\)$/)
  if (ref) return stepOf(tokens, palette, ref[1], theme, depth + 1)
  const ld = v.match(/^light-dark\(\s*var\((--[\w-]+)\)\s*,\s*var\((--[\w-]+)\)\s*\)$/)
  return ld ? stepOf(tokens, palette, theme === 'light' ? ld[1] : ld[2], theme, depth + 1) : null
}

/** Каталог: группы вариантов значениями, умолчания, пары. */
export async function buildCatalog({ site, kit }) {
  copyEngine(kit, site)
  const { paletteVars, valuesOf } = await import(pathToFileURL(join(site, 'look-panel/ui/choice.mjs')).href)
  const { roles: paletteRoles } = await import(pathToFileURL(join(site, 'look-panel/ui/engine/palette.mjs')).href)
  const slotsFile = read(site, 'lib/look-slots.json')
  const { slots, facts } = slotsFile
  const tokens = tokenMap(readFileSync(join(site, 'styles/tokens.css'), 'utf8'))
  const palettes = merge(read(site, 'styles/palette.json'), read(kit, 'styles/palette.json'), read(kit, 'templates/palette.json'))
  /* Кнопка — оси каталога (И273): варианты сайта первыми, затем набора. */
  const buttonAxes = []
  for (const cat of [read(site, 'styles/buttons.json'), read(kit, 'styles/buttons.json')]) {
    for (const a of axesOf(cat).filter((x) => x.options.length)) {
      const into = buttonAxes.find((x) => x.id === a.id) ?? buttonAxes[buttonAxes.push({ ...a, options: [] }) - 1]
      for (const o of a.options) if (o.роли && !into.options.some((x) => x.id === o.id)) into.options.push(o)
    }
  }
  const kitScales = read(kit, 'styles/scale.json')
  const roleSource = Object.values(kitScales)[0]?.текст
  const scales = merge(read(site, 'styles/scale.json'), kitScales)
  const list = (file, name) => [...(readFileSync(join(site, file), 'utf8').match(new RegExp(`${name} = \\[([\\s\\S]*?)\\]`))?.[1] ?? '').matchAll(/'([a-z-]+)'/g)].map((m) => m[1])
  const headers = list('lib/headers.ts', 'HEADERS')
  const cards = list('lib/cards.ts', 'CARDS')
  const homes = list('lib/homes.ts', 'HOMES')
  const ofGroup = (group, vars) => Object.fromEntries(Object.entries(vars).filter(([k]) => slots[k]?.group === group))
  /** Вариант сайта — первым: он умолчание каталога. */
  const siteFirst = (list) => {
    const own = list.find((o) => Object.entries(o.vars).every(([k, v]) => slots[k]?.value === v))
    return own ? [own, ...list.filter((o) => o !== own)] : list
  }

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
    palette: Object.entries(palettes).map(([id, set]) => ({ id, name: TITLES.palette[id] ?? id, seed: set, dots: dots(set), vars: check('palette', id, paletteVars(set)) })),
    face: FACES.map((f) => ({ id: f.id, name: f.name, stack: faceVars(f)[f.head ? '--face-head' : '--face'], google: google(f), fonts: [f.body, f.head].filter(Boolean).map(({ family, weights }) => ({ family, weights })), vars: check('face', f.id, faceVars(f)) })),
    scale: Object.entries(scales).map(([id, raw]) => {
      const set = { ...raw, текст: raw.текст ?? roleSource }
      const coarse = new Set([...inputCss(set, 'x').matchAll(/(--[\w-]+):/g)].map((m) => m[1]))
      const vars = ofGroup('scale', Object.fromEntries(Object.entries(variables(set)).filter(([k]) => !coarse.has(k))))
      const r = resolveScale(set)
      const line = `Text ${r.тело[0]}–${r.тело[1]} px · sections ${r.воздух.page.pair[0]}–${r.воздух.page.pair[1]} px apart`
      return { id, name: TITLES.scale[id] ?? id, line, vars: check('scale', id, vars) }
    }),
    width: siteFirst(WIDTHS.map((w) => ({ id: String(w), name: String(w), line: `Canvas ${w} px wide`, vars: check('width', String(w), { '--wrap': `${w}px` }) }))),
    corners: siteFirst(Object.values(Object.fromEntries(Object.values(scales).map((set) => {
      const key = ['xs', 'ctrl', 'card', 'sheet'].map((k) => set.радиус?.[k]).join('/')
      const name = CORNER_NAMES[key] ?? key
      return [key, { id: name.toLowerCase(), name, line: `Controls ${set.радиус?.ctrl} px · cards ${set.радиус?.card} px · sheets ${set.радиус?.sheet} px`, vars: check('corners', key, ofGroup('corners', variables(set))) }]
    })))),
    shadow: siteFirst(SHADOW_SETS(tokenMap(readFileSync(join(kit, 'styles/look.css'), 'utf8'))).map((o) => ({ ...o, vars: check('shadow', o.id, o.vars) }))),
    ...Object.fromEntries(buttonAxes.map((a) => [`btn-${a.id}`, siteFirst(a.options.map((o) => ({ id: o.id, name: o.name, line: o.line ?? '', vars: check(`btn-${a.id}`, o.id, ofGroup('button', o.роли)) })))])),
    marker: MARKERS.map((m) => ({ ...m, vars: check('marker', m.id, m.vars) })),
    field: siteFirst(FIELD_LOOKS.map((o) => ({ ...o, vars: check('field', o.id, o.vars) }))),
    'field-label': siteFirst(FIELD_LABELS.map((o) => ({ ...o, vars: check('field-label', o.id, o.vars) }))),
    tick: siteFirst(TICKS.map((o) => ({ ...o, vars: check('tick', o.id, o.vars) }))),
    ...Object.fromEntries(Object.entries({ ...SHELF, ...PRODUCT_PAGE }).map(([field, list]) => [field, siteFirst(list.map((o) => ({ ...o, vars: check(field, o.id, o.vars) })))])),
    header: headers.map((id) => ({ id, ...(HEADER_LINES[id] ?? { name: id, line: '' }) })),
    card: cards.map((id) => ({ id, ...(CARD_LINES[id] ?? { name: id, line: '' }) })),
    home: homes.map((id) => ({ id, ...(HOME_LINES[id] ?? { name: id, line: '', plan: [] }) })),
  }
  const defaults = Object.fromEntries(Object.entries(groups).map(([g, list]) => [g, list[0].id]))

  /* Пары: правило сайта на значениях «умолчания сайта + вариант A + вариант B». */
  const base = Object.fromEntries(Object.entries(slots).map(([k, s]) => [k, s.value]))
  const axes = buttonAxes.map((a) => ({ field: `btn-${a.id}`, name: a.name }))
  const pairs = pairsOf({ groups, fields: valuesOf({ axes }), base, facts, problems })
  /* Ступени, которыми сайт красит страницу, — для замера своей палитры. */
  const own = new Set(Object.keys(slots).filter((k) => slots[k].group === 'palette'))
  const steps = Object.fromEntries(Object.entries(STEP_ROLES).map(([role, name]) => [role, Object.fromEntries(['light', 'dark'].map((t) => [t, stepOf(tokens, own, name, t)]))]))
  for (const [role, v] of Object.entries(steps)) for (const t of ['light', 'dark']) if (!v[t]) throw new Error(`роль ${STEP_ROLES[role]}: ступень палитры в теме ${t} не найдена (styles/tokens.css)`)
  /* Предпросмотр панели кладёт роли тени туда же, куда сайт, — на список
     полов (lib/look-values.ts, И385), а не на один корень. */
  const floors = { selector: FLOORS, names: [...SHADOWS] }
  return { about: 'Собран look-panel/scripts/build-catalog.mjs из каталога набора. Руками не правят.', defaults, groups, axes, pairs, steps, floors }
}

/** Опубликованный вид и его копия до первого пересчёта — рядом. */
export const PUBLISHED = 'lib/source/sample/look.json'
export const BEFORE = 'lib/source/sample/look.before-refresh.json'

/** Опубликованный вид — заново из его имён нынешним каталогом и движком
 *  (И352; ui/choice.mjs, `reresolve`). Идёт со сборкой каталога — при
 *  установке, переустановке, возврате панели и `npm run look:catalog`, — а не
 *  на запросе страницы. Имена не трогаются; файл пишется, только если
 *  значения изменились; прежний — копией рядом при первой перемене (копию
 *  следующий пересчёт не затирает: в ней вид, каким его опубликовал
 *  заказчик). Черновик не трогается — он пересчитается первым же щелчком в
 *  панели. */
export async function reresolvePublished(site, catalog) {
  const file = join(site, PUBLISHED)
  if (!existsSync(file)) return null
  const text = readFileSync(file, 'utf8')
  const { reresolve } = await import(pathToFileURL(join(site, 'look-panel/ui/choice.mjs')).href)
  const r = reresolve(JSON.parse(text), catalog)
  if (r.same) return { ...r, wrote: false, backup: null }
  const first = !existsSync(join(site, BEFORE))
  if (first) writeFileSync(join(site, BEFORE), text)
  writeFileSync(file, JSON.stringify(r.look, null, 2) + '\n')
  return { ...r, wrote: true, backup: first ? BEFORE : null }
}

/** Отчёт пересчёта словами — строки для людей (ставщик их передаёт). */
export function reresolveReport(r) {
  if (!r) return []
  const list = (keys) => keys.join(', ')
  const lines = r.wrote
    ? [`Опубликованный вид пересчитан из имён (И352): значения получили ${r.added.length} свойств${r.added.length ? ` (${list(r.added)})` : ''}; изменились ${r.changed.length}${r.changed.length ? ` (${list(r.changed)})` : ''}; ушли ${r.dropped.length}${r.dropped.length ? ` (${list(r.dropped)})` : ''}. Имена не тронуты.${r.backup ? ` Прежний вид — ${r.backup}.` : ''}`]
    : ['Опубликованный вид сходится с каталогом: пересчёт из имён ничего не меняет.']
  for (const k of r.kept) lines.push(`⚠ вид: ${k.field}${k.id ? ` «${k.id}»` : ''} — ${k.why}; группа держит прежние значения — выбрать заново в панели`)
  return lines
}

/** Список пар для PANEL.md — между метками `pairs:start` и `pairs:end`. */
export function pairsMarkdown(catalog) {
  const name = (field, id) => catalog.groups[field].find((o) => o.id === id)?.name ?? id
  const lines = catalog.pairs.map((p) => `| ${p.x.field} · ${name(p.x.field, p.x.id)} | ${p.y.field} · ${name(p.y.field, p.y.id)} | ${p.why} |`)
  if (!lines.length) lines.push('| — | — | каждое сочетание каталога носится |')
  return ['| вариант | не носится с | почему |', '| --- | --- | --- |', ...lines].join('\n')
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const at = process.argv.indexOf('--from')
  const kit = at > 0 ? resolve(process.argv[at + 1]) : null
  if (!kit || !existsSync(join(kit, 'templates/palette.json'))) {
    console.error('✗ Нужна папка набора: --from <путь к SkillSiteBuilding> — полный каталог живёт там.')
    process.exit(1)
  }
  const catalog = await buildCatalog({ site: ROOT, kit })
  writeFileSync(join(ROOT, 'look-panel/ui/catalog.json'), JSON.stringify(catalog, null, 1) + '\n')
  const md = join(ROOT, 'look-panel/PANEL.md')
  if (existsSync(md)) {
    const text = readFileSync(md, 'utf8')
    writeFileSync(md, text.replace(/(<!-- pairs:start -->\n)[\s\S]*?(\n<!-- pairs:end -->)/, `$1${pairsMarkdown(catalog)}$2`))
  }
  const count = Object.fromEntries(Object.entries(catalog.groups).map(([g, l]) => [g, l.length]))
  console.log(`Каталог панели: ${Object.entries(count).map(([g, n]) => `${g} ${n}`).join(' · ')} · пар, которые не носятся: ${catalog.pairs.length}`)
  if (process.argv.includes('--look')) {
    const { compose } = await import('../ui/choice.mjs')
    const { look } = compose(catalog.defaults, catalog)
    writeFileSync(join(ROOT, PUBLISHED), JSON.stringify(look, null, 2) + '\n')
  } else {
    for (const line of reresolveReport(await reresolvePublished(ROOT, catalog))) console.log(line)
  }
}
