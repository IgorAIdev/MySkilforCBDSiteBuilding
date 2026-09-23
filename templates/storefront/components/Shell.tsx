import type { ReactNode } from 'react'
import p from '@/styles/primitives.module.css'
import type { Lang } from '@/lib/locale.ts'
import type { ShellData } from '@/lib/shell.ts'
import type { LookData } from '@/lib/look.ts'
import { t } from '@/lib/i18n/index.ts'
import { Header } from './Header.tsx'
import { Footer } from './Footer.tsx'
import { Look } from './Look.tsx'
import { LOOK_FONTS } from './look-fonts.ts'
import '@/styles/palette.css'
import '@/styles/scale.css'
import '@/styles/tokens.css'
import '@/styles/base.css'
import '@/styles/buttons.css'
import '@/styles/storefront.css'

/* Документ витрины: язык, пропуск к содержимому, шапка, подвал и общие
   стили. Один на двоих — макет языка (app/[lang]/layout.tsx) и страницу
   «не найдено» без макета (app/global-not-found.tsx): второй экземпляр
   документа разошёлся бы с первым на первой же правке.

   `look` — панель «Вид» (выбор шрифта и кнопок заказчиком, lib/look.ts):
   есть только при включённом переключателе. Тогда на `<html>` — переменные
   шрифтов, первым в `<body>` — скрипт, ставящий сохранённый выбор раньше
   всего, что рисуется (он же меняет атрибуты `<html>` раньше React — отсюда
   `suppressHydrationWarning`), в конце страницы — сама панель. Выключен —
   ничего из этого нет. Не `next/script`: его `beforeInteractive` в app/
   исполняет рабочая часть Next после загрузки, и страница мигала бы
   умолчанием. */
export function Shell({ lang, data, look, children }: { lang: Lang; data: ShellData; look: LookData | null; children: ReactNode }) {
  return (
    <html lang={lang} className={look ? LOOK_FONTS : undefined} suppressHydrationWarning={look ? true : undefined}>
      <body>
        {look ? <script dangerouslySetInnerHTML={{ __html: look.script }} /> : null}
        <a className={p.skip} href="#main">{t(lang, 'skip')}</a>
        <Header lang={lang} nav={data.nav} />
        {children}
        <Footer lang={lang} docs={data.docs} />
        {look ? <Look data={look} /> : null}
      </body>
    </html>
  )
}
