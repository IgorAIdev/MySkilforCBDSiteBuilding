import p from '@/styles/primitives.module.css'
import s from './blocks.module.css'
import type { Block } from '@/lib/source/contract.ts'
import { faqLd } from '@/lib/ld.ts'
import { JsonLd } from '../JsonLd.tsx'
import { Icon } from '../Icon.tsx'
import type { BlockCtx } from './types.ts'

/* Вопросы — строки во всю ширину с разделителями; знак раскрытия
   поворачивается, ответ — в удобной мере строки. Одна FAQPage на страницу и
   ровно столько вопросов, сколько нарисовано (check:seo, faqPage) —
   разметка строится из тех же пунктов. */
export function Faq({ block }: { block: Extract<Block, { type: 'faq' }>; ctx: BlockCtx }) {
  return (
    <section className={`${p.wrap} ${p.section}`}>
      <div className={p.sectionHead}><h2>{block.title}</h2></div>
      <div className={s.faq}>
        {block.items.map((item) => (
          <details key={item.q} className={s.q} data-faq>
            <summary className={s.ask}>{item.q}<Icon id="chevron-down" /></summary>
            <p className={s.answer}>{item.a}</p>
          </details>
        ))}
      </div>
      <JsonLd data={faqLd(block.items)} />
    </section>
  )
}
