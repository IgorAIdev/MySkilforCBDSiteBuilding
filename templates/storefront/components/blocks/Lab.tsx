import p from '@/styles/primitives.module.css'
import s from './blocks.module.css'
import type { Block } from '@/lib/source/contract.ts'
import { labView } from '@/lib/product-view.ts'
import { LabReport } from '../LabReport.tsx'
import type { BlockCtx } from './types.ts'

/* Лаборатория — полоса в две колонки: слова и сам протокол партии рядом,
   тот же, что на карте товара. В узкой коробке колонка одна (`switcher`). */
export function Lab({ block, ctx }: { block: Extract<Block, { type: 'lab' }>; ctx: BlockCtx }) {
  return (
    <section className={`${p.wrap} ${p.section}`}>
      <div className={`${p.sheet} ${p.switcher} ${s.labBand}`}>
        <div className={`${p.sectionHead} ${s.labText}`}><h2>{block.title}</h2><p>{block.body}</p></div>
        {block.report ? <LabReport lab={labView(ctx.lang, block.report)} level={3} /> : null}
      </div>
    </section>
  )
}
