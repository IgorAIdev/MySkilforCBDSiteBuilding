import p from '@/styles/primitives.module.css'
import s from './blocks.module.css'
import type { Block } from '@/lib/source/contract.ts'
import { faqLd } from '@/lib/ld.ts'
import { JsonLd } from '../JsonLd.tsx'
import type { BlockCtx } from './types.ts'

/* Одна FAQPage на страницу и ровно столько вопросов, сколько нарисовано
   (check:seo, faqPage) — разметка строится из тех же пунктов. */
export function Faq({ block }: { block: Extract<Block, { type: 'faq' }>; ctx: BlockCtx }) {
  return (
    <section className={`${p.wrap} ${p.section} ${p.prose} ${p.stack} ${s.faq}`}>
      <div className={p.sectionHead}><h2>{block.title}</h2></div>
      {block.items.map((item) => <details key={item.q} data-faq><summary>{item.q}</summary><p>{item.a}</p></details>)}
      <JsonLd data={faqLd(block.items)} />
    </section>
  )
}
