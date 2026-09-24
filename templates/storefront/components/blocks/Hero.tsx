import type { ReactNode } from 'react'
import p from '@/styles/primitives.module.css'
import b from '@/styles/btn.module.css' // look-home:scene,proof,journal,cabinet
import s from './blocks.module.css'
import type { Block } from '@/lib/source/contract.ts'
import type { HomeVariant } from '@/lib/homes.ts'
import { hrefFor } from '@/lib/href.ts' // look-home:scene,proof,journal,cabinet
import { Pledges } from '../Pledges.tsx' // look-home:counter
import type { BlockCtx, Place } from './types.ts'

type Props = { block: Extract<Block, { type: 'hero' }>; ctx: BlockCtx; place: Place }

/* Герой по варианту главной (lib/homes.ts). Слова, кнопка и снимок — данные
   блока, одни на все варианты; вариант решает, как они стоят.
   look-home:* Пока вид выбирается, в коде стоят все варианты (lib/homes.ts);
   look-home:* `npm run look:remove` оставляет выбранный.
   Кнопка героя — одна громкая на экран: главное действие первого экрана. */

/* look-home:scene,proof,journal,cabinet:start */
const cta = (block: Props['block'], ctx: BlockCtx) => (
  <a className={b.btn} data-voice="loud" data-size="lg" href={hrefFor(ctx.lang, { catalog: true })}>{block.cta}</a>
)
/* look-home:scene,proof,journal,cabinet:end */

/* look-home:scene:start */
/* scene — единственное место, где снимок бывает большим, и одна тёмная
   сцена на странице. Устройство меняется по ширине СЦЕНЫ, а не окна
   (blocks.module.css, `.hero`): на широкой текст лежит своей колонкой
   поверх снимка, на вуали, которая сходит на нет к предметам; на узкой
   снимок стоит кадром сверху, а текст — под ним на той же сцене, и
   заголовок больше не ложится на этикетку флакона (разбор главной
   24.09.2026, И280). Вуаль живёт на коробке снимка, поэтому у текста нет
   второго фона и нет шва. */
const scene = ({ block, ctx }: Props) => (
  <section className={`${p.wrap} ${p.flush} ${s.heroBand}`}>
    <div className={s.hero}>
      <div className={s.heroShot}>
        <img src={block.image.src} alt={block.image.alt} width={block.image.width} height={block.image.height} fetchPriority="high" />
      </div>
      <div className={s.heroText} data-ground="deck">
        <h1>{block.title}</h1>
        <p>{block.lede}</p>
        <div className={p.cluster}>{cta(block, ctx)}</div>
      </div>
    </div>
  </section>
)
/* look-home:scene:end */

/* look-home:counter:start */
/* counter — магазин сразу: обещание ролью заголовка страницы, рядом абзац и
   обещания покупки из данных (доставка «от», срок возврата — lib/pledges.ts).
   Снимка героя нет: картинки первого экрана — сами товары полки ниже. Кнопки
   тоже нет: полки и ходовые стоят следующими в той же группе. */
const counter = ({ block, ctx, place }: Props) => (
  <section className={`${p.wrap} ${p.section}`} data-air={place.air ?? undefined}>
    <div className={`${p.sidebar} ${s.intro}`}>
      <h1 className={s.introTitle}>{block.title}</h1>
      <div className={`${p.aside} ${p.stack} ${s.introText}`}>
        <p>{block.lede}</p>
        <Pledges pledges={ctx.pledges} />
      </div>
    </div>
  </section>
)
/* look-home:counter:end */

/* look-home:proof:start */
/* proof — протокол сразу: обещание ролью заголовка страницы и кнопка к
   товару; лист протокола стоит следующим, в той же группе первого экрана
   (Lab.tsx, `certificate`). Снимка героя нет: главное здесь — документ. */
const proof = ({ block, ctx, place }: Props) => (
  <section className={`${p.wrap} ${p.section}`} data-air={place.air ?? undefined}>
    <div className={`${p.stack} ${s.claim}`}>
      <h1 className={s.introTitle}>{block.title}</h1>
      <p className={s.claimLede}>{block.lede}</p>
      <div className={p.cluster}>{cta(block, ctx)}</div>
    </div>
  </section>
)
/* look-home:proof:end */

/* look-home:journal:start */
/* journal — заголовок сразу: обещание ролью героя во всю ширину коробки на
   чистом полу, без сцены и вуали; под ним строкой абзац и кнопка; снимок —
   широким кадром ниже, отдельным предметом (примитив `frame`: пропорция с
   потолком от малого окна). */
const journal = ({ block, ctx, place }: Props) => (
  <section className={`${p.wrap} ${p.section}`} data-air={place.air ?? undefined}>
    <div className={`${p.stack} ${s.headline}`}>
      <h1>{block.title}</h1>
      <div className={`${p.cluster} ${s.headlineRow}`}>
        <p>{block.lede}</p>
        {cta(block, ctx)}
      </div>
      <div className={`${p.frame} ${s.plate}`}>
        <img src={block.image.src} alt={block.image.alt} width={block.image.width} height={block.image.height} fetchPriority="high" />
      </div>
    </div>
  </section>
)
/* look-home:journal:end */

/* look-home:cabinet:start */
/* cabinet — тихая аптека: заголовок, абзац и кнопка по середине узкой
   мерой, на чистом полу. Снимок героя стоит ниже отдельной паузой без слов
   (`Still` ниже): здесь первыми идут ящики полок. */
const cabinet = ({ block, ctx, place }: Props) => (
  <section className={`${p.wrap} ${p.section}`} data-air={place.air ?? undefined}>
    <div className={`${p.stack} ${s.calm}`}>
      <h1>{block.title}</h1>
      <p>{block.lede}</p>
      <div className={`${p.cluster} ${s.calmAct}`}>{cta(block, ctx)}</div>
    </div>
  </section>
)

/* Пауза — снимок героя отдельным предметом без слов, во всю коробку
   страницы между товаром и справкой (lib/homes.ts, место `still`): у аптеки
   заголовок стоит без снимка, и снимок встаёт здесь, чтобы разбить плотное
   спокойным. Кадр — `frame` с потолком от малого окна; подпись снимка — та
   же, что у героя (слова героя стоят наверху, снимок их не повторяет). */
export function Still({ block, place }: Props) {
  return (
    <section className={`${p.wrap} ${p.section}`} data-air={place.air ?? undefined}>
      <div className={`${p.frame} ${s.still}`}>
        <img src={block.image.src} alt={block.image.alt} width={block.image.width} height={block.image.height} loading="lazy" decoding="async" />
      </div>
    </section>
  )
}
/* look-home:cabinet:end */

const HEROES: Record<HomeVariant, (props: Props) => ReactNode> = {
  scene, // look-home:scene
  counter, // look-home:counter
  proof, // look-home:proof
  journal, // look-home:journal
  cabinet, // look-home:cabinet
}

export function Hero(props: Props) {
  return HEROES[props.ctx.home](props)
}
