import type { ReactNode } from 'react'
import p from '@/styles/primitives.module.css'
import s from './DocView.module.css'
import type { Doc } from '@/lib/source/contract.ts'

export function DocView({ doc, table }: { doc: Doc; table?: ReactNode }) {
  return (
    <article className={`${p.stack} ${s.doc}`}>
      <div className={`${p.pagehead} ${s.head}`}><h1>{doc.title}</h1><p>{doc.summary}</p></div>
      {table ?? null}
      {doc.sections.map((sec) => (
        <section key={sec.heading} className={`${p.prose} ${s.part}`}>
          <h2>{sec.heading}</h2>
          <p>{sec.body}</p>
        </section>
      ))}
    </article>
  )
}
