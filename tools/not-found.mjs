/**
 * «Не найдено» — пробы одним местом, чистыми функциями: их зовёт
 * `check:open`, их же меряет `selftest/not-found.test.mjs` (И257).
 *
 * Заведено дефектом первой витрины: на каждом несуществующем адресе сайт
 * отдавал встроенную английскую страницу Next — `404: This page could not be
 * found.`, — и ни одна проверка этого не видела: обход дерева маршрутов
 * ходит только по тем адресам, которые есть.
 *
 * Промахов два рода, и род решает дерево маршрутов, а не вызывающий:
 *
 *   адрес мимо дерева (`/ro/nu-exista`, `/contact`) — ни одна форма
 *   маршрута его не принимает. Сайт отвечает СВОЕЙ страницей: код 404, свой
 *   документ с языком адреса. Встроенная страница Next — нет, даже когда
 *   она стоит внутри корневого макета сайта и `lang` у документа есть;
 *   пустая страница ошибки (`id="__next_error__"`) — тоже нет;
 *
 *   промах данных (`/ro/product/<нет такого>`) — форма маршрута есть,
 *   данных нет. Код 404 и запрет индекса: саму страницу Next 16 без
 *   потоковой отдачи рисует уже в браузере, границу `not-found` сервер не
 *   отрисовывает. Спрашивается то, что сервер обещать может.
 *
 * Функции возвращают ПРИЧИНУ провала строкой и пустую строку, когда всё
 * верно: отчёт проверки печатает её как есть, второй формулировки нет.
 */

const ERROR_SHELL = /<html\b[^>]*\bid=["']__next_error__["']/i
/* Встроенная страница Next узнаётся по своему заголовку и своему классу —
   их она несёт в любом корневом макете. */
const BUILTIN = /class=["'][^"']*\bnext-error-h1\b|<title>\s*404: This page could not be found\.?\s*<\/title>/i
const NOINDEX = /<meta\b(?=[^>]*\bname=["']robots["'])(?=[^>]*\bcontent=["'][^"']*\bnoindex\b)[^>]*>/i

/** Язык документа: `lang` у `<html>`, основа без региона; нет — пусто. */
export const docLang = (html) =>
  (html.match(/<html\b[^>]*>/i)?.[0].match(/\blang=["']([^"']+)["']/i)?.[1] ?? '')
    .toLowerCase().split('-')[0]

/** Адрес мимо дерева: 404 и своя страница сайта на языке адреса.
 *  `lang` пуст — сайт без языков: достаточно, что язык у документа есть. */
export function whyNotOwn({ status, html, lang }) {
  if (status !== 404) return `код ${status}, а не 404`
  if (ERROR_SHELL.test(html)) return 'пустая страница ошибки Next (__next_error__), а не своя страница'
  if (BUILTIN.test(html)) return 'встроенная страница Next «404: This page could not be found», а не своя'
  const got = docLang(html)
  if (!got) return 'у документа нет языка (<html lang>)'
  const want = String(lang ?? '').toLowerCase().split('-')[0]
  if (want && got !== want) return `язык документа «${got}», а адрес на «${want}»`
  return ''
}

/** Промах данных: 404 и `noindex` — поиск такой адрес не запомнит. */
export function whyNotQuiet({ status, html }) {
  if (status !== 404) return `код ${status}, а не 404`
  if (!NOINDEX.test(html)) return 'нет <meta name="robots" content="noindex">'
  return ''
}

/** Принимает ли форма маршрута адрес. Языковой сегмент (`[lang]`,
 *  `[locale]`) — закрытый список языков сайта, а не данные: `/contact`
 *  форме `/[lang]` не соответствует. Остальные динамические сегменты
 *  принимают любое слово, `[...x]` — один и больше, `[[...x]]` — ноль и
 *  больше. У `[locale]` основной язык живёт в корне — сегмента может не быть. */
export function matchesShape(url, shape, locales = []) {
  const path = url.split('?')[0].split('/').filter(Boolean)
  const walk = (segs, at) => {
    if (!segs.length) return at === path.length
    const [seg, ...rest] = segs
    if (/^\[\[\.\.\..+\]\]$/.test(seg)) return true
    if (/^\[\.\.\..+\]$/.test(seg)) return at < path.length
    if (seg === '[locale]' && walk(rest, at)) return true
    if (at >= path.length) return false
    const word = path[at]
    if (seg === '[lang]' || seg === '[locale]') return locales.includes(word) && walk(rest, at + 1)
    if (/^\[.+\]$/.test(seg)) return walk(rest, at + 1)
    return seg === word && walk(rest, at + 1)
  }
  return walk(shape.split('/').filter(Boolean), 0)
}

/** Род промаха по дереву: форма есть — промах данных, нет — адрес мимо дерева. */
export const missKind = (url, shapes, locales = []) =>
  shapes.some((shape) => matchesShape(url, shape, locales)) ? 'data' : 'stray'
