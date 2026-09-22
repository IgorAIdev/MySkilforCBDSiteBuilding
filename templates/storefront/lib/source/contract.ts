import type { Lang } from '../locale.ts'

export type Money = { minor: number; currency: string }
export type Stock = 'in' | 'low' | 'out'
export type Image = { src: string; alt: string; width: number; height: number }
export type OptionGroup = { code: string; name: string; options: { code: string; name: string }[] }
export type Variant = { id: string; sku: string; name: string; price: Money; stock: Stock; options: Record<string, string>; batch: string | null }
export type LabReport = { batch: string; lab: string; date: string; cbdPercent: number; thcPercent: number; url: string }
export type Product = { id: string; category: string; name: string; summary: string; description: string; images: Image[]; optionGroups: OptionGroup[]; variants: Variant[]; labReports: LabReport[] }
export type Price = { kind: 'single'; value: Money } | { kind: 'range'; min: Money; max: Money }
export type Card = { id: string; category: string; name: string; image: Image; price: Price; stock: Stock }
export type Facet = { code: string; name: string; values: { code: string; name: string; count: number; selected: boolean }[] }
export type Collection = { slug: string; name: string; description: string }
export type SortKey = 'popular' | 'price-asc' | 'price-desc'
export type ListingQuery = { category?: string; q?: string; facets: Record<string, string[]>; sort: SortKey; page: string | null }
export type Listing = { items: Card[]; total: number; page: number; pages: number; facets: Facet[]; invalid: string[] }
export type Doc = { slug: string; title: string; summary: string; sections: { heading: string; body: string }[] }
export type Block =
  | { type: 'hero'; title: string; lede: string; cta: string }
  | { type: 'categories'; title: string }
  | { type: 'featured'; title: string; ids: string[] }
  | { type: 'lab'; title: string; body: string }
  | { type: 'delivery'; title: string; items: { title: string; body: string }[] }
  | { type: 'faq'; title: string; items: { q: string; a: string }[] }
export type Page = { slug: string; title: string; description: string; blocks: Block[] }
export type Result<T> = { ok: true; value: T } | { ok: false; reason: 'unavailable' | 'not-found' | 'bad-request' }

/** Торговля: Vendure в плане 4, образец — сейчас. */
export type Source = {
  collections(lang: Lang): Promise<Result<Collection[]>>
  collection(lang: Lang, slug: string): Promise<Result<Collection>>
  listing(lang: Lang, query: ListingQuery): Promise<Result<Listing>>
  cards(lang: Lang, ids: string[]): Promise<Result<Card[]>>
  product(lang: Lang, id: string): Promise<Result<Product>>
  related(lang: Lang, id: string, limit: number): Promise<Result<Card[]>>
  productIds(): Promise<Result<string[]>>
}

/** Содержание: Payload в плане 4, образец — сейчас. */
export type Content = {
  page(lang: Lang, slug: string): Promise<Result<Page>>
  docs(lang: Lang): Promise<Result<Doc[]>>
  doc(lang: Lang, slug: string): Promise<Result<Doc>>
}
