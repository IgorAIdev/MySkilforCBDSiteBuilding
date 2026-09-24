/* Языки витрины румынского рынка. Строки LOCALES и DEFAULT_LANG читает
   tools/routes.mjs набора регуляркой — запись не менять.

   Основной язык образца — английский (слово заказчика 24.09.2026: «делай все
   текста на англ.»); ro и hu остаются языками рынка. Настоящий магазин RO
   ставит румынский основным при постановке: `install.mjs --storefront --lang ro`
   переписывает строку ниже и переадресацию корня в next.config.ts. */
export const LOCALES = ['ro', 'en', 'hu'] as const
export type Lang = (typeof LOCALES)[number]
export const DEFAULT_LANG: Lang = 'en'
/** Имя языка на нём самом — так его ищет тот, кто его читает. */
export const LANG_NAMES: Record<Lang, string> = { ro: 'Română', en: 'English', hu: 'Magyar' }
/** Порядок имени человека — факт языка, а не вёрстки: по-венгерски фамилия
 *  идёт первой («Kovács Anna»), по-румынски и по-английски — имя. Его читают
 *  двое: форма контактов (в каком порядке стоят поля) и сверка заказа (как
 *  имя пишется строкой), — и порядок у них один, отсюда (И381). */
export type NamePart = 'given' | 'family'
export const NAME_ORDER: Record<Lang, readonly [NamePart, NamePart]> = {
  ro: ['given', 'family'], en: ['given', 'family'], hu: ['family', 'given'],
}
export const isLang = (value: string): value is Lang => (LOCALES as readonly string[]).includes(value)

/** Язык адреса — первый сегмент пути; чужой или пустой — основной язык. */
export const langOfPath = (path: string): Lang => {
  const first = path.split('/')[1] ?? ''
  return isLang(first) ? first : DEFAULT_LANG
}

/* Заголовок, которым proxy.ts передаёт язык адреса странице «не найдено»:
   app/global-not-found.tsx ни параметров, ни адреса не получает (И257). */
export const LANG_HEADER = 'x-shop-lang'
