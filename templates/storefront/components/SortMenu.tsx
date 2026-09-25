import p from '@/styles/primitives.module.css'
import b from '@/styles/btn.module.css'
import s from './Catalog.module.css'
import fs from './Filters.module.css'
import type { SortView } from '@/lib/catalog-view.ts'
import { Icon } from './Icon.tsx'

/* Порядок полки — в полосе органов, справа (разбор 24.09.2026, C1): стоял
   внизу колонки фильтров под четырьмя гранями, и его не находили.

   Раскрытие со ссылками, а не список с отправкой на изменении: каждый
   порядок — адрес (shop, «Фильтры живут в адресе всегда»), выбор — переход
   по ссылке. Список, отправлявший форму на `change`, уводил бы со страницы
   с первой же стрелки клавиатуры (И265, WCAG 3.2.2). Раскрытие — то же, что
   у граней (Filters.module.css, `drop`): одна одежда на оба. Без скрипта
   работает всё: `popover` и ссылки.

   Подпись «Sort by» видна на широкой коробке; на узкой кнопка стоит
   половиной полосы рядом с «Фильтрами», и имя ей даёт `aria-label`.

   Подпись и знак порядка внутри кнопки, галка у выбранного — вид полки
   `--sort-label: inside` (элемент 63 набора, И395); разметка одна на оба
   вида, какой показать — решают стили. */
export function SortMenu({ sort }: { sort: SortView }) {
  return (
    <div className={`${fs.facet} ${s.sort}`}>
      <span className={s.sortLabel} aria-hidden="true">{sort.label}</span>
      <button className={`${b.btn} ${fs.trigger}`} type="button" popoverTarget="sort-list" aria-label={sort.said}><span className={s.sortIn}><Icon id="list-filter" /><span className={s.sortWord}>{sort.label}:</span></span>{sort.current}<Icon id="chevron-down" /></button>
      <ul id="sort-list" popover="auto" className={`${p.menu} ${fs.drop} ${s.sortList}`} data-align="end">
        {sort.options.map((o) => <li key={o.value}><a href={o.href} aria-current={o.on ? 'true' : undefined}>{o.label}{o.on ? <Icon id="check" /> : null}</a></li>)}
      </ul>
    </div>
  )
}
