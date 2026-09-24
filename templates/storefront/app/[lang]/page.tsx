import type { Metadata } from 'next'
import { langOf } from '@/lib/route.ts'
import { source, content, commerce } from '@/lib/source/index.ts'
import { shelfCard } from '@/lib/view.ts'
import { deliveryView } from '@/lib/checkout-view.ts'
import { hrefFor } from '@/lib/href.ts'
import { toMetadata } from '@/lib/seo.ts'
import { organizationLd, websiteLd } from '@/lib/ld.ts'
import { COMPANY_IS_REAL } from '@/lib/flags.ts'
import { Blocks } from '@/components/blocks/registry.tsx'
import { JsonLd } from '@/components/JsonLd.tsx'
import { Unavailable } from '@/components/StateScreen.tsx'
import type { BlockCtx } from '@/components/blocks/types.ts'

type Props = { params: Promise<{ lang: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const lang = await langOf(params)
  const page = await content().page(lang, 'home')
  if (!page.ok) return {}
  return toMetadata(lang, { title: page.value.title, description: page.value.description, path: (l) => hrefFor(l, { home: true }) })
}

export default async function Home({ params }: Props) {
  const lang = await langOf(params)
  const page = await content().page(lang, 'home')
  if (!page.ok) return <Unavailable lang={lang} />
  const ids = page.value.blocks.flatMap((b) => (b.type === 'featured' ? b.ids : []))
  /* Способы доставки — тот же список, что выбор на оформлении (И95); и
     страница условий доставки — та, что просит таблицу способов. Молчит
     источник покупки — блок стоит без строк способов, а не падает. */
  const [cols, cards, methods, docs] = await Promise.all([
    source().collections(lang), source().cards(lang, ids),
    commerce().deliveryMethods(null, lang), content().docs(lang),
  ])
  if (!cols.ok || !cards.ok) return <Unavailable lang={lang} />
  const terms = docs.ok ? docs.value.find((d) => d.table === 'delivery') : undefined
  const ctx: BlockCtx = {
    lang, collections: cols.value, cards: Object.fromEntries(cards.value.map((c) => [c.id, shelfCard(lang, c)])),
    delivery: {
      methods: methods.ok ? deliveryView(lang, { methods: methods.value, delivery: null, pickup: null }).methods : [],
      terms: terms ? hrefFor(lang, { doc: terms.slug }) : null,
    },
  }
  return (
    <main id="main">
      {/* Сведения об организации машина читает как факт: образец компании в
          них не публикуется (флаг настоящести COMPANY_IS_REAL). */}
      {COMPANY_IS_REAL && <JsonLd data={organizationLd()} />}
      {COMPANY_IS_REAL && <JsonLd data={websiteLd()} />}
      <Blocks blocks={page.value.blocks} ctx={ctx} />
    </main>
  )
}
