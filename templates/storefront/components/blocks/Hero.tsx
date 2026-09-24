import p from '@/styles/primitives.module.css'
import b from '@/styles/btn.module.css'
import s from './blocks.module.css'
import type { Block } from '@/lib/source/contract.ts'
import { hrefFor } from '@/lib/href.ts'
import type { BlockCtx } from './types.ts'

/* Герой — единственное место, где снимок бывает большим, и одна тёмная
   сцена на странице. Устройство меняется по ширине СЦЕНЫ, а не окна
   (blocks.module.css, `.hero`): на широкой текст лежит своей колонкой
   поверх снимка, на вуали, которая сходит на нет к предметам; на узкой
   снимок стоит кадром сверху, а текст — под ним на той же сцене, и
   заголовок больше не ложится на этикетку флакона (разбор главной
   24.09.2026, И272). Вуаль живёт на коробке снимка, поэтому у текста нет
   второго фона и нет шва. */
export function Hero({ block, ctx }: { block: Extract<Block, { type: 'hero' }>; ctx: BlockCtx }) {
  return (
    <section className={`${p.wrap} ${p.flush} ${s.heroBand}`}>
      <div className={s.hero}>
        <div className={s.heroShot}>
          <img src={block.image.src} alt={block.image.alt} width={block.image.width} height={block.image.height} fetchPriority="high" />
        </div>
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
