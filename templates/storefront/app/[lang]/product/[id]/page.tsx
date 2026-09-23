import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import p from '@/styles/primitives.module.css'
import { langOf } from '@/lib/route.ts'
import { source } from '@/lib/source/index.ts'
import type { Params } from '@/lib/listing.ts'
import { readSelection, pickState } from '@/lib/variant.ts'
import { productView } from '@/lib/product-view.ts'
import { hrefFor } from '@/lib/href.ts'
import { toMetadata } from '@/lib/seo.ts'
import { productLd, breadcrumbLd } from '@/lib/ld.ts'
import { cartSubmit, cartCall } from '@/lib/actions/cart.ts'
import { ProductView } from '@/components/ProductView.tsx'
import { JsonLd } from '@/components/JsonLd.tsx'
import { Unavailable } from '@/components/StateScreen.tsx'

type Props = { params: Promise<{ lang: string; id: string }>; searchParams: Promise<Params> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const lang = await langOf(params)
  const { id } = await params
  const r = await source().product(lang, id)
  if (!r.ok) return {}
  return toMetadata(lang, { title: r.value.name, description: r.value.summary, path: (l) => hrefFor(l, { product: id }) })
}

export default async function ProductPage({ params, searchParams }: Props) {
  const lang = await langOf(params)
  const { id } = await params
  const r = await source().product(lang, id)
  if (!r.ok) {
    if (r.reason === 'unavailable') return <Unavailable lang={lang} />
    notFound()
  }
  const product = r.value
  const selected = readSelection(await searchParams, product)
  const [col, related] = await Promise.all([source().collection(lang, product.category), source().related(lang, id, 4)])
  const view = productView(lang, product, selected, { category: col.ok ? col.value : null, related: related.ok ? related.value : [] })
  return (
    <main id="main" className={p.wrap}>
      <JsonLd data={productLd(product, pickState(product, selected).variant ?? (product.variants.length === 1 ? product.variants[0] : null))} />
      <JsonLd data={breadcrumbLd(view.crumbs.map((c) => ({ name: c.name, href: c.href ?? hrefFor(lang, { product: id }) })))} />
      <ProductView view={view} lang={lang} submit={cartSubmit} call={cartCall} />
    </main>
  )
}
