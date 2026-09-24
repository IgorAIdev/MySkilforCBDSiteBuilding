import type { Lang } from './locale.ts'
import type { Card, Facet, Listing, SortKey } from './source/contract.ts'
import type { Asked } from './listing.ts'
import { hrefFor, type Query } from './href.ts'
import { t, tn, type Key } from './i18n/index.ts'
import { shelfCard, type ShelfCard } from './view.ts'

/** Пусто — почему и куда дальше (экран «пусто», StateScreen). */
export type Empty = { title: string; step: string; href: string }
/** Пустая полка: `title` null — заголовка «пусто» не нужно, пустоту уже
 *  назвал заголовок страницы («No results for…»), и второй повторял бы
 *  первый (разбор 24.09.2026, Q4). */
export type ShelfEmpty = { title: string | null; step: string; href: string }
/** Грань, готовая к показу: `id` — адрес её раскрытия на широком (кнопка
 *  `popovertarget` ведёт на него), `label` — имя с числом выбранного. */
export type FacetView = { code: string; id: string; name: string; label: string; values: Facet['values'] }
export type FiltersView = {
  action: string; facets: FacetView[]
  title: string; apply: string; clear: Link | null
  /** Кнопка шторки на узком — с числом выбранного, её крестик и сколько выбрано. */
  open: string; close: string; chosen: number
}
export type Link = { label: string; href: string }
/** Порядок полки — ссылками: каждый порядок — адрес (shop, «Фильтры живут в
 *  адресе всегда»), и выбор ведёт по ссылке, а не отправляет форму на
 *  изменении списка (И265, WCAG 3.2.2 «On Input»). `current` — надпись
 *  кнопки, `said` — её имя для чтения вслух («Sort by: Best sellers»). */
export type SortView = { label: string; current: string; said: string; options: { value: SortKey; label: string; href: string; on: boolean }[] }
/** Выбранное значение пилюлей: `said` — что сделает нажатие, для чтения вслух. */
export type ChipView = { label: string; said: string; href: string }
/** Номер страницы: `href` null — текущая; `gap` — перед номером пропуск «…». */
export type PageItem = { n: number; href: string | null; gap: boolean }
export type PagesView = { label: string; prev: string | null; next: string | null; prevLabel: string; nextLabel: string; items: PageItem[] }
/** Полка «куда дальше» под пустым поиском: лучшее магазина. */
export type MoreView = { title: string; cards: ShelfCard[] }
export type CatalogView = {
  title: string; lede: string | null; count: string | null; shelf: string; cards: ShelfCard[]
  filters: FiltersView | null; sort: SortView | null; chips: ChipView[]; clear: Link | null
  invalid: string | null; empty: ShelfEmpty; pages: PagesView | null; more: MoreView | null
}

const SORTS: [SortKey, Key][] = [['popular', 'sort.popular'], ['price-asc', 'sort.priceAsc'], ['price-desc', 'sort.priceDesc']]

/** Что из граней показывать (cbd-facet, §7: «орган управления показывается,
 *  когда может изменить то, что на экране»): значение без товаров — тупик,
 *  его нет, кроме уже выбранного (иначе нечем его снять); грань, у которой
 *  осталось одно значение на всю выборку, выбора не даёт — на полке масел
 *  «Форма: Масло (5)» из пяти. Раньше «Капсулы (0)» на полке масел
 *  ставились галочкой и давали пустую полку (разбор, C2). */
export function shownFacets(facets: Facet[], total: number): Facet[] {
  return facets
    .map((f): Facet => ({ code: f.code, name: f.name, values: f.values.filter((v) => v.count > 0 || v.selected) }))
    .filter((f) => f.values.some((v) => v.selected) || f.values.length > 1 || (f.values.length === 1 && f.values[0].count < total))
}

const drop = (facets: Record<string, string[]>, code: string, value: string): Record<string, string[]> =>
  Object.fromEntries(Object.entries(facets).map(([k, vs]) => [k, k === code ? vs.filter((v) => v !== value) : vs]).filter(([, vs]) => vs.length))

/** Номера страниц: до семи — все; дальше первая, последняя и соседи текущей,
 *  между ними пропуск. */
function pageItems(page: number, pages: number, href: (n: number) => string): PageItem[] {
  const want = pages <= 7 ? Array.from({ length: pages }, (_, i) => i + 1) : [...new Set([1, page - 1, page, page + 1, pages])].filter((n) => n >= 1 && n <= pages).sort((a, b) => a - b)
  return want.map((n, i) => ({ n, href: n === page ? null : href(n), gap: i > 0 && n - want[i - 1] > 1 }))
}

/** Порядок: у каждого свой адрес с теми же гранями, с первой страницы. */
function sortView(lang: Lang, asked: Asked, at: (q: Query) => string): SortView {
  const options = SORTS.map(([value, key]) => ({ value, label: t(lang, key), href: at({ facets: asked.facets, sort: value }), on: value === asked.sort }))
  const label = t(lang, 'catalog.sort')
  const current = (options.find((o) => o.on) ?? options[0]).label
  return { label, current, said: `${label}: ${current}`, options }
}

/** Полка готовыми строками. `at` строит адрес этой же полки — у категории,
 *  у всего каталога и у поиска он свой, а грани и порядок переносит сам. */
export function catalogView(lang: Lang, a: {
  title: string; lede: string | null; listing: Listing; asked: Asked
  at: (q: Query) => string; filters: boolean; empty: ShelfEmpty; more?: { title: string; cards: Card[] } | null
}): CatalogView {
  const { listing, asked, at } = a
  const keep = { facets: asked.facets, sort: asked.sort }
  const chosen = listing.facets.reduce((n, f) => n + f.values.filter((v) => v.selected).length, 0)
  /* Снять фильтры — не снять порядок: «сбросить» относится к граням. */
  const clear = chosen ? { label: t(lang, 'catalog.clear'), href: at({ sort: asked.sort }) } : null
  return {
    title: a.title,
    lede: a.lede,
    count: listing.total ? tn(lang, 'catalog.count', listing.total) : null,
    shelf: t(lang, 'catalog.shelf'),
    cards: listing.items.map((c) => shelfCard(lang, c)),
    filters: a.filters ? {
      action: at({}),
      facets: shownFacets(listing.facets, listing.total).map((f) => {
        const n = f.values.filter((v) => v.selected).length
        return { code: f.code, id: `facet-${f.code}`, name: f.name, label: n ? `${f.name} (${n})` : f.name, values: f.values }
      }),
      title: t(lang, 'catalog.filters'), apply: t(lang, 'catalog.apply'), clear,
      open: chosen ? `${t(lang, 'catalog.open')} (${chosen})` : t(lang, 'catalog.open'), close: t(lang, 'catalog.close'), chosen,
    } : null,
    sort: a.filters ? sortView(lang, asked, at) : null,
    chips: listing.facets.flatMap((f) => f.values.filter((v) => v.selected).map((v) => ({
      label: v.name, said: t(lang, 'shelf.remove', { name: `${f.name}: ${v.name}` }), href: at({ facets: drop(asked.facets, f.code, v.code), sort: asked.sort }),
    }))),
    clear,
    invalid: listing.invalid.length ? t(lang, 'catalog.invalid') : null,
    empty: a.empty,
    pages: listing.pages > 1 ? {
      label: t(lang, 'catalog.page', { n: listing.page, total: listing.pages }),
      prev: listing.page > 1 ? at({ ...keep, page: listing.page - 1 }) : null,
      next: listing.page < listing.pages ? at({ ...keep, page: listing.page + 1 }) : null,
      prevLabel: t(lang, 'catalog.prev'), nextLabel: t(lang, 'catalog.next'),
      items: pageItems(listing.page, listing.pages, (n) => at({ ...keep, page: n })),
    } : null,
    more: a.more?.cards.length ? { title: a.more.title, cards: a.more.cards.map((c) => shelfCard(lang, c)) } : null,
  }
}

/** Пусто — почему и куда дальше: грани ничего не дали — снять их; полка пуста — ко всем товарам. */
export function emptyFor(lang: Lang, asked: Asked, at: (q: Query) => string): Empty {
  return Object.keys(asked.facets).length
    ? { title: t(lang, 'catalog.none'), step: t(lang, 'catalog.noneStep'), href: at({ sort: asked.sort }) }
    : { title: t(lang, 'catalog.empty'), step: t(lang, 'catalog.emptyStep'), href: hrefFor(lang, { catalog: true }) }
}
