import p from '@/styles/primitives.module.css'
import s from './blocks.module.css'
import type { Block } from '@/lib/source/contract.ts'
import type { BlockCtx, Place } from './types.ts'
import { shot } from '@/lib/shot.ts'

/* Слово магазина — место заказчика (docs/design/home.md, «Пустые места»):
   заголовок, несколько предложений своими словами и снимок. Пока слов нет —
   блок молчит: ни заглушки, ни рамки, ни «здесь будет текст» на витрине
   (скилл shop, «Пустое состояние молчит»). Абзацы — через пустую строку в
   тексте владельца. Слова и снимок рядом, в узкой коробке — столбиком
   (`switcher`); снимок — кадр с потолком (`frame`). */
export function Story({ block, place }: { block: Extract<Block, { type: 'story' }>; ctx: BlockCtx; place: Place }) {
  const paras = block.body.split(/\n\s*\n/).map((x) => x.trim()).filter(Boolean)
  if (!block.title.trim() && !paras.length) return null
  return (
    <section className={`${p.wrap} ${p.section}`} data-air={place.air ?? undefined}>
      <div className={`${p.switcher} ${s.story}`}>
        <div className={`${p.stack} ${s.storyText}`}>
          {block.title.trim() ? <h2>{block.title}</h2> : null}
          {paras.length ? <div className={`${p.prose} ${p.stack} ${s.storyBody}`}>{paras.map((x) => <p key={x}>{x}</p>)}</div> : null}
        </div>
        {block.image ? (
          <div className={`${p.frame} ${s.storyShot}`}>
            <img {...shot(block.image, 'stage', true)} alt={block.image.alt} decoding="async" />
          </div>
        ) : null}
      </div>
    </section>
  )
}
