import p from '@/styles/primitives.module.css'
import go from '@/styles/go.module.css'
import s from './blocks.module.css'
import type { Block } from '@/lib/source/contract.ts'
import type { ShelfCard } from '@/lib/view.ts'
import type { HomeVariant } from '@/lib/homes.ts'
import { hrefFor } from '@/lib/href.ts'
import { t } from '@/lib/i18n/index.ts'
import { ProductCard } from '../ProductCard.tsx'
import { Icon } from '../Icon.tsx'
import type { BlockCtx, Place } from './types.ts'

/* Сколько карточек полки грузится сразу, а не лениво: там, где вариант
   главной ставит полку в первый экран, её снимки — самое крупное на
   экране телефона, и ленивая загрузка задержала бы их. */
const EAGER: Partial<Record<HomeVariant, number>> = {
  counter: 2, // look-home:counter
}

export function Featured({ block, ctx, place }: { block: Extract<Block, { type: 'featured' }>; ctx: BlockCtx; place: Place }) {
  const cards = block.ids.map((id) => ctx.cards[id]).filter((c): c is ShelfCard => Boolean(c))
  if (!cards.length) return null
  const eager = EAGER[ctx.home] ?? 0
  return (
    <section className={`${p.wrap} ${p.section}`} data-air={place.air ?? undefined}>
      {/* Выход ко всему каталогу — в строке заголовка, у правого края: он
          отвечает на другой вопрос. Тесно — уходит под заголовок сам. */}
      <div className={p.sectionHead} data-row>
        <h2>{block.title}</h2>
        <a className={go.go} href={hrefFor(ctx.lang, { catalog: true })}>{t(ctx.lang, 'nav.catalog')}<Icon id="arrow-right" /></a>
      </div>
      <ul className={`${p.grid} ${s.shelf}`}>{cards.map((c, i) => <li key={c.id}><ProductCard card={c} eager={i < eager} cart={ctx.cart} /></li>)}</ul>
    </section>
  )
}
