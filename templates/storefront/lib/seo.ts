import type { Metadata } from 'next'
import { LOCALES, DEFAULT_LANG, type Lang } from './locale.ts'
import { CATALOG_IS_REAL } from './flags.ts'

/** Адрес сайта для canonical, hreflang, карты сайта и JSON-LD. Пока каталог —
 *  образец, без SITE_URL это машина разработчика. Настоящий каталог без
 *  SITE_URL — отказ, а не localhost: тихий localhost ушёл бы поисковику во
 *  все canonical и в карту сайта разом. Флаг и окружение — доводами, чтобы
 *  оба случая мерились тестом, не трогая флага. */
export function siteUrlFrom(isReal: boolean, env: Record<string, string | undefined>): string {
  const url = env.SITE_URL?.trim()
  if (url) return url
  if (isReal) throw new Error('SITE_URL не задан, а каталог настоящий (CATALOG_IS_REAL): canonical, hreflang, карта сайта и JSON-LD ушли бы на localhost. Задайте SITE_URL=https://… в окружении сборки и сервера.')
  return 'http://localhost:3020'
}
export const SITE_URL = () => siteUrlFrom(CATALOG_IS_REAL, process.env)
export const absolute = (path: string) => `${SITE_URL()}${path}`
const OG: Record<Lang, string> = { ro: 'ro_RO', en: 'en_RO', hu: 'hu_RO' }

/** Метаданные страницы: canonical — на себя, hreflang — на три языка и
 *  x-default на основной. `path` — та же функция адреса, что у ссылок.
 *  Пока каталог — образец, страница закрыта от обхода (флаг настоящести). */
export function toMetadata(lang: Lang, page: { title: string; description: string; path: (l: Lang) => string; index?: boolean }): Metadata {
  const languages: Record<string, string> = Object.fromEntries(LOCALES.map((l) => [l, absolute(page.path(l))]))
  languages['x-default'] = absolute(page.path(DEFAULT_LANG))
  const open = CATALOG_IS_REAL && page.index !== false
  return {
    title: page.title,
    description: page.description,
    alternates: { canonical: absolute(page.path(lang)), languages },
    openGraph: { title: page.title, description: page.description, url: absolute(page.path(lang)), locale: OG[lang], type: 'website' },
    robots: { index: open, follow: CATALOG_IS_REAL },
  }
}
