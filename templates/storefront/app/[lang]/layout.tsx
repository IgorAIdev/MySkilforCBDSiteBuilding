import type { ReactNode } from 'react'
import { notFound } from 'next/navigation'
import { LOCALES, isLang } from '@/lib/locale.ts'
import { shellData } from '@/lib/shell.ts'
import { Shell } from '@/components/Shell.tsx'

export const generateStaticParams = () => LOCALES.map((lang) => ({ lang }))

export default async function Layout({ children, params }: { children: ReactNode; params: Promise<{ lang: string }> }) {
  const { lang } = await params
  if (!isLang(lang)) notFound()
  return <Shell lang={lang} data={await shellData(lang)}>{children}</Shell>
}
