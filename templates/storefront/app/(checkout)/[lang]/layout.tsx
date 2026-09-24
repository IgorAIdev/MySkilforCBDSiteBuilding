import type { ReactNode } from 'react'
import { LOCALES } from '@/lib/locale.ts'
import { LangDocument } from '@/components/Shell.tsx'

export const generateStaticParams = () => LOCALES.map((lang) => ({ lang }))

/* Язык — закрытый список, как у макета магазина (app/[lang]/layout.tsx). */
export const dynamicParams = false

/* Касса — коридор со своей рамой документа (разбор 24.09.2026, S2 и X5):
   знак, «назад в корзину», шаги, подвал строкой закона и помощи; полок,
   поиска и подвала магазина нет. Свой КОРНЕВОЙ макет группы маршрутов, а не
   вложенный: шапку рисует документ, и вложенный макет снять шапку родителя
   не может. Адреса те же — `/ro/checkout/…`: группа адреса не даёт.
   «Спасибо» (`app/[lang]/checkout/done`) — уже магазин: коридор кончился, и
   полки снова нужны. */
export default async function CheckoutLayout({ children, params }: { children: ReactNode; params: Promise<{ lang: string }> }) {
  return <LangDocument lang={(await params).lang} chrome="checkout">{children}</LangDocument>
}
