import type { ReactNode } from 'react'
import p from '@/styles/primitives.module.css'
import s from './DocView.module.css'
import type { Doc } from '@/lib/source/contract.ts'

/** Якорь раздела с таблицей: заголовок и таблица, которую он называет. */
export const DOC_TABLE = 'doc-table'

/* Раздел — пара «заголовок слева, текст справа» (примитив `sidebar`,
   заголовок — узкая колонка): на широкой коробке заголовки стоят своей
   колонкой и документ читается оглавлением, на узкой пара складывается —
   заголовок над своим текстом. */
const part = (id: string, heading: string, body: ReactNode) => (
  <section key={id} className={`${p.sidebar} ${s.part}`} aria-labelledby={id}>
    <h2 id={id} className={p.aside}>{heading}</h2>
    <div className={s.text}>{body}</div>
  </section>
)

/* Документ — имя и строка о нём, затем разделы. Таблица способов — тоже
   раздел, и первый: это главный ответ страницы, у него заголовок раздела, а
   не подпись таблицы мельче тела (разбор 24.09.2026, D2). Имя таблице даёт
   этот заголовок (`aria-labelledby`). */
export function DocView({ doc, table, tableTitle }: { doc: Doc; table?: ReactNode; tableTitle?: string }) {
  return (
    <article className={`${p.stack} ${s.doc}`}>
      <div className={`${p.pagehead} ${s.head}`}><h1>{doc.title}</h1><p>{doc.summary}</p></div>
      {table && tableTitle ? part(DOC_TABLE, tableTitle, table) : null}
      {doc.sections.map((sec, i) => part(`doc-${i + 1}`, sec.heading, <p>{sec.body}</p>))}
    </article>
  )
}
