import type { Lang } from '../locale.ts'
import { intlLocale } from '../market.ts'
import { RO } from './ro.ts'
import { EN } from './en.ts'
import { HU } from './hu.ts'

export type Key = keyof typeof RO
type PluralBase = { [K in Key]: K extends `${infer B}.one` ? B : never }[Key]
const DICT: Record<Lang, Record<Key, string>> = { ro: RO, en: EN, hu: HU }

/** Слово интерфейса. Подстановка `{имя}` обязательна: пропущенная
 *  переменная — ошибка, а не «{n} produse» на витрине. */
export function t(lang: Lang, key: Key, vars: Record<string, string | number> = {}): string {
  return DICT[lang][key].replace(/\{(\w+)\}/g, (_, name: string) => {
    if (!(name in vars)) throw new Error(`t(${lang}, ${key}): нет переменной ${name}`)
    return String(vars[name])
  })
}

/** Счёт по правилам языка: по-румынски 1 produs, 12 produse, 20 de produse.
 *  Другие переменные строки — рядом со счётом: «1–3 zile» считается по 3. */
export function tn(lang: Lang, base: PluralBase, n: number, vars: Record<string, string | number> = {}): string {
  const form = new Intl.PluralRules(intlLocale(lang)).select(n)
  const key = (form === 'one' || form === 'few' ? `${base}.${form}` : `${base}.other`) as Key
  return t(lang, key, { ...vars, n })
}
