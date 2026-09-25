import type { Lang } from '../../locale.ts'
import type { Card, Collection, Facet, Image, Listing, ListingQuery, Money, OptionGroup, Pack, Product, Result, SortKey, Source, Stock, Strength, Variant } from '../contract.ts'
import { shopFetch } from './core/request.mjs'
import { facetValueFilters, pageVariables, pageCount } from './core/search.mjs'
import { assetImage, type Asset } from './image.ts'
import { displayOptionGroups } from './core/product.mjs'
import { overallStock } from '../stock.ts'

/* Торговля из Vendure Shop API (план 4, торговая половина): каталог — этим
   файлом, покупка — commerce.ts рядом. Переходник превращает ответы движка в
   ту же форму данных, что у образца (lib/source/contract.ts), и ни одного
   решения о виде в себе не держит (CLAUDE.md, «Переносимость»).

   Что откуда (движок cbdin, Vendure 3.7, снято 25.09.2026):
   · адрес товара — slug на языке канала по умолчанию: он один на все языки
     витрины, а движок находит товар по slug любого своего языка;
   · полка — коллекция верхнего уровня, тем же slug языка канала;
   · грани — грани движка кодами; счёт значения — против всех граней, кроме
     своей (cbd-facet, §3): отдельным запросом на грань;
   · прежняя цена — поле товара `wasPrice` (в центах, как всякая цена);
   · упаковка — поля товара `volume` («10ml», «30 capsules») и `strength`
     («1000mg»): числа, а не слова, — строка фактов и грань силы считают их
     одной арифметикой (lib/facts.ts);
   · партии и протоколов у движка нет — `batch: null`, `labReports: []`:
     блок протокола молчит (shop, «Блок, обещающий факт, спрашивает флаг»).

   Язык витрины, которого у канала нет (у cbdin — bg и en; у витрины — ro,
   en, hu), спрашивается запасным языком `VENDURE_FALLBACK_LANG` (en): иначе
   движок молча ответит языком канала — болгарским на румынской странице. */

/* Помощники набора — JavaScript; тип их ответа записан здесь один раз. */
type Fetched<T> = { ok: true; data: T } | { ok: false; kind: string; message: string }
type Paging = { ok: true; page: number; take: number; skip: number } | { ok: false }
type Filter = { and: string } | { or: string[] }

type Translation = { languageCode: string; slug: string }
type VCollection = { id: string; slug: string; name: string; description: string; featuredAsset: Asset | null; translations: Translation[] }
type VProduct = {
  id: string; name: string; slug: string; description: string
  translations: Translation[]
  featuredAsset: Asset | null; assets: Asset[]
  collections: { id: string; slug: string; translations: Translation[] }[]
  facetValues: { code: string; facet: { code: string } }[]
  customFields: { brand?: string | null; volume?: string | null; strength?: string | null; wasPrice?: number | null; seoDescription?: string | null } | null
  optionGroups: { id: string; code: string; name: string; options: { id: string; code: string; name: string }[] }[]
  variants: { id: string; sku: string; name: string; priceWithTax: number; stockLevel: string; options: { id: string; code: string; group: { code: string } }[] }[]
}
type Hit = { productId: string }
type FacetCount = { count: number; facetValue: { id: string; code: string; name: string; facet: { id: string; code: string; name: string } } }
type SearchData = { search: { totalItems: number; items: Hit[]; facetValues: FacetCount[] } }
type Channel = { defaultLanguageCode: string; availableLanguageCodes: string[]; defaultCurrencyCode: string }

const PAGE = 24
/** Сколько секунд ответ движка живёт в кэше страницы. Обновление раньше —
 *  тегом `catalog` через POST /api/revalidate. */
const FRESH = 60
const ASSET = `preview width height focalPoint { x y }`
const PRODUCT = `
  id name slug description
  translations { languageCode slug }
  featuredAsset { ${ASSET} } assets { ${ASSET} }
  collections { id slug translations { languageCode slug } }
  facetValues { code facet { code } }
  customFields { brand volume strength wasPrice seoDescription }
  optionGroups { id code name options { id code name } }
  variants { id sku name priceWithTax stockLevel options { id code group { code } } }
`
const SEARCH = `query ($input: SearchInput!) { search(input: $input) {
  totalItems
  items { productId }
  facetValues { count facetValue { id code name facet { id code name } } }
} }`
const COUNTS = `query ($input: SearchInput!) { search(input: $input) { facetValues { count facetValue { id code name facet { id code name } } } } }`

/** Настройки подключения — из окружения сервера, не из браузера. */
export type VendureEnv = { apiUrl: string; channelToken: string; fallbackLang: string }
export function vendureEnv(env: Record<string, string | undefined> = process.env): VendureEnv {
  const apiUrl = env.VENDURE_SHOP_API_URL ?? ''
  const channelToken = env.VENDURE_CHANNEL_TOKEN ?? ''
  if (!apiUrl || !channelToken) throw new Error('SOURCE=vendure: нужны VENDURE_SHOP_API_URL и VENDURE_CHANNEL_TOKEN (.env)')
  return { apiUrl, channelToken, fallbackLang: env.VENDURE_FALLBACK_LANG || 'en' }
}

const STOCK: Record<string, Stock> = { IN_STOCK: 'in', LOW_STOCK: 'low', OUT_OF_STOCK: 'out' }
const stockOf = (level: string): Stock => STOCK[level] ?? 'in'

/** Штуки движок пишет словом своего языка («30 capsules», «30 капсули»). */
/* Конец слова — не `\b`: граница `\b` знает только латиницу, после
   «капсули» её нет. */
const PIECES = /^(\d+)\s*(capsules?|caps|softgels?|pcs|pieces|ct|gummies|капсули|бр|броя|таблетки|бонбони?)(?!\p{L})/iu
const MEASURE = /^(\d+(?:[.,]\d+)?)\s*(ml|g)$/i
/** Упаковка из полей товара движка: мера из `volume`, CBD — из `strength`.
 *  Не разобралось — мера неизвестна, и строки фактов нет: лучше промолчать,
 *  чем напечатать выдуманное число. */
export function packOf(volume: string | null | undefined, strength: string | null | undefined): Pack | null {
  const raw = (volume ?? '').trim()
  const mgMatch = /(\d+(?:[.,]\d+)?)\s*mg/i.exec(strength ?? '')
  const mg = mgMatch ? Number(mgMatch[1].replace(',', '.')) : null
  const pieces = PIECES.exec(raw)
  if (pieces) return { mg, size: Number(pieces[1]), unit: 'pcs' }
  const measure = MEASURE.exec(raw)
  if (measure) return { mg, size: Number(measure[1].replace(',', '.')), unit: measure[2].toLowerCase() as 'ml' | 'g' }
  return null
}

/** Чем товар продаётся (cbd-facet, §1): масла — концентрацией, остальное —
 *  содержанием. Полку движок называет гранью `category`. */
const PERCENT_SHELVES = new Set(['oil', 'oils', 'pets'])
const strengthOf = (p: VProduct, pack: Pack | null): Strength =>
  pack?.unit === 'ml' && p.facetValues.some((v) => v.facet.code === 'category' && PERCENT_SHELVES.has(v.code)) ? 'percent' : 'mg'

/** Постоянный адрес — slug языка канала по умолчанию. */
const nativeSlug = (c: Channel, item: { slug: string; translations: Translation[] }) =>
  item.translations.find((t) => t.languageCode === c.defaultLanguageCode)?.slug ?? item.slug
const money = (c: Channel, minor: number): Money => ({ minor, currency: c.defaultCurrencyCode })
/** Снимок товара и полки — сервером снимков движка (image.ts). */
const image = (asset: Asset | null, alt: string): Image | null => (asset ? assetImage(asset, alt, 800) : null)
const NO_IMAGE: Image = { src: '', alt: '', width: 800, height: 800 }

export function vendureSource(env: VendureEnv, fetchImpl: typeof fetch = globalThis.fetch): Source {
  const ask = async <T,>(query: string, variables: Record<string, unknown>, languageCode?: string): Promise<Fetched<T>> =>
    shopFetch({ apiUrl: env.apiUrl, query, variables, channelToken: env.channelToken, languageCode }, { fetch: fetchImpl, init: { next: { revalidate: FRESH, tags: ['catalog'] } } }) as Promise<Fetched<T>>

  let channel: Promise<Channel | null> | null = null
  const channelOf = () => (channel ??= ask<{ activeChannel: Channel }>(`{ activeChannel { defaultLanguageCode availableLanguageCodes defaultCurrencyCode } }`, {})
    .then((r) => (r.ok ? r.data.activeChannel : null))
    .then((c) => { if (!c) channel = null; return c }))
  /** Язык запроса движку: язык страницы, если он у канала есть, иначе запасной. */
  const speak = async (lang: Lang): Promise<string | null> => {
    const c = await channelOf()
    if (!c) return null
    return c.availableLanguageCodes.includes(lang) ? lang : c.availableLanguageCodes.includes(env.fallbackLang) ? env.fallbackLang : c.defaultLanguageCode
  }
  const cardOf = (c: Channel, p: VProduct): Card => {
    const prices = p.variants.map((v) => v.priceWithTax)
    const [min, max] = [Math.min(...prices), Math.max(...prices)]
    const pack = packOf(p.customFields?.volume, p.customFields?.strength)
    const was = p.customFields?.wasPrice
    return {
      id: nativeSlug(c, p), category: p.collections[0] ? nativeSlug(c, p.collections[0]) : '', name: p.name,
      image: image(p.featuredAsset, p.name) ?? NO_IMAGE,
      price: min === max ? { kind: 'single', value: money(c, min) } : { kind: 'range', min: money(c, min), max: money(c, max) },
      was: min === max && typeof was === 'number' && was > min ? money(c, was) : null,
      variant: p.variants.length === 1 ? p.variants[0].id : null,
      stock: overallStock(p.variants.map((v) => stockOf(v.stockLevel))),
      strength: strengthOf(p, pack), packs: pack ? p.variants.map(() => pack) : [],
    }
  }

  /** Товары движка по id — одним запросом, в порядке ids. */
  const productsById = async (languageCode: string, ids: string[]): Promise<VProduct[] | null> => {
    if (!ids.length) return []
    const r = await ask<{ products: { items: VProduct[] } }>(`query ($ids: [String!]!, $take: Int) { products(options: { filter: { id: { in: $ids } }, take: $take }) { items { ${PRODUCT} } } }`, { ids, take: ids.length }, languageCode)
    if (!r.ok) return null
    const byId = new Map(r.data.products.items.map((p) => [p.id, p]))
    return ids.flatMap((id) => byId.get(id) ?? [])
  }
  const bySlug = async (languageCode: string, slug: string): Promise<Result<VProduct>> => {
    const r = await ask<{ product: VProduct | null }>(`query ($slug: String!) { product(slug: $slug) { ${PRODUCT} } }`, { slug }, languageCode)
    if (!r.ok) return { ok: false, reason: 'unavailable' }
    return r.data.product ? { ok: true, value: r.data.product } : { ok: false, reason: 'not-found' }
  }

  const collectionsRaw = async (languageCode: string): Promise<VCollection[] | null> => {
    const r = await ask<{ collections: { items: VCollection[] } }>(`{ collections(options: { topLevelOnly: true, take: 100 }) { items { id slug name description featuredAsset { ${ASSET} } translations { languageCode slug } } } }`, {}, languageCode)
    return r.ok ? r.data.collections.items : null
  }
  const collectionOf = (c: Channel, x: VCollection): Collection => ({
    slug: nativeSlug(c, x), name: x.name, description: x.description.replace(/<[^>]*>/g, '').trim(),
    image: image(x.featuredAsset, x.name),
    /* Знак полки — поле коллекции в движке; у Vendure его пока нет (И422). */
    sign: null,
  })

  const SORT: Record<SortKey, Record<string, 'ASC' | 'DESC'> | undefined> = { popular: undefined, 'price-asc': { price: 'ASC' }, 'price-desc': { price: 'DESC' } }

  return {
    async collections(lang) {
      const [c, languageCode] = [await channelOf(), await speak(lang)]
      if (!c || !languageCode) return { ok: false, reason: 'unavailable' }
      const list = await collectionsRaw(languageCode)
      return list ? { ok: true, value: list.map((x) => collectionOf(c, x)) } : { ok: false, reason: 'unavailable' }
    },
    async collection(lang, slug) {
      const [c, languageCode] = [await channelOf(), await speak(lang)]
      if (!c || !languageCode) return { ok: false, reason: 'unavailable' }
      const list = await collectionsRaw(languageCode)
      if (!list) return { ok: false, reason: 'unavailable' }
      const x = list.find((y) => nativeSlug(c, y) === slug)
      return x ? { ok: true, value: collectionOf(c, x) } : { ok: false, reason: 'not-found' }
    },
    async listing(lang, query: ListingQuery) {
      const paging = pageVariables({ page: query.page ?? undefined }, { pageSize: PAGE }) as Paging
      if (!paging.ok) return { ok: false, reason: 'bad-request' }
      const [c, languageCode] = [await channelOf(), await speak(lang)]
      if (!c || !languageCode) return { ok: false, reason: 'unavailable' }
      let collectionId: string | undefined
      if (query.category) {
        const list = await collectionsRaw(languageCode)
        if (!list) return { ok: false, reason: 'unavailable' }
        collectionId = list.find((y) => nativeSlug(c, y) === query.category)?.id
        if (!collectionId) return { ok: false, reason: 'not-found' }
      }
      const base = { groupByProduct: true, ...(collectionId ? { collectionId } : {}), ...(query.q?.trim() ? { term: query.q.trim() } : {}) }
      /* Словарь «код → id» — из граней той же выборки без фильтров: коды
         стабильны, id у разработки и боя разные (references/vendure.md). */
      const all = await ask<SearchData>(COUNTS, { input: { ...base, take: 0 } }, languageCode)
      if (!all.ok) return { ok: false, reason: 'unavailable' }
      const known = all.data.search.facetValues.map((f) => f.facetValue)
      const dictionary: Record<string, Record<string, string>> = {}
      for (const v of known) (dictionary[v.facet.code] ??= {})[v.code] = v.id
      const filtered = (facets: Record<string, string[]>) => facetValueFilters(facets, dictionary) as unknown as { filters: Filter[]; invalid: string[] }
      const { filters, invalid } = filtered(query.facets)
      const found = await ask<SearchData>(SEARCH, { input: { ...base, facetValueFilters: filters, take: paging.take, skip: paging.skip, ...(SORT[query.sort] ? { sort: SORT[query.sort] } : {}) } }, languageCode)
      if (!found.ok) return { ok: false, reason: 'unavailable' }
      const total = found.data.search.totalItems
      const pages = pageCount(total, PAGE) as number
      if (paging.page > pages) return { ok: false, reason: 'not-found' }
      /* Счёт значения — против всех граней, КРОМЕ своей (cbd-facet, §3). */
      const codes = [...new Set(known.map((v) => v.facet.code))]
      const counted = await Promise.all(codes.map(async (code) => {
        const others = Object.fromEntries(Object.entries(query.facets).filter(([k]) => k !== code))
        const r = await ask<SearchData>(COUNTS, { input: { ...base, facetValueFilters: filtered(others).filters, take: 0 } }, languageCode)
        return r.ok ? r.data.search.facetValues.filter((f) => f.facetValue.facet.code === code) : null
      }))
      if (counted.some((x) => x === null)) return { ok: false, reason: 'unavailable' }
      const facets: Facet[] = codes.map((code, i) => {
        const first = known.find((v) => v.facet.code === code)!
        return {
          code, name: first.facet.name,
          values: known.filter((v) => v.facet.code === code).map((v) => ({
            code: v.code, name: v.name,
            count: counted[i]!.find((f) => f.facetValue.id === v.id)?.count ?? 0,
            selected: (query.facets[code] ?? []).includes(v.code),
          })),
        }
      })
      const products = await productsById(languageCode, found.data.search.items.map((h) => h.productId))
      if (!products) return { ok: false, reason: 'unavailable' }
      /* Карточка — из товара целиком: цена его вариантов та же, что у поиска
         (`priceWithTax`), и «от» у диапазона считает `cardOf` одинаково на
         полке, в ходовых и в похожих. */
      const listing: Listing = { items: products.map((p) => cardOf(c, p)), total, page: paging.page, pages, facets, invalid }
      return { ok: true, value: listing }
    },
    async cards(lang, ids) {
      const [c, languageCode] = [await channelOf(), await speak(lang)]
      if (!c || !languageCode) return { ok: false, reason: 'unavailable' }
      const found = await Promise.all(ids.map((id) => bySlug(languageCode, id)))
      if (found.some((r) => !r.ok && r.reason === 'unavailable')) return { ok: false, reason: 'unavailable' }
      return { ok: true, value: found.flatMap((r) => (r.ok ? [cardOf(c, r.value)] : [])) }
    },
    async product(lang, id) {
      const [c, languageCode] = [await channelOf(), await speak(lang)]
      if (!c || !languageCode) return { ok: false, reason: 'unavailable' }
      const r = await bySlug(languageCode, id)
      if (!r.ok) return r
      const p = r.value
      const text = p.description.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
      const was = p.customFields?.wasPrice
      const shown = displayOptionGroups(p) as VProduct['optionGroups']
      /* Упаковка — поле товара движка, одна на все его варианты, как у
         карточки полки (`packs` выше). */
      const pack = packOf(p.customFields?.volume, p.customFields?.strength)
      const product: Product = {
        id: nativeSlug(c, p), category: p.collections[0] ? nativeSlug(c, p.collections[0]) : '', brand: p.customFields?.brand?.trim() || null, name: p.name,
        summary: p.customFields?.seoDescription?.trim() || text.split(/(?<=[.!?])\s/)[0] || '',
        description: text,
        images: [p.featuredAsset, ...p.assets.filter((a) => a.preview !== p.featuredAsset?.preview)].flatMap((a) => (a ? [image(a, p.name)!] : [])),
        optionGroups: shown.map((g): OptionGroup => ({ code: g.code, name: g.name, options: g.options.map((o) => ({ code: o.code, name: o.name })) })),
        variants: p.variants.map((v): Variant => ({
          id: v.id, sku: v.sku, name: p.name, price: money(c, v.priceWithTax),
          was: typeof was === 'number' && was > v.priceWithTax ? money(c, was) : null,
          stock: stockOf(v.stockLevel), options: Object.fromEntries(v.options.map((o) => [o.group.code, o.code])), batch: null, pack,
        })),
        labReports: [], strength: strengthOf(p, pack),
      }
      return { ok: true, value: product }
    },
    async related(lang, id, limit) {
      const [c, languageCode] = [await channelOf(), await speak(lang)]
      if (!c || !languageCode) return { ok: false, reason: 'unavailable' }
      const r = await bySlug(languageCode, id)
      if (!r.ok) return r
      const collectionId = r.value.collections[0]?.id
      if (!collectionId) return { ok: true, value: [] }
      const found = await ask<SearchData>(SEARCH, { input: { groupByProduct: true, collectionId, take: limit + 1 } }, languageCode)
      if (!found.ok) return { ok: false, reason: 'unavailable' }
      const ids = found.data.search.items.map((h) => h.productId).filter((x) => x !== r.value.id).slice(0, limit)
      const products = await productsById(languageCode, ids)
      return products ? { ok: true, value: products.map((p) => cardOf(c, p)) } : { ok: false, reason: 'unavailable' }
    },
    async productIds() {
      const c = await channelOf()
      if (!c) return { ok: false, reason: 'unavailable' }
      type Page = { products: { totalItems: number; items: { slug: string; translations: Translation[] }[] } }
      const page = (skip: number) => ask<Page>(`query ($skip: Int!) { products(options: { take: 100, skip: $skip }) { totalItems items { slug translations { languageCode slug } } } }`, { skip }, c.defaultLanguageCode)
      /* Первая страница называет число товаров; остальные — разом. */
      const first = await page(0)
      if (!first.ok) return { ok: false, reason: 'unavailable' }
      const rest = await Promise.all(Array.from({ length: Math.ceil(first.data.products.totalItems / 100) - 1 }, (_, i) => page((i + 1) * 100)))
      if (rest.some((r) => !r.ok)) return { ok: false, reason: 'unavailable' }
      const pages = [first, ...rest].flatMap((r) => (r.ok ? r.data.products.items : []))
      return { ok: true, value: pages.map((p) => nativeSlug(c, p)) }
    },
  }
}
