import p from '@/styles/primitives.module.css'
import s from './DeliveryTable.module.css'
import type { DeliveryTableView } from '@/lib/checkout-view.ts'

/* Таблица шире узкого экрана прокручивается в своей коробке — страница
   вбок не едет (CLAUDE.md, «Следствие»). Три колонки: вид способа не тянет
   свой столбец — он второй строкой сноски под именем в шапке строки.

   Имя таблицы — заголовок раздела, в котором она стоит (`labelledBy`), а не
   своя подпись: подпись была самым слабым заголовком страницы (16px, 600) при
   том, что таблица — её главный ответ (разбор 24.09.2026, D2). */
export function DeliveryTable({ view, labelledBy }: { view: DeliveryTableView; labelledBy: string }) {
  return (
    <div className={s.scroll}>
      <table className={s.table} aria-labelledby={labelledBy}>
        <thead><tr>{view.head.map((h) => <th key={h} scope="col">{h}</th>)}</tr></thead>
        <tbody>
          {view.rows.map((r) => (
            <tr key={r.id}>
              <th scope="row">{r.name}<p className={p.note}>{r.kind}</p></th>
              <td>{r.days}</td>
              <td className={s.price}>{r.price}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
