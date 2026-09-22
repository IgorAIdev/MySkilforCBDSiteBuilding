import type { Lang } from './locale.ts'

/* Рынок шаблона — Румыния. Валюта и её запись — факт рынка, не вёрстки. */
export const MARKET = { country: 'RO', currency: 'RON', precision: 2, display: 'narrowSymbol' } as const
const TAGS: Record<Lang, string> = { ro: 'ro-RO', en: 'en-RO', hu: 'hu-RO' }
export const intlLocale = (lang: Lang): string => TAGS[lang]
