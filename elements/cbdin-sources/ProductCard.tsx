'use client'

import Link from '@/components/A'
import Anchor from './studio/Anchor'
import s from './ProductCard.module.css'
import { Bottle, Heart, shapeOf } from './Icons'
import p from '@/styles/primitives.module.css'
import b from '@/styles/btn.module.css'
import { dp, eur } from '@/lib/format'
import { cutOf, mgPerDrop, type Product } from '@/lib/products'
import { useLang } from '@/lib/i18n'
import { useCart, useSaved } from '@/lib/shop'
import Shot from './Shot'
import BuyBtn from './BuyBtn'

/**
 * The product card.
 *
 * A shelf card, not a summary: a photograph on a soft panel, what the thing
 * is, what it costs, and a way into the basket. The lab flag is gone — every
 * product in the shop has a report, so a badge on all of them marks nothing.
 * Price per milligram is gone too: it belongs where things are compared, and
 * a card is not a comparison.
 *
 * Факты о товаре говорятся ОДНИМ способом — строками; трёх других видов на
 * витрине больше нет. Шесть одежд кнопки «в корзину», которые карточка когда-то
 * носила по одной на штуку, ушли тем же путём: это был лист образцов на живом
 * магазине, и одна из них красила кнопку покупки в цвет предупреждения. The button answers the pointer the way every primary pill
 * on this site answers it, and that manner is written once in tokens.
 *
 * The card has two states now, and both are real: pressed, the button becomes
 * the counter the buy box and the cart already use; pressed, the heart fills.
 * A state nobody can see is a state nobody can judge.
 */


export default function ProductCard(
  { product, anchor = true }: {
    product: Product
    /** Котву оставляет карточка на странице. Карточка внутри меню — та же
     *  карточка, но раздел «Product card» не должен прыгать в списке панели
     *  всякий раз, когда меню открылось. */
    anchor?: boolean
  },
) {

  const drop = mgPerDrop(product)
  const cut = cutOf(product)
  const { t, lang } = useLang()
  const cart = useCart()
  const saved = useSaved()
  const inCart = cart.qty(product.id)
  const isSaved = saved.has(product.id)

  /* `data-card` — метка для отрисованной проверки: по ней семья `alone`
     находит полки, сложившиеся в столбик (карточка во всю ширину ряда).
     Класс модуля для этого не годится — на сборке он хэшируется. */
  return (
    <article className={s.card} data-card data-plate
             data-in={inCart > 0 ? 'true' : 'false'}>
      {anchor && <Anchor id="card" />}
      <Link className={s.hit} href={`/product/${product.id}`} aria-label={`${product.brand} ${t(product.name)}`} />

      <span className={s.media}>
        {product.shot
          ? <Shot src={product.shot} alt="" width={760} height={760}
                  sizes="(min-width: 1080px) 25vw, (min-width: 560px) 40vw, 70vw" />
          : <Bottle tone={product.tone} shape={shapeOf(product.cat)} />}
        {cut > 0 && <span className={p.cut}>−{cut}%</span>}
        <button type="button" className={`${b.like} ${p.likeOn}`}
                data-tone="quiet" data-bare-mark data-on={isSaved}
                aria-pressed={isSaved}
                aria-label={isSaved ? t('Saved') : t('Save for later')}
                onClick={() => saved.toggle(product.id)}><span className={b.mark}><Heart /></span></button>
      </span>

      <span className={s.brand} translate="no">{product.brand}</span>
      <h3 className={s.name}>{t(product.name)}</h3>

      {/* ФАКТЫ ГОВОРЯТСЯ ОДНИМ СПОСОБОМ — строками. Здесь стояли ещё три:
          пилюли, одна серая строка через точку и три числа с подписями, — все
          три в разметке КАЖДОЙ карточки, спрятанные стилем. Сорок карточек
          каталога несли по три лишних набора фактов, которых не видел никто.

          Выбор сделан заказчиком: «выбрано и используем Строки; остальные
          оставь в дизайн-системе, удали из выбора, из меню, из кода».
          Остальные три и остались — на листе набора, нарисованные его же
          правилами. Витрина о них больше не знает. */}
      {/* Доза на каплю — своей строкой, а не третьим членом через точку.
          В одной строке она не помещалась и переносилась по пробелу внутри
          самой величины: «15» оставалось наверху, «mg/drop» уезжало вниз,
          и число отрывалось от своей единицы. Разбитая по смыслу, строка
          переносится там, где у неё шов: сколько в пузырьке — отдельно,
          сколько в капле — отдельно. Остальные три вида карточки давно
          держат её врозь; этот был последним, где она стояла в хвосте. */}
      <span className={s.lines}>
        <span>{t(product.spectrum)}</span>
        <span>{product.cbd} mg · {product.vol}</span>
        {drop !== null && <span>{dp(drop)} {t('mg/drop')}</span>}
      </span>

      <span className={s.foot}>
        {/* The old price sits above the new one. Set beside it, the two read
            as a range; set above, the strike is plainly the price before and
            the figure under it is what you pay. */}
        <span className={s.price}>
          {cut > 0 && <s>{eur(product.was!, lang)}</s>}
          <b>{eur(product.price, lang)}</b>
        </span>
        {/* Кнопка «в корзину» — общая, одна на весь магазин
            (`components/BuyBtn.tsx`). Здесь её рисунка нет намеренно: своя
            копия жила тут вместе со второй, на странице товара, и различались
            они всем, кроме назначения (правило 10). */}
        <BuyBtn product={product} className={s.add} />
      </span>
    </article>
  )
}

