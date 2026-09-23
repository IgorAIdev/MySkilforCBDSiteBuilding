import type { Lang } from './locale.ts'

/* Рынок шаблона — Румыния. Валюта, её запись и запись индекса — факты рынка,
   не вёрстки: проверка поля берёт образец отсюда, а не из кода формы. */
export const MARKET = {
  country: 'RO', currency: 'RON', precision: 2, display: 'narrowSymbol',
  postal: { pattern: '^\\d{6}$', example: '010011' },
} as const
const TAGS: Record<Lang, string> = { ro: 'ro-RO', en: 'en-RO', hu: 'hu-RO' }
export const intlLocale = (lang: Lang): string => TAGS[lang]
