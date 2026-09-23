/* Языки витрины румынского рынка. Строки LOCALES и DEFAULT_LANG читает
   tools/routes.mjs набора регуляркой — запись не менять. */
export const LOCALES = ['ro', 'en', 'hu'] as const
export type Lang = (typeof LOCALES)[number]
export const DEFAULT_LANG: Lang = 'ro'
export const isLang = (value: string): value is Lang => (LOCALES as readonly string[]).includes(value)

/** Язык адреса — первый сегмент пути; чужой или пустой — основной язык. */
export const langOfPath = (path: string): Lang => {
  const first = path.split('/')[1] ?? ''
  return isLang(first) ? first : DEFAULT_LANG
}

/* Заголовок, которым proxy.ts передаёт язык адреса странице «не найдено»:
   app/global-not-found.tsx ни параметров, ни адреса не получает (И257). */
export const LANG_HEADER = 'x-shop-lang'
