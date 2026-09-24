import p from '@/styles/primitives.module.css'
import s from './ProductCard.module.css'
import type { ShelfCard } from '@/lib/view.ts'
import { lookNow } from '@/lib/look.ts'

/* Ссылка одна — имя товара; её область нажатия растянута на всю карточку
   (ProductCard.module.css), поэтому снимок не ссылка, а кадр: вторая ссылка
   на тот же товар была бы органом без имени.

   Три группы, и порядок их — порядок решения покупателя (разбор 24.09.2026,
   X3): снимок; что это — имя и строка фактов (сила, мера, мг); за сколько —
   цена. Наличие — не строка, а плашка на снимке и только исключением: «мало»
   или «нет» (lib/view.ts, `flag`). Строкой оно сдвигало цену у одних
   карточек ряда и не у других.

   Плашка — внутри ссылки, рядом с заголовком, а не в нём: нажатие на неё
   ведёт на товар, имя ссылки говорит и наличие («CBD oil for cats Low
   stock»), а заголовок остаётся именем. Стояла в кадре, мимо ссылки, с
   `pointer-events:none` — и растянутая область ссылки ложилась поверх её
   слов (check:detect, `occluded`, /en/search?q=oil).

   Вариант карточки — значением вида (`card`, lib/cards.ts): разметка одна,
   вариант меняет одежду — поверхность, линию, поле (ProductCard.module.css).
   `data-product-card` — договор товарной полки (shop, «Каталог и полка»):
   по нему отрисованная проверка меряет плотность ряда. */
export async function ProductCard({ card, eager = false }: { card: ShelfCard; eager?: boolean }) {
  const { card: variant } = await lookNow()
  return (
    <article className={s.card} data-card={variant} data-product-card="">
      <div className={`${p.frame} ${s.shot}`}>
        <img src={card.image.src} alt="" width={card.image.width} height={card.image.height} loading={eager ? 'eager' : 'lazy'} decoding="async" />
      </div>
      <div className={s.body}>
        <div className={s.what}>
          <a className={s.link} href={card.href}>
            <h3 className={s.name}>{card.name}</h3>
            {card.flag ? <span className={`${p.cut} ${s.flag}`} data-cut={card.flag.level}>{' '}{card.flag.text}</span> : null}
          </a>
          {card.facts ? <p className={p.note}>{card.facts}</p> : null}
        </div>
        <p className={s.price}>{card.price}</p>
      </div>
    </article>
  )
}
