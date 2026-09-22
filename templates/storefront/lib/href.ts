import type { Lang } from './locale.ts'
import type { SortKey } from './source/contract.ts'

export type Query = { page?: number; facets?: Record<string, string[]>; sort?: SortKey }
type To =
  | { home: true }
  | ({ catalog: true } & Query)
  | ({ category: string } & Query)
  | { product: string; options?: Record<string, string> }
  | { search: string; page?: number }
  | { doc: string }

type Pair = [string, string]
const withQuery = (path: string, params: Pair[]) => {
  const q = new URLSearchParams(params).toString()
  return q ? `${path}?${q}` : path
}
const pageParam = (page?: number): Pair[] => (page && page > 1 ? [['page', String(page)]] : [])
const shelfParams = (q: Query): Pair[] => [
  ...Object.entries(q.facets ?? {})
    .filter(([, values]) => values.length)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([code, values]): Pair => [`facet.${code}`, values.join(',')]),
  ...(q.sort && q.sort !== 'popular' ? [['sort', q.sort] as Pair] : []),
  ...pageParam(q.page),
]

/** Одна функция адреса (references/payload.md, «Одна функция адреса»): из
 *  неё ссылки, карта сайта, canonical и hreflang. Склейка адреса в другом
 *  месте — дефект: такой клей однажды отдал в карту 84 несуществующих адреса. */
export function hrefFor(lang: Lang, to: To): string {
  if ('home' in to) return `/${lang}`
  if ('catalog' in to) return withQuery(`/${lang}/catalog`, shelfParams(to))
  if ('category' in to) return withQuery(`/${lang}/catalog/${to.category}`, shelfParams(to))
  if ('product' in to) {
    const opts = Object.entries(to.options ?? {}).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]): Pair => [`option.${k}`, v])
    return withQuery(`/${lang}/product/${to.product}`, opts)
  }
  if ('search' in to) return withQuery(`/${lang}/search`, [...(to.search ? [['q', to.search] as Pair] : []), ...pageParam(to.page)])
  return `/${lang}/info/${to.doc}`
}
