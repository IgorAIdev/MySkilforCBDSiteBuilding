import p from '@/styles/primitives.module.css'
import s from './ProductCard.module.css'
import type { ShelfCard } from '@/lib/view.ts'
import { lookNow } from '@/lib/look.ts'

/* Ссылка одна — имя товара; её область нажатия растянута на всю карточку
   (ProductCard.module.css), поэтому снимок не ссылка, а кадр: вторая ссылка
   на тот же товар была бы органом без имени.

   Вариант карточки — значением вида (`card`, lib/cards.ts): разметка одна,
   вариант меняет одежду — поверхность, линию, поле (ProductCard.module.css). */
export async function ProductCard({ card, eager = false }: { card: ShelfCard; eager?: boolean }) {
  const { card: variant } = await lookNow()
  return (
    <article className={`${p.stack} ${s.card}`} data-card={variant}>
      <div className={`${p.frame} ${s.shot}`}>
        <img src={card.image.src} alt="" width={card.image.width} height={card.image.height} loading={eager ? 'eager' : 'lazy'} decoding="async" />
      </div>
      <h3 className={s.name}><a href={card.href}>{card.name}</a></h3>
      <div className={s.buy}>
        <b className={s.price}>{card.price}</b>
        <span className={p.note}>{card.stock}</span>
      </div>
    </article>
  )
}
