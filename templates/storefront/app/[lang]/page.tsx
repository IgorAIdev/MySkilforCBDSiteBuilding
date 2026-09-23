import { langOf } from '@/lib/route.ts'
import { source, content } from '@/lib/source/index.ts'
import { shelfCard } from '@/lib/view.ts'
import { Blocks } from '@/components/blocks/registry.tsx'
import { Unavailable } from '@/components/StateScreen.tsx'
import type { BlockCtx } from '@/components/blocks/types.ts'

type Props = { params: Promise<{ lang: string }> }

export default async function Home({ params }: Props) {
  const lang = await langOf(params)
  const page = await content().page(lang, 'home')
  if (!page.ok) return <Unavailable lang={lang} />
  const ids = page.value.blocks.flatMap((b) => (b.type === 'featured' ? b.ids : []))
  const [cols, cards] = await Promise.all([source().collections(lang), source().cards(lang, ids)])
  if (!cols.ok || !cards.ok) return <Unavailable lang={lang} />
  const ctx: BlockCtx = { lang, collections: cols.value, cards: Object.fromEntries(cards.value.map((c) => [c.id, shelfCard(lang, c)])) }
  return (
    <main id="main">
      <Blocks blocks={page.value.blocks} ctx={ctx} />
    </main>
  )
}
