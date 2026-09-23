import { notFound } from 'next/navigation'
import p from '@/styles/primitives.module.css'
import { langOf } from '@/lib/route.ts'
import { source } from '@/lib/source/index.ts'
import type { Params } from '@/lib/listing.ts'
import { readSelection } from '@/lib/variant.ts'
import { productView } from '@/lib/product-view.ts'
import { ProductView } from '@/components/ProductView.tsx'
import { Unavailable } from '@/components/StateScreen.tsx'

type Props = { params: Promise<{ lang: string; id: string }>; searchParams: Promise<Params> }

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
      <ProductView view={view} />
    </main>
  )
}
