import type { ReactNode } from 'react'
import { LOCALES } from '@/lib/locale.ts'
import { LangDocument } from '@/components/Shell.tsx'

export const generateStaticParams = () => LOCALES.map((lang) => ({ lang }))

/* Язык — закрытый список: `/contact`, `/bg`, `/xx` не принимаются за язык,
   а уходят мимо дерева — на свою страницу «не найдено» с кодом 404
   (app/global-not-found.tsx). Принятые за язык, они падали в `notFound()`
   макета, и Next отдавал пустую страницу ошибки (И257). */
export const dynamicParams = false

export default async function Layout({ children, params }: { children: ReactNode; params: Promise<{ lang: string }> }) {
  return <LangDocument lang={(await params).lang}>{children}</LangDocument>
}
