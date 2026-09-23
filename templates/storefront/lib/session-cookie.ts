/* Имя cookie сессии покупки и список личных страниц — отдельным файлом без
   ввоза Next: их читают сервер (lib/session.ts), проверки набора
   (kit.config.json → sessions) и тест, который держит их согласными. */
export const SESSION_COOKIE = 'shop_session'

/** Личные страницы — корзина и шаги оформления: их вид зависит от сессии
 *  покупки, а не от адреса. Формы маршрутов — те же, что в `kit.config.json`
 *  (`sessions.pages`): проверки меряют их полными (И263). */
export const PERSONAL = [
  '/[lang]/cart',
  '/[lang]/checkout/contact',
  '/[lang]/checkout/delivery',
  '/[lang]/checkout/payment',
  '/[lang]/checkout/done',
] as const
