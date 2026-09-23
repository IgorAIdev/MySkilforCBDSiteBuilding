import type { Lang } from './locale.ts'
import type { Doc } from './source/contract.ts'
import { t } from './i18n/index.ts'
import { hrefFor } from './href.ts'
import { source, content } from './source/index.ts'

/* Пустой список — общий на оба провала источника: своя `[]` в JSX-пропе на
   каждый рендер словит react-perf/jsx-no-new-array-as-prop. */
const NONE: never[] = []

/** Строка навигации шапки: адрес и имя. */
export type NavLink = { href: string; label: string }
export type ShellData = { nav: NavLink[]; docs: Doc[] }

/** Полки шапки (первой — весь каталог) и документы подвала. Шапка и подвал не падают вместе с
 *  источником: не ответил — полок и документов в них нет, а страница говорит
 *  сама за себя. Берут двое — макет языка и «не найдено» без языка. */
export async function shellData(lang: Lang): Promise<ShellData> {
  const [cols, docs] = await Promise.all([source().collections(lang), content().docs(lang)])
  const nav = [
    { href: hrefFor(lang, { catalog: true }), label: t(lang, 'nav.catalog') },
    ...(cols.ok ? cols.value : NONE).map((c) => ({ href: hrefFor(lang, { category: c.slug }), label: c.name })),
  ]
  return { nav, docs: docs.ok ? docs.value : NONE }
}
