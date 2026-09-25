import type { Lang } from './locale.ts'
import type { Collection, Doc, Facet, Image } from './source/contract.ts'
import { t } from './i18n/index.ts'
import { hrefFor } from './href.ts'
import { source, content } from './source/index.ts'

/* Пустой список — общий на оба провала источника: своя `[]` в JSX-пропе на
   каждый рендер словит react-perf/jsx-no-new-array-as-prop. */
const NONE: never[] = []

/** Полка в шапке: адрес, имя, кадр полки и строка о ней (у «всех товаров»
 *  кадра и строки нет). Строкой, плиткой или рядом в шторке её рисует шапка. */
export type NavLink = { href: string; label: string; image: Image | null; line: string | null }
/** Группа «по поводу» в шторке полок (И430; меню телефона пилюлями cbdin.bg):
 *  грань всего каталога и её значения ссылками на каталог с этой гранью. */
export type NavGroup = { name: string; links: { label: string; href: string }[] }
export type ShellData = { nav: NavLink[]; groups: NavGroup[]; docs: Doc[] }

/** Грань, значения которой повторяют полки (Vendure: «category» — oil,
 *  capsules …; образец: «Форма» — Масло, Капсулы …), в шторке не нужна: полки
 *  уже стоят строками. Повтором считается, когда хотя бы половина значений
 *  совпадает с полкой адресом или именем. */
const mirrorsShelves = (f: Facet, cols: Collection[]): boolean => {
  const slugs = new Set(cols.map((c) => c.slug))
  const names = new Set(cols.map((c) => c.name.toLowerCase()))
  const same = f.values.filter((v) => slugs.has(v.code) || names.has(v.name.toLowerCase())).length
  return same * 2 >= f.values.length
}

/** Полки шапки (первой — весь каталог), группы шторки и документы подвала.
 *  Шапка и подвал не падают вместе с источником: не ответил — полок, групп
 *  и документов в них нет, а страница говорит сама за себя. Берут двое —
 *  макет языка и «не найдено» без языка. */
export async function shellData(lang: Lang): Promise<ShellData> {
  const [cols, docs, all] = await Promise.all([
    source().collections(lang), content().docs(lang), source().listing(lang, { facets: {}, sort: 'popular', page: null }),
  ])
  const shelves = cols.ok ? cols.value : NONE
  const nav = [
    { href: hrefFor(lang, { catalog: true }), label: t(lang, 'nav.catalog'), image: null, line: null },
    ...shelves.map((c) => ({ href: hrefFor(lang, { category: c.slug }), label: c.name, image: c.image, line: c.description })),
  ]
  /* Группы шторки — грани всего каталога: значения с товарами, у грани
     больше одного значения; повторяющие полки — прочь. Молчит источник —
     групп нет, шторка остаётся полками. */
  const groups = all.ok
    ? all.value.facets
      .map((f): Facet => ({ code: f.code, name: f.name, values: f.values.filter((v) => v.count > 0) }))
      .filter((f) => f.values.length > 1 && !mirrorsShelves(f, shelves))
      .map((f) => ({ name: f.name, links: f.values.map((v) => ({ label: v.name, href: hrefFor(lang, { catalog: true, facets: { [f.code]: [v.code] } }) })) }))
    : NONE
  return { nav, groups, docs: docs.ok ? docs.value : NONE }
}
