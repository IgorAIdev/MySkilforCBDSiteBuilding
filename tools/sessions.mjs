/* Личные страницы — корзина, оформление, кабинет — без сессии открываются
 * экраном «пусто». Отрисованные проверки (`check:craft`, `sweep`) идут по
 * дереву маршрутов и мерили бы только его, а ломается полная корзина (И263).
 *
 * Проект называет в kit.config.json cookie своей сессии и заготовленные
 * сессии для форм маршрутов:
 *
 *     "sessions": { "cookie": "shop_session",
 *                   "pages": { "/[lang]/cart": ["sample-cart"],
 *                              "/[lang]/checkout/delivery": ["sample-pickup?city=Cluj"] } }
 *
 * Адрес проверки несёт сессию хвостом `#as=…`: хвост после `#` на сервер не
 * уходит, сессию несёт заголовок `Cookie` страницы проверки. */

/** Адреса личных страниц: форма → её адреса (языки) → по адресу на сессию. */
export function sessionUrls(pages, expandShape) {
  return Object.entries(pages).flatMap(([shape, list]) => expandShape(shape).flatMap((url) => list.map((entry) => {
    const q = entry.indexOf('?')
    const as = q < 0 ? entry : entry.slice(0, q)
    const query = q < 0 ? '' : entry.slice(q)
    return `${url}${query}#as=${as}`
  })))
}

/** Адрес проверки → путь для сервера и заголовок `Cookie` (или null). */
export function sessionOf(url, cookie) {
  const at = url.indexOf('#as=')
  if (at < 0 || !cookie) return { path: url.split('#')[0], cookie: null }
  return { path: url.slice(0, at), cookie: `${cookie}=${encodeURIComponent(url.slice(at + 4))}` }
}
