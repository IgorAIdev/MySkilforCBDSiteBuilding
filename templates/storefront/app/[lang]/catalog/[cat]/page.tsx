import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { langOf } from '@/lib/route.ts'
import { source } from '@/lib/source/index.ts'
import { readQuery, type Params } from '@/lib/listing.ts'
import { catalogView, emptyFor } from '@/lib/catalog-view.ts'
import { hrefFor, type Query } from '@/lib/href.ts'
import { toMetadata } from '@/lib/seo.ts'
import { cartSubmit, cartCall } from '@/lib/actions/cart.ts'
import { Catalog } from '@/components/Catalog.tsx'
import { Unavailable } from '@/components/StateScreen.tsx'

type Props = { params: Promise<{ lang: string; cat: string }>; searchParams: Promise<Params> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const lang = await langOf(params)
  const { cat } = await params
  const col = await source().collection(lang, cat)
  if (!col.ok) return {}
  return toMetadata(lang, { title: col.value.name, description: col.value.description, path: (l) => hrefFor(l, { category: cat }) })
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const lang = await langOf(params)
  const { cat } = await params
  const asked = readQuery(await searchParams)
  const [col, r] = await Promise.all([source().collection(lang, cat), source().listing(lang, { category: cat, ...asked })])
  if (!col.ok && col.reason === 'not-found') notFound()
  if (!r.ok && r.reason !== 'unavailable') notFound()
  if (!col.ok || !r.ok) return <Unavailable lang={lang} />
  const at = (q: Query) => hrefFor(lang, { category: cat, ...q })
  return <Catalog view={catalogView(lang, { title: col.value.name, lede: col.value.description, listing: r.value, asked, at, filters: true, empty: emptyFor(lang, asked, at) })} cart={{ submit: cartSubmit, call: cartCall }} />
}
