import { NextResponse, type NextRequest } from 'next/server'
import { LANG_HEADER, langOfPath } from '@/lib/locale.ts'

/* Язык адреса — заголовком запроса, и больше ничего. Страница «не найдено»
   (app/global-not-found.tsx) адреса не получает, а язык ей нужен: /hu/a/b
   отвечает по-венгерски. Данных здесь не спрашивают: есть ли товар, решает
   страница, а не прокладка перед ней (И257). */
export function proxy(request: NextRequest) {
  const headers = new Headers(request.headers)
  headers.set(LANG_HEADER, langOfPath(request.nextUrl.pathname))
  return NextResponse.next({ request: { headers } })
}

export const config = { matcher: ['/((?!_next/).*)'] }
