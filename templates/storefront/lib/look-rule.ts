/* Правило сочетаний вида — чистое, по значениям (И270).

   Каждое значение вида по отдельности годно (lib/look-values.ts), но не
   всякое сочетание: вуаль тихой кнопки на полу бледной палитры не видна,
   угол кнопки круглее карточки, у шрифта не загружена толщина, которой
   набрана надпись. Правило считает это по самим значениям — тем же
   ролям, которыми сайт красит (роли и пороги — lib/look-slots.json,
   выпущены из стилей сайта и порогов набора), — и называет, какие две
   группы вида не носятся вместе и почему.

   Одно правило на всех: сайт принимает им сохранённый вид (`acceptLook`
   в lib/look.ts — уступает младшая группа, остаётся умолчание стилей),
   панель вида ввозит его и гасит варианты, которые с текущими не носятся,
   админка (план 4) проверяет им при сохранении. Сайт панель не ввозит. */
import type { HeaderVariant } from './headers.ts'
import type { Look, LookFont } from './source/contract.ts'
import { acceptValues, loadedWeights, type Group, type Slots } from './look-values.ts'

/** Факты сайта для правила: как роли собраны из ступеней (tokens.css),
 *  пороги и какие роли текста — заголовки (шрифт заголовков). */
export type Facts = {
  roles: Readonly<Record<string, string>>
  need: { text: number; control: number; visible: number }
  headings: readonly string[]
}
export type Problem = { groups: readonly [Group, Group]; why: string }
export type Fell = { group: Group; why: string }

/** Старшинство: уступает младшая группа — стиль кнопок раньше отметки
 *  пункта меню, шрифта, ритма и цвета. */
export const ORDER: readonly Group[] = ['palette', 'scale', 'face', 'marker', 'button']

type Rgba = readonly [number, number, number, number]
const THEMES = ['light', 'dark'] as const

/** Разделить список аргументов по запятым верхнего уровня. */
const args = (s: string): string[] => {
  const out: string[] = []
  let depth = 0
  let from = 0
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '(') depth++
    else if (s[i] === ')') depth--
    else if (s[i] === ',' && depth === 0) { out.push(s.slice(from, i).trim()); from = i + 1 }
  }
  out.push(s.slice(from).trim())
  return out
}

/** Краска роли в теме: значения вида, затем роли сайта. Понимает то, чем
 *  краски вида записаны: `#hex`, `var()`, `light-dark()`, `transparent` и
 *  вуаль `color-mix(in srgb, X p%, transparent)`. Прочее — null. */
function painter(vars: Readonly<Record<string, string>>, roles: Facts['roles'], theme: (typeof THEMES)[number]) {
  const parse = (v: string, depth: number): Rgba | null => {
    if (depth > 16) return null
    if (/^#[0-9a-f]{6}$/i.test(v)) {
      const n = Number.parseInt(v.slice(1), 16)
      return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 1]
    }
    if (v === 'transparent') return [0, 0, 0, 0]
    const ref = v.match(/^var\((--[\w-]+)\)$/)
    if (ref) return get(ref[1], depth + 1)
    if (v.startsWith('light-dark(') && v.endsWith(')')) {
      const [a, b] = args(v.slice(11, -1))
      return b === undefined ? null : parse(theme === 'light' ? a : b, depth + 1)
    }
    const veil = v.match(/^color-mix\(in (?:srgb|oklab), (.+) (\d+(?:\.\d+)?)%, transparent\)$/)
    if (veil) {
      const c = parse(veil[1].trim(), depth + 1)
      return c ? [c[0], c[1], c[2], c[3] * Number(veil[2]) / 100] : null
    }
    return null
  }
  const get = (name: string, depth = 0): Rgba | null => {
    const v = vars[name] ?? roles[name]
    return v === undefined ? null : parse(v.trim(), depth)
  }
  return get
}

/** Краска поверх пола — целыми долями, как считает замер набора. */
const over = (top: Rgba, floor: Rgba): Rgba => [0, 1, 2].map((i) => Math.round(top[i] * top[3] + floor[i] * (1 - top[3]))).concat(1) as unknown as Rgba
const linear = (v: number) => (v / 255 <= 0.04045 ? v / 255 / 12.92 : ((v / 255 + 0.055) / 1.055) ** 2.4)
const luminance = (c: Rgba) => 0.2126 * linear(c[0]) + 0.7152 * linear(c[1]) + 0.0722 * linear(c[2])
/** Контраст WCAG 2.2 — та же формула, что у замера набора (tools/palette.mjs;
 *  сервер страниц tools/ не ввозит, И267, — совпадение держит тест). */
export const contrast = (a: Rgba, b: Rgba): number => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}
const shown = (r: number) => Math.floor(r * 100) / 100
const px = (v: string | undefined): number | null => (v && /^\d+(\.\d+)?px$/.test(v) ? Number.parseFloat(v) : null)
const family = (stack: string | undefined): string | null => stack?.match(/^'([^']+)'/)?.[1] ?? null

/** Что в сочетании значений не носится: пары групп и причина словами. */
export function problems(vars: Readonly<Record<string, string>>, fonts: readonly LookFont[], facts: Facts): Problem[] {
  const out: Problem[] = []
  const add = (a: Group, b: Group, why: string) => { if (!out.some((p) => p.why === why)) out.push({ groups: [a, b], why }) }
  const { need } = facts
  for (const theme of THEMES) {
    const get = painter(vars, facts.roles, theme)
    const say = (r: number, n: number) => `${shown(r)} : 1 in the ${theme} theme, needs ${n}`
    for (const [where, floorRole] of [['page', '--page'], ['card', '--plate']] as const) {
      const floor = get(floorRole)
      if (!floor) continue
      const fill = get('--ctrl-btn-fill')
      if (fill && fill[3] > 0) {
        const r = contrast(over(fill, floor), floor)
        if (r < need.visible) add('button', 'palette', `the quiet button fades into the ${where}: ${say(r, need.visible)}`)
      }
      const edge = get('--ctrl-btn-edge')
      if (edge && edge[3] > 0) {
        const r = contrast(over(edge, floor), floor)
        if (r < need.control) add('button', 'palette', `the quiet button's edge is too faint on the ${where}: ${say(r, need.control)}`)
      }
      const pop = get('--ctrl-btn-fill-pop')
      const ink = get('--ctrl-btn-ink-pop')
      const line = get('--ctrl-btn-edge-pop')
      if (pop && pop[3] === 0) {
        if (ink) { const r = contrast(over(ink, floor), floor); if (r < need.text) add('button', 'palette', `the outline button's label is too faint on the ${where}: ${say(r, need.text)}`) }
        if (line && line[3] > 0) { const r = contrast(over(line, floor), floor); if (r < need.control) add('button', 'palette', `the outline is too faint on the ${where}: ${say(r, need.control)}`) }
      } else if (pop) {
        const r = contrast(over(pop, floor), floor)
        if (r < need.visible) add('button', 'palette', `the loud button fades into the ${where}: ${say(r, need.visible)}`)
        if (ink && where === 'page') { const t = contrast(over(ink, over(pop, floor)), over(pop, floor)); if (t < need.text) add('button', 'palette', `the label on the loud button is too faint: ${say(t, need.text)}`) }
      }
    }
    const plate = get('--plate')
    const mark = get('--menu-mark-fill')
    if (plate && mark && mark[3] > 0) {
      const under = over(mark, plate)
      const r = contrast(under, plate)
      if (r < need.visible) add('marker', 'palette', `the current-item pill fades into the header: ${say(r, need.visible)}`)
      const ink = get('--menu-mark-ink')
      if (ink) { const t = contrast(over(ink, under), under); if (t < need.text) add('marker', 'palette', `the current item's label is too faint on its pill: ${say(t, need.text)}`) }
    }
  }
  const corner = px(vars['--ctrl-btn-r'])
  const card = px(vars['--r-card'])
  if (corner !== null && card !== null && corner > card) add('button', 'scale', `button corners (${corner} px) are rounder than the cards they sit on (${card} px)`)
  const body = family(vars['--face'])
  const head = vars['--face-head'] === 'var(--face)' ? body : family(vars['--face-head'])
  const weight = (fam: string | null, w: number, what: string, g: Group) => {
    const have = loadedWeights(fonts, fam)
    if (have && !have.includes(w)) add('face', g, `${what} is set at weight ${w}; ${fam} is loaded at ${have.join(', ')}`)
  }
  const btn = Number(vars['--ctrl-btn-weight'])
  if (btn) weight(body, btn, 'button labels', 'button')
  for (const [name, value] of Object.entries(vars)) {
    const role = name.match(/^--([a-z0-9]+)-weight$/)?.[1]
    if (role && Number(value)) weight(facts.headings.includes(role) ? head : body, Number(value), `${role} text`, 'scale')
  }
  return out
}

/** Сохранённый вид → значения, которые носятся вместе. Пока в сочетании
 *  есть проблема с группой из вида, уступает младшая из её пар (ORDER):
 *  её значения отбрасываются, остаётся умолчание стилей сайта. Умолчания
 *  между собой проверены при выпуске стилей и не судятся. */
export function settle(vars: Readonly<Record<string, string>>, fonts: readonly LookFont[], slots: Slots, facts: Facts): { vars: Record<string, string>; fonts: LookFont[]; fell: Fell[] } {
  const defaults = Object.fromEntries(Object.entries(slots).map(([k, s]) => [k, s.value]))
  const groupOf = (k: string): Group | undefined => (Object.hasOwn(slots, k) ? slots[k].group : undefined)
  const keep = new Set<Group>(ORDER.filter((g) => Object.keys(vars).some((k) => groupOf(k) === g) || (g === 'face' && fonts.length > 0)))
  const fell: Fell[] = []
  for (;;) {
    const kept = Object.fromEntries(Object.entries(vars).filter(([k]) => { const g = groupOf(k); return g !== undefined && keep.has(g) }))
    const keptFonts = keep.has('face') ? [...fonts] : []
    const hit = problems({ ...defaults, ...kept }, keptFonts, facts).find((p) => p.groups.some((g) => keep.has(g)))
    if (!hit) return { vars: kept, fonts: keptFonts, fell }
    const loser = hit.groups.filter((g) => keep.has(g)).sort((a, b) => ORDER.indexOf(b) - ORDER.indexOf(a))[0]
    keep.delete(loser)
    fell.push({ group: loser, why: `does not go with the ${hit.groups.find((g) => g !== loser)}: ${hit.why}` })
  }
}

export type Note = { what: string; why: string }

/** Сохранённое → вид, которым рисуется страница, и что отброшено: свойства
 *  не из списка сайта или не того рода (lib/look-values.ts), группы, не
 *  носящиеся с остальными (`settle`). Значения, равные умолчанию стилей
 *  сайта, в блок вида не идут — их и так держат стили. */
export function acceptLook(raw: unknown, slots: Slots, facts: Facts, headers: readonly HeaderVariant[]): { look: Look; notes: Note[] } {
  const { look, dropped } = acceptValues(raw, slots, headers)
  const kept = settle(look.vars, look.fonts, slots, facts)
  const vars = Object.fromEntries(Object.entries(kept.vars).filter(([k, v]) => slots[k].value !== v))
  return { look: { ...look, vars, fonts: kept.fonts }, notes: [...dropped, ...kept.fell.map((f) => ({ what: f.group, why: f.why }))] }
}
