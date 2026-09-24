import p from '@/styles/primitives.module.css'
import go from '@/styles/go.module.css'
import s from './blocks.module.css'
import type { Block } from '@/lib/source/contract.ts'
import { t } from '@/lib/i18n/index.ts'
import { Icon } from '../Icon.tsx'
import type { BlockCtx, Place } from './types.ts'

/* Доставка и оплата — сводка страницы условий, а не три знака в кругах:
   способы с ценой и сроком приходят ИЗ ТОГО ЖЕ списка, что выбор на
   оформлении (`ctx.delivery`, И95), — цена на главной не может разойтись с
   ценой у кнопки. Слова блока (`items`) — заметки об оплате от владельца.
   Слева заголовок и выход к полным условиям, справа строки через волосок —
   так же, как вопросы ниже: один порядок у всех справочных разделов. */
export function Delivery({ block, ctx, place }: { block: Extract<Block, { type: 'delivery' }>; ctx: BlockCtx; place: Place }) {
  const { methods, terms } = ctx.delivery
  return (
    <section className={`${p.wrap} ${p.section}`} data-air={place.air ?? undefined}>
      <div className={`${p.sidebar} ${s.split}`}>
        <div className={p.aside}>
          <div className={p.sectionHead}>
            <h2>{block.title}</h2>
            {terms ? <a className={go.go} href={terms}>{t(ctx.lang, 'home.delivery.terms')}<Icon id="arrow-right" /></a> : null}
          </div>
        </div>
        <div className={`${p.stack} ${s.splitBody}`}>
          {methods.length ? (
            <ul className={s.rows} aria-label={t(ctx.lang, 'delivery.table')}>
              {methods.map((m) => (
                <li key={m.id} className={s.rate}>
                  <p className={s.rateName}>{m.name}</p>
                  <p className={s.rateMeta}>{m.meta}</p>
                  <p className={s.ratePrice}>{m.price}</p>
                </li>
              ))}
            </ul>
          ) : null}
          {block.items.length ? (
            <dl className={s.notes}>
              {block.items.map((item) => <div key={item.title}><dt>{item.title}</dt><dd>{item.body}</dd></div>)}
            </dl>
          ) : null}
        </div>
      </div>
    </section>
  )
}
