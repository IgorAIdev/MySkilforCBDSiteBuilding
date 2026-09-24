/* Выбор вида — чистый модуль панели: и в браузере (ui/look.js), и в Node
   (scripts/, routes/, tests/). Из имён вариантов каталога (ui/catalog.json)
   собирает вид значениями — таким, каким его примет сайт (lib/look-values.ts)
   — и говорит, какой вариант с текущими не носится. Пары, которые не
   носятся, посчитаны при сборке каталога правилом сайта
   (lib/look-rule.ts, scripts/build-catalog.mjs); здесь — только поиск по
   ним. */

/** Поля выбора. Раздел System — цвет, шрифт, ритм, кнопки; Admin — шапка и
 *  отметка текущего пункта меню. */
export const SYSTEM = ['palette', 'face', 'scale', 'button']
export const ADMIN = ['header', 'marker']
export const FIELDS = [...SYSTEM, ...ADMIN]

const option = (catalog, field, id) => (catalog.groups[field] ?? []).find((o) => o.id === id) ?? null

/** Имена → полный выбор: чего нет или что незнакомо — умолчание каталога. */
export function complete(names, catalog) {
  return Object.fromEntries(FIELDS.map((f) => [f, option(catalog, f, names?.[f]) ? names[f] : catalog.defaults[f]]))
}

/** Вид значениями: свойства вариантов, шапка, имена; шрифты — какие
 *  семейства и толщины загрузить (`need`); файлы кладёт публикация
 *  (scripts/fonts.mjs), до того `fonts` пуст. */
export function compose(names, catalog) {
  const chosen = complete(names, catalog)
  const vars = {}
  for (const f of ['palette', 'scale', 'face', 'button', 'marker']) Object.assign(vars, option(catalog, f, chosen[f])?.vars ?? {})
  const need = option(catalog, 'face', chosen.face)?.fonts ?? []
  return { look: { header: chosen.header, vars, fonts: [], names: chosen }, need }
}

/** Пары, которые выбор нарушает. */
export const clashes = (names, pairs) => pairs.filter((p) => names[p.x.field] === p.x.id && names[p.y.field] === p.y.id)

/** С каким из текущих вариант не носится: { field, id, why } или null. */
export function blockedBy(field, id, names, pairs) {
  for (const p of pairs) {
    if (p.x.field === field && p.x.id === id && names[p.y.field] === p.y.id) return { field: p.y.field, id: p.y.id, why: p.why }
    if (p.y.field === field && p.y.id === id && names[p.x.field] === p.x.id) return { field: p.x.field, id: p.x.id, why: p.why }
  }
  return null
}

/** Имя варианта для людей. */
export const title = (catalog, field, id) => option(catalog, field, id)?.name ?? id
