import { notFound } from 'next/navigation'
import { isLang, type Lang } from './locale.ts'

/** Язык страницы из адреса. Макет уже отказал чужому языку; страница
 *  спрашивает сама, потому что тип params у неё — строка. */
export async function langOf(params: Promise<{ lang: string }>): Promise<Lang> {
  const { lang } = await params
  if (!isLang(lang)) notFound()
  return lang
}
