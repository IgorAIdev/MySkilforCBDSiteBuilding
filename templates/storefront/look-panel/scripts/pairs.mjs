/* Пары вариантов, которые не носятся, — одним ходом для каталога
   (scripts/build-catalog.mjs) и для своей палитры из строителя
   (routes/index.ts, /look-panel/guard). Судит правило сайта
   (lib/look-rule.ts, `problems`) на значениях «умолчания сайта + вариант A +
   вариант B»: проверки правила парные, поэтому пара, найденная так, —
   ровно пара. Правило передаётся доводом: модуль не ввозит TypeScript сам и
   годится и Node, и серверу страниц. */

/** Шрифт кандидата так, как его увидит правило: семейства и толщины без файлов. */
export const pseudoFonts = (fonts) => fonts.map((x) => ({ family: x.family, files: x.weights.map((w) => ({ url: '', weight: String(w), range: '' })) }))

const rule = (field) => (field.startsWith('btn-') ? 'button' : field)
const carries = (field, o, p) => !field.startsWith('btn-') || !p.roles || p.roles.some((r) => Object.hasOwn(o.vars ?? {}, r))

/** Пары групп `fields`, которые не носятся; `only` — только пары с этим полем.
 *  @param {{ groups: Record<string, any[]>, fields: string[], base: Record<string, string>, facts: any, problems: (vars: Record<string, string>, fonts: any[], facts: any) => { groups: readonly string[], why: string, roles?: readonly string[] }[], only?: string | null }} args */
export function pairsOf({ groups, fields, base, facts, problems, only = null }) {
  const pairs = []
  for (let i = 0; i < fields.length; i++) {
    for (let j = i + 1; j < fields.length; j++) {
      const [gx, gy] = [fields[i], fields[j]]
      if (only && gx !== only && gy !== only) continue
      /* Группа правила: оси кнопки — `button`; проблема с ролями кнопки
         ложится на ту ось, чей вариант эти роли объявляет. */
      const [rx, ry] = [rule(gx), rule(gy)]
      const match = (p, x, y) => (rx === ry ? p.groups[0] === rx && p.groups[1] === rx : p.groups.includes(rx) && p.groups.includes(ry)) && carries(gx, x, p) && carries(gy, y, p)
      for (const x of groups[gx] ?? []) {
        for (const y of groups[gy] ?? []) {
          const fonts = pseudoFonts([...(gx === 'face' ? x.fonts ?? [] : []), ...(gy === 'face' ? y.fonts ?? [] : [])])
          const hit = problems({ ...base, ...x.vars, ...y.vars }, fonts, facts).find((p) => match(p, x, y))
          if (hit) pairs.push({ x: { field: gx, id: x.id }, y: { field: gy, id: y.id }, why: hit.why })
        }
      }
    }
  }
  return pairs
}
