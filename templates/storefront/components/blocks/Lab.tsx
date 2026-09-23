import p from '@/styles/primitives.module.css'
import type { Block } from '@/lib/source/contract.ts'
import type { BlockCtx } from './types.ts'

export function Lab({ block }: { block: Extract<Block, { type: 'lab' }>; ctx: BlockCtx }) {
  return (
    <section className={`${p.wrap} ${p.section}`}>
      <div className={p.sectionHead}><h2>{block.title}</h2><p>{block.body}</p></div>
    </section>
  )
}
