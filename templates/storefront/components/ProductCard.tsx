import p from '@/styles/primitives.module.css'
import b from '@/styles/btn.module.css'
import s from './ProductCard.module.css'
import type { ShelfCard } from '@/lib/view.ts'
import type { Outcome } from '@/lib/cart-ops.ts'
import { lookNow } from '@/lib/look.ts'
import { CartForm } from './CartForm.tsx'
import { Icon } from './Icon.tsx'

/** Запись в корзину — действия сервера, которые карточке передаёт страница
 *  (компонент в бекенд сам не ходит, И248): те же, что у кнопки карты
 *  товара и строк корзины. */
export type CartActions = { submit: (form: FormData) => Promise<void>; call: (form: FormData) => Promise<Outcome> }

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
   по нему отрисованная проверка меряет плотность ряда.

   «За сколько» — цена (прежняя над ней, зачёркнутая) и «в корзину» (слово
   заказчика 25.09.2026: «да, делай кнопку и старую цену»). Кнопка — та же
   запись, что у кнопки карты товара (`CartForm`, одна полоса на корзину):
   у товара одного варианта кладёт его, у товара с выбором ведёт на карту с
   `choose=1` (И284) — со словом «Choose», а не «Add», чтобы нажатие не
   обещало того, чего не сделает. Кнопка стоит над растянутой ссылкой имени.
   Где она — во всю ширину или рядом с ценой, — решает вид (`--card-buy`). */
export async function ProductCard({ card, eager = false, cart }: { card: ShelfCard; eager?: boolean; cart: CartActions }) {
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
            {/* Плашка на снимке одна: наличие-исключение важнее скидки —
                «нет» отменяет покупку, а скидку цена и так говорит строкой. */}
            {card.flag ? <span className={`${p.cut} ${s.flag}`} data-cut={card.flag.level}>{' '}{card.flag.text}</span>
              : card.sale ? <span className={`${p.cut} ${s.flag}`}>{' '}{card.sale}</span> : null}
          </a>
          {card.facts ? <p className={p.note}>{card.facts}</p> : null}
        </div>
        <div className={s.foot}>
          <p className={s.price}>
            {card.was ? <><s className={s.was} aria-hidden="true">{card.was.text}</s><span className={p.said}>{card.was.said}</span></> : null}
            <span>{card.price}</span>
          </p>
          {card.buy.variant ? (
            <CartForm lang={card.lang} className={s.buy} refresh={false} quiet submit={cart.submit} call={cart.call} initial={null} timeout={card.buy.timeout} failed={card.buy.failed}>
              <input type="hidden" name="op" value="add" />
              <input type="hidden" name="variant" value={card.buy.variant} />
              <input type="hidden" name="quantity" value="1" />
              <button className={`${b.btn} ${s.add}`} data-voice="loud" type="submit" aria-label={card.buy.name}>
                <Icon id="shopping-cart" /><span className={s.word}>{card.buy.add}</span><span className={s.done}>{card.buy.added}</span>
              </button>
            </CartForm>
          ) : (
            <a className={`${b.btn} ${s.add}`} data-voice="loud" href={card.buy.ask} aria-label={card.buy.name}>{card.buy.choose}</a>
          )}
        </div>
      </div>
    </article>
  )
}
