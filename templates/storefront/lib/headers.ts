/* Варианты шапки, которые сайт рисует (components/Header.tsx): разметка, а
   не значения. Вид называет один из них полем `header`. */
// look-header:* Пока вид выбирается, в коде стоят все варианты. Когда выбран,
// look-header:* `npm run look:remove` удаляет строки и блоки с меткой вариантов,
// look-header:* которых вид не носит, — здесь, в Header.tsx и Header.module.css.
export const HEADERS = [
  'classic', // look-header:classic
  'search', // look-header:search
  'boutique', // look-header:boutique
] as const

export type HeaderVariant = (typeof HEADERS)[number]
