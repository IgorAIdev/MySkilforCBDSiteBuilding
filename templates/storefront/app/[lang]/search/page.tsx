import { notFound } from 'next/navigation'
import p from '@/styles/primitives.module.css'
import { langOf } from '@/lib/route.ts'
import { source } from '@/lib/source/index.ts'
import { first, type Asked, type Params } from '@/lib/listing.ts'
import { catalogView } from '@/lib/catalog-view.ts'
import { hrefFor, type Query } from '@/lib/href.ts'
import { t } from '@/lib/i18n/index.ts'
import { Catalog } from '@/components/Catalog.tsx'
import { SearchForm } from '@/components/SearchForm.tsx'
import { Unavailable } from '@/components/StateScreen.tsx'

type Props = { params: Promise<{ lang: string }>; searchParams: Promise<Params> }

export default async function SearchPage({ params, searchParams }: Props) {
  const lang = await langOf(params)
  const sp = await searchParams
  const q = (first(sp.q) ?? '').trim()
  const form = <SearchForm action={hrefFor(lang, { search: '' })} q={q} label={t(lang, 'search.label')} submit={t(lang, 'search.submit')} />
  if (!q) {
    return (
      <main id="main" className={`${p.wrap} ${p.section}`}>
        <div className={p.pagehead}><h1>{t(lang, 'nav.search')}</h1><p>{t(lang, 'search.prompt')}</p></div>
        {form}
      </main>
    )
  }
  const asked: Asked = { facets: {}, sort: 'popular', page: first(sp.page) }
  const r = await source().listing(lang, { q, ...asked })
  if (!r.ok) {
    if (r.reason === 'unavailable') return <Unavailable lang={lang} />
    notFound()
  }
  const at = (query: Query) => hrefFor(lang, { search: q, page: query.page })
  const empty = { title: t(lang, 'search.none', { q }), step: t(lang, 'search.noneStep'), href: hrefFor(lang, { catalog: true }) }
  return <Catalog view={catalogView(lang, { title: t(lang, 'search.results', { q }), lede: null, listing: r.value, asked, at, filters: false, empty })} top={form} />
}
