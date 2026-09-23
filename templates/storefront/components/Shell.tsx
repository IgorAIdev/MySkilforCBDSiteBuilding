import type { ReactNode } from 'react'
import p from '@/styles/primitives.module.css'
import type { Lang } from '@/lib/locale.ts'
import type { ShellData } from '@/lib/shell.ts'
import { t } from '@/lib/i18n/index.ts'
import { Header } from './Header.tsx'
import { Footer } from './Footer.tsx'
import '@/styles/palette.css'
import '@/styles/scale.css'
import '@/styles/tokens.css'
import '@/styles/base.css'
import '@/styles/buttons.css'

/* Документ витрины: язык, пропуск к содержимому, шапка, подвал и общие
   стили. Один на двоих — макет языка (app/[lang]/layout.tsx) и страницу
   «не найдено» без макета (app/global-not-found.tsx): второй экземпляр
   документа разошёлся бы с первым на первой же правке. */
export function Shell({ lang, data, children }: { lang: Lang; data: ShellData; children: ReactNode }) {
  return (
    <html lang={lang}>
      <body>
        <a className={p.skip} href="#main">{t(lang, 'skip')}</a>
        <Header lang={lang} collections={data.collections} />
        {children}
        <Footer lang={lang} docs={data.docs} />
      </body>
    </html>
  )
}
