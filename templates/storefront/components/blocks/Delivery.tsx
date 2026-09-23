import p from '@/styles/primitives.module.css'
import s from './blocks.module.css'
import type { Block } from '@/lib/source/contract.ts'
import { Icon } from '../Icon.tsx'
import type { BlockCtx } from './types.ts'

const ICONS = ['truck', 'package', 'circle-check']

/* Доставка и оплата — одна полоса: заголовок и три пункта на своём полу.
   Знак пункта — в тонированном круге, имя пункта — ролью имени карточки. */
export function Delivery({ block }: { block: Extract<Block, { type: 'delivery' }>; ctx: BlockCtx }) {
  return (
    <section className={`${p.wrap} ${p.section}`}>
      <div className={`${p.sheet} ${s.band}`}>
        <div className={p.sectionHead}><h2>{block.title}</h2></div>
        <ul className={`${p.grid} ${s.points}`}>
          {block.items.map((item, i) => (
            <li key={item.title} className={`${p.stack} ${s.point}`}>
              <span className={s.disc}><Icon id={ICONS[i % ICONS.length]} /></span>
              <h3 className={s.title}>{item.title}</h3>
              <p className={p.muted}>{item.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
