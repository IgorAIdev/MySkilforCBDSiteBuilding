import p from '@/styles/primitives.module.css'
import s from './blocks.module.css'
import type { Block } from '@/lib/source/contract.ts'
import { hrefFor } from '@/lib/href.ts'
import type { BlockCtx } from './types.ts'

/* Полки плиткой: кадр полки, имя и строка о ней. Ссылка одна — имя; её
   область нажатия растянута на всю плитку (blocks.module.css), кадр — не
   вторая ссылка, а картинка без подписи: имя стоит рядом. */
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
            <h3 className={s.title}><a href={hrefFor(ctx.lang, { category: c.slug })}>{c.name}</a></h3>
            <p className={p.muted}>{c.description}</p>
          </li>
        ))}
      </ul>
    </section>
  )
}
