/* Варианты карточки товара на полке (components/ProductCard.tsx): разметка
   одна, вид — одежда карточки (craft, «Виды предмета — это одежда, а не
   разная раскладка»). Вид называет один из них полем `card`. */
// look-card:* Пока вид выбирается, в коде стоят все варианты. Когда выбран,
// look-card:* `npm run look:remove` удаляет строки и блоки с меткой вариантов,
// look-card:* которых вид не носит, — здесь и в ProductCard.module.css.
export const CARDS = [
  'framed', // look-card:framed
  'bare', // look-card:bare
  'outlined', // look-card:outlined
  'toned', // look-card:toned
] as const

export type CardVariant = (typeof CARDS)[number]
