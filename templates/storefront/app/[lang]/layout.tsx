import type { ReactNode } from 'react'
import { notFound } from 'next/navigation'
import { LOCALES, isLang } from '@/lib/locale.ts'
import '@/styles/palette.css'
import '@/styles/scale.css'
import '@/styles/tokens.css'
import '@/styles/base.css'
import '@/styles/buttons.css'

export const generateStaticParams = () => LOCALES.map((lang) => ({ lang }))

export default async function Layout({ children, params }: { children: ReactNode; params: Promise<{ lang: string }> }) {
  const { lang } = await params
  if (!isLang(lang)) notFound()
  return (
    <html lang={lang}>
      <body>{children}</body>
    </html>
  )
}
