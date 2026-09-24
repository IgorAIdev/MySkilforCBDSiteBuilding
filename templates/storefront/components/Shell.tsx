import type { ReactNode } from 'react'
import type { Viewport } from 'next'
import { notFound } from 'next/navigation'
import p from '@/styles/primitives.module.css'
import { isLang, type Lang } from '@/lib/locale.ts'
import { shellData, type ShellData } from '@/lib/shell.ts'
import { lookNow } from '@/lib/look.ts'
import type { Look } from '@/lib/source/contract.ts'
import { lookCss } from '@/lib/look-values.ts'
import { t } from '@/lib/i18n/index.ts'
import { CheckoutHeader, Header } from './Header.tsx'
import { Footer } from './Footer.tsx'
import '@/styles/palette.css'
import '@/styles/scale.css'
import '@/styles/tokens.css'
import '@/styles/base.css'
import '@/styles/buttons.css'
import '@/styles/storefront.css'
import '@/styles/look.css'

/* Документ витрины: язык, вид, пропуск к содержимому, шапка, подвал и общие
   стили. Один на двоих — макет языка (app/[lang]/layout.tsx) и страницу
   «не найдено» без макета (app/global-not-found.tsx): второй экземпляр
   документа разошёлся бы с первым на первой же правке.

   Вид (`look`, lib/look.ts) — один, готовыми значениями: блок стиля вида
   React поднимает в `<head>` (`precedence`) сразу после стилей сайта, и он
   перекрывает их умолчания на корне; значения проверены до страницы
   (lib/look-values.ts), внедрить через них CSS нечем. Шапка берёт по `look.header` свою разметку.

   Рама документа (`chrome`) — вторая ось, и её выбирает макет, а не вид:
   `full` — шапка с полками и подвал магазина; `checkout` — закрытая касса,
   знак и «назад в корзину», подвал строкой закона и помощи. Касса — свой
   корневой макет группы `app/(checkout)/[lang]` (разбор 24.09.2026, S2):
   вложенный макет шапку родителя не снимает. */
export function Shell({ lang, data, look, chrome = 'full', children }: { lang: Lang; data: ShellData; look: Look; chrome?: 'full' | 'checkout'; children: ReactNode }) {
  return (
    <html lang={lang}>
      <body>
        <style href="look" precedence="look">{lookCss(look)}</style>
        <a className={p.skip} href="#main">{t(lang, 'skip')}</a>
        {chrome === 'checkout' ? <CheckoutHeader lang={lang} /> : <Header lang={lang} nav={data.nav} variant={look.header} />}
        {children}
        <Footer lang={lang} docs={data.docs} variant={chrome === 'checkout' ? 'legal' : 'full'} />
        {/* eslint-disable-next-line @next/next/no-css-tags -- look-panel: стили панели — ссылкой на её адрес, сайт файлы панели не импортирует (И413) */}
        {process.env.LOOK_PICKER === 'on' ? <><link rel="stylesheet" href="/look-panel/look.css" precedence="look-panel" /><script src="/look-panel/look.js" async /></> : null}{/* look-panel: стили — до первой отрисовки (резерв --dock), скрипт — после */}
      </body>
    </html>
  )
}

/** Окно документа — одно на все корни: макет магазина (app/[lang]/layout.tsx),
 *  макет кассы (app/(checkout)/[lang]/layout.tsx) и «не найдено»
 *  (app/global-not-found.tsx); каждый корень его только берёт. На весь экран,
 *  с вырезом: стили читают вырез ролями `--edge-b` (низ: резерв под нижнюю
 *  полосу `--dock`) и `--edge-x` (бока: край страницы `.wrap`) в
 *  styles/tokens.css, а браузер отдаёт `env(safe-area-inset-*)` только окну,
 *  попросившему `viewport-fit=cover`: без него на iPhone это ноль (И301;
 *  семья `viewport` в check:seo). Корень без него теряет вырез молча — касса,
 *  выделенная своим корнем, потеряла бы первой. Увеличение не запрещается —
 *  WCAG 1.4.4. */
export const docViewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover' }

/** Документ языка — у обоих корневых макетов (магазин и касса): язык из
 *  закрытого списка, данные рамы и вид — из источника, рама — своя. */
export async function LangDocument({ lang, chrome = 'full', children }: { lang: string; chrome?: 'full' | 'checkout'; children: ReactNode }) {
  if (!isLang(lang)) notFound()
  return <Shell lang={lang} data={await shellData(lang)} look={await lookNow()} chrome={chrome}>{children}</Shell>
}
