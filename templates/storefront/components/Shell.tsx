import type { ReactNode } from 'react'
import p from '@/styles/primitives.module.css'
import type { Lang } from '@/lib/locale.ts'
import type { ShellData } from '@/lib/shell.ts'
import type { Look } from '@/lib/source/contract.ts'
import { FACE_VARS } from '@/lib/faces.ts'
import { t } from '@/lib/i18n/index.ts'
import { Header } from './Header.tsx'
import { Footer } from './Footer.tsx'
import '@/styles/palette.css'
import '@/styles/scale.css'
import '@/styles/tokens.css'
import '@/styles/base.css'
import '@/styles/buttons.css'
import '@/styles/storefront.css'

/* Документ витрины: язык, вид, пропуск к содержимому, шапка, подвал и общие
   стили. Один на двоих — макет языка (app/[lang]/layout.tsx) и страницу
   «не найдено» без макета (app/global-not-found.tsx): второй экземпляр
   документа разошёлся бы с первым на первой же правке.

   Вид (`look`, lib/look.ts — данные источника) — атрибутами на `<html>`:
   шрифт, стиль кнопок, вариант шапки, набор цвета; переменные всех шрифтов
   объявлены классами (lib/faces.ts), грузится только стоящий. Строка с
   меткой панели подключает панель выбора вида (public/look/) — только при
   LOOK_PICKER=on; `npm run look:remove` её снимает, и сайт от этого не
   меняется. */
export function Shell({ lang, data, look, children }: { lang: Lang; data: ShellData; look: Look; children: ReactNode }) {
  return (
    <html lang={lang} className={FACE_VARS} data-face={look.face} data-button={look.button} data-header={look.header} data-palette={look.palette}>
      <body>
        <a className={p.skip} href="#main">{t(lang, 'skip')}</a>
        <Header lang={lang} nav={data.nav} variant={look.header} />
        {children}
        <Footer lang={lang} docs={data.docs} />
        {process.env.LOOK_PICKER === 'on' ? <script src="/look/look.js" async /> : null}{/* look-panel */}
      </body>
    </html>
  )
}
