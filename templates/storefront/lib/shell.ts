import type { Lang } from './locale.ts'
import type { Collection, Doc } from './source/contract.ts'
import { source, content } from './source/index.ts'

/* Пустой список — общий на оба провала источника: своя `[]` в JSX-пропе на
   каждый рендер словит react-perf/jsx-no-new-array-as-prop. */
const NONE: never[] = []

export type ShellData = { collections: Collection[]; docs: Doc[] }

/** Полки шапки и документы подвала. Шапка и подвал не падают вместе с
 *  источником: не ответил — полок и документов в них нет, а страница говорит
 *  сама за себя. Берут двое — макет языка и «не найдено» без языка. */
export async function shellData(lang: Lang): Promise<ShellData> {
  const [cols, docs] = await Promise.all([source().collections(lang), content().docs(lang)])
  return { collections: cols.ok ? cols.value : NONE, docs: docs.ok ? docs.value : NONE }
}
