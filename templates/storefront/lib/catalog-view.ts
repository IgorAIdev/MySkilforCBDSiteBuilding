import type { Lang } from './locale.ts'
import type { Facet, Listing, SortKey } from './source/contract.ts'
import type { Asked } from './listing.ts'
import { hrefFor, type Query } from './href.ts'
import { t, tn, type Key } from './i18n/index.ts'
import { shelfCard, type ShelfCard } from './view.ts'

export type Empty = { title: string; step: string; href: string }
export type FiltersView = {
  action: string; clear: string; facets: Facet[]
  sort: { label: string; value: SortKey; options: { value: SortKey; label: string }[] }
  title: string; apply: string; clearLabel: string
}
export type PagesView = { label: string; prev: string | null; next: string | null; prevLabel: string; nextLabel: string }
export type CatalogView = {
  title: string; lede: string | null; count: string; cards: ShelfCard[]
  filters: FiltersView | null; invalid: string | null; empty: Empty; pages: PagesView | null
}

const SORTS: [SortKey, Key][] = [['popular', 'sort.popular'], ['price-asc', 'sort.priceAsc'], ['price-desc', 'sort.priceDesc']]

/** Полка готовыми строками. `at` строит адрес этой же полки — у категории,
 *  у всего каталога и у поиска он свой, а грани и порядок переносит сам. */
export function catalogView(lang: Lang, a: {
  title: string; lede: string | null; listing: Listing; asked: Asked
  at: (q: Query) => string; filters: boolean; empty: Empty
}): CatalogView {
  const { listing, asked, at } = a
  const keep = { facets: asked.facets, sort: asked.sort }
  return {
    title: a.title,
    lede: a.lede,
    count: tn(lang, 'catalog.count', listing.total),
    cards: listing.items.map((c) => shelfCard(lang, c)),
    filters: a.filters ? {
      action: at({}), clear: at({}), facets: listing.facets,
      sort: { label: t(lang, 'catalog.sort'), value: asked.sort, options: SORTS.map(([value, key]) => ({ value, label: t(lang, key) })) },
      title: t(lang, 'catalog.filters'), apply: t(lang, 'catalog.apply'), clearLabel: t(lang, 'catalog.clear'),
    } : null,
    invalid: listing.invalid.length ? t(lang, 'catalog.invalid') : null,
    empty: a.empty,
    pages: listing.pages > 1 ? {
      label: t(lang, 'catalog.page', { n: listing.page, total: listing.pages }),
      prev: listing.page > 1 ? at({ ...keep, page: listing.page - 1 }) : null,
      next: listing.page < listing.pages ? at({ ...keep, page: listing.page + 1 }) : null,
      prevLabel: t(lang, 'catalog.prev'), nextLabel: t(lang, 'catalog.next'),
    } : null,
  }
}

/** Пусто — почему и куда дальше: грани ничего не дали — снять их; полка пуста — ко всем товарам. */
export function emptyFor(lang: Lang, asked: Asked, at: (q: Query) => string): Empty {
  return Object.keys(asked.facets).length
    ? { title: t(lang, 'catalog.none'), step: t(lang, 'catalog.noneStep'), href: at({}) }
    : { title: t(lang, 'catalog.empty'), step: t(lang, 'catalog.emptyStep'), href: hrefFor(lang, { catalog: true }) }
}
