import p from '@/styles/primitives.module.css'
import s from './blocks.module.css'
import type { Block } from '@/lib/source/contract.ts'
import { hrefFor } from '@/lib/href.ts'
import type { BlockCtx } from './types.ts'

/* Полки — МЕСТА, а не товары: кадр во всю плитку и имя под ним, без листа,
   тени и строки описания. Карточка товара ниже на странице — предмет на
   листе с ценой; плитка полки от неё отличается тем, чего у неё нет. Строка
   описания ушла: на телефоне она ложилась в три строки с переносом слога
   («sev-/eral»), а имя полки уже говорит, что там (то же правило, что у
   выдвижного меню: «только названия»). Ссылка одна — имя; её область
   нажатия растянута на всю плитку, кадр — картинка без подписи. */
export function Categories({ block, ctx }: { block: Extract<Block, { type: 'categories' }>; ctx: BlockCtx }) {
  if (!ctx.collections.length) return null
  return (
    <section className={`${p.wrap} ${p.section}`}>
      <div className={p.sectionHead}><h2>{block.title}</h2></div>
      <ul className={`${p.grid} ${s.tiles}`}>
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
}
