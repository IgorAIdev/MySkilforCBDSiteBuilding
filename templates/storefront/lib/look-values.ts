/* Вид как значения — проверка и выпуск (И270).

   Вид приходит сайту из источника данных (образец — lib/source/sample/
   look.json, живой магазин — админка) и ложится в страницу блоком
   `<style href="look">`. Поэтому каждое значение проверяется до страницы:
   имя свойства — из закрытого списка сайта (lib/look-slots.json, его
   выпускает scripts/look-slots.mjs из стилей самого сайта), значение — по
   роду свойства: краска, длина, число, слово, тень, сдвиг, шрифт. Разбор
   строгий: знаков, которыми закрывают объявление, блок или тег (`;` `{` `}`
   `<` `>` `\` `@` `"`, кавычка — кроме имени шрифта), в значении не бывает
   вовсе, функции и слова — из списка рода. Внедрить CSS нечем. Не прошедшее
   отбрасывается по одному свойству; на его месте остаётся умолчание стилей
   сайта, и отброшенное называется. Чистый модуль: ни next, ни диска. */
import { HEADERS, type HeaderVariant } from './headers.ts'
import { CARDS, type CardVariant } from './cards.ts'
import { HOMES, type HomeVariant } from './homes.ts'
import type { Look, LookFont } from './source/contract.ts'

export type SlotType = 'colour' | 'length' | 'number' | 'keyword' | 'shadow' | 'transform' | 'font'
/** Что выбирается вместе: набор цвета, набор ритма, ширина холста, углы,
 *  тени, шрифт, стиль кнопок, вид поля ввода и галочки, отметка текущего пункта меню; ручки карты
 *  товара — доля ряда под галерею, место миниатюр, край снимка (И278); ручки
 *  товара на полке и карте — пропорция снимка, плотность полки и место
 *  кнопки «в корзину» на карточке (И400). */
export type Group = 'palette' | 'scale' | 'width' | 'corners' | 'shadow' | 'face' | 'button' | 'marker' | 'field' | 'field-label' | 'tick' | 'pdp-gallery' | 'pdp-thumbs' | 'pdp-edge' | 'shot-frame' | 'shelf-cols' | 'card-buy' | 'sort-label'
/** Свойство вида: род значения, группа и умолчание стилей сайта. */
export type Slot = { type: SlotType; group: Group; value: string }
export type Slots = Readonly<Record<string, Slot>>
export type Dropped = { what: string; why: string }

const UNITS = new Set(['', 'px', 'rem', 'em', 'vw', 'vh', 'svh', 'dvh', '%', 'cqi', 'ch'])
const FUNCS: Readonly<Record<SlotType, readonly string[]>> = {
  colour: ['light-dark', 'color-mix'],
  length: ['clamp', 'calc', 'min', 'max'],
  number: ['calc'],
  keyword: [],
  shadow: ['color-mix'],
  transform: ['scale', 'translatex', 'translatey'],
  font: [],
}
const WORDS: Readonly<Record<SlotType, readonly string[]>> = {
  colour: ['transparent', 'currentcolor', 'in', 'srgb', 'oklab', 'oklch'],
  length: ['normal'],
  number: [],
  keyword: ['none', 'uppercase', 'lowercase', 'capitalize', 'normal', 'underline', 'block', 'below', 'side', 'dots', 'over', 'inset', 'bleed', 'full', 'beside', 'above', 'edge', 'inside'],
  shadow: ['none', 'inset', 'transparent', 'in', 'srgb', 'oklab'],
  transform: ['none'],
  font: [],
}
/* Заместители ссылки `var(--…)` и имени шрифта в кавычках — знаки, которых
   значение пройти не может (ворота знаков выше), подделать их нечем. */
const REF = '§'
const NAME = '¤'
const TOKEN = /\s+|#[0-9a-fA-F]{3,8}(?![0-9a-zA-Z])|[+-]?(?:\d+\.?\d*|\.\d+)([a-zA-Z%]*)|([a-zA-Z][a-zA-Z-]*)\(|[a-zA-Z][a-zA-Z0-9-]*|[,+*/-]|\)|§|¤/y

/** Значение годится свойству этого рода. */
export function valid(type: SlotType, value: unknown): boolean {
  if (typeof value !== 'string' || !value.trim() || value.length > 400) return false
  if (!/^[A-Za-z0-9#.,%()+\-*/ ']+$/.test(value)) return false
  let rest = type === 'font' ? value.replace(/'[A-Za-z0-9 ]{1,60}'/g, NAME) : value
  if (rest.includes("'")) return false
  rest = rest.replace(/var\(--[a-z0-9-]+\)/g, REF)
  if (rest.includes('--') || /var\(/i.test(rest)) return false
  const kinds: string[] = []
  let depth = 0
  TOKEN.lastIndex = 0
  while (TOKEN.lastIndex < rest.length) {
    const at = TOKEN.lastIndex
    const m = TOKEN.exec(rest)
    if (!m || m.index !== at) return false
    const t = m[0]
    if (/^\s+$/.test(t)) continue
    if (t === REF || t === NAME) kinds.push(t === REF ? 'ref' : 'name')
    else if (t.startsWith('#')) { if (type !== 'colour') return false; kinds.push('hex') }
    else if (/^[+-]?[\d.]/.test(t)) {
      const unit = (m[1] ?? '').toLowerCase()
      if (!UNITS.has(unit) || type === 'keyword' || type === 'font') return false
      if (type === 'shadow' && !['', 'px', 'rem', 'em', '%'].includes(unit)) return false
      if (type === 'number' && unit) return false
      if (type === 'colour' && unit && unit !== '%') return false
      kinds.push('num')
    } else if (m[2]) {
      if (!FUNCS[type].includes(m[2].toLowerCase())) return false
      depth++
      kinds.push('fn')
    } else if (t === ')') {
      if (--depth < 0) return false
    } else if (/^[a-zA-Z]/.test(t)) {
      if (type !== 'font' && !WORDS[type].includes(t.toLowerCase())) return false
      kinds.push('word')
    } else {
      if (type === 'keyword' || ((type === 'shadow' || type === 'font') && t !== ',')) return false
      kinds.push(t === ',' ? 'comma' : 'op')
    }
  }
  if (depth !== 0 || !kinds.length) return false
  if (type === 'keyword') return kinds.length === 1 && kinds[0] === 'word'
  /* Тень — ссылка на роль, `none` или слои: длины, краска ссылкой или
     вуалью, `inset`. `none` — только одно. */
  if (type === 'shadow') return kinds.length === 1 || !/\bnone\b/i.test(rest)
  return true
}

const FAMILY = /^[A-Za-z0-9 ]{1,60}$/
const FONT_URL = /^\/fonts\/[a-z0-9-]{1,80}\.woff2$/
const WEIGHT = /^[1-9]00( [1-9]00)?$/
const RANGE = /^U\+[0-9A-Fa-f?]{1,6}(-[0-9A-Fa-f]{1,6})?(, ?U\+[0-9A-Fa-f?]{1,6}(-[0-9A-Fa-f]{1,6})?)*$/
const LABEL = /^[\p{L}\p{N} .+-]{1,60}$/u
const FIELDS = new Set(['palette', 'face', 'scale', 'width', 'corners', 'shadow', 'marker', 'field', 'field-label', 'tick', 'header', 'card', 'home', 'pdp-gallery', 'pdp-thumbs', 'pdp-edge', 'shot-frame', 'shelf-cols', 'card-buy', 'sort-label'])
/** Оси кнопки — поля `btn-<ось>`: каталог кнопки растёт осями данными (И273). */
const AXIS = /^btn-[a-z0-9-]{1,30}$/

/** Разметка, которую сайт умеет рисовать: варианты шапки, карточки товара
 *  и главной. */
export type Structure = { headers: readonly HeaderVariant[]; cards: readonly CardVariant[]; homes: readonly HomeVariant[] }
export const STRUCTURE: Structure = { headers: HEADERS, cards: CARDS, homes: HOMES }

const record = (x: unknown): Record<string, unknown> | null => (x && typeof x === 'object' && !Array.isArray(x) ? (x as Record<string, unknown>) : null)

/** Шрифт вида годен: имя семейства простыми знаками, файлы — woff2 со
 *  своего адреса `/fonts/`, толщины и диапазоны знаков по записи CSS. */
export function validFont(x: unknown): x is LookFont {
  const f = record(x)
  if (!f || typeof f.family !== 'string' || !FAMILY.test(f.family) || !Array.isArray(f.files) || !f.files.length || f.files.length > 24) return false
  return f.files.every((file) => {
    const r = record(file)
    return !!r && typeof r.url === 'string' && FONT_URL.test(r.url) && typeof r.weight === 'string' && WEIGHT.test(r.weight) && typeof r.range === 'string' && RANGE.test(r.range)
  })
}

/** Сохранённый вид → вид, которым можно рисовать, и что отброшено. */
export function acceptValues(raw: unknown, slots: Slots, known: Structure = STRUCTURE): { look: Look; dropped: Dropped[] } {
  const dropped: Dropped[] = []
  const r = record(raw)
  const header = known.headers.find((h) => h === r?.header)
  if (r && !header) dropped.push({ what: 'header', why: `«${String(r.header)}» is not a header this site draws` })
  /* Карточки в сохранённом виде может не быть (вид старше поля) — тогда
     первая, без слова. */
  const card = known.cards.find((c) => c === r?.card)
  if (r && r.card !== undefined && !card) dropped.push({ what: 'card', why: `«${String(r.card)}» is not a product card this site draws` })
  /* Главной в сохранённом виде может не быть (вид старше поля) — тогда
     первая, нынешняя, без слова. */
  const home = known.homes.find((h) => h === r?.home)
  if (r && r.home !== undefined && !home) dropped.push({ what: 'home', why: `«${String(r.home)}» is not a home page this site draws` })
  const vars: Record<string, string> = {}
  for (const [name, value] of Object.entries(record(r?.vars) ?? {})) {
    const slot = Object.hasOwn(slots, name) ? slots[name] : null
    if (!slot) dropped.push({ what: name, why: 'is not a property of this site' })
    else if (!valid(slot.type, value)) dropped.push({ what: name, why: `is not a ${slot.type} value` })
    else vars[name] = value as string
  }
  const fonts: LookFont[] = []
  const given = r?.fonts
  for (const f of Array.isArray(given) ? given : []) {
    if (validFont(f) && fonts.length < 4) fonts.push(f)
    else dropped.push({ what: 'font', why: 'is not a self-hosted woff2 font of this site' })
  }
  const names: Record<string, string> = {}
  for (const [k, v] of Object.entries(record(r?.names) ?? {})) if ((FIELDS.has(k) || AXIS.test(k)) && typeof v === 'string' && LABEL.test(v)) names[k] = v
  return { look: { header: header ?? known.headers[0], card: card ?? known.cards[0], home: home ?? known.homes[0], vars, fonts, names }, dropped }
}

/** Роли тени — по работе (И228). Их геометрия замешана на ингредиентах пола
 *  (`--sh-ring`, `--sh-near`, `--sh-far-*`, `--sh-inset`), а `var()` внутри
 *  свойства раскрывается там, где свойство объявлено: роль объявляется на
 *  каждом полу, который меняет ингредиенты, — одной записью на список полов
 *  `FLOORS`, а не копией геометрии на каждом (И385). Тот же список держит
 *  основа набора в `styles/look.css`. */
export const SHADOWS = ['--sh-raised', '--sh-lift', '--sh-overlay', '--sh-in'] as const
export const FLOORS = ":root,[data-ground='deck'],[data-plate]"
const isShadow = (name: string): boolean => (SHADOWS as readonly string[]).includes(name)

/** Проверенный вид → текст блока `<style href="look">`: свойства на корне
 *  (краски — `light-dark()`, как в styles/palette.css, тема решается
 *  `color-scheme`), роли тени — на списке полов, шрифты со своих адресов. */
export function lookCss(look: Look): string {
  const decl = (keep: (name: string) => boolean) => Object.entries(look.vars).filter(([k]) => keep(k)).map(([k, v]) => `${k}:${v}`).join(';')
  const vars = decl((k) => !isShadow(k))
  const shadows = decl(isShadow)
  const faces = look.fonts.flatMap((f) => f.files.map((x) =>
    `@font-face{font-family:'${f.family}';src:url(${x.url}) format('woff2');font-weight:${x.weight};font-style:normal;font-display:swap;unicode-range:${x.range}}`))
  return [vars ? `:root{${vars}}` : '', shadows ? `${FLOORS}{${shadows}}` : '', ...faces].filter(Boolean).join('\n')
}

/** Толщины, загруженные у семейства вида; null — семейство не загружается
 *  видом (системное), толщины любые. */
export function loadedWeights(fonts: readonly LookFont[], family: string | null): number[] | null {
  const f = family ? fonts.find((x) => x.family === family) : null
  if (!f) return null
  const out = new Set<number>()
  for (const file of f.files) {
    const [lo, hi = lo] = file.weight.split(' ').map(Number)
    for (let w = lo; w <= hi; w += 100) out.add(w)
  }
  return [...out].sort((a, b) => a - b)
}
