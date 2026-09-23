/**
 * «Не найдено» — две пробы одним местом, чистыми функциями: их зовёт
 * `check:open`, их же меряет `selftest/not-found.test.mjs` (И257).
 *
 * Заведено дефектом первой витрины: на каждом несуществующем адресе сайт
 * отдавал встроенную английскую страницу Next — `404: This page could not be
 * found.` без языка, — и ни одна проверка этого не видела: обход дерева
 * маршрутов ходит только по тем адресам, которые есть.
 *
 * Две пробы, потому что у промаха два рода:
 *
 *   адрес мимо дерева (`/ro/nu-exista`, `/hu/a/b`) — сайт отвечает СВОЕЙ
 *   страницей: код 404, свой документ с языком адреса. Встроенная страница
 *   Next языка не несёт, а пустая страница ошибки несёт `id="__next_error__"`;
 *
 *   промах данных (товара нет) — код 404 и запрет индекса. Саму страницу Next 16
 *   без потоковой отдачи рисует уже в браузере: границу `not-found` сервер
 *   не отрисовывает. Спрашивается то, что сервер обещать может.
 */

const ERROR_SHELL = /<html\b[^>]*\bid=["']__next_error__["']/i
const NOINDEX = /<meta\b(?=[^>]*\bname=["']robots["'])(?=[^>]*\bcontent=["'][^"']*\bnoindex\b)[^>]*>/i

/** Язык документа: `lang` у `<html>`, основа без региона; нет — пусто. */
export const docLang = (html) =>
  (html.match(/<html\b[^>]*>/i)?.[0].match(/\blang=["']([^"']+)["']/i)?.[1] ?? '')
    .toLowerCase().split('-')[0]

/** Адрес мимо дерева: 404 и своя страница сайта на языке адреса.
 *  `lang` пуст — сайт без языков в адресе: достаточно, что язык у документа есть. */
export function ownNotFound({ status, html, lang }) {
  if (status !== 404) return false
  if (ERROR_SHELL.test(html)) return false
  const got = docLang(html)
  if (!got) return false
  return !lang || got === String(lang).toLowerCase().split('-')[0]
}

/** Промах данных: 404 и `noindex` — поиск такой адрес не запомнит. */
export function quietMiss({ status, html }) {
  return status === 404 && NOINDEX.test(html)
}
