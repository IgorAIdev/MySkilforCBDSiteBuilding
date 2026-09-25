import type { ReactNode } from 'react'
import p from '@/styles/primitives.module.css'
import s from './blocks.module.css'
import type { Block } from '@/lib/source/contract.ts'
import type { HomeVariant } from '@/lib/homes.ts'
import { hrefFor } from '@/lib/href.ts'
import go from '@/styles/go.module.css' // look-home:journal,poster
import { Icon } from '../Icon.tsx' // look-home:journal,poster
import type { BlockCtx, Place } from './types.ts'

type Props = { block: Extract<Block, { type: 'categories' }>; ctx: BlockCtx; place: Place }

/* Полки по варианту главной (lib/homes.ts). Полки — МЕСТА, а не товары: у
   них имя и кадр, без листа, цены и строки описания; ссылка одна — имя, её
   область нажатия растянута на всю плитку или строку.
   look-home:* Пока вид выбирается, в коде стоят все варианты (lib/homes.ts);
   look-home:* `npm run look:remove` оставляет выбранный.
   Все полки стоят на главной в каждом варианте: по ним покупатель на
   телефоне понимает, что продаётся (Baymard, docs/design/home.md). */

/* look-home:scene,proof,cabinet:start */
/* Плитки — кадр во всю плитку и имя под ним. Карточка товара ниже на
   странице — предмет с ценой; плитка полки от неё отличается тем, чего у
   неё нет. Строки описания нет: на телефоне она ложилась в три строки с
   переносом слога, а имя полки уже говорит, что там. У аптеки (`cabinet`)
   плитки — ящики шкафа: тот же список, одетый атрибутом `data-shelf`. */
const tiles = ({ block, ctx, place }: Props, shelf?: 'drawers') => (
  <section className={`${p.wrap} ${p.section}`} data-air={place.air ?? undefined}>
    <div className={p.sectionHead}><h2>{block.title}</h2></div>
    <ul className={`${p.grid} ${s.tiles}`} data-shelf={shelf}>
      {ctx.collections.map((c) => (
        <li key={c.slug} className={`${p.stack} ${s.tile}`}>
          {c.image ? (
            <div className={`${p.frame} ${s.tileShot}`}>
              <img src={c.image.src} alt="" width={c.image.width} height={c.image.height} loading="lazy" decoding="async" />
            </div>
          ) : null}
          <h3 className={s.name}><a href={hrefFor(ctx.lang, { category: c.slug })}>{c.name}</a></h3>
        </li>
      ))}
    </ul>
  </section>
)
/* look-home:scene,proof,cabinet:end */

/* look-home:counter:start */
/* Фишки — все полки одной строкой, сразу под обещанием: на телефоне это
   первый экран, и весь охват магазина виден без меню. Фишка — контрол
   набора (`chip`), не своя кнопка. Заголовок раздела есть для чтения
   вслух: глазу строку объясняет само соседство с обещанием. */
const chips = ({ block, ctx, place }: Props) => (
  <section className={`${p.wrap} ${p.section}`} data-air={place.air ?? undefined}>
    <h2 className={p.said}>{block.title}</h2>
    <ul className={`${p.cluster} ${s.chips}`}>
      {ctx.collections.map((c) => (
        <li key={c.slug}><a className={p.chip} href={hrefFor(ctx.lang, { category: c.slug })}>{c.name}</a></li>
      ))}
    </ul>
  </section>
)
/* look-home:counter:end */

/* look-home:journal:start */
/* Оглавление — полки строками через волосок, как справка ниже: имя слева
   ролью подзаголовка, миниатюра полки, стрелка «куда ведёт». Заголовок —
   своей колонкой слева (`sidebar`), в узкой коробке — над строками. */
const index = ({ block, ctx, place }: Props) => (
  <section className={`${p.wrap} ${p.section}`} data-air={place.air ?? undefined}>
    <div className={`${p.sidebar} ${s.split}`}>
      <div className={p.aside}><div className={p.sectionHead}><h2>{block.title}</h2></div></div>
      <ul className={`${s.rows} ${s.splitBody}`}>
        {ctx.collections.map((c) => (
          <li key={c.slug} className={s.entry}>
            {c.image ? (
              <div className={`${p.frame} ${s.entryShot}`}>
                <img src={c.image.src} alt="" width={c.image.width} height={c.image.height} loading="lazy" decoding="async" />
              </div>
            ) : null}
            <h3 className={s.entryName}><a className={go.go} href={hrefFor(ctx.lang, { category: c.slug })}>{c.name}<Icon id="arrow-right" /></a></h3>
          </li>
        ))}
      </ul>
    </div>
  </section>
)
/* look-home:journal:end */

/* look-home:showroom:start */
/* Строка — все полки одной фразой по середине страницы, ролью заголовка
   раздела: имя и рядом маленький снимок полки прямо в строке, как слово с
   картинкой. Вся строка — ссылки; заголовок раздела есть для чтения вслух,
   глазу строку объясняет сама крупность. Снимок меряется строкой (`em`),
   а не своим числом: крупнее кегль — крупнее снимок. */
const words = ({ block, ctx, place }: Props) => (
  <section className={`${p.wrap} ${p.section}`} data-air={place.air ?? undefined}>
    <h2 className={p.said}>{block.title}</h2>
    <ul className={s.words}>
      {ctx.collections.map((c) => (
        <li key={c.slug}>
          <a href={hrefFor(ctx.lang, { category: c.slug })}>
            {c.image ? <img className={s.wordShot} src={c.image.src} alt="" width={c.image.width} height={c.image.height} loading="lazy" decoding="async" /> : null}
            {c.name}
          </a>
        </li>
      ))}
    </ul>
  </section>
)
/* look-home:showroom:end */

/* look-home:poster:start */
/* Высокие снимки — у каждой полки её снимок высоким кадром, имя со знаком
   «куда ведёт» лежит на самом снимке внизу, под своей вуалью. Снимок и
   подпись — в одной клетке сетки плитки, подпись в потоке: длинное имя
   растит плитку, а не выходит за снимок. Ссылка одна — имя, её область
   растянута на всю плитку. */
const posters = ({ block, ctx, place }: Props) => (
  <section className={`${p.wrap} ${p.section}`} data-air={place.air ?? undefined}>
    <div className={p.sectionHead}><h2>{block.title}</h2></div>
    <ul className={`${p.grid} ${s.tall}`}>
      {ctx.collections.map((c) => (
        <li key={c.slug} className={s.tallTile} data-bare={c.image ? undefined : ''}>
          {c.image ? (
            <div className={`${p.frame} ${s.tallShot}`}>
              <img src={c.image.src} alt="" width={c.image.width} height={c.image.height} loading="lazy" decoding="async" />
            </div>
          ) : null}
          <h3 className={s.tallName} data-ground={c.image ? 'deck' : undefined}>
            <a className={go.go} href={hrefFor(ctx.lang, { category: c.slug })}>{c.name}<Icon id="arrow-right" /></a>
          </h3>
        </li>
      ))}
    </ul>
  </section>
)
/* look-home:poster:end */

const SHELVES: Record<HomeVariant, (props: Props) => ReactNode> = {
  scene: (props) => tiles(props), // look-home:scene
  counter: chips, // look-home:counter
  proof: (props) => tiles(props), // look-home:proof
  journal: index, // look-home:journal
  cabinet: (props) => tiles(props, 'drawers'), // look-home:cabinet
  showroom: words, // look-home:showroom
  poster: posters, // look-home:poster
}

export function Categories(props: Props) {
  if (!props.ctx.collections.length) return null
  return SHELVES[props.ctx.home](props)
}
