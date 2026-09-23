import { notFound } from 'next/navigation'
import { langOf } from '@/lib/route.ts'
import { source } from '@/lib/source/index.ts'
import { readQuery, type Params } from '@/lib/listing.ts'
import { catalogView, emptyFor } from '@/lib/catalog-view.ts'
import { hrefFor, type Query } from '@/lib/href.ts'
import { t } from '@/lib/i18n/index.ts'
import { Catalog } from '@/components/Catalog.tsx'
import { Unavailable } from '@/components/StateScreen.tsx'

type Props = { params: Promise<{ lang: string }>; searchParams: Promise<Params> }

export default async function CatalogPage({ params, searchParams }: Props) {
  const lang = await langOf(params)
  const asked = readQuery(await searchParams)
  const r = await source().listing(lang, asked)
  if (!r.ok) {
    if (r.reason === 'unavailable') return <Unavailable lang={lang} />
    notFound()
  }
  const at = (q: Query) => hrefFor(lang, { catalog: true, ...q })
  return <Catalog view={catalogView(lang, { title: t(lang, 'catalog.title'), lede: t(lang, 'catalog.lede'), listing: r.value, asked, at, filters: true, empty: emptyFor(lang, asked, at) })} />
}
