import { cookies } from 'next/headers'
import { SESSION_COOKIE } from './session-cookie.ts'
import { SITE_URL } from './seo.ts'

const MONTH = 60 * 60 * 24 * 30

/** Ключ сессии покупки из cookie. Cookie — только для сервера: скрипт
 *  страницы его не читает (`httpOnly`), чужой сайт его не шлёт
 *  (`sameSite=lax`). */
export async function readSession(): Promise<string | null> {
  return (await cookies()).get(SESSION_COOKIE)?.value || null
}

/** `secure` — когда сайт на https: образец на http://localhost иначе не
 *  сохранил бы корзину, открытый с телефона по адресу в сети. */
export async function writeSession(token: string): Promise<void> {
  const jar = await cookies()
  jar.set(SESSION_COOKIE, token, { httpOnly: true, sameSite: 'lax', secure: SITE_URL().startsWith('https:'), path: '/', maxAge: MONTH })
}
