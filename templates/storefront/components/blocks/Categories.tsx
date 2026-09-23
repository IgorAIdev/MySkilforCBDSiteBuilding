import p from '@/styles/primitives.module.css'
import s from './blocks.module.css'
import type { Block } from '@/lib/source/contract.ts'
import { hrefFor } from '@/lib/href.ts'
import type { BlockCtx } from './types.ts'

export function Categories({ block, ctx }: { block: Extract<Block, { type: 'categories' }>; ctx: BlockCtx }) {
  if (!ctx.collections.length) return null
  return (
    <section className={`${p.wrap} ${p.section}`}>
      <div className={p.sectionHead}><h2>{block.title}</h2></div>
      <ul className={`${p.grid} ${s.tiles}`}>
        {ctx.collections.map((c) => (
          <li key={c.slug} className={`${p.stack} ${s.tile}`}>
            <h3 className={s.h3}><a href={hrefFor(ctx.lang, { category: c.slug })}>{c.name}</a></h3>
            <p className={p.muted}>{c.description}</p>
          </li>
        ))}
      </ul>
    </section>
  )
}
