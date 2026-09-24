import type { Lang } from './locale.ts'
import type { Card, Pack } from './source/contract.ts'
import { intlLocale } from './market.ts'
import { t } from './i18n/index.ts'

/* Факты товара на полке — сила, мера, миллиграммы — одной строкой из данных
   (shop, «Один факт о товаре — одно место»; разбор 24.09.2026, X3). Покупатель
   CBD сравнивает на полке три числа, и ни одного на карточке не было: имя,
   цена и «В наличии». Здесь одна арифметика на всё, что их печатает или по
   ним фильтрует, и одна запись числа с единицей. */

/** Неразрывный пробел: число не отрывается от своей единицы («30 / % forte»
 *  рвалось на телефоне посередине, разбор Q5). Тот же знак ставит `money`
 *  между суммой и валютой. */
const BIND = ' '

/** Концентрация упаковки, %: мг ÷ (мл × 10), до десятой (cbd-facet, §2.2).
 *  Только у жидкости в мл и только при заявленных мг: у банки капсул объёма
 *  нет — процент был бы числом, которое не концентрация ничего. */
export const percentOf = (pack: Pack): number | null =>
  pack.unit === 'ml' && pack.mg ? Math.round((pack.mg / (pack.size * 10)) * 10) / 10 : null

/** Мг в одной штуке — доза капсулы; у нештучного — нет. */
const eachOf = (pack: Pack): number | null => (pack.unit === 'pcs' && pack.mg ? pack.mg / pack.size : null)

const distinct = (xs: (number | null)[]): number[] =>
  [...new Set(xs.filter((x): x is number => x !== null))].sort((a, b) => a - b)

/** Значения одной меры по вариантам: одно — числом, два — через косую
 *  («10/30 ml» — их ровно два, «10–30» обещал бы непрерывный ряд), больше —
 *  диапазоном от меньшего к большему. */
/* Число — записью рынка (`intlLocale`, как цена и протокол на карте
   товара): «2,5» и в английском; четыре знака без разрядки — «1000 mg», как
   на этикетке, разрядка с пяти. */
function nums(lang: Lang, xs: number[]): string {
  const n = new Intl.NumberFormat(intlLocale(lang), { maximumFractionDigits: 1, useGrouping: 'min2' })
  const [lo, hi] = [xs[0], xs[xs.length - 1]]
  return xs.length === 1 ? n.format(lo) : xs.length === 2 ? `${n.format(lo)}/${n.format(hi)}` : `${n.format(lo)}–${n.format(hi)}`
}
const span = (lang: Lang, xs: number[], unit: string): string | null => (xs.length ? `${nums(lang, xs)}${BIND}${unit}` : null)

/** Строка фактов карточки: «10 % · 10 ml · 1 000 mg», «30 × 25 mg»,
 *  «500 mg · 50 ml». Порядок — по тому, чем товар продаётся (`strength`):
 *  концентрацией — процент первым, содержанием — мг первыми; у штучного —
 *  доза штуки. Всего мг у товара с разными упаковками не печатается: это
 *  был бы диапазон, который сравнивать нельзя. Не из чего собрать — null. */
export function factsLine(lang: Lang, card: Pick<Card, 'strength' | 'packs'>): string | null {
  const { packs } = card
  if (!packs.length || new Set(packs.map((p) => p.unit)).size !== 1) return null
  const unit = packs[0].unit
  const sizes = distinct(packs.map((p) => p.size))
  const mg = distinct(packs.map((p) => p.mg))
  let parts: (string | null)[]
  if (unit === 'pcs') {
    /* «30 × 25 mg» — штук и доза одной; дозы разные — только счёт штук. */
    const each = distinct(packs.map(eachOf))
    parts = [each.length === 1 ? `${nums(lang, sizes)}${BIND}×${BIND}${span(lang, each, 'mg')}` : span(lang, sizes, t(lang, 'shelf.pcs'))]
  } else if (card.strength === 'percent') {
    parts = [span(lang, distinct(packs.map(percentOf)), '%'), span(lang, sizes, unit), mg.length === 1 ? span(lang, mg, 'mg') : null]
  } else {
    parts = [mg.length === 1 ? span(lang, mg, 'mg') : null, span(lang, sizes, unit)]
  }
  const shown = parts.filter((x): x is string => Boolean(x))
  /* Точка-разделитель держится за левое соседнее: строка рвётся после неё,
     и новая строка не начинается с «·». */
  return shown.length ? shown.join(`${BIND}· `) : null
}

/** Число и единица в имени товара — неразрывно: «CBD oil 30 % forte» на
 *  карточке в 163px рвалось «30 / % forte». Имя — данные заказчика; здесь
 *  только его запись на экране, слова не меняются. */
const UNITS = /(\d)\s+(?=(?:%|mg|ml|g|pcs|buc\.|db)(?![\p{L}\d]))/gu
export const bindUnits = (text: string): string => text.replace(UNITS, `$1${BIND}`)
