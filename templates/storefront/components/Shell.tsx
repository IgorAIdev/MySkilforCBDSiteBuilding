import type { ReactNode } from 'react'
import p from '@/styles/primitives.module.css'
import type { Lang } from '@/lib/locale.ts'
import type { ShellData } from '@/lib/shell.ts'
import type { Look } from '@/lib/source/contract.ts'
import { lookCss } from '@/lib/look-values.ts'
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

   Вид (`look`, lib/look.ts) — один, готовыми значениями: блок стиля вида
   React поднимает в `<head>` (`precedence`) сразу после стилей сайта, и он
   перекрывает их умолчания на корне; значения проверены до страницы
   (lib/look-values.ts), внедрить через них CSS нечем. Шапка берёт по `look.header` свою разметку. */
export function Shell({ lang, data, look, children }: { lang: Lang; data: ShellData; look: Look; children: ReactNode }) {
  return (
    <html lang={lang}>
      <body>
        <style href="look" precedence="look">{lookCss(look)}</style>
        <a className={p.skip} href="#main">{t(lang, 'skip')}</a>
        <Header lang={lang} nav={data.nav} variant={look.header} />
        {children}
        <Footer lang={lang} docs={data.docs} />
        {process.env.LOOK_PICKER === 'on' ? <script src="/look-panel/look.js" async /> : null}{/* look-panel */}
      </body>
    </html>
  )
}
