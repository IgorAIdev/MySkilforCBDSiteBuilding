import type { ReactNode } from 'react'
import { notFound } from 'next/navigation'
import p from '@/styles/primitives.module.css'
import { LOCALES, isLang } from '@/lib/locale.ts'
import { t } from '@/lib/i18n/index.ts'
import { source, content } from '@/lib/source/index.ts'
import { Header } from '@/components/Header.tsx'
import { Footer } from '@/components/Footer.tsx'
import '@/styles/palette.css'
import '@/styles/scale.css'
import '@/styles/tokens.css'
import '@/styles/base.css'
import '@/styles/buttons.css'

export const generateStaticParams = () => LOCALES.map((lang) => ({ lang }))

/* Пустой список — общий на оба провала источника: своя `[]` в JSX-пропе на
   каждый рендер словит react-perf/jsx-no-new-array-as-prop. */
const NONE: never[] = []

/* Шапка и подвал не падают вместе с источником: не ответил — полок и
   документов в них нет, а страница говорит сама за себя. */
export default async function Layout({ children, params }: { children: ReactNode; params: Promise<{ lang: string }> }) {
  const { lang } = await params
  if (!isLang(lang)) notFound()
  const [cols, docs] = await Promise.all([source().collections(lang), content().docs(lang)])
  return (
    <html lang={lang}>
      <body>
        <a className={p.skip} href="#main">{t(lang, 'skip')}</a>
        <Header lang={lang} collections={cols.ok ? cols.value : NONE} />
        {children}
        <Footer lang={lang} docs={docs.ok ? docs.value : NONE} />
      </body>
    </html>
  )
}
