import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { langOf } from '@/lib/route.ts'
import { source } from '@/lib/source/index.ts'
import { first, type Asked, type Params } from '@/lib/listing.ts'
import type { Listing } from '@/lib/source/contract.ts'
import { catalogView } from '@/lib/catalog-view.ts'
import { hrefFor, type Query } from '@/lib/href.ts'
import { t } from '@/lib/i18n/index.ts'
import { toMetadata } from '@/lib/seo.ts'
import { Catalog } from '@/components/Catalog.tsx'
import { SearchForm } from '@/components/SearchForm.tsx'
import { Unavailable } from '@/components/StateScreen.tsx'

type Props = { params: Promise<{ lang: string }>; searchParams: Promise<Params> }

/* Лучшее магазина под пустым поиском — один ряд полки на столе. */
const BEST = 4
const NOTHING: Listing = { items: [], total: 0, page: 1, pages: 1, facets: [], invalid: [] }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const lang = await langOf(params)
  return toMetadata(lang, { title: t(lang, 'nav.search'), description: t(lang, 'search.label'), path: (l) => hrefFor(l, { search: '' }), index: false })
}

/* Поиск — та же полка, что каталог (components/Catalog.tsx): поле в шапке
   страницы, счёт строкой над полкой. Пусто — заголовок страницы сам говорит
   «ничего не нашлось» (второго заголовка «пусто» нет, разбор Q4), дальше —
   шаг ко всем товарам и лучшее магазина полкой: пустой экран не тупик. */
export default async function SearchPage({ params, searchParams }: Props) {
  const lang = await langOf(params)
  const sp = await searchParams
  const q = (first(sp.q) ?? '').trim()
  const asked: Asked = { facets: {}, sort: 'popular', page: q ? first(sp.page) : null }
  const r = q ? await source().listing(lang, { q, ...asked }) : null
  if (r && !r.ok) {
    if (r.reason === 'unavailable') return <Unavailable lang={lang} />
    notFound()
  }
  const listing = r?.value ?? NOTHING
  const best = listing.total ? null : await source().listing(lang, { facets: {}, sort: 'popular', page: null })
  const at = (query: Query) => hrefFor(lang, { search: q, page: query.page })
  const title = !q ? t(lang, 'nav.search') : listing.total ? t(lang, 'search.results', { q }) : t(lang, 'search.none', { q })
  const empty = { title: null, step: t(lang, q ? 'search.noneStep' : 'catalog.emptyStep'), href: hrefFor(lang, { catalog: true }) }
  const more = best?.ok ? { title: t(lang, 'shelf.popular'), cards: best.value.items.slice(0, BEST) } : null
  const view = catalogView(lang, { title, lede: q ? null : t(lang, 'search.prompt'), listing, asked, at, filters: false, empty, more })
  return <Catalog view={view} search={<SearchForm action={hrefFor(lang, { search: '' })} q={q} label={t(lang, 'search.label')} submit={t(lang, 'search.submit')} />} />
}
