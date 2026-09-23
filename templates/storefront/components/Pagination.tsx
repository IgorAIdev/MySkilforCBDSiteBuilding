import p from '@/styles/primitives.module.css'
import go from '@/styles/go.module.css'
import s from './Catalog.module.css'
import type { PagesView } from '@/lib/catalog-view.ts'
import { Icon } from './Icon.tsx'

export function Pagination({ pages }: { pages: PagesView }) {
  return (
    <nav className={`${p.cluster} ${s.pages}`} aria-label={pages.label}>
      {pages.prev ? <a className={go.go} data-to="back" href={pages.prev} rel="prev"><Icon id="arrow-left" />{pages.prevLabel}</a> : <span />}
      <span className={p.muted}>{pages.label}</span>
      {pages.next ? <a className={go.go} href={pages.next} rel="next">{pages.nextLabel}<Icon id="arrow-right" /></a> : <span />}
    </nav>
  )
}
