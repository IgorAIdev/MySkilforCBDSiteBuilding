import s from './KeyFacts.module.css'
import type { FactsView } from '@/lib/facts.ts'

/* Поле основных параметров карты товара — что покупатель CBD сверяет перед
   покупкой: сколько CBD всего, в единице приёма, в капле, цена миллиграмма
   (lib/facts.ts, `packFacts`; референс — cbdin.bg). Строка — число крупно и
   подпись тихо, одним предложением: «1000 mg CBD in total». Заголовка нет:
   числа говорят сами, а имя списка — для чтения с экрана. */
export function KeyFacts({ facts }: { facts: FactsView }) {
  return (
    <ul className={s.facts} aria-label={facts.label}>
      {facts.rows.map((r) => (
        <li key={r.label} className={s.fact}>
          <strong className={s.value}>{r.value}</strong> <span>{r.label}</span>
          {r.note ? <span className={s.note}>{r.note}</span> : null}
        </li>
      ))}
    </ul>
  )
}
