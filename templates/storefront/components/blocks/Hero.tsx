import p from '@/styles/primitives.module.css'
import b from '@/styles/btn.module.css'
import type { Block } from '@/lib/source/contract.ts'
import { hrefFor } from '@/lib/href.ts'
import type { BlockCtx } from './types.ts'

export function Hero({ block, ctx }: { block: Extract<Block, { type: 'hero' }>; ctx: BlockCtx }) {
  const shot = Object.values(ctx.cards)[0]
  return (
    <section className={`${p.wrap} ${p.lede}`}>
      <div className={p.ledeText}>
        <h1>{block.title}</h1>
        <p>{block.lede}</p>
        <div className={p.cluster}>
          <a className={b.btn} data-voice="loud" data-size="lg" href={hrefFor(ctx.lang, { catalog: true })}>{block.cta}</a>
        </div>
      </div>
      {shot ? <div className={p.frame}><img src={shot.image.src} alt={shot.image.alt} width={shot.image.width} height={shot.image.height} fetchPriority="high" /></div> : null}
    </section>
  )
}
