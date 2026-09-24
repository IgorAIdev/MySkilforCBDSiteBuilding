import type { ReactNode } from 'react'
import type { Viewport } from 'next'
import { notFound } from 'next/navigation'
import { LOCALES, isLang } from '@/lib/locale.ts'
import { shellData } from '@/lib/shell.ts'
import { lookNow } from '@/lib/look.ts'
import { Shell } from '@/components/Shell.tsx'

export const generateStaticParams = () => LOCALES.map((lang) => ({ lang }))

/* Язык — закрытый список: `/contact`, `/bg`, `/xx` не принимаются за язык,
   а уходят мимо дерева — на свою страницу «не найдено» с кодом 404
   (app/global-not-found.tsx). Принятые за язык, они падали в `notFound()`
   макета, и Next отдавал пустую страницу ошибки (И257). */
export const dynamicParams = false

/* Окно документа — у корневого макета: на весь экран, с вырезом. Стили
   читают вырез ролями `--edge-b` (низ: резерв под нижнюю полосу `--dock`)
   и `--edge-x` (бока: край страницы `.wrap`) в styles/tokens.css, а
   браузер отдаёт `env(safe-area-inset-*)` только окну, попросившему
   `viewport-fit=cover`: без него на iPhone это ноль (И301; семья `viewport`
   в check:seo). Увеличение страницы не запрещается — WCAG 1.4.4. */
export const viewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover' }

export default async function Layout({ children, params }: { children: ReactNode; params: Promise<{ lang: string }> }) {
  const { lang } = await params
  if (!isLang(lang)) notFound()
  return <Shell lang={lang} data={await shellData(lang)} look={await lookNow()}>{children}</Shell>
}
