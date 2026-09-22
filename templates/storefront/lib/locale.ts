/* Языки витрины румынского рынка. Строки LOCALES и DEFAULT_LANG читает
   tools/routes.mjs набора регуляркой — запись не менять. */
export const LOCALES = ['ro', 'en', 'hu'] as const
export type Lang = (typeof LOCALES)[number]
export const DEFAULT_LANG: Lang = 'ro'
export const isLang = (value: string): value is Lang => (LOCALES as readonly string[]).includes(value)
