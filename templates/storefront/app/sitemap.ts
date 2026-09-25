import type { MetadataRoute } from 'next'
import { LOCALES, DEFAULT_LANG } from '@/lib/locale.ts'
import { hrefFor } from '@/lib/href.ts'
import { absolute } from '@/lib/seo.ts'
import { source, content } from '@/lib/source/index.ts'

/* Обещанное — каждая страница для поиска на всех языках, из того же
   источника, что и сами страницы (check:urls сверяет в обе стороны).
   Источник не ответил — карта не пишется пустой: это была бы ложь. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [cols, ids, docs] = await Promise.all([source().collections(DEFAULT_LANG), source().productIds(), content().docs(DEFAULT_LANG)])
  if (!cols.ok || !ids.ok || !docs.ok) throw new Error('sitemap: источник не ответил — карта не пишется пустой')
  const paths = LOCALES.flatMap((lang) => [
    hrefFor(lang, { home: true }),
    hrefFor(lang, { catalog: true }),
  ]
    .concat(cols.value.map((c) => hrefFor(lang, { category: c.slug })))
    .concat(ids.value.map((id) => hrefFor(lang, { product: id })))
    .concat(docs.value.map((d) => hrefFor(lang, { doc: d.slug }))))
  return paths.map((path) => ({ url: absolute(path) }))
}
