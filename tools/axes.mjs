/*
 * Оси — слой 2 основания: по каким обстоятельствам одно и то же имя
 * получает разные значения, и чем каждая ось включается.
 *
 * «Сначала оси, потом значения: значение токена — это набор по осям
 * тема × указатель × локаль, а не одно число» (Spectrum ставит Platform
 * scale и Theming сразу после токенов; React Spectrum Provider выбирает
 * scale по типу ввода, colorScheme по ОС, locale по браузеру). Готов слой,
 * когда «перечислены оси и для каждого семейства записано, по каким осям
 * оно меняется» (Spectrum: spacing «static and don't change based on
 * platform scale»; border width «remains the same for desktop scale and
 * mobile scale»; Carbon: «Each theme shares the same variables and roles,
 * with only the value changing»).
 *
 * Реестр печатается в craft/references/axes.md из кода (check:rules) и
 * держит четыре семьи check:css: axisUnknown, axisTheme, axisScope, axisHover.
 */

export const AXES = {
  theme: {
    name: 'тема: свет / тьма',
    how: '`color-scheme: light dark` на корне; `[data-theme]` из cookie ставит ТОЛЬКО `color-scheme`; цвет объявлен один раз функцией `light-dark()`; тёмная полоса — `color-scheme: dark` на ней самой; `<meta name="color-scheme">` раньше стилей',
    features: ['prefers-color-scheme'],
    varies: 'ступени цвета (палитра — по устройству Radix: одна ступень, два значения), роли цвета, тени (цвет внутри light-dark)',
    static: 'ритм, размер, скругление, толщина линии — «с темой меняется только цвет» (next_theming, правило 2)',
    source: 'css-color-5 §7 light-dark(); css-color-adjust §2.2; MDN color-scheme; web.dev light-dark',
  },
  pointer: {
    name: 'указатель: палец / курсор',
    how: '`@media (pointer: coarse)` — цель 44 и зазор 16; `:hover` только внутри `@media (hover: hover)`; ответ на касание — `:active`, сразу',
    features: ['pointer', 'any-pointer', 'hover', 'any-hover'],
    varies: 'зазор между целями (--gap-targets), высота органов под пальцем, ответ на наведение',
    static: 'раскладка и содержимое: по указателю «не прячут содержимое и не переключают раскладку» — это эвристика, не факт (next_responsive, правило 17)',
    source: 'MDN pointer / any-pointer / hover; Primer control.minTarget fine 16 / coarse 44; Spectrum platform scale 1 : 1.25',
  },
  width: {
    name: 'ширина: телефон … макет',
    how: 'рампы `clamp()` между двумя названными ширинами (строитель шкал); три шва раскладки; компонент меряет контейнер (`@container`)',
    features: ['min-width', 'max-width', 'width'],
    varies: 'ступени размера и ритма, поле, воздух, зазоры ряда и сетки, кривые от контейнера',
    static: 'геометрия органа (правило 2 CLAUDE.md), оптика не выше пола',
    source: 'Utopia; Carbon FAQ «tokens themselves do not change values based on the screen size … acceptable at page breakpoints to jump a step»',
  },
  language: {
    name: 'язык страницы',
    how: '`<html lang>` из адреса; мера строки по языку (`:lang()`); `quotes: auto`; `hyphens: auto` только как улучшение поверх `overflow-wrap: anywhere` и `<wbr>` — у Chromium нет словаря переноса для румынского',
    features: [],
    varies: 'мера строки (--measure*), кавычки, переносы, форматы чисел и дат (Intl — в коде)',
    static: 'словарь токенов: «Spectrum tokens are not localized» — локаль меняет раскладку и содержание, а не имена',
    source: 'W3C qa-lang-why; MDN hyphens, quotes; Chromium hyphenation-patterns (нет hyph-ro.hyb)',
  },
  motion: {
    name: 'движение: просьба «меньше анимации»',
    how: '`@media (prefers-reduced-motion: reduce)` — длительности в 0.01ms, `scroll-behavior: auto`; смысл не держится на движении',
    features: ['prefers-reduced-motion'],
    varies: 'длительности переходов и анимаций, плавная прокрутка',
    static: 'всё остальное',
    source: 'Carbon motion checklist «purposeful? responsive? meticulous? unobtrusive?»; WCAG 2.3.3',
  },
  contrast: {
    name: 'контраст: усиленный и принудительные цвета',
    how: '`@media (prefers-contrast: more)` усиливает роли (волосок — сплошной, приглушённые чернила — непрозрачные), а не рисует вторую тему; `@media (forced-colors: active)` — обводки вместо теней, `outline` у фокуса, системные цвета; `forced-color-adjust: none` только для образца цвета',
    features: ['prefers-contrast', 'forced-colors'],
    varies: 'линия, приглушённые чернила, вуали, тень → обводка',
    static: 'раскладка, размеры',
    source: 'MDN prefers-contrast, forced-colors; css-color-adjust §3.1; Edge blog о forced colors',
  },
}

/** Что разрешено переопределять по указателю: размер цели, зазор, геометрия
 *  органа. Раскладку и видимость — нет. */
export const POINTER_FORBIDDEN = /(?:^|[;{])\s*(display\s*:\s*none|visibility\s*:\s*hidden|grid-template-columns|flex-direction|content-visibility)\s*:?/

/** Ось по признаку медиазапроса, или null — признак реестру неизвестен. */
export const axisOf = (query) => {
  const q = query.toLowerCase()
  for (const [key, ax] of Object.entries(AXES)) {
    if (ax.features.some((f) => new RegExp(`\\(\\s*(?:${f})\\s*[:)]`).test(q))) return key
  }
  return null
}

/** Разбор стилей: для каждой оси — какие имена и свойства меняются под ней. */
export const scan = (css) => {
  const out = Object.fromEntries(Object.keys(AXES).map((k) => [k, { names: new Set(), props: new Set(), blocks: 0 }]))
  const unknown = []
  for (const m of css.matchAll(/@media([^{]*)\{/g)) {
    const key = axisOf(m[1])
    let depth = 1, i = m.index + m[0].length
    const from = i
    while (i < css.length && depth) { if (css[i] === '{') depth++; else if (css[i] === '}') depth--; i++ }
    const body = css.slice(from, i - 1)
    if (!key) { unknown.push({ index: m.index, query: m[1].trim() }); continue }
    out[key].blocks++
    for (const d of body.matchAll(/(--[a-z][a-z0-9-]*)\s*:/g)) out[key].names.add(d[1])
    for (const p of body.matchAll(/(?:^|[;{])\s*([a-z-]+)\s*:/g)) if (!p[1].startsWith('--')) out[key].props.add(p[1])
  }
  for (const m of css.matchAll(/:lang\([^)]*\)\s*\{([^}]*)\}/g)) {
    out.language.blocks++
    for (const d of m[1].matchAll(/(--[a-z][a-z0-9-]*)\s*:/g)) out.language.names.add(d[1])
  }
  for (const m of css.matchAll(/\[data-theme[^\]]*\]\s*\{([^}]*)\}/g)) {
    out.theme.blocks++
    for (const d of m[1].matchAll(/(--[a-z][a-z0-9-]*)\s*:/g)) out.theme.names.add(d[1])
  }
  return { axes: out, unknown }
}
