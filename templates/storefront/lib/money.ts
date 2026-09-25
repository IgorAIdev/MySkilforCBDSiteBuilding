import { formatMoney, toAmount } from './source/vendure/core/money.mjs'
import { MARKET } from './market.ts'
import { numberLocale } from './format.ts'
import type { Lang } from './locale.ts'

/* Одна функция цены на всю витрину (check:port, семья moneyMath): блок
   получает готовую строку; делит и форматирует только она. Число — записью
   языка страницы (`numberLocale`, lib/format.ts, И347), как и все прочие
   числа витрины; валюта — рынка. */
export const money = (value: { minor: number; currency: string }, lang: Lang): string =>
  formatMoney(value.minor, value.currency, numberLocale(lang), { precision: MARKET.precision, display: MARKET.display })

/** Цена одной единицы из `count` — «€0.030 за мг» в поле параметров карты
 *  товара: на знак точнее цены (доля цента и есть то, чем масла
 *  сравнивают), валюта и запись числа — те же, что у `money`. */
export const moneyPer = (value: { minor: number; currency: string }, count: number, lang: Lang): string =>
  new Intl.NumberFormat(numberLocale(lang), {
    style: 'currency', currency: value.currency, currencyDisplay: MARKET.display,
    minimumFractionDigits: MARKET.precision + 1, maximumFractionDigits: MARKET.precision + 1,
  }).format(toAmount(value.minor, { precision: MARKET.precision }) / count)
