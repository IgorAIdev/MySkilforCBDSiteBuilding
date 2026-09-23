import p from '@/styles/primitives.module.css'
import s from './DeliveryTable.module.css'
import type { DeliveryTableView } from '@/lib/checkout-view.ts'

/* Таблица шире узкого экрана прокручивается в своей коробке — страница
   вбок не едет (CLAUDE.md, «Следствие»). Три колонки: вид способа не тянет
   свой столбец — он второй, приглушённой строкой под именем в шапке строки
   (роль `--ink-soft`, класс `muted` набора — не заводится заново). */
export function DeliveryTable({ view }: { view: DeliveryTableView }) {
  return (
    <div className={s.scroll}>
      <table className={s.table}>
        <caption className={s.caption}>{view.caption}</caption>
        <thead><tr>{view.head.map((h) => <th key={h} scope="col">{h}</th>)}</tr></thead>
        <tbody>
          {view.rows.map((r) => (
            <tr key={r.id}>
              <th scope="row">{r.name}<p className={p.muted}>{r.kind}</p></th>
              <td>{r.days}</td>
              <td className={s.price}>{r.price}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
