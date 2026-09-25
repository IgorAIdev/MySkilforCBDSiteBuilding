import { Fragment } from 'react'
import p from '@/styles/primitives.module.css'
import go from '@/styles/go.module.css'
import s from './Catalog.module.css'
import type { PagesView } from '@/lib/catalog-view.ts'
import { Icon } from './Icon.tsx'

/* Листание — назад, номера, вперёд одной строкой (разбор 24.09.2026, C4):
   стояло «Page 1 of 2» посередине и «Next page» у края — ни номеров, ни
   назад. Текущая страница — отметкой меню, которую выбрал вид (`--menu-mark-*`:
   черта или плашка), — тем же знаком «вы здесь», что у полок в шапке. */
export function Pagination({ pages }: { pages: PagesView }) {
  return (
    <nav className={`${p.cluster} ${s.pages}`} aria-label={pages.label}>
      {pages.prev ? <a className={go.go} data-to="back" href={pages.prev} rel="prev"><Icon id="arrow-left" />{pages.prevLabel}</a> : <span />}
      <ol className={`${p.cluster} ${s.numbers}`}>
        {pages.items.map((it) => (
          <Fragment key={it.n}>
            {it.gap ? <li aria-hidden="true">…</li> : null}
            <li>{it.href ? <a href={it.href}>{it.n}</a> : <span aria-current="page">{it.n}</span>}</li>
          </Fragment>
        ))}
      </ol>
      {pages.next ? <a className={go.go} href={pages.next} rel="next">{pages.nextLabel}<Icon id="arrow-right" /></a> : <span />}
    </nav>
  )
}
