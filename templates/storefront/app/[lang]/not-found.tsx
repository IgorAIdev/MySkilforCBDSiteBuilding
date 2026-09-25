'use client'
import { usePathname } from 'next/navigation'
import { langOfPath } from '@/lib/locale.ts'
import { Missing } from '@/components/StateScreen.tsx'

/* Промах данных — товара, полки, документа, страницы листания. Next 16 без
   потоковой отдачи отвечает на него кодом 404 и `noindex`, а этот экран
   рисует уже в браузере: границу `not-found` сервер не отрисовывает (И257).
   Параметров экран не получает: язык — из первого сегмента адреса. */
export default function NotFound() {
  return <Missing lang={langOfPath(usePathname())} />
}
