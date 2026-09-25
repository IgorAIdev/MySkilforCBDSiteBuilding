import type { Lang } from '../../locale.ts'
import type { Card, Collection, Facet, Listing, Product, Result, SortKey, Source } from '../contract.ts'
import { CATEGORIES, FACETS, LAB_REPORTS, PRODUCTS, type SampleProduct } from '../../products.ts'
import { facetValueFilters, pageVariables, pageCount } from '../vendure/core/search.mjs'
import { MARKET } from '../../market.ts'
import { overallStock } from '../stock.ts'
import { percentOf } from '../../facts.ts'
import { categoryArt, productArt, productImages, type ArtView } from './art.ts'

/* Помощники набора — JavaScript; тип их ответа записан здесь один раз. */
type Filter = { and: string } | { or: string[] }
type Paging = { ok: true; page: number; take: number; skip: number } | { ok: false }

/* Страница полки — 24 товара, как у стандартной темы Shopify: двенадцать
   товаров образца стояли двумя страницами по восемь, и полка читалась
   обрывком (разбор 24.09.2026, C4). Двадцать четыре делятся на две, три и
   четыре колонки — последний ряд страницы полный на любой ширине. */
const PAGE = 24
const ok = <T,>(value: T): Result<T> => ({ ok: true, value })
const money = (minor: number) => ({ minor, currency: MARKET.currency })
const image = (p: SampleProduct, lang: Lang) => ({ src: productArt(p.cat, p.hue, p.label), alt: p.name[lang], width: 800, height: 800 })
/* Подпись снимка — имя товара и что на снимке; у главного — одно имя. Это
   данные образца: настоящие снимки приходят из админки с готовым `alt`. */
const VIEW: Record<Exclude<ArtView, 'front'>, Record<Lang, string>> = {
  back: { ro: 'eticheta din spate', en: 'the back label', hu: 'a hátoldali címke' },
  box: { ro: 'cu cutia', en: 'with its box', hu: 'dobozzal' },
  detail: { ro: 'detaliu', en: 'close-up', hu: 'közelről' },
}
/* Задник этикетки образца: подпись, состав по полке, партия. */
const INSIDE: Record<string, string> = { uleiuri: 'hemp extract · MCT oil', capsule: 'hemp extract · vegan', cosmetice: 'CBD · shea · menthol', animale: 'hemp extract · salmon oil' }
const images = (p: SampleProduct, lang: Lang) =>
  productImages(p.cat, p.hue, p.label, [p.label, INSIDE[p.cat] ?? 'hemp extract', `lot ${p.variants[0].batch}`]).map(({ view, src }) => ({
    src, alt: view === 'front' ? p.name[lang] : `${p.name[lang]}, ${VIEW[view][lang]}`, width: 800, height: 800,
  }))
const low = (p: SampleProduct) => Math.min(...p.variants.map((v) => v.price))

function card(p: SampleProduct, lang: Lang): Card {
  const prices = p.variants.map((v) => v.price)
  const [min, max] = [Math.min(...prices), Math.max(...prices)]
  return {
    id: p.id, category: p.cat, name: p.name[lang], image: image(p, lang),
    price: min === max ? { kind: 'single', value: money(min) } : { kind: 'range', min: money(min), max: money(max) },
    was: min === max && p.variants.length === 1 && p.variants[0].was ? money(p.variants[0].was) : null,
    variant: p.variants.length === 1 ? p.variants[0].id : null,
    stock: overallStock(p.variants.map((v) => v.stock)),
    strength: p.strength, packs: p.variants.map((v) => v.pack),
  }
}

/* Грани товара. Форма набрана в данных; концентрация выводится из упаковок
   той же функцией, что печатает её на карточке (`percentOf`), — и только у
   того, что продаётся концентрацией. Набранная рукой, она расходилась с
   этикеткой (products.ts, `SampleProduct`). */
const facetsOf = (p: SampleProduct): Record<string, string[]> => {
  const putere = p.strength === 'percent' ? [...new Set(p.variants.map((v) => percentOf(v.pack)).filter((x) => x !== null))].map(String) : []
  return putere.length ? { ...p.facets, putere } : p.facets
}

/* Словарь «код → id» — как у адаптера Vendure; в образце id — это «грань:значение». */
const DICTIONARY = Object.fromEntries(FACETS.map((f) => [f.code, Object.fromEntries(f.values.map((v) => [v.code, `${f.code}:${v.code}`]))]))
const carries = (p: SampleProduct, id: string) => {
  const [facet, value] = id.split(':')
  return (facetsOf(p)[facet] ?? []).includes(value)
}
const matches = (p: SampleProduct, filters: Filter[]) =>
  filters.every((f) => ('and' in f ? carries(p, f.and) : f.or.some((id) => carries(p, id))))

const ORDER: Record<SortKey, (a: SampleProduct, b: SampleProduct) => number> = {
  'popular': (a, b) => a.popular - b.popular,
  'price-asc': (a, b) => low(a) - low(b) || a.popular - b.popular,
  'price-desc': (a, b) => low(b) - low(a) || a.popular - b.popular,
}

const collection = (c: (typeof CATEGORIES)[number], lang: Lang): Collection => ({
  slug: c.slug, name: c.name[lang], description: c.description[lang],
  image: { src: categoryArt(c.slug), alt: c.name[lang], width: 800, height: 600 }, sign: c.sign,
})

type Filtered = { filters: Filter[]; invalid: string[] }
const filtersOf = (facets: Record<string, string[]>) => facetValueFilters(facets, DICTIONARY) as unknown as Filtered
const without = (facets: Record<string, string[]>, code: string) => Object.fromEntries(Object.entries(facets).filter(([k]) => k !== code))

/** Образец торговли. Размер страницы — ручкой: полка образца держит одну
 *  страницу, а листание проверяется тестом на странице поменьше. */
export function sampleSource(pageSize = PAGE): Source {
  return {
    async collections(lang) {
      return ok(CATEGORIES.map((c) => collection(c, lang)))
    },
    async collection(lang, slug) {
      const c = CATEGORIES.find((x) => x.slug === slug)
      return c ? ok(collection(c, lang)) : { ok: false, reason: 'not-found' }
    },
    async listing(lang, query) {
      const paging = pageVariables({ page: query.page ?? undefined }, { pageSize }) as Paging
      if (!paging.ok) return { ok: false, reason: 'bad-request' }
      const { filters, invalid } = filtersOf(query.facets)
      const words = (query.q ?? '').trim().toLocaleLowerCase(lang)
      const pool = PRODUCTS.filter((p) => (!query.category || p.cat === query.category) && (!words || p.name[lang].toLocaleLowerCase(lang).includes(words)))
      const found = pool.filter((p) => matches(p, filters)).sort(ORDER[query.sort])
      const pages = pageCount(found.length, pageSize) as number
      if (paging.page > pages) return { ok: false, reason: 'not-found' }
      /* Счёт значения — против всех граней, КРОМЕ своей (cbd-facet, §3): «Масло»
         выбрано — «Капсулы» считаются так, будто формы не выбирали, и остаются
         выбором «или», а не нулём. */
      const facets: Facet[] = FACETS.map((f) => {
        const others = pool.filter((p) => matches(p, filtersOf(without(query.facets, f.code)).filters))
        return {
          code: f.code, name: f.name[lang],
          values: f.values.map((v) => ({
            code: v.code, name: v.name[lang],
            count: others.filter((p) => (facetsOf(p)[f.code] ?? []).includes(v.code)).length,
            selected: (query.facets[f.code] ?? []).includes(v.code),
          })),
        }
      })
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
        id: p.id, category: p.cat, brand: p.brand, name: p.name[lang], summary: p.summary[lang], description: p.description[lang],
        images: images(p, lang),
        optionGroups: p.groups.map((g) => ({ code: g.code, name: g.name[lang], options: g.options.map((o) => ({ code: o.code, name: o.name[lang] })) })),
        variants: p.variants.map((v) => ({ id: v.id, sku: v.sku, name: p.name[lang], price: money(v.price), was: v.was ? money(v.was) : null, stock: v.stock, options: v.options, batch: v.batch, pack: v.pack })),
        labReports: batches.map((b) => {
          const r = LAB_REPORTS[b]
          return { batch: b, lab: r.lab, date: r.date, cbdPercent: r.cbdPercent, thcPercent: r.thcPercent, url: `#lab-${b}` }
        }),
        strength: p.strength,
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
}

export const sample: Source = sampleSource()
