/* Имя cookie сессии покупки — отдельным файлом без ввоза Next: его читают
   сервер (lib/session.ts), проверки набора (kit.config.json → sessions) и
   тест, который держит их согласными. */
export const SESSION_COOKIE = 'shop_session'
