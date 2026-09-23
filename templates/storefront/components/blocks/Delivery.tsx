import p from '@/styles/primitives.module.css'
import s from './blocks.module.css'
import type { Block } from '@/lib/source/contract.ts'
import { Icon } from '../Icon.tsx'
import type { BlockCtx } from './types.ts'

const ICONS = ['truck', 'package', 'circle-check']

export function Delivery({ block }: { block: Extract<Block, { type: 'delivery' }>; ctx: BlockCtx }) {
  return (
    <section className={`${p.wrap} ${p.section}`}>
      <div className={p.sectionHead}><h2>{block.title}</h2></div>
      <ul className={`${p.grid} ${s.points}`}>
        {block.items.map((item, i) => (
          <li key={item.title} className={`${p.stack} ${s.point}`}>
            <Icon id={ICONS[i % ICONS.length]} />
            <h3 className={s.h3}>{item.title}</h3>
            <p className={p.muted}>{item.body}</p>
          </li>
        ))}
      </ul>
    </section>
  )
}
