import p from '@/styles/primitives.module.css'
import s from './ProductCard.module.css'
import type { ShelfCard } from '@/lib/view.ts'

/* Ссылка одна — имя товара; её область нажатия растянута на всю карточку
   (ProductCard.module.css), поэтому снимок не ссылка, а кадр: вторая ссылка
   на тот же товар была бы органом без имени. */
export function ProductCard({ card, eager = false }: { card: ShelfCard; eager?: boolean }) {
  return (
    <article className={`${p.stack} ${s.card}`}>
      <div className={`${p.frame} ${s.shot}`}>
        <img src={card.image.src} alt="" width={card.image.width} height={card.image.height} loading={eager ? 'eager' : 'lazy'} decoding="async" />
      </div>
      <h3 className={s.name}><a href={card.href}>{card.name}</a></h3>
      <div className={`${p.cluster} ${s.buy}`}>
        <b className={s.price}>{card.price}</b>
        <span className={p.muted}>{card.stock}</span>
      </div>
    </article>
  )
}
