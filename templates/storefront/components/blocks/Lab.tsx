import p from '@/styles/primitives.module.css'
import s from './blocks.module.css'
import type { Block } from '@/lib/source/contract.ts'
import type { BlockCtx } from './types.ts'

/* Блок — сам текст, а не шапка раздела над содержимым: у `sectionHead`
   нижнее поле до содержимого, и без содержимого оно выпадало из раздела и
   ложилось на шов со следующим — 132px против 88 у остальных. */
export function Lab({ block }: { block: Extract<Block, { type: 'lab' }>; ctx: BlockCtx }) {
  return (
    <section className={`${p.wrap} ${p.section}`}>
      <div className={`${p.stack} ${s.say}`}><h2 className={s.h2}>{block.title}</h2><p>{block.body}</p></div>
    </section>
  )
}
