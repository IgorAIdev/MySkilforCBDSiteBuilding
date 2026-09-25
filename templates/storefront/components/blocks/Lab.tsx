import type { ReactNode } from 'react'
import p from '@/styles/primitives.module.css'
import s from './blocks.module.css'
import type { Block } from '@/lib/source/contract.ts'
import type { HomeVariant } from '@/lib/homes.ts'
import { labView } from '@/lib/product-view.ts'
import { LabReport } from '../LabReport.tsx'
import type { BlockCtx, Place } from './types.ts'

type Props = { block: Extract<Block, { type: 'lab' }>; ctx: BlockCtx; place: Place }

/* Лаборатория по варианту главной (lib/homes.ts). Протокол — тот же
   плоский протокол, что на карте товара (LabReport: строки через волосок и
   под ними сам документ). Обещание героя «протокол на каждую партию» здесь
   становится тем, что можно открыть (скилл shop, «Лаборатория — процесс»:
   «где посмотреть»).
   look-home:* Пока вид выбирается, в коде стоят все варианты (lib/homes.ts);
   look-home:* `npm run look:remove` оставляет выбранный.
   Лист, если он есть, — ОДИН на странице, и внутри него ничего не поднято:
   `--surface` и пол (`data-plate`), не тон марки — тон в тёмной теме
   становился ржавым и читался тревогой. */

/* look-home:scene,counter,showroom:start */
/* Лист: слова слева, протокол справа; в узкой коробке колонка одна
   (`switcher`). */
const sheet = ({ block, ctx, place }: Props) => (
  <section className={`${p.wrap} ${p.section}`} data-air={place.air ?? undefined}>
    <div className={`${p.sheet} ${p.switcher} ${s.labBand}`} data-plate>
      <div className={`${p.sectionHead} ${s.labText}`}><h2>{block.title}</h2><p>{block.body}</p></div>
      {block.report ? <div className={s.labDoc}><LabReport lab={labView(ctx.lang, block.report)} level={3} /></div> : null}
    </div>
  </section>
)
/* look-home:scene,counter,showroom:end */

/* look-home:proof:start */
/* Протокол сразу: тот же лист, но протокол — главное в нём: колонка
   протокола вдвое шире колонки слов (`bias`), номер партии набран крупно
   (`code`) — самый крупный знак страницы, его сверяют с этикеткой. Слова
   стоят первыми: заголовок раздела идёт раньше заголовка протокола, и
   лестница заголовков не прыгает через уровень. */
const certificate = ({ block, ctx, place }: Props) => (
  <section className={`${p.wrap} ${p.section}`} data-air={place.air ?? undefined}>
    <div className={`${p.sheet} ${p.switcher} ${s.labBand} ${s.certificate}`} data-plate>
      <div className={`${p.sectionHead} ${s.labText}`}><h2>{block.title}</h2><p>{block.body}</p></div>
      {block.report ? <div className={p.bias}><LabReport lab={labView(ctx.lang, block.report)} level={3} code /></div> : null}
    </div>
  </section>
)
/* look-home:proof:end */

/* look-home:journal:start */
/* Строками: без листа, тем же порядком, что справка ниже и оглавление полок
   выше — заголовок и слова своей колонкой слева, протокол справа
   (`sidebar`); в узкой коробке — столбиком. */
const ruled = ({ block, ctx, place }: Props) => (
  <section className={`${p.wrap} ${p.section}`} data-air={place.air ?? undefined}>
    <div className={`${p.sidebar} ${s.split}`}>
      <div className={p.aside}><div className={p.sectionHead}><h2>{block.title}</h2><p>{block.body}</p></div></div>
      {block.report ? <div className={s.splitBody}><LabReport lab={labView(ctx.lang, block.report)} level={3} /></div> : null}
    </div>
  </section>
)
/* look-home:journal:end */

/* look-home:cabinet:start */
/* Этикеткой: узкий лист по середине страницы, слова над протоколом —
   одной колонкой, как ярлык на аптечной банке. */
const label = ({ block, ctx, place }: Props) => (
  <section className={`${p.wrap} ${p.section}`} data-air={place.air ?? undefined}>
    <div className={`${p.sheet} ${p.stack} ${s.label}`} data-plate>
      <div className={p.sectionHead}><h2>{block.title}</h2><p>{block.body}</p></div>
      {block.report ? <LabReport lab={labView(ctx.lang, block.report)} level={3} /> : null}
    </div>
  </section>
)
/* look-home:cabinet:end */

const LABS: Record<HomeVariant, (props: Props) => ReactNode> = {
  scene: sheet, // look-home:scene
  counter: sheet, // look-home:counter
  proof: certificate, // look-home:proof
  journal: ruled, // look-home:journal
  cabinet: label, // look-home:cabinet
  showroom: sheet, // look-home:showroom
}

export function Lab(props: Props) {
  return LABS[props.ctx.home](props)
}
