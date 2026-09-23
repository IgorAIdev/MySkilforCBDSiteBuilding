import type { Lang } from '../../locale.ts'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Content, Doc, Look } from '../contract.ts'
import { PAGES } from '../../pages.ts'
import DOCS from '../../docs.json' with { type: 'json' }

type L = Record<Lang, string>
type RawDoc = { slug: string; title: L; summary: L; sections: { heading: L; body: L }[]; table?: 'delivery' }
const RAW = DOCS as RawDoc[]
const docOf = (d: RawDoc, lang: Lang): Doc => ({
  slug: d.slug, title: d.title[lang], summary: d.summary[lang],
  sections: d.sections.map((s) => ({ heading: s.heading[lang], body: s.body[lang] })),
  table: d.table ?? null,
})

export const sampleContent: Content = {
  async page(lang, slug) {
    const p = PAGES[slug]
    return p ? { ok: true, value: { slug, title: p.title[lang], description: p.description[lang], blocks: p.blocks[lang] } } : { ok: false, reason: 'not-found' }
  },
  async docs(lang) {
    return { ok: true, value: RAW.map((d) => docOf(d, lang)) }
  },
  async doc(lang, slug) {
    const d = RAW.find((x) => x.slug === slug)
    return d ? { ok: true, value: docOf(d, lang) } : { ok: false, reason: 'not-found' }
  },
  /* Вид читается с диска при каждом промахе кэша, а не ввозится в сборку:
     правка look.json и запрос на /api/revalidate меняют вид живого сайта
     без сборки — так же придёт global «look» из Payload. */
  async look() {
    try {
      return { ok: true, value: JSON.parse(readFileSync(join(process.cwd(), 'lib/source/sample/look.json'), 'utf8')) as Look }
    } catch {
      return { ok: false, reason: 'unavailable' }
    }
  },
}
