import type { Lang } from './locale.ts'

/* Рынок шаблона — Румыния. Валюта, её запись и запись индекса — факты рынка,
   не вёрстки: проверка поля берёт образец отсюда, а не из кода формы.

   Валюта образца — евро (слово заказчика 24.09.2026: «цена делай в евро»):
   цены каталога, доставки и порог оплаты при получении — в евроцентах.
   Настоящий магазин RO ставит леи при постановке: `install.mjs --storefront
   --currency RON` переписывает строку `currency` ниже (запись не менять —
   ставщик ищет её регуляркой). Как число читается — решает язык страницы
   через `Intl`: en «€29.90», ro и hu «29,90 €»; одна функция — lib/money.ts. */
export const MARKET = {
  country: 'RO', currency: 'EUR', precision: 2, display: 'narrowSymbol',
  postal: { pattern: '^\\d{6}$', example: '010011' },
} as const
const TAGS: Record<Lang, string> = { ro: 'ro-RO', en: 'en-RO', hu: 'hu-RO' }
export const intlLocale = (lang: Lang): string => TAGS[lang]
