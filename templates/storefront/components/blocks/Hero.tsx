import p from '@/styles/primitives.module.css'
import b from '@/styles/btn.module.css'
import s from './blocks.module.css'
import type { Block } from '@/lib/source/contract.ts'
import { hrefFor } from '@/lib/href.ts'
import type { BlockCtx } from './types.ts'

/* Герой — единственное место, где снимок бывает большим: заголовок, абзац и
   кнопка лежат ПОВЕРХ него, внизу слева, на вуали (blocks.module.css,
   `.hero`). Кадра под текстом больше нет: огромный флакон под заголовком
   заказчик показал снимком как дефект (23.09.2026). Текст поверх снимка —
   норма одиннадцати-двенадцати магазинов из тринадцати замеренных. */
export function Hero({ block, ctx }: { block: Extract<Block, { type: 'hero' }>; ctx: BlockCtx }) {
  return (
    <section className={`${p.wrap} ${p.flush} ${s.heroBand}`}>
      <div className={s.hero}>
        <img className={s.heroShot} src={block.image.src} alt={block.image.alt} width={block.image.width} height={block.image.height} fetchPriority="high" />
        <div className={s.heroText} data-ground="deck">
          <h1>{block.title}</h1>
          <p>{block.lede}</p>
          <div className={p.cluster}>
            <a className={b.btn} data-voice="loud" data-size="lg" href={hrefFor(ctx.lang, { catalog: true })}>{block.cta}</a>
          </div>
        </div>
      </div>
    </section>
  )
}
