import type { Lang } from '../../locale.ts'
import type { Card, Collection, Facet, Listing, Product, Result, SortKey, Source, Stock } from '../contract.ts'
import { CATEGORIES, FACETS, LAB_REPORTS, PRODUCTS, type SampleProduct } from '../../products.ts'
import { facetValueFilters, pageVariables, pageCount } from '../vendure/core/search.mjs'
import { MARKET } from '../../market.ts'
import { bottle } from './art.ts'

/* Помощники набора — JavaScript; тип их ответа записан здесь один раз. */
type Filter = { and: string } | { or: string[] }
type Paging = { ok: true; page: number; take: number; skip: number } | { ok: false }

const PAGE = 8
const ok = <T,>(value: T): Result<T> => ({ ok: true, value })
const money = (minor: number) => ({ minor, currency: MARKET.currency })
const overall = (stocks: Stock[]): Stock => (stocks.every((s) => s === 'out') ? 'out' : stocks.some((s) => s === 'in') ? 'in' : 'low')
const image = (p: SampleProduct, lang: Lang) => ({ src: bottle(p.hue, p.label), alt: p.name[lang], width: 800, height: 800 })
const low = (p: SampleProduct) => Math.min(...p.variants.map((v) => v.price))

function card(p: SampleProduct, lang: Lang): Card {
  const prices = p.variants.map((v) => v.price)
  const [min, max] = [Math.min(...prices), Math.max(...prices)]
  return {
    id: p.id, category: p.cat, name: p.name[lang], image: image(p, lang),
    price: min === max ? { kind: 'single', value: money(min) } : { kind: 'range', min: money(min), max: money(max) },
    stock: overall(p.variants.map((v) => v.stock)),
  }
}

/* Словарь «код → id» — как у адаптера Vendure; в образце id — это «грань:значение». */
const DICTIONARY = Object.fromEntries(FACETS.map((f) => [f.code, Object.fromEntries(f.values.map((v) => [v.code, `${f.code}:${v.code}`]))]))
const carries = (p: SampleProduct, id: string) => {
  const [facet, value] = id.split(':')
  return (p.facets[facet] ?? []).includes(value)
}
const matches = (p: SampleProduct, filters: Filter[]) =>
  filters.every((f) => ('and' in f ? carries(p, f.and) : f.or.some((id) => carries(p, id))))

const ORDER: Record<SortKey, (a: SampleProduct, b: SampleProduct) => number> = {
  'popular': (a, b) => a.popular - b.popular,
  'price-asc': (a, b) => low(a) - low(b) || a.popular - b.popular,
  'price-desc': (a, b) => low(b) - low(a) || a.popular - b.popular,
}

const collection = (c: (typeof CATEGORIES)[number], lang: Lang): Collection => ({ slug: c.slug, name: c.name[lang], description: c.description[lang] })

export const sample: Source = {
  async collections(lang) {
    return ok(CATEGORIES.map((c) => collection(c, lang)))
  },
  async collection(lang, slug) {
    const c = CATEGORIES.find((x) => x.slug === slug)
    return c ? ok(collection(c, lang)) : { ok: false, reason: 'not-found' }
  },
  async listing(lang, query) {
    const paging = pageVariables({ page: query.page ?? undefined }, { pageSize: PAGE }) as Paging
    if (!paging.ok) return { ok: false, reason: 'bad-request' }
    const { filters, invalid } = facetValueFilters(query.facets, DICTIONARY) as unknown as { filters: Filter[]; invalid: string[] }
    const words = (query.q ?? '').trim().toLocaleLowerCase(lang)
    const found = PRODUCTS
      .filter((p) => (!query.category || p.cat === query.category) && (!words || p.name[lang].toLocaleLowerCase(lang).includes(words)))
      .filter((p) => matches(p, filters))
      .sort(ORDER[query.sort])
    const pages = pageCount(found.length, PAGE) as number
    if (paging.page > pages) return { ok: false, reason: 'not-found' }
    const facets: Facet[] = FACETS.map((f) => ({
      code: f.code, name: f.name[lang],
      values: f.values.map((v) => ({
        code: v.code, name: v.name[lang],
        count: found.filter((p) => (p.facets[f.code] ?? []).includes(v.code)).length,
        selected: (query.facets[f.code] ?? []).includes(v.code),
      })),
    }))
    const listing: Listing = { items: found.slice(paging.skip, paging.skip + paging.take).map((p) => card(p, lang)), total: found.length, page: paging.page, pages, facets, invalid }
    return ok(listing)
  },
  async cards(lang, ids) {
    return ok(ids.flatMap((id) => {
      const p = PRODUCTS.find((x) => x.id === id)
      return p ? [card(p, lang)] : []
    }))
  },
  async product(lang, id) {
    const p = PRODUCTS.find((x) => x.id === id)
    if (!p) return { ok: false, reason: 'not-found' }
    const batches = [...new Set(p.variants.map((v) => v.batch))].filter((b) => LAB_REPORTS[b])
    const product: Product = {
      id: p.id, category: p.cat, name: p.name[lang], summary: p.summary[lang], description: p.description[lang],
      images: [image(p, lang)],
      optionGroups: p.groups.map((g) => ({ code: g.code, name: g.name[lang], options: g.options.map((o) => ({ code: o.code, name: o.name[lang] })) })),
      variants: p.variants.map((v) => ({ id: v.id, sku: v.sku, name: p.name[lang], price: money(v.price), stock: v.stock, options: v.options, batch: v.batch })),
      labReports: batches.map((b) => {
        const r = LAB_REPORTS[b]
        return { batch: b, lab: r.lab, date: r.date, cbdPercent: r.cbdPercent, thcPercent: r.thcPercent, url: `#lab-${b}` }
      }),
    }
    return ok(product)
  },
  async related(lang, id, limit) {
    const p = PRODUCTS.find((x) => x.id === id)
    if (!p) return { ok: false, reason: 'not-found' }
    return ok(PRODUCTS.filter((x) => x.cat === p.cat && x.id !== id).slice(0, limit).map((x) => card(x, lang)))
  },
  async productIds() {
    return ok(PRODUCTS.map((p) => p.id))
  },
}
