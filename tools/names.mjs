/*
 * Имена и ярусы — слой 1 основания: как называется всё, что объявляет набор,
 * и кто на кого имеет право ссылаться.
 *
 * Три яруса, ссылки в одну сторону (Figma «primitive tokens are for
 * reference only»; Material 3 reference → system → component; Style
 * Dictionary button.color.primary → {color.primary} → {color.base.green};
 * Curtis Generic / Semantic / Component):
 *
 *   сырьё  — ступени, которые выпускает строитель: --n-12, --a-9, --sp-4,
 *            --fs-base. Смысла не несут («серый-500», «шаг-4»). Их читают
 *            только роли. Узел, читающий ступень напрямую, — семья stepDirect.
 *   роль   — должность значения: --ink, --pop, --pad-card, --air-page,
 *            --body-size, --r-card, --sh-2, --layer-header. Имя по НАЗНАЧЕНИЮ,
 *            не по виду («Name every token for what it does rather than what
 *            it is» — Figma; Curtis, purposeful vs aesthetic). Читает сырьё
 *            или другую роль (цепочки алиасов разрешены — DTCG §7.2.2).
 *   узел   — ручка примитива: --stack, --grid-gap, --pin-top, --tray-h.
 *            Объявляется на самом примитиве и переопределяется тем, кто его
 *            ставит; по умолчанию берёт РОЛЬ. На корне (:root) ей не место:
 *            ручка `--stack` в tokens.css оказалась шрифтовым стеком, и
 *            отступ примитива stack молча стал нулём (И224).
 *
 * Форма имени: --<понятие>[-<уточнение>]* — понятие из списка ниже,
 * уточнения из списка MODIFIERS или число. Порядок частей — от общего к
 * частному (Curtis: «Namespaces are prepended first; modifiers tend to be
 * appended last»; Style Dictionary CTI). Имя не по форме — семья nameGrammar.
 *
 * Это реестр семей, а не строгая грамматика вида
 * --color-action-background-primary-hover: переименование всего словаря —
 * отдельное решение заказчика, с псевдонимами со сроком (docs/open.md).
 */

export const TIERS = { value: 'сырьё', role: 'роль', node: 'узел' }

const FAMS = (n) => `(${n.join('|')})`
/** Семьи цвета — те же, что выпускает строитель палитры (STATUS + n, a). */
export const COLOUR_FAMILIES = ['n', 'a', 'e', 'sale', 'warn', 'ok', 'info']

/** Понятия ролей — по назначению. Слово по виду (sage, cyan, amber, live) сюда
 *  не попадает никогда: перекраска марки переименовала бы всё. */
export const CONCEPTS = {
  colour: ['ink', 'plate', 'page', 'surface', 'pop', 'select', 'ctrl', 'field', 'rule', 'border', 'line', 'ring',
    'scrim', 'quiet', 'thumb', 'tile', 'tick', 'menu', 'accent', 'hover', 'press', 'chrome', 'on',
    'bad', 'ok', 'warn', 'sale', 'info'],
  rhythm: ['pad', 'air', 'gap'],
  text: ['hero', 'pagehead', 'h2', 'h3', 'intro', 'lede', 'body', 'note', 'eyebrow', 'measure', 'face', 'fs', 'page'],
  shape: ['r'],
  depth: ['sh'],
  motion: ['ease', 'rise', 'nudge', 'creep', 'open'],
  state: ['state'],
  layer: ['layer'],
  control: ['ctrl', 'chan', 'chip', 'tab', 'dock', 'edge'],
  layout: ['wrap', 'gut', 'head', 'anchor', 'float', 'chrome', 'tile'],
}
export const MODIFIERS = new Set([
  'soft', 'quiet', 'hover', 'press', 'solid', 'fill', 'tint', 'line', 'ink', 'on', 'bg', 'fg', 'active', 'dim',
  'deck', 'paper', 'ring', 'near', 'far', 'pill', 'sheet', 'card', 'inner', 'xs', 'sm', 'base', 'h2', 'h3', 'h1',
  'size', 'lead', 'weight', 'track', 'measure', 'max', 'slope', 'gap', 'pad', 'air', 'h', 'w', 'min', 'fs', 'b',
  't', 'edge', 'head', 'inset', 'gut', 'stuck', 'look', 'fold', 'btn', 'top', 'mark', 'stack', 'targets', 'row',
  'grid', 'band', 'block', 'group', 'lede', 'note', 'cell', 'in', 'off', 'act', 'fit', 'side', 'above', 'at', 'bias',
  'uri', 'lift', 'select', 'search', 'plate', 'bleed', 'hand', 'cap', 'slope', 'md', 'lg', 'target',
  'ctrl', 'pop', 'raised', 'overlay', 'strong', 'exit', 'case', 'r', 'sh', 'intro', 'pos',
  /* форма главной кнопки (И276): вырез, остриё, выемка, эхо-шеврон */
  'clip', 'tip', 'notch', 'echo', 'trail', 'stop',
  /* выравнивание колонок `sidebar` (`--side-align`): ручку примитив читал
     давно, а объявить её было нечем — первым объявил документ, чтобы строки
     заголовка и текста стояли на одной линии шрифта (разбор 24.09.2026, D3) */
  'align',
  /* нахлёст: на сколько лист покупки наезжает на снимок во всю ширину
     (`--gallery-lap`, карта товара, бриф docs/design/карта-товара.md) */
  'lap',
  /* место подписи поля (`--ctrl-field-label`: над полем или на его кромке,
     элемент 47 набора, И394) */
  'label',
])
/** Ручки примитивов — узлы. Объявляются на примитиве, не на корне. */
export const HOOKS = ['stack', 'cluster', 'switch', 'rail', 'section', 'sheet', 'lede', 'hero', 'grid', 'cols', 'cell',
  'pin', 'tray', 'leaf', 'chip', 'qty', 'chan', 'side', 'prose', 'pinned', 'sidebar', 'frame', 'btn', 'seg', 'gallery']

const VALUE = [
  { rx: new RegExp(`^--${FAMS(COLOUR_FAMILIES)}-\\d{1,2}$`), family: 'ступень цвета', by: 'tools/palette.mjs' },
  { rx: new RegExp(`^--on-${FAMS(COLOUR_FAMILIES)}-\\d{1,2}$`), family: 'знак на ступени', by: 'tools/palette.mjs' },
  { rx: /^--(?:on-)?a-press$/, family: 'ступень нажатия и знак на ней', by: 'tools/palette.mjs' },
  { rx: /^--sp-\d{1,2}$/, family: 'ступень ритма', by: 'tools/scale.mjs' },
  { rx: /^--fs-(xs|sm|base|h[1-3]|2?xl|2?xs)$/, family: 'ступень размера', by: 'tools/scale.mjs' },
]
const ROLE = [
  { rx: /^--(pad|air|gap)-[a-z]+$/, family: 'поле / воздух / зазор', by: 'tools/scale.mjs' },
  { rx: /^--ctrl-fs-[a-z0-9]+$/, family: 'надпись органа', by: 'tools/scale.mjs' },
  { rx: /^--(hero|pagehead|h2|h3|intro|lede|body|note|eyebrow)-(size|lead|weight|track|measure)$/, family: 'роль текста', by: 'tools/scale.mjs' },
  { rx: /^--(r-[a-z]+|round)$/, family: 'скругление', by: 'styles/tokens.css' },
  { rx: /^--sh-[a-z0-9-]+$/, family: 'тень', by: 'styles/look.css (роли), styles/tokens.css (ингредиенты)' },
  { rx: /^--(ease|hover-t|rise|nudge|creep)$/, family: 'движение и ответ на руку', by: 'styles/tokens.css' },
  { rx: /^--layer-[a-z]+$/, family: 'слой', by: 'styles/tokens.css' },
  { rx: /^--(ctrl-(h(-sm|-lg)?|target|fs)|chan-(h|mark|gap)|tab-h|dock|edge-[bx])$/, family: 'размер и геометрия органа', by: 'tools/scale.mjs, styles/tokens.css' },
  { rx: /^--(measure(-[a-z]+)?|face(-[a-z]+)?|hero-(max|slope|size)|pagehead-(base|slope))$/, family: 'текст: кривая, мера, гарнитура', by: 'styles/tokens.css, гарнитура — styles/look.css' },
  /* Коробка страницы (И382): `--page-edge` — край у окна не уже выреза,
     `--page-box` — ширина коробки; читают `.wrap` и всё, что стоит поверх
     страницы шириной коробки. */
  { rx: /^--(wrap|gut(-base)?|page-(line|gut|edge|box)|head-(pad|inset)|anchor-top|float|chrome-stuck|tile-look)$/, family: 'раскладка', by: 'styles/tokens.css' },
  /* Карта товара — ручки вида галереи (И278): доля ряда, место миниатюр,
     край снимка. Роли, а не узлы: их ставит вид сайта на корне (панель
     «Look»), читает узел `gallery` карты. Список закрытый — по имени. */
  { rx: /^--pdp-(gallery|thumbs|edge)$/, family: 'карта товара: вид галереи', by: 'templates/storefront/scripts/look-slots.mjs (styles/look.css)' },
  /* Товар на полке и карте (И400): пропорция снимка — одна на полку и
     карту, снимки у товара одни; плотность — сколько карточек в ряд на
     полке каталога; место кнопки «в корзину» на карточке. Роли вида («Admin → Card»), читают узлы карточки,
     галереи и полки. */
  { rx: /^--pair-look$/, family: 'вид пары «поле и кнопка»', by: 'templates/storefront/scripts/look-slots.mjs (styles/look.css)' },
  { rx: /^--say-look$/, family: 'вид сообщения формы', by: 'templates/storefront/scripts/look-slots.mjs (styles/look.css)' },
  { rx: /^--head-icons$/, family: 'вид знаков шапки', by: 'templates/storefront/scripts/look-slots.mjs (styles/look.css)' },
  { rx: /^--go-hover$/, family: 'краска ссылки «куда ведёт» под рукой', by: 'templates/storefront/scripts/look-slots.mjs (styles/look.css)' },
  { rx: /^--seg-look$/, family: 'вид сегментов выбора', by: 'templates/storefront/scripts/look-slots.mjs (styles/look.css)' },
  { rx: /^--(shot-frame|shelf-cols|card-buy|sort-label)$/, family: 'товар: кадр снимка, плотность полки, кнопка карточки, подпись порядка полки', by: 'templates/storefront/scripts/look-slots.mjs (styles/look.css)' },
]
const ALL_CONCEPTS = [...new Set(Object.values(CONCEPTS).flat())]
const concept = new RegExp(`^--${FAMS(ALL_CONCEPTS)}(-[a-z0-9]+)*$`)
const hook = new RegExp(`^--${FAMS(HOOKS)}(-[a-z0-9]+)*$`)
/** Хвост имени после понятия: уточнения из списка, второе понятие цвета
 *  (`--on-pop`, `--hover-ctrl`) или число. */
const tailOk = (name) => name.split('-').slice(3).every((s) => MODIFIERS.has(s) || CONCEPTS.colour.includes(s) || /^\d+$/.test(s))
const groupOf = (word) => Object.keys(CONCEPTS).find((g) => CONCEPTS[g].includes(word))

/** Разбор имени: ярус и семья, или null — имя не по форме. */
export const parse = (name) => {
  for (const f of VALUE) if (f.rx.test(name)) return { tier: 'value', ...f }
  for (const f of ROLE) if (f.rx.test(name)) return { tier: 'role', ...f }
  if (hook.test(name) && tailOk(name)) return { tier: 'node', family: 'ручка примитива', by: 'styles/primitives.module.css' }
  if (concept.test(name) && tailOk(name)) return { tier: 'role', family: `роль: ${groupOf(name.split('-')[2])}`, by: 'styles/tokens.css' }
  return null
}

/** Роли, которые обязаны существовать, даже пока их никто в наборе не
 *  читает: узел придёт с магазином, а роль — из списка по элементам
 *  (palette/references/roles.md; слои — реестр FLOATING в kit.config). */
export const REQUIRED = {
  '--bad': 'текст сигнала «ошибка» (roles.md, «Текст и знаки»)',
  '--bad-fill': 'плашка сигнала (roles.md, «Заливки»)', '--on-bad': 'знак на плашке', '--bad-tint': 'тихая полоса сигнала', '--bad-line': 'граница ошибки (roles.md, «Линии»)',
  '--ok': 'текст сигнала «успех»', '--ok-fill': 'плашка «в наличии»', '--on-ok': 'знак на плашке', '--ok-tint': 'тихая полоса',
  '--warn': 'текст сигнала «внимание»', '--warn-fill': 'плашка «осталось 2»', '--on-warn': 'знак на плашке', '--warn-tint': 'тихая полоса',
  '--sale': 'текст скидки', '--sale-fill': 'плашка «−20 %»', '--on-sale': 'знак на плашке', '--sale-tint': 'тихая полоса скидки',
  '--pop-press': 'кнопка покупки под пальцем (roles.md, «Заливки»)',
  '--pop-ink-hover': 'марочный текст под курсором (roles.md, «Текст и знаки») — читал его `.more`, снятый как вторая копия органа «ко всему» (И383)',
  '--r-pop': 'полный круг главного действия — кнопка покупки, придёт с магазином (shape.md; Spectrum)',
  '--ease-exit': 'кривая ухода всплывающего (ease-in) — шторка и меню придут с магазином (states.md; Atlassian)',
  '--plate-2': 'утопленное: кадр снимка, подвал карточки, жёлоб лотка (roles.md, «Поверхности»)',
  '--rule': 'разделитель — волосок между строками (roles.md, «Линии»)', '--field': 'поле ввода: почта, промокод, поиск (roles.md, «Поверхности»)', '--scrim': 'затемнение под окном и шторкой (roles.md, «Подъём и постоянные»)',
  '--scrim-deck': 'вуаль под текстом на снимке — герой витрины, текст поверх кадра (templates/storefront, blocks.module.css)',
  '--creep': 'наплыв снимка под рукой — карточка товара на полке (templates/storefront, ProductCard.module.css; controls.md, «рама стоит, движется снимок»)',
  '--layer-helper': 'слой кружка помощника (FLOATING)', '--layer-toast': 'слой всплывающего сообщения (FLOATING)',
}

/** Ступени ритма, которые узел вправе читать сам: оптика не выше пола. */
export const optics = (sets, floor) => {
  const first = Object.values(sets ?? {})[0]
  if (!first) return new Set()
  const out = new Set()
  for (const [n, v] of Object.entries(first.ритм ?? {})) {
    const lo = Array.isArray(v) ? v[0] : Number(v) * (first.тело?.[0] ?? 16)
    if (lo <= floor) out.add(`--sp-${n}`)
  }
  return out
}

/** Все объявления `--имя:` в CSS без комментариев: имя → значение (первое). */
export const declarations = (css) => {
  const out = new Map()
  for (const m of css.matchAll(/(?:^|[;{])\s*(--[a-z][a-z0-9-]*)\s*:\s*([^;}]+)/g)) {
    if (!out.has(m[1])) out.set(m[1], { value: m[2].trim(), index: m.index })
  }
  return out
}
/** Имена, которые читает значение: var(--x …). */
export const reads = (value) => [...value.matchAll(/var\(\s*(--[a-z][a-z0-9-]*)/g)].map((m) => m[1])
