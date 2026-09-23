import p from '@/styles/primitives.module.css'
import go from '@/styles/go.module.css'
import s from './blocks.module.css'
import type { Block } from '@/lib/source/contract.ts'
import type { ShelfCard } from '@/lib/view.ts'
import { hrefFor } from '@/lib/href.ts'
import { t } from '@/lib/i18n/index.ts'
import { ProductCard } from '../ProductCard.tsx'
import { Icon } from '../Icon.tsx'
import type { BlockCtx } from './types.ts'

export function Featured({ block, ctx }: { block: Extract<Block, { type: 'featured' }>; ctx: BlockCtx }) {
  const cards = block.ids.map((id) => ctx.cards[id]).filter((c): c is ShelfCard => Boolean(c))
  if (!cards.length) return null
  return (
    <section className={`${p.wrap} ${p.section}`}>
      <div className={p.sectionHead}>
        <h2>{block.title}</h2>
        <a className={go.go} href={hrefFor(ctx.lang, { catalog: true })}>{t(ctx.lang, 'nav.catalog')}<Icon id="arrow-right" /></a>
      </div>
      <ul className={`${p.grid} ${s.shelf}`}>{cards.map((c) => <li key={c.id}><ProductCard card={c} /></li>)}</ul>
    </section>
  )
}
