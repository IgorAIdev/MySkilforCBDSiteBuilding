import { formatMoney } from './source/vendure/core/money.mjs'
import { MARKET } from './market.ts'
import { numberLocale } from './format.ts'
import type { Lang } from './locale.ts'

/* Одна функция цены на всю витрину (check:port, семья moneyMath): блок
   получает готовую строку; делит и форматирует только она. Число — записью
   языка страницы (`numberLocale`, lib/format.ts, И347), как и все прочие
   числа витрины; валюта — рынка. */
export const money = (value: { minor: number; currency: string }, lang: Lang): string =>
  formatMoney(value.minor, value.currency, numberLocale(lang), { precision: MARKET.precision, display: MARKET.display })
