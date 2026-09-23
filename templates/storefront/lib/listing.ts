import type { SortKey } from './source/contract.ts'
import { parseFacetParams } from './source/vendure/core/search.mjs'

export type Params = Record<string, string | string[] | undefined>
export type Asked = { facets: Record<string, string[]>; sort: SortKey; page: string | null }

const SORTS = new Set<SortKey>(['popular', 'price-asc', 'price-desc'])
export const first = (v: string | string[] | undefined): string | null => (Array.isArray(v) ? (v[0] ?? null) : (v ?? null))

/** Что спрошено адресом. Номер страницы здесь не толкуется: мусор и «за
 *  концом» — решение источника (404), а не тихая первая страница. */
export function readQuery(params: Params): Asked {
  const sort = first(params.sort)
  return {
    facets: parseFacetParams(params) as Record<string, string[]>,
    sort: SORTS.has(sort as SortKey) ? (sort as SortKey) : 'popular',
    page: first(params.page),
  }
}
