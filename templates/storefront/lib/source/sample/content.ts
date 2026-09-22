import type { Lang } from '../../locale.ts'
import type { Content, Doc } from '../contract.ts'
import { PAGES } from '../../pages.ts'
import DOCS from '../../docs.json' with { type: 'json' }

type L = Record<Lang, string>
type RawDoc = { slug: string; title: L; summary: L; sections: { heading: L; body: L }[] }
const RAW = DOCS as RawDoc[]
const docOf = (d: RawDoc, lang: Lang): Doc => ({
  slug: d.slug, title: d.title[lang], summary: d.summary[lang],
  sections: d.sections.map((s) => ({ heading: s.heading[lang], body: s.body[lang] })),
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
}
