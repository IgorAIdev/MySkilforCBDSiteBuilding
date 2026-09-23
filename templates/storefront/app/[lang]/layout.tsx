import type { ReactNode } from 'react'
import { notFound } from 'next/navigation'
import { LOCALES, isLang } from '@/lib/locale.ts'
import { shellData } from '@/lib/shell.ts'
import { lookData } from '@/lib/look-data.ts'
import { Shell } from '@/components/Shell.tsx'

export const generateStaticParams = () => LOCALES.map((lang) => ({ lang }))

/* Язык — закрытый список: `/contact`, `/bg`, `/xx` не принимаются за язык,
   а уходят мимо дерева — на свою страницу «не найдено» с кодом 404
   (app/global-not-found.tsx). Принятые за язык, они падали в `notFound()`
   макета, и Next отдавал пустую страницу ошибки (И257). */
export const dynamicParams = false

export default async function Layout({ children, params }: { children: ReactNode; params: Promise<{ lang: string }> }) {
  const { lang } = await params
  if (!isLang(lang)) notFound()
  return <Shell lang={lang} data={await shellData(lang)} look={await lookData()}>{children}</Shell>
}
