import { formatMoney } from './source/vendure/core/money.mjs'
import { MARKET, intlLocale } from './market.ts'
import type { Lang } from './locale.ts'

/* Одна функция цены на всю витрину (check:port, семья moneyMath): блок
   получает готовую строку; делит и форматирует только она. */
export const money = (value: { minor: number; currency: string }, lang: Lang): string =>
  formatMoney(value.minor, value.currency, intlLocale(lang), { precision: MARKET.precision, display: MARKET.display })